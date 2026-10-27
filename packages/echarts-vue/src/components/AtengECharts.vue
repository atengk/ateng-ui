<script setup lang="ts">
/**
 * AtengECharts 通用表现容器组件。
 *
 * 包装 useECharts 无头状态机，提供保底高度、BEM 独立样式隔离、ResizeObserver 几何自适应、
 * 声明式 Option 全量同步（notMerge）、DOM 级多态遮罩（Loading/Empty/Error）与事件方法透传。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import { ref, watch, onMounted, onUnmounted, computed, nextTick, type CSSProperties } from 'vue';
import { useECharts } from '../composables/useECharts';
import type {
  AtengEChartsEmits,
  AtengEChartsProps,
  ChartExportOptions,
  EChartsInstance,
} from '../types';
import { exportChartImage, generateChartFilename } from '../utils/export';
import {
  isNativeFullscreenSupported,
  isElementInNativeFullscreen,
  requestNativeFullscreen,
  exitNativeFullscreen,
} from '../utils/fullscreen';

defineOptions({
  name: 'AtengECharts',
});

const props = withDefaults(defineProps<AtengEChartsProps>(), {
  theme: 'auto',
  initOptions: undefined,
  width: '100%',
  height: '350px',
  autoResize: true,
  deepWatch: false,
  notMerge: true,
  lazyUpdate: true,
  loading: false,
  loadingText: '加载中...',
  nativeLoading: false,
  empty: false,
  emptyText: '暂无图表数据',
  error: null,
  errorText: '图表加载异常',
  allowFullscreen: false,
  fullscreenMode: 'auto',
  allowExport: false,
  exportOptions: undefined,
});

const emit = defineEmits<AtengEChartsEmits>();

const rootRef = ref<HTMLDivElement | null>(null);
const chartRef = ref<HTMLDivElement | null>(null);
const isPageFullscreen = ref(false);
const isNativeFullscreen = ref(false);
const isFullscreen = computed(() => isPageFullscreen.value || isNativeFullscreen.value);

// 1. 初始化无头状态机（注入 autoResize 与主题联动）
const {
  instance,
  isZeroDimension,
  currentTheme,
  init,
  dispose,
  setOption,
  resize,
  showLoading,
  hideLoading,
  clear,
  dispatchAction,
  getDataURL,
} = useECharts(chartRef, {
  theme: () => props.theme,
  initOptions: () => props.initOptions,
  autoResize: () => props.autoResize,
  onThemeChange: theme => {
    emit('theme-change', theme);
  },
});

// 2. 容器样式计算（全屏脱壳状态下接管视口尺寸）
const containerStyle = computed<CSSProperties>(() => {
  if (isPageFullscreen.value) {
    return {
      minWidth: '0',
      minHeight: '0',
    };
  }
  return {
    width: props.width,
    height: props.height,
    minWidth: '0',
    minHeight: '0',
  };
});

// 错误文案计算
const resolvedErrorMsg = computed(() => {
  if (!props.error) return '';
  if (typeof props.error === 'string') return props.error;
  return props.error.message || props.errorText;
});

// 3. 全屏与快捷键监听处理
const handleNativeFullscreenChange = () => {
  isNativeFullscreen.value = isElementInNativeFullscreen(rootRef.value);
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && isPageFullscreen.value) {
    void exitFullscreen();
  }
};

const exitFullscreen = async (): Promise<boolean> => {
  if (isPageFullscreen.value) {
    isPageFullscreen.value = false;
    return true;
  }
  if (isNativeFullscreen.value) {
    return await exitNativeFullscreen();
  }
  return false;
};

const enterFullscreen = async (
  mode: 'auto' | 'native' | 'page' = props.fullscreenMode ?? 'auto',
): Promise<boolean> => {
  if (!rootRef.value) return false;

  if (mode === 'page') {
    isPageFullscreen.value = true;
    return true;
  }

  if (mode === 'native') {
    return await requestNativeFullscreen(rootRef.value);
  }

  // 'auto' 模式：优先尝试原生全屏，失败或不支持时降级为页面脱壳全屏
  if (isNativeFullscreenSupported()) {
    const success = await requestNativeFullscreen(rootRef.value);
    if (success) {
      return true;
    }
  }
  isPageFullscreen.value = true;
  return true;
};

const toggleFullscreen = async (mode?: 'auto' | 'native' | 'page'): Promise<boolean> => {
  if (isFullscreen.value) {
    return await exitFullscreen();
  }
  return await enterFullscreen(mode);
};

watch(isFullscreen, async newVal => {
  emit('fullscreen-change', newVal);
  await nextTick();
  setTimeout(() => {
    resize();
  }, 50);
});

// 4. 高清图片导出
const exportImage = (opts?: ChartExportOptions): boolean => {
  const mergedOpts: ChartExportOptions = {
    type: 'png',
    pixelRatio: 2,
    backgroundColor: currentTheme.value.includes('dark') ? '#141414' : '#ffffff',
    ...props.exportOptions,
    ...opts,
  };

  const ext = mergedOpts.type ?? 'png';
  let finalFilename = (mergedOpts.filename || '').trim();
  if (!finalFilename) {
    finalFilename = generateChartFilename('chart', ext);
  } else if (!finalFilename.endsWith(`.${ext}`)) {
    finalFilename = `${finalFilename}.${ext}`;
  }

  const success = exportChartImage(instance.value, { ...mergedOpts, filename: finalFilename });
  if (success) {
    emit('export', {
      filename: finalFilename,
      type: ext,
      pixelRatio: mergedOpts.pixelRatio ?? 2,
    });
  }
  return success;
};

// 3. 初始渲染与事件监听绑定
const bindChartEvents = (chart: EChartsInstance) => {
  chart.on('click', (params: unknown) => {
    emit('chart-click', params);
    emit('chart-event', 'click', params);
  });

  chart.on('dblclick', (params: unknown) => {
    emit('chart-dblclick', params);
    emit('chart-event', 'dblclick', params);
  });

  chart.on('mouseover', (params: unknown) => {
    emit('chart-mouseover', params);
    emit('chart-event', 'mouseover', params);
  });

  chart.on('mouseout', (params: unknown) => {
    emit('chart-mouseout', params);
    emit('chart-event', 'mouseout', params);
  });

  chart.on('legendselectchanged', (params: unknown) => {
    emit('legend-change', params);
    emit('chart-event', 'legendselectchanged', params);
  });

  chart.on('datazoom', (params: unknown) => {
    emit('data-zoom', params);
    emit('chart-event', 'datazoom', params);
  });

  chart.on('finished', () => {
    emit('finished');
    emit('chart-event', 'finished', undefined);
  });
};

onMounted(() => {
  if (typeof document !== 'undefined') {
    document.addEventListener('fullscreenchange', handleNativeFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleNativeFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleNativeFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleNativeFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);
  }

  const chart = init();
  if (chart) {
    if (props.option) {
      setOption(props.option, props.notMerge, props.lazyUpdate);
    }
    if (props.loading && props.nativeLoading) {
      showLoading();
    }

    bindChartEvents(chart);
    emit('rendered', chart);
  } else if (props.option) {
    // 若初始处于零尺寸状态，暂存配置待尺寸自愈后应用
    setOption(props.option, props.notMerge, props.lazyUpdate);
  }
});

onUnmounted(() => {
  if (typeof document !== 'undefined') {
    document.removeEventListener('fullscreenchange', handleNativeFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', handleNativeFullscreenChange);
    document.removeEventListener('mozfullscreenchange', handleNativeFullscreenChange);
    document.removeEventListener('MSFullscreenChange', handleNativeFullscreenChange);
    window.removeEventListener('keydown', handleKeyDown);
  }
});

// 4. 声明式 Option 全量同步（支持 deepWatch 切换）
watch(
  () => props.option,
  newOption => {
    if (newOption) {
      setOption(newOption, props.notMerge, props.lazyUpdate);
    }
  },
  { deep: props.deepWatch },
);

// 5. 响应式同步原生 Loading
watch(
  () => props.loading,
  isLoading => {
    if (props.nativeLoading) {
      if (isLoading) {
        showLoading();
      } else {
        hideLoading();
      }
    }
  },
);

// 6. 显式暴露实例方法与状态
defineExpose({
  getInstance: (): EChartsInstance | null => instance.value,
  isZeroDimension,
  currentTheme,
  init,
  dispose,
  setOption,
  resize,
  showLoading,
  hideLoading,
  clear,
  dispatchAction,
  getDataURL,
  isFullscreen,
  toggleFullscreen,
  exportImage,
});
</script>

<template>
  <div
    ref="rootRef"
    class="at-echarts"
    :class="{ 'is-page-fullscreen': isPageFullscreen, 'is-fullscreen': isFullscreen }"
    :style="containerStyle"
  >
    <!-- 专属 ECharts 画布挂载节点，与 Vue DOM 遮罩层严格分离 -->
    <div
      ref="chartRef"
      class="at-echarts__canvas"
      style="width: 100%; height: 100%; min-width: 0; min-height: 0"
    />

    <slot />

    <!-- 浮动操作工具栏胶囊 -->
    <div v-if="allowFullscreen || allowExport || $slots.toolbar" class="at-echarts__toolbar">
      <slot
        name="toolbar"
        :is-fullscreen="isFullscreen"
        :toggle-fullscreen="toggleFullscreen"
        :export-image="exportImage"
      >
        <!-- 全屏切换按钮 -->
        <button
          v-if="allowFullscreen"
          type="button"
          class="at-echarts__toolbar-btn"
          :title="isFullscreen ? '还原窗口' : '全屏放大'"
          @click="toggleFullscreen()"
        >
          <svg
            v-if="isFullscreen"
            viewBox="0 0 24 24"
            width="15"
            height="15"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"
            />
          </svg>
          <svg
            v-else
            viewBox="0 0 24 24"
            width="15"
            height="15"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M15 3h6v6m-6 0 6-6M9 21H3v-6m6 0-6 6M21 9V3h-6m0 6 6-6M3 15v6h6m-6 0 6-6" />
          </svg>
        </button>

        <!-- 高清导出图片按钮 -->
        <button
          v-if="allowExport"
          type="button"
          class="at-echarts__toolbar-btn"
          title="导出高清图片"
          @click="exportImage()"
        >
          <svg
            viewBox="0 0 24 24"
            width="15"
            height="15"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>
      </slot>
    </div>

    <!-- 1. DOM 级加载中遮罩 -->
    <div v-if="loading && !nativeLoading" class="at-echarts__overlay at-echarts__loading">
      <slot name="loading">
        <div class="at-echarts__spinner" />
        <span class="at-echarts__loading-text">{{ loadingText }}</span>
      </slot>
    </div>

    <!-- 2. DOM 级空数据遮罩 -->
    <div v-else-if="empty" class="at-echarts__overlay at-echarts__empty">
      <slot name="empty">
        <svg class="at-echarts__empty-icon" viewBox="0 0 64 41" xmlns="http://www.w3.org/2000/svg">
          <g transform="translate(0 1)" fill="none" fill-rule="evenodd">
            <ellipse fill="#F5F5F5" cx="32" cy="33" rx="32" ry="7" />
            <g fill-rule="nonzero" stroke="#D9D9D9">
              <path
                d="M55 12.76L44.854 1.258C44.367.474 43.656 0 42.907 0H21.093c-.749 0-1.46.474-1.947 1.257L9 12.761V22h46v-9.24z"
              />
              <path
                d="M41.613 15.932a2 2 0 0 1-1.613.818H24a2 2 0 0 1-1.613-.818L18 9h28l-4.387 6.932z"
                fill="#FAFAFA"
              />
            </g>
          </g>
        </svg>
        <span class="at-echarts__empty-text">{{ emptyText }}</span>
      </slot>
    </div>

    <!-- 3. DOM 级错误重试遮罩 -->
    <div v-else-if="error" class="at-echarts__overlay at-echarts__error">
      <slot name="error" :error="error" :retry="() => emit('retry')">
        <div class="at-echarts__error-icon">⚠️</div>
        <span class="at-echarts__error-title">{{ errorText }}</span>
        <span v-if="resolvedErrorMsg" class="at-echarts__error-msg">
          {{ resolvedErrorMsg }}
        </span>
        <button type="button" class="at-echarts__retry-btn" @click="emit('retry')">重试</button>
      </slot>
    </div>
  </div>
</template>

<style scoped>
.at-echarts {
  position: relative;
  box-sizing: border-box;
  overflow: hidden;
}

/* 页面级脱壳全屏 */
.at-echarts.is-page-fullscreen {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  z-index: 2000 !important;
  background-color: #ffffff;
  padding: 16px;
}

