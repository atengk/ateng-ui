/**
 * AtengTabsNav 指令计算、图标判别与内置矢量 SVG 图标路径表。
 *
 * @author Ateng
 * @since 2026-11-24
 */

import type { Component } from 'vue';
import { isValidIconInput, isVueComponentIcon, resolveCustomIcon } from '../shared/iconUtils';
import type {
  TabBatchCloseCommand,
  TabBatchClosePayload,
  TabCommand,
  TabIconResolver,
  TabItem,
} from './types';

export { isVueComponentIcon, isValidIconInput as isValidTabIcon };

/**
 * 内置菜单命令的 1024x1024 纯矢量 SVG 路径字典。
 */
export const TAB_MENU_ICON_PATHS: Record<TabCommand, string> = {
  refresh:
    'M796 296A352 352 0 1 0 854 608a32 32 0 0 1 62 16A416 416 0 1 1 838 250l42-42a16 16 0 0 1 28 11v176a16 16 0 0 1-16 16H716a16 16 0 0 1-11-28l91-87z',
  close:
    'M576 512l249-249a32 32 0 1 0-45-45L531 467 282 218a32 32 0 1 0-45 45l249 249-249 249a32 32 0 1 0 45 45l249-249 249 249a32 32 0 0 0 45-45L576 512z',
  closeOthers:
    'M192 224h640a32 32 0 0 1 0 64H192a32 32 0 0 1 0-64zm160 256h320a32 32 0 0 1 0 64H352a32 32 0 0 1 0-64zm-160 256h640a32 32 0 0 1 0 64H192a32 32 0 0 1 0-64z',
  closeLeft:
    'M224 192a32 32 0 0 1 32 32v576a32 32 0 0 1-64 0V224a32 32 0 0 1 32-32zm182.6 320l210.8 210.7a32 32 0 0 1-45.3 45.3L338.7 534.6a32 32 0 0 1 0-45.2l233.4-233.4a32 32 0 1 1 45.3 45.3L406.6 512z',
  closeRight:
    'M800 192a32 32 0 0 1 32 32v576a32 32 0 0 1-64 0V224a32 32 0 0 1 32-32zm-182.6 320L406.6 301.3a32 32 0 1 1 45.3-45.3l233.4 233.4a32 32 0 0 1 0 45.2L451.9 768a32 32 0 0 1-45.3-45.3L617.4 512z',
  closeAll:
    'M352 160a32 32 0 0 1 32-32h256a32 32 0 0 1 32 32v64h192a32 32 0 0 1 0 64h-40l-42 544a64 64 0 0 1-64 60H306a64 64 0 0 1-64-60l-42-544h-40a32 32 0 0 1 0-64h192v-64zm64 64h192v-32H416v32zm-114 64l40 520h340l40-520H302z',
};

/**
 * 内置滚动与视图最大化动作按钮的 SVG 路径字典。
 */
export const TAB_ACTION_ICON_PATHS = {
  scrollLeft:
    'M608 768c-8.192 0-16.384-3.072-22.528-9.216l-216-216a32 32 0 0 1 0-45.568l216-216a32 32 0 0 1 45.248 45.248L437.248 512l193.472 193.536A32 32 0 0 1 608 768z',
  scrollRight:
    'M416 768a32 32 0 0 1-22.528-54.656L586.944 512 393.472 318.528a32 32 0 1 1 45.248-45.248l216 216a32 32 0 0 1 0 45.568l-216 216A32 32 0 0 1 416 768z',
  quickMenu:
    'M512 640a32 32 0 0 1-22.528-9.376l-256-256a32 32 0 0 1 45.056-45.248L512 562.624l233.472-233.248a32 32 0 1 1 45.056 45.248l-256 256A32 32 0 0 1 512 640z',
  maximize:
    'M320 160H160v160h64v-96h96V160z m544 0h-160v64h96v96h64V160zM224 704h-64v160h160v-64h-96v-96z m640 0h-64v96h-96v64h160v-160z',
  restore:
    'M160 320h160V160h-64v96H160v64z m544 0h160v-64h-96v-96h-64v160zM256 864h64V704H160v64h96v96z m448 0h64v-96h96v-64H704v160z',
} as const;

/**
 * 解析标签项最终展示图标。
 */
export function resolveTabIcon(
  tab: TabItem,
  index: number,
  iconResolver?: TabIconResolver,
): string | Component | undefined {
  return resolveCustomIcon(tab.icon, tab, index, iconResolver);
}

/**
 * 计算单标签是否允许关闭。
 */
export function isTabClosable(tab: TabItem, globalClosable: boolean): boolean {
  if (tab.affix) return false;
  return tab.closable ?? globalClosable;
}

/**
 * 计算是否允许执行“关闭其他”。
 */
export function canCloseOthers(tabs: TabItem[], targetTab: TabItem): boolean {
  return tabs.some(t => !t.affix && t.key !== targetTab.key);
}

/**
 * 计算是否允许执行“关闭左侧”。
 */
export function canCloseLeft(tabs: TabItem[], index: number): boolean {
  return tabs.slice(0, index).some(t => !t.affix);
}

/**
 * 计算是否允许执行“关闭右侧”。
 */
export function canCloseRight(tabs: TabItem[], index: number): boolean {
  return tabs.slice(index + 1).some(t => !t.affix);
}

/**
 * 计算是否允许执行“全部关闭”。
 */
export function canCloseAll(tabs: TabItem[]): boolean {
  return tabs.some(t => !t.affix);
}

/**
 * 统一计算批量关闭的闭合状态快照与下一个激活 key。
 */
export function computeBatchClosePayload(
  command: TabBatchCloseCommand,
  tabs: TabItem[],
  currentActiveKey: string,
  targetTab?: TabItem,
  targetIndex = -1,
): TabBatchClosePayload {
  let closedTabs: TabItem[] = [];
  let remainingTabs: TabItem[] = tabs;
  let nextActiveKey = currentActiveKey;

  switch (command) {
    case 'closeOthers': {
      if (targetTab) {
        closedTabs = tabs.filter(t => !t.affix && t.key !== targetTab.key);
        remainingTabs = tabs.filter(t => t.affix || t.key === targetTab.key);
        nextActiveKey = targetTab.key;
      }
      break;
    }
    case 'closeLeft': {
      if (targetTab && targetIndex >= 0) {
        closedTabs = tabs.filter((t, idx) => idx < targetIndex && !t.affix);
        remainingTabs = tabs.filter((t, idx) => idx >= targetIndex || t.affix);
        nextActiveKey = remainingTabs.some(t => t.key === currentActiveKey)
          ? currentActiveKey
          : targetTab.key;
      }
      break;
    }
    case 'closeRight': {
      if (targetTab && targetIndex >= 0) {
        closedTabs = tabs.filter((t, idx) => idx > targetIndex && !t.affix);
        remainingTabs = tabs.filter((t, idx) => idx <= targetIndex || t.affix);
        nextActiveKey = remainingTabs.some(t => t.key === currentActiveKey)
          ? currentActiveKey
          : targetTab.key;
      }
      break;
    }
    case 'closeAll': {
      closedTabs = tabs.filter(t => !t.affix);
      remainingTabs = tabs.filter(t => t.affix);
      nextActiveKey = remainingTabs[0]?.key ?? '';
      break;
    }
  }

  return {
    command,
    closedTabs,
    remainingTabs,
    nextActiveKey,
  };
}
