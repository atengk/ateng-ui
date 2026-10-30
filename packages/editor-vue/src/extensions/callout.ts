/**
 * @atengk/editor-vue 纯原生重点高亮卡片扩展 (CalloutBlock)。
 *
 * 遵循 L2 零 UI 框架依赖规范，纯原生基于 TipTap Node.create 实现。
 * 支持提示 (info)、警告 (warning)、错误 (error)、成功 (success) 4 态语义色彩与自定义 Emoji 图标。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { Node, mergeAttributes, wrappingInputRule } from '@tiptap/core';

export type CalloutType = 'info' | 'warning' | 'error' | 'success';

export interface CalloutBlockOptions {
  /**
   * 附加到外部容器的 HTML 属性。
   */
  HTMLAttributes: Record<string, unknown>;
  /**
   * 默认高亮语义形态。
   */
  defaultType: CalloutType;
  /**
   * 4 态语义形态默认 Emoji 图标映射。
   */
  defaultIcons: Record<CalloutType, string>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    calloutBlock: {
      /**
       * 将当前选区包裹为重点高亮卡片。
       */
      setCalloutBlock: (attributes?: { type?: CalloutType; icon?: string }) => ReturnType;
      /**
       * 切换当前选区为高亮卡片（已包裹则提升解包）。
       */
      toggleCalloutBlock: (attributes?: { type?: CalloutType; icon?: string }) => ReturnType;
      /**
       * 解除当前高亮卡片包裹。
       */
      unsetCalloutBlock: () => ReturnType;
    };
  }
}

export const CalloutBlock = Node.create<CalloutBlockOptions>({
  name: 'calloutBlock',

  group: 'block',

  content: 'block+',

  defining: true,

  draggable: true,

  selectable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
      defaultType: 'info',
      defaultIcons: {
        info: '💡',
        warning: '⚠️',
        error: '🚫',
        success: '✅',
      },
    };
  },

  addAttributes() {
    return {
      type: {
        default: this.options.defaultType,
        parseHTML: element => element.getAttribute('data-callout-type') || this.options.defaultType,
        renderHTML: attributes => ({
          'data-callout-type': attributes.type,
        }),
      },
      icon: {
        default: null,
        parseHTML: element => element.getAttribute('data-callout-icon'),
        renderHTML: attributes => {
          if (!attributes.icon) {
            return {};
          }
          return {
            'data-callout-icon': attributes.icon,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-callout-type]',
        getAttrs: element => {
          const el = element as HTMLElement;
          const type = (el.getAttribute('data-callout-type') as CalloutType) || 'info';
          const icon = el.getAttribute('data-callout-icon') || undefined;
          return { type, icon };
        },
      },
      {
        tag: 'div.at-editor-callout',
        getAttrs: element => {
          const el = element as HTMLElement;
          let type: CalloutType = 'info';
          if (el.classList.contains('at-editor-callout--warning')) {
            type = 'warning';
          } else if (el.classList.contains('at-editor-callout--error')) {
            type = 'error';
          } else if (el.classList.contains('at-editor-callout--success')) {
            type = 'success';
          }
          const icon = el.getAttribute('data-callout-icon') || undefined;
          return { type, icon };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    const type = (node.attrs.type as CalloutType) || 'info';
    const icon =
      (node.attrs.icon as string) ||
      this.options.defaultIcons[type] ||
      this.options.defaultIcons.info;

    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: `at-editor-callout at-editor-callout--${type}`,
        'data-callout-type': type,
        'data-callout-icon': icon,
      }),
      [
        'div',
        {
          class: 'at-editor-callout__icon',
          contenteditable: 'false',
        },
        icon,
      ],
      ['div', { class: 'at-editor-callout__content' }, 0],
    ];
  },

  addCommands() {
    return {
      setCalloutBlock:
        attributes =>
        ({ commands }) => {
          return commands.wrapIn(this.name, attributes);
        },
      toggleCalloutBlock:
        attributes =>
        ({ commands, editor }) => {
          if (editor.isActive(this.name)) {
            return commands.lift(this.name) || commands.clearNodes();
          }
          return commands.wrapIn(this.name, attributes);
        },
      unsetCalloutBlock:
        () =>
        ({ commands }) => {
          return commands.lift(this.name);
        },
    };
  },

  addInputRules() {
    return [
      wrappingInputRule({
        find: /^>!\s$/,
        type: this.type,
        getAttributes: () => ({ type: 'info' }),
      }),
    ];
  },
});