:global(.dark) .at-echarts.is-page-fullscreen {
  background-color: #141414;
}

/* 浏览器原生全屏背景与尺寸适配 */
.at-echarts:fullscreen {
  background-color: #ffffff;
  width: 100vw !important;
  height: 100vh !important;
  padding: 16px;
}

:global(.dark) .at-echarts:fullscreen {
  background-color: #141414;
}

/* 浮动工具栏胶囊 */
.at-echarts__toolbar {
  position: absolute;
  top: 8px;
  right: 8px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 6px;
  background-color: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 6px;
  z-index: 15;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  opacity: 0.6;
  transition:
    opacity 0.2s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease;
}

.at-echarts:hover .at-echarts__toolbar {
  opacity: 1;
}

:global(.dark) .at-echarts__toolbar {
  background-color: rgba(30, 30, 30, 0.85);
  border-color: rgba(255, 255, 255, 0.12);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.at-echarts__toolbar-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  margin: 0;
  color: #606266;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition:
    color 0.2s,
    background-color 0.2s,
    transform 0.15s;
}

.at-echarts__toolbar-btn:hover {
  color: #409eff;
  background-color: rgba(0, 0, 0, 0.05);
}

.at-echarts__toolbar-btn:active {
  transform: scale(0.92);
}

