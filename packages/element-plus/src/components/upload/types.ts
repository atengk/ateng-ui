/**
 * 多源大文件切片上传与直传增强套件 AtengUpload 核心类型契约定义。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import type { ShallowRef, DeepReadonly, Ref } from 'vue';
import type {
  ElUpload,
  UploadFile,
  UploadFiles,
  UploadUserFile,
  UploadRawFile,
  UploadProgressEvent,
} from 'element-plus';
import type { UploadChunkItem, UploadStatus } from '@atengk/vue';
import type { UploadChunkResult } from '@atengk/core';

/**
 * 自定义分片合并参数契约。
 */
export interface UploadMergeParams<T = unknown> {
  /**
   * 待合并的原始文件实体。
   */
  file: File | Blob;
  /**
   * 对应已上传完成的全部分片状态列表。
   */
  chunks: UploadChunkItem<T>[];
  /**
   * 总分片数量。
   */
  totalChunks: number;
}

/**
 * AtengUpload 组件输入属性契约。
 */
export interface AtengUploadProps<T = unknown> {
  /**
   * 是否开启大文件分片切片模式，默认为 false（原生直传增强）。
   */
  chunk?: boolean;
  /**
   * 单个切片字节大小，默认为 5MB (5 * 1024 * 1024 字节)。
   */
  chunkSize?: number;
  /**
   * 最大并发上传连接数，默认为 3。
   */
  concurrency?: number;
  /**
   * 单个切片失败时的最大重试次数，默认为 3。
   */
  maxRetries?: number;
  /**
   * 单个切片重试基础延迟等待时间（毫秒），默认为 1000ms。
   */
  retryDelay?: number;
  /**
   * 分片切片模式下的自定义上传执行器。
   */
  customUploadChunk?: (chunk: UploadChunkItem<T>, signal?: AbortSignal) => Promise<T>;
  /**
   * 全部分片上传成功后的自定义合并接口回调。
   */
  customMerge?: (params: UploadMergeParams<T>) => Promise<unknown>;
  /**
   * 文件最大允许字节大小（如 10 * 1024 * 1024 为 10MB），超出自动前置防御拦截。
   */
  maxSize?: number;
  /**
   * 允许上传的文件格式或 MIME 类型过滤串（如 "image/*,.pdf,.xlsx"）。
   */
  accept?: string;
  /**
   * 是否开启文件在线预览灯箱（集成 AtengFilePreview），默认为 true。
   */
  showPreview?: boolean;
  /**
   * 文件预览弹窗标题，默认为 "文件预览"（未指定时优先取文件名）。
   */
  previewTitle?: string;
  /**
   * 文件预览弹窗宽度，默认为 '80%'。
   */
  previewDialogWidth?: string | number;
  /**
   * 文件预览视口高度，默认为 '520px'。
   */
  previewHeight?: string | number;
  /**
   * 文件预览弹窗中是否展示一键下载按钮，默认为 true。
   */
  previewDownloadable?: boolean;
  /**
   * 点击预览文件之前的钩子。若返回 false 则阻断默认预览弹窗弹出。
   */
  beforePreview?: (file: UploadFile) => boolean | void | Promise<boolean | void>;
  /**
   * 分片模式下是否展示各个分片的进度明细列表，默认为 true。
   */
  showChunkList?: boolean;
  /**
   * 上传请求目标 URL（分片模式下通常为空或自定义）。
   */
  action?: string;
  /**
   * 请求头配置。
   */
  headers?: Record<string, string>;
  /**
   * 请求方式，默认为 'POST'。
   */
  method?: string;
  /**
   * 是否支持多选文件，默认为 false。
   */
  multiple?: boolean;
  /**
   * 上传时附带的额外参数载荷。
   */
  data?:
    | Record<string, unknown>
    | ((rawFile: UploadRawFile) => Record<string, unknown> | Promise<Record<string, unknown>>);
  /**
   * 上传的文件字段名，默认为 'file'。
   */
  name?: string;
  /**
   * 是否支持发送 Cookie 凭证信息，默认为 false。
   */
  withCredentials?: boolean;
  /**
   * 是否展示已上传文件列表，默认为 true。
   */
  showFileList?: boolean;
  /**
   * 是否启用拖拽上传，默认为 false。
   */
  drag?: boolean;
  /**
   * 是否禁用上传。
   */
  disabled?: boolean;
  /**
   * 最大允许上传文件数量。
   */
  limit?: number;
  /**
   * 文件列表类型，默认为 'text'。可选 'text' | 'picture' | 'picture-card'。
   */
  listType?: 'text' | 'picture' | 'picture-card';
  /**
   * 是否在选取文件后自动上传，默认为 true。
   */
  autoUpload?: boolean;
  /**
   * 默认已上传文件列表（支持 v-model:file-list）。
   */
  fileList?: UploadUserFile[];
  /**
   * 上传文件之前的钩子。
   */
  beforeUpload?: (
    rawFile: UploadRawFile,
  ) => boolean | void | Promise<boolean | void | UploadRawFile>;
  /**
   * 删除文件之前的钩子。
   */
  beforeRemove?: (uploadFile: UploadFile, uploadFiles: UploadFiles) => boolean | Promise<boolean>;
}

