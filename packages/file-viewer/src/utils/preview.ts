/**
 * 全局命令式文档预览弹窗方法。
 *
 * 支持一行代码快速唤出全屏文档预览浮层：
 * FileViewer.preview({ url: '...', fileName: '...' })
 * 并实现确定性销毁机制，关闭后 100% 自动清理宿主 DOM 与 Vue 实例。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import { createApp, h, ref, type App } from 'vue';
import AtengFileViewerDialog from '../components/AtengFileViewerDialog.vue';
import type {
  FileViewerPreviewOptions,
  FileViewerPreviewHandle,
  AtengFileViewerDialogInstance,
  FileViewerStaticFacade,
} from '../types';

/**
 * 命令式调用弹窗预览文档。
 *
 * @param options 弹窗配置项与回调
 * @returns 包含手动关闭、销毁与实例访问的句柄
 */
export function previewFile(options: FileViewerPreviewOptions): FileViewerPreviewHandle {
  if (typeof document === 'undefined') {
    // SSR 宿主环境防卫兜底
    return {
      close: () => {},
      destroy: () => {},
      getDialogInstance: () => null,
    };
  }

  // 1. 创建独立的 DOM 宿主容器
  const hostElement = document.createElement('div');
  hostElement.className = 'at-file-viewer-preview-host';
  document.body.appendChild(hostElement);

  // 2. 状态机与销毁控制
  const visible = ref<boolean>(true);
  let dialogInstance: AtengFileViewerDialogInstance | null = null;
  let app: App | null = null;
  let isCleanedUp = false;

  function cleanup(): void {
    if (isCleanedUp) return;
    isCleanedUp = true;

    if (app) {
      app.unmount();
      app = null;
    }

    if (hostElement && hostElement.parentNode) {
      hostElement.parentNode.removeChild(hostElement);
    }

    dialogInstance = null;
    options.onClosed?.();
  }

  function handleClose(): void {
    visible.value = false;
    options.onClose?.();

    // 稍微延迟等待弹窗淡出过渡动画结束，随后彻底销毁 DOM 节点
    setTimeout(() => {
      cleanup();
    }, 280);
  }

  // 3. 构建渲染函数并挂载轻量 Vue 应用
  const { onOpen, onOpened, onLoad, onError, onDiagnostic, ...restProps } = options;

  app = createApp({
    name: 'AtengFileViewerPreviewWrapper',
    render() {
      return h(AtengFileViewerDialog, {
        ...restProps,
        visible: visible.value,
        ref: (el: unknown) => {
          dialogInstance = el as AtengFileViewerDialogInstance | null;
        },
        'onUpdate:visible': (val: boolean) => {
          visible.value = val;
          if (!val) {
            handleClose();
          }
        },
        onOpen: () => {
          onOpen?.();
        },
        onOpened: () => {
          onOpened?.();
        },
        onClose: () => {
          handleClose();
        },
        onLoad: (payload: { fileName: string; fileType?: string }) => {
          onLoad?.(payload);
        },
        onError: (err: unknown) => {
          onError?.(err);
        },
        onDiagnostic: (diag: unknown) => {
          onDiagnostic?.(
            diag as Parameters<NonNullable<FileViewerPreviewOptions['onDiagnostic']>>[0],
          );
        },
      });
    },
  });

  app.mount(hostElement);

  return {
    close: handleClose,
    destroy: cleanup,
    getDialogInstance: () => dialogInstance,
  };
}

/**
 * 便捷静态命名空间门面对象。
 */
export const FileViewer: FileViewerStaticFacade = {
  preview: previewFile,
};