:global(.dark) .at-echarts__toolbar-btn {
  color: #a3a6ad;
}

:global(.dark) .at-echarts__toolbar-btn:hover {
  color: #409eff;
  background-color: rgba(255, 255, 255, 0.08);
}

.at-echarts__canvas {
  position: relative;
  box-sizing: border-box;
}

.at-echarts__overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10;
  background-color: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(2px);
  transition: opacity 0.2s ease;
}

:global(.dark) .at-echarts__overlay {
  background-color: rgba(20, 20, 20, 0.85);
}

.at-echarts__spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e5e7eb;
  border-top-color: #409eff;
  border-radius: 50%;
  animation: at-echarts-spin 0.8s linear infinite;
}

:global(.dark) .at-echarts__spinner {
  border-color: #363637;
  border-top-color: #409eff;
}

.at-echarts__loading-text {
  margin-top: 10px;
  font-size: 13px;
  color: #606266;
}

:global(.dark) .at-echarts__loading-text {
  color: #a3a6ad;
}

.at-echarts__empty-icon {
  width: 64px;
  height: 41px;
  margin-bottom: 8px;
}

.at-echarts__empty-text {
  font-size: 13px;
  color: #909399;
}

:global(.dark) .at-echarts__empty-text {
  color: #73767a;
}

.at-echarts__error-icon {
  font-size: 28px;
  margin-bottom: 6px;
}

.at-echarts__error-title {
  font-size: 14px;
  font-weight: 600;
  color: #f56c6c;
}

.at-echarts__error-msg {
  font-size: 12px;
  color: #909399;
  margin: 4px 0 12px;
  max-width: 80%;
  text-align: center;
}

:global(.dark) .at-echarts__error-msg {
  color: #a3a6ad;
}

.at-echarts__retry-btn {
  padding: 4px 12px;
  font-size: 12px;
  color: #fff;
  background-color: #409eff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.at-echarts__retry-btn:hover {
  background-color: #66b1ff;
}

@keyframes at-echarts-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
