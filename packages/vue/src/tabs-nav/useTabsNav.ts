/**
 * useTabsNav 多标签页无头响应式状态机实现。
 *
 * @author Ateng
 * @since 2026-10-29
 */

import { computed, nextTick, ref, toValue, type MaybeRefOrGetter } from 'vue';
import type { TabItem, UseTabsNavOptions, UseTabsNavReturn } from './types';

/**
 * useTabsNav 多标签页响应式状态机 Hook。
 *
 * 负责标签增删查改、FIFO 容量淘汰、Affix 锁定保护、KeepAlive 缓存名单计算与刷新调度。
 *
 * @param options 配置选项（支持普通对象、Ref 或 Getter 函数）
 * @returns 状态机实体对象
 */
export function useTabsNav(options: MaybeRefOrGetter<UseTabsNavOptions> = {}): UseTabsNavReturn {
  const resolvedOptions = toValue(options) || {};
  const {
    defaultTabs = [],
    defaultActiveKey = '',
    maxTabs = 0,
    persistKey,
    storageType = 'session',
    onRefresh,
    onClose,
  } = resolvedOptions;

  // 获取 Storage 引用（兼容 SSR 环境）
  const getStorage = (): Storage | null => {
    if (typeof window === 'undefined') {
      return null;
    }
    try {
      return storageType === 'local' ? window.localStorage : window.sessionStorage;
    } catch {
      return null;
    }
  };

  // 1. 尝试从本地持久化加载历史状态
  let initialTabs: TabItem[] = [...defaultTabs];
  let initialActiveKey: string = defaultActiveKey || (initialTabs[0]?.key ?? '');

  if (persistKey) {
    const storage = getStorage();
    if (storage) {
      try {
        const raw = storage.getItem(persistKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed?.tabs) && parsed.tabs.length > 0) {
            initialTabs = parsed.tabs;
            initialActiveKey = parsed.activeKey || initialTabs[0]?.key || '';
          }
        }
      } catch {
        // 忽略存储反序列化异常
      }
    }
  }

  // 保证初始标签中固定项始终锁定在首部
  initialTabs.sort((a, b) => (b.affix ? 1 : 0) - (a.affix ? 1 : 0));

  // 2. 核心响应式状态
  const tabs = ref<TabItem[]>(initialTabs);
  const activeKey = ref<string>(initialActiveKey);
  const isMaximized = ref<boolean>(false);
  const refreshingKey = ref<string | null>(null);

  // 持久化同步状态
  const persistState = (): void => {
    if (!persistKey) {
      return;
    }
    const storage = getStorage();
    if (!storage) {
      return;
    }
    try {
      storage.setItem(
        persistKey,
        JSON.stringify({
          tabs: tabs.value,
          activeKey: activeKey.value,
        }),
      );
    } catch {
      // 存储满或受限时静默容错
    }
  };

  // 3. 计算 KeepAlive 缓存组件名称清单
  const cachedViews = computed<string[]>(() => {
    const names = new Set<string>();
    for (const tab of tabs.value) {
      // 若当前标签正处于刷新剔除状态，跳过以通知 KeepAlive 卸载
      if (refreshingKey.value && tab.key === refreshingKey.value) {
        continue;
      }
      if (tab.componentName && tab.componentName.trim().length > 0) {
        names.add(tab.componentName.trim());
      }
    }
    return Array.from(names);
  });

  // 4. 打开 / 切换标签
  const openTab = (tab: TabItem): void => {
    const normalizedTab: TabItem = {
      ...tab,
      closable: tab.affix ? false : (tab.closable ?? true),
    };

    const existingIndex = tabs.value.findIndex(t => t.key === normalizedTab.key);
    const existing = existingIndex >= 0 ? tabs.value[existingIndex] : undefined;

    if (existingIndex >= 0 && existing) {
      // 已存在相同 key，就地更新属性并激活
      tabs.value[existingIndex] = {
        ...existing,
        ...normalizedTab,
      };
      // 若更新后成为固定标签，确保其处于前端固定区
      if (normalizedTab.affix && !existing.affix) {
        tabs.value.sort((a, b) => (b.affix ? 1 : 0) - (a.affix ? 1 : 0));
      }
      activeKey.value = normalizedTab.key;
    } else {
      // 容量超限时，执行 FIFO 淘汰最早打开的非固定标签
      if (maxTabs > 0 && tabs.value.length >= maxTabs) {
        const oldestUnpinnedIndex = tabs.value.findIndex(t => !t.affix);
        if (oldestUnpinnedIndex >= 0) {
          tabs.value.splice(oldestUnpinnedIndex, 1);
        }
      }

      // 固定标签强制锁定插入至前端固定区，普通标签追加至尾部
      if (normalizedTab.affix) {
        const firstUnpinnedIndex = tabs.value.findIndex(t => !t.affix);
        if (firstUnpinnedIndex >= 0) {
          tabs.value.splice(firstUnpinnedIndex, 0, normalizedTab);
        } else {
          tabs.value.push(normalizedTab);
        }
      } else {
        tabs.value.push(normalizedTab);
      }
      activeKey.value = normalizedTab.key;
    }

    persistState();
  };

  // 5. 关闭指定标签
  const closeTab = (key: string): void => {
    const index = tabs.value.findIndex(t => t.key === key);
    if (index < 0) {
      return;
    }

    const targetTab = tabs.value[index];
    if (!targetTab || targetTab.affix) {
      // 不存在或固定标签强制不可关闭
      return;
    }

    // 若当前关闭的是激活项，自动流转到相邻标签（优先右侧，其次左侧）
    if (activeKey.value === key) {
      const nextTab = index < tabs.value.length - 1 ? tabs.value[index + 1] : undefined;
      const prevTab = index > 0 ? tabs.value[index - 1] : undefined;
      if (nextTab) {
        activeKey.value = nextTab.key;
      } else if (prevTab) {
        activeKey.value = prevTab.key;
      } else {
        activeKey.value = '';
      }
    }

    tabs.value.splice(index, 1);
    onClose?.(key, targetTab);
    persistState();
  };

  // 6. 关闭其他标签
  const closeOthers = (key: string = activeKey.value): void => {
    tabs.value = tabs.value.filter(t => t.affix || t.key === key);
    if (key && tabs.value.some(t => t.key === key)) {
      activeKey.value = key;
    } else if (tabs.value.length > 0) {
      const firstTab = tabs.value[0];
      if (firstTab) {
        activeKey.value = firstTab.key;
      }
    }
    persistState();
  };

  // 7. 关闭左侧未固定标签
  const closeLeft = (key: string = activeKey.value): void => {
    const targetIndex = tabs.value.findIndex(t => t.key === key);
    if (targetIndex <= 0) {
      return;
    }

    tabs.value = tabs.value.filter((t, idx) => idx >= targetIndex || t.affix);
    if (!tabs.value.some(t => t.key === activeKey.value)) {
      activeKey.value = key;
    }
    persistState();
  };

  // 8. 关闭右侧未固定标签
  const closeRight = (key: string = activeKey.value): void => {
    const targetIndex = tabs.value.findIndex(t => t.key === key);
    if (targetIndex < 0 || targetIndex >= tabs.value.length - 1) {
      return;
    }

    tabs.value = tabs.value.filter((t, idx) => idx <= targetIndex || t.affix);
    if (!tabs.value.some(t => t.key === activeKey.value)) {
      activeKey.value = key;
    }
    persistState();
  };

  // 9. 关闭所有未固定标签
  const closeAll = (): void => {
    tabs.value = tabs.value.filter(t => t.affix);
    activeKey.value = tabs.value[0]?.key ?? '';
    persistState();
  };

  // 10. 标签拖拽调序（防呆保护）
  const moveTab = (fromIndex: number, toIndex: number): void => {
    if (
      fromIndex < 0 ||
      fromIndex >= tabs.value.length ||
      toIndex < 0 ||
      toIndex >= tabs.value.length ||
      fromIndex === toIndex
    ) {
      return;
    }

    const movingTab = tabs.value[fromIndex];
    if (!movingTab || movingTab.affix) {
      // 固定标签禁止被拖拽移动
      return;
    }

    // 计算固定标签边界：普通标签不得放置在固定标签之前
    const firstUnpinnedIndex = tabs.value.findIndex(t => !t.affix);
    const validTargetIndex = Math.max(firstUnpinnedIndex >= 0 ? firstUnpinnedIndex : 0, toIndex);

    const [removed] = tabs.value.splice(fromIndex, 1);
    if (removed) {
      tabs.value.splice(validTargetIndex, 0, removed);
      persistState();
    }
  };

  // 11. 固定 / 取消固定标签
  const pinTab = (key: string, pinned: boolean = true): void => {
    const tab = tabs.value.find(t => t.key === key);
    if (!tab) {
      return;
    }

    tab.affix = pinned;
    tab.closable = pinned ? false : (tab.closable ?? true);

    // 重新排序：固定标签排在前端
    tabs.value.sort((a, b) => (b.affix ? 1 : 0) - (a.affix ? 1 : 0));
    persistState();
  };

  // 12. 局部刷新标签
  const refreshTab = async (key: string = activeKey.value): Promise<void> => {
    if (!key) {
      return;
    }
    // 瞬态从缓存名单剔除，通知 KeepAlive 销毁组件实例
    refreshingKey.value = key;
    await nextTick();

    try {
      await onRefresh?.(key);
    } finally {
      // 重新回填进缓存名单，使组件重新挂载
      refreshingKey.value = null;
    }
  };

  // 13. 切换视口最大化
  const toggleMaximize = (val?: boolean): void => {
    isMaximized.value = typeof val === 'boolean' ? val : !isMaximized.value;
  };

  // 14. 显式设置与同步方法（提供单向流直接更新支持）
  const setTabs = (newTabs: TabItem[]): void => {
    tabs.value = [...newTabs];
    persistState();
  };

  const setActiveKey = (key: string): void => {
    activeKey.value = key;
    persistState();
  };

  return {
    tabs,
    activeKey,
    cachedViews,
    isMaximized,
    refreshingKey,
    openTab,
    closeTab,
    closeOthers,
    closeLeft,
    closeRight,
    closeAll,
    moveTab,
    pinTab,
    refreshTab,
    toggleMaximize,
    setTabs,
    setActiveKey,
  };
}
