<script setup lang="ts">
/**
 * 纯无状态基础侧边栏容器组件。
 *
 * 核心特性：
 * 1. 弹性侧边栏排版，支持受控折叠 v-model:collapsed 与 collapsible；
 * 2. 自动向祖先 AtengLayout 注册自身，触发横向排版感知；
 * 3. 支持自定义宽度、折叠宽度与自定义 trigger 插槽；
 * 4. 规范 .at-aside 独立命名空间与 scoped 样式隔离。
 *
 * @author Ateng
 * @since 2026-10-25
 */

import { ref, computed, inject, onMounted, onBeforeUnmount } from 'vue';
import {
  type AtengAsideProps,
  type AtengAsideEmits,
  type AtengAsideSlots,
  ATENG_LAYOUT_INJECTION_KEY,
} from './types';

defineOptions({
  name: 'AtengAside',
});

const props = withDefaults(defineProps<AtengAsideProps>(), {
  width: '200px',
  collapsedWidth: '48px',
  collapsed: false,
  collapsible: false,
  background: undefined,
  tag: 'aside',
});

const emit = defineEmits<AtengAsideEmits>();
defineSlots<AtengAsideSlots>();

const asideRef = ref<HTMLElement | null>(null);

// 1. 向父级 AtengLayout 注册自身
const layoutContext = inject(ATENG_LAYOUT_INJECTION_KEY, null);
let unregisterAside: (() => void) | null = null;

onMounted(() => {
  if (layoutContext) {
    unregisterAside = layoutContext.registerAside();
  }
});

onBeforeUnmount(() => {
  if (unregisterAside) {
    unregisterAside();
    unregisterAside = null;
  }
});

// 2. 折叠切换状态机
const isCollapsed = computed(() => Boolean(props.collapsed));

const toggle = () => {
  const next = !isCollapsed.value;
  emit('update:collapsed', next);
  emit('collapse', next);
};

// 3. 计算宽度样式
const asideStyle = computed(() => {
  const rawWidth = isCollapsed.value ? props.collapsedWidth : props.width;
  const widthStr = typeof rawWidth === 'number' ? `${rawWidth}px` : rawWidth;
  return {
    width: widthStr,
    backgroundColor: props.background,
  };
});

defineExpose({
  asideRef,
  isCollapsed,
  toggle,
});
</script>

<template>
  <component
    :is="tag"
    ref="asideRef"
    class="at-aside"
    :class="{ 'is-collapsed': isCollapsed, 'is-collapsible': collapsible }"
    :style="asideStyle"
  >
    <div class="at-aside__body">
      <slot />
    </div>

    <!-- 底部折叠触发条 -->
    <template v-if="collapsible">
      <slot name="trigger" :collapsed="isCollapsed" :toggle="toggle">
        <div
          class="at-aside__trigger"
          role="button"
          tabindex="0"
          :aria-expanded="!isCollapsed"
          @click="toggle"
          @keydown.enter="toggle"
          @keydown.space.prevent="toggle"
        >
          <svg
            viewBox="0 0 1024 1024"
            class="at-aside__trigger-icon"
            :class="{ 'is-collapsed': isCollapsed }"
            width="14"
            height="14"
            fill="currentColor"
          >
            <!-- 矢量折叠展开箭头 -->
            <path
              d="M724 218.3V141c0-6.7-7.7-10.4-12.9-6.3L260.3 486.8c-16.4 12.8-16.4 37.5 0 50.3l450.8 352.1c5.3 4.1 12.9 0.4 12.9-6.3v-77.3c0-4.9-2.3-9.6-6.1-12.6l-360-281 360-281.1c3.8-3 6.1-7.7 6.1-12.6z"
            />
          </svg>
        </div>
      </slot>
    </template>
  </component>
</template>

<style scoped>
.at-aside {
  flex: 0 0 auto;
  box-sizing: border-box;
  background-color: var(--el-bg-color);
  border-right: 1px solid var(--el-border-color-lighter);
  transition: width 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.at-aside__body {
  flex: 1 1 auto;
  overflow: auto;
  min-height: 0;
  box-sizing: border-box;
}

.at-aside__trigger {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-top: 1px solid var(--el-border-color-lighter);
  background-color: var(--el-fill-color-light);
  color: var(--el-text-color-secondary);
  transition: all 0.2s ease;
  user-select: none;
}

.at-aside__trigger:hover {
  color: var(--el-color-primary);
  background-color: var(--el-fill-color);
}

.at-aside__trigger-icon {
  transition: transform 0.2s ease;
}

.at-aside__trigger-icon.is-collapsed {
  transform: rotate(180deg);
}
</style>
