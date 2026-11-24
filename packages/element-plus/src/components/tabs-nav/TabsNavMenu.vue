<script setup lang="ts">
/**
 * AtengTabsNav 统一上下文菜单与快捷操作下拉菜单子组件。
 *
 * @author Ateng
 * @since 2026-11-24
 */

import { computed, type Component } from 'vue';
import { ElDropdownMenu, ElDropdownItem } from 'element-plus';
import { TAB_MENU_ICON_PATHS, isVueComponentIcon } from './tabsCommands';
import type { TabCommand, TabItem, TabMenuIcons } from './types';

defineOptions({
  name: 'TabsNavMenu',
});

interface MenuEntryConfig {
  command: TabCommand;
  label: string;
  disabled: boolean;
  divided?: boolean;
  customIcon?: false | string | Component;
}

const props = withDefaults(
  defineProps<{
    /** 当前上下文关联标签 */
    tab?: TabItem;
    /** 是否显示“关闭当前”命令（快捷下拉面板不显示，右键菜单显示） */
    includeClose?: boolean;
    /** 是否禁用刷新 */
    disableRefresh?: boolean;
    /** 是否禁用关闭当前 */
    disableClose?: boolean;
    /** 是否禁用关闭其他 */
    disableCloseOthers?: boolean;
    /** 是否禁用关闭左侧 */
    disableCloseLeft?: boolean;
    /** 是否禁用关闭右侧 */
    disableCloseRight?: boolean;
    /** 是否禁用全部关闭 */
    disableCloseAll?: boolean;
    /** 自定义或隐藏图标映射 */
    menuIcons?: TabMenuIcons;
  }>(),
  {
    tab: undefined,
    includeClose: false,
    disableRefresh: false,
    disableClose: false,
    disableCloseOthers: false,
    disableCloseLeft: false,
    disableCloseRight: false,
    disableCloseAll: false,
    menuIcons: undefined,
  },
);

defineSlots<{
  menuIcon?: (scope: { command: TabCommand; tab?: TabItem }) => unknown;
}>();

const menuEntries = computed<MenuEntryConfig[]>(() => {
  const icons = props.menuIcons;
  const rawList: Array<Omit<MenuEntryConfig, 'customIcon'>> = [
    { command: 'refresh', label: '刷新当前', disabled: props.disableRefresh },
  ];
  if (props.includeClose) {
    rawList.push({
      command: 'close',
      label: '关闭当前',
      disabled: props.disableClose,
      divided: true,
    });
  }
  rawList.push(
    {
      command: 'closeOthers',
      label: '关闭其他',
      disabled: props.disableCloseOthers,
      divided: !props.includeClose,
    },
    { command: 'closeLeft', label: '关闭左侧', disabled: props.disableCloseLeft },
    { command: 'closeRight', label: '关闭右侧', disabled: props.disableCloseRight },
    { command: 'closeAll', label: '全部关闭', disabled: props.disableCloseAll, divided: true },
  );
  return rawList.map(item => ({
    ...item,
    customIcon: icons?.[item.command],
  }));
});
</script>

<template>
  <ElDropdownMenu class="at-tabs-nav__dropdown-menu">
    <ElDropdownItem
      v-for="entry in menuEntries"
      :key="entry.command"
      :command="entry.command"
      :disabled="entry.disabled"
      :divided="entry.divided"
    >
      <span class="at-tabs-nav__dropdown-item">
        <span v-if="entry.customIcon !== false" class="at-tabs-nav__menu-icon">
          <slot name="menuIcon" :command="entry.command" :tab="tab">
            <component :is="entry.customIcon" v-if="isVueComponentIcon(entry.customIcon)" />
            <i v-else-if="typeof entry.customIcon === 'string'" :class="entry.customIcon" />
            <svg v-else viewBox="0 0 1024 1024" width="13" height="13" fill="currentColor">
              <path :d="TAB_MENU_ICON_PATHS[entry.command]" />
            </svg>
          </slot>
        </span>
        <span>{{ entry.label }}</span>
      </span>
    </ElDropdownItem>
  </ElDropdownMenu>
</template>

<style scoped lang="scss">
.at-tabs-nav__dropdown-item {
  display: inline-flex;
  align-items: center;
  font-size: 13px;
  gap: 6px;
}

.at-tabs-nav__menu-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  line-height: 1;
}
</style>
