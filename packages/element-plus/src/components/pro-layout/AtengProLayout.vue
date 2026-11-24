<script setup lang="ts">
/**
 * 企业级框架布局容器组件 AtengProLayout。
 *
 * @author Ateng
 * @since 2026-10-29
 */

import { computed } from 'vue';
import { AtengLayout } from '../layout';
import type { TabBatchClosePayload, TabItem } from '../tabs-nav';
import ProLayoutAside from './ProLayoutAside.vue';
import ProLayoutHeader from './ProLayoutHeader.vue';
import ProLayoutMain from './ProLayoutMain.vue';
import { useProLayoutState } from './useProLayoutState';
import type {
  AtengProLayoutEmits,
  AtengProLayoutExpose,
  AtengProLayoutProps,
  AtengProLayoutSlots,
  ProMenuItem,
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
  iconResolver: undefined,
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
  contentPadding: '16px',
  escExit: true,
});

const emit = defineEmits<AtengProLayoutEmits>();
defineSlots<AtengProLayoutSlots>();

const {
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
} = useProLayoutState(props, {
  onUpdateCollapsed: val => emit('update:collapsed', val),
  onCollapseChange: val => emit('collapseChange', val),
  onUpdateActiveMenu: path => emit('update:activeMenu', path),
  onMenuSelect: (path, item) => emit('menuSelect', path, item),
  onUpdateIsMaximized: val => emit('update:isMaximized', val),
  onMaximizeChange: val => emit('maximizeChange', val),
});

