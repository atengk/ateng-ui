<script setup lang="ts">
/**
 * AtengTabsNav 单个标签节点（含右键上下文菜单包装）渲染子组件。
 *
 * @author Ateng
 * @since 2026-11-24
 */

import { computed, type Component } from 'vue';
import { ElDropdown } from 'element-plus';
import TabsNavMenu from './TabsNavMenu.vue';
import {
  canCloseAll,
  canCloseLeft,
  canCloseOthers,
  canCloseRight,
  isVueComponentIcon,
  resolveTabIcon,
} from './tabsCommands';
import type { TabCommand, TabIconResolver, TabItem, TabMenuIcons, TabsStyle } from './types';

defineOptions({
  name: 'TabsNavItem',
});

const props = withDefaults(
  defineProps<{
    tab: TabItem;
    tabs: TabItem[];
    index: number;
    active: boolean;
    styleType?: TabsStyle;
    showIcon?: boolean;
    closable?: boolean;
    draggable?: boolean;
    contextMenu?: boolean;
    isDragover?: boolean;
    menuIcons?: TabMenuIcons;
    iconResolver?: TabIconResolver;
  }>(),
  {
    styleType: 'card',
    showIcon: true,
    closable: true,
    draggable: true,
    contextMenu: true,
    isDragover: false,
    menuIcons: undefined,
    iconResolver: undefined,
  },
);

const emit = defineEmits<{
  (e: 'click', tab: TabItem): void;
  (e: 'close', event: MouseEvent, tab: TabItem): void;
  (e: 'command', command: TabCommand | string, tab: TabItem, index: number): void;
  (e: 'dragstart', event: DragEvent, index: number, tab: TabItem): void;
  (e: 'dragover', event: DragEvent, index: number, tab: TabItem): void;
  (e: 'dragleave', index: number): void;
  (e: 'drop', event: DragEvent, index: number, tab: TabItem): void;
  (e: 'dragend'): void;
}>();

defineSlots<{
  tab?: (scope: { tab: TabItem; active: boolean; index: number }) => unknown;
  tabIcon?: (scope: {
    icon: string | Component;
    tab: TabItem;
    active: boolean;
    index: number;
  }) => unknown;
  menuIcon?: (scope: { command: TabCommand; tab?: TabItem }) => unknown;
}>();

const resolvedIcon = computed(() => resolveTabIcon(props.tab, props.index, props.iconResolver));
</script>

<template>
  <component
    :is="contextMenu ? ElDropdown : 'div'"
    v-bind="contextMenu ? { trigger: 'contextmenu', teleported: true } : {}"
    :class="{ 'at-tabs-nav__item-host': !contextMenu }"
    @command="(cmd: string) => emit('command', cmd, tab, index)"
  >
    <div
      class="at-tabs-nav__item"
      :class="[
        `at-tabs-nav__item--${styleType}`,
        {
          'is-active': active,
          'is-affix': tab.affix,
          'is-dragover': isDragover,
        },
      ]"
      role="tab"
      :aria-selected="active"
      :draggable="draggable && !tab.affix ? 'true' : 'false'"
      @click="emit('click', tab)"
      @dragstart="emit('dragstart', $event, index, tab)"
      @dragover="emit('dragover', $event, index, tab)"
      @dragleave="emit('dragleave', index)"
      @drop="emit('drop', $event, index, tab)"
      @dragend="emit('dragend')"
    >
      <slot name="tab" :tab="tab" :active="active" :index="index">
        <span v-if="showIcon && resolvedIcon" class="at-tabs-nav__icon">
          <slot name="tabIcon" :icon="resolvedIcon" :tab="tab" :active="active" :index="index">
            <component :is="resolvedIcon" v-if="isVueComponentIcon(resolvedIcon)" />
            <i v-else-if="typeof resolvedIcon === 'string'" :class="resolvedIcon" />
          </slot>
        </span>
        <span class="at-tabs-nav__title">{{ tab.title }}</span>
        <button
          v-if="closable"
          type="button"
          class="at-tabs-nav__close"
          aria-label="关闭标签"
          @click="emit('close', $event, tab)"
        >
          <svg viewBox="0 0 1024 1024" width="10" height="10" fill="currentColor">
            <path
              d="M576 512l277.333-277.333c17.067-17.067 17.067-44.8 0-61.867s-44.8-17.067-61.867 0L512 450.133 234.667 172.8c-17.067-17.067-44.8-17.067-61.867 0s-17.067 44.8 0 61.867L450.133 512 172.8 789.333c-17.067 17.067-17.067 44.8 0 61.867 8.533 8.533 19.2 12.8 30.933 12.8s22.4-4.267 30.933-12.8L512 573.867l277.333 277.333c8.533 8.533 19.2 12.8 30.933 12.8s22.4-4.267 30.933-12.8c17.067-17.067 17.067-44.8 0-61.867L576 512z"
            />
          </svg>
        </button>
      </slot>
    </div>

    <template v-if="contextMenu" #dropdown>
      <TabsNavMenu
        :tab="tab"
        :include-close="true"
        :disable-close="!closable"
        :disable-close-others="!canCloseOthers(tabs, tab)"
        :disable-close-left="!canCloseLeft(tabs, index)"
        :disable-close-right="!canCloseRight(tabs, index)"
        :disable-close-all="!canCloseAll(tabs)"
        :menu-icons="menuIcons"
      >
        <template v-if="$slots.menuIcon" #menuIcon="slotProps">
          <slot name="menuIcon" v-bind="slotProps" />
        </template>
      </TabsNavMenu>
    </template>
  </component>
