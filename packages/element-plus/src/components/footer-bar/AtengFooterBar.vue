<script setup lang="ts">
/**
 * 企业级吸底操作栏组件。
 *
 * 核心特性：
 * 1. 支持 sticky（局部容器粘滞吸底）与 fixed（全局视口悬浮吸底）双模；
 * 2. fixed 模式标配自动 placeholder 等高透明占位垫块，彻底杜绝底部字段被遮挡；
 * 3. 规范左侧辅助状态（#extra）与右侧操作按钮（#default）双向排版；
 * 4. 支持 leftOffset 侧边栏动态避让偏移与设计令牌暗黑模式适配。
 *
 * @author Ateng
 * @since 2026-10-22
 */

import { ref, computed } from 'vue';
import type { AtengFooterBarProps } from './types';

defineOptions({
  name: 'AtengFooterBar',
});

const props = withDefaults(defineProps<AtengFooterBarProps>(), {
  position: 'sticky',
  placeholder: true,
  height: 56,
  zIndex: 99,
  bordered: true,
  leftOffset: 'auto',
});

const barRef = ref<HTMLElement | null>(null);

// 计算高度样式
const normalizedHeight = computed(() => {
  return typeof props.height === 'number' ? `${props.height}px` : props.height;
});

// 计算 fixed 样式
const fixedStyles = computed(() => {
  if (props.position !== 'fixed') {
    return {
      height: normalizedHeight.value,
      zIndex: props.zIndex,
    };
  }

  const styles: Record<string, string | number> = {
    height: normalizedHeight.value,
    zIndex: props.zIndex,
    position: 'fixed',
    bottom: 0,
    right: 0,
  };

  if (props.leftOffset !== 'auto') {
    styles.left = typeof props.leftOffset === 'number' ? `${props.leftOffset}px` : props.leftOffset;
  } else {
    styles.left = 0;
  }

  return styles;
});

defineExpose({
  barRef,
});
</script>

<template>
  <!-- 占位垫块（仅在 fixed 模式且开启 placeholder 时渲染，防止内容被遮挡） -->
  <div
    v-if="position === 'fixed' && placeholder"
    class="at-footer-bar__placeholder"
    :style="{ height: normalizedHeight }"
    aria-hidden="true"
  />

  <!-- 操作栏本体 -->
  <footer
    ref="barRef"
    class="at-footer-bar"
    :class="[
      `is-${position}`,
      {
        'is-bordered': bordered,
      },
    ]"
    :style="fixedStyles"
  >
    <div class="at-footer-bar__inner">
      <!-- 左侧辅助信息与统计区 -->
      <div class="at-footer-bar__extra">
        <slot name="extra" />
      </div>

      <!-- 右侧主要操作按钮区 -->
      <div class="at-footer-bar__actions">
        <slot />
      </div>
    </div>
  </footer>
</template>

<style scoped>
.at-footer-bar__placeholder {
  width: 100%;
  pointer-events: none;
  visibility: hidden;
}

.at-footer-bar {
  width: 100%;
  box-sizing: border-box;
  background-color: var(--el-bg-color);
  color: var(--el-text-color-primary);
  box-shadow: var(--el-box-shadow-lighter);
  transition:
    background-color 0.25s,
    border-color 0.25s;
}

.at-footer-bar.is-sticky {
  position: sticky;
  bottom: 0;
}

.at-footer-bar.is-bordered {
  border-top: 1px solid var(--el-border-color-lighter);
}

.at-footer-bar__inner {
  height: 100%;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  box-sizing: border-box;
}

.at-footer-bar__extra {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.at-footer-bar__actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
}
</style>
