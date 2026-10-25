<script setup lang="ts">
/**
 * 纯无状态基础弹性布局容器组件。
 *
 * 核心特性：
 * 1. 纯 CSS/Flex 驱动，零外部业务状态依赖；
 * 2. 运行时自动识别子插槽包含 AtengAside 切换为横向排版（.has-aside）；
 * 3. 显式 direction 属性作为最高优先级逃生门；
 * 4. 树形无环单向流动，规范 .at-layout 独立命名空间。
 *
 * @author Ateng
 * @since 2026-10-25
 */

import { ref, computed, provide, useSlots, type VNode, type Component } from 'vue';
import { type AtengLayoutProps, type AtengLayoutSlots, ATENG_LAYOUT_INJECTION_KEY } from './types';

defineOptions({
  name: 'AtengLayout',
});

defineSlots<AtengLayoutSlots>();

const props = withDefaults(defineProps<AtengLayoutProps>(), {
  direction: undefined,
  hasAside: false,
  tag: 'section',
});

const layoutRef = ref<HTMLElement | null>(null);
const asideCount = ref(0);
const slots = useSlots();

// 1. 提供 Aside 注册总线
provide(ATENG_LAYOUT_INJECTION_KEY, {
  registerAside: () => {
    asideCount.value++;
    return () => {
      asideCount.value--;
    };
  },
});

// 2. 递归探查 VNode 是否包含 AtengAside
function hasAsideComponent(vnodes: VNode[] | undefined): boolean {
  if (!vnodes || !Array.isArray(vnodes)) {
    return false;
  }
  for (const vnode of vnodes) {
    if (!vnode) {
      continue;
    }
    if (typeof vnode.type === 'object' && vnode.type !== null) {
      const comp = vnode.type as Component & { name?: string };
      if (comp.name === 'AtengAside' || comp.name === 'AtAside') {
        return true;
      }
    }
    // 处理 Fragment
    if (typeof vnode.type === 'symbol' && Array.isArray(vnode.children)) {
      if (hasAsideComponent(vnode.children as VNode[])) {
        return true;
      }
    }
  }
  return false;
}

const hasAsideInSlots = computed(() => {
  if (!slots.default) {
    return false;
  }
  return hasAsideComponent(slots.default());
});

// 3. 计算排版方向
const isHorizontal = computed(() => {
  if (props.direction) {
    return props.direction === 'horizontal';
  }
  if (props.hasAside) {
    return true;
  }
  return asideCount.value > 0 || hasAsideInSlots.value;
});

const layoutStyle = computed(() => {
  if (props.direction === 'vertical') {
    return { flexDirection: 'column' as const };
  }
  if (props.direction === 'horizontal') {
    return { flexDirection: 'row' as const };
  }
  return undefined;
});

defineExpose({
  layoutRef,
  isHorizontal,
});
</script>

<template>
  <component
    :is="tag"
    ref="layoutRef"
    class="at-layout"
    :class="{ 'has-aside': isHorizontal }"
    :style="layoutStyle"
  >
    <slot />
  </component>
</template>

<style scoped>
.at-layout {
  display: flex;
  flex-direction: column;
  flex: auto;
  box-sizing: border-box;
  min-height: 0;
  min-width: 0;
  background-color: var(--el-bg-color-page);
}

.at-layout.has-aside {
  flex-direction: row;
}
</style>
