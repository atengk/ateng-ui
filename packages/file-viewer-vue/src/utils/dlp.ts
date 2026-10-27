/**
 * 四维 DLP (Data Loss Prevention) 权限控制与事件拦截引擎。
 *
 * 针对下载、打印、复制与右键菜单实施物理硬拦截与 CSS 抑制防线。
 *
 * @author Ateng
 * @since 2026-10-26
 */

export interface DlpOptions {
  /** 是否允许下载 (为 false 时拦截 Ctrl+S / Cmd+S) */
  downloadable?: boolean;
  /** 是否允许打印 (为 false 时拦截 Ctrl+P / Cmd+P 并注入打印抑制类) */
  printable?: boolean;
  /** 是否允许复制 (为 false 时拦截 copy / cut / selectstart 并注入防选择类) */
  copyable?: boolean;
  /** 是否允许右键菜单 (为 false 时拦截 contextmenu) */
  contextMenu?: boolean;
}

export interface DlpController {
  /** 销毁所有事件监听与还原样式类 */
  destroy: () => void;
  /** 手动通知 DLP 状态变更并重新同步类名 */
  update: () => void;
}

const CLASS_NO_COPY = 'at-file-viewer--no-copy';
const CLASS_NO_PRINT = 'at-file-viewer--no-print';

/**
 * 为指定容器配置 DLP 防泄密保护。
 *
 * 核心机制：
 * 1. 键盘监听：全局捕获阶段监听 keydown 事件，当焦点或鼠标位于容器内时，
 *    依权限屏蔽 Ctrl+S (保存) 与 Ctrl+P (打印)；
 * 2. 剪贴板监听：在容器级别拦截 copy、cut 与 selectstart 事件；
 * 3. 上下文菜单监听：在容器级别拦截 contextmenu 事件；
 * 4. 样式抑制：动态挂载 at-file-viewer--no-copy 与 at-file-viewer--no-print。
 *
 * @param container 目标父容器元素
 * @param getOptions 获取当前 DLP 配置的回调函数
 * @returns 包含 destroy 与 update 控制器的实例
 */
export function setupDlpProtection(
  container: HTMLElement,
  getOptions: () => DlpOptions,
): DlpController {
  let isHovered = false;
  let isDestroyed = false;

  // 1. 鼠标悬浮与离开追踪
  function handleMouseEnter(): void {
    isHovered = true;
  }

  function handleMouseLeave(): void {
    isHovered = false;
  }

  container.addEventListener('mouseenter', handleMouseEnter);
  container.addEventListener('mouseleave', handleMouseLeave);

  // 2. 键盘组合快捷键全局捕获
  function handleKeydown(event: KeyboardEvent): void {
    if (isDestroyed) return;
    const isCtrlOrCmd = event.ctrlKey || event.metaKey;
    if (!isCtrlOrCmd) return;

    const target = event.target as Node | null;
    const isInside = (target && container.contains(target)) || isHovered;
    if (!isInside) return;

    const key = event.key.toLowerCase();
    const options = getOptions();

    // 拦截 Ctrl+S / Cmd+S 保存快捷键
    if (options.downloadable === false && key === 's') {
      event.preventDefault();
      event.stopPropagation();
    }

    // 拦截 Ctrl+P / Cmd+P 打印快捷键
    if (options.printable === false && key === 'p') {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeydown, true);
  }

  // 3. 复制与剪切事件拦截
  function handleClipboardEvent(event: Event): void {
    if (isDestroyed) return;
    const options = getOptions();
    if (options.copyable === false) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  container.addEventListener('copy', handleClipboardEvent, true);
  container.addEventListener('cut', handleClipboardEvent, true);
  container.addEventListener('selectstart', handleClipboardEvent, true);

  // 4. 鼠标右键菜单拦截
  function handleContextMenu(event: MouseEvent): void {
    if (isDestroyed) return;
    const options = getOptions();
    if (options.contextMenu === false) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  container.addEventListener('contextmenu', handleContextMenu, true);

  // 5. 同步 CSS 辅助类
  function syncClasses(): void {
    if (isDestroyed) return;
    const options = getOptions();

    if (options.copyable === false) {
      container.classList.add(CLASS_NO_COPY);
    } else {
      container.classList.remove(CLASS_NO_COPY);
    }

    if (options.printable === false) {
      container.classList.add(CLASS_NO_PRINT);
    } else {
      container.classList.remove(CLASS_NO_PRINT);
    }
  }

  syncClasses();

  return {
    update(): void {
      syncClasses();
    },
    destroy(): void {
      if (isDestroyed) return;
      isDestroyed = true;

      container.removeEventListener('mouseenter', handleMouseEnter);
      container.removeEventListener('mouseleave', handleMouseLeave);

      if (typeof window !== 'undefined') {
        window.removeEventListener('keydown', handleKeydown, true);
      }

      container.removeEventListener('copy', handleClipboardEvent, true);
      container.removeEventListener('cut', handleClipboardEvent, true);
      container.removeEventListener('selectstart', handleClipboardEvent, true);
      container.removeEventListener('contextmenu', handleContextMenu, true);

      container.classList.remove(CLASS_NO_COPY);
      container.classList.remove(CLASS_NO_PRINT);
    },
  };
}
