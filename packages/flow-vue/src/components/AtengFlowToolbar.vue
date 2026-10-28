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
import AtengFlowToolbarIcon from './AtengFlowToolbarIcon.vue';
import AtengFlowClearConfirm from './AtengFlowClearConfirm.vue';
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
  showValidate: true,
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
            <AtengFlowToolbarIcon name="undo" />
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
            <AtengFlowToolbarIcon name="redo" />
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
            <AtengFlowToolbarIcon name="zoom-in" />
          </button>

          <button
            type="button"
            class="at-flow-toolbar__btn"
            :disabled="disabled"
            title="缩小画布"
            aria-label="缩小"
            @click="handleZoomOut"
          >
            <AtengFlowToolbarIcon name="zoom-out" />
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
            <AtengFlowToolbarIcon name="fit-view" />
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
            <AtengFlowToolbarIcon name="layout-lr" />
            <span class="at-flow-toolbar__text">水平整理</span>
          </button>

          <button
            type="button"
            class="at-flow-toolbar__btn"
            :disabled="disabled"
            title="从上到下垂直自动排版 (TB)"
            @click="handleLayout('TB')"
          >
            <AtengFlowToolbarIcon name="layout-tb" />
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
            <AtengFlowToolbarIcon name="grid" />
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
            <AtengFlowToolbarIcon name="minimap" />
            <span class="at-flow-toolbar__text">小地图</span>
          </button>
        </div>

        <div v-if="showValidate" class="at-flow-toolbar__divider" />

        <!-- 流程拓扑静态校验 -->
        <div v-if="showValidate" class="at-flow-toolbar__group">
          <button
            type="button"
            class="at-flow-toolbar__btn at-flow-toolbar__btn--validate"
            :disabled="disabled"
            title="校验流程拓扑静态规则与错误高亮"
            aria-label="校验拓扑"
            @click="emit('validate')"
          >
            <AtengFlowToolbarIcon name="validate" />
            <span class="at-flow-toolbar__text">校验</span>
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
            <AtengFlowToolbarIcon name="clear" />
            <span class="at-flow-toolbar__text">清空</span>
          </button>

          <!-- 防误触气泡确认弹窗 -->
          <AtengFlowClearConfirm
            :visible="isConfirmClearVisible"
            @confirm="handleConfirmClear"
            @cancel="handleCancelClear"
          />
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
</style>
