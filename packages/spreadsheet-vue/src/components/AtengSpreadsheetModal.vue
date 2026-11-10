<script setup lang="ts">
/**
 * AtengSpreadsheetModal 脱壳全功能模态弹窗组件。
 *
 * 遵循 ADR-0002、ADR-0009、ADR-0021 与 ADR-0049 规约：
 * 1. 采用原生 Vue 3 <Teleport to="body"> 驱动，100% 物理脱耦 Element Plus 等第三方 UI 库；
 * 2. 支持 v-model:visible 声明式控制显隐，提供 Esc 键盘监听与遮罩层关闭安全防线；
 * 3. 内置全屏最大化/还原无损切换，结合 SpreadsheetResizeGuard 自愈 0x0 视口；
 * 4. 内置确认/取消动作栏与数据回传，支持 #trigger、#header 与 #footer 自定义插槽反转；
 * 5. 确定性生命周期：组件卸载与弹窗关闭时 100% 注销全局键盘事件监听。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { ref, computed, watch, nextTick, onBeforeUnmount, useSlots } from 'vue';
import type {
  SpreadsheetModalProps,
  SpreadsheetModalEmits,
  SpreadsheetSnapshot,
  SpreadsheetRecord,
  SpreadsheetRange,
  SpreadsheetProps,
} from '../types';
import AtengSpreadsheet from './AtengSpreadsheet.vue';
import '../styles/index.css';

const props = withDefaults(defineProps<SpreadsheetModalProps>(), {
  visible: false,
  title: '电子表格',
  modalWidth: '90vw',
  modalHeight: '85vh',
  fullscreen: false,
  showFullscreenToggle: true,
  confirmText: '确定',
  cancelText: '取消',
  // 透传表格默认值
  snapshot: undefined,
  data: undefined,
  columns: undefined,
  mode: 'full',
  showToolbar: undefined,
  showFormulaBar: true,
  showSheetBar: true,
  readOnly: undefined,
  theme: 'auto',
  locale: 'zh-CN',
  worker: false,
  height: '100%',
  width: '100%',
  debounceWait: 200,
});

const emit = defineEmits<SpreadsheetModalEmits>();
const slots = useSlots();

const isFullscreen = ref(props.fullscreen);
const spreadsheetRef = ref<InstanceType<typeof AtengSpreadsheet> | null>(null);

// 计算非全屏时的尺寸样式
const modalStyle = computed(() => {
  if (isFullscreen.value) {
    return {};
  }
  return {
    width: typeof props.modalWidth === 'number' ? `${props.modalWidth}px` : props.modalWidth,
    height: typeof props.modalHeight === 'number' ? `${props.modalHeight}px` : props.modalHeight,
  };
});

// 计算需要透传给内部 AtengSpreadsheet 的 Props
const spreadsheetProps = computed<SpreadsheetProps>(() => ({
  snapshot: props.snapshot,
  data: props.data,
  columns: props.columns,
  mode: props.mode,
  showToolbar: props.showToolbar,
  showFormulaBar: props.showFormulaBar,
  showSheetBar: props.showSheetBar,
  readOnly: props.readOnly,
  theme: props.theme,
  locale: props.locale,
  worker: props.worker,
  height: '100%',
  width: '100%',
  debounceWait: props.debounceWait,
}));

/**
 * 触发自愈重绘。
 */
const triggerResize = (): void => {
  nextTick(() => {
    spreadsheetRef.value?.resize();
  });
};

/**
 * 切换全屏模式。
 */
const toggleFullscreen = (): void => {
  isFullscreen.value = !isFullscreen.value;
  triggerResize();
};

/**
 * 更新可见状态。
 */
const updateVisible = (val: boolean): void => {
  emit('update:visible', val);
};

/**
 * 处理遮罩层点击。
 */
const handleMaskClick = (): void => {
  handleCancel();
};

/**
 * 处理取消。
 */
const handleCancel = (): void => {
  emit('cancel');
  updateVisible(false);
};

/**
 * 处理确认保存与数据回传。
 */
const handleConfirm = (): void => {
  const latestSnapshot = spreadsheetRef.value?.getSnapshot() ?? ({} as SpreadsheetSnapshot);
  const latestData = spreadsheetRef.value?.getData() ?? [];

  emit('confirm', {
    snapshot: latestSnapshot,
    data: latestData,
  });

  updateVisible(false);
};

/**
 * 键盘 Escape 事件处理器。
 */
const handleKeyDown = (e: KeyboardEvent): void => {
  if (e.key === 'Escape' && props.visible) {
    handleCancel();
  }
};

