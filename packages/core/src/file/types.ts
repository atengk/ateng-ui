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
