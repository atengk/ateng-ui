<script setup lang="ts">
/**
 * 纯无状态基础顶栏容器组件。
 *
 * 核心特性：
 * 1. 弹性顶栏排版，默认高度 64px；
 * 2. 支持自定义高度、背景色与语义化 HTML 根标签；
 * 3. 规范 .at-header 独立命名空间与 scoped 样式隔离。
 *
 * @author Ateng
 * @since 2026-10-25
 */

import { ref, computed } from 'vue';
import type { AtengHeaderProps, AtengHeaderSlots } from './types';

defineOptions({
  name: 'AtengHeader',
});

defineSlots<AtengHeaderSlots>();

const props = withDefaults(defineProps<AtengHeaderProps>(), {
  height: '64px',
  background: undefined,
  tag: 'header',
});

const headerRef = ref<HTMLElement | null>(null);

const headerStyle = computed(() => {
  const h = typeof props.height === 'number' ? `${props.height}px` : props.height;
  return {
    height: h,
    backgroundColor: props.background,
  };
});

defineExpose({
  headerRef,
});
</script>

<template>
  <component :is="tag" ref="headerRef" class="at-header" :style="headerStyle">
    <slot />
  </component>
</template>

<style scoped>
.at-header {
  flex: 0 0 auto;
  box-sizing: border-box;
  background-color: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-lighter);
}
</style>