</template>

<style scoped lang="scss">
.at-tabs-nav__item-host {
  display: inline-flex;
  align-items: center;
  height: 100%;
}

.at-tabs-nav__item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  cursor: pointer;
  white-space: nowrap;
  font-size: 13px;
  color: var(--el-text-color-regular, #606266);
  box-sizing: border-box;
  transition:
    all 0.2s cubic-bezier(0.4, 0, 0.2, 1),
    color 0.15s ease;

  &:hover {
    color: var(--el-color-primary, #409eff);

    .at-tabs-nav__close {
      opacity: 0.85;
    }
  }

  &.is-active {
    color: var(--el-color-primary, #409eff);
    font-weight: 600;

    .at-tabs-nav__close {
      opacity: 0.85;
    }
  }

  &.at-tabs-nav__item.is-dragover {
    border-color: var(--el-color-primary, #409eff);
    background-color: var(--el-color-primary-light-8, #d9ecff);
    transform: scale(1.03);
    box-shadow: var(--el-box-shadow-light);
  }

  &--card {
    height: calc(100% - 8px);
    padding: 0 12px;
    border: 1px solid var(--el-border-color-lighter, #ebeef5);
    border-radius: 6px;
    background-color: var(--el-fill-color-light, #f5f7fa);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);

    &:hover:not(.is-active) {
      background-color: var(--el-fill-color, #f0f2f5);
      border-color: var(--el-border-color-light, #e4e7ed);
    }

    &.is-active {
      background-color: var(--el-bg-color, #ffffff);
      border-color: var(--el-color-primary-light-5, #a0cfff);
      box-shadow: 0 2px 6px rgba(64, 158, 255, 0.12);
    }
  }

  &--pill {
    height: calc(100% - 10px);
    padding: 0 14px;
    border-radius: 16px;
    border: 1px solid transparent;
    background-color: transparent;

    &:hover:not(.is-active) {
      background-color: var(--el-fill-color-light, #f5f7fa);
    }

    &.is-active {
      background-color: var(--el-color-primary-light-9, #ecf5ff);
      border-color: var(--el-color-primary-light-6, #b3d8ff);
      color: var(--el-color-primary, #409eff);
      box-shadow: 0 1px 4px rgba(64, 158, 255, 0.15);

      .at-tabs-nav__close {
        color: var(--el-color-primary, #409eff);
      }
    }
  }

  &--line {
    height: 100%;
    padding: 0 16px;
    border-radius: 0;
    border: none;
    background: transparent;
    color: var(--el-text-color-regular, #606266);

    &::before {
      content: '';
      position: absolute;
      right: 0;
      top: 28%;
      height: 44%;
      width: 1px;
      background-color: var(--el-border-color-lighter, #ebeef5);
      transition: opacity 0.2s ease;
    }

    &:last-child::before,
    &.is-active::before {
      opacity: 0;
    }

    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 8px;
      right: 8px;
      height: 2px;
      border-radius: 2px 2px 0 0;
      background-color: transparent;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      transform: scaleX(0);
    }

    &.is-active {
      color: var(--el-color-primary, #409eff);
      font-weight: 600;

      &::after {
        background-color: var(--el-color-primary, #409eff);
        box-shadow: 0 1px 4px 0 rgba(64, 158, 255, 0.3);
        transform: scaleX(1);
      }
    }
  }
}

.at-tabs-nav__icon {
  display: inline-flex;
  align-items: center;
  margin-right: 6px;
  font-size: 14px;
}

.at-tabs-nav__title {
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.at-tabs-nav__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 15px;
  height: 15px;
  margin-left: 6px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--el-text-color-placeholder, #a8abb2);
  cursor: pointer;
  opacity: 0.65;
  transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    opacity: 1;
    background-color: var(--el-color-danger-light-8, #fde2e2);
    color: var(--el-color-danger, #f56c6c);
    transform: scale(1.1);
  }
}
</style>
