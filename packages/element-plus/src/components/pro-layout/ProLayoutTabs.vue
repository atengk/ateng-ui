<script setup lang="ts">
/**
 * AtengProLayout 内部多标签栏承载与事件协调组件。
 *
 * @author Ateng
 * @since 2026-10-29
 */

import { computed } from 'vue';
import { AtengTabsNav } from '../tabs-nav';
import type { AtengTabsNavProps, TabBatchClosePayload, TabItem } from '../tabs-nav';

defineOptions({
  name: 'ProLayoutTabs',
});

const props = defineProps<{
  showTabs?: boolean;
  tabsHeight?: number | string;
  tabsProps?: AtengTabsNavProps;
  isMaximized?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', key: string): void;
  (e: 'update:isMaximized', val: boolean): void;
  (e: 'maximizeChange', val: boolean): void;
  (e: 'tabClick', tab: TabItem): void;
  (e: 'tabClose', key: string, tab: TabItem): void;
  (e: 'batchClose', payload: TabBatchClosePayload): void;
  (e: 'tabRefresh', key: string, tab: TabItem): void;
  (e: 'update:tabs', tabs: TabItem[]): void;
  (e: 'tabOrderChange', tabs: TabItem[]): void;
}>();

defineSlots<{
  tabs?: () => unknown;
  tab?: (scope: { tab: TabItem; active: boolean; index: number }) => unknown;
  prefix?: () => unknown;
  suffix?: () => unknown;
  extra?: () => unknown;
}>();

const resolvedHeight = computed(() => props.tabsProps?.height ?? props.tabsHeight);
</script>

<template>
  <div class="at-pro-layout__tabs">
    <slot name="tabs">
      <AtengTabsNav
        v-if="showTabs"
        v-bind="tabsProps"
        :height="resolvedHeight"
        :is-maximized="isMaximized"
        @update:model-value="key => emit('update:modelValue', key)"
        @update:is-maximized="val => emit('update:isMaximized', val)"
        @maximize-change="val => emit('maximizeChange', val)"
        @tab-click="(tab: TabItem) => emit('tabClick', tab)"
        @tab-close="(key: string, tab: TabItem) => emit('tabClose', key, tab)"
        @batch-close="(payload: TabBatchClosePayload) => emit('batchClose', payload)"
        @tab-refresh="(key: string, tab: TabItem) => emit('tabRefresh', key, tab)"
        @update:tabs="(tabs: TabItem[]) => emit('update:tabs', tabs)"
        @tab-order-change="(tabs: TabItem[]) => emit('tabOrderChange', tabs)"
      >
        <template v-if="$slots.tab" #tab="slotProps">
          <slot name="tab" v-bind="slotProps" />
        </template>
        <template v-if="$slots.prefix" #prefix>
          <slot name="prefix" />
        </template>
        <template v-if="$slots.suffix" #suffix>
          <slot name="suffix" />
        </template>
        <template v-if="$slots.extra" #extra>
          <slot name="extra" />
        </template>
      </AtengTabsNav>
    </slot>
  </div>
</template>
