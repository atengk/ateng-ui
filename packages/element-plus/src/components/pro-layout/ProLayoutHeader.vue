<script setup lang="ts">
/**
 * AtengProLayout 内部顶栏骨架组件（兼容 side、top 与 mix 三形态）。
 *
 * @author Ateng
 * @since 2026-11-24
 */

import type { Component } from 'vue';
import { ElBreadcrumb, ElBreadcrumbItem } from 'element-plus';
import { AtengHeader } from '../layout';
import ProMenu from './ProMenu.vue';
import type { BreadcrumbItem } from './menuUtils';
import type {
  ProLayoutMode,
  ProMenuFieldNames,
  ProMenuIconResolver,
  ProMenuItem,
  ProMenuRawItem,
} from './types';

defineOptions({
  name: 'ProLayoutHeader',
});

defineProps<{
  layout: ProLayoutMode;
  headerHeight: string | number;
  logo?: string;
  title: string;
  collapsed: boolean;
  showCollapseTrigger: boolean;
  showBreadcrumb: boolean;
  breadcrumbSeparator: string;
  breadcrumbItems: BreadcrumbItem[];
  topMenuData: ProMenuRawItem[];
  fieldNames?: ProMenuFieldNames;
  iconResolver?: ProMenuIconResolver;
  activeMenu: string;
  defaultOpeneds?: string[];
}>();

const emit = defineEmits<{
  (e: 'toggleCollapse'): void;
  (e: 'menuSelect', path: string, item?: ProMenuItem): void;
}>();

defineSlots<{
  logo?: (scope: { collapsed: boolean; title: string; logo?: string }) => unknown;
  headerLeft?: () => unknown;
  breadcrumb?: () => unknown;
  headerCenter?: () => unknown;
  headerRight?: () => unknown;
  headerActions?: () => unknown;
  user?: () => unknown;
  menu?: (scope: {
    menuData: ProMenuRawItem[];
    mode: 'horizontal' | 'vertical';
    collapsed: boolean;
  }) => unknown;
  menuItem?: (scope: { item: ProMenuRawItem; depth: number }) => unknown;
  menuIcon?: (scope: { icon: string | Component; item: ProMenuRawItem; depth: number }) => unknown;
}>();

const COLLAPSE_EXPAND_PATH =
  'M128 213.333h768v85.334H128v-85.334z m256 256h512v85.334H384v-85.334z m-256 256h768v85.334H128v-85.334zM128 384l170.667 128L128 640V384z';
const COLLAPSE_FOLD_PATH =
  'M128 213.333h768v85.334H128v-85.334z m0 256h512v85.334H128v-85.334z m0 256h768v85.334H128v-85.334zM896 384v256L725.333 512 896 384z';
</script>

<template>
  <AtengHeader class="at-pro-layout__header" :height="headerHeight">
    <template v-if="layout === 'side'">
      <div class="at-pro-layout__header-left">
        <span
          v-if="showCollapseTrigger"
          class="at-pro-layout__collapse-btn"
          title="折叠/展开菜单"
          @click="emit('toggleCollapse')"
        >
          <svg viewBox="0 0 1024 1024" width="18" height="18" fill="currentColor">
            <path :d="collapsed ? COLLAPSE_EXPAND_PATH : COLLAPSE_FOLD_PATH" />
          </svg>
        </span>
        <slot name="headerLeft" />
        <div v-if="showBreadcrumb" class="at-pro-layout__breadcrumb">
          <slot name="breadcrumb">
            <ElBreadcrumb v-if="breadcrumbItems.length > 0" :separator="breadcrumbSeparator">
              <ElBreadcrumbItem v-for="item in breadcrumbItems" :key="item.path">
                {{ item.title }}
              </ElBreadcrumbItem>
            </ElBreadcrumb>
          </slot>
        </div>
      </div>
      <div class="at-pro-layout__header-center">
        <slot name="headerCenter" />
      </div>
    </template>

    <template v-else>
      <div class="at-pro-layout__logo">
        <slot name="logo" :collapsed="false" :title="title" :logo="logo">
          <img v-if="logo" :src="logo" class="at-pro-layout__logo-img" alt="logo" />
          <span class="at-pro-layout__title">{{ title }}</span>
        </slot>
      </div>
      <span
        v-if="showCollapseTrigger"
        class="at-pro-layout__collapse-btn"
        title="折叠/展开菜单"
        @click="emit('toggleCollapse')"
      >
        <svg viewBox="0 0 1024 1024" width="18" height="18" fill="currentColor">
          <path :d="collapsed ? COLLAPSE_EXPAND_PATH : COLLAPSE_FOLD_PATH" />
        </svg>
      </span>
      <div class="at-pro-layout__top-menu">
        <slot name="menu" :menu-data="topMenuData" mode="horizontal" :collapsed="false">
          <ProMenu
            :menu-data="topMenuData"
            mode="horizontal"
            :field-names="fieldNames"
            :icon-resolver="iconResolver"
            :active-menu="activeMenu"
            :default-openeds="defaultOpeneds"
            @select="(p: string, item?: ProMenuItem) => emit('menuSelect', p, item)"
          >
            <template v-if="$slots.menuItem" #menuItem="slotProps">
              <slot name="menuItem" v-bind="slotProps" />
            </template>
            <template v-if="$slots.menuIcon" #menuIcon="slotProps">
              <slot name="menuIcon" v-bind="slotProps" />
            </template>
          </ProMenu>
        </slot>
      </div>
    </template>

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
</template>

<style scoped>
.at-pro-layout__header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
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
</style>
