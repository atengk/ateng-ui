/**
 * @atengk/editor-vue 纯原生折叠列表扩展 (ToggleList)。
 *
 * 遵循 L2 零 UI 框架依赖规范，纯原生基于 TipTap Node.create 与 ProseMirror Plugin 事务实现。
 * 支持首行标题提示、交互式折叠三角状态切换与下级嵌套子块折叠隐藏。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { Node, mergeAttributes, wrappingInputRule, type CommandProps } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export interface ToggleListOptions {
  /**
   * 附加到外部容器的 HTML 属性。
   */
  HTMLAttributes: Record<string, unknown>;
  /**
   * 新建节点时的默认展开状态。
   * @default true
   */
  defaultOpen: boolean;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    atengToggleList: {
      /**
       * 将当前选区包裹为折叠列表块。
       */
      setToggleList: (attributes?: { open?: boolean }) => ReturnType;
      /**
       * 切换当前选区为折叠列表块（已包裹则提升解包）。
       */
      toggleToggleList: (attributes?: { open?: boolean }) => ReturnType;
      /**
       * 解除当前折叠列表块包裹。
       */
      unsetToggleList: () => ReturnType;
    };
  }
}

export const ToggleList = Node.create<ToggleListOptions>({
  name: 'toggleList',

  group: 'block',

  content: 'block+',

  defining: true,

  draggable: true,

  selectable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
      defaultOpen: true,
    };
  },

  addAttributes() {
    return {
      open: {
        default: this.options.defaultOpen,
        parseHTML: element => element.getAttribute('data-open') !== 'false',
        renderHTML: attributes => ({
          'data-open': String(attributes.open !== false),
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div.at-editor-toggle',
        getAttrs: element => {
          const el = element as HTMLElement;
          return {
            open: el.getAttribute('data-open') !== 'false',
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    const isOpen = node.attrs.open !== false;

    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: `at-editor-toggle ${isOpen ? 'is-open' : 'is-closed'}`,
        'data-open': String(isOpen),
      }),
      [
        'div',
        {
          class: 'at-editor-toggle__trigger',
          contenteditable: 'false',
        },
        [
          'button',
          {
            type: 'button',
            class: 'at-editor-toggle__caret',
            'aria-label': isOpen ? '折叠' : '展开',
          },
          isOpen ? '▼' : '▶',
        ],
      ],
      ['div', { class: 'at-editor-toggle__content' }, 0],
    ];
  },

  addCommands() {
    return {
      setToggleList:
        (attributes?: { open?: boolean }) =>
        ({ commands }: CommandProps) => {
          return commands.wrapIn(this.name, attributes);
        },
      toggleToggleList:
        (attributes?: { open?: boolean }) =>
        ({ commands, editor }: CommandProps) => {
          if (editor.isActive(this.name)) {
            return commands.lift(this.name) || commands.clearNodes();
          }
          return commands.wrapIn(this.name, attributes);
        },
      unsetToggleList:
        () =>
        ({ commands }: CommandProps) => {
          return commands.lift(this.name);
        },
    };
  },

  addInputRules() {
    return [
      wrappingInputRule({
        find: /^>>\s$/,
        type: this.type,
        getAttributes: () => ({ open: true }),
      }),
    ];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('toggleListClick'),
        props: {
          handleDOMEvents: {
            click: (view, event) => {
              const target = event.target as HTMLElement | null;
              if (!target) return false;
              const caretBtn = target.closest('.at-editor-toggle__caret');
              if (!caretBtn) return false;

              const toggleEl = caretBtn.closest('.at-editor-toggle');
              if (!toggleEl) return false;

              try {
                const nodePos = view.posAtDOM(toggleEl, 0);
                const $pos = view.state.doc.resolve(nodePos);

                for (let depth = $pos.depth; depth >= 0; depth--) {
                  const node = $pos.node(depth);
                  if (node.type.name === this.name) {
                    const startPos = $pos.before(depth);
                    const tr = view.state.tr.setNodeMarkup(startPos, undefined, {
                      ...node.attrs,
                      open: !node.attrs.open,
                    });
                    view.dispatch(tr);
                    event.preventDefault();
                    event.stopPropagation();
                    return true;
                  }
                }
              } catch {
                // 容错降级：折叠 caret 点击时若 DOM 节点已从文档树脱离或坐标失真则安全终止
              }
              return false;
            },
          },
        },
      }),
    ];
  },
});
