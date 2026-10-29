<script setup lang="ts">
/**
 * 数据驱动菜单组件。
 *
 * 核心特性：
 * 1. 递归渲染 ProMenuItem 树，支持无限层级；
 * 2. 字段自适应映射（fieldNames）；
 * 3. 支持水平与垂直双模，垂直模式支持平滑折叠展开；
 * 4. 自动提取选中的菜单实体对象并派发给上层。
 *
 * @author Ateng
 * @since 2026-10-29
 */

import { computed } from 'vue';
import { ElMenu } from 'element-plus';
import ProMenuItemNode from './ProMenuItemNode.vue';
import type { ProMenuItem, ProMenuFieldNames } from './types';

defineOptions({
  name: 'ProMenu',
});

const props = withDefaults(
  defineProps<{
    menuData?: ProMenuItem[];
    mode?: 'horizontal' | 'vertical';
    collapse?: boolean;
    fieldNames?: ProMenuFieldNames;
    activeMenu?: string;
    defaultOpeneds?: string[];
  }>(),
  {
    menuData: () => [],
    mode: 'vertical',
    collapse: false,
    fieldNames: undefined,
    activeMenu: '',
    defaultOpeneds: () => [],
  },
);

const emit = defineEmits<{
  (e: 'select', path: string, item?: ProMenuItem): void;
}>();

const pathKey = computed(() => props.fieldNames?.path || 'path');
const childrenKey = computed(() => props.fieldNames?.children || 'children');

// 递归查找选中的菜单实体
function findMenuItem(items: ProMenuItem[], targetPath: string): ProMenuItem | undefined {
  for (const item of items) {
    if (String(item[pathKey.value] ?? item.path) === targetPath) {
      return item;
    }
    const children = item[childrenKey.value] as ProMenuItem[] | undefined;
    if (Array.isArray(children) && children.length > 0) {
      const found = findMenuItem(children, targetPath);
      if (found) return found;
    }
  }
  return undefined;
}

const handleSelect = (index: string) => {
  const item = findMenuItem(props.menuData, index);
  emit('select', index, item);
};
</script>

<template>
  <el-menu
    :mode="mode"
    :collapse="mode === 'vertical' ? collapse : false"
    :default-active="activeMenu"
    :default-openeds="defaultOpeneds"
    :collapse-transition="false"
    class="at-pro-menu"
    :class="`at-pro-menu--${mode}`"
    @select="handleSelect"
  >
    <ProMenuItemNode
      v-for="item in menuData"
      :key="String(item[pathKey] ?? item.path)"
      :item="item"
      :field-names="fieldNames"
      :depth="0"
      :mode="mode"
    />
  </el-menu>
</template>

<style scoped>
.at-pro-menu {
  border-right: none;
  background-color: transparent;
  width: 100%;
}

.at-pro-menu--horizontal {
  border-bottom: none;
}

/* ===================== 折叠态 (Collapse) 绝对居中与对齐防御规约 ===================== */
.at-pro-menu.el-menu--collapse :deep(.el-menu-item),
.at-pro-menu.el-menu--collapse :deep(.el-sub-menu__title) {
  padding: 0 !important;
  justify-content: center !important;
  display: flex !important;
  align-items: center !important;
  text-align: center !important;
}

.at-pro-menu.el-menu--collapse :deep(.el-menu-tooltip__trigger) {
  padding: 0 !important;
  justify-content: center !important;
  display: flex !important;
  align-items: center !important;
  width: 100% !important;
}

.at-pro-menu.el-menu--collapse :deep(.at-pro-menu__icon) {
  margin-right: 0 !important;
  display: inline-flex !important;
  justify-content: center !important;
  align-items: center !important;
}

.at-pro-menu.el-menu--collapse :deep(.at-pro-menu__fallback-icon) {
  visibility: visible !important;
  display: inline-flex !important;
  width: 24px !important;
  height: 24px !important;
  line-height: 24px !important;
  font-size: 12px !important;
  margin: 0 !important;
  opacity: 1 !important;
  overflow: visible !important;
  justify-content: center !important;
  align-items: center !important;
}

.at-pro-menu.el-menu--collapse :deep(.at-pro-menu__title),
.at-pro-menu.el-menu--collapse :deep(.at-pro-menu__badge),
.at-pro-menu.el-menu--collapse :deep(.el-sub-menu__icon-arrow) {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
  overflow: hidden !important;
  flex: 0 0 0 !important;
}
</style>
