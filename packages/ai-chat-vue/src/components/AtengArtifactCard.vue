<script setup lang="ts">
/**
 * @atengk/ai-chat-vue 消息气泡内紧凑产物卡片组件。
 *
 * 遵循 L2 零 Element Plus 依赖纯净律，采用纯原生 CSS 变量驱动，
 * 以轻量紧凑的胶囊卡片形式展示代码产物信息，点击唤起侧边栏工作台。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { computed } from 'vue';
import type { AtengArtifactCardProps, AtengArtifactCardEmits } from '../types';
import { IconFileCode, IconChevronDown } from './icons';

const props = withDefaults(defineProps<AtengArtifactCardProps>(), {
  active: false,
});

const emit = defineEmits<AtengArtifactCardEmits>();

const latestVersion = computed<number>(() => {
  if (!props.artifact.versions || props.artifact.versions.length === 0) {
    return 1;
  }
  const last = props.artifact.versions[props.artifact.versions.length - 1];
  return last ? last.version : 1;
});

const uppercaseLanguage = computed<string>(() => {
  return (props.artifact.language || 'code').toUpperCase();
});

const handleClick = (): void => {
  emit('click', props.artifact);
};
</script>

<template>
  <div
    class="at-artifact-card"
    :class="{ 'at-artifact-card--active': props.active }"
    role="button"
    tabindex="0"
    @click="handleClick"
    @keydown.enter="handleClick"
  >
    <div class="at-artifact-card__icon-wrapper">
      <IconFileCode class="at-artifact-card__icon" />
    </div>

    <div class="at-artifact-card__content">
      <div class="at-artifact-card__title">{{ props.artifact.title }}</div>
      <div class="at-artifact-card__meta">
        <span class="at-artifact-card__badge at-artifact-card__badge--lang">
          {{ uppercaseLanguage }}
        </span>
        <span class="at-artifact-card__badge at-artifact-card__badge--version">
          v{{ latestVersion }}
        </span>
      </div>
    </div>

    <div class="at-artifact-card__action">
      <span class="at-artifact-card__action-text">查看产物</span>
      <IconChevronDown class="at-artifact-card__arrow" />
    </div>
  </div>
</template>

<style scoped>
.at-artifact-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  margin: 6px 0;
  border-radius: 8px;
  border: 1px solid var(--at-chat-border, #e2e8f0);
  background-color: var(--at-chat-bg, #ffffff);
  color: var(--at-chat-text-primary, #0f172a);
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}

.at-artifact-card:hover {
  border-color: #2563eb;
  background-color: rgba(37, 99, 235, 0.04);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.at-artifact-card--active {
  border-color: #2563eb;
  background-color: rgba(37, 99, 235, 0.08);
}

.at-artifact-card__icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background-color: rgba(37, 99, 235, 0.1);
  color: #2563eb;
  flex-shrink: 0;
}

.at-artifact-card__content {
  flex: 1;
  min-width: 0;
}

.at-artifact-card__title {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 2px;
}

.at-artifact-card__meta {
  display: flex;
  align-items: center;
  gap: 6px;
}

.at-artifact-card__badge {
  font-size: 11px;
  padding: 1px 5px;
  border-radius: 4px;
  font-family: monospace;
}

.at-artifact-card__badge--lang {
  background-color: var(--at-chat-surface, #f1f5f9);
  color: var(--at-chat-text-secondary, #64748b);
}

.at-artifact-card__badge--version {
  background-color: rgba(16, 185, 129, 0.12);
  color: #059669;
  font-weight: 500;
}

.at-artifact-card__action {
  display: flex;
  align-items: center;
  gap: 2px;
  color: #2563eb;
  font-size: 12px;
  font-weight: 500;
  flex-shrink: 0;
}

.at-artifact-card__arrow {
  transform: rotate(-90deg);
  width: 12px;
  height: 12px;
  transition: transform 0.2s ease;
}

.at-artifact-card:hover .at-artifact-card__arrow {
  transform: rotate(-90deg) translateX(2px);
}
</style>
