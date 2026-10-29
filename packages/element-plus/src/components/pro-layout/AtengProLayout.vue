<script setup lang="ts">
/**
 * 企业级框架布局容器组件 AtengProLayout。
 *
 * 核心特性：
 * 1. 原生支持 side（侧边导航）、top（顶部通栏）、mix（顶左混合）三大中后台经典形态；
 * 2. 数据驱动菜单渲染（ProMenu），内置递归节点与后端异构字段自适应映射（fieldNames）；
 * 3. 视口固定与弹性伸缩：受控/非受控侧边栏平滑折叠，多维度插槽细粒度覆盖；
 * 4. 上下文总线依赖注入：通过 ATENG_PRO_LAYOUT_KEY 向下派发布局状态，协同 AtengFooterBar 动态避让；
 * 5. 纯原生原生优先，零额外 npm 依赖引入。
 *
 * @author Ateng
 * @since 2026-10-29
 */

import { ref, computed, watch, provide, onMounted, onBeforeUnmount } from 'vue';
import { ElBreadcrumb, ElBreadcrumbItem } from 'element-plus';
import { AtengLayout, AtengHeader, AtengAside, AtengContent } from '../layout';
import type { TabItem } from '../tabs-nav';
import ProMenu from './ProMenu.vue';
import ProLayoutTabs from './ProLayoutTabs.vue';
import {
  type AtengProLayoutProps,
  type AtengProLayoutEmits,
  type AtengProLayoutSlots,
  type AtengProLayoutExpose,
  type AtengProLayoutContext,
  type ProMenuItem,
  ATENG_PRO_LAYOUT_KEY,
} from './types';

defineOptions({
  name: 'AtengProLayout',
});

const props = withDefaults(defineProps<AtengProLayoutProps>(), {
  layout: 'side',
  title: 'Ateng Admin',
  logo: undefined,
  menuData: () => [],
  fieldNames: undefined,
  activeMenu: '',
  defaultOpeneds: () => [],
  collapsed: false,
  collapsible: true,
  showCollapseTrigger: true,
  collapseTriggerPosition: 'header',
  asideWidth: '220px',
  asideCollapsedWidth: '64px',
  headerHeight: '56px',
  tabsHeight: '38px',
  fixedHeader: true,
  fixedAside: true,
  showBreadcrumb: true,
  breadcrumbSeparator: '/',
  mixAutoSelectFirstLeaf: true,
  responsive: true,
  mobileBreakpoint: 768,
  showTabs: false,
  tabsProps: undefined,
  isMaximized: false,
});

const emit = defineEmits<AtengProLayoutEmits>();
defineSlots<AtengProLayoutSlots>();

// 1. 折叠状态机、全屏沉浸最大化与移动端响应式识别
const internalCollapsed = ref(Boolean(props.collapsed));
const internalMaximized = ref(Boolean(props.isMaximized));
const isMobile = ref(false);
let mql: MediaQueryList | null = null;

const updateMobileState = (matches: boolean, isInit = false) => {
  isMobile.value = matches;
  if (matches && !isInit) {
    internalCollapsed.value = true;
    emit('update:collapsed', true);
    emit('collapseChange', true);
  }
};

const closeMobileDrawer = () => {
  if (!isMobile.value) return;
  internalCollapsed.value = true;
  emit('update:collapsed', true);
  emit('collapseChange', true);
};

let mqlListener: ((e: MediaQueryListEvent | MediaQueryList) => void) | null = null;

onMounted(() => {
  if (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    props.responsive
  ) {
    mql = window.matchMedia(`(max-width: ${props.mobileBreakpoint}px)`);
    updateMobileState(mql.matches, true);
    mqlListener = (e: MediaQueryListEvent | MediaQueryList) => {
      updateMobileState(e.matches, false);
    };
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', mqlListener);
    } else if (
      typeof (mql as unknown as { addListener?: (fn: unknown) => void }).addListener === 'function'
    ) {
      (mql as unknown as { addListener: (fn: unknown) => void }).addListener(mqlListener);
    }
  }
});

