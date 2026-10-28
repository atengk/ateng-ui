<script setup lang="ts">
/**
 * 流程运行态流转追踪器微型控制条子组件。
 *
 * 依据 ADR-0033 与工单 #169，提供右下角微型视口缩放、适应画布与待办聚焦快捷操作。
 *
 * @author Ateng
 * @since 2026-10-27
 */

defineOptions({
  name: 'AtengFlowMiniControls',
});

const emit = defineEmits<{
  (e: 'zoom-in'): void;
  (e: 'zoom-out'): void;
  (e: 'fit-view'): void;
  (e: 'reset-zoom'): void;
  (e: 'focus-active'): void;
}>();
</script>

<template>
  <div class="at-flow-mini-toolbar">
    <button class="at-flow-mini-btn" title="放大" type="button" @click="emit('zoom-in')">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
      </svg>
    </button>
    <button class="at-flow-mini-btn" title="缩小" type="button" @click="emit('zoom-out')">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
        <path d="M19 13H5v-2h14v2z" />
      </svg>
    </button>
    <button class="at-flow-mini-btn" title="适应画布" type="button" @click="emit('fit-view')">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
        <path
          d="M15 3l2.3 2.3-2.89 2.87 1.42 1.42L18.7 6.7 21 9V3h-6zM3 9l2.3-2.3 2.87 2.89 1.42-1.42L6.7 5.3 9 3H3v6zm6 12l-2.3-2.3 2.89-2.87-1.42-1.42L5.3 17.3 3 15v6h6zm12-6l-2.3 2.3-2.87-2.89-1.42 1.42 2.89 2.87L15 21h6v-6z"
        />
      </svg>
    </button>
    <button class="at-flow-mini-btn" title="还原 1:1" type="button" @click="emit('reset-zoom')">
      <span class="at-flow-mini-btn__ratio">1:1</span>
    </button>
    <button
      class="at-flow-mini-btn at-flow-mini-btn--focus"
      title="定位当前待办"
      type="button"
      @click="emit('focus-active')"
    >
      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
        <path
          d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"
        />
      </svg>
    </button>
  </div>
</template>

<style scoped>
/* 微型视口控制浮动工具条 */
.at-flow-mini-toolbar {
  position: absolute;
  right: 16px;
  bottom: 16px;
  display: flex;
  align-items: center;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -2px rgba(0, 0, 0, 0.1);
  padding: 3px;
  gap: 2px;
  z-index: 50;
}

.at-flow-mini-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: #475569;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
  padding: 0;
}

.at-flow-mini-btn:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.at-flow-mini-btn__ratio {
  font-size: 11px;
  font-weight: 600;
}

.at-flow-mini-btn--focus {
  color: #2563eb;
}

.at-flow-mini-btn--focus:hover {
  background: #eff6ff;
  color: #1d4ed8;
}
</style>
