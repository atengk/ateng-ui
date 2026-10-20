/**
 * 文件处理与安全下载配置契约定义。
 *
 * @author Ateng
 * @since 2026-10-19
 */

/**
 * saveBlobAsFile 下载行为配置选项。
 */
export interface SaveBlobOptions {
  /**
   * 自动释放 Object URL 内存临时句柄的延迟毫秒数，默认为 1000ms。
   * 传入 0 或负数时将在触发下载后同步立即释放。
   */
  revokeDelay?: number;
}

/**
 * 大文件切片元数据实体。
 */
export interface FileChunk {
  /**
   * 当前切片的二进制数据块。
   */
  chunk: Blob;

  /**
   * 当前切片序号（从 0 开始）。
   */
  index: number;

  /**
   * 当前切片在原文件中的起始字节偏移量。
   */
  start: number;

  /**
   * 当前切片在原文件中的结束字节偏移量（不含）。
   */
  end: number;

  /**
   * 当前切片字节大小。
   */
  size: number;

  /**
   * 原文件的总切片数。
   */
  totalChunks: number;
}

/**
 * 单个切片上传完成的结果实体。
 */
export interface UploadChunkResult<T = unknown> {
  /**
   * 切片序号。
   */
  index: number;

  /**
   * 该切片上传接口返回的业务载荷结果。
   */
  result?: T;
}

/**
 * 切片并发上传协调器配置选项。
 */
export interface UploadCoordinatorOptions<T = unknown> {
  /**
   * 最大并发上传连接数，默认为 3。
   */
  concurrency?: number;

  /**
   * 单个切片失败时的最大重试次数，默认为 3。
   */
  maxRetries?: number;

  /**
   * 单个切片失败重试的基础延迟等待时间（毫秒），默认为 1000。
   */
  retryDelay?: number;

  /**
   * 单个切片上传执行器函数。
   *
   * @param chunk 当前切片元数据
   * @param signal 可选的中断信号
   * @returns 上传响应结果 Promise
   */
  uploadChunk: (chunk: FileChunk, signal?: AbortSignal) => Promise<T>;

  /**
   * 整体上传进度加权回调函数。
   *
   * @param percent 总体上传完成百分比 (0 - 100)
   * @param loaded 当前已上传完成的总字节数
   * @param total 文件总字节数
   */
  onProgress?: (percent: number, loaded: number, total: number) => void;

  /**
   * 单个切片上传成功时的通知回调。
   *
   * @param chunk 当前切片
   * @param result 该切片上传返回值
   */
  onChunkSuccess?: (chunk: FileChunk, result: T) => void;

  /**
   * 单个切片发生异常触发局部重试时的通知回调。
   *
   * @param chunk 当前切片
   * @param retryCount 当前重试次数序号
   * @param error 捕获到的异常对象
   */
  onChunkRetry?: (chunk: FileChunk, retryCount: number, error: Error) => void;
}

/**
 * 大文件切片与并发上传协调器门面接口。
 */
export interface IUploadCoordinator<T = unknown> {
  /**
   * 对指定的切片列表执行受控并发上传。
   *
   * @param chunks 切片数组
   * @param signal 可选的取消控制信号
   * @returns 排序后的切片上传结果列表
   */
  upload(chunks: FileChunk[], signal?: AbortSignal): Promise<UploadChunkResult<T>[]>;

  /**
   * 一站式大文件切片并执行受控并发上传。
   *
   * @param file 待上传的文件或 Blob
   * @param chunkSize 单个切片大小（字节）
   * @param signal 可选的取消控制信号
   * @returns 排序后的切片上传结果列表
   */
  uploadFile(
    file: File | Blob,
    chunkSize?: number,
    signal?: AbortSignal,
  ): Promise<UploadChunkResult<T>[]>;
}
