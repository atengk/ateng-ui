<script setup lang="ts">
/**
 * 企业级吸底操作栏组件。
 *
 * 核心特性：
 * 1. 支持 sticky（局部容器粘滞吸底）与 fixed（全局视口悬浮吸底）双模；
 * 2. fixed 模式标配自动 placeholder 等高透明占位垫块，彻底杜绝底部字段被遮挡；
 * 3. 规范左侧辅助状态（#extra）与右侧操作按钮（#default）双向排版；
 * 4. 预置快捷操作流：开箱即用提供保存/提交/重置/取消按钮，支持 actions 声明式批量配置；
 * 5. 异步 Loading 互斥防重锁：onSubmit 绑定异步 Promise 时自动接管加载态与防重点击，支持 submitLoading 受控覆盖；
 * 6. 支持 leftOffset 侧边栏动态避让偏移与设计令牌暗黑模式适配；
 * 7. 进阶增强：支持 autoOffset 与 target 智能容器锚定，基于 ResizeObserver + rAF 动态平滑更新 left 与 width。
 *
 * @author Ateng
 * @since 2026-10-22
 */

import { ref, computed, watch, onMounted, onBeforeUnmount, inject } from 'vue';
import { ElButton } from 'element-plus';
import { PAGE_CONTAINER_INJECTION_KEY } from '../page-container';
import type {
  AtengFooterBarProps,
  AtengFooterBarEmits,
  AtengFooterBarSlots,
  AtengFooterBarExpose,
  FooterBarActionItem,
} from './types';

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
  autoOffset: false,
  showSubmit: undefined,
  submitText: '提交',
  submitType: 'primary',
  submitLoading: undefined,
  onSubmit: undefined,
  showReset: undefined,
  resetText: '重置',
  onReset: undefined,
  showCancel: undefined,
  cancelText: '取消',
  onCancel: undefined,
  actions: undefined,
});

const emit = defineEmits<AtengFooterBarEmits>();
defineSlots<AtengFooterBarSlots>();

const barRef = ref<HTMLElement | null>(null);
const dynamicOffset = ref<{ left: number; width: number } | null>(null);

// 容器上下文总线 (Container Context Bus)
const pageContainerContext = inject(PAGE_CONTAINER_INJECTION_KEY, null);
let unregisterFooter: (() => void) | null = null;

const syncRegisterFooter = () => {
  if (pageContainerContext && typeof pageContainerContext.registerFooter === 'function') {
    unregisterFooter?.();
    const h =
      typeof props.height === 'number' ? props.height : parseFloat(String(props.height)) || 56;
    unregisterFooter = pageContainerContext.registerFooter(h);
  }
};

let resizeObserver: ResizeObserver | null = null;
let rafId: number | null = null;

// 1. 预置操作按钮可见性判断
const isSubmitVisible = computed(() => {
  if (typeof props.showSubmit === 'boolean') {
    return props.showSubmit;
  }
  return typeof props.onSubmit === 'function';
});

const isResetVisible = computed(() => {
  if (typeof props.showReset === 'boolean') {
    return props.showReset;
  }
  return typeof props.onReset === 'function';
});

const isCancelVisible = computed(() => {
  if (typeof props.showCancel === 'boolean') {
    return props.showCancel;
  }
  return typeof props.onCancel === 'function';
});

const hasPresetActions = computed(() => {
  return isSubmitVisible.value || isResetVisible.value || isCancelVisible.value;
});

// 2. 异步 Loading 互斥防重锁状态机
const internalSubmitLoading = ref(false);

const computedSubmitLoading = computed<boolean>(() => {
  if (typeof props.submitLoading === 'boolean') {
    return props.submitLoading;
  }
  return internalSubmitLoading.value;
});

async function handleSubmit(event?: MouseEvent): Promise<void> {
  const evt =
    event || (typeof window !== 'undefined' ? new MouseEvent('click') : ({} as MouseEvent));

  // 互斥防重锁：若正在 loading 则立即阻断
  if (computedSubmitLoading.value) {
    return;
  }

  if (typeof props.onSubmit === 'function') {
    internalSubmitLoading.value = true;
    try {
      const result = props.onSubmit(evt);
      if (result instanceof Promise) {
        await result;
      }
    } catch (err) {
      emit('submit-error', err);
    } finally {
      internalSubmitLoading.value = false;
    }
  } else {
    emit('submit', evt);
  }
}

function handleReset(event?: MouseEvent): void {
  const evt =
    event || (typeof window !== 'undefined' ? new MouseEvent('click') : ({} as MouseEvent));
  if (computedSubmitLoading.value) return;
  if (typeof props.onReset === 'function') {
    props.onReset(evt);
  } else {
    emit('reset', evt);
  }
}

function handleCancel(event?: MouseEvent): void {
  const evt =
    event || (typeof window !== 'undefined' ? new MouseEvent('click') : ({} as MouseEvent));
  if (computedSubmitLoading.value) return;
  if (typeof props.onCancel === 'function') {
    props.onCancel(evt);
  } else {
    emit('cancel', evt);
  }
}

