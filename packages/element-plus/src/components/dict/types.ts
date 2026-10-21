/**
 * 字典管理门面与 AtengDict* 字典套件核心契约定义。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import type { Ref, ShallowRef, ComputedRef } from 'vue';
import type { ComponentSize, ElSelect, ElRadioGroup } from 'element-plus';

/**
 * 字典单项数据契约。
 */
export interface DictItem {
  /**
   * 字典项显示标签。
   */
  label: string;
  /**
   * 字典项真实键值。
   */
  value: string | number | boolean;
  /**
   * 字典项映射的 Element Plus Tag 语义色彩类别。
   */
  tagType?: 'success' | 'warning' | 'info' | 'primary' | 'danger' | '' | undefined;
  /**
   * 是否禁用该字典项。
   */
  disabled?: boolean;
  /**
   * 自定义扩展 CSS 类名。
   */
  cssClass?: string;
  /**
   * 原始元数据引用。
   */
  raw?: unknown;
}

/**
 * 全局字典提供者函数签名。
 */
export type DictProvider = (code: string) => Promise<DictItem[]>;

/**
 * 组件局部字典加载函数签名。
 */
export type DictLoader = () => Promise<DictItem[]>;

/**
 * AtengDictSelect 下拉选择组件属性契约。
 */
export interface AtengDictSelectProps {
  /**
   * 字典业务编码（如 'sys_user_gender'）。
   */
  dictCode?: string;
  /**
   * 局部覆盖的字典加载函数。
   */
  loader?: DictLoader;
  /**
   * 静态字典选项数组（最高优先级）。
   */
  options?: DictItem[];
  /**
   * 双向绑定值（单选为基础类型，多选为数组）。
   */
  modelValue?: string | number | boolean | Array<string | number | boolean>;
  /**
   * 是否支持多选。
   */
  multiple?: boolean;
  /**
   * 占位提示文本。
   */
  placeholder?: string;
  /**
   * 是否整体禁用。
   */
  disabled?: boolean;
  /**
   * 是否支持一键清空。
   */
  clearable?: boolean;
  /**
   * 是否开启输入筛选搜索。
   */
  filterable?: boolean;
  /**
   * 组件尺寸。
   */
  size?: ComponentSize;
  /**
   * 外部受控的 loading 状态覆盖。
   */
  loading?: boolean;
  /**
   * 多选时是否折叠 tag。
   */
  collapseTags?: boolean;
  /**
   * 折叠 tags 的最大保留展示数量。
   */
  maxCollapseTags?: number;
  /**
   * 是否在组件挂载时自动触发字典加载。
   */
  autoLoad?: boolean;
}

/**
 * AtengDictSelect 下拉选择组件事件契约。
 */
export interface AtengDictSelectEmits {
  (
    e: 'update:modelValue',
    value: string | number | boolean | Array<string | number | boolean> | undefined,
  ): void;
  (
    e: 'change',
    value: string | number | boolean | Array<string | number | boolean> | undefined,
  ): void;
  (e: 'clear'): void;
}

/**
 * AtengDictSelect 对外暴露实例。
 */
export interface AtengDictSelectExpose {
  /**
   * 强制穿透缓存刷新字典数据。
   */
  refresh: () => Promise<DictItem[]>;
  /**
   * 底层 ElSelect 实例引用。
   */
  selectRef: ShallowRef<InstanceType<typeof ElSelect> | null>;
  /**
   * 当前加载解析完成的字典选项列表。
   */
  dictItems: ShallowRef<DictItem[]>;
  /**
   * 内部 loading 状态。
   */
  isLoading: Ref<boolean>;
}

/**
 * AtengDictSelect 专有组件实例类型。
 */
export type AtengDictSelectInstance = AtengDictSelectExpose;

/**
 * AtengDictRadio 单选框组组件属性契约。
 */
export interface AtengDictRadioProps {
  /**
   * 字典业务编码。
   */
  dictCode?: string;
  /**
   * 局部覆盖的字典加载函数。
   */
  loader?: DictLoader;
  /**
   * 静态字典选项数组。
   */
  options?: DictItem[];
  /**
   * 双向绑定值。
   */
  modelValue?: string | number | boolean;
  /**
   * 是否使用按钮风格单选。
   */
  button?: boolean;
  /**
   * 组件尺寸。
   */
  size?: ComponentSize;
  /**
   * 是否整体禁用。
   */
  disabled?: boolean;
  /**
   * 是否自动触发加载。
   */
  autoLoad?: boolean;
}

/**
 * AtengDictRadio 单选框组组件事件契约。
 */