onBeforeUnmount(() => {
  if (mql && mqlListener) {
    if (typeof mql.removeEventListener === 'function') {
      mql.removeEventListener('change', mqlListener);
    } else if (
      typeof (mql as unknown as { removeListener?: (fn: unknown) => void }).removeListener ===
      'function'
    ) {
      (mql as unknown as { removeListener: (fn: unknown) => void }).removeListener(mqlListener);
    }
    mql = null;
    mqlListener = null;
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

const toggleCollapse = () => {
  if (!props.collapsible) return;
  const next = !internalCollapsed.value;
  internalCollapsed.value = next;
  emit('update:collapsed', next);
  emit('collapseChange', next);
};

const toggleMaximize = (val?: boolean) => {
  const next = typeof val === 'boolean' ? val : !internalMaximized.value;
  if (internalMaximized.value !== next) {
    internalMaximized.value = next;
    emit('update:isMaximized', next);
    emit('maximizeChange', next);
  }
};

// 2. 尺寸单位规格化工具
function toPx(val: string | number | undefined): string {
  if (val === undefined || val === null || val === '') return '';
  return typeof val === 'number' ? `${val}px` : String(val);
}

const currentHeaderHeight = computed(() => {
  if (internalMaximized.value) return '0px';
  return toPx(props.headerHeight);
});
const currentAsideWidth = computed(() => {
  if (internalMaximized.value) return '0px';
  if (props.layout === 'top') return '0px';
  if (isMobile.value) return '0px';
  if (props.layout === 'mix' && currentAsideMenuData.value.length === 0) return '0px';
  return internalCollapsed.value ? toPx(props.asideCollapsedWidth) : toPx(props.asideWidth);
});

// 3. 上下文总线依赖注入 (Provide ATENG_PRO_LAYOUT_KEY)
const proLayoutContext: AtengProLayoutContext = {
  collapsed: computed(() => internalCollapsed.value),
  asideWidth: currentAsideWidth,
  headerHeight: currentHeaderHeight,
  layout: computed(() => props.layout),
  isMobile: computed(() => isMobile.value),
  isMaximized: computed(() => internalMaximized.value),
  toggleCollapse,
  toggleMaximize,
};
provide(ATENG_PRO_LAYOUT_KEY, proLayoutContext);

// 4. 字段解析与菜单导航
const pathKey = computed(() => props.fieldNames?.path || 'path');
const titleKey = computed(() => props.fieldNames?.title || 'title');
const childrenKey = computed(() => props.fieldNames?.children || 'children');

const handleMenuSelect = (path: string, item?: ProMenuItem) => {
  emit('update:activeMenu', path);
  if (item) {
    emit('menuSelect', path, item);
  }
  if (isMobile.value) {
    closeMobileDrawer();
  }
};

// 5. mix 模式下菜单数据分流与第一叶子导航
const activeTopMenuPath = ref<string>('');

function isItemOrDescendant(item: ProMenuItem, targetPath: string): boolean {
  const p = String(item[pathKey.value] ?? item.path);
  if (p === targetPath) return true;
  const children = item[childrenKey.value] as ProMenuItem[] | undefined;
  if (Array.isArray(children)) {
    return children.some(child => isItemOrDescendant(child, targetPath));
  }
  return false;
}

function findFirstLeaf(item: ProMenuItem): ProMenuItem {
  const children = item[childrenKey.value] as ProMenuItem[] | undefined;
  if (Array.isArray(children) && children.length > 0) {
    const firstChild = children[0];
    if (firstChild) {
      return findFirstLeaf(firstChild);
    }
  }
  return item;
}

// 自动根据 activeMenu 同步当前激活的一级顶级菜单
watch(
  () => [props.activeMenu, props.menuData],
  () => {
    if (props.layout !== 'mix' || !props.activeMenu) return;
    const matchedTop = props.menuData.find(item => isItemOrDescendant(item, props.activeMenu!));
    if (matchedTop) {
      activeTopMenuPath.value = String(matchedTop[pathKey.value] ?? matchedTop.path);
    }
  },
  { immediate: true },
);

const handleMixTopSelect = (path: string) => {
  activeTopMenuPath.value = path;
  const topItem = props.menuData.find(i => String(i[pathKey.value] ?? i.path) === path);
  if (!topItem) return;

  const children = topItem[childrenKey.value] as ProMenuItem[] | undefined;
  const hasChildren = Array.isArray(children) && children.length > 0;

  if (hasChildren) {
    if (props.mixAutoSelectFirstLeaf) {
      const firstLeaf = findFirstLeaf(topItem);
      const leafPath = String(firstLeaf[pathKey.value] ?? firstLeaf.path);
      handleMenuSelect(leafPath, firstLeaf);
    }
  } else {
    handleMenuSelect(path, topItem);
  }
};

// 计算当前 Aside 渲染的菜单项
const currentAsideMenuData = computed<ProMenuItem[]>(() => {
  if (props.layout !== 'mix') {
    return props.menuData;
  }
  // mix 模式：找到对应的一级菜单项，渲染其 children
  const activeTop =
    props.menuData.find(item => {
      const p = String(item[pathKey.value] ?? item.path);
      if (activeTopMenuPath.value) {
        return p === activeTopMenuPath.value;
      }
      if (props.activeMenu && isItemOrDescendant(item, props.activeMenu)) {
        return true;
      }
      return false;
    }) || props.menuData[0];

  if (!activeTop) return [];
  const children = activeTop[childrenKey.value] as ProMenuItem[] | undefined;
  return Array.isArray(children) ? children : [];
});

// mix 模式顶栏菜单数据（只保留顶层节点）
const mixTopMenuData = computed<ProMenuItem[]>(() => {
  return props.menuData.map(item => ({
    ...item,
    [childrenKey.value]: undefined,
  }));
});

// 6. 面包屑路径计算
interface BreadcrumbItem {
  title: string;
  path: string;
}

function findBreadcrumbs(
  items: ProMenuItem[],
  target: string,
  ancestors: BreadcrumbItem[] = [],
): BreadcrumbItem[] | null {
  for (const item of items) {
    const p = String(item[pathKey.value] ?? item.path);
    const t = String(item[titleKey.value] ?? item.title);
    const currentTrail = [...ancestors, { title: t, path: p }];
    if (p === target) {
      return currentTrail;
    }
    const children = item[childrenKey.value] as ProMenuItem[] | undefined;
    if (Array.isArray(children) && children.length > 0) {
      const match = findBreadcrumbs(children, target, currentTrail);
      if (match) return match;
    }
  }
  return null;
}

const breadcrumbItems = computed<BreadcrumbItem[]>(() => {
  if (!props.activeMenu) return [];
  const trail = findBreadcrumbs(props.menuData, props.activeMenu);
  return trail || [];
});

defineExpose<AtengProLayoutExpose>({
  toggleCollapse,
  toggleMaximize,
  collapsed: computed(() => internalCollapsed.value),
  isMaximized: computed(() => internalMaximized.value),
  asideWidth: currentAsideWidth,
});
</script>

<template>
  <div
    class="at-pro-layout"
    :class="[
      `at-pro-layout--${layout}`,
      {
        'is-collapsed': internalCollapsed,
        'is-mobile': isMobile,
        'is-maximized': internalMaximized,
      },
    ]"
  >
    <!-- ===================== A. SIDE 模式 ===================== -->
    <template v-if="layout === 'side'">
      <!-- 移动端抽屉遮罩 -->
      <div
        v-if="isMobile && !internalCollapsed"
        class="at-pro-layout__drawer-mask"
        @click="closeMobileDrawer"
      />

      <AtengLayout direction="horizontal" class="at-pro-layout__container">
        <!-- 侧边栏 Aside -->
        <AtengAside
          class="at-pro-layout__aside"
          :class="{ 'is-mobile-drawer': isMobile }"
          :width="asideWidth"
          :collapsed-width="asideCollapsedWidth"
          :collapsed="internalCollapsed"
        >
          <!-- Logo 区域 -->
          <div class="at-pro-layout__logo">
            <slot name="logo" :collapsed="internalCollapsed" :title="title" :logo="logo">
              <img v-if="logo" :src="logo" class="at-pro-layout__logo-img" alt="logo" />
              <span v-if="!internalCollapsed" class="at-pro-layout__title">{{ title }}</span>
            </slot>
          </div>

          <!-- 侧边菜单区域 -->
          <div class="at-pro-layout__aside-menu">
            <slot
              name="menu"
              :menu-data="currentAsideMenuData"
              mode="vertical"
              :collapsed="internalCollapsed"
            >
              <ProMenu
                :menu-data="currentAsideMenuData"
                mode="vertical"
                :collapse="internalCollapsed"
                :field-names="fieldNames"
                :active-menu="activeMenu"
                :default-openeds="defaultOpeneds"
                @select="handleMenuSelect"
              >
                <template v-if="$slots.menuItem" #menuItem="slotProps">
                  <slot name="menuItem" v-bind="slotProps" />
                </template>
              </ProMenu>
            </slot>
          </div>

          <!-- 侧边栏底部插槽 -->
          <div v-if="$slots.asideFooter" class="at-pro-layout__aside-footer">
            <slot name="asideFooter" :collapsed="internalCollapsed" />
          </div>

          <!-- 侧边栏底部折叠把手（可选模式） -->
          <div
            v-if="collapsible && showCollapseTrigger && collapseTriggerPosition === 'aside'"
            class="at-pro-layout__aside-collapse"
            @click="toggleCollapse"
          >
            <div class="at-pro-layout__collapse-btn" role="button" tabindex="0">
              <svg viewBox="0 0 1024 1024" width="16" height="16" fill="currentColor">
                <path
                  v-if="internalCollapsed"
                  d="M408 442h480c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8H408c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8zm-8 204c0 4.4 3.6 8 8 8h480c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8H408c-4.4 0-8 3.6-8 8v56zm504-486H120c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8h784c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8zm0 632H120c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8h784c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8zM142.4 642.1l145.7-113.1c9.7-7.6 9.7-22.3 0-29.9L142.4 386c-13.3-10.3-32.4-0.9-32.4 15v226c0 16 19.1 25.4 32.4 15.1z"
                />
                <path
                  v-else
                  d="M408 442h480c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8H408c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8zm-8 204c0 4.4 3.6 8 8 8h480c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8H408c-4.4 0-8 3.6-8 8v56zm504-486H120c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8h784c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8zm0 632H120c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8h784c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8zM287.9 386L142.2 499.1c-9.7 7.6-9.7 22.3 0 29.9l145.7 113.1c13.3 10.3 32.4 0.9 32.4-15v-226c0-16-19.1-25.4-32.4-15.1z"
                />
              </svg>
            </div>
          </div>
        </AtengAside>

        <!-- 主体右侧区域 -->
        <AtengLayout direction="vertical" class="at-pro-layout__main">
          <!-- 顶栏 Header -->
          <AtengHeader class="at-pro-layout__header" :height="headerHeight">
            <div class="at-pro-layout__header-left">
              <!-- 折叠把手（顶栏默认） -->
              <div
                v-if="collapsible && showCollapseTrigger && collapseTriggerPosition === 'header'"
                class="at-pro-layout__collapse-btn"
                role="button"
                tabindex="0"
                @click="toggleCollapse"
              >
                <svg viewBox="0 0 1024 1024" width="18" height="18" fill="currentColor">
                  <path
                    v-if="internalCollapsed"
                    d="M408 442h480c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8H408c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8zm-8 204c0 4.4 3.6 8 8 8h480c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8H408c-4.4 0-8 3.6-8 8v56zm504-486H120c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8h784c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8zm0 632H120c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8h784c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8zM142.4 642.1l145.7-113.1c9.7-7.6 9.7-22.3 0-29.9L142.4 386c-13.3-10.3-32.4-0.9-32.4 15v226c0 16 19.1 25.4 32.4 15.1z"
                  />
                  <path
                    v-else
                    d="M408 442h480c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8H408c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8zm-8 204c0 4.4 3.6 8 8 8h480c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8H408c-4.4 0-8 3.6-8 8v56zm504-486H120c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8h784c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8zm0 632H120c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8h784c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8zM287.9 386L142.2 499.1c-9.7 7.6-9.7 22.3 0 29.9l145.7 113.1c13.3 10.3 32.4 0.9 32.4-15v-226c0-16-19.1-25.4-32.4-15.1z"
                  />
                </svg>
              </div>

              <!-- 自定义顶栏左侧插槽 -->
              <slot name="headerLeft" />

              <!-- 面包屑导航 -->
              <div v-if="showBreadcrumb" class="at-pro-layout__breadcrumb">
                <slot name="breadcrumb">
                  <el-breadcrumb :separator="breadcrumbSeparator">
                    <el-breadcrumb-item v-for="item in breadcrumbItems" :key="item.path">
                      <span>{{ item.title }}</span>
                    </el-breadcrumb-item>
                  </el-breadcrumb>
                </slot>
              </div>
            </div>

            <!-- 顶栏中间区 -->
            <div class="at-pro-layout__header-center">
              <slot name="headerCenter" />
            </div>

            <!-- 顶栏右侧区 -->
            <div class="at-pro-layout__header-right">
              <slot name="headerRight">
                <div v-if="$slots.headerActions" class="at-pro-layout__header-actions">
                  <slot name="headerActions" />
                </div>
                <div v-if="$slots.user" class="at-pro-layout__header-user">
                  <slot name="user" />
                </div>
              </slot>
            </div>
          </AtengHeader>

          <!-- 多标签栏插槽（AtengTabsNav） -->
          <ProLayoutTabs
            v-if="$slots.tabs || showTabs"
            :show-tabs="showTabs"
            :tabs-props="tabsProps"
            :is-maximized="internalMaximized"
            @update:is-maximized="toggleMaximize"
            @maximize-change="toggleMaximize"
            @tab-click="(tab: TabItem) => emit('tabClick', tab)"
            @tab-close="(key: string, tab: TabItem) => emit('tabClose', key, tab)"
            @tab-refresh="(key: string, tab: TabItem) => emit('tabRefresh', key, tab)"
            @update:tabs="(tabs: TabItem[]) => emit('update:tabs', tabs)"
            @tab-order-change="(tabs: TabItem[]) => emit('tabOrderChange', tabs)"
          >
            <template v-if="$slots.tabs" #tabs>
              <slot name="tabs" />
            </template>
          </ProLayoutTabs>

          <!-- 内容主体区 -->
          <AtengContent class="at-pro-layout__content">
            <slot />
          </AtengContent>

          <!-- 底部区 -->
          <div v-if="$slots.footer" class="at-pro-layout__footer">
            <slot name="footer" />
          </div>
        </AtengLayout>
      </AtengLayout>
    </template>

    <!-- ===================== B. TOP 模式 ===================== -->
    <template v-else-if="layout === 'top'">
      <AtengLayout direction="vertical" class="at-pro-layout__container">
        <!-- 顶栏 Header -->
        <AtengHeader class="at-pro-layout__header" :height="headerHeight">
          <!-- Logo 区域 -->
          <div class="at-pro-layout__logo">
            <slot name="logo" :collapsed="false" :title="title" :logo="logo">
              <img v-if="logo" :src="logo" class="at-pro-layout__logo-img" alt="logo" />
              <span class="at-pro-layout__title">{{ title }}</span>
            </slot>
          </div>

          <!-- 顶部横向菜单区域 -->
          <div class="at-pro-layout__top-menu">
            <slot name="menu" :menu-data="menuData" mode="horizontal" :collapsed="false">
              <ProMenu
                :menu-data="menuData"
                mode="horizontal"
                :field-names="fieldNames"
                :active-menu="activeMenu"
                :default-openeds="defaultOpeneds"
                @select="handleMenuSelect"
              >
                <template v-if="$slots.menuItem" #menuItem="slotProps">
                  <slot name="menuItem" v-bind="slotProps" />
                </template>
              </ProMenu>
            </slot>
          </div>

          <!-- 顶栏右侧区 -->
          <div class="at-pro-layout__header-right">
            <slot name="headerRight">
              <div v-if="$slots.headerActions" class="at-pro-layout__header-actions">
                <slot name="headerActions" />
              </div>
              <div v-if="$slots.user" class="at-pro-layout__header-user">
                <slot name="user" />
              </div>
            </slot>
          </div>
        </AtengHeader>

        <!-- 多标签栏插槽（AtengTabsNav） -->
        <ProLayoutTabs
          v-if="$slots.tabs || showTabs"
          :show-tabs="showTabs"
          :tabs-props="tabsProps"
          :is-maximized="internalMaximized"
          @update:is-maximized="toggleMaximize"
          @maximize-change="toggleMaximize"
          @tab-click="(tab: TabItem) => emit('tabClick', tab)"
          @tab-close="(key: string, tab: TabItem) => emit('tabClose', key, tab)"
          @tab-refresh="(key: string, tab: TabItem) => emit('tabRefresh', key, tab)"
          @update:tabs="(tabs: TabItem[]) => emit('update:tabs', tabs)"
          @tab-order-change="(tabs: TabItem[]) => emit('tabOrderChange', tabs)"
        >
          <template v-if="$slots.tabs" #tabs>
            <slot name="tabs" />
          </template>
        </ProLayoutTabs>

        <!-- 内容主体区 -->
        <AtengContent class="at-pro-layout__content">
          <slot />
        </AtengContent>

        <!-- 底部区 -->
        <div v-if="$slots.footer" class="at-pro-layout__footer">
          <slot name="footer" />
        </div>
      </AtengLayout>
    </template>

    <!-- ===================== C. MIX 模式 ===================== -->
    <template v-else-if="layout === 'mix'">
      <AtengLayout direction="vertical" class="at-pro-layout__container">
        <!-- 顶栏 Header：Logo + 一级横向菜单 + 右侧区 -->
        <AtengHeader class="at-pro-layout__header" :height="headerHeight">
          <div class="at-pro-layout__logo">
            <slot name="logo" :collapsed="false" :title="title" :logo="logo">
              <img v-if="logo" :src="logo" class="at-pro-layout__logo-img" alt="logo" />
              <span class="at-pro-layout__title">{{ title }}</span>
            </slot>
          </div>

          <div class="at-pro-layout__top-menu">
            <ProMenu
              :menu-data="mixTopMenuData"
              mode="horizontal"
              :field-names="fieldNames"
              :active-menu="activeTopMenuPath || activeMenu"
              @select="handleMixTopSelect"
            >
              <template v-if="$slots.menuItem" #menuItem="slotProps">
                <slot name="menuItem" v-bind="slotProps" />
              </template>
            </ProMenu>
          </div>

          <div class="at-pro-layout__header-right">
            <slot name="headerRight" />
          </div>
        </AtengHeader>

        <!-- 下方横向分栏：Aside + Main -->
        <AtengLayout direction="horizontal" class="at-pro-layout__container">
          <!-- 移动端抽屉遮罩 -->
          <div
            v-if="isMobile && !internalCollapsed && currentAsideMenuData.length > 0"
            class="at-pro-layout__drawer-mask"
            @click="closeMobileDrawer"
          />

          <AtengAside
            v-if="currentAsideMenuData.length > 0"
            class="at-pro-layout__aside"
            :class="{ 'is-mobile-drawer': isMobile }"
            :width="asideWidth"
            :collapsed-width="asideCollapsedWidth"
            :collapsed="internalCollapsed"
          >
            <div class="at-pro-layout__aside-menu">
              <ProMenu
                :menu-data="currentAsideMenuData"
                mode="vertical"
                :collapse="internalCollapsed"
                :field-names="fieldNames"
                :active-menu="activeMenu"
                :default-openeds="defaultOpeneds"
                @select="handleMenuSelect"
              >
                <template v-if="$slots.menuItem" #menuItem="slotProps">
                  <slot name="menuItem" v-bind="slotProps" />
                </template>
              </ProMenu>
            </div>
          </AtengAside>

          <AtengLayout direction="vertical" class="at-pro-layout__main">
            <!-- 多标签栏插槽（AtengTabsNav） -->
            <ProLayoutTabs
              v-if="$slots.tabs || showTabs"
              :show-tabs="showTabs"
              :tabs-props="tabsProps"
              :is-maximized="internalMaximized"
              @update:is-maximized="toggleMaximize"
              @maximize-change="toggleMaximize"
              @tab-click="(tab: TabItem) => emit('tabClick', tab)"
              @tab-close="(key: string, tab: TabItem) => emit('tabClose', key, tab)"
              @tab-refresh="(key: string, tab: TabItem) => emit('tabRefresh', key, tab)"
              @update:tabs="(tabs: TabItem[]) => emit('update:tabs', tabs)"
              @tab-order-change="(tabs: TabItem[]) => emit('tabOrderChange', tabs)"
            >
              <template v-if="$slots.tabs" #tabs>
                <slot name="tabs" />
              </template>
            </ProLayoutTabs>
            <AtengContent class="at-pro-layout__content">
              <slot />
            </AtengContent>
            <div v-if="$slots.footer" class="at-pro-layout__footer">
              <slot name="footer" />
            </div>
          </AtengLayout>
        </AtengLayout>
      </AtengLayout>
    </template>
  </div>
</template>

<style scoped>
.at-pro-layout {
  min-height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--el-bg-color-page);
  box-sizing: border-box;
}

.at-pro-layout__container {
  height: 100%;
  min-height: 100%;
  width: 100%;
  flex: 1;
}

.at-pro-layout__aside {
  background-color: var(--el-bg-color);
  border-right: 1px solid var(--el-border-color-lighter);
  display: flex;
  flex-direction: column;
  transition: width 0.25s cubic-bezier(0.2, 0, 0, 1);
  overflow-x: hidden;
  overflow-y: auto;
  position: relative;
  z-index: 101;
  flex-shrink: 0;
}

.at-pro-layout__logo {
  height: 56px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  border-bottom: 1px solid var(--el-border-color-extra-light);
  flex-shrink: 0;
  overflow: hidden;
  white-space: nowrap;
}

.at-pro-layout__logo-img {
  height: 32px;
  width: 32px;
  margin-right: 12px;
  object-fit: contain;
}

.at-pro-layout__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  overflow: hidden;
  text-overflow: ellipsis;
}

