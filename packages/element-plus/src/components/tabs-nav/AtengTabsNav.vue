<script setup lang="ts">
/**
 * AtengTabsNav 企业级多标签页导航组件。
 *
 * 具备视口溢出平滑滚动、鼠标滚轮横向滑动、激活项居中自适应、原生拖拽排序防呆、
 * Element Plus 原生右键上下文菜单、快捷批量关闭下拉面板、内容区最大化协同与三大视觉形态。
 *
 * @author Ateng
 * @since 2026-10-29
 */

import { ref, computed, inject } from 'vue';
import { ElDropdown } from 'element-plus';
import { ATENG_PRO_LAYOUT_KEY } from '../pro-layout/context';
import TabsNavItem from './TabsNavItem.vue';
import TabsNavMenu from './TabsNavMenu.vue';
import {
  TAB_ACTION_ICON_PATHS,
  canCloseAll,
  canCloseLeft,
  canCloseOthers,
  canCloseRight,
  computeBatchClosePayload,
  isTabClosable,
} from './tabsCommands';
import type {
  AtengTabsNavProps,
  AtengTabsNavEmits,
  AtengTabsNavSlots,
  TabBatchCloseCommand,
  TabItem,
  TabCommand,
} from './types';
import { useTabsScroll } from './useTabsScroll';
import { useTabsDrag } from './useTabsDrag';
import { useTabsAccessibility } from './useTabsAccessibility';

defineOptions({
  name: 'AtengTabsNav',
});

const props = withDefaults(defineProps<AtengTabsNavProps>(), {
  modelValue: '',
  tabs: () => [],
  styleType: 'card',
  height: '38px',
  showIcon: true,
  closable: true,
  draggable: true,
  contextMenu: true,
  showQuickActions: true,
  showMaximize: true,
  isMaximized: false,
  emitCloseOnBatch: true,
  menuIcons: undefined,
  iconResolver: undefined,
});

const emit = defineEmits<AtengTabsNavEmits>();
defineSlots<AtengTabsNavSlots>();

const viewportRef = ref<HTMLDivElement | null>(null);
const trackRef = ref<HTMLDivElement | null>(null);

const { containerHeight, overflow, scrollByOffset, onWheelScroll } = useTabsScroll({
  viewportRef,
  trackRef,
  modelValue: () => props.modelValue,
  tabsLength: () => props.tabs.length,
  height: () => props.height,
});

const activeTab = computed(() => props.tabs.find(t => t.key === props.modelValue));
const activeIndex = computed(() => props.tabs.findIndex(t => t.key === props.modelValue));

const onTabItemClick = (tab: TabItem): void => {
  if (props.modelValue !== tab.key) emit('update:modelValue', tab.key);
  emit('tabClick', tab);
};

const onTabItemClose = (event: MouseEvent, tab: TabItem): void => {
  event.stopPropagation();
  emit('tabClose', tab.key, tab);
};

const { dragTargetIndex, onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd } = useTabsDrag({
  tabs: () => props.tabs,
  emit,
});

const executeBatchClose = (
  command: TabBatchCloseCommand,
  targetTab?: TabItem,
  targetIndex = -1,
): void => {
  const payload = computeBatchClosePayload(
    command,
    props.tabs,
    props.modelValue,
    targetTab,
    targetIndex,
  );
  if (props.emitCloseOnBatch) {
    for (const ct of payload.closedTabs) emit('tabClose', ct.key, ct);
  }
  emit('batchClose', payload);
  emit('update:tabs', payload.remainingTabs);
  if (command === 'closeAll' || payload.nextActiveKey !== props.modelValue) {
    emit('update:modelValue', payload.nextActiveKey);
  }
};

const handleCommand = (command: TabCommand | string, tab: TabItem, index: number): void => {
  if (command === 'refresh') return emit('tabRefresh', tab.key, tab);
  if (command === 'close') return emit('tabClose', tab.key, tab);
  if (
    command === 'closeOthers' ||
    command === 'closeLeft' ||
    command === 'closeRight' ||
    command === 'closeAll'
  ) {
    executeBatchClose(command, tab, index);
  }
};

const handleQuickCommand = (command: TabCommand | string): void => {
  if (!activeTab.value || activeIndex.value < 0) {
    if (command === 'closeAll') executeBatchClose('closeAll');
    return;
  }
  handleCommand(command, activeTab.value, activeIndex.value);
};

const {
  focusableIndex,
  contextDropdownRef,
  isContextMenuVisible,
  contextVirtualRef,
  resolvedContextEntry,
  onTabContextMenu,
  handleContextMenuCommand,
  onTabItemKeydown,
} = useTabsAccessibility({
  trackRef,
  tabs: () => props.tabs,
  activeTab,
  activeIndex,
  closable: () => props.closable,
  contextMenu: () => props.contextMenu,
  onActivateTab: onTabItemClick,
  onCloseTab: tab => emit('tabClose', tab.key, tab),
  onExecuteCommand: handleCommand,
});