async function handleCustomAction(action: FooterBarActionItem, event: MouseEvent): Promise<void> {
  if (action.disabled || (action.key === 'submit' && computedSubmitLoading.value)) {
    return;
  }
  if (typeof action.onClick === 'function') {
    await action.onClick(event);
  }
}

// 3. 解析智能对齐目标 DOM 节点
const resolveTargetElement = (): HTMLElement | null => {
  if (typeof document === 'undefined') return null;
  if (props.target) {
    if (typeof props.target === 'string') {
      return document.querySelector<HTMLElement>(props.target);
    }
    return props.target;
  }
  const el = barRef.value;
  if (!el) return null;
  const pageContainer = el.closest?.('.at-page-container') as HTMLElement | null;
  if (pageContainer) return pageContainer;
  return el.parentElement;
};

// 4. 执行测量并更新 left 与 width
const updateOffset = () => {
  const targetEl = resolveTargetElement();
  if (!targetEl) return;
  const rect = targetEl.getBoundingClientRect();
  dynamicOffset.value = {
    left: Math.round(rect.left),
    width: Math.round(rect.width),
  };
};

// 通过 rAF 平滑防抖调度更新，防止侧边栏展开/折叠过渡动画错位与丢帧
const scheduleUpdate = () => {
  if (typeof window === 'undefined') return;
  if (rafId !== null && typeof cancelAnimationFrame !== 'undefined') {
    cancelAnimationFrame(rafId);
  }
  rafId = requestAnimationFrame(() => {
    updateOffset();
    rafId = null;
  });
};

// 启动 ResizeObserver 与 window resize 监听
const startObserving = () => {
  stopObserving();
  if (props.position !== 'fixed' || !props.autoOffset) {
    dynamicOffset.value = null;
    return;
  }

  const targetEl = resolveTargetElement();
  if (!targetEl) return;

  // 同步初始测量一次，杜绝首屏闪烁
  updateOffset();

  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      scheduleUpdate();
    });
    resizeObserver.observe(targetEl);
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('resize', scheduleUpdate);
  }
};

// 确定性清理瞬态监听与帧调度
const stopObserving = () => {
  if (rafId !== null && typeof cancelAnimationFrame !== 'undefined') {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', scheduleUpdate);
  }
};

watch(
  () => [props.position, props.autoOffset, props.target],
  () => {
    startObserving();
  },
);

watch(
  () => props.height,
  () => {
    syncRegisterFooter();
  },
);

onMounted(() => {
  startObserving();
  syncRegisterFooter();
});

onBeforeUnmount(() => {
  stopObserving();
  if (unregisterFooter) {
    unregisterFooter();
    unregisterFooter = null;
  }
});

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
  };

  // 开启了 autoOffset 并已完成测量
  if (props.autoOffset && dynamicOffset.value) {
    styles.left = `${dynamicOffset.value.left}px`;
    styles.width = `${dynamicOffset.value.width}px`;
    styles.right = 'auto';
    return styles;
  }

  // 默认固定视口悬浮
  styles.right = 0;
  if (props.leftOffset !== 'auto') {
    styles.left = typeof props.leftOffset === 'number' ? `${props.leftOffset}px` : props.leftOffset;
  } else {
    styles.left = 0;
  }

  return styles;
});

defineExpose<AtengFooterBarExpose>({
  barRef,
  updateOffset,
  submitLoading: computedSubmitLoading,
  submit: handleSubmit,
  reset: handleReset,
  cancel: handleCancel,
});
</script>

<template>
  <!-- 占位垫块（仅在 fixed 模式且开启 placeholder 且未在页面容器中统一托管时渲染，防止内容被遮挡） -->
  <div
    v-if="position === 'fixed' && placeholder && !pageContainerContext"
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
        <!-- 默认自定义插槽内容 -->
        <slot />

        <!-- 声明式 actions 按钮列表 -->
        <template v-if="actions && actions.length > 0">
          <el-button
            v-for="(action, index) in actions"
            :key="action.key || index"
            :type="action.type || 'default'"
            :plain="action.plain"
            :disabled="action.disabled || (action.key === 'submit' && computedSubmitLoading)"
            :loading="action.loading || (action.key === 'submit' && computedSubmitLoading)"
            @click="handleCustomAction(action, $event)"
          >
            {{ action.label }}
          </el-button>
        </template>

        <!-- 预置开箱即用操作流 (取消/重置/提交) -->
        <template v-if="hasPresetActions">
          <el-button v-if="isCancelVisible" :disabled="computedSubmitLoading" @click="handleCancel">
            {{ cancelText }}
          </el-button>
          <el-button v-if="isResetVisible" :disabled="computedSubmitLoading" @click="handleReset">
            {{ resetText }}
          </el-button>
          <el-button
            v-if="isSubmitVisible"
            :type="submitType"
            :loading="computedSubmitLoading"
            :disabled="computedSubmitLoading"
            @click="handleSubmit"
          >
            {{ submitText }}
          </el-button>
        </template>
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
  padding-bottom: max(0px, env(safe-area-inset-bottom, 0px));
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