// 监听弹窗显示状态变动，绑定与解除全局键盘监听，并触发尺寸自愈
watch(
  () => props.visible,
  visible => {
    if (visible) {
      triggerResize();
      if (typeof window !== 'undefined') {
        window.addEventListener('keydown', handleKeyDown);
      }
    } else {
      if (typeof window !== 'undefined') {
        window.removeEventListener('keydown', handleKeyDown);
      }
    }
  },
  { immediate: true },
);

// 监听全屏 prop 变更
watch(
  () => props.fullscreen,
  val => {
    isFullscreen.value = val;
    triggerResize();
  },
);

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleKeyDown);
  }
});

// 显式暴露实例方法
defineExpose({
  open: () => updateVisible(true),
  close: () => updateVisible(false),
  toggleFullscreen,
  isFullscreen,
  getSpreadsheetInstance: () => spreadsheetRef.value,
  getSnapshot: () => spreadsheetRef.value?.getSnapshot() ?? null,
  setSnapshot: (snapshot: SpreadsheetSnapshot) => spreadsheetRef.value?.setSnapshot(snapshot),
  getData: () => spreadsheetRef.value?.getData() ?? [],
  setData: (data: SpreadsheetRecord[]) => spreadsheetRef.value?.setData(data),
  exportCsv: (filename?: string) => spreadsheetRef.value?.exportCsv(filename),
  exportJson: (filename?: string) => spreadsheetRef.value?.exportJson(filename),
  resize: () => spreadsheetRef.value?.resize(),
});
</script>

<template>
  <!-- 唤起触发插槽 -->
  <slot v-if="$slots.trigger" name="trigger" :open="() => updateVisible(true)" />

  <!-- 脱壳模态弹窗主层 -->
  <Teleport to="body">
    <div
      v-if="visible"
      class="at-spreadsheet-modal-mask"
      role="dialog"
      aria-modal="true"
      @click.self="handleMaskClick"
    >
      <div
        class="at-spreadsheet-modal"
        :class="{ 'at-spreadsheet-modal--fullscreen': isFullscreen }"
        :style="modalStyle"
      >
        <!-- 弹窗顶栏 -->
        <div class="at-spreadsheet-modal__header">
          <slot name="header">
            <span class="at-spreadsheet-modal__title">{{ title }}</span>
          </slot>

          <div class="at-spreadsheet-modal__controls">
            <!-- 全屏切换按钮 -->
            <button
              v-if="showFullscreenToggle"
              class="at-spreadsheet-modal__btn-icon"
              type="button"
              :title="isFullscreen ? '还原' : '最大化'"
              @click="toggleFullscreen"
            >
              <svg
                v-if="!isFullscreen"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path
                  d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"
                />
              </svg>
              <svg
                v-else
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path
                  d="M4 14h6m0 0v6m0-6L3 21m17-11h-6m0 0V4m0 6l7-7M14 10V4m0 6h6M3 3l7 7M21 21l-7-7"
                />
              </svg>
            </button>

            <!-- 关闭按钮 -->
            <button
              class="at-spreadsheet-modal__btn-icon"
              type="button"
              title="关闭"
              @click="handleCancel"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        <!-- 弹窗内部表格容器 -->
        <div class="at-spreadsheet-modal__body">
          <AtengSpreadsheet
            ref="spreadsheetRef"
            v-bind="spreadsheetProps"
            @update:snapshot="val => emit('update:snapshot', val)"
            @update:data="val => emit('update:data', val)"
            @change="val => emit('change', val)"
            @ready="api => emit('ready', api)"
            @selection-change="(range: SpreadsheetRange | null) => emit('selection-change', range)"
            @sheet-activate="(id: string) => emit('sheet-activate', id)"
          >
            <!-- 转发内部可能存在的插槽 -->
            <template v-if="slots['table-header']" #header>
              <slot name="table-header" />
            </template>
            <template v-if="slots['table-extra']" #extra>
              <slot name="table-extra" />
            </template>
          </AtengSpreadsheet>
        </div>

        <!-- 弹窗底栏动作区 -->
        <div class="at-spreadsheet-modal__footer">
          <slot
            name="footer"
            :confirm="handleConfirm"
            :cancel="handleCancel"
            :is-dirty="spreadsheetRef?.isDirty ?? false"
          >
            <button
              class="at-spreadsheet-btn at-spreadsheet-btn--default"
              type="button"
              @click="handleCancel"
            >
              {{ cancelText }}
            </button>
            <button
              class="at-spreadsheet-btn at-spreadsheet-btn--primary"
              type="button"
              @click="handleConfirm"
            >
              {{ confirmText }}
            </button>
          </slot>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.at-spreadsheet-modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}
</style>
