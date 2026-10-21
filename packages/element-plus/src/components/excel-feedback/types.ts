/**
 * Excel 导入错误明细与批注回写弹窗组件核心契约定义。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import type { Ref, ShallowRef } from 'vue';
import type { AtengDialogInstance } from '../dialog';

/**
 * 校验失败单条记录契约。
 */
export interface ExcelFeedbackItem {
  /**
   * Excel 所在行号（例如 2、3 等）。
   */
  rowNum: number | string;
  /**
   * 对应 Excel 列名称或字段名称（例如 "用户账号"、"手机号" 等）。
   */
  columnName?: string;
  /**
   * 校验失败的具体错误原因。
   */
  errorMessage: string;
  /**
   * 单元格原始值或提交值（可选）。
   */
  rawValue?: unknown;
}

/**
 * AtengExcelFeedback 属性输入契约。
 */
export interface AtengExcelFeedbackProps {
  /**
   * 控制弹窗显示与隐藏（支持 v-model）。
   */
  modelValue?: boolean;
  /**
   * 弹窗标题，默认为 "导入校验失败"。
   */
  title?: string;
  /**
   * 错误明细数据列表。
   */
  errors?: ExcelFeedbackItem[];
  /**
   * 批注 Excel 静态下载地址（fileUrl 模式）。
   */
  fileUrl?: string;
  /**
   * 批注 Excel 异步下载动作（返回 Blob 或流对象）。
   */
  downloadAction?: () => Promise<Blob | unknown>;
  /**
   * 下载文件的默认保存名称，默认为 "导入错误明细批注.xlsx"。
   */
  fileName?: string;
  /**
   * 弹窗宽度，默认为 "720px"。
   */
  width?: string | number;
  /**
   * 是否展示复制按钮，默认为 true。
   */
  showCopy?: boolean;
  /**
   * 复制按钮文本，默认为 "复制错误信息"。
   */
  copyText?: string;
  /**
   * 下载按钮文本，默认为 "下载标红批注 Excel"。
   */
  downloadText?: string;
  /**
   * 关闭按钮文本，默认为 "关闭"。
   */
  closeText?: string;
  /**
   * 表格分页每页条数，默认为 10。
   */
  pageSize?: number;
  /**
   * 是否在关闭时销毁弹窗内容，默认为 false。
   */
  destroyOnClose?: boolean;
  /**
   * 是否追加至 body，默认为 true。
   */
  appendToBody?: boolean;
}

/**
 * AtengExcelFeedback 事件派发契约。
 */
export interface AtengExcelFeedbackEmits {
  (e: 'update:modelValue', visible: boolean): void;
  (e: 'close'): void;
  (e: 'copy', text: string): void;
  (e: 'download-success', filename: string): void;
  (e: 'download-error', error: unknown): void;
}

/**
 * AtengExcelFeedback 对外暴露实例句柄。
 */
export interface AtengExcelFeedbackExpose {
  /**
   * 复制错误信息到剪贴板。
   */
  copyErrors: () => Promise<boolean>;
  /**
   * 触发下载标红批注 Excel 文件。
   */
  downloadAnnotatedExcel: () => Promise<boolean>;
  /**
   * 下载进行中状态。
   */
  downloadLoading: Ref<boolean>;
  /**
   * 底层 AtengDialog 容器实例引用。
   */
  dialogRef: ShallowRef<AtengDialogInstance | null>;
}
