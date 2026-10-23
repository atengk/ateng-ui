<script setup lang="ts">
/**
 * 企业级快捷时间范围选择器组件。
 *
 * 核心特性：
 * 1. 双模数据绑定：同时支持标准数组 v-model="range" 与 v-model:start="s" / v-model:end="e" 双字段解构绑定；
 * 2. 联动表单重置：深度支持外部 resetFields() 或外部字段置空时瞬时清空内部状态，杜绝脏值回弹；
 * 3. 预置快捷自然时间跨度：内置今天、昨天、近7天、近30天、本周、上周、本月、本季度、本年 9 大自然业务周期；
 * 4. 智能时刻边界对齐：daterange 模式下起始自动补全 00:00:00，结束自动补全 23:59:59；datetimerange 模式下尊重手动微调；
 * 5. 禁用策略开箱预置：支持 disableFuture 禁用未来、disablePast 禁用过去、maxRangeDays 动态跨度天数限制；
 * 6. 深度原生透传：100% 继承 ElDatePicker 的全部属性、插槽与事件派发。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { shallowRef, ref, computed, watch } from 'vue';
import { ElDatePicker } from 'element-plus';
import type {
  AtengDateRangeProps,
  AtengDateRangeEmits,
  AtengDateRangeExpose,
  DateRangeValue,
  DateRangeShortcut,
} from './types';
import { getDefaultDateRangeShortcuts } from './shortcuts';

defineOptions({
  name: 'AtengDateRange',
});

const props = withDefaults(defineProps<AtengDateRangeProps>(), {
  modelValue: undefined,
  start: undefined,
  end: undefined,
  clearValue: null,
  type: 'daterange',
  shortcuts: undefined,
  autoTime: true,
  valueFormat: undefined,
  format: undefined,
  placeholder: undefined,
  startPlaceholder: '开始日期',
  endPlaceholder: '结束日期',
  rangeSeparator: '-',
  disabled: false,
  clearable: true,
  size: undefined,
  defaultTime: undefined,
  disableFuture: false,
  disablePast: false,
  maxRangeDays: undefined,
  disabledDate: undefined,
});

const emit = defineEmits<AtengDateRangeEmits>();

const datePickerRef = shallowRef<InstanceType<typeof ElDatePicker> | null>(null);

/**
 * 内部状态值（用于双向绑定 Element Plus 日期选择器）。
 */
const internalValue = ref<[DateRangeValue, DateRangeValue] | null>(null);

/**
 * 当前选择面板中已选中的第一基准日期（用于 maxRangeDays 动态限制跨度）。
 */
const selectedBaseDate = ref<Date | null>(null);

/**
 * 监听外部传入的 modelValue 或解构的 start/end，并同步至内部选择器状态。
 * 针对表单重置（resetFields）与置空动作实现确定性清空联动。
 */
watch(
  () => [props.modelValue, props.start, props.end] as const,
  ([newModel, newStart, newEnd]) => {
    // 1. 若外部显式传入 modelValue 数组，优先对齐 modelValue
    if (
      Array.isArray(newModel) &&
      newModel.length === 2 &&
      newModel[0] != null &&
      newModel[1] != null &&
      newModel[0] !== '' &&
      newModel[1] !== ''
    ) {
      internalValue.value = [newModel[0], newModel[1]];
      return;
    }

    // 2. 若外部传入解构字段 start 与 end，对齐为内部数组
    if (newStart != null && newStart !== '' && newEnd != null && newEnd !== '') {
      internalValue.value = [newStart, newEnd];
      return;
    }

    // 3. 当外部字段被重置（置空、null 或 undefined）时，确定性清空内部状态
    const isStartEmpty = newStart == null || newStart === '';
    const isEndEmpty = newEnd == null || newEnd === '';
    const isModelEmpty =
      newModel == null ||
      (Array.isArray(newModel) &&
        (newModel.length === 0 || newModel[0] == null || newModel[0] === ''));

    if (isModelEmpty && (isStartEmpty || isEndEmpty)) {
      internalValue.value = null;
    }
  },
  { immediate: true },
);

/**
 * 计算实际生效的快捷区间列表。
 */
