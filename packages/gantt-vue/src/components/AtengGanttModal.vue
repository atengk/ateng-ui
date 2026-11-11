<script setup lang="ts">
/**
 * AtengGanttModal 原生脱壳模态弹窗组件。
 *
 * 遵循 ADR-0002、ADR-0009、ADR-0021 与 ADR-0050，
 * 使用原生 Vue 3 <Teleport to="body"> 渲染，彻底解耦第三方 UI 库，
 * 内置真全屏模式切换、视口自愈、遮罩与动画过渡、Design Tokens 驱动与对称方法门面暴露。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';
import AtengGantt from './AtengGantt.vue';
import type {
  GanttTaskRecord,
  GanttScale,
  GanttMode,
  GanttChangeType,
  GanttDependencyLink,
  GanttExportOptions,
  GanttValidationResult,
  AtengGanttModalProps,
} from '../types';
import type { Gantt } from '@visactor/vtable-gantt';

defineOptions({
  name: 'AtengGanttModal',
});

const props = withDefaults(defineProps<AtengGanttModalProps>(), {
  modelValue: false,
  title: '排程甘特图',
  width: '90%',
  height: '80vh',
  fullscreen: false,
  teleportTo: 'body',
  closeOnClickModal: true,
  closeOnPressEscape: true,
  showFullscreenBtn: true,
  showFooter: true,
  cancelText: '取消',
  confirmText: '保存',
  destroyOnClose: false,
  tasks: () => [],
  columns: undefined,
  scale: 'day',
  mode: 'interactive',
  splitWidth: 360,
  minSplitWidth: 200,
  maxSplitWidth: 600,
  rollup: true,
  theme: 'auto',
  showToolbar: true,
  showTodayLine: true,
  showWeekend: true,
  markLines: () => [],
  dependencies: () => [],
  vtableOptions: undefined,
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'update:fullscreen', value: boolean): void;
  (e: 'update:tasks', tasks: GanttTaskRecord[]): void;
  (e: 'update:scale', scale: GanttScale): void;
  (e: 'update:mode', mode: GanttMode): void;
  (e: 'open'): void;
  (e: 'opened'): void;
  (e: 'close'): void;
  (e: 'closed'): void;
  (e: 'cancel'): void;
  (e: 'save', tasks: GanttTaskRecord[]): void;
  (e: 'taskChange', payload: { task: GanttTaskRecord; changeType: GanttChangeType }): void;
  (e: 'taskClick', task: GanttTaskRecord, event: MouseEvent): void;
  (
    e: 'dependencyCreate',
    payload: { sourceId: string | number; targetId: string | number; type: string },
  ): void;
  (e: 'dependencyDelete', payload: { sourceId: string | number; targetId: string | number }): void;
  (
    e: 'dependencyInvalid',
    payload: { sourceId: string | number; targetId: string | number; reason: string },
  ): void;
}>();

const ganttRef = ref<InstanceType<typeof AtengGantt> | null>(null);
const internalFullscreen = ref(props.fullscreen);

watch(
  () => props.fullscreen,
  val => {
    if (val !== internalFullscreen.value) {
      internalFullscreen.value = val;
    }
  },
);

/**
 * 切换全屏模式并触发内部视口自愈。
 */
const toggleFullscreen = (): void => {
  internalFullscreen.value = !internalFullscreen.value;
  emit('update:fullscreen', internalFullscreen.value);
  nextTick(() => {
    ganttRef.value?.resize();
  });
};

/**
 * 取消并关闭弹窗。
 */
const cancel = (): void => {
  emit('cancel');
  emit('update:modelValue', false);
};

/**
 * 保存数据并关闭弹窗。
 */
const save = (): void => {
  const latestTasks = ganttRef.value?.getTasks() ?? props.tasks ?? [];
  emit('save', latestTasks);
  emit('update:tasks', latestTasks);
  emit('update:modelValue', false);
};

/**
 * 通用关闭出口。
 */
const close = (): void => {
  cancel();
};

/**
 * 遮罩层点击处理。
 */
const handleMaskClick = (): void => {
  if (props.closeOnClickModal) {
    cancel();
  }
};

/**
 * 键盘 ESC 按下监听。
 */
const onKeyDown = (event: KeyboardEvent): void => {
  if (props.closeOnPressEscape && event.key === 'Escape' && props.modelValue) {
    cancel();
  }
};

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', onKeyDown);
  }
});

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', onKeyDown);
  }
});

/**
 * 监听 modelValue 状态变化，编排视口自愈与生命周期事件。
 */
watch(
  () => props.modelValue,
  isOpen => {
    if (isOpen) {
      emit('open');
      nextTick(() => {
        ganttRef.value?.resize();
        emit('opened');
      });
    } else {
      emit('close');
      nextTick(() => {
        emit('closed');
      });
    }
  },
);

