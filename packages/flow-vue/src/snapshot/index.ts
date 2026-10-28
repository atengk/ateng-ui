/**
 * FlowSnapshot 全景高清快照导出器。
 *
 * 依据 ADR-0033 与工单 #167，提供基于矢量 SVG 与 Canvas 渲染的全景高清导出能力：
 * 1. 最小外接边界计算 (computeBoundingBox)：精准包围所有节点和连线折点，避免无效大面积白边；
 * 2. 矢量 SVG 导出 (getSvgString)：重置视口平移缩放变换，修正坐标系，支持内嵌样式；
 * 3. 高清防发虚倍率导出 (getSnapshot)：利用 DPR (2x/3x) 缩放与离屏 Canvas 导出 PNG/JPEG/WebP；
 * 4. 防泄密安全文本水印：支持倾斜度、密集度、颜色与透明度自定义水印矩阵；
 * 5. 跨端与纯前端免依赖极速下载 (download)。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import type LogicFlow from '@logicflow/core';
import type { FlowGraph } from '../types';

/**
 * 水印导出配置选项。
 */
export interface FlowWatermarkOptions {
  /** 水印文本内容 */
  text: string;
  /** 字体大小（默认 16px） */
  fontSize?: number;
  /** 水印颜色（默认 '#000000'） */
  color?: string;
  /** 水印透明度（0~1，默认 0.15） */
  opacity?: number;
  /** 旋转角度（默认 -25 度） */
  rotate?: number;
  /** 水平矩阵间距（默认 240） */
  gapX?: number;
  /** 垂直矩阵间距（默认 160） */
  gapY?: number;
}

/**
 * 全景快照导出配置选项。
 */
export interface FlowSnapshotOptions {
  /** 导出格式（默认 'png'） */
  format?: 'png' | 'jpeg' | 'webp' | 'svg';
  /** 设备像素比高清放大倍数（默认 2，支持 2x / 3x） */
  dpr?: number;
  /** 图像四周留白（默认 40px） */
  padding?: number;
  /** 背景填充颜色（默认 '#ffffff'） */
  background?: string;
  /** 防泄密文本水印配置 */
  watermark?: FlowWatermarkOptions;
  /** 导出文件名（默认 'flow-snapshot'） */
  filename?: string;
}

/**
 * 边界矩形范围。
 */
export interface FlowBoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

/**
 * FlowSnapshot 全景快照引擎实现。
 */