const resolvedShortcuts = computed<DateRangeShortcut[]>(() => {
  if (props.shortcuts === false) {
    return [];
  }
  if (Array.isArray(props.shortcuts)) {
    return props.shortcuts;
  }
  return getDefaultDateRangeShortcuts();
});

/**
 * 计算实际生效的时刻默认基准。
 * 当启用 autoTime 时，默认起始对齐 00:00:00，结束对齐 23:59:59。
 */
const resolvedDefaultTime = computed<[Date, Date] | undefined>(() => {
  if (props.defaultTime) {
    return props.defaultTime;
  }
  if (
    props.autoTime &&
    (props.type === 'daterange' || props.type === 'datetimerange' || !props.type)
  ) {
    return [new Date(2000, 0, 1, 0, 0, 0), new Date(2000, 0, 1, 23, 59, 59)];
  }
  return undefined;
});

/**
 * 综合禁用日期判定逻辑（整合用户自定义、禁用未来、禁用过去与最大跨度限制）。
 */
const effectiveDisabledDate = computed(() => {
  return (time: Date) => {
    // 1. 用户自定义 disabledDate 判定最高优先级
    if (typeof props.disabledDate === 'function' && props.disabledDate(time)) {
      return true;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 2. 禁用未来日期（大于今天 23:59:59 的时刻置灰）
    if (props.disableFuture) {
      const endOfToday = new Date(today);
      endOfToday.setHours(23, 59, 59, 999);
      if (time.getTime() > endOfToday.getTime()) {
        return true;
      }
    }

    // 3. 禁用过去日期（小于今天 00:00:00 的时刻置灰）
    if (props.disablePast) {
      if (time.getTime() < today.getTime()) {
        return true;
      }
    }

    // 4. 最大跨度天数限制 (选定第一天后动态限制)
    if (
      typeof props.maxRangeDays === 'number' &&
      props.maxRangeDays > 0 &&
      selectedBaseDate.value
    ) {
      const baseTime = selectedBaseDate.value.getTime();
      const oneDayMs = 24 * 3600 * 1000;
      const allowedSpanMs = (props.maxRangeDays - 1) * oneDayMs;
      const minAllowed = baseTime - allowedSpanMs;
      const maxAllowed = baseTime + allowedSpanMs;
      if (time.getTime() < minAllowed || time.getTime() > maxAllowed) {
        return true;
      }
    }

    return false;
  };
});

/**
 * 时刻边界智能对齐转换。
 */
function alignRange(
  rawStart: DateRangeValue,
  rawEnd: DateRangeValue,
): [DateRangeValue, DateRangeValue] {
  if (!props.autoTime || (props.type && props.type !== 'daterange')) {
    return [rawStart, rawEnd];
  }

  // 1. Date 原生实例对象模式
  if (rawStart instanceof Date && rawEnd instanceof Date) {
    const s = new Date(rawStart);
    s.setHours(0, 0, 0, 0);
    const e = new Date(rawEnd);
    e.setHours(23, 59, 59, 0);
    return [s, e];
  }

  // 2. 数值时间戳模式
  if (typeof rawStart === 'number' && typeof rawEnd === 'number') {
    const s = new Date(rawStart);
    s.setHours(0, 0, 0, 0);
    const e = new Date(rawEnd);
    e.setHours(23, 59, 59, 0);
    return [s.getTime(), e.getTime()];
  }

  // 3. 字符串格式化模式
  if (typeof rawStart === 'string' && typeof rawEnd === 'string') {
    const formatRequiresTime = props.valueFormat
      ? /HH|hh|mm|ss/.test(props.valueFormat)
      : rawStart.includes(':') ||
        rawEnd.includes(':') ||
        rawStart.includes(' ') ||
        rawEnd.includes(' ');

    if (formatRequiresTime) {
      let alignedStart = rawStart;
      let alignedEnd = rawEnd;

      if (/^\d{4}-\d{2}-\d{2}$/.test(alignedStart)) {
        alignedStart = `${alignedStart} 00:00:00`;
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(alignedEnd)) {
        alignedEnd = `${alignedEnd} 23:59:59`;
      } else if (/^(\d{4}-\d{2}-\d{2})\s+00:00:00$/.test(alignedEnd)) {
        alignedEnd = alignedEnd.replace(/\s+00:00:00$/, ' 23:59:59');
      }

      return [alignedStart, alignedEnd];
    }
  }

  return [rawStart, rawEnd];
}

/**
 * 处理选择器值更新事件，执行时间对齐并同步触发双轨双向绑定。
 */
function handlePickerUpdate(val: [DateRangeValue, DateRangeValue] | null | undefined): void {
  if (!val || !Array.isArray(val) || val.length < 2 || val[0] == null || val[1] == null) {
    internalValue.value = null;
    selectedBaseDate.value = null;
    const emptyFallback = props.clearValue !== undefined ? props.clearValue : null;
    emit('update:modelValue', null);
    emit('update:start', emptyFallback);
    emit('update:end', emptyFallback);
    emit('change', null);
    emit('clear');
    return;
  }

  const [alignedStart, alignedEnd] = alignRange(val[0], val[1]);
  internalValue.value = [alignedStart, alignedEnd];

  emit('update:modelValue', [alignedStart, alignedEnd]);
  emit('update:start', alignedStart);
  emit('update:end', alignedEnd);
}

function handleChange(val: [DateRangeValue, DateRangeValue] | null): void {
  if (!val || !Array.isArray(val) || val.length < 2 || val[0] == null || val[1] == null) {
    emit('change', null);
    return;
  }
  const [alignedStart, alignedEnd] = alignRange(val[0], val[1]);
  emit('change', [alignedStart, alignedEnd]);
}

function handleClear(): void {
  internalValue.value = null;
  selectedBaseDate.value = null;
  emit('clear');
}

function handleBlur(event: FocusEvent): void {
  emit('blur', event);
}

function handleFocus(event: FocusEvent): void {
  emit('focus', event);
}

function handleCalendarChange(dates: [Date, Date | null]): void {
  if (dates && dates[0] && !dates[1]) {
    selectedBaseDate.value = dates[0];
  } else {
    selectedBaseDate.value = null;
  }
  emit('calendar-change', dates);
}

function handlePanelChange(dates: [Date, Date], mode: string, view: string): void {
  emit('panel-change', dates, mode, view);
}

function handleVisibleChange(visibility: boolean): void {
  if (!visibility) {
    selectedBaseDate.value = null;
  }
  emit('visible-change', visibility);
}

function focus(): void {
  datePickerRef.value?.focus();
}

function handleOpen(): void {
  const picker = datePickerRef.value as Record<string, unknown> | null;
  if (picker && typeof picker.handleOpen === 'function') {
    (picker.handleOpen as () => void)();
  }
}

function handleClose(): void {
  const picker = datePickerRef.value as Record<string, unknown> | null;
  if (picker && typeof picker.handleClose === 'function') {
    (picker.handleClose as () => void)();
  }
}

defineExpose<AtengDateRangeExpose>({
  datePickerRef,
  focus,
  handleOpen,
  handleClose,
});
</script>

<template>
  <el-date-picker
    ref="datePickerRef"
    class="at-date-range"
    :model-value="internalValue"
    :type="type"
    :shortcuts="resolvedShortcuts"
    :default-time="resolvedDefaultTime"
    :value-format="valueFormat"
    :format="format"
    :placeholder="placeholder"
    :start-placeholder="startPlaceholder"
    :end-placeholder="endPlaceholder"
    :range-separator="rangeSeparator"
    :disabled="disabled"
    :clearable="clearable"
    :size="size"
    :disabled-date="effectiveDisabledDate"
    v-bind="$attrs"
    @update:model-value="handlePickerUpdate"
    @change="handleChange"
    @clear="handleClear"
    @blur="handleBlur"
    @focus="handleFocus"
    @calendar-change="handleCalendarChange"
    @panel-change="handlePanelChange"
    @visible-change="handleVisibleChange"
  >
    <template v-for="(_, slotName) in $slots" #[slotName]="slotProps">
      <slot :name="slotName" v-bind="slotProps" />
    </template>
  </el-date-picker>
</template>

<style scoped lang="scss">
.at-date-range {
  vertical-align: middle;
}
</style>