.at-pro-layout__aside-menu {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.at-pro-layout__aside-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--el-border-color-extra-light);
  flex-shrink: 0;
}

.at-pro-layout__aside-collapse {
  padding: 12px 16px;
  border-top: 1px solid var(--el-border-color-extra-light);
  display: flex;
  justify-content: center;
  cursor: pointer;
}

.at-pro-layout__main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%;
  background-color: var(--el-bg-color-page);
  position: relative;
  overflow: hidden;
}

.at-pro-layout__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background-color: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-lighter);
  flex-shrink: 0;
  box-sizing: border-box;
  position: relative;
  z-index: 100;
}

.at-pro-layout__header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.at-pro-layout__collapse-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 4px;
  cursor: pointer;
  color: var(--el-text-color-regular);
  transition: all 0.2s;
}

.at-pro-layout__collapse-btn:hover {
  background-color: var(--el-fill-color-light);
  color: var(--el-color-primary);
}

.at-pro-layout__breadcrumb {
  display: flex;
  align-items: center;
}

.at-pro-layout__header-center {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
}

.at-pro-layout__header-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.at-pro-layout__top-menu {
  flex: 1;
  min-width: 0;
  margin: 0 16px;
  overflow: hidden;
}

.at-pro-layout__tabs {
  flex-shrink: 0;
  z-index: 10;
}

