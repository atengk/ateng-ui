/**
 * @atengk/editor-vue 单元测试离线环境 TipTap BubbleMenu 运行时 Mock。
 *
 * 遵循全自洽单测 3 项铁律之“100% 离线自洽”，
 * 拦截 happy-dom / Node 测试环境下 Tippy.js DOM 物理定位与 CJS 模块加载异常，
 * 完整模拟 ProseMirror Plugin 与 BubbleMenuView 生命周期。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export class BubbleMenuView {
  update(): void {}
  destroy(): void {}
}

export interface MockBubbleMenuPluginProps {
  pluginKey?: string | PluginKey;
  element?: HTMLElement | null;
  [key: string]: unknown;
}

export const BubbleMenuPlugin = (options: MockBubbleMenuPluginProps = {}): Plugin => {
  const key =
    typeof options.pluginKey === 'string'
      ? new PluginKey(options.pluginKey)
      : (options.pluginKey ?? new PluginKey('bubbleMenu'));

  return new Plugin({
    key,
    view: () => new BubbleMenuView(),
  });
};

export const BubbleMenu = Extension.create({
  name: 'bubbleMenu',
});

export default BubbleMenu;
