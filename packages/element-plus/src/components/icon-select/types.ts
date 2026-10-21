/**
 * AtengIconSelect 通用图标选择器类型定义。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import type { Component } from 'vue';

export type IconSelectMode = 'popover' | 'dialog';

/**
 * 单个图标元数据对象。
 */
export interface IconItem {
  /**
   * 图标唯一名称标识（如 'User', 'Setting'）。
   */
  name: string;

  /**
   * 中文语义标签（如 '用户', '设置'）。
   */
  label?: string;

  /**
   * 汉语拼音或简拼（如 'yonghu', 'shezhi'），用于拼音检索。
   */
  pinyin?: string;

  /**
   * 原生 SVG 内部路径或纯 SVG 字符串（用于零依赖默认内建渲染）。
   */
  svgPath?: string;

  /**
   * 自定义 Vue 图标组件。
   */
  component?: Component;
}

/**
 * AtengIconSelect 属性接口。
 */
export interface AtengIconSelectProps {
  /**
   * 绑定的图标名称。
   */
  modelValue?: string;

  /**
   * 占位提示文案。
   * @default '请选择图标'
   */
  placeholder?: string;

  /**
   * 展现交互模式（浮窗 popover 或模态弹窗 dialog）。
   * @default 'popover'
   */
  mode?: IconSelectMode;

  /**
   * 是否支持一键清空。
   * @default true
   */
  clearable?: boolean;

  /**
   * 是否禁用选择器。
   * @default false
   */
  disabled?: boolean;

  /**
   * 输入框尺寸。
   */
  size?: 'large' | 'default' | 'small';

  /**
   * 自定义额外图标列表，若传入则与默认图标合并或直接覆盖。
   */
  customIcons?: IconItem[];

  /**
   * 弹层弹出宽度（popover 模式有效）。
   * @default '360px'
   */
  popoverWidth?: string | number;

  /**
   * 根容器自定义样式类名。
   */
  customClass?: string;
}

/**
 * AtengIconSelect 事件接口。
 */
export interface AtengIconSelectEmits {
  (e: 'update:modelValue', val: string): void;
  (e: 'change', val: string): void;
  (e: 'select', item: IconItem): void;
  (e: 'clear'): void;
}

/**
 * AtengIconSelect 插槽接口。
 */
export interface AtengIconSelectSlots {
  /**
   * 自定义前缀。
   */
  prefix?: () => unknown;

  /**
   * 自定义单项图标渲染。
   */
  icon?: (scope: { item: IconItem; selected: boolean }) => unknown;
}

/**
 * AtengIconSelect Expose 实例接口。
 */
export interface AtengIconSelectExpose {
  /**
   * 清空选中项。
   */
  clear: () => void;

  /**
   * 强制聚焦输入框。
   */
  focus: () => void;
}
