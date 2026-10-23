/**
 * 日期范围选择器组件 AtengDateRange 核心类型与契约定义。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import type { ShallowRef } from 'vue';
import type { ComponentSize, ElDatePicker } from 'element-plus';

/**
 * 日期范围值基础类型（支持字符串格式化、数值时间戳或原生 Date 对象）。
 */
export type DateRangeValue = string | number | Date;

/**
 * 快捷自然时间跨度配置项契约。
 */
export interface DateRangeShortcut {
  /**
   * 快捷项文案展示（如“今天”、“近7天”）。
   */
  text: string;
  /**
   * 快捷区间计算函数或直接的日期元组。
   */
  value: [Date, Date] | (() => [Date, Date]);
  /**
   * 点击回调钩子。
   */
  onClick?: (ctx: { date: [Date, Date] }) => void;
}

/**
 * AtengDateRange 组件输入属性契约。
 */
export interface AtengDateRangeProps {
  /**
   * 绑定值（数组模式：[start, end]）。
   */
  modelValue?: [DateRangeValue, DateRangeValue] | null;
  /**
   * 双字段解构：起始时间。
   */
  start?: DateRangeValue | null;
  /**
   * 双字段解构：结束时间。
   */
  end?: DateRangeValue | null;
  /**
   * 清空时的保底值（默认为 null）。
   */
  clearValue?: null | undefined | '';
  /**
   * 选择器类型，默认 'daterange'。支持 'daterange' | 'datetimerange' | 'monthrange' 等。
   */
  type?: 'daterange' | 'datetimerange' | 'monthrange';
  /**
   * 是否启用常用快捷自然时间跨度（今天、昨天、本周、上周、本月、近7天、近30天），默认 true。
   * 也可直接传入自定义的 DateRangeShortcut 数组，或设为 false 禁用。
   */
  shortcuts?: boolean | DateRangeShortcut[];
  /**
   * 是否自动对齐时刻边界（默认 true）。
   * 当 type="daterange" 且格式包含时间时，起始日期自动对齐为当天 00:00:00，结束日期自动对齐为当天 23:59:59。
   */
  autoTime?: boolean;
  /**
   * 绑定值的格式化模式（如 'YYYY-MM-DD HH:mm:ss' 或 'YYYY-MM-DD'）。
   */
  valueFormat?: string;
  /**
   * 界面展示格式（如 'YYYY-MM-DD' 或 'YYYY-MM-DD HH:mm:ss'）。
   */
  format?: string;
  /**
   * 输入框占位符提示文本。
   */
  placeholder?: string;
  /**
   * 范围选择时开始日期的占位内容。
   */
  startPlaceholder?: string;
  /**
   * 范围选择时结束日期的占位内容。
   */
  endPlaceholder?: string;
  /**
   * 分隔符文本，默认 '-'。
   */
  rangeSeparator?: string;
  /**
   * 是否禁用。
   */
  disabled?: boolean;
  /**
   * 是否可清空，默认 true。
   */
  clearable?: boolean;
  /**
   * 输入框尺寸。
   */
  size?: ComponentSize;
  /**
   * 原生默认时间时刻配置。若未指定且 autoTime 为 true，日期范围默认填充 [00:00:00, 23:59:59]。
   */
  defaultTime?: [Date, Date];
  /**
   * 是否禁用未来日期（大于今天 23:59:59 的日期置灰），默认为 false。
   */
  disableFuture?: boolean;
  /**
   * 是否禁用过去日期（小于今天 00:00:00 的日期置灰），默认为 false。
   */
  disablePast?: boolean;
  /**
   * 最大允许选择的时间跨度天数（例如 90 天）。选定起始日期后自动动态置灰超出范围的日期。
   */
  maxRangeDays?: number;
  /**
   * 禁用日期函数。
   */
  disabledDate?: (date: Date) => boolean;
}

/**
 * AtengDateRange 事件派发契约。
 */
export interface AtengDateRangeEmits {
  (e: 'update:modelValue', value: [DateRangeValue, DateRangeValue] | null): void;
  (e: 'update:start', value: DateRangeValue | null | undefined): void;
  (e: 'update:end', value: DateRangeValue | null | undefined): void;
  (e: 'change', value: [DateRangeValue, DateRangeValue] | null): void;
  (e: 'clear'): void;
  (e: 'blur', event: FocusEvent): void;
  (e: 'focus', event: FocusEvent): void;
  (e: 'calendar-change', dates: [Date, Date | null]): void;
  (e: 'panel-change', dates: [Date, Date], mode: string, view: string): void;
  (e: 'visible-change', visibility: boolean): void;
}

/**
 * AtengDateRange 对外暴露的方法与句柄契约。
 */
export interface AtengDateRangeExpose {
  /**
   * 原生 ElDatePicker 实例引用。
   */
  datePickerRef: ShallowRef<InstanceType<typeof ElDatePicker> | null>;
  /**
   * 聚焦方法。
   */
  focus: () => void;
  /**
   * 手动触发打开选择面板。
   */
  handleOpen: () => void;
  /**
   * 手动触发关闭选择面板。
   */
  handleClose: () => void;
}
