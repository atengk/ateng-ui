<script setup lang="ts">
/**
 * AtengTabsNav 企业级多标签页导航组件。
 *
 * 具备视口溢出滚动感知、卡片/胶囊/下划线三大视觉形态、固定标签防关与激活流转。
 *
 * @author Ateng
 * @since 2026-10-29
 */

import { computed } from 'vue';
import type { AtengTabsNavProps, AtengTabsNavEmits, AtengTabsNavSlots, TabItem } from './types';

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
});

const emit = defineEmits<AtengTabsNavEmits>();
defineSlots<AtengTabsNavSlots>();

// 格式化高度尺寸
const containerHeight = computed<string>(() => {
  return typeof props.height === 'number' ? `${props.height}px` : props.height;
});

// 判断单标签是否可被关闭
const isTabClosable = (tab: TabItem): boolean => {
  if (tab.affix) {
    return false;
  }
  return tab.closable ?? props.closable;
};

// 点击标签处理
const onTabItemClick = (tab: TabItem): void => {
  if (props.modelValue !== tab.key) {
    emit('update:modelValue', tab.key);
  }
  emit('tabClick', tab);
};

// 点击关闭按钮处理
const onTabItemClose = (event: MouseEvent, tab: TabItem): void => {
  event.stopPropagation();
  emit('tabClose', tab.key, tab);
};
</script>

<template>
  <div
    class="at-tabs-nav"
    :class="[`at-tabs-nav--${styleType}`]"
    :style="{ height: containerHeight, minHeight: containerHeight }"
    role="tablist"
  >
    <!-- 前置插槽 -->
    <div v-if="$slots.prefix" class="at-tabs-nav__prefix">
      <slot name="prefix" />
    </div>

    <!-- 标签滚动视口区域 -->
    <div class="at-tabs-nav__viewport">
      <div class="at-tabs-nav__track">
        <div
          v-for="(tab, index) in tabs"
          :key="tab.key"
          class="at-tabs-nav__item"
          :class="{
            'is-active': tab.key === modelValue,
            'is-affix': tab.affix,
          }"
          role="tab"
          :aria-selected="tab.key === modelValue"
          @click="onTabItemClick(tab)"
        >
          <!-- 自定义插槽优先 -->
          <slot name="tab" :tab="tab" :active="tab.key === modelValue" :index="index">
            <!-- 标签图标 -->
            <span v-if="showIcon && tab.icon" class="at-tabs-nav__icon">
              <component :is="tab.icon" v-if="typeof tab.icon === 'object'" />
              <i v-else-if="typeof tab.icon === 'string'" :class="tab.icon" />
            </span>

            <!-- 标签标题 -->
            <span class="at-tabs-nav__title">{{ tab.title }}</span>

            <!-- 关闭按钮 -->
            <button
              v-if="isTabClosable(tab)"
              type="button"
              class="at-tabs-nav__close"
              aria-label="关闭标签"
              @click="onTabItemClose($event, tab)"
            >
              <svg viewBox="0 0 1024 1024" width="12" height="12" fill="currentColor">
                <path
                  d="M576 512l277.333-277.333c17.067-17.067 17.067-44.8 0-61.867s-44.8-17.067-61.867 0L512 450.133 234.667 172.8c-17.067-17.067-44.8-17.067-61.867 0s-17.067 44.8 0 61.867L450.133 512 172.8 789.333c-17.067 17.067-17.067 44.8 0 61.867 8.533 8.533 19.2 12.8 30.933 12.8s22.4-4.267 30.933-12.8L512 573.867l277.333 277.333c8.533 8.533 19.2 12.8 30.933 12.8s22.4-4.267 30.933-12.8c17.067-17.067 17.067-44.8 0-61.867L576 512z"
                />
              </svg>
            </button>
          </slot>
        </div>
      </div>
    </div>

    <!-- 后置插槽 -->
    <div v-if="$slots.suffix" class="at-tabs-nav__suffix">
      <slot name="suffix" />
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
  }

  &__viewport {
    display: flex;
    align-items: center;
    flex: 1;
    height: 100%;
    overflow: hidden;
  }

  &__track {
    display: flex;
    align-items: center;
    height: 100%;
    gap: 4px;
  }

  &__item {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    position: relative;
    cursor: pointer;
    white-space: nowrap;
    padding: 0 10px;
    height: calc(100% - 6px);
    font-size: 13px;
    color: var(--el-text-color-regular, #606266);
    border-radius: var(--el-border-radius-base, 4px);
    transition:
      all 0.2s cubic-bezier(0.4, 0, 0.2, 1),
      color 0.15s ease;

    &:hover {
      color: var(--el-color-primary, #409eff);
      background-color: var(--el-fill-color-light, #f5f7fa);
    }

    &.is-active {
      color: var(--el-color-primary, #409eff);
      background-color: var(--el-color-primary-light-9, #ecf5ff);
      font-weight: 500;
    }
  }

  &__icon {
    display: inline-flex;
    align-items: center;
    margin-right: 6px;
    font-size: 14px;
  }

  &__title {
    display: inline-block;
    max-width: 160px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    margin-left: 6px;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: var(--el-text-color-secondary, #909399);
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      background-color: var(--el-fill-color-dark, #dcdfe6);
      color: var(--el-text-color-primary, #303133);
    }
  }

  // --- 风格 1: card 卡片风格 ---
  &--card {
    .at-tabs-nav__item {
      border: 1px solid var(--el-border-color-lighter, #ebeef5);
      background-color: var(--el-bg-color, #ffffff);

      &:hover {
        border-color: var(--el-color-primary-light-7, #c6e2ff);
      }

      &.is-active {
        border-color: var(--el-color-primary, #409eff);
        background-color: var(--el-bg-color, #ffffff);
      }
    }
  }

  // --- 风格 2: pill 胶囊风格 ---
  &--pill {
    padding: 2px 8px;
    .at-tabs-nav__item {
      border-radius: 9999px;
      padding: 0 12px;
      height: calc(100% - 8px);
      border: none;
    }
  }

  // --- 风格 3: line 下划线风格 ---
  &--line {
    .at-tabs-nav__item {
      border-radius: 0;
      border: none;
      background: transparent !important;

      &::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 2px;
        background-color: transparent;
        transition: background-color 0.2s ease;
      }

      &.is-active::after {
        background-color: var(--el-color-primary, #409eff);
      }
    }
  }
}
</style>
