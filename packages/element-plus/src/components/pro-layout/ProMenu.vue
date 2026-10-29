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
</style>
