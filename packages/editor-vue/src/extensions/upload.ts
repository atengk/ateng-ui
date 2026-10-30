/**
 * @atengk/editor-vue 媒体资产上传拦截器扩展。
 *
 * 遵循 L2 零 UI 依赖与非功能成熟度防线：
 * 1. 原生自动拦截剪贴板图片粘贴 (Ctrl+V) 与本地拖拽放置 (Drag & Drop)；
 * 2. 异步未决期间，通过 ProseMirror 装饰器 (Decorations) 插入骨架加载占位块，
 *    完全独立于文档真实节点树，杜绝未决占位标签污染草稿保存；
 * 3. 待 Promise 决议后平滑替换为真实 Image 节点；
 * 4. 未提供 uploadHandler 时自动优雅降级为 Base64 Data URL 内联嵌入。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view';
import type { UploadHandler, UploadSuccessPayload } from '../types';

export const uploadPluginKey = new PluginKey('imageUpload');

export interface FileUploadOptions {
  /**
   * 媒体上传处理器 SPI。
   */
  uploadHandler?: UploadHandler;

  /**
   * 上传成功回调。
   */
  onUploadSuccess?: (payload: UploadSuccessPayload) => void;

  /**
   * 上传失败异常回调。
   */
  onUploadError?: (error: Error, file: File) => void;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fileUpload: {
      /**
       * 手动触发图片文件上传并插入当前光标位置。
       */
      uploadImage: (file: File) => ReturnType;
    };
  }
}

/**
 * 创建纯 DOM 结构骨架加载占位元素。
 */
function createPlaceholderDOM(file: File): HTMLElement {
  const dom = document.createElement('div');
  dom.className = 'at-editor-image-placeholder';
  dom.setAttribute('role', 'status');
  dom.setAttribute('aria-label', `正在上传图片：${file.name || '未命名图片'}`);

  const spinner = document.createElement('div');
  spinner.className = 'at-editor-image-placeholder__spinner';

  const info = document.createElement('div');
  info.className = 'at-editor-image-placeholder__info';

  const name = document.createElement('span');
  name.className = 'at-editor-image-placeholder__name';
  name.textContent = file.name || '图片上传中';

  const status = document.createElement('span');
  status.className = 'at-editor-image-placeholder__status';
  status.textContent = '正在上传...';

  info.appendChild(name);
  info.appendChild(status);
  dom.appendChild(spinner);
  dom.appendChild(info);

  return dom;
}

/**
 * 启动单个图片文件的上传任务生命周期。
 */
export function startUpload(
  view: EditorView,
  file: File,
  pos: number,
  options: FileUploadOptions,
): void {
  const id = Symbol('upload-placeholder');

  // 1. 派发事务挂载骨架占位装饰器
  const tr = view.state.tr.setMeta(uploadPluginKey, {
    add: { id, pos, file },
  });
  view.dispatch(tr);

  // 2. 成功完成并置换为真实图片节点
  const handleSuccess = (url: string, alt?: string) => {
    const finalAlt = alt || file.name || '图片';
    const decos = uploadPluginKey.getState(view.state) as DecorationSet | undefined;
    if (!decos) return;

    const found = decos.find(undefined, undefined, spec => spec.id === id);
    const firstMatch = found[0];
    if (!firstMatch) return;
    const targetPos = firstMatch.from;

    const imageNode = view.state.schema.nodes.image?.create({
      src: url,
      alt: finalAlt,
    });

    if (imageNode) {
      const replaceTr = view.state.tr
        .setMeta(uploadPluginKey, { remove: { id } })
        .replaceWith(targetPos, targetPos, imageNode);
      view.dispatch(replaceTr);
      options.onUploadSuccess?.({ url, alt: finalAlt, file });
    } else {
      const cleanTr = view.state.tr.setMeta(uploadPluginKey, { remove: { id } });
      view.dispatch(cleanTr);
    }
  };

  // 3. 失败并清理占位装饰器
  const handleError = (error: Error) => {
    const cleanTr = view.state.tr.setMeta(uploadPluginKey, { remove: { id } });
    view.dispatch(cleanTr);
    options.onUploadError?.(error, file);
  };

  // 4. 执行上传或优雅降级
  if (options.uploadHandler) {
    options
      .uploadHandler(file)
      .then(result => {
        if (typeof result === 'string') {
          handleSuccess(result);
        } else {
          handleSuccess(result.url, result.alt);
        }
      })
      .catch(err => {
        const error = err instanceof Error ? err : new Error(String(err));
        handleError(error);
      });
  } else {
    // 自动优雅降级为 Base64 Data URL
    if (typeof FileReader !== 'undefined') {
      const reader = new FileReader();
      reader.onload = e => {
        const url = e.target?.result as string;
        if (url) {
          handleSuccess(url);
        } else {
          handleError(new Error('转换本地图片 Base64 失败'));
        }
      };
      reader.onerror = () => {
        handleError(new Error('读取本地图片文件失败'));
      };
      reader.readAsDataURL(file);
    } else {
      handleError(new Error('当前环境不支持 FileReader'));
    }
  }
}

/**
 * 组装媒体上传 ProseMirror Plugin。
 */
export function createUploadPlugin(options: FileUploadOptions): Plugin {
  return new Plugin({
    key: uploadPluginKey,
    state: {
      init() {
        return DecorationSet.empty;
      },
      apply(tr, set) {
        // 自动依据事务变化对齐映射所有占位位置
        let nextSet = set.map(tr.mapping, tr.doc);
        const action = tr.getMeta(uploadPluginKey);

        if (action?.add) {
          const widget = Decoration.widget(
            action.add.pos,
            () => createPlaceholderDOM(action.add.file),
            { id: action.add.id },
          );
          nextSet = nextSet.add(tr.doc, [widget]);
        } else if (action?.remove) {
          const matches = nextSet.find(undefined, undefined, spec => spec.id === action.remove.id);
          nextSet = nextSet.remove(matches);
        }

        return nextSet;
      },
    },
    props: {
      decorations(state) {
        return uploadPluginKey.getState(state);
      },
      handlePaste(view, event) {
        const files = event.clipboardData?.files;
        if (!files || files.length === 0) return false;

        const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
        if (imageFiles.length === 0) return false;

        event.preventDefault();
        const pos = view.state.selection.from;
        imageFiles.forEach(file => {
          startUpload(view, file, pos, options);
        });
        return true;
      },
      handleDrop(view, event, _slice, moved) {
        if (moved) return false;
        const files = event.dataTransfer?.files;
        if (!files || files.length === 0) return false;

        const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
        if (imageFiles.length === 0) return false;

        event.preventDefault();
        const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
        const pos = coordinates ? coordinates.pos : view.state.selection.from;
        imageFiles.forEach(file => {
          startUpload(view, file, pos, options);
        });
        return true;
      },
    },
  });
}

/**
 * TipTap FileUpload 核心扩展。
 */
export const FileUploadExtension = Extension.create<FileUploadOptions>({
  name: 'fileUpload',

  addOptions() {
    return {
      uploadHandler: undefined,
      onUploadSuccess: undefined,
      onUploadError: undefined,
    };
  },

  addCommands() {
    return {
      uploadImage:
        (file: File) =>
        ({ view }) => {
          startUpload(view, file, view.state.selection.from, this.options);
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [createUploadPlugin(this.options)];
  },
});
