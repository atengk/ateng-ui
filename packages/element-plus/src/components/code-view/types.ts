/**
 * AtengCodeView 源码与数据高亮查看器类型定义。
 *
 * @author Ateng
 * @since 2026-10-21
 */

export type CodeViewLanguage =
  'json' | 'sql' | 'xml' | 'html' | 'javascript' | 'typescript' | 'text';

export type CodeViewTheme = 'dark' | 'light';

/**
 * AtengCodeView 属性接口。
 */
export interface AtengCodeViewProps {
  /**
   * 源代码或结构化数据内容（支持字符串或 JSON 对象/数组）。
   */
  code: string | object | unknown[] | null | undefined;

  /**
   * 语法高亮语言类型。
   * @default 'json'
   */
  language?: CodeViewLanguage;

  /**
   * 视觉主题。
   * @default 'dark'
   */
  theme?: CodeViewTheme;

  /**
   * 是否显示行号侧边栏。
   * @default true
   */
  lineNumbers?: boolean;

  /**
   * 是否提供一键复制按钮。
   * @default true
   */
  copyable?: boolean;

  /**
   * 是否自动折行。
   * @default true
   */
  wordWrap?: boolean;

  /**
   * 视口固定高度（如 '360px'）。
   */
  height?: string | number;

  /**
   * 视口最大高度（如 '500px'）。
   */
  maxHeight?: string | number;

  /**
   * 标题栏展示文案（若为空且 showHeader 为 true 时展示语言标识）。
   */
  title?: string;

  /**
   * 是否展示顶部标题/操作工具栏。
   * @default true
   */
  showHeader?: boolean;

  /**
   * JSON 格式化缩进空格数。
   * @default 2
   */
  indent?: number;

  /**
   * 根容器自定义样式类名。
   */
  customClass?: string;
}

/**
 * AtengCodeView 事件接口。
 */
export interface AtengCodeViewEmits {
  /**
   * 复制成功时触发。
   */
  (e: 'copy', text: string): void;
}

/**
 * AtengCodeView 插槽接口。
 */
export interface AtengCodeViewSlots {
  /**
   * 自定义标题栏左侧。
   */
  header?: (scope: { language: CodeViewLanguage; lineCount: number }) => unknown;

  /**
   * 自定义标题栏右侧操作区。
   */
  actions?: (scope: { copy: () => void }) => unknown;
}

/**
 * AtengCodeView Expose 实例接口。
 */
export interface AtengCodeViewExpose {
  /**
   * 命令式复制代码到剪贴板。
   */
  copy: () => Promise<boolean>;

  /**
   * 获取格式化后的纯文本代码字符串。
   */
  getRawCode: () => string;

  /**
   * 代码总行数。
   */
  lineCount: number;
}
