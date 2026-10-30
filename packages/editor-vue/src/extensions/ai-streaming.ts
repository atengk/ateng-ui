/**
 * @atengk/editor-vue 打字机流式光标与 AI 生成过程装饰层扩展。
 *
 * 遵循 L2 专用扩展层与撤销栈保全不变量：
 * 1. 在流式生成期间，利用 ProseMirror 装饰层 (Decorations) 实时渲染打字机跳动光标与流式字符；
 * 2. 独立于真实文档树，在流式进行中杜绝向 Undo/Redo 历史栈写入海量碎步脏记录；
 * 3. 生成完成并决策采纳时，通过单次原子事务统一合入文档树，保全单步一键撤销体验；
 * 4. 支持随时平稳取消 (cancel) 与中途清场，保证 DOM 与状态机确定性自愈。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { AiStreamingOptions, AiStreamingState } from '../types';

export const aiStreamingPluginKey = new PluginKey<AiStreamingState>('aiStreaming');

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    aiStreaming: {
      /**
       * 启动 AI 打字机流式生成态，在当前光标或选区位置挂载打字机装饰层。
       */
      startAiStreaming: (options?: {
        from?: number;
        to?: number;
        originalText?: string;
      }) => ReturnType;

      /**
       * 更新当前流式打字累积文本内容，触发打字机视口平滑增量渲染。
       */
      updateAiStreamingText: (text: string) => ReturnType;

      /**
       * 结束 AI 流式打字。
       * @param options.applyText 是否原子写入文档树（默认 true；若由外部 DiffCard 接管审阅可设为 false）
       */
      finishAiStreaming: (options?: { applyText?: boolean }) => ReturnType;

      /**
       * 取消 AI 流式打字并确定性清理所有装饰层与临时光标。
       */
      cancelAiStreaming: () => ReturnType;
    };
  }
}

/**
 * 创建打字机闪烁竖线光标 DOM 节点。
 */
function createAiCursorDOM(cursorClass: string): HTMLElement {
  const cursor = document.createElement('span');
  cursor.className = cursorClass;
  cursor.setAttribute('aria-hidden', 'true');
  cursor.textContent = '▎';
  return cursor;
}

/**
 * 创建流式打字实时预览与光标挂载容器 DOM。
 */
function createStreamingContainerDOM(
  text: string,
  streamingClass: string,
  cursorClass: string,
): HTMLElement {
  const container = document.createElement('span');
  container.className = streamingClass;
  container.setAttribute('role', 'status');
  container.setAttribute('aria-label', 'AI 正在流式打字中');

  if (text) {
    const textNode = document.createTextNode(text);
    container.appendChild(textNode);
  }

  const cursor = createAiCursorDOM(cursorClass);
  container.appendChild(cursor);

  return container;
}

export const AiStreamingExtension = Extension.create<AiStreamingOptions>({
  name: 'aiStreaming',

  addOptions() {
    return {
      cursorClass: 'at-editor-ai-cursor',
      streamingClass: 'at-editor-ai-streaming',
    };
  },

  addCommands() {
    return {
      startAiStreaming:
        (options = {}) =>
        ({ tr, dispatch, state }) => {
          if (!dispatch) return true;

          const from = options.from ?? state.selection.from;
          const to = options.to ?? state.selection.to;
          const originalText =
            options.originalText ?? (from !== to ? state.doc.textBetween(from, to) : '');

          const nextState: AiStreamingState = {
            active: true,
            from,
            to,
            text: '',
            originalText,
          };

          tr.setMeta(aiStreamingPluginKey, nextState);
          dispatch(tr);
          return true;
        },

      updateAiStreamingText:
        (text: string) =>
        ({ tr, dispatch }) => {
          if (!dispatch) return true;

          tr.setMeta(aiStreamingPluginKey, {
            updateText: text,
          });
          dispatch(tr);
          return true;
        },

      finishAiStreaming:
        (options = { applyText: true }) =>
        ({ tr, dispatch, state }) => {
          if (!dispatch) return true;

          const pluginState = aiStreamingPluginKey.getState(state);
          if (!pluginState || !pluginState.active) return false;

          const { from, to, text } = pluginState;

          // 若要求原子写入文档树且有生成内容，在单次事务中替换
          if (options.applyText && text && text.length > 0) {
            const schema = state.schema;
            // 确保坐标在当前合法文档范围内
            const validFrom = Math.min(Math.max(0, from), tr.doc.content.size);
            const validTo = Math.min(Math.max(validFrom, to), tr.doc.content.size);

            tr.replaceWith(validFrom, validTo, schema.text(text));
          }

          // 清理状态
          tr.setMeta(aiStreamingPluginKey, {
            active: false,
            from: 0,
            to: 0,
            text: '',
          });

          dispatch(tr);
          return true;
        },

      cancelAiStreaming:
        () =>
        ({ tr, dispatch, state }) => {
          if (!dispatch) return true;

          const pluginState = aiStreamingPluginKey.getState(state);
          if (!pluginState || !pluginState.active) return false;

          tr.setMeta(aiStreamingPluginKey, {
            active: false,
            from: 0,
            to: 0,
            text: '',
          });

          dispatch(tr);
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const options = this.options;

    return [
      new Plugin<AiStreamingState>({
        key: aiStreamingPluginKey,

        state: {
          init(): AiStreamingState {
            return {
              active: false,
              from: 0,
              to: 0,
              text: '',
            };
          },

          apply(tr, prevState): AiStreamingState {
            const meta = tr.getMeta(aiStreamingPluginKey);

            if (meta) {
              if ('updateText' in meta) {
                return {
                  ...prevState,
                  text: meta.updateText as string,
                };
              }
              if ('active' in meta) {
                return meta as AiStreamingState;
              }
            }

            // 依据文档事务位移自动映射坐标
            if (prevState.active) {
              return {
                ...prevState,
                from: tr.mapping.map(prevState.from),
                to: tr.mapping.map(prevState.to),
              };
            }

            return prevState;
          },
        },

        props: {
          decorations(state) {
            const pluginState = aiStreamingPluginKey.getState(state);
            if (!pluginState || !pluginState.active) {
              return DecorationSet.empty;
            }

            const { from, to, text } = pluginState;
            const docSize = state.doc.content.size;
            const safePos = Math.min(Math.max(0, to), docSize);
            const safeFrom = Math.min(Math.max(0, from), safePos);

            const decos: Decoration[] = [];

            // 1. 若存在原划选区域，将被覆盖的原选区打上轻量置灰淡出样式
            if (safeFrom < safePos) {
              decos.push(
                Decoration.inline(safeFrom, safePos, {
                  class: 'at-editor-ai-original-dimmed',
                }),
              );
            }

            // 2. 在当前位置插入流式打字与闪烁光标 Widget Decoration
            decos.push(
              Decoration.widget(safePos, () => {
                return createStreamingContainerDOM(
                  text,
                  options.streamingClass ?? 'at-editor-ai-streaming',
                  options.cursorClass ?? 'at-editor-ai-cursor',
                );
              }),
            );

            return DecorationSet.create(state.doc, decos);
          },
        },
      }),
    ];
  },
});
