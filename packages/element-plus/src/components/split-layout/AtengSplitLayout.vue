<script setup lang="ts">
/**
 * 企业级弹性分栏布局容器组件。
 *
 * 核心特性：
 * 1. 支持水平（左树右表）与垂直（上下排版）双向分栏；
 * 2. 纯原生 MouseEvent 拖拽调宽，零额外第三方依赖，带 min/max 阈值防御；
 * 3. 一键平滑折叠展开小触发器，支持折叠状态双向绑定；
 * 4. 标配 storageKey 本地持久化记忆，刷新自动还原用户偏好；
 * 5. 100% 确定性生命周期清理，防止离线鼠标监听器泄漏。
 *
 * @author Ateng
 * @since 2026-10-22
 */

import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import type { AtengSplitLayoutProps, AtengSplitLayoutEmits } from './types';

defineOptions({
  name: 'AtengSplitLayout',
});

const props = withDefaults(defineProps<AtengSplitLayoutProps>(), {
  direction: 'horizontal',
  modelValue: undefined,
  defaultSize: '260px',
  min: '120px',
  max: '80%',
  collapsible: true,
  collapsed: undefined,
  collapseSize: 0,
  storageKey: '',
  disabled: false,
});

const emit = defineEmits<AtengSplitLayoutEmits>();

// 1. 容器引用与状态管理
const containerRef = ref<HTMLElement | null>(null);
const isDragging = ref(false);

// 内部尺寸与折叠状态
const internalSize = ref<string | number>(props.defaultSize);
const internalCollapsed = ref(false);

