<script setup lang="ts">
/**
 * AtengProLayout 内部多标签栏承载与事件协调组件。
 *
 * @author Ateng
 * @since 2026-10-29
 */

import { AtengTabsNav } from '../tabs-nav';
import type { TabItem, AtengTabsNavProps } from '../tabs-nav';

defineOptions({
  name: 'ProLayoutTabs',
});

defineProps<{
  showTabs?: boolean;
  tabsProps?: AtengTabsNavProps;
  isMaximized?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:isMaximized', val: boolean): void;
  (e: 'maximizeChange', val: boolean): void;
  (e: 'tabClick', tab: TabItem): void;
  (e: 'tabClose', key: string, tab: TabItem): void;
  (e: 'tabRefresh', key: string, tab: TabItem): void;
  (e: 'update:tabs', tabs: TabItem[]): void;
  (e: 'tabOrderChange', tabs: TabItem[]): void;
}>();
</script>

<template>
  <div class="at-pro-layout__tabs">
    <slot name="tabs">
      <AtengTabsNav
        v-if="showTabs"
        v-bind="tabsProps"
        :is-maximized="isMaximized"
        @update:is-maximized="val => emit('update:isMaximized', val)"
        @maximize-change="val => emit('maximizeChange', val)"
        @tab-click="(tab: TabItem) => emit('tabClick', tab)"
        @tab-close="(key: string, tab: TabItem) => emit('tabClose', key, tab)"
        @tab-refresh="(key: string, tab: TabItem) => emit('tabRefresh', key, tab)"
        @update:tabs="(tabs: TabItem[]) => emit('update:tabs', tabs)"
        @tab-order-change="(tabs: TabItem[]) => emit('tabOrderChange', tabs)"
      />
    </slot>
  </div>
</template>