.at-pro-layout__content {
  flex: 1;
  padding: 16px;
  box-sizing: border-box;
  min-height: 0;
}

.at-pro-layout__footer {
  flex-shrink: 0;
  z-index: 99;
}

.at-pro-layout__drawer-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.45);
  z-index: 1999;
  backdrop-filter: blur(2px);
  transition: opacity 0.25s cubic-bezier(0.2, 0, 0, 1);
}

.at-pro-layout__aside.is-mobile-drawer {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  height: 100%;
  z-index: 2000;
  box-shadow: var(--el-box-shadow-dark);
  transition:
    transform 0.25s cubic-bezier(0.2, 0, 0, 1),
    width 0.25s;
}

.at-pro-layout.is-mobile.is-collapsed .at-pro-layout__aside.is-mobile-drawer {
  transform: translateX(-100%);
  pointer-events: none;
}

.at-pro-layout.is-mobile:not(.is-collapsed) .at-pro-layout__aside.is-mobile-drawer {
  transform: translateX(0);
}

/* ===================== 全屏沉浸最大化模式样式 ===================== */
.at-pro-layout.is-maximized .at-pro-layout__header {
  display: none !important;
}

.at-pro-layout.is-maximized .at-pro-layout__aside {
  display: none !important;
}

.at-pro-layout.is-maximized .at-pro-layout__drawer-mask {
  display: none !important;
}
</style>