export class FlowSnapshot {
  /**
   * 计算流程图所有节点与连线折点的最小外接矩形边界。
   *
   * @param graph 流程图全景数据
   * @param padding 留白外边距（默认 40px）
   * @returns 边界盒几何信息
   */
  static computeBoundingBox(graph: FlowGraph, padding = 40): FlowBoundingBox {
    const nodes = graph?.nodes ?? [];
    const edges = graph?.edges ?? [];

    if (nodes.length === 0 && edges.length === 0) {
      return {
        minX: 0,
        minY: 0,
        maxX: 800,
        maxY: 600,
        width: 800,
        height: 600,
      };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    // 1. 遍历节点边界（含常见节点类型几何尺寸自适应）
    for (const node of nodes) {
      let width = node.width;
      let height = node.height;

      if (!width || !height) {
        const type = String(node.type || '');
        if (type === 'approval-card') {
          width = width ?? 220;
          height = height ?? 126;
        } else if (type === 'start' || type === 'end') {
          width = width ?? 48;
          height = height ?? 48;
        } else if (type.includes('gateway')) {
          width = width ?? 56;
          height = height ?? 56;
        } else {
          width = width ?? 120;
          height = height ?? 60;
        }
      }

      const left = node.x - width / 2;
      const right = node.x + width / 2;
      const top = node.y - height / 2;
      const bottom = node.y + height / 2;

      minX = Math.min(minX, left);
      minY = Math.min(minY, top);
      maxX = Math.max(maxX, right);
      maxY = Math.max(maxY, bottom);
    }

    // 2. 遍历连线折点
    for (const edge of edges) {
      if (edge.pointsList && edge.pointsList.length > 0) {
        for (const pt of edge.pointsList) {
          minX = Math.min(minX, pt.x);
          minY = Math.min(minY, pt.y);
          maxX = Math.max(maxX, pt.x);
          maxY = Math.max(maxY, pt.y);
        }
      }
    }

    if (!Number.isFinite(minX) || !Number.isFinite(maxX)) {
      minX = 0;
      minY = 0;
      maxX = 800;
      maxY = 600;
    }

    const safePadding = Math.max(0, padding);
    const boxMinX = Math.round(minX - safePadding);
    const boxMinY = Math.round(minY - safePadding);
    const boxMaxX = Math.round(maxX + safePadding);
    const boxMaxY = Math.round(maxY + safePadding);

    return {
      minX: boxMinX,
      minY: boxMinY,
      maxX: boxMaxX,
      maxY: boxMaxY,
      width: Math.max(1, boxMaxX - boxMinX),
      height: Math.max(1, boxMaxY - boxMinY),
    };
  }

  /**
   * 提取 LogicFlow 画布并转换为自洽独立矢量 SVG 字符串。
   *
   * @param lf LogicFlow 画布实例
   * @param options 导出选项
   * @returns 矢量 SVG XML 字符串
   */
  static getSvgString(lf: LogicFlow, options: FlowSnapshotOptions = {}): string {
    const padding = options.padding ?? 40;
    const background = options.background ?? '#ffffff';
    const watermark = options.watermark;

    // 1. 获取流程图全景数据与边界盒
    const rawData = lf.getGraphRawData ? lf.getGraphRawData() : lf.getGraphData();
    const graph: FlowGraph = (
      rawData && typeof rawData === 'object' ? rawData : { nodes: [], edges: [] }
    ) as FlowGraph;
    const bbox = this.computeBoundingBox(graph, padding);

    // 2. 获取 LogicFlow 画布容器内的 SVG
    const container = lf.container;
    const sourceSvg = container ? container.querySelector('svg') : null;
    if (!sourceSvg) {
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${bbox.minX} ${bbox.minY} ${bbox.width} ${bbox.height}" width="${bbox.width}" height="${bbox.height}"></svg>`;
    }

    // 3. 克隆 SVG 根节点并设置独立全景 viewBox 坐标系
    const clonedSvg = sourceSvg.cloneNode(true) as SVGSVGElement;
    clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clonedSvg.setAttribute('viewBox', `${bbox.minX} ${bbox.minY} ${bbox.width} ${bbox.height}`);
    clonedSvg.setAttribute('width', String(bbox.width));
    clonedSvg.setAttribute('height', String(bbox.height));

    // 4. 重置平移缩放变换：彻底清除外层包含视口矩阵的 <g> 及 .lf-base 的 transform
    for (const child of Array.from(clonedSvg.children)) {
      if (child.tagName.toLowerCase() === 'g' && child.hasAttribute('transform')) {
        child.removeAttribute('transform');
      }
    }
    const baseGroup = clonedSvg.querySelector('.lf-base');
    if (baseGroup) {
      baseGroup.removeAttribute('transform');
    }

    // 5. 清理交互临时图元（吸附锚点、选中框、高亮手柄）
    const tempArtifacts = clonedSvg.querySelectorAll(
      '.lf-anchor, .lf-control, .lf-node-selected-box, .lf-line-anchor',
    );
    for (const el of Array.from(tempArtifacts)) {
      el.remove();
    }

    // 6. 提取宿主环境样式并内联注入到 SVG <defs><style> 中，保障 Vue SFC 卡片与富文本样式 100% 保真
    if (typeof document !== 'undefined') {
      const styles = Array.from(document.querySelectorAll('style'))
        .map(s => s.innerHTML)
        .filter(
          css => css.includes('at-flow') || css.includes('lf-') || css.includes('approval-card'),
        )
        .join('\n');

      if (styles) {
        let defs = clonedSvg.querySelector('defs');
        if (!defs) {
          defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
          clonedSvg.insertBefore(defs, clonedSvg.firstChild);
        }
        const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
        styleEl.textContent = styles;
        defs.appendChild(styleEl);
      }
    }

    // 7. 注入背景矩形
    if (background && background !== 'transparent') {
      const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bgRect.setAttribute('x', String(bbox.minX));
      bgRect.setAttribute('y', String(bbox.minY));
      bgRect.setAttribute('width', String(bbox.width));
      bgRect.setAttribute('height', String(bbox.height));
      bgRect.setAttribute('fill', background);
      if (clonedSvg.firstChild) {
        clonedSvg.insertBefore(bgRect, clonedSvg.firstChild);
      } else {
        clonedSvg.appendChild(bgRect);
      }
    }

    // 8. 嵌入安全防泄密文本水印
    if (watermark && watermark.text) {
      const text = watermark.text;
      const fontSize = watermark.fontSize ?? 16;
      const color = watermark.color ?? 'rgba(0, 0, 0, 0.15)';
      const opacity = watermark.opacity ?? 0.15;
      const rotate = watermark.rotate ?? -25;
      const gapX = watermark.gapX ?? 240;
      const gapY = watermark.gapY ?? 160;

      const watermarkGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      watermarkGroup.setAttribute('class', 'at-flow-watermark');
      watermarkGroup.setAttribute('opacity', String(opacity));
      watermarkGroup.setAttribute('fill', color);
      watermarkGroup.setAttribute('font-size', `${fontSize}px`);
      watermarkGroup.setAttribute('font-family', 'sans-serif');
      watermarkGroup.setAttribute('text-anchor', 'middle');
      watermarkGroup.setAttribute('pointer-events', 'none');

      for (let x = bbox.minX - gapX; x < bbox.maxX + gapX; x += gapX) {
        for (let y = bbox.minY - gapY; y < bbox.maxY + gapY; y += gapY) {
          const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          textEl.setAttribute('x', String(x));
          textEl.setAttribute('y', String(y));
          textEl.setAttribute('transform', `rotate(${rotate}, ${x}, ${y})`);
          textEl.textContent = text;
          watermarkGroup.appendChild(textEl);
        }
      }

      clonedSvg.appendChild(watermarkGroup);
    }

    const serializer = new XMLSerializer();
    return serializer.serializeToString(clonedSvg);
  }

  /**
   * 导出全景快照为 DataURL（支持 PNG/JPEG/WEBP/SVG）。
   *
   * @param lf LogicFlow 画布实例
   * @param options 导出选项
   * @returns 图片 Base64 DataURL 或 SVG DataURL
   */
  static async getSnapshot(lf: LogicFlow, options: FlowSnapshotOptions = {}): Promise<string> {
    const format = options.format ?? 'png';
    const svgStr = this.getSvgString(lf, options);

    if (format === 'svg') {
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgStr)}`;
    }

    // 针对 png / jpeg / webp，使用 Canvas 离屏栅格化
    const rawData = lf.getGraphRawData ? lf.getGraphRawData() : lf.getGraphData();
    const graph: FlowGraph = (
      rawData && typeof rawData === 'object' ? rawData : { nodes: [], edges: [] }
    ) as FlowGraph;
    const bbox = this.computeBoundingBox(graph, options.padding ?? 40);

    const dpr = Math.max(1, options.dpr ?? 2);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bbox.width * dpr);
    canvas.height = Math.round(bbox.height * dpr);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('无法初始化 Canvas 2D 绘图上下文');
    }

    const background = options.background ?? '#ffffff';
    if (background && background !== 'transparent') {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const mimeType =
          format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
        const dataUrl = canvas.toDataURL(mimeType, 0.95);
        resolve(dataUrl);
      };
      img.onerror = () => {
        reject(new Error('SVG 栅格化转换为图片失败'));
      };
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgStr)}`;
    });
  }

  /**
   * 浏览器环境触发图片或 SVG 下载保存。
   *
   * @param content 图片 DataURL 或 SVG 字符串
   * @param filename 保存文件名（如 'flow-snapshot.png'）
   */
  static download(content: string, filename = 'flow-snapshot.png'): void {
    if (typeof document === 'undefined') return;

    let url = content;
    let isBlobUrl = false;

    if (content.startsWith('<svg') || content.startsWith('<?xml')) {
      const mimeType = filename.toLowerCase().endsWith('.xml')
        ? 'application/xml;charset=utf-8'
        : 'image/svg+xml;charset=utf-8';
      const blob = new Blob([content], { type: mimeType });
      url = URL.createObjectURL(blob);
      isBlobUrl = true;
    }

    const anchor = document.createElement('a');
    anchor.download = filename;
    anchor.href = url;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    if (isBlobUrl) {
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
    }
  }
}