export interface AtengDictRadioEmits {
  (e: 'update:modelValue', value: string | number | boolean | undefined): void;
  (e: 'change', value: string | number | boolean | undefined): void;
}

/**
 * AtengDictRadio 对外暴露实例。
 */
export interface AtengDictRadioExpose {
  /**
   * 强制刷新字典数据。
   */
  refresh: () => Promise<DictItem[]>;
  /**
   * 底层 ElRadioGroup 实例引用。
   */
  radioGroupRef: ShallowRef<InstanceType<typeof ElRadioGroup> | null>;
  /**
   * 当前字典项列表。
   */
  dictItems: ShallowRef<DictItem[]>;
  /**
   * 内部 loading 状态。
   */
  isLoading: Ref<boolean>;
}

/**
 * AtengDictRadio 专有组件实例类型。
 */
export type AtengDictRadioInstance = AtengDictRadioExpose;

/**
 * AtengDictTag 彩色状态标签展示组件属性契约。
 */
export interface AtengDictTagProps {
  /**
   * 字典业务编码。
   */
  dictCode?: string;
  /**
   * 局部覆盖的字典加载函数。
   */
  loader?: DictLoader;
  /**
   * 静态字典选项数组。
   */
  options?: DictItem[];
  /**
   * 待映射展示的当前状态值（支持单值、多值数组、逗号分隔多值字符串）。
   */
  value?: string | number | boolean | Array<string | number | boolean> | null | undefined;
  /**
   * 标签尺寸。
   */
  size?: ComponentSize;
  /**
   * 主题风格。
   */
  effect?: 'light' | 'dark' | 'plain';
  /**
   * 是否圆角。
   */
  round?: boolean;
  /**
   * 字符串多值分隔符（默认为 ','）。
   */
  separator?: string;
  /**
   * 未匹配或值为空时的空安全保底文本（默认为 '-'）。
   */
  emptyText?: string;
  /**
   * 是否自动触发加载。
   */
  autoLoad?: boolean;
}

/**
 * AtengDictTag 对外暴露实例。
 */
export interface AtengDictTagExpose {
  /**
   * 强制刷新字典数据。
   */
  refresh: () => Promise<DictItem[]>;
  /**
   * 当前字典项列表。
   */
  dictItems: ShallowRef<DictItem[]>;
  /**
   * 当前匹配成功的字典项列表。
   */
  matchingItems: ComputedRef<DictItem[]>;
  /**
   * 内部 loading 状态。
   */
  isLoading: Ref<boolean>;
}

/**
 * AtengDictTag 专有组件实例类型。
 */
export type AtengDictTagInstance = AtengDictTagExpose;

/**
 * AtengDictCheckbox 多选框组组件属性契约。
 */
export interface AtengDictCheckboxProps {
  /**
   * 字典业务编码。
   */
  dictCode?: string;
  /**
   * 局部覆盖的字典加载函数。
   */
  loader?: DictLoader;
  /**
   * 静态字典选项数组。
   */
  options?: DictItem[];
  /**
   * 双向绑定值（支持数组，或配合 separator 的字符串）。
   */
  modelValue?: Array<string | number | boolean> | string;
  /**
   * 字符串多值分隔符（设置后支持双向绑定字符串，如 ','）。
   */
  separator?: string;
  /**
   * 是否使用按钮风格多选。
   */
  button?: boolean;
  /**
   * 是否展示全选复选框。
   */
  showCheckAll?: boolean;
  /**
   * 全选复选框文案。
   * @default '全选'
   */
  checkAllText?: string;
  /**
   * 组件尺寸。
   */
  size?: ComponentSize;
  /**
   * 是否整体禁用。
   */
  disabled?: boolean;
  /**
   * 是否自动触发加载。
   */
  autoLoad?: boolean;
}

/**
 * AtengDictCheckbox 多选框组组件事件契约。
 */
export interface AtengDictCheckboxEmits {
  (e: 'update:modelValue', value: Array<string | number | boolean> | string | undefined): void;
  (e: 'change', value: Array<string | number | boolean> | string | undefined): void;
}

/**
 * AtengDictCheckbox 对外暴露实例。
 */
export interface AtengDictCheckboxExpose {
  /**
   * 强制刷新字典数据。
   */
  refresh: () => Promise<DictItem[]>;
  /**
   * 当前字典项列表。
   */
  dictItems: ShallowRef<DictItem[]>;
  /**
   * 内部 loading 状态。
   */
  isLoading: Ref<boolean>;
}

/**
 * AtengDictCheckbox 专有组件实例类型。
 */
export type AtengDictCheckboxInstance = AtengDictCheckboxExpose;
