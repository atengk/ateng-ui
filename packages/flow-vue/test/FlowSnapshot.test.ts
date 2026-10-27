/**
 * FlowSnapshot 全景高清快照导出单元测试。
 *
 * 依据 ADR-0033 与工单 #167，验证最小外接边界（Bounding Box）计算、高清防发虚倍率与文本水印逻辑。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import LogicFlow from '@logicflow/core';
import { FlowSnapshot } from '../src/snapshot';
import type { FlowGraph } from '../src/types';

describe('FlowSnapshot 全景快照导出引擎', () => {
  let container: HTMLDivElement;
  let lf: LogicFlow;

  const mockGraph: FlowGraph = {
    nodes: [
      { id: 'node-1', type: 'rect', x: 200, y: 150, width: 100, height: 60, text: '节点1' },
      { id: 'node-2', type: 'rect', x: 600, y: 350, width: 120, height: 80, text: '节点2' },
    ],
    edges: [
      {
        id: 'edge-1',
        type: 'polyline',
        sourceNodeId: 'node-1',
        targetNodeId: 'node-2',
        pointsList: [
          { x: 250, y: 150 },
          { x: 425, y: 150 },
          { x: 425, y: 350 },
          { x: 540, y: 350 },
        ],
      },
    ],
  };

  beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);
    lf = new LogicFlow({ container });
    lf.render(mockGraph);
  });

  afterEach(() => {
    lf.destroy();
    container.remove();
    document.body.innerHTML = '';
  });

  describe('最小外接边界 (Bounding Box) 计算', () => {
    it('应该准确计算所有节点与折点的最小外接矩形与留白 Padding', () => {
      // 节点1 边界：left=150, right=250, top=120, bottom=180
      // 节点2 边界：left=540, right=660, top=310, bottom=390
      // 连线折点包含在范围内
      // minX=150, minY=120, maxX=660, maxY=390
      // width = 510, height = 270
      const padding = 40;
      const bbox = FlowSnapshot.computeBoundingBox(mockGraph, padding);

      expect(bbox.minX).toBe(150 - padding);
      expect(bbox.minY).toBe(120 - padding);
      expect(bbox.width).toBe(510 + 2 * padding);
      expect(bbox.height).toBe(270 + 2 * padding);
    });

    it('空图时应该提供安全的保底边界', () => {
      const bbox = FlowSnapshot.computeBoundingBox({ nodes: [], edges: [] }, 40);
      expect(bbox.width).toBeGreaterThan(0);
      expect(bbox.height).toBeGreaterThan(0);
    });
  });

  describe('矢量 SVG 导出与水印嵌入', () => {
    it('导出 SVG 字符串应自适应修正 viewBox 与图元内容', () => {
      const svgStr = FlowSnapshot.getSvgString(lf, {
        padding: 40,
      });

      expect(svgStr).toContain('<svg');
      expect(svgStr).toContain('viewBox=');
      expect(svgStr).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(svgStr).toContain('lf-base');
    });

    it('配置水印时应在 SVG 中嵌入防泄密文本水印节点', () => {
      const svgStr = FlowSnapshot.getSvgString(lf, {
        watermark: {
          text: '内部审批·绝密',
          color: '#ff0000',
          opacity: 0.2,
        },
      });

      expect(svgStr).toContain('内部审批·绝密');
      expect(svgStr).toContain('class="at-flow-watermark"');
    });

    it('以 SVG 格式获取快照应返回带 DataURL 编码的字符串', async () => {
      const dataUrl = await FlowSnapshot.getSnapshot(lf, { format: 'svg' });
      expect(dataUrl).toContain('data:image/svg+xml;charset=utf-8,');
      expect(dataUrl).toContain('%3Csvg');
    });

    it('调用 download 方法时应安全创建临时链接触发下载', () => {
      let clicked = false;
      const originalCreate = document.createElement.bind(document);
      const spy = vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        const el = originalCreate(tagName);
        if (tagName.toLowerCase() === 'a') {
          el.click = () => {
            clicked = true;
          };
        }
        return el;
      });

      FlowSnapshot.download('<svg></svg>', 'test-flow.svg');
      expect(clicked).toBe(true);
      spy.mockRestore();
    });
  });
});
