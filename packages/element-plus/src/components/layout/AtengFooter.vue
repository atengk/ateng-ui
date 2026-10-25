<script setup lang="ts">
/**
 * 纯无状态基础底栏容器组件。
 *
 * 核心特性：
 * 1. 弹性底栏排版，默认高度 48px；
 * 2. 支持自定义高度、背景色与语义化 HTML 根标签；
 * 3. 规范 .at-footer 独立命名空间与 scoped 样式隔离。
 *
 * @author Ateng
 * @since 2026-10-25
 */

import { ref, computed } from 'vue';
import type { AtengFooterProps, AtengFooterSlots } from './types';

defineOptions({
  name: 'AtengFooter',
});

defineSlots<AtengFooterSlots>();

const props = withDefaults(defineProps<AtengFooterProps>(), {
  height: '48px',
  background: undefined,
  tag: 'footer',
});

const footerRef = ref<HTMLElement | null>(null);

const footerStyle = computed(() => {
  const h = typeof props.height === 'number' ? `${props.height}px` : props.height;
  return {
    height: h,
    backgroundColor: props.background,
  };
});

defineExpose({
  footerRef,
});
</script>

<template>
  <component :is="tag" ref="footerRef" class="at-footer" :style="footerStyle">
    <slot />
  </component>
</template>

<style scoped>
.at-footer {
  flex: 0 0 auto;
  box-sizing: border-box;
  background-color: var(--el-bg-color);
  border-top: 1px solid var(--el-border-color-lighter);
}
</style>
