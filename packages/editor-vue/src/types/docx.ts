/**
 * DOCX 物理分页排版预设与 A4 纸张仿真类型契约。
 *
 * 遵循四层洋葱拓扑之 L2 专用扩展层规范，提供纸张方向、边距预设、标尺及页眉页脚强类型接口。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import type { Editor } from '@tiptap/vue-3';
import type { EditorBaseProps } from './components';

/**
 * 纸张方向：纵向 (portrait) 或 横向 (landscape)。
 */
export type PageOrientation = 'portrait' | 'landscape';

/**
 * 预设页边距规格：
 * - standard (标准)：上下 25.4mm (1in)，左右 31.8mm (1.25in)
 * - narrow (窄)：上下 12.7mm (0.5in)，左右 12.7mm (0.5in)
 * - wide (宽)：上下 25.4mm (1in)，左右 50.8mm (2in)
 */
export type PageMarginPreset = 'standard' | 'narrow' | 'wide';

/**
 * 结构化自定义页边距配置接口。
 */
export interface PageMarginConfig {
  /** 顶边距（支持 CSS 单位，如 '25.4mm' 或 '96px'） */
  top?: string;
  /** 底边距 */
  bottom?: string;
  /** 左边距 */
  left?: string;
  /** 右边距 */
  right?: string;
}

/**
 * 页眉与页脚对齐方式。
 */
export type DocxHeaderFooterAlign = 'left' | 'center' | 'right';

/**
 * <AtengPageRuler /> 毫米刻度标尺组件入参 Props 接口。
 */
export interface AtengPageRulerProps {
  /** 当前标尺总宽度（单位 mm，纵向通常为 210，横向为 297） */
  width?: number;
  /** 左页边距宽度（单位 mm） */
  marginLeft?: number;
  /** 右页边距宽度（单位 mm） */
  marginRight?: number;
  /** 纸张方向 */
  orientation?: PageOrientation;
}

/**
 * <AtengPageCanvas /> A4 仿真纸张画布容器组件入参 Props 接口。
 */
export interface AtengPageCanvasProps {
  /** 纸张方向，默认 'portrait' */
  orientation?: PageOrientation;
  /** 页边距预设或自定义配置，默认 'standard' */
  pageMargin?: PageMarginPreset | PageMarginConfig;
  /** 是否展示顶部毫米标尺，默认 true */
  showRuler?: boolean;
  /** 页眉文本内容 */
  header?: string;
  /** 页脚文本内容 */
  footer?: string;
  /** 是否展示动态页码标签，默认 true */
  showPageNumber?: boolean;
  /** 页眉文字对齐方式，默认 'center' */
  headerAlign?: DocxHeaderFooterAlign;
  /** 页脚文字对齐方式，默认 'center' */
  footerAlign?: DocxHeaderFooterAlign;
  /** 是否禁用页眉页脚交互式双击编辑，默认 false */
  editableHeaderFooter?: boolean;
}

/**
 * <AtengDocxEditor /> 场景预设组件入参 Props 接口。
 */
export interface DocxEditorProps extends EditorBaseProps {
  /**
   * 纸张方向，默认 'portrait'。
   * @default 'portrait'
   */
  orientation?: PageOrientation;

  /**
   * 页面边距预设或自定义，默认 'standard'。
   * @default 'standard'
   */
  pageMargin?: PageMarginPreset | PageMarginConfig;

  /**
   * 是否展示顶部毫米标尺，默认 true。
   * @default true
   */
  showRuler?: boolean;

  /**
   * 页眉文本内容，支持双击交互式编辑。
   */
  header?: string;

  /**
   * 页脚文本内容，支持双击交互式编辑。
   */
  footer?: string;

  /**
   * 是否展示动态页码（第 X 页 / 共 Y 页），默认 true。
   * @default true
   */
  showPageNumber?: boolean;

  /**
   * 页眉文字对齐方式，默认 'center'。
   * @default 'center'
   */
  headerAlign?: DocxHeaderFooterAlign;

  /**
   * 页脚文字对齐方式，默认 'center'。
   * @default 'center'
   */
  footerAlign?: DocxHeaderFooterAlign;

  /**
   * 是否展示顶部微操作栏，默认 true。
   * @default true
   */
  showToolbar?: boolean;

  /**
   * 是否展示底部状态栏，默认 true。
   * @default true
   */
  showStatusBar?: boolean;

  /**
   * 是否启用表格动态上下文微浮层菜单，默认 true。
   * @default true
   */
  showTableMenu?: boolean;

  /**
   * 是否启用超链接动态上下文微浮层菜单，默认 true。
   * @default true
   */
  showLinkMenu?: boolean;

  /**
   * 是否启用图片动态上下文微浮层菜单，默认 true。
   * @default true
   */
  showImageMenu?: boolean;

  /**
   * 是否启用划选文本高频排版微浮层菜单，默认 true。
   * @default true
   */
  showBubbleMenu?: boolean;
}

/**
 * <AtengDocxEditor /> 场景预设组件对外事件 Emits 接口。
 */
export interface DocxEditorEmits {
  (e: 'update:modelValue', value: string): void;
  (e: 'update:markdown', value: string): void;
  (e: 'update:json', value: Record<string, unknown>): void;
  (e: 'update:header', value: string): void;
  (e: 'update:footer', value: string): void;
  (e: 'pageCountChange', totalPages: number): void;
}

/**
 * <AtengDocxEditor /> 组件对外暴露的 Ref 实例方法与状态接口。
 */
export interface AtengDocxEditorMethods {
  /** TipTap 核心实例 */
  editor: Editor | null;
  /** 当前总页数 */
  totalPages: number;
  /** 当前纸张方向 */
  orientation: PageOrientation;
  /** 调起原生浏览器 A4 物理分页打印预览 */
  print: () => void;
  /** 获取焦点 */
  focus: () => void;
  /** 清空正文内容 */
  clear: () => void;
  /** 清空正文内容（对齐 useEditor 契约） */
  clearContent: () => void;
}