/**
 * AtengUpload 事件派发契约。
 */
export interface AtengUploadEmits<T = unknown> {
  (e: 'update:fileList', fileList: UploadUserFile[]): void;
  (e: 'change', uploadFile: UploadFile, uploadFiles: UploadFiles): void;
  (e: 'preview', uploadFile: UploadFile): void;
  (e: 'preview-close'): void;
  (e: 'remove', uploadFile: UploadFile, uploadFiles: UploadFiles): void;
  (e: 'success', response: unknown, uploadFile: UploadFile, uploadFiles: UploadFiles): void;
  (e: 'error', error: Error, uploadFile: UploadFile, uploadFiles: UploadFiles): void;
  (e: 'progress', evt: UploadProgressEvent, uploadFile: UploadFile, uploadFiles: UploadFiles): void;
  (e: 'exceed', files: File[], uploadFiles: UploadUserFile[]): void;
  (e: 'chunk-progress', progress: number, loadedBytes: number, totalBytes: number): void;
  (e: 'chunk-success', results: UploadChunkResult<T>[] | unknown): void;
  (e: 'chunk-error', error: unknown): void;
  (e: 'status-change', status: UploadStatus): void;
  (e: 'size-exceed', file: File, maxSize: number): void;
  (e: 'type-reject', file: File, accept: string): void;
}

/**
 * AtengUpload 对外暴露的控制门面。
 */
export interface AtengUploadExpose<T = unknown> {
  /**
   * 底层 ElUpload 原生组件引用。
   */
  uploadRef: ShallowRef<InstanceType<typeof ElUpload> | null>;
  /**
   * 当前分片状态机状态。
   */
  uploadStatus: DeepReadonly<Ref<UploadStatus>>;
  /**
   * 当前切片总进度百分比 (0 - 100)。
   */
  chunkProgress: DeepReadonly<Ref<number>>;
  /**
   * 是否正在上传中。
   */
  uploading: DeepReadonly<Ref<boolean>>;
  /**
   * 响应式切片状态列表。
   */
  chunks: DeepReadonly<Ref<UploadChunkItem<T>[]>>;
  /**
   * 手动触发分片上传。
   */
  uploadChunkFile: (file: File | Blob) => Promise<UploadChunkResult<T>[]>;
  /**
   * 暂停在途切片上传。
   */
  pause: () => void;
  /**
   * 恢复切片上传。
   */
  resume: () => Promise<UploadChunkResult<T>[]>;
  /**
   * 取消当前切片上传。
   */
  cancel: () => void;
  /**
   * 重置分片状态机。
   */
  reset: () => void;
  /**
   * 清空文件列表。
   */
  clearFiles: () => void;
  /**
   * 手动提交上传。
   */
  submit: () => void;
  /**
   * 手动呼出预览灯箱预览指定文件。
   */
  previewFile: (file: UploadFile) => Promise<void>;
  /**
   * 关闭当前展示的文件预览灯箱。
   */
  closePreview: () => void;
}
