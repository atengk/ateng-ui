<script setup lang="ts">
/**
 * AtengFlowToolbar 流程设计器顶部操作控制栏。
 *
 * 集成视口缩放控制、撤销重做历史动作、自动分层排版、背景网格、鹰眼小地图与清空防误触二次确认。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import { ref } from 'vue';
import type {
  LayoutDirection,
  AtengFlowToolbarProps,
  AtengFlowToolbarEmits,
  AtengFlowToolbarSlots,
  AtengFlowToolbarExpose,
} from '../types';

defineOptions({
  name: 'AtengFlowToolbar',
});

const props = withDefaults(defineProps<AtengFlowToolbarProps>(), {
  lf: null,
  canUndo: false,
  canRedo: false,
  disabled: false,
  showZoom: true,
  showHistory: true,
  showLayout: true,
  showGridToggle: true,
  showMiniMap: true,
  showClear: true,
});

const emit = defineEmits<AtengFlowToolbarEmits>();
defineSlots<AtengFlowToolbarSlots>();

const isGridVisible = ref(true);
const isMiniMapVisible = ref(false);
const isConfirmClearVisible = ref(false);
const isLayoutMenuOpen = ref(false);

const handleZoomIn = () => emit('zoom-in');
const handleZoomOut = () => emit('zoom-out');
const handleResetZoom = () => emit('reset-zoom');
const handleFitView = () => emit('fit-view');

const handleUndo = () => {
  if (props.canUndo && !props.disabled) {
    emit('undo');
  }
};

const handleRedo = () => {
  if (props.canRedo && !props.disabled) {
    emit('redo');
  }
};

const handleToggleGrid = () => {
  isGridVisible.value = !isGridVisible.value;
  emit('toggle-grid', isGridVisible.value);
};

const handleToggleMiniMap = () => {
  isMiniMapVisible.value = !isMiniMapVisible.value;
  emit('toggle-minimap', isMiniMapVisible.value);
};

const handleLayout = (direction: LayoutDirection) => {
  isLayoutMenuOpen.value = false;
  emit('layout', direction);
};

const handleOpenClearConfirm = () => {
  if (!props.disabled) {
    isConfirmClearVisible.value = true;
  }
};

const handleConfirmClear = () => {
  isConfirmClearVisible.value = false;
  emit('clear');
};

const handleCancelClear = () => {
  isConfirmClearVisible.value = false;
};

defineExpose<AtengFlowToolbarExpose>({
  getIsGridVisible: () => isGridVisible.value,
  getIsMiniMapVisible: () => isMiniMapVisible.value,
});
</script>

<template>
  <div class="at-flow-toolbar" :class="{ 'is-disabled': disabled }">
    <!-- 左侧自定义插槽 -->
    <div class="at-flow-toolbar__left">
      <slot name="left" :lf="lf" />
    </div>

    <!-- 中间主工具栏区 -->
    <div class="at-flow-toolbar__main">
      <slot :lf="lf">
        <!-- 历史栈操作：撤销与重做 -->
        <div v-if="showHistory" class="at-flow-toolbar__group">
          <button
            type="button"
            class="at-flow-toolbar__btn"
            :disabled="!canUndo || disabled"
            title="撤销 (Ctrl+Z)"
            aria-label="撤销"
            @click="handleUndo"
          >
            <svg
              viewBox="0 0 24 24"
              class="at-flow-icon"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M3 10h10a5 5 0 0 1 5 5v2m-15-7l4-4m-4 4l4 4"
              />
            </svg>
            <span class="at-flow-toolbar__text">撤销</span>
          </button>

          <button
            type="button"
            class="at-flow-toolbar__btn"
            :disabled="!canRedo || disabled"
            title="重做 (Ctrl+Y / Ctrl+Shift+Z)"
            aria-label="重做"
            @click="handleRedo"
          >
            <svg
              viewBox="0 0 24 24"
              class="at-flow-icon"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M21 10H11a5 5 0 0 0-5 5v2m15-7l-4-4m4 4l-4 4"
              />
            </svg>
            <span class="at-flow-toolbar__text">重做</span>
          </button>
        </div>

        <div v-if="showHistory && showZoom" class="at-flow-toolbar__divider" />

        <!-- 视口缩放控制 -->
        <div v-if="showZoom" class="at-flow-toolbar__group">
          <button
            type="button"
            class="at-flow-toolbar__btn"
            :disabled="disabled"
            title="放大画布"
            aria-label="放大"
            @click="handleZoomIn"
          >
            <svg
              viewBox="0 0 24 24"
              class="at-flow-icon"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="11" y1="8" x2="11" y2="14" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </button>

          <button
            type="button"
            class="at-flow-toolbar__btn"
            :disabled="disabled"
            title="缩小画布"
            aria-label="缩小"
            @click="handleZoomOut"
          >
            <svg
              viewBox="0 0 24 24"
              class="at-flow-icon"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </button>

          <button
            type="button"
            class="at-flow-toolbar__btn"
            :disabled="disabled"
            title="1:1 实际比例"
            aria-label="实际比例"
            @click="handleResetZoom"
          >
            <span class="at-flow-toolbar__text">1:1</span>
          </button>

          <button
            type="button"
            class="at-flow-toolbar__btn"
            :disabled="disabled"
            title="自适应居中视口"
            aria-label="居中"
            @click="handleFitView"
          >
            <svg
              viewBox="0 0 24 24"
              class="at-flow-icon"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"
              />
            </svg>
            <span class="at-flow-toolbar__text">居中</span>
          </button>
        </div>

        <div
          v-if="(showZoom || showHistory) && (showLayout || showGridToggle || showMiniMap)"
          class="at-flow-toolbar__divider"
        />

        <!-- 自动排版 -->
        <div v-if="showLayout" class="at-flow-toolbar__group at-flow-toolbar__layout-wrap">
          <button
            type="button"
            class="at-flow-toolbar__btn"
            :disabled="disabled"
            title="从左到右水平自动排版 (LR)"
            @click="handleLayout('LR')"
          >
            <svg
              viewBox="0 0 24 24"
              class="at-flow-icon"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <rect x="3" y="8" width="6" height="8" rx="1" />
              <rect x="15" y="4" width="6" height="6" rx="1" />
              <rect x="15" y="14" width="6" height="6" rx="1" />
              <line x1="9" y1="12" x2="15" y2="7" />
              <line x1="9" y1="12" x2="15" y2="17" />
            </svg>
            <span class="at-flow-toolbar__text">水平整理</span>
          </button>

          <button
            type="button"
            class="at-flow-toolbar__btn"
            :disabled="disabled"
            title="从上到下垂直自动排版 (TB)"
            @click="handleLayout('TB')"
          >
            <svg
              viewBox="0 0 24 24"
              class="at-flow-icon"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <rect x="8" y="3" width="8" height="6" rx="1" />
              <rect x="4" y="15" width="6" height="6" rx="1" />
              <rect x="14" y="15" width="6" height="6" rx="1" />
              <line x1="12" y1="9" x2="7" y2="15" />
              <line x1="12" y1="9" x2="17" y2="15" />
            </svg>
            <span class="at-flow-toolbar__text">垂直整理</span>
          </button>
        </div>

        <div
          v-if="showLayout && (showGridToggle || showMiniMap || showClear)"
          class="at-flow-toolbar__divider"
        />

        <!-- 辅助工具：网格切换与小地图 -->
        <div class="at-flow-toolbar__group">
          <button
            v-if="showGridToggle"
            type="button"
            class="at-flow-toolbar__btn"
            :class="{ 'is-active': isGridVisible }"
            :disabled="disabled"
            title="切换背景对齐网格"
            @click="handleToggleGrid"
          >
            <svg
              viewBox="0 0 24 24"
              class="at-flow-icon"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="3" y1="15" x2="21" y2="15" />
              <line x1="9" y1="3" x2="9" y2="21" />
              <line x1="15" y1="3" x2="15" y2="21" />
            </svg>
            <span class="at-flow-toolbar__text">网格</span>
          </button>

          <button
            v-if="showMiniMap"
            type="button"
            class="at-flow-toolbar__btn"
            :class="{ 'is-active': isMiniMapVisible }"
            :disabled="disabled"
            title="展开/折叠鹰眼缩略小地图"
            @click="handleToggleMiniMap"
          >
            <svg
              viewBox="0 0 24 24"
              class="at-flow-icon"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
              <line x1="8" y1="2" x2="8" y2="18" />
              <line x1="16" y1="6" x2="16" y2="22" />
            </svg>
            <span class="at-flow-toolbar__text">小地图</span>
          </button>
        </div>

        <div v-if="showClear" class="at-flow-toolbar__divider" />

        <!-- 清空画布（带防误触确认） -->
        <div v-if="showClear" class="at-flow-toolbar__group at-flow-toolbar__clear-wrap">
          <button
            type="button"
            class="at-flow-toolbar__btn at-flow-toolbar__btn--danger"
            :disabled="disabled"
            title="清空画布所有图元"
            @click="handleOpenClearConfirm"
          >
            <svg
              viewBox="0 0 24 24"
              class="at-flow-icon"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polyline points="3 6 5 6 21 6" />
              <path
                d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
              />
            </svg>
            <span class="at-flow-toolbar__text">清空</span>
          </button>

          <!-- 防误触气泡确认弹窗 -->
          <Transition name="fade">
            <div v-if="isConfirmClearVisible" class="at-flow-toolbar__popover">
              <div class="at-flow-toolbar__popover-content">
                <span class="at-flow-toolbar__popover-title">⚠️ 确认清空画布？</span>
                <p class="at-flow-toolbar__popover-desc">
                  清空后画布上的所有节点和连线将被删除，此操作不可逆。
                </p>
                <div class="at-flow-toolbar__popover-actions">
                  <button
                    type="button"
                    class="at-flow-toolbar__popover-btn"
                    @click="handleCancelClear"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    class="at-flow-toolbar__popover-btn is-danger"
                    @click="handleConfirmClear"
                  >
                    确定清空
                  </button>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </slot>
    </div>

    <!-- 右侧扩展插槽 -->
    <div class="at-flow-toolbar__right">
      <slot name="extra" :lf="lf" />
    </div>
  </div>
</template>

<style scoped>
.at-flow-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 42px;
  padding: 0 12px;
  box-sizing: border-box;
  background-color: var(--at-flow-bg, #ffffff);
  border-bottom: 1px solid var(--at-flow-border, #e2e8f0);
  user-select: none;
  font-family: var(
    --at-flow-font-family,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    sans-serif
  );
}

.at-flow-toolbar.is-disabled {
  opacity: 0.6;
  pointer-events: none;
}

.at-flow-toolbar__left,
.at-flow-toolbar__right,
.at-flow-toolbar__main {
  display: flex;
  align-items: center;
  gap: 4px;
}

.at-flow-toolbar__group {
  display: flex;
  align-items: center;
  gap: 2px;
  position: relative;
}

.at-flow-toolbar__btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 8px;
  border-radius: 4px;
  border: 1px solid transparent;
  background: transparent;
  color: #334155;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.at-flow-toolbar__btn:hover:not(:disabled) {
  background-color: #f1f5f9;
  color: #0f172a;
}

.at-flow-toolbar__btn.is-active {
  background-color: #e0f2fe;
  color: #0284c7;
  border-color: #bae6fd;
}

.at-flow-toolbar__btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.at-flow-toolbar__btn--danger:hover:not(:disabled) {
  background-color: #fee2e2;
  color: #dc2626;
}

.at-flow-icon {
  width: 14px;
  height: 14px;
}

.at-flow-toolbar__divider {
  width: 1px;
  height: 18px;
  background-color: var(--at-flow-border, #e2e8f0);
  margin: 0 4px;
}

.at-flow-toolbar__clear-wrap {
  position: relative;
}

/* 防误触确认弹窗 */
.at-flow-toolbar__popover {
  position: absolute;
  top: 36px;
  right: 0;
  z-index: 100;
  width: 220px;
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  box-shadow:
    0 10px 15px -3px rgba(0, 0, 0, 0.1),
    0 4px 6px -2px rgba(0, 0, 0, 0.05);
  padding: 12px;
}

.at-flow-toolbar__popover-title {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 4px;
}

.at-flow-toolbar__popover-desc {
  margin: 0 0 10px;
  font-size: 11px;
  color: #64748b;
  line-height: 1.4;
}

.at-flow-toolbar__popover-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.at-flow-toolbar__popover-btn {
  padding: 4px 10px;
  font-size: 11px;
  border-radius: 4px;
  border: 1px solid #cbd5e1;
  background-color: #ffffff;
  color: #334155;
  cursor: pointer;
  transition: all 0.15s;
}

.at-flow-toolbar__popover-btn:hover {
  background-color: #f8fafc;
}

.at-flow-toolbar__popover-btn.is-danger {
  background-color: #ef4444;
  border-color: #dc2626;
  color: #ffffff;
}

.at-flow-toolbar__popover-btn.is-danger:hover {
  background-color: #dc2626;
}

.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
