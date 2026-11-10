/**
 * 剪贴板位图图像嗅探与提取守卫。
 *
 * 遵循 ADR-0048 规范，从原生 ClipboardEvent 中嗅探并提取用户复制的截图或图像文件，
 * 支持快捷键 Ctrl+V / Cmd+V 快速粘贴直接进入裁剪流水线。
 *
 * @author Ateng
 * @since 2026-11-10
 */

export class ClipboardReceiver {
  /**
   * 从剪贴板事件中提取第一张有效的图片文件。
   *
   * @param event 原生 ClipboardEvent 事件对象
   * @returns 提取出的 File 实例，若未检测到有效图片则返回 null
   */
  public static extractImage(event: ClipboardEvent): File | null {
    const items = event.clipboardData?.items;
    if (!items || items.length === 0) {
      return null;
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item && item.type && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          return file;
        }
      }
    }

    return null;
  }
}
