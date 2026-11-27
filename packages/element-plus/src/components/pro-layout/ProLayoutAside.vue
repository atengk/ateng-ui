<script setup lang="ts">
/**
 * AtengProLayout 内部侧边栏骨架组件（复用 side 与 mix 两种导航形态）。
 *
 * @author Ateng
 * @since 2026-11-24
 */

import type { Component } from 'vue';
import { AtengAside } from '../layout';
import ProMenu from './ProMenu.vue';
import type { ProMenuFieldNames, ProMenuIconResolver, ProMenuItem, ProMenuRawItem } from './types';

defineOptions({
  name: 'ProLayoutAside',
});

defineProps<{
  showLogo?: boolean;
  logo?: string;
  title: string;
  isMobile: boolean;
  asideWidth: string | number;
  asideCollapsedWidth: string | number;
  collapsed: boolean;
  collapsible: boolean;
  showCollapseTrigger: boolean;
  collapseTriggerPosition: 'header' | 'aside';
  menuData: ProMenuRawItem[];
  fieldNames?: ProMenuFieldNames;
  iconResolver?: ProMenuIconResolver;
  activeMenu: string;
  defaultOpeneds: string[];
}>();

const emit = defineEmits<{
  (e: 'menuSelect', path: string, item?: ProMenuItem): void;
  (e: 'toggleCollapse'): void;
}>();

defineSlots<{
  logo?: (scope: { collapsed: boolean; title: string; logo?: string }) => unknown;
  menu?: (scope: {
    menuData: ProMenuRawItem[];
    mode: 'horizontal' | 'vertical';
    collapsed: boolean;
  }) => unknown;
  menuItem?: (scope: { item: ProMenuRawItem; depth: number }) => unknown;
  menuIcon?: (scope: { icon: string | Component; item: ProMenuRawItem; depth: number }) => unknown;
  asideFooter?: (scope: { collapsed: boolean }) => unknown;
}>();
</script>

<template>
  <AtengAside
    class="at-pro-layout__aside"
    :class="{ 'is-mobile-drawer': isMobile }"
    :width="asideWidth"
    :collapsed-width="asideCollapsedWidth"
    :collapsed="collapsed"
    :aria-hidden="isMobile && collapsed ? 'true' : undefined"
    :inert="isMobile && collapsed ? true : undefined"
  >
    <div v-if="showLogo" class="at-pro-layout__logo">
      <slot name="logo" :collapsed="collapsed" :title="title" :logo="logo">
        <img v-if="logo" :src="logo" class="at-pro-layout__logo-img" alt="logo" />
        <span v-if="!collapsed" class="at-pro-layout__title">{{ title }}</span>
      </slot>
    </div>

    <div class="at-pro-layout__aside-menu">
      <slot name="menu" :menu-data="menuData" mode="vertical" :collapsed="collapsed">
        <ProMenu
          :menu-data="menuData"
          mode="vertical"
          :collapse="collapsed"
          :field-names="fieldNames"
          :icon-resolver="iconResolver"
          :active-menu="activeMenu"
          :default-openeds="defaultOpeneds"
          @select="(path: string, item?: ProMenuItem) => emit('menuSelect', path, item)"
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

    <div v-if="$slots.asideFooter" class="at-pro-layout__aside-footer">
      <slot name="asideFooter" :collapsed="collapsed" />
    </div>

    <div
      v-if="showCollapseTrigger && collapsible && collapseTriggerPosition === 'aside'"
      class="at-pro-layout__aside-collapse"
      @click="emit('toggleCollapse')"
    >
      <span class="at-pro-layout__collapse-btn">
        <svg viewBox="0 0 1024 1024" width="16" height="16" fill="currentColor">
          <path v-if="collapsed" d="M384 192l320 320-320 320V192z m-192 0h64v640h-64V192z" />
          <path v-else d="M640 192L320 512l320 320V192z m128 0h64v640h-64V192z" />
        </svg>
      </span>
    </div>
  </AtengAside>
</template>

<style scoped>
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
</style>
