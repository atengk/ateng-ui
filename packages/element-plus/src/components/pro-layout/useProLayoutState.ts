/**
 * AtengProLayout 响应式状态机、移动端断点监听、ESC 退出最大化与菜单导航组合式函数。
 *
 * @author Ateng
 * @since 2026-11-24
 */

import { ref, computed, watch, provide, useSlots, onMounted, onBeforeUnmount } from 'vue';
import {
  asMenuRecord,
  findBreadcrumbs,
  findFirstLeaf,
  isItemOrDescendant,
  toPx,
  type BreadcrumbItem,
} from './menuUtils';
import {
  ATENG_PRO_LAYOUT_KEY,
  type AtengProLayoutContext,
  type AtengProLayoutProps,
  type ProMenuItem,
  type ProMenuRawItem,
} from './types';

export interface ProLayoutStateHandlers {
  onUpdateCollapsed: (val: boolean) => void;
  onCollapseChange: (val: boolean) => void;
  onUpdateActiveMenu: (path: string) => void;
  onMenuSelect: (path: string, item: ProMenuItem) => void;
  onUpdateIsMaximized: (val: boolean) => void;
  onMaximizeChange: (val: boolean) => void;
}

/**
 * 构建并驱动 AtengProLayout 全量运行时状态并向下层 inject 消费方派发上下文总线。
 */