const sharedMainBindings = computed(() => ({
  showTabs: props.showTabs,
  tabsHeight: props.tabsHeight,
  tabsProps: props.tabsProps,
  isMaximized: internalMaximized.value,
  'onUpdate:modelValue': (key: string) => emit('update:modelValue', key),
  'onUpdate:isMaximized': (val: boolean) => toggleMaximize(val),
  onMaximizeChange: (val: boolean) => toggleMaximize(val),
  onTabClick: (tab: TabItem) => emit('tabClick', tab),
  onTabClose: (key: string, tab: TabItem) => emit('tabClose', key, tab),
  onBatchClose: (payload: TabBatchClosePayload) => emit('batchClose', payload),
  onTabRefresh: (key: string, tab: TabItem) => emit('tabRefresh', key, tab),
  'onUpdate:tabs': (tabs: TabItem[]) => emit('update:tabs', tabs),
  onTabOrderChange: (tabs: TabItem[]) => emit('tabOrderChange', tabs),
}));

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
        'is-fixed-header': fixedHeader,
        'is-fixed-aside': fixedAside,
        'is-viewport-locked': isViewportLocked,
      },
    ]"
    :style="rootCssVars"
  >
    <!-- ===================== A. SIDE 模式 ===================== -->
    <template v-if="layout === 'side'">
      <div
        v-if="isMobile && !internalCollapsed"
        class="at-pro-layout__drawer-mask"
        @click="closeMobileDrawer"
      />
      <AtengLayout direction="horizontal" class="at-pro-layout__container">
        <ProLayoutAside
          :show-logo="true"
          :logo="logo"
          :title="title"
          :is-mobile="isMobile"
          :aside-width="asideWidth"
          :aside-collapsed-width="asideCollapsedWidth"
          :collapsed="internalCollapsed"
          :collapsible="collapsible"
          :show-collapse-trigger="showCollapseTrigger"
          :collapse-trigger-position="collapseTriggerPosition"
          :menu-data="currentAsideMenuData"
          :field-names="fieldNames"
          :icon-resolver="iconResolver"
          :active-menu="activeMenu"
          :default-openeds="defaultOpeneds"
          @menu-select="handleMenuSelect"
          @toggle-collapse="toggleCollapse"
        >
          <template v-if="$slots.logo" #logo="slotProps">
            <slot name="logo" v-bind="slotProps" />
          </template>
          <template v-if="$slots.menu" #menu="slotProps">
            <slot name="menu" v-bind="slotProps" />
          </template>
          <template v-if="$slots.menuItem" #menuItem="slotProps">
            <slot name="menuItem" v-bind="slotProps" />
          </template>
          <template v-if="$slots.menuIcon" #menuIcon="slotProps">
            <slot name="menuIcon" v-bind="slotProps" />
          </template>
          <template v-if="$slots.asideFooter" #asideFooter="slotProps">
            <slot name="asideFooter" v-bind="slotProps" />
          </template>
        </ProLayoutAside>

        <AtengLayout direction="vertical" class="at-pro-layout__main">
          <ProLayoutHeader
            layout="side"
            :header-height="headerHeight"
            :logo="logo"
            :title="title"
            :collapsed="internalCollapsed"
            :show-collapse-trigger="
              showCollapseTrigger && collapsible && collapseTriggerPosition === 'header'
            "
            :show-breadcrumb="showBreadcrumb"
            :breadcrumb-separator="breadcrumbSeparator"
            :breadcrumb-items="breadcrumbItems"
            :top-menu-data="[]"
            :active-menu="activeMenu"
            @toggle-collapse="toggleCollapse"
          >
            <template v-if="$slots.headerLeft" #headerLeft><slot name="headerLeft" /></template>
            <template v-if="$slots.breadcrumb" #breadcrumb><slot name="breadcrumb" /></template>
            <template v-if="$slots.headerCenter" #headerCenter
              ><slot name="headerCenter"
            /></template>
            <template v-if="$slots.headerRight" #headerRight><slot name="headerRight" /></template>
            <template v-if="$slots.headerActions" #headerActions
              ><slot name="headerActions"
            /></template>
            <template v-if="$slots.user" #user><slot name="user" /></template>
          </ProLayoutHeader>

          <ProLayoutMain v-bind="sharedMainBindings">
            <template v-if="$slots.tabs" #tabs><slot name="tabs" /></template>
            <template v-if="$slots.tab" #tab="slotProps"
              ><slot name="tab" v-bind="slotProps"
            /></template>
            <template v-if="$slots.prefix" #prefix><slot name="prefix" /></template>
            <template v-if="$slots.suffix" #suffix><slot name="suffix" /></template>
            <template v-if="$slots.extra" #extra><slot name="extra" /></template>
            <slot />
            <template v-if="$slots.footer" #footer><slot name="footer" /></template>
          </ProLayoutMain>
        </AtengLayout>
      </AtengLayout>
    </template>

    <!-- ===================== B. TOP & C. MIX 模式 ===================== -->
    <template v-else-if="layout === 'top' || layout === 'mix'">
      <AtengLayout direction="vertical" class="at-pro-layout__container">
        <ProLayoutHeader
          :layout="layout"
          :header-height="headerHeight"
          :logo="logo"
          :title="title"
          :collapsed="internalCollapsed"
          :show-collapse-trigger="
            layout === 'mix' &&
            currentAsideMenuData.length > 0 &&
            showCollapseTrigger &&
            collapsible &&
            collapseTriggerPosition === 'header'
          "
          :show-breadcrumb="false"
          :breadcrumb-separator="breadcrumbSeparator"
          :breadcrumb-items="[]"
          :top-menu-data="layout === 'mix' ? mixTopMenuData : menuData"
          :field-names="fieldNames"
          :icon-resolver="iconResolver"
          :active-menu="layout === 'mix' ? activeTopMenuPath || activeMenu : activeMenu"
          :default-openeds="layout === 'top' ? defaultOpeneds : undefined"
          @toggle-collapse="toggleCollapse"
          @menu-select="
            (p: string, item?: ProMenuItem) =>
              layout === 'mix' ? handleMixTopSelect(p) : handleMenuSelect(p, item)
          "
        >
          <template v-if="$slots.logo" #logo="slotProps"
            ><slot name="logo" v-bind="slotProps"
          /></template>
          <template v-if="$slots.menu" #menu="slotProps"
            ><slot name="menu" v-bind="slotProps"
          /></template>
          <template v-if="$slots.menuItem" #menuItem="slotProps"
            ><slot name="menuItem" v-bind="slotProps"
          /></template>
          <template v-if="$slots.menuIcon" #menuIcon="slotProps"
            ><slot name="menuIcon" v-bind="slotProps"
          /></template>
          <template v-if="$slots.headerRight" #headerRight><slot name="headerRight" /></template>
          <template v-if="$slots.headerActions" #headerActions
            ><slot name="headerActions"
          /></template>
          <template v-if="$slots.user" #user><slot name="user" /></template>
        </ProLayoutHeader>

        <ProLayoutMain v-if="layout === 'top'" v-bind="sharedMainBindings">
          <template v-if="$slots.tabs" #tabs><slot name="tabs" /></template>
          <template v-if="$slots.tab" #tab="slotProps"
            ><slot name="tab" v-bind="slotProps"
          /></template>
          <template v-if="$slots.prefix" #prefix><slot name="prefix" /></template>
          <template v-if="$slots.suffix" #suffix><slot name="suffix" /></template>
          <template v-if="$slots.extra" #extra><slot name="extra" /></template>
          <slot />
          <template v-if="$slots.footer" #footer><slot name="footer" /></template>
        </ProLayoutMain>

        <AtengLayout v-else direction="horizontal" class="at-pro-layout__container">
          <div
            v-if="isMobile && !internalCollapsed && currentAsideMenuData.length > 0"
            class="at-pro-layout__drawer-mask"
            @click="closeMobileDrawer"
          />
          <ProLayoutAside
            v-if="currentAsideMenuData.length > 0"
            :show-logo="false"
            :title="title"
            :is-mobile="isMobile"
            :aside-width="asideWidth"
            :aside-collapsed-width="asideCollapsedWidth"
            :collapsed="internalCollapsed"
            :collapsible="collapsible"
            :show-collapse-trigger="showCollapseTrigger"
            :collapse-trigger-position="collapseTriggerPosition"
            :menu-data="currentAsideMenuData"
            :field-names="fieldNames"
            :icon-resolver="iconResolver"
            :active-menu="activeMenu"
            :default-openeds="defaultOpeneds"
            @menu-select="handleMenuSelect"
            @toggle-collapse="toggleCollapse"
          >
            <template v-if="$slots.menu" #menu="slotProps"
              ><slot name="menu" v-bind="slotProps"
            /></template>
            <template v-if="$slots.menuItem" #menuItem="slotProps"
              ><slot name="menuItem" v-bind="slotProps"
            /></template>
            <template v-if="$slots.menuIcon" #menuIcon="slotProps"
              ><slot name="menuIcon" v-bind="slotProps"
            /></template>
            <template v-if="$slots.asideFooter" #asideFooter="slotProps"
              ><slot name="asideFooter" v-bind="slotProps"
            /></template>
          </ProLayoutAside>

          <AtengLayout direction="vertical" class="at-pro-layout__main">
            <ProLayoutMain v-bind="sharedMainBindings">
              <template v-if="$slots.tabs" #tabs><slot name="tabs" /></template>
              <template v-if="$slots.tab" #tab="slotProps"
                ><slot name="tab" v-bind="slotProps"
              /></template>
              <template v-if="$slots.prefix" #prefix><slot name="prefix" /></template>
              <template v-if="$slots.suffix" #suffix><slot name="suffix" /></template>
              <template v-if="$slots.extra" #extra><slot name="extra" /></template>
              <slot />
              <template v-if="$slots.footer" #footer><slot name="footer" /></template>
            </ProLayoutMain>
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
.at-pro-layout.is-viewport-locked {
  height: 100vh;
  max-height: 100%;
  overflow: hidden;
}
.at-pro-layout__container {
  flex: 1;
  min-height: 0;
  min-width: 0;
  width: 100%;
}
.at-pro-layout.is-viewport-locked > :deep(.at-pro-layout__container) {
  height: 100%;
}
:deep(.at-pro-layout__logo) {
  height: var(--at-pro-header-height, 56px);
  min-height: var(--at-pro-header-height, 56px);
  display: flex;
  align-items: center;
  padding: 0 16px;
  border-bottom: 1px solid var(--el-border-color-extra-light);
  flex-shrink: 0;
  overflow: hidden;
  white-space: nowrap;
  box-sizing: border-box;
}
:deep(.at-pro-layout__logo-img) {
  height: 32px;
  width: 32px;
  margin-right: 12px;
  object-fit: contain;
}
:deep(.at-pro-layout__title) {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  overflow: hidden;
  text-overflow: ellipsis;
}
:deep(.at-pro-layout__aside) {
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
.at-pro-layout.is-viewport-locked :deep(.at-pro-layout__aside) {
  height: 100%;
}
.at-pro-layout.is-fixed-aside:not(.is-viewport-locked):not(.is-maximized)
  :deep(.at-pro-layout__aside:not(.is-mobile-drawer)) {
  position: sticky;
  top: 0;
  height: 100vh;
  max-height: 100vh;
  align-self: flex-start;
}
:deep(.at-pro-layout__main) {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  background-color: var(--el-bg-color-page);
  position: relative;
}
.at-pro-layout.is-viewport-locked :deep(.at-pro-layout__main) {
  height: 100%;
}
:deep(.at-pro-layout__header) {
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
.at-pro-layout.is-fixed-header:not(.is-viewport-locked):not(.is-maximized)
  :deep(.at-pro-layout__header) {
  position: sticky;
  top: 0;
}
:deep(.at-pro-layout__collapse-btn) {
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
:deep(.at-pro-layout__collapse-btn:hover) {
  background-color: var(--el-fill-color-light);
  color: var(--el-color-primary);
}
:deep(.at-pro-layout__tabs) {
  flex-shrink: 0;
  z-index: 99;
}
.at-pro-layout.is-fixed-header:not(.is-viewport-locked):not(.is-maximized)
  :deep(.at-pro-layout__tabs) {
  position: sticky;
  top: var(--at-pro-header-height, 56px);
}
:deep(.at-pro-layout__content) {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: var(--at-pro-content-padding, 16px);
  box-sizing: border-box;
  min-height: 0;
}
.at-pro-layout.is-viewport-locked :deep(.at-pro-layout__content) {
  overflow-y: auto;
  overflow-x: hidden;
}
:deep(.at-pro-layout__footer) {
  flex-shrink: 0;
  z-index: 99;
}
.at-pro-layout__drawer-mask {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.45);
  z-index: 1999;
  backdrop-filter: blur(2px);
  transition: opacity 0.25s cubic-bezier(0.2, 0, 0, 1);
}
:deep(.at-pro-layout__aside.is-mobile-drawer) {
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
.at-pro-layout.is-mobile.is-collapsed :deep(.at-pro-layout__aside.is-mobile-drawer) {
  transform: translateX(-100%);
  pointer-events: none;
}
.at-pro-layout.is-mobile:not(.is-collapsed) :deep(.at-pro-layout__aside.is-mobile-drawer) {
  transform: translateX(0);
}
.at-pro-layout.is-maximized :deep(.at-pro-layout__header),
.at-pro-layout.is-maximized :deep(.at-pro-layout__aside),
.at-pro-layout.is-maximized .at-pro-layout__drawer-mask {
  display: none !important;
}
</style>
