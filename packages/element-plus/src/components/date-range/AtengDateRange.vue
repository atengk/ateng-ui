<script setup lang="ts">
/**
 * 企业级快捷时间范围选择器组件。
 *
 * 核心特性：
 * 1. 双模数据绑定：同时支持标准数组 v-model="range" 与 v-model:start="s" / v-model:end="e" 双字段解构绑定；
 * 2. 预置快捷自然时间跨度：内置今天、昨天、本周、上周、本月、近7天、近30天快捷筛选；
 * 3. 智能时刻边界对齐：daterange 模式下起始自动补全 00:00:00，结束自动补全 23:59:59；
 * 4. 深度原生透传：100% 继承 ElDatePicker 的全部属性、插槽与事件派发。
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
  disabledDate: undefined,
});

const emit = defineEmits<AtengDateRangeEmits>();

const datePickerRef = shallowRef<InstanceType<typeof ElDatePicker> | null>(null);

/**
 * 内部状态值（用于双向绑定 Element Plus 日期选择器）。
 */
const internalValue = ref<[DateRangeValue, DateRangeValue] | null>(null);

/**
 * 监听外部传入的 modelValue 或解构的 start/end，并同步至内部选择器状态。
 */
watch(
  () => [props.modelValue, props.start, props.end] as const,
  ([newModel, newStart, newEnd]) => {
    // 1. 若外部显式传入 modelValue 数组，优先对齐 modelValue
    if (
      Array.isArray(newModel) &&
      newModel.length === 2 &&
      newModel[0] != null &&
      newModel[1] != null
    ) {
      internalValue.value = [newModel[0], newModel[1]];
      return;
    }

    // 2. 若外部传入解构字段 start 与 end，对齐为内部数组
    if (newStart != null && newStart !== '' && newEnd != null && newEnd !== '') {
      internalValue.value = [newStart, newEnd];
      return;
    }

    // 3. 当 modelValue 为 null，或者 start 与 end 同时为空时，清空内部状态
    if (newModel === null || (newStart == null && newEnd == null)) {
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
  emit('clear');
}

function handleBlur(event: FocusEvent): void {
  emit('blur', event);
}

function handleFocus(event: FocusEvent): void {
  emit('focus', event);
}

function handleCalendarChange(dates: [Date, Date | null]): void {
  emit('calendar-change', dates);
}

function handlePanelChange(dates: [Date, Date], mode: string, view: string): void {
  emit('panel-change', dates, mode, view);
}

function handleVisibleChange(visibility: boolean): void {
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
    :disabled-date="disabledDate"
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