const dialogStyle = computed(() => {
  if (internalFullscreen.value) {
    return {
      width: '100vw',
      height: '100vh',
      maxWidth: '100vw',
      maxHeight: '100vh',
      borderRadius: '0',
    };
  }
  const w = typeof props.width === 'number' ? `${props.width}px` : props.width;
  const h = typeof props.height === 'number' ? `${props.height}px` : props.height;
  return {
    width: w,
    height: h,
  };
});

defineExpose({
  // 弹窗特有控制方法与状态
  open: () => emit('update:modelValue', true),
  close,
  cancel,
  save,
  toggleFullscreen,
  isFullscreen: computed(() => internalFullscreen.value),
  ganttRef,

  // 1:1 对称透传内部甘特图全部门面方法
  scrollToToday: () => ganttRef.value?.scrollToToday(),
  scrollToDate: (date: string | Date) => ganttRef.value?.scrollToDate(date),
  scrollToTask: (taskId: string | number) => ganttRef.value?.scrollToTask(taskId),
  zoomIn: () => ganttRef.value?.zoomIn(),
  zoomOut: () => ganttRef.value?.zoomOut(),
  expandAll: () => ganttRef.value?.expandAll(),
  collapseAll: () => ganttRef.value?.collapseAll(),
  setScale: (scale: GanttScale) => ganttRef.value?.setScale(scale),
  setMode: (mode: GanttMode) => ganttRef.value?.setMode(mode),
  toggleMode: () => ganttRef.value?.toggleMode(),
  setTasks: (tasks: GanttTaskRecord[]) => ganttRef.value?.setTasks(tasks),
  getTasks: (): GanttTaskRecord[] => ganttRef.value?.getTasks() ?? [],
  getTask: (taskId: string | number): GanttTaskRecord | null =>
    ganttRef.value?.getTask(taskId) ?? null,
  getDependencies: (): GanttDependencyLink[] => ganttRef.value?.getDependencies() ?? [],
  addDependency: (link: GanttDependencyLink): GanttValidationResult =>
    ganttRef.value?.addDependency(link) ?? { valid: false, reason: 'invalid_id' },
  deleteDependency: (sourceId: string | number, targetId: string | number): void =>
    ganttRef.value?.deleteDependency(sourceId, targetId),
  exportImage: (options?: GanttExportOptions): Promise<string> =>
    ganttRef.value?.exportImage(options) ?? Promise.resolve(''),
  downloadImage: (options?: GanttExportOptions): Promise<void> =>
    ganttRef.value?.downloadImage(options) ?? Promise.resolve(),
  getRawGanttInstance: (): Gantt | null => ganttRef.value?.getRawGanttInstance() ?? null,
  resize: (): void => ganttRef.value?.resize(),
  dispose: (): void => ganttRef.value?.dispose(),
  mount: (target?: HTMLElement): void => ganttRef.value?.mount(target),
});
</script>

<template>
  <Teleport :to="teleportTo">
    <Transition name="at-gantt-modal-fade">
      <div
        v-if="modelValue || !destroyOnClose"
        v-show="modelValue"
        class="at-gantt-modal"
        :class="{
          'at-gantt-modal--fullscreen': internalFullscreen,
        }"
        role="dialog"
        aria-modal="true"
      >
        <!-- 背景遮罩层 -->
        <div class="at-gantt-modal__mask" @click="handleMaskClick" />

        <!-- 弹窗主容器 -->
        <div class="at-gantt-modal__dialog" :style="dialogStyle">
          <!-- 弹窗头部 -->
          <div class="at-gantt-modal__header">
            <slot
              name="header"
              :title="title"
              :is-fullscreen="internalFullscreen"
              :toggle-fullscreen="toggleFullscreen"
              :close="close"
            >
              <div class="at-gantt-modal__title">{{ title }}</div>
              <div class="at-gantt-modal__header-actions">
                <button
                  v-if="showFullscreenBtn"
                  type="button"
                  class="at-gantt-modal__action-btn"
                  :title="internalFullscreen ? '还原窗口' : '全屏切换'"
                  @click="toggleFullscreen"
                >
                  <svg
                    v-if="!internalFullscreen"
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    stroke="currentColor"
                    stroke-width="2"
                    fill="none"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path
                      d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"
                    />
                  </svg>
                  <svg
                    v-else
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    stroke="currentColor"
                    stroke-width="2"
                    fill="none"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path
                      d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  class="at-gantt-modal__action-btn at-gantt-modal__close-btn"
                  title="关闭"
                  @click="close"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    stroke="currentColor"
                    stroke-width="2"
                    fill="none"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </slot>
          </div>

          <!-- 弹窗主体内容区 -->
          <div class="at-gantt-modal__body">
            <slot>
              <AtengGantt
                ref="ganttRef"
                :tasks="tasks"
                :columns="columns"
                :scale="scale"
                :mode="mode"
                :split-width="splitWidth"
                :min-split-width="minSplitWidth"
                :max-split-width="maxSplitWidth"
                :rollup="rollup"
                :theme="theme"
                :show-toolbar="showToolbar"
                :show-today-line="showTodayLine"
                :show-weekend="showWeekend"
                :mark-lines="markLines"
                :dependencies="dependencies"
                :vtable-options="vtableOptions"
                @update:tasks="t => emit('update:tasks', t)"
                @update:scale="s => emit('update:scale', s)"
                @update:mode="m => emit('update:mode', m)"
                @task-change="p => emit('taskChange', p)"
                @task-click="(t, e) => emit('taskClick', t, e)"
                @dependency-create="p => emit('dependencyCreate', p)"
                @dependency-delete="p => emit('dependencyDelete', p)"
                @dependency-invalid="p => emit('dependencyInvalid', p)"
              >
                <!-- 插槽完整透传 -->
                <template #toolbar="slotProps">
                  <slot name="toolbar" v-bind="slotProps" />
                </template>
                <template #toolbar-extra="slotProps">
                  <slot name="toolbar-extra" v-bind="slotProps" />
                </template>
                <template #tooltip="slotProps">
                  <slot name="tooltip" v-bind="slotProps" />
                </template>
                <template #empty>
                  <slot name="empty" />
                </template>
              </AtengGantt>
            </slot>
          </div>

          <!-- 弹窗底部操作栏 -->
          <div v-if="showFooter" class="at-gantt-modal__footer">
            <slot name="footer" :cancel="cancel" :save="save" :is-fullscreen="internalFullscreen">
              <button
                type="button"
                class="at-gantt-modal__btn at-gantt-modal__btn--default"
                @click="cancel"
              >
                {{ cancelText }}
              </button>
              <button
                type="button"
                class="at-gantt-modal__btn at-gantt-modal__btn--primary"
                @click="save"
              >
                {{ confirmText }}
              </button>
            </slot>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.at-gantt-modal {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  font-family: var(
    --at-gantt-font-family,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    sans-serif
  );
}

