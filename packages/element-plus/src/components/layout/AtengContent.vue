<script setup lang="ts">
/**
 * 纯无状态基础内容主容器组件。
 *
 * 核心特性：
 * 1. 弹性主体内容排版，天然 flex: 1 1 auto 自动撑满；
 * 2. 支持自定义背景色与语义化 HTML 根标签；
 * 3. 规范 .at-content 独立命名空间与 scoped 样式隔离。
 *
 * @author Ateng
 * @since 2026-10-25
 */

import { ref, computed } from 'vue';
import type { AtengContentProps, AtengContentSlots } from './types';

defineOptions({
  name: 'AtengContent',
});

defineSlots<AtengContentSlots>();

const props = withDefaults(defineProps<AtengContentProps>(), {
  background: undefined,
  tag: 'main',
});

const contentRef = ref<HTMLElement | null>(null);

const contentStyle = computed(() => {
  return {
    backgroundColor: props.background,
  };
});

defineExpose({
  contentRef,
});
</script>

<template>
  <component :is="tag" ref="contentRef" class="at-content" :style="contentStyle">
    <slot />
  </component>
</template>

<style scoped>
.at-content {
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  box-sizing: border-box;
}
</style>
