/**
 * useFileViewer 无头状态机 Hook 单元测试。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { useFileViewer } from '../src/composables/useFileViewer';
import type { AtengFileViewerInstance, FileViewerDocumentAnchor } from '../src/types';

describe('useFileViewer 无头 Hook 状态响应与指令派发测试', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('初始状态具备默认保底值，且导出的响应式状态为只读防御', () => {
    const {
      isLoading,
      error,
      fileName,
      fileType,
      page,
      pageCount,
      sheet,
      sheets,
      zoomScale,
      rotation,
      tocList,
      isTocOpen,
    } = useFileViewer({
      fileName: 'annual_report.pdf',
      fileType: 'pdf',
    });

    expect(isLoading.value).toBe(false);
    expect(error.value).toBeNull();
    expect(fileName.value).toBe('annual_report.pdf');
    expect(fileType.value).toBe('pdf');
    expect(page.value).toBe(1);
    expect(pageCount.value).toBe(1);
    expect(sheet.value).toBe(0);
    expect(sheets.value).toEqual([]);
    expect(zoomScale.value).toBe(1);
    expect(rotation.value).toBe(0);
    expect(tocList.value).toEqual([]);
    expect(isTocOpen.value).toBe(false);
  });

  it('支持响应式与 Getter 入参的自动解包与同步', () => {
    const reactiveName = ref('first.docx');
    const { fileName, fileType } = useFileViewer({
      fileName: () => reactiveName.value,
      fileType: 'docx',
    });

    expect(fileName.value).toBe('first.docx');
    expect(fileType.value).toBe('docx');

    reactiveName.value = 'second.docx';
    expect(fileName.value).toBe('second.docx');
  });

  it('指令集能够安全派发至绑定的 AtengFileViewerInstance', async () => {
    const mockZoomIn = vi.fn();
    const mockZoomOut = vi.fn();
    const mockResetZoom = vi.fn();
    const mockRotate = vi.fn();
    const mockSetPage = vi.fn().mockResolvedValue(true);
    const mockPrevPage = vi.fn().mockResolvedValue(true);
    const mockNextPage = vi.fn().mockResolvedValue(true);
    const mockSetSheet = vi.fn().mockResolvedValue(true);
    const mockScrollToAnchor = vi.fn().mockResolvedValue(true);
    const mockDownload = vi.fn();
    const mockPrint = vi.fn();
    const mockRetry = vi.fn();

    const mockInstance = {
      zoomIn: mockZoomIn,
      zoomOut: mockZoomOut,
      resetZoom: mockResetZoom,
      rotate: mockRotate,
      setPage: mockSetPage,
      prevPage: mockPrevPage,
      nextPage: mockNextPage,
      setSheet: mockSetSheet,
      scrollToAnchor: mockScrollToAnchor,
      download: mockDownload,
      print: mockPrint,
      retry: mockRetry,
      getFileName: () => 'sample.pdf',
      getFileType: () => 'pdf',
      getPage: () => 2,
      getPageCount: () => 10,
      getSheet: () => 'Sheet1',
      getSheets: () => [{ id: 'Sheet1', name: 'Sheet1' }],
      getTocList: () => [{ id: 'sec-1', index: 0, label: '第一章' }],
      isTocOpen: () => false,
      toggleToc: vi.fn(),
      openToc: vi.fn(),
      closeToc: vi.fn(),
      getViewState: () => ({ scale: 1.2 }),
      applyViewState: vi.fn().mockResolvedValue(null),
    } as unknown as AtengFileViewerInstance;

    const controller = useFileViewer({
      viewerRef: mockInstance,
    });

    // 缩放与旋转指令
    controller.zoomIn();
    expect(mockZoomIn).toHaveBeenCalledTimes(1);
    expect(controller.zoomScale.value).toBeGreaterThan(1);

    controller.zoomOut();
    expect(mockZoomOut).toHaveBeenCalledTimes(1);

    controller.resetZoom();
    expect(mockResetZoom).toHaveBeenCalledTimes(1);
    expect(controller.zoomScale.value).toBe(1);

    controller.rotate();
    expect(mockRotate).toHaveBeenCalledTimes(1);
    expect(controller.rotation.value).toBe(90);

    // 分页与工作表指令
    await controller.setPage(5);
    expect(mockSetPage).toHaveBeenCalledWith(5);
    expect(controller.page.value).toBe(5);

    await controller.prevPage();
    expect(mockPrevPage).toHaveBeenCalledTimes(1);

    await controller.nextPage();
    expect(mockNextPage).toHaveBeenCalledTimes(1);

    await controller.setSheet(1);
    expect(mockSetSheet).toHaveBeenCalledWith(1);
    expect(controller.sheet.value).toBe(1);

    // 目录大纲与锚点跳转
    const anchor: FileViewerDocumentAnchor = { id: 'sec-2', index: 1, label: '第二章', page: 6 };
    await controller.scrollToAnchor(anchor);
    expect(mockScrollToAnchor).toHaveBeenCalledWith(anchor);

    // TOC 抽屉显隐控制
    expect(controller.isTocOpen.value).toBe(false);
    controller.openToc();
    expect(controller.isTocOpen.value).toBe(true);
    controller.closeToc();
    expect(controller.isTocOpen.value).toBe(false);
    controller.toggleToc();
    expect(controller.isTocOpen.value).toBe(true);

    // 动作指令
    controller.download();
    expect(mockDownload).toHaveBeenCalledTimes(1);

    controller.print();
    expect(mockPrint).toHaveBeenCalledTimes(1);

    controller.retry();
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  it('未绑定实例时指令集静默降级且不崩溃抛错', async () => {
    const controller = useFileViewer();

    expect(() => {
      controller.zoomIn();
      controller.zoomOut();
      controller.resetZoom();
      controller.rotate();
      controller.download();
      controller.print();
      controller.retry();
      controller.destroy();
    }).not.toThrow();

    await expect(controller.setPage(2)).resolves.toBe(true);
    expect(controller.page.value).toBe(2);

    await expect(controller.setSheet('Sheet2')).resolves.toBe(true);
    expect(controller.sheet.value).toBe('Sheet2');

    await expect(controller.scrollToAnchor('anchor-1')).resolves.toBe(false);
  });
});
