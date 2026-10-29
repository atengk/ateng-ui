/**
 * useTabsNav 核心无头多标签状态机单元测试。
 *
 * @author Ateng
 * @since 2026-10-29
 */

import { describe, expect, it, beforeEach, vi } from 'vitest';
import { effectScope } from 'vue';
import { useTabsNav } from '../src';
import type { TabItem } from '../src';

describe('useTabsNav', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('should initialize with default empty state', () => {
    const scope = effectScope();
    scope.run(() => {
      const { tabs, activeKey, cachedViews, isMaximized } = useTabsNav();

      expect(tabs.value).toEqual([]);
      expect(activeKey.value).toBe('');
      expect(cachedViews.value).toEqual([]);
      expect(isMaximized.value).toBe(false);
    });
    scope.stop();
  });

  it('should initialize with defaultTabs and defaultActiveKey', () => {
    const defaultTabs: TabItem[] = [
      { key: '/dashboard', title: '工作台', affix: true, componentName: 'Dashboard' },
      { key: '/users', title: '用户管理', componentName: 'UserList' },
    ];

    const scope = effectScope();
    scope.run(() => {
      const { tabs, activeKey, cachedViews } = useTabsNav({
        defaultTabs,
        defaultActiveKey: '/dashboard',
      });

      expect(tabs.value).toHaveLength(2);
      expect(activeKey.value).toBe('/dashboard');
      expect(cachedViews.value).toEqual(['Dashboard', 'UserList']);
    });
    scope.stop();
  });

  it('should open new tab and activate it', () => {
    const scope = effectScope();
    scope.run(() => {
      const { tabs, activeKey, cachedViews, openTab } = useTabsNav();

      openTab({ key: '/page1', title: 'Page 1', componentName: 'Page1' });

      expect(tabs.value).toHaveLength(1);
      expect(tabs.value[0].key).toBe('/page1');
      expect(activeKey.value).toBe('/page1');
      expect(cachedViews.value).toEqual(['Page1']);

      openTab({ key: '/page2', title: 'Page 2', componentName: 'Page2' });

      expect(tabs.value).toHaveLength(2);
      expect(activeKey.value).toBe('/page2');
      expect(cachedViews.value).toEqual(['Page1', 'Page2']);
    });
    scope.stop();
  });

  it('should not duplicate tab with existing key but activate and update it', () => {
    const scope = effectScope();
    scope.run(() => {
      const { tabs, activeKey, openTab } = useTabsNav();

      openTab({ key: '/page1', title: 'Initial Title' });
      expect(tabs.value).toHaveLength(1);
      expect(activeKey.value).toBe('/page1');

      // 打开不同的页面
      openTab({ key: '/page2', title: 'Page 2' });
      expect(activeKey.value).toBe('/page2');

      // 再次打开 page1，更新 title 并激活
      openTab({ key: '/page1', title: 'Updated Title' });
      expect(tabs.value).toHaveLength(2);
      expect(activeKey.value).toBe('/page1');
      expect(tabs.value[0].title).toBe('Updated Title');
    });
    scope.stop();
  });

  it('should evict oldest unpinned tab when maxTabs is exceeded (FIFO)', () => {
    const scope = effectScope();
    scope.run(() => {
      const { tabs, openTab } = useTabsNav({ maxTabs: 3 });

      // 第一个是固定标签
      openTab({ key: '/home', title: '首页', affix: true });
      openTab({ key: '/a', title: 'Page A' });
      openTab({ key: '/b', title: 'Page B' });

      expect(tabs.value.map(t => t.key)).toEqual(['/home', '/a', '/b']);

      // 再次添加 Page C，达到 4 个，超出 maxTabs=3，应淘汰最旧的未固定项 /a
      openTab({ key: '/c', title: 'Page C' });

      expect(tabs.value).toHaveLength(3);
      expect(tabs.value.map(t => t.key)).toEqual(['/home', '/b', '/c']);
    });
    scope.stop();
  });

  it('should close tab and switch activeKey to adjacent tab', () => {
    const scope = effectScope();
    scope.run(() => {
      const { tabs, activeKey, cachedViews, openTab, closeTab } = useTabsNav();

      openTab({ key: '/t1', title: 'T1', componentName: 'C1' });
      openTab({ key: '/t2', title: 'T2', componentName: 'C2' });
      openTab({ key: '/t3', title: 'T3', componentName: 'C3' });

      // 当前激活的是 t3
      expect(activeKey.value).toBe('/t3');

      // 关闭 t3，应自动激活其左侧项 t2
      closeTab('/t3');
      expect(tabs.value.map(t => t.key)).toEqual(['/t1', '/t2']);
      expect(activeKey.value).toBe('/t2');
      expect(cachedViews.value).toEqual(['C1', 'C2']);

      // 激活 t1 并关闭 t1，应自动激活右侧项 t2
      activeKey.value = '/t1';
      closeTab('/t1');
      expect(tabs.value.map(t => t.key)).toEqual(['/t2']);
      expect(activeKey.value).toBe('/t2');
    });
    scope.stop();
  });

  it('should not close pinned (affix) tab', () => {
    const scope = effectScope();
    scope.run(() => {
      const { tabs, openTab, closeTab } = useTabsNav();

      openTab({ key: '/pinned', title: 'Pinned', affix: true });
      openTab({ key: '/normal', title: 'Normal' });

      // 尝试关闭 pinned 标签，应被忽略
      closeTab('/pinned');
      expect(tabs.value.map(t => t.key)).toEqual(['/pinned', '/normal']);

      // 正常标签可关闭
      closeTab('/normal');
      expect(tabs.value.map(t => t.key)).toEqual(['/pinned']);
    });
    scope.stop();
  });

  it('should batch close other tabs (closeOthers)', () => {
    const scope = effectScope();
    scope.run(() => {
      const { tabs, activeKey, openTab, closeOthers } = useTabsNav();

      openTab({ key: '/home', title: 'Home', affix: true });
      openTab({ key: '/a', title: 'A' });
      openTab({ key: '/b', title: 'B' });
      openTab({ key: '/c', title: 'C' });

      // 关闭除 b 以外的标签，保留 home (affix) 和 b
      closeOthers('/b');

      expect(tabs.value.map(t => t.key)).toEqual(['/home', '/b']);
      expect(activeKey.value).toBe('/b');
    });
    scope.stop();
  });

  it('should batch close left tabs (closeLeft)', () => {
    const scope = effectScope();
    scope.run(() => {
      const { tabs, openTab, closeLeft } = useTabsNav();

      openTab({ key: '/home', title: 'Home', affix: true });
      openTab({ key: '/a', title: 'A' });
      openTab({ key: '/b', title: 'B' });
      openTab({ key: '/c', title: 'C' });

      // 关闭 b 左侧的非固定项（即 /a）
      closeLeft('/b');

      expect(tabs.value.map(t => t.key)).toEqual(['/home', '/b', '/c']);
    });
    scope.stop();
  });

  it('should batch close right tabs (closeRight)', () => {
    const scope = effectScope();
    scope.run(() => {
      const { tabs, openTab, closeRight } = useTabsNav();

      openTab({ key: '/home', title: 'Home', affix: true });
      openTab({ key: '/a', title: 'A' });
      openTab({ key: '/b', title: 'B' });
      openTab({ key: '/c', title: 'C' });

      // 关闭 a 右侧的未固定项（即 /b 和 /c）
      closeRight('/a');

      expect(tabs.value.map(t => t.key)).toEqual(['/home', '/a']);
    });
    scope.stop();
  });

  it('should close all non-affix tabs (closeAll)', () => {
    const scope = effectScope();
    scope.run(() => {
      const { tabs, activeKey, openTab, closeAll } = useTabsNav();

      openTab({ key: '/home', title: 'Home', affix: true });
      openTab({ key: '/a', title: 'A' });
      openTab({ key: '/b', title: 'B' });

      closeAll();

      expect(tabs.value.map(t => t.key)).toEqual(['/home']);
      expect(activeKey.value).toBe('/home');
    });
    scope.stop();
  });

  it('should support moveTab for reordering with affix guards', () => {
    const scope = effectScope();
    scope.run(() => {
      const { tabs, openTab, moveTab } = useTabsNav();

      openTab({ key: '/home', title: 'Home', affix: true });
      openTab({ key: '/a', title: 'A' });
      openTab({ key: '/b', title: 'B' });
      openTab({ key: '/c', title: 'C' });

      // 移动 /c (索引 3) 到 /b 前面 (索引 2)
      moveTab(3, 2);
      expect(tabs.value.map(t => t.key)).toEqual(['/home', '/a', '/c', '/b']);

      // 尝试将普通标签拖到固定标签 /home 前面 (目标索引 0)，应被防呆机制拒绝或限制在固定项之后
      moveTab(2, 0);
      expect(tabs.value[0].key).toBe('/home');
      expect(tabs.value[0].affix).toBe(true);
    });
    scope.stop();
  });

  it('should pin and unpin tab via pinTab', () => {
    const scope = effectScope();
    scope.run(() => {
      const { tabs, openTab, pinTab, closeTab } = useTabsNav();

      openTab({ key: '/a', title: 'A' });
      expect(tabs.value[0].affix).toBeFalsy();

      // Pin tab
      pinTab('/a', true);
      expect(tabs.value[0].affix).toBe(true);

      // Now closeTab should not close it
      closeTab('/a');
      expect(tabs.value).toHaveLength(1);

      // Unpin tab
      pinTab('/a', false);
      expect(tabs.value[0].affix).toBe(false);

      // Now closeTab should close it
      closeTab('/a');
      expect(tabs.value).toHaveLength(0);
    });
    scope.stop();
  });

  it('should toggle isMaximized via toggleMaximize', () => {
    const scope = effectScope();
    scope.run(() => {
      const { isMaximized, toggleMaximize } = useTabsNav();

      expect(isMaximized.value).toBe(false);
      toggleMaximize();
      expect(isMaximized.value).toBe(true);
      toggleMaximize();
      expect(isMaximized.value).toBe(false);
    });
    scope.stop();
  });

  it('should handle refreshTab with transient cachedViews eviction', async () => {
    const scope = effectScope();
    await scope.run(async () => {
      const onRefresh = vi.fn();
      const { cachedViews, refreshTab } = useTabsNav({
        defaultTabs: [{ key: '/page1', title: 'Page 1', componentName: 'Page1' }],
        onRefresh,
      });

      expect(cachedViews.value).toEqual(['Page1']);

      const promise = refreshTab('/page1');
      // 刷新期间 Page1 应被临时剔除以通知 KeepAlive 卸载
      expect(cachedViews.value).toEqual([]);

      await promise;
      // 刷新完成后应回填
      expect(cachedViews.value).toEqual(['Page1']);
      expect(onRefresh).toHaveBeenCalledWith('/page1');
    });
    scope.stop();
  });

  it('should support web storage persistence via persistKey', () => {
    const scope = effectScope();
    scope.run(() => {
      const { openTab } = useTabsNav({
        persistKey: 'test-tabs-key',
        storageType: 'session',
      });

      openTab({ key: '/persisted', title: 'Persisted Page', componentName: 'PersistedComp' });

      // 验证写入 sessionStorage
      const raw = sessionStorage.getItem('test-tabs-key');
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed.tabs[0].key).toBe('/persisted');
      expect(parsed.activeKey).toBe('/persisted');
    });
    scope.stop();

    // 重新初始化，应自动从 sessionStorage 恢复
    const scope2 = effectScope();
    scope2.run(() => {
      const { tabs, activeKey } = useTabsNav({
        persistKey: 'test-tabs-key',
        storageType: 'session',
      });

      expect(tabs.value).toHaveLength(1);
      expect(tabs.value[0].key).toBe('/persisted');
      expect(activeKey.value).toBe('/persisted');
    });
    scope2.stop();
  });

  it('should lock affix: true tabs at the head on openTab and initialize', () => {
    const scope = effectScope();
    scope.run(() => {
      // 初始数据中无序排列
      const { tabs, openTab } = useTabsNav({
        defaultTabs: [
          { key: '/unpinned1', title: '普通页1' },
          { key: '/pinned1', title: '固定页1', affix: true },
          { key: '/unpinned2', title: '普通页2' },
        ],
      });

      // 初始化后固定标签自动排序至前端
      expect(tabs.value[0].key).toBe('/pinned1');
      expect(tabs.value[1].key).toBe('/unpinned1');
      expect(tabs.value[2].key).toBe('/unpinned2');

      // 打开新的 affix: true 标签，必须插入至非固定标签之前（首部固定区）
      openTab({ key: '/pinned2', title: '固定页2', affix: true });
      expect(tabs.value[0].key).toBe('/pinned1');
      expect(tabs.value[1].key).toBe('/pinned2');
      expect(tabs.value[2].key).toBe('/unpinned1');
      expect(tabs.value[3].key).toBe('/unpinned2');

      // 打开普通标签，插入至尾部
      openTab({ key: '/unpinned3', title: '普通页3' });
      expect(tabs.value[4].key).toBe('/unpinned3');
    });
    scope.stop();
  });

  it('should support MaybeRefOrGetter options and explicit setter methods', () => {
    const scope = effectScope();
    scope.run(() => {
      // 通过 Getter 函数传入 options (Vue 3.5 MaybeRefOrGetter 契约)
      const maxLimit = 5;
      const { tabs, activeKey, setTabs, setActiveKey } = useTabsNav(() => ({
        maxTabs: maxLimit,
        defaultActiveKey: '/init',
        defaultTabs: [{ key: '/init', title: 'Init' }],
      }));

      expect(tabs.value).toHaveLength(1);
      expect(activeKey.value).toBe('/init');

      // 显式 setTabs 与 setActiveKey
      setTabs([
        { key: '/t1', title: 'Tab 1' },
        { key: '/t2', title: 'Tab 2' },
      ]);
      expect(tabs.value).toHaveLength(2);

      setActiveKey('/t2');
      expect(activeKey.value).toBe('/t2');
    });
    scope.stop();
  });
});
