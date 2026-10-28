<script setup lang="ts">
/**
 * AtengFlowStencil 流程图物料面板组件。
 *
 * 按事件、任务、网关三段式归类展示预设图元，并提供基于 LogicFlow DND 的拖拽放置交互。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import { ref, computed } from 'vue';
import {
  DEFAULT_STENCIL_GROUPS,
  getNodeBadgeIcon,
  type StencilGroup,
  type StencilItem,
} from '../presets';
import type { AtengFlowStencilProps, AtengFlowStencilEmits } from '../types';

defineOptions({
  name: 'AtengFlowStencil',
});

const props = withDefaults(defineProps<AtengFlowStencilProps>(), {
  groups: () => DEFAULT_STENCIL_GROUPS,
  lf: null,
  title: '流程图元',
});

const emit = defineEmits<AtengFlowStencilEmits>();

const keyword = ref<string>('');

const isSvgIcon = (icon?: string): boolean => {
  return typeof icon === 'string' && icon.trim().startsWith('<svg');
};

const getItemLabel = (
  item: StencilItem | { label?: string; text?: string; type?: string },
): string => {
  const customText = 'text' in item ? (item as { text?: string }).text : undefined;
  return item.label ?? customText ?? item.type ?? '';
};

const filteredGroups = computed<StencilGroup[]>(() => {
  const kw = keyword.value.trim().toLowerCase();
  if (!kw) {
    return props.groups;
  }
  return props.groups
    .map(group => ({
      ...group,
      items: group.items.filter(item => {
        const label = getItemLabel(item).toLowerCase();
        const type = item.type.toLowerCase();
        const desc = (item.description ?? '').toLowerCase();
        return label.includes(kw) || type.includes(kw) || desc.includes(kw);
      }),
    }))
    .filter(group => group.items.length > 0);
});

const handleMouseDown = (item: StencilItem, event: MouseEvent) => {
  if (props.lf) {
    const textVal =
      typeof item.nodeConfig?.text === 'string' ? item.nodeConfig.text : getItemLabel(item);
    const properties =
      item.nodeConfig?.properties ??
      (item as unknown as { defaultProperties?: Record<string, unknown> }).defaultProperties;
    props.lf.dnd.startDrag({
      type: item.type,
      text: textVal,
      properties,
    });
  }
  emit('dragstart', item, event);
};

const handleClick = (item: StencilItem) => {
  emit('item:click', item);
};
</script>

<template>
  <!-- eslint-disable vue/no-v-html -->
  <aside class="at-flow-stencil">
    <div class="at-flow-stencil__header">
      <span class="at-flow-stencil__title">{{ title }}</span>
      <input
        v-model="keyword"
        type="text"
        class="at-flow-stencil__search"
        placeholder="搜索图元..."
      />
    </div>

    <div class="at-flow-stencil__body">
      <div v-for="group in filteredGroups" :key="group.id" class="at-flow-stencil__group">
        <div class="at-flow-stencil__group-title">{{ group.title }}</div>
        <div class="at-flow-stencil__items">
          <div
            v-for="item in group.items"
            :key="item.type"
            class="at-flow-stencil__item"
            :title="item.description ?? getItemLabel(item)"
            @mousedown="handleMouseDown(item, $event)"
            @click="handleClick(item)"
          >
            <div class="at-flow-stencil__item-badge" :data-type="item.type">
              <span
                v-if="isSvgIcon(item.icon)"
                class="at-flow-stencil__svg-icon"
                v-html="item.icon"
              />
              <span v-else>{{ item.icon || getNodeBadgeIcon(item.type) }}</span>
            </div>
            <span class="at-flow-stencil__item-label">{{ getItemLabel(item) }}</span>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.at-flow-stencil {
  display: flex;
  flex-direction: column;
  width: 200px;
  height: 100%;
  box-sizing: border-box;
  background-color: #ffffff;
  border-right: 1px solid var(--at-flow-border, #e2e8f0);
  user-select: none;
  font-family: var(--at-flow-font-family, sans-serif);
}

.at-flow-stencil__header {
  padding: 12px;
  border-bottom: 1px solid var(--at-flow-border, #e2e8f0);
}

.at-flow-stencil__title {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 8px;
}

.at-flow-stencil__search {
  width: 100%;
  padding: 4px 8px;
  font-size: 12px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.2s;
}

.at-flow-stencil__search:focus {
  border-color: #3b82f6;
}

.at-flow-stencil__body {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.at-flow-stencil__group {
  margin-bottom: 16px;
}

.at-flow-stencil__group-title {
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.at-flow-stencil__items {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.at-flow-stencil__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 4px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background-color: #f8fafc;
  cursor: grab;
  transition: all 0.2s;
}

.at-flow-stencil__item:hover {
  border-color: #3b82f6;
  background-color: #eff6ff;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.08);
}

.at-flow-stencil__item:active {
  cursor: grabbing;
}

.at-flow-stencil__item-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  font-size: 12px;
  margin-bottom: 4px;
  color: #3b82f6;
  background-color: #e0f2fe;
  overflow: hidden;
  flex-shrink: 0;
}

.at-flow-stencil__svg-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  overflow: hidden;
}

.at-flow-stencil__svg-icon :deep(svg) {
  width: 16px;
  height: 16px;
  max-width: 100%;
  max-height: 100%;
}

.at-flow-stencil__item-badge[data-type*='start'] {
  color: #10b981;
  background-color: #ecfdf5;
}

.at-flow-stencil__item-badge[data-type*='end'] {
  color: #ef4444;
  background-color: #fef2f2;
}

.at-flow-stencil__item-badge[data-type*='gateway'] {
  color: #f59e0b;
  background-color: #fffbeb;
}

.at-flow-stencil__item-label {
  font-size: 11px;
  color: #475569;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
</style>
