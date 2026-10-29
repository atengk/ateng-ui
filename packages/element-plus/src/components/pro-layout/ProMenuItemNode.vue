<script setup lang="ts">
/**
 * 递归菜单节点渲染组件。
 *
 * @author Ateng
 * @since 2026-10-29
 */

import { computed } from 'vue';
import { ElMenuItem, ElSubMenu, ElIcon, ElBadge } from 'element-plus';
import type { ProMenuItem, ProMenuFieldNames } from './types';

defineOptions({
  name: 'ProMenuItemNode',
});

const props = defineProps<{
  item: ProMenuItem;
  fieldNames?: ProMenuFieldNames;
  depth?: number;
}>();

const currentDepth = computed(() => props.depth ?? 0);

// 字段映射解析工具
const pathKey = computed(() => props.fieldNames?.path || 'path');
const titleKey = computed(() => props.fieldNames?.title || 'title');
const childrenKey = computed(() => props.fieldNames?.children || 'children');
const iconKey = computed(() => props.fieldNames?.icon || 'icon');
const badgeKey = computed(() => props.fieldNames?.badge || 'badge');
const badgeTypeKey = computed(() => props.fieldNames?.badgeType || 'badgeType');
const disabledKey = computed(() => props.fieldNames?.disabled || 'disabled');
const hiddenKey = computed(() => props.fieldNames?.hidden || 'hidden');

const itemPath = computed(() => String(props.item[pathKey.value] ?? ''));
const itemTitle = computed(() => String(props.item[titleKey.value] ?? ''));
const itemChildren = computed(() => {
  const children = props.item[childrenKey.value];
  if (Array.isArray(children) && children.length > 0) {
    return children as ProMenuItem[];
  }
  return undefined;
});
const itemIcon = computed(() => props.item[iconKey.value]);
const itemBadge = computed(() => props.item[badgeKey.value]);
const itemBadgeType = computed(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  () => (props.item[badgeTypeKey.value] as any) || 'danger',
);
const isDisabled = computed(() => Boolean(props.item[disabledKey.value]));
const isHidden = computed(() => Boolean(props.item[hiddenKey.value]));
const hasChildren = computed(() => Boolean(itemChildren.value && itemChildren.value.length > 0));
</script>

<template>
  <template v-if="!isHidden">
    <!-- 1. 拥有子菜单的 SubMenu 节点 -->
    <el-sub-menu v-if="hasChildren" :index="itemPath" :disabled="isDisabled">
      <template #title>
        <el-icon v-if="itemIcon" class="at-pro-menu__icon">
          <component
            :is="itemIcon"
            v-if="typeof itemIcon === 'object' || typeof itemIcon === 'function'"
          />
          <i v-else :class="itemIcon" />
        </el-icon>
        <span class="at-pro-menu__title">{{ itemTitle }}</span>
        <el-badge
          v-if="itemBadge !== undefined && itemBadge !== null && itemBadge !== ''"
          :value="itemBadge"
          :type="itemBadgeType"
          class="at-pro-menu__badge"
        />
      </template>

      <!-- 递归渲染子项 -->
      <ProMenuItemNode
        v-for="child in itemChildren"
        :key="String(child[pathKey] ?? child.path)"
        :item="child"
        :field-names="fieldNames"
        :depth="currentDepth + 1"
      />
    </el-sub-menu>

    <!-- 2. 叶子 MenuItem 节点 -->
    <el-menu-item v-else :index="itemPath" :disabled="isDisabled">
      <el-icon v-if="itemIcon" class="at-pro-menu__icon">
        <component
          :is="itemIcon"
          v-if="typeof itemIcon === 'object' || typeof itemIcon === 'function'"
        />
        <i v-else :class="itemIcon" />
      </el-icon>
      <template #title>
        <span class="at-pro-menu__title">{{ itemTitle }}</span>
        <el-badge
          v-if="itemBadge !== undefined && itemBadge !== null && itemBadge !== ''"
          :value="itemBadge"
          :type="itemBadgeType"
          class="at-pro-menu__badge"
        />
      </template>
    </el-menu-item>
  </template>
</template>

<style scoped>
.at-pro-menu__icon {
  margin-right: 8px;
  font-size: 16px;
  flex-shrink: 0;
}

.at-pro-menu__title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.at-pro-menu__badge {
  margin-left: 8px;
}
</style>
