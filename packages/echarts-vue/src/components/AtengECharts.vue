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

import { ref, watch, onMounted, computed, type CSSProperties } from 'vue';
import { useECharts } from '../composables/useECharts';
import type { AtengEChartsEmits, AtengEChartsProps, EChartsInstance } from '../types';

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
});

const emit = defineEmits<AtengEChartsEmits>();

const chartRef = ref<HTMLDivElement | null>(null);

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

// 2. 容器样式计算
const containerStyle = computed<CSSProperties>(() => ({
  width: props.width,
  height: props.height,
  minWidth: '0',
  minHeight: '0',
}));

// 错误文案计算
const resolvedErrorMsg = computed(() => {
  if (!props.error) return '';
  if (typeof props.error === 'string') return props.error;
  return props.error.message || props.errorText;
});

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
});
</script>

<template>
  <div class="at-echarts" :style="containerStyle">
    <!-- 专属 ECharts 画布挂载节点，与 Vue DOM 遮罩层严格分离 -->
    <div
      ref="chartRef"
      class="at-echarts__canvas"
      style="width: 100%; height: 100%; min-width: 0; min-height: 0"
    />

    <slot />

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
