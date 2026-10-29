<script setup lang="ts">
/**
 * 递归菜单节点渲染组件。
 *
 * @author Ateng
 * @since 2026-10-29
 */

import { computed } from 'vue';
import { ElMenuItem, ElSubMenu, ElIcon, ElBadge } from 'element-plus';
import type { ProMenuFieldNames, ProMenuRawItem } from './types';

defineOptions({
  name: 'ProMenuItemNode',
});

const props = withDefaults(
  defineProps<{
    item: ProMenuRawItem;
    fieldNames?: ProMenuFieldNames;
    depth?: number;
    mode?: 'horizontal' | 'vertical';
  }>(),
  {
    fieldNames: undefined,
    depth: 0,
    mode: 'vertical',
  },
);

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
const targetKey = computed(() => props.fieldNames?.target || 'target');

defineSlots<{
  menuItem?: (props: { item: ProMenuRawItem; depth: number }) => unknown;
}>();

const itemPath = computed(() => String(props.item[pathKey.value] ?? ''));
const itemTitle = computed(() => String(props.item[titleKey.value] ?? ''));
const fallbackChar = computed(() => {
  const t = itemTitle.value.trim();
  return t ? t.charAt(0).toUpperCase() : '?';
});
const itemChildren = computed(() => {
  const children = props.item[childrenKey.value];
  if (Array.isArray(children) && children.length > 0) {
    return children as ProMenuRawItem[];
  }
  return undefined;
});
const itemIcon = computed(() => props.item[iconKey.value]);
const itemBadge = computed(() => props.item[badgeKey.value]);
type BadgeType = '' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
const itemBadgeType = computed<BadgeType>(() => {
  const val = props.item[badgeTypeKey.value];
  if (
    val === 'primary' ||
    val === 'success' ||
    val === 'warning' ||
    val === 'danger' ||
    val === 'info' ||
    val === ''
  ) {
    return val;
  }
  return 'danger';
});
const itemTarget = computed<string | undefined>(() => {
  const val = props.item[targetKey.value];
  return typeof val === 'string' ? val : (props.item.target ?? undefined);
});
const isDisabled = computed(() => Boolean(props.item[disabledKey.value]));
const isHidden = computed(() => Boolean(props.item[hiddenKey.value]));
const hasChildren = computed(() => Boolean(itemChildren.value && itemChildren.value.length > 0));

const handleItemClick = () => {
  if (itemTarget.value === '_blank' && itemPath.value) {
    if (typeof window !== 'undefined') {
      window.open(itemPath.value, '_blank', 'noopener,noreferrer');
    }
  }
};

// 深度缩进样式计算（保证子菜单文字严格缩进在父菜单内侧，杜绝无图标子菜单视觉倒挂）
const menuItemStyle = computed(() => {
  if (props.mode === 'horizontal' || currentDepth.value === 0) {
    return undefined;
  }
  // depth >= 1: 垂直模式下的二级及以上层级菜单
  // 一级菜单带图标时文字起始位置约为 52px (20px base-padding + 24px icon-width + 8px margin-right)
  // 无图标二级菜单强制设置 60px 缩进（向右缩进 8px），三级 80px，严格保障树形层次递进
  if (!itemIcon.value) {
    return {
      paddingLeft: `${60 + (currentDepth.value - 1) * 20}px !important`,
    };
  }
  return {
    paddingLeft: `${40 + (currentDepth.value - 1) * 20}px !important`,
  };
});

// 无图标 SubMenu 分组标题的缩进计算
const subMenuTitlePadding = computed(() => {
  if (props.mode === 'horizontal' || currentDepth.value === 0 || itemIcon.value) {
    return undefined;
  }
  return `${60 + (currentDepth.value - 1) * 20}px`;
});
</script>

<template>
  <template v-if="!isHidden">
    <!-- 1. 拥有子菜单的 SubMenu 节点 -->
    <el-sub-menu
      v-if="hasChildren"
      :index="itemPath"
      :disabled="isDisabled"
      :class="{ 'at-pro-submenu--no-icon': currentDepth >= 1 && !itemIcon }"
    >
      <template #title>
        <slot v-if="$slots.menuItem" name="menuItem" :item="item" :depth="currentDepth" />
        <template v-else>
          <el-icon v-if="itemIcon" class="at-pro-menu__icon">
            <component
              :is="itemIcon"
              v-if="typeof itemIcon === 'object' || typeof itemIcon === 'function'"
            />
            <i v-else :class="itemIcon" />
          </el-icon>
          <i v-else class="at-pro-menu__fallback-icon" role="img" :aria-label="itemTitle">
            {{ fallbackChar }}
          </i>
          <span class="at-pro-menu__title">{{ itemTitle }}</span>
          <el-badge
            v-if="itemBadge !== undefined && itemBadge !== null && itemBadge !== ''"
            :value="itemBadge"
            :type="itemBadgeType"
            class="at-pro-menu__badge"
          />
        </template>
      </template>

      <!-- 递归渲染子项 -->
      <ProMenuItemNode
        v-for="child in itemChildren"
        :key="String(child[pathKey] ?? child.path)"
        :item="child"
        :field-names="fieldNames"
        :depth="currentDepth + 1"
        :mode="mode"
      >
        <template v-if="$slots.menuItem" #menuItem="slotProps">
          <slot name="menuItem" v-bind="slotProps" />
        </template>
      </ProMenuItemNode>
    </el-sub-menu>

    <!-- 2. 叶子 MenuItem 节点 -->
    <el-menu-item
      v-else
      :index="itemPath"
      :disabled="isDisabled"
      :style="menuItemStyle"
      @click="handleItemClick"
    >
      <slot v-if="$slots.menuItem" name="menuItem" :item="item" :depth="currentDepth" />
      <template v-else>
        <el-icon v-if="itemIcon" class="at-pro-menu__icon">
          <component
            :is="itemIcon"
            v-if="typeof itemIcon === 'object' || typeof itemIcon === 'function'"
          />
          <i v-else :class="itemIcon" />
        </el-icon>
        <i v-else class="at-pro-menu__fallback-icon" role="img" :aria-label="itemTitle">
          {{ fallbackChar }}
        </i>
      </template>

      <template v-if="!$slots.menuItem" #title>
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

.at-pro-menu__fallback-icon {
  display: none;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  background-color: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  font-size: 12px;
  font-weight: 600;
  font-style: normal;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  line-height: 24px;
  user-select: none;
  box-sizing: border-box;
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

:deep(.at-pro-submenu--no-icon > .el-sub-menu__title) {
  padding-left: v-bind('subMenuTitlePadding') !important;
}
</style>