export function useProLayoutState(props: AtengProLayoutProps, handlers: ProLayoutStateHandlers) {
  const slots = useSlots();

  const internalCollapsed = ref(Boolean(props.collapsed));
  const internalMaximized = ref(Boolean(props.isMaximized));
  const isMobile = ref(false);
  let mql: MediaQueryList | null = null;
  let mqlListener: ((e: MediaQueryListEvent | MediaQueryList) => void) | null = null;

  const updateMobileState = (matches: boolean, isInit = false) => {
    isMobile.value = matches;
    if (matches && !isInit) {
      internalCollapsed.value = true;
      handlers.onUpdateCollapsed(true);
      handlers.onCollapseChange(true);
    }
  };

  const closeMobileDrawer = () => {
    if (!isMobile.value) return;
    internalCollapsed.value = true;
    handlers.onUpdateCollapsed(true);
    handlers.onCollapseChange(true);
  };

  const toggleCollapse = () => {
    if (props.collapsible === false) return;
    const next = !internalCollapsed.value;
    internalCollapsed.value = next;
    handlers.onUpdateCollapsed(next);
    handlers.onCollapseChange(next);
  };

  const toggleMaximize = (val?: boolean) => {
    const next = typeof val === 'boolean' ? val : !internalMaximized.value;
    if (internalMaximized.value !== next) {
      internalMaximized.value = next;
      handlers.onUpdateIsMaximized(next);
      handlers.onMaximizeChange(next);
    }
  };

  const handleEscapeKeydown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || event.defaultPrevented) return;
    if (props.escExit !== false && internalMaximized.value) {
      toggleMaximize(false);
    }
  };

  onMounted(() => {
    if (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      props.responsive !== false
    ) {
      mql = window.matchMedia(`(max-width: ${props.mobileBreakpoint ?? 768}px)`);
      updateMobileState(mql.matches, true);
      mqlListener = (e: MediaQueryListEvent | MediaQueryList) => {
        updateMobileState(e.matches, false);
      };
      if (typeof mql.addEventListener === 'function') {
        mql.addEventListener('change', mqlListener);
      }
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('keydown', handleEscapeKeydown);
    }
  });

  onBeforeUnmount(() => {
    if (mql && mqlListener) {
      if (typeof mql.removeEventListener === 'function') {
        mql.removeEventListener('change', mqlListener);
      }
      mql = null;
      mqlListener = null;
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('keydown', handleEscapeKeydown);
    }
  });

  watch(
    () => props.collapsed,
    val => {
      internalCollapsed.value = Boolean(val);
    },
  );

  watch(
    () => props.isMaximized,
    val => {
      internalMaximized.value = Boolean(val);
    },
  );

  const pathKey = computed(() => props.fieldNames?.path || 'path');
  const titleKey = computed(() => props.fieldNames?.title || 'title');
  const childrenKey = computed(() => props.fieldNames?.children || 'children');
  const activeTopMenuPath = ref<string>('');
  const menuList = computed(() => props.menuData ?? []);

  const handleMenuSelect = (path: string, item?: ProMenuItem) => {
    handlers.onUpdateActiveMenu(path);
    if (item) {
      handlers.onMenuSelect(path, item);
    }
    if (isMobile.value) {
      closeMobileDrawer();
    }
  };

  watch(
    () => [props.activeMenu, props.menuData],
    () => {
      const activePath = props.activeMenu;
      if (props.layout !== 'mix' || !activePath) return;
      const matchedTop = menuList.value.find(item =>
        isItemOrDescendant(item, activePath, pathKey.value, childrenKey.value),
      );
      if (matchedTop) {
        const record = asMenuRecord(matchedTop);
        activeTopMenuPath.value = String(record[pathKey.value] ?? record.path ?? '');
      }
    },
    { immediate: true },
  );

  const handleMixTopSelect = (path: string) => {
    activeTopMenuPath.value = path;
    const topItem = menuList.value.find(i => {
      const record = asMenuRecord(i);
      return String(record[pathKey.value] ?? record.path ?? '') === path;
    });
    if (!topItem) return;

    const children = asMenuRecord(topItem)[childrenKey.value] as ProMenuRawItem[] | undefined;
    if (Array.isArray(children) && children.length > 0) {
      if (props.mixAutoSelectFirstLeaf !== false) {
        const firstLeaf = findFirstLeaf(topItem, childrenKey.value);
        const leafRecord = asMenuRecord(firstLeaf);
        const leafPath = String(leafRecord[pathKey.value] ?? leafRecord.path ?? '');
        handleMenuSelect(leafPath, firstLeaf as ProMenuItem);
      }
    } else {
      handleMenuSelect(path, topItem as ProMenuItem);
    }
  };

  const currentAsideMenuData = computed<ProMenuRawItem[]>(() => {
    if (props.layout !== 'mix') return menuList.value;
    const activeTop =
      menuList.value.find(item => {
        const record = asMenuRecord(item);
        const p = String(record[pathKey.value] ?? record.path ?? '');
        if (activeTopMenuPath.value) return p === activeTopMenuPath.value;
        if (
          props.activeMenu &&
          isItemOrDescendant(item, props.activeMenu, pathKey.value, childrenKey.value)
        ) {
          return true;
        }
        return false;
      }) || menuList.value[0];

    if (!activeTop) return [];
    const children = asMenuRecord(activeTop)[childrenKey.value] as ProMenuRawItem[] | undefined;
    return Array.isArray(children) ? children : [];
  });

  const mixTopMenuData = computed<ProMenuRawItem[]>(() =>
    menuList.value.map(item => ({
      ...asMenuRecord(item),
      [childrenKey.value]: undefined,
    })),
  );

  const breadcrumbItems = computed<BreadcrumbItem[]>(() => {
    if (!props.activeMenu) return [];
    return findBreadcrumbs(
      menuList.value,
      props.activeMenu,
      pathKey.value,
      titleKey.value,
      childrenKey.value,
    );
  });

  const layoutMode = computed(() => props.layout ?? 'side');
  const isFixedHeader = computed(() => props.fixedHeader !== false);
  const isFixedAside = computed(() => props.fixedAside !== false);
  const isViewportLocked = computed(
    () => isFixedHeader.value && isFixedAside.value && !internalMaximized.value,
  );
  const currentHeaderHeight = computed(() =>
    internalMaximized.value ? '0px' : toPx(props.headerHeight ?? '56px'),
  );
  const hasTabsArea = computed(() => Boolean(props.showTabs || slots.tabs));
  const currentTabsHeight = computed(() => {
    if (internalMaximized.value || !hasTabsArea.value) return '0px';
    return toPx(props.tabsProps?.height ?? props.tabsHeight ?? '38px');
  });
  const currentAsideWidth = computed(() => {
    if (internalMaximized.value || layoutMode.value === 'top' || isMobile.value) return '0px';
    if (layoutMode.value === 'mix' && currentAsideMenuData.value.length === 0) return '0px';
    return internalCollapsed.value
      ? toPx(props.asideCollapsedWidth ?? '64px')
      : toPx(props.asideWidth ?? '220px');
  });

  const rootCssVars = computed(() => ({
    '--at-pro-header-height': toPx(props.headerHeight ?? '56px') || '56px',
    '--at-pro-aside-width': currentAsideWidth.value || '0px',
    '--at-pro-tabs-height': currentTabsHeight.value || '0px',
    '--at-pro-content-padding': toPx(props.contentPadding ?? '16px') || '16px',
  }));

  const proLayoutContext: AtengProLayoutContext = {
    collapsed: computed(() => internalCollapsed.value),
    asideWidth: currentAsideWidth,
    headerHeight: currentHeaderHeight,
    tabsHeight: currentTabsHeight,
    layout: layoutMode,
    fixedHeader: isFixedHeader,
    fixedAside: isFixedAside,
    isMobile: computed(() => isMobile.value),
    isMaximized: computed(() => internalMaximized.value),
    toggleCollapse,
    toggleMaximize,
  };
  provide(ATENG_PRO_LAYOUT_KEY, proLayoutContext);

  return {
    internalCollapsed,
    internalMaximized,
    isMobile,
    isViewportLocked,
    activeTopMenuPath,
    currentAsideWidth,
    currentAsideMenuData,
    mixTopMenuData,
    breadcrumbItems,
    rootCssVars,
    closeMobileDrawer,
    toggleCollapse,
    toggleMaximize,
    handleMenuSelect,
    handleMixTopSelect,
  };
}
