/**
 * @atengk/gantt-vue GanttExporter 单元测试。
 *
 * 验证甘特图 Canvas 视口/全量高清防虚导出 DataURL、Blob 与图片下载能力。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import { describe, it, expect, vi } from 'vitest';
import type { Gantt } from '@visactor/vtable-gantt';
import { GanttExporter } from '../src/engines/gantt-exporter';
import type { GanttExportOptions } from '../src/types';

describe('GanttExporter Engine', () => {
  const createMockGanttInstance = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 800;

    return {
      canvas,
      getContainer: () => document.createElement('div'),
      getElement: () => document.createElement('div'),
    };
  };

  it('应当正确处理并规整导出默认配置', () => {
    const options: GanttExportOptions = {};
    const normalized = GanttExporter.normalizeOptions(options);

    expect(normalized.format).toBe('png');
    expect(normalized.fileName).toBe('gantt-schedule');
    expect(normalized.viewRange).toBe('all');
    expect(normalized.includeTable).toBe(true);
    expect(normalized.pixelRatio).toBeGreaterThanOrEqual(1);
  });

  it('应当成功将甘特图 Canvas 导出为 DataURL 字符串', async () => {
    const mockGantt = createMockGanttInstance();

    const dataUrl = await GanttExporter.exportDataURL(mockGantt as unknown as Gantt, {
      format: 'png',
      fileName: '项目排程全景图',
    });

    expect(typeof dataUrl).toBe('string');
    expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true);
  });

  it('应当成功将甘特图 Canvas 导出为二进制 Blob 对象', async () => {
    const mockGantt = createMockGanttInstance();

    const blob = await GanttExporter.exportBlob(mockGantt as unknown as Gantt, {
      format: 'png',
    });

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/png');
  });

  it('调用 downloadImage 时应当创建下载锚点并触发下载流程', async () => {
    const mockGantt = createMockGanttInstance();

    const appendChildSpy = vi.spyOn(document.body, 'appendChild');
    const removeChildSpy = vi.spyOn(document.body, 'removeChild');

    await GanttExporter.downloadImage(mockGantt as unknown as Gantt, {
      fileName: '我的排程计划',
      format: 'png',
    });

    expect(appendChildSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();

    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });

  it('当实例无效或为 null 时应当安全失败返回空字符串或空 Blob', async () => {
    const dataUrl = await GanttExporter.exportDataURL(null, {});
    expect(dataUrl).toBe('');

    const blob = await GanttExporter.exportBlob(null, {});
    expect(blob.size).toBe(0);
  });
});