.at-gantt-modal__mask {
  position: absolute;
  inset: 0;
  background-color: var(--at-gantt-modal-mask-bg, rgba(0, 0, 0, 0.45));
  backdrop-filter: blur(2px);
  transition: opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.at-gantt-modal__dialog {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  background-color: var(--at-gantt-modal-bg, #ffffff);
  border-radius: var(--at-gantt-modal-radius, 8px);
  box-shadow: var(
    --at-gantt-modal-shadow,
    0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04)
  );
  overflow: hidden;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.at-gantt-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background-color: var(--at-gantt-header-bg, #f9fafb);
  border-bottom: 1px solid var(--at-gantt-modal-header-border, #e5e7eb);
  user-select: none;
}

.at-gantt-modal__title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--at-gantt-text-color, #1f2937);
}

.at-gantt-modal__header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.at-gantt-modal__action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  color: var(--at-gantt-text-muted, #6b7280);
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.at-gantt-modal__action-btn:hover {
  color: var(--at-gantt-text-color, #1f2937);
  background-color: var(--at-gantt-action-btn-hover-bg, rgba(0, 0, 0, 0.06));
}

.at-gantt-modal__body {
  position: relative;
  flex: 1;
  width: 100%;
  min-height: 0;
  overflow: hidden;
}

.at-gantt-modal__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 12px 16px;
  background-color: var(--at-gantt-header-bg, #f9fafb);
  border-top: 1px solid var(--at-gantt-modal-footer-border, #e5e7eb);
}

.at-gantt-modal__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 16px;
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1.5;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.at-gantt-modal__btn--default {
  background-color: var(--at-gantt-btn-default-bg, #ffffff);
  color: var(--at-gantt-btn-default-color, #374151);
  border: 1px solid var(--at-gantt-btn-default-border, #d1d5db);
}

.at-gantt-modal__btn--default:hover {
  background-color: var(--at-gantt-btn-default-hover-bg, #f3f4f6);
}

.at-gantt-modal__btn--primary {
  background-color: var(--at-gantt-btn-primary-bg, #3b82f6);
  color: var(--at-gantt-btn-primary-color, #ffffff);
  border: 1px solid var(--at-gantt-btn-primary-bg, #3b82f6);
}

.at-gantt-modal__btn--primary:hover {
  background-color: var(--at-gantt-btn-primary-hover-bg, #2563eb);
  border-color: var(--at-gantt-btn-primary-hover-bg, #2563eb);
}

/* 模态淡入淡出动效 */
.at-gantt-modal-fade-enter-active,
.at-gantt-modal-fade-leave-active {
  transition: opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.at-gantt-modal-fade-enter-active .at-gantt-modal__dialog,
.at-gantt-modal-fade-leave-active .at-gantt-modal__dialog {
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.at-gantt-modal-fade-enter-from,
.at-gantt-modal-fade-leave-to {
  opacity: 0;
}

.at-gantt-modal-fade-enter-from .at-gantt-modal__dialog,
.at-gantt-modal-fade-leave-to .at-gantt-modal__dialog {
  transform: scale(0.96);
}
</style>
