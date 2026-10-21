<script setup lang="ts">
/**
 * AtengStatistic 统计指标与数字滚动组件。
 *
 * 采用原生 requestAnimationFrame 缓动算法实现平滑翻牌过渡动效（零第三方依赖），
 * 支持千分位格式化、红绿涨跌微标与 ElSkeleton 骨架屏防布局抖动。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { ElSkeleton } from 'element-plus';
import type {
  AtengStatisticProps,
  AtengStatisticSlots,
  AtengStatisticExpose,
  StatisticTrend,
} from './types';

defineOptions({
  name: 'AtengStatistic',
});

const props = withDefaults(defineProps<AtengStatisticProps>(), {
  title: '',
  precision: undefined,
  thousands: true,
  separator: ',',
  prefix: '',
  suffix: '',
  duration: 1500,
  trend: 'none',
  trendValue: '',
  trendColorInverse: false,
  loading: false,
  valueStyle: undefined,
  customClass: '',
});

defineSlots<AtengStatisticSlots>();

// 解析目标数值
const targetNumber = computed<number>(() => {
  const num = Number(props.value);
  return Number.isNaN(num) ? 0 : num;
});

// 计算保留小数精度
const computedPrecision = computed<number>(() => {
  if (typeof props.precision === 'number' && props.precision >= 0) {
    return props.precision;
  }
  const str = String(props.value);
  const dotIndex = str.indexOf('.');
  return dotIndex >= 0 ? str.length - dotIndex - 1 : 0;
});

// 动画实时数值
const currentNum = ref<number>(props.duration <= 0 ? targetNumber.value : 0);
let rafId: number | null = null;
let lastTarget = targetNumber.value;

// 经典指数衰减平滑缓动函数
function easeOutExpo(x: number): number {
  return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
}

// 格式化当前显示文本
function formatNumber(num: number, prec: number, sep: string): string {
  const isNegative = num < 0;
  const absNum = Math.abs(num);
  const fixedStr = absNum.toFixed(prec);
  const [intPart = '0', decPart = ''] = fixedStr.split('.');
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, sep);

  let result = formattedInt;
  if (prec > 0 && decPart) {
    result += `.${decPart}`;
  }
  return isNegative ? `-${result}` : result;
}

const effectiveSeparator = computed<string>(() => {
  if (props.thousands === false) {
    return '';
  }
  return props.separator ?? ',';
});

const displayValue = computed<string>(() => {
  return formatNumber(currentNum.value, computedPrecision.value, effectiveSeparator.value);
});

// 启动数字滚动动画
function startAnimation(fromVal: number, toVal: number): void {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  if (props.duration <= 0 || typeof window === 'undefined' || !window.requestAnimationFrame) {
    currentNum.value = toVal;
    return;
  }

  const startTime = performance.now();
  const dur = Math.max(100, props.duration);

  function step(currentTime: number): void {
    const elapsed = currentTime - startTime;
    const progress = Math.min(1, Math.max(0, elapsed / dur));
    const factor = easeOutExpo(progress);

    currentNum.value = fromVal + (toVal - fromVal) * factor;

    if (progress < 1) {
      rafId = requestAnimationFrame(step);
    } else {
      currentNum.value = toVal;
      rafId = null;
    }
  }

  rafId = requestAnimationFrame(step);
}

// 重新播放动画
function restart(): void {
  startAnimation(0, targetNumber.value);
}

// 侦听值变更
watch(
  () => targetNumber.value,
  (newVal, oldVal) => {
    const from = typeof oldVal === 'number' ? oldVal : 0;
    startAnimation(from, newVal);
    lastTarget = newVal;
  },
);

onMounted(() => {
  startAnimation(0, targetNumber.value);
});

onUnmounted(() => {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
});

// 涨跌趋势色彩计算
const trendClass = computed<string>(() => {
  if (props.trend === 'none') return '';
  const isUp = props.trend === 'up';
  // 默认中国股市：红涨绿跌；若反转则绿涨红跌
  if (props.trendColorInverse) {
    return isUp ? 'at-statistic__trend--success' : 'at-statistic__trend--danger';
  }
  return isUp ? 'at-statistic__trend--danger' : 'at-statistic__trend--success';
});

defineExpose<AtengStatisticExpose>({
  restart,
  currentValue: computed(() => currentNum.value),
  displayValue,
});
</script>

<template>
  <div :class="['at-statistic', customClass]">
    <!-- 标题区域 -->
    <div v-if="title || $slots.title" class="at-statistic__head">
      <slot name="title">
        <span class="at-statistic__title">{{ title }}</span>
      </slot>
    </div>

    <!-- 骨架屏加载中占位 -->
    <template v-if="loading">
      <ElSkeleton animated :rows="1" class="at-statistic__skeleton" />
    </template>

    <!-- 数值与趋势呈现主体 -->
    <template v-else>
      <div class="at-statistic__content" :style="valueStyle">
        <slot :value="value" :display-value="displayValue">
          <!-- 前缀 -->
          <span v-if="prefix || $slots.prefix" class="at-statistic__prefix">
            <slot name="prefix">{{ prefix }}</slot>
          </span>

          <!-- 格式化数字 -->
          <span class="at-statistic__number">{{ displayValue }}</span>

          <!-- 后缀 -->
          <span v-if="suffix || $slots.suffix" class="at-statistic__suffix">
            <slot name="suffix">{{ suffix }}</slot>
          </span>
        </slot>

        <!-- 涨跌趋势微标 -->
        <span v-if="trend !== 'none' || $slots.trend" :class="['at-statistic__trend', trendClass]">
          <slot name="trend" :trend="trend" :trend-value="trendValue">
            <!-- 向上箭头 -->
            <svg
              v-if="trend === 'up'"
              class="trend-icon"
              viewBox="0 0 1024 1024"
              width="1em"
              height="1em"
            >
              <path d="M512 256l288 384H224z" fill="currentColor" />
            </svg>
            <!-- 向下箭头 -->
            <svg
              v-else-if="trend === 'down'"
              class="trend-icon"
              viewBox="0 0 1024 1024"
              width="1em"
              height="1em"
            >
              <path d="M512 768L224 384h576z" fill="currentColor" />
            </svg>
            <span v-if="trendValue" class="trend-value">{{ trendValue }}</span>
          </slot>
        </span>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.at-statistic {
  display: inline-flex;
  flex-direction: column;
  box-sizing: border-box;

  &__head {
    margin-bottom: 6px;
    font-size: 13px;
    color: var(--el-text-color-regular);
    line-height: 1.4;
  }

  &__skeleton {
    width: 140px;
    margin-top: 4px;
  }

  &__content {
    display: flex;
    align-items: baseline;
    font-variant-numeric: tabular-nums;
    line-height: 1;
    color: var(--el-text-color-primary);
  }

  &__number {
    font-size: 26px;
    font-weight: 600;
    letter-spacing: -0.5px;
  }

  &__prefix {
    margin-right: 4px;
    font-size: 16px;
    font-weight: 500;
    color: var(--el-text-color-regular);
  }

  &__suffix {
    margin-left: 6px;
    font-size: 14px;
    font-weight: 400;
    color: var(--el-text-color-secondary);
  }

  &__trend {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    margin-left: 10px;
    padding: 2px 6px;
    font-size: 12px;
    font-weight: 600;
    border-radius: 4px;
    vertical-align: middle;

    .trend-icon {
      font-size: 11px;
    }

    &--danger {
      color: var(--el-color-danger);
      background-color: var(--el-color-danger-light-9);
    }

    &--success {
      color: var(--el-color-success);
      background-color: var(--el-color-success-light-9);
    }
  }
}
</style>