// 2. 初始化持久化恢复
onMounted(() => {
  if (props.storageKey) {
    try {
      const saved = localStorage.getItem(`ateng_split_${props.storageKey}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.size !== undefined && props.modelValue === undefined) {
          internalSize.value = parsed.size;
        }
        if (parsed.collapsed !== undefined && props.collapsed === undefined) {
          internalCollapsed.value = Boolean(parsed.collapsed);
        }
      }
    } catch {
      // 容错忽略 storage 异常
    }
  }
});

// 持久化保存
const savePreference = (size: string | number, collapsed: boolean) => {
  if (!props.storageKey) return;
  try {
    localStorage.setItem(`ateng_split_${props.storageKey}`, JSON.stringify({ size, collapsed }));
  } catch {
    // 忽略异常
  }
};

// 同步外部受控状态
watch(
  () => props.modelValue,
  val => {
    if (val !== undefined) {
      internalSize.value = val;
    }
  },
  { immediate: true },
);

watch(
  () => props.collapsed,
  val => {
    if (val !== undefined) {
      internalCollapsed.value = val;
    }
  },
  { immediate: true },
);

// 计算当前实际生效的折叠态
const isCollapsed = computed(() => {
  return props.collapsed !== undefined ? props.collapsed : internalCollapsed.value;
});

// 3. 计算阈值工具函数（转换像素与百分比）
const parseThreshold = (val: string | number, total: number): number => {
  if (typeof val === 'number') {
    return val;
  }
  if (val.endsWith('%')) {
    const ratio = parseFloat(val) / 100;
    return total * ratio;
  }
  return parseFloat(val) || 0;
};

// 首栏实际显示尺寸样式
const firstPaneStyle = computed(() => {
  if (isCollapsed.value) {
    const size =
      typeof props.collapseSize === 'number' ? `${props.collapseSize}px` : props.collapseSize;
    return props.direction === 'horizontal' ? { width: size } : { height: size };
  }

  const currentSize = props.modelValue !== undefined ? props.modelValue : internalSize.value;
  const size = typeof currentSize === 'number' ? `${currentSize}px` : currentSize;
  return props.direction === 'horizontal' ? { width: size } : { height: size };
});

// 4. 原生鼠标拖拽调宽编排
let startPos = 0;
let startSize = 0;

const onMouseDown = (e: MouseEvent) => {
  if (props.disabled || isCollapsed.value || !containerRef.value) return;

  isDragging.value = true;
  startPos = props.direction === 'horizontal' ? e.clientX : e.clientY;

  // 获取当前实际像素尺寸
  const firstEl = containerRef.value.querySelector<HTMLElement>('.at-split-layout__first');
  if (firstEl) {
    startSize = props.direction === 'horizontal' ? firstEl.offsetWidth : firstEl.offsetHeight;
  }

  document.body.style.userSelect = 'none';
  document.body.style.cursor = props.direction === 'horizontal' ? 'col-resize' : 'row-resize';

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
};

const onMouseMove = (e: MouseEvent) => {
  if (!isDragging.value || !containerRef.value) return;

  const currentPos = props.direction === 'horizontal' ? e.clientX : e.clientY;
  const delta = currentPos - startPos;
  const newSize = startSize + delta;

  const totalSize =
    props.direction === 'horizontal'
      ? containerRef.value.offsetWidth
      : containerRef.value.offsetHeight;

  const minPx = parseThreshold(props.min, totalSize);
  const maxPx = parseThreshold(props.max, totalSize);

  // 边界约束
  const clamped = Math.max(minPx, Math.min(maxPx, newSize));

  internalSize.value = `${clamped}px`;
  emit('update:modelValue', `${clamped}px`);
  emit('resize', clamped);
};

const onMouseUp = () => {
  if (!isDragging.value) return;
  isDragging.value = false;

  document.body.style.userSelect = '';
  document.body.style.cursor = '';

  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('mouseup', onMouseUp);

  savePreference(internalSize.value, isCollapsed.value);
};

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('mouseup', onMouseUp);
  document.body.style.userSelect = '';
  document.body.style.cursor = '';
});

// 5. 折叠与恢复方法
const toggleCollapse = (force?: boolean) => {
  const next = force !== undefined ? force : !isCollapsed.value;
  internalCollapsed.value = next;
  emit('update:collapsed', next);
  emit('collapse', next);
  savePreference(internalSize.value, next);
};

const setSize = (size: number | string) => {
  internalSize.value = size;
  emit('update:modelValue', size);
  savePreference(size, isCollapsed.value);
};

const resetSize = () => {
  internalSize.value = props.defaultSize;
  emit('update:modelValue', props.defaultSize);
  savePreference(props.defaultSize, isCollapsed.value);
};

defineExpose({
  containerRef,
  toggleCollapse,
  setSize,
  resetSize,
});
</script>

<template>
  <div
    ref="containerRef"
    class="at-split-layout"
    :class="[
      `is-${direction}`,
      {
        'is-collapsed': isCollapsed,
        'is-dragging': isDragging,
      },
    ]"
  >
    <!-- 首栏（左/上） -->
    <aside class="at-split-layout__first" :style="firstPaneStyle">
      <slot name="first">
        <slot v-if="direction === 'horizontal'" name="left" />
        <slot v-else name="top" />
      </slot>
    </aside>

    <!-- 分割条与拖拽触发线 -->
    <div
      class="at-split-layout__splitter"
      :class="{ 'is-disabled': disabled || isCollapsed }"
      @mousedown="onMouseDown"
    >
      <slot name="splitter">
        <div class="at-split-layout__splitter-line" />
        <!-- 一键折叠把手按钮 -->
        <button
          v-if="collapsible"
          type="button"
          class="at-split-layout__collapse-btn"
          :title="isCollapsed ? '展开分栏' : '收起分栏'"
          @click.stop="toggleCollapse()"
        >
          <svg
            viewBox="0 0 1024 1024"
            width="10"
            height="10"
            fill="currentColor"
            class="collapse-icon"
            :class="{
              'is-reversed':
                (direction === 'horizontal' && isCollapsed) ||
                (direction === 'vertical' && isCollapsed),
            }"
          >
            <path
              v-if="direction === 'horizontal'"
              d="M603.7 836.3a32 32 0 0 1-22.6-9.4l-288-288a32 32 0 0 1 0-45.3l288-288a32 32 0 1 1 45.3 45.3L360.6 512l265.8 261.4a32 32 0 0 1-22.7 62.9z"
            />
            <path
              v-else
              d="M836.3 603.7a32 32 0 0 1-45.3 0L512 360.6 233.1 639.6a32 32 0 0 1-45.3-45.3l288-288a32 32 0 0 1 45.3 0l288 288a32 32 0 0 1 0 45.3z"
            />
          </svg>
        </button>
      </slot>
    </div>

    <!-- 次栏（右/下 主体） -->
    <main class="at-split-layout__second">
      <slot name="second">
        <slot v-if="direction === 'horizontal'" name="right">
          <slot />
        </slot>
        <slot v-else name="bottom">
          <slot />
        </slot>
      </slot>
    </main>
  </div>
</template>

<style scoped>
.at-split-layout {
  display: flex;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  overflow: hidden;
  position: relative;
}

.at-split-layout.is-horizontal {
  flex-direction: row;
}

.at-split-layout.is-vertical {
  flex-direction: column;
}

/* 首栏 */
.at-split-layout__first {
  flex-shrink: 0;
  box-sizing: border-box;
  overflow: auto;
  transition:
    width 0.25s cubic-bezier(0.4, 0, 0.2, 1),
    height 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.at-split-layout.is-dragging .at-split-layout__first {
  transition: none; /* 拖拽时立即响应，无动画延迟 */
}

/* 分割线 */
.at-split-layout__splitter {
  position: relative;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--el-border-color-lighter);
  transition: background-color 0.2s;
  z-index: 2;
}

.at-split-layout.is-horizontal .at-split-layout__splitter {
  width: 6px;
  cursor: col-resize;
  margin: 0 -1px;
}

.at-split-layout.is-vertical .at-split-layout__splitter {
  height: 6px;
  cursor: row-resize;
  margin: -1px 0;
}

.at-split-layout__splitter:hover,
.at-split-layout.is-dragging .at-split-layout__splitter {
  background-color: var(--el-color-primary-light-5);
}

.at-split-layout__splitter.is-disabled {
  cursor: default;
  pointer-events: none;
}

.at-split-layout__splitter-line {
  width: 100%;
  height: 100%;
}

/* 折叠把手 */
.at-split-layout__collapse-btn {
  position: absolute;
  pointer-events: auto;
  border: 1px solid var(--el-border-color);
  background-color: var(--el-bg-color);
  color: var(--el-text-color-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  box-shadow: var(--el-box-shadow-lighter);
  border-radius: 4px;
  transition:
    background-color 0.2s,
    color 0.2s;
  z-index: 3;
}

.at-split-layout.is-horizontal .at-split-layout__collapse-btn {
  width: 14px;
  height: 40px;
  top: 50%;
  transform: translateY(-50%);
}

.at-split-layout.is-vertical .at-split-layout__collapse-btn {
  height: 14px;
  width: 40px;
  left: 50%;
  transform: translateX(-50%);
}

.at-split-layout__collapse-btn:hover {
  background-color: var(--el-color-primary);
  color: #fff;
  border-color: var(--el-color-primary);
}

.collapse-icon.is-reversed {
  transform: rotate(180deg);
}

/* 次栏（主体） */
.at-split-layout__second {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  box-sizing: border-box;
  overflow: auto;
}
</style>
