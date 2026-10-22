/**
 * 结构化数据详情展示组件 AtengDescriptions 核心契约定义。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import type { VNode } from 'vue';
import type { ComponentSize } from 'element-plus';

/**
 * 预置脱敏类型。
 */
export type DescriptionsMaskType = 'phone' | 'idCard' | 'email' | 'name' | 'bankCard';

/**
 * 预置格式化类型。
 */
export type DescriptionsFormatType = 'currency' | 'date';

/**
 * 详情单项配置契约（Schema 模式）。
 *
 * @template T 宿主源数据实体模型类型
 */
export interface DescriptionsItemConfig<T = Record<string, unknown>> {
  /**
   * 对应 data 对象的字段名（如 'phone'、'username'）。
   */
  prop: string;
  /**
   * 标签文本。
   */
  label?: string;
  /**
   * 所占栅格列数（默认 1）。
   */
  span?: number;
  /**
   * 列宽度。
   */
  width?: string | number;
  /**
   * 列最小宽度。
   */
  minWidth?: string | number;
  /**
   * 内容对齐方式。
   */
  align?: 'left' | 'center' | 'right';
  /**
   * 标签对齐方式。
   */
  labelAlign?: 'left' | 'center' | 'right';
  /**
   * 自定义内容类名。
   */
  className?: string;
  /**
   * 自定义标签类名。
   */
  labelClassName?: string;
  /**
   * 预置脱敏管道类型。
   */
  mask?: DescriptionsMaskType;
  /**
   * 掩码字符（默认为 '*'）。
   */
  maskChar?: string;
  /**
   * 预置格式化类型。
   */
  type?: DescriptionsFormatType;
  /**
   * 金额精度（小数位数，默认为 2）。
   */
  currencyPrecision?: number;
  /**
   * 货币符号（默认为 '￥'）。
   */
  currencySymbol?: string;
  /**
   * 关联的字典编码（配置后自动联动 AtengDictTag 进行彩色状态标签渲染）。
   */
  dictCode?: string;
  /**
   * 单项专用的空值回退保底文本（未配置时继承容器的 emptyText）。
   */
  emptyText?: string;
  /**
   * 自定义格式化计算函数。
   */
  formatter?: (value: unknown, data: T) => string;
}

/**
 * AtengDescriptions 容器组件属性契约。
 *
 * @template T 宿主源数据实体模型类型
 */
export interface AtengDescriptionsProps<T = Record<string, unknown>> {
  /**
   * 待展示的源数据对象。
   */
  data?: T;
  /**
   * 纯数据驱动的项列表配置（Schema 模式）。
   */
  items?: DescriptionsItemConfig<T>[];
  /**
   * 详情标题。
   */
  title?: string;
  /**
   * 标题右侧扩展操作区文本。
   */
  extra?: string;
  /**
   * 是否带有边框。
   */
  border?: boolean;
  /**
   * 一行呈现的列数（默认为 3）。
   */
  column?: number;
  /**
   * 排列方向（'horizontal' 为水平，'vertical' 为垂直）。
   */
  direction?: 'horizontal' | 'vertical';
  /**
   * 组件尺寸。
   */
  size?: ComponentSize;
  /**
   * 全局空值或未定义时的保底文本（默认为 '-'）。
   */
  emptyText?: string;
}

/**
 * AtengDescriptionsItem 声明式子组件属性契约。
 */
export type AtengDescriptionsItemProps<T = Record<string, unknown>> = DescriptionsItemConfig<T>;

/**
 * AtengDescriptions 插槽契约。
 *
 * @template T 宿主源数据实体模型类型
 */
export interface AtengDescriptionsSlots<T = Record<string, unknown>> {
  title?: () => VNode[];
  extra?: () => VNode[];
  default?: () => VNode[];
  [itemSlotName: string]: ((props: { value: unknown; data: T }) => VNode[]) | undefined;
}

/**
 * AtengDescriptions 专有组件实例类型。
 *
 * @template _T 宿主源数据实体模型类型
 */
export type AtengDescriptionsInstance<_T = Record<string, unknown>> = Record<string, unknown>;