const proLayoutContext = inject(ATENG_PRO_LAYOUT_KEY, null);
const effectiveMaximized = computed<boolean>(
  () => Boolean(props.isMaximized) || (proLayoutContext?.isMaximized?.value ?? false),
);

const toggleMaximize = (): void => {
  const nextVal = !effectiveMaximized.value;
  emit('update:isMaximized', nextVal);
  emit('maximizeChange', nextVal);
  proLayoutContext?.toggleMaximize?.(nextVal);
};
</script>

<template>
  <div
    class="at-tabs-nav"
    :class="[`at-tabs-nav--${styleType}`]"
    :style="{ height: containerHeight, minHeight: containerHeight }"
  >
    <div v-if="$slots.prefix" class="at-tabs-nav__prefix">
      <slot name="prefix" />
    </div>

    <button
      v-if="overflow.hasOverflow"
      type="button"
      class="at-tabs-nav__scroll-btn at-tabs-nav__scroll-btn--left"
      :disabled="!overflow.canScrollLeft"
      aria-label="向左滚动"
      @click="scrollByOffset(-200)"
    >
      <svg viewBox="0 0 1024 1024" width="12" height="12" fill="currentColor" aria-hidden="true">
        <path :d="TAB_ACTION_ICON_PATHS.scrollLeft" />
      </svg>
    </button>

    <div ref="viewportRef" class="at-tabs-nav__viewport" @wheel="onWheelScroll">
      <div
        ref="trackRef"
        class="at-tabs-nav__track"
        :role="tabs.length > 0 ? 'tablist' : undefined"
        :aria-label="tabs.length > 0 ? '页面标签栏' : undefined"
      >
        <TabsNavItem
          v-for="(tab, index) in tabs"
          :key="tab.key"
          :tab="tab"
          :index="index"
          :active="tab.key === modelValue"
          :tabindex="index === focusableIndex ? 0 : -1"
          :style-type="styleType"
          :show-icon="showIcon"
          :closable="isTabClosable(tab, closable)"
          :draggable="draggable"
          :is-dragover="dragTargetIndex === index"
          :icon-resolver="iconResolver"
          @click="onTabItemClick"
          @close="onTabItemClose"
          @contextmenu="onTabContextMenu"
          @keydown="onTabItemKeydown"
          @dragstart="onDragStart"
          @dragover="onDragOver"
          @dragleave="onDragLeave"
          @drop="onDrop"
          @dragend="onDragEnd"
        >
          <template v-if="$slots.tab" #tab="slotProps">
            <slot name="tab" v-bind="slotProps" />
          </template>
          <template v-if="$slots.tabIcon" #tabIcon="slotProps">
            <slot name="tabIcon" v-bind="slotProps" />
          </template>
        </TabsNavItem>
      </div>
    </div>

    <ElDropdown
      v-if="contextMenu"
      ref="contextDropdownRef"
      class="at-tabs-nav__context-dropdown"
      trigger="contextmenu"
      virtual-triggering
      :virtual-ref="contextVirtualRef"
      teleported
      @command="handleContextMenuCommand"
      @visible-change="
        (val: boolean) => {
          isContextMenuVisible = val;
        }
      "
    >
      <template #dropdown>
        <TabsNavMenu
          :tab="resolvedContextEntry.tab"
          :include-close="true"
          :disable-close="
            !(resolvedContextEntry.tab && isTabClosable(resolvedContextEntry.tab, closable))
          "
          :disable-close-others="
            !(resolvedContextEntry.tab && canCloseOthers(tabs, resolvedContextEntry.tab))
          "
          :disable-close-left="
            !(resolvedContextEntry.index >= 0 && canCloseLeft(tabs, resolvedContextEntry.index))
          "
          :disable-close-right="
            !(resolvedContextEntry.index >= 0 && canCloseRight(tabs, resolvedContextEntry.index))
          "
          :disable-close-all="!canCloseAll(tabs)"
          :menu-icons="menuIcons"
        >
          <template v-if="$slots.menuIcon" #menuIcon="slotProps">
            <slot name="menuIcon" v-bind="slotProps" />
          </template>
        </TabsNavMenu>
      </template>
    </ElDropdown>

    <button
      v-if="overflow.hasOverflow"
      type="button"
      class="at-tabs-nav__scroll-btn at-tabs-nav__scroll-btn--right"
      :disabled="!overflow.canScrollRight"
      aria-label="向右滚动"
      @click="scrollByOffset(200)"
    >
      <svg viewBox="0 0 1024 1024" width="12" height="12" fill="currentColor" aria-hidden="true">
        <path :d="TAB_ACTION_ICON_PATHS.scrollRight" />
      </svg>
    </button>

    <div
      v-if="$slots.suffix || showQuickActions || showMaximize || $slots.extra"
      class="at-tabs-nav__suffix"
    >
      <slot name="suffix" />

      <div v-if="showQuickActions" class="at-tabs-nav__quick-actions">
        <ElDropdown trigger="click" @command="handleQuickCommand">
          <button
            type="button"
            class="at-tabs-nav__action-btn"
            title="标签快捷操作"
            aria-label="标签快捷操作"
          >
            <svg
              viewBox="0 0 1024 1024"
              width="14"
              height="14"
              fill="currentColor"
              aria-hidden="true"
            >
              <path :d="TAB_ACTION_ICON_PATHS.quickMenu" />
            </svg>
          </button>

          <template #dropdown>
            <TabsNavMenu
              :tab="activeTab"
              :include-close="false"
              :disable-refresh="!activeTab"
              :disable-close-others="!(activeTab && canCloseOthers(tabs, activeTab))"
              :disable-close-left="!(activeIndex >= 0 && canCloseLeft(tabs, activeIndex))"
              :disable-close-right="!(activeIndex >= 0 && canCloseRight(tabs, activeIndex))"
              :disable-close-all="!canCloseAll(tabs)"
              :menu-icons="menuIcons"
            >
              <template v-if="$slots.menuIcon" #menuIcon="slotProps">
                <slot name="menuIcon" v-bind="slotProps" />
              </template>
            </TabsNavMenu>
          </template>
        </ElDropdown>
      </div>

      <button
        v-if="showMaximize"
        type="button"
        class="at-tabs-nav__action-btn at-tabs-nav__maximize-btn"
        :title="effectiveMaximized ? '还原视图' : '内容最大化'"
        :aria-label="effectiveMaximized ? '还原视图' : '内容最大化'"
        @click="toggleMaximize"
      >
        <svg viewBox="0 0 1024 1024" width="13" height="13" fill="currentColor" aria-hidden="true">
          <path
            :d="effectiveMaximized ? TAB_ACTION_ICON_PATHS.restore : TAB_ACTION_ICON_PATHS.maximize"
          />
        </svg>
      </button>

      <slot name="extra" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.at-tabs-nav {
  display: flex;
  align-items: center;
  position: relative;
  width: 100%;
  box-sizing: border-box;
  background-color: var(--el-bg-color, #ffffff);
  border-bottom: 1px solid var(--el-border-color-lighter, #ebeef5);
  padding: 0 8px;
  overflow: hidden;
  user-select: none;
  transition:
    background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1),
    border-color 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &__prefix,
  &__suffix {
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
    gap: 4px;
    z-index: 2;
  }

  &__suffix {
    padding-left: 6px;
    margin-left: 4px;
    border-left: 1px solid var(--el-border-color-lighter, #ebeef5);
  }

  &__scroll-btn,
  &__action-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    padding: 0;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

    &:active:not(:disabled) {
      transform: scale(0.95);
    }

    &:focus-visible {
      outline: 2px solid var(--el-color-primary, #409eff);
      outline-offset: 1px;
    }
  }

  &__scroll-btn {
    width: 24px;
    height: 24px;
    margin: 0 2px;
    border: 1px solid var(--el-border-color-extra-light, #f2f6fc);
    border-radius: 50%;
    background: var(--el-fill-color-blank, #ffffff);
    color: var(--el-text-color-regular, #606266);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    z-index: 2;

    &:hover:not(:disabled) {
      background-color: var(--el-color-primary-light-9, #ecf5ff);
      border-color: var(--el-color-primary-light-6, #b3d8ff);
      color: var(--el-color-primary, #409eff);
      transform: scale(1.05);
    }
    &:disabled {
      opacity: 0.35;
      cursor: not-allowed;
      border-color: transparent;
      box-shadow: none;
    }
  }

  &__action-btn {
    width: 26px;
    height: 26px;
    border: 1px solid transparent;
    border-radius: var(--el-border-radius-base, 4px);
    background: transparent;
    color: var(--el-text-color-secondary, #909399);

    &:hover,
    &.at-tabs-nav__maximize-btn:hover {
      background-color: var(--el-fill-color-light, #f5f7fa);
      border-color: var(--el-border-color-lighter, #ebeef5);
      color: var(--el-color-primary, #409eff);
      transform: scale(1.05);
    }
  }
  &__viewport {
    display: flex;
    align-items: center;
    flex: 1;
    height: 100%;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
    &::-webkit-scrollbar {
      display: none;
    }
  }
  &__track {
    display: flex;
    align-items: center;
    height: 100%;
    gap: 6px;
    white-space: nowrap;
  }
  &__context-dropdown {
    position: absolute;
    width: 0;
    height: 0;
    overflow: hidden;
    pointer-events: none;
  }
  &--pill &__track {
    gap: 4px;
  }
  &--line {
    border-bottom: 1px solid var(--el-border-color-light, #e4e7ed);
    .at-tabs-nav__track {
      gap: 0;
    }
  }
}
</style>
