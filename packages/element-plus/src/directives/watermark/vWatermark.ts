/**
 * 动态防篡改水印指令实现。
 *
 * 核心技术特征：
 * 1. 采用 Canvas 离屏绘制抗锯齿旋转文本背景图，支持多行文本与颜色、角度、间距自定义，并具备 SVG 零依赖环境安全降级；
 * 2. 默认局部容器定位（自动装配 position: relative 上下文），支持 .full 修饰符启用 position: fixed 全屏视口覆盖；
 * 3. 深度结合 MutationObserver 监听水印遮罩物理删除与 style/class 属性篡改，提供微任务级即时重建与自愈保护；
 * 4. 遮罩样式强制设定 pointer-events: none，穿透任何用户交互，绝不阻断底层业务操作。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import type { DirectiveBinding } from 'vue';
import type { WatermarkDirective, WatermarkDirectiveValue, WatermarkOptions } from './types';

/**
 * 默认水印文本。
 */
export const DEFAULT_WATERMARK_TEXT: string = 'Ateng UI';

/**
 * 默认水印字体。
 */
export const DEFAULT_WATERMARK_FONT: string = '14px sans-serif';

/**
 * 默认水印颜色。
 */
export const DEFAULT_WATERMARK_COLOR: string = 'rgba(0, 0, 0, 0.12)';

/**
 * 默认旋转角度。
 */
export const DEFAULT_WATERMARK_ROTATE: number = -22;

/**
 * 默认单元格宽度。
 */
export const DEFAULT_WATERMARK_WIDTH: number = 240;

/**
 * 默认单元格高度。
 */
export const DEFAULT_WATERMARK_HEIGHT: number = 140;

/**
 * 默认层级。
 */
export const DEFAULT_WATERMARK_Z_INDEX: number = 9999;

/**
 * 水印遮罩类名。
 */
export const WATERMARK_MASK_CLASS: string = 'at-watermark-mask';

/**
 * 指令内部上下文状态。
 */
interface WatermarkState {
  options: WatermarkOptions;
  isFull: boolean;
  dataUrl: string;
  maskEl: HTMLElement;
  observer: MutationObserver | null;
  originalPosition: string;
  wasPositionModified: boolean;
  isInternalModifying: boolean;
}

const stateMap = new WeakMap<HTMLElement, WatermarkState>();

/**
 * 规范化解析指令入参为标准配置对象。
 *
 * @param value 绑定值
 * @param modifiers 修饰符
 * @returns 规范化配置
 */
function resolveOptions(
  value: WatermarkDirectiveValue,
  modifiers?: Record<string, boolean | undefined>,
): { options: WatermarkOptions; isFull: boolean } {
  let options: WatermarkOptions;

  if (typeof value === 'string' || Array.isArray(value)) {
    options = { text: value };
  } else if (value && typeof value === 'object') {
    options = { ...value };
  } else {
    options = { text: DEFAULT_WATERMARK_TEXT };
  }

  const isFull = Boolean(modifiers?.full || options.full);
  return { options, isFull };
}

/**
 * SVG 矢量文本降级生成 DataURL。
 *
 * @param options 标准配置
 * @returns SVG DataURL
 */
function createSvgDataUrl(options: Required<Omit<WatermarkOptions, 'full'>>): string {
  const { width, height, rotate, color, font, text } = options;
  const lines = Array.isArray(text) ? text : [text];
  const lineHeight = 20;
  const startY = height / 2 - ((lines.length - 1) * lineHeight) / 2;

  const textElements = lines
    .map(
      (line, idx) =>
        `<text x="${width / 2}" y="${startY + idx * lineHeight}" fill="${color}" font="${font}" text-anchor="middle" dominant-baseline="middle">${line}</text>`,
    )
    .join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><g transform="rotate(${rotate} ${width / 2} ${height / 2})">${textElements}</g></svg>`;

  const base64 =
    typeof btoa !== 'undefined'
      ? btoa(unescape(encodeURIComponent(svg)))
      : Buffer.from(svg).toString('base64');

  return `data:image/svg+xml;base64,${base64}`;
}

/**
 * 基于 Canvas 离屏渲染生成抗锯齿高清背景图 DataURL。
 *
 * @param options 标准配置
 * @returns Base64 DataURL
 */
export function generateWatermarkDataUrl(options: WatermarkOptions): string {
  const normalized: Required<Omit<WatermarkOptions, 'full'>> = {
    text: options.text ?? DEFAULT_WATERMARK_TEXT,
    font: options.font ?? DEFAULT_WATERMARK_FONT,
    color: options.color ?? DEFAULT_WATERMARK_COLOR,
    rotate: options.rotate ?? DEFAULT_WATERMARK_ROTATE,
    width: options.width && options.width > 0 ? options.width : DEFAULT_WATERMARK_WIDTH,
    height: options.height && options.height > 0 ? options.height : DEFAULT_WATERMARK_HEIGHT,
    zIndex: options.zIndex ?? DEFAULT_WATERMARK_Z_INDEX,
  };

  if (typeof document === 'undefined') {
    return createSvgDataUrl(normalized);
  }

  const canvas = document.createElement('canvas');
  const ratio = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
  const { width, height, rotate, color, font, text } = normalized;

  canvas.width = width * ratio;
  canvas.height = height * ratio;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    // 无原生 2D 上下文时平滑降级至 SVG
    return createSvgDataUrl(normalized);
  }

  ctx.scale(ratio, ratio);
  ctx.translate(width / 2, height / 2);
  ctx.rotate((rotate * Math.PI) / 180);

  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const lines = Array.isArray(text) ? text : [text];
  const lineHeight = 20;
  const startY = -((lines.length - 1) * lineHeight) / 2;

  lines.forEach((line, index) => {
    ctx.fillText(line, 0, startY + index * lineHeight);
  });

  return canvas.toDataURL('image/png');
}

/**
 * 强制为水印遮罩装配防篡改样式与定位约束。
 *
 * @param mask 水印遮罩 DOM 元素
 * @param dataUrl 背景图 DataURL
 * @param zIndex 层级
 * @param isFull 是否全屏 fixed
 */
function applyMaskStyle(mask: HTMLElement, dataUrl: string, zIndex: number, isFull: boolean): void {
  mask.className = WATERMARK_MASK_CLASS;
  mask.style.position = isFull ? 'fixed' : 'absolute';
  mask.style.top = '0';
  mask.style.left = '0';
  mask.style.right = '0';
  mask.style.bottom = '0';
  mask.style.width = '100%';
  mask.style.height = '100%';
  mask.style.pointerEvents = 'none';
  mask.style.backgroundImage = `url("${dataUrl}")`;
  mask.style.backgroundRepeat = 'repeat';
  mask.style.zIndex = String(zIndex);
  mask.style.display = 'block';
  mask.style.opacity = '1';
  mask.style.visibility = 'visible';
}

/**
 * 执行受管内部 DOM 变更，防止触发 MutationObserver 循环风暴。
 *
 * @param state 内部状态
 * @param action 内部动作
 */
function safeModify(state: WatermarkState, action: () => void): void {
  state.isInternalModifying = true;
  try {
    action();
  } finally {
    queueMicrotask(() => {
      state.isInternalModifying = false;
    });
  }
}

/**
 * 挂载并配置水印遮罩元素。
 *
 * @param el 宿主 DOM 元素
 * @param state 内部状态
 */
function setupWatermark(el: HTMLElement, state: WatermarkState): void {
  safeModify(state, () => {
    // 1. 若为局部容器模式，确保宿主容器具有定位上下文
    if (!state.isFull) {
      const computedPos =
        typeof window !== 'undefined' ? window.getComputedStyle(el).position : el.style.position;
      if (!computedPos || computedPos === 'static') {
        state.originalPosition = el.style.position;
        el.style.position = 'relative';
        state.wasPositionModified = true;
      }
    }

    // 2. 装配遮罩样式与背景
    const zIndex = state.options.zIndex ?? DEFAULT_WATERMARK_Z_INDEX;
    applyMaskStyle(state.maskEl, state.dataUrl, zIndex, state.isFull);

    // 3. 将遮罩挂载入宿主元素
    if (!el.contains(state.maskEl)) {
      el.appendChild(state.maskEl);
    }
  });
}

/**
 * 为水印遮罩创建防篡改 MutationObserver 自愈监听器。
 *
 * @param el 宿主 DOM 元素
 * @param state 内部状态
 */
function createAntiTamperObserver(el: HTMLElement, state: WatermarkState): void {
  if (typeof MutationObserver === 'undefined') {
    return;
  }

  state.observer = new MutationObserver(mutations => {
    if (state.isInternalModifying) {
      return;
    }

    let shouldHeal = false;

    // 1. 检查是否存在物理删除或样式篡改行为
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        const removed = Array.from(mutation.removedNodes);
        if (removed.includes(state.maskEl)) {
          shouldHeal = true;
          break;
        }
      }
      if (mutation.type === 'attributes' && mutation.target === state.maskEl) {
        shouldHeal = true;
        break;
      }
    }

    // 2. 微任务级自愈恢复
    if (shouldHeal) {
      setupWatermark(el, state);
    }
  });

  state.observer.observe(el, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class', 'hidden'],
  });
}

/**
 * 动态防篡改水印指令 v-watermark。
 */
export const vWatermark: WatermarkDirective = {
  mounted(el: HTMLElement, binding: DirectiveBinding<WatermarkDirectiveValue>) {
    // 1. 解析初始入参并生成水印背景 DataURL
    const { options, isFull } = resolveOptions(binding.value, binding.modifiers);
    const dataUrl = generateWatermarkDataUrl(options);
    const maskEl = document.createElement('div');

    const state: WatermarkState = {
      options,
      isFull,
      dataUrl,
      maskEl,
      observer: null,
      originalPosition: '',
      wasPositionModified: false,
      isInternalModifying: false,
    };
    stateMap.set(el, state);

    // 2. 挂载遮罩并启动防篡改自愈监听
    setupWatermark(el, state);
    createAntiTamperObserver(el, state);
  },

  updated(el: HTMLElement, binding: DirectiveBinding<WatermarkDirectiveValue>) {
    // 1. 同步最新配置与全屏状态
    const state = stateMap.get(el);
    if (!state) {
      return;
    }

    const { options, isFull } = resolveOptions(binding.value, binding.modifiers);
    state.options = options;
    state.isFull = isFull;
    state.dataUrl = generateWatermarkDataUrl(options);

    // 2. 更新水印遮罩
    setupWatermark(el, state);
  },

  beforeUnmount(el: HTMLElement) {
    // 1. 确定性断开 MutationObserver 监听
    const state = stateMap.get(el);
    if (!state) {
      return;
    }

    if (state.observer) {
      state.observer.disconnect();
      state.observer = null;
    }

    // 2. 物理移除水印遮罩节点
    if (state.maskEl.parentNode) {
      state.maskEl.parentNode.removeChild(state.maskEl);
    }

    // 3. 还原宿主定位样式
    if (state.wasPositionModified) {
      el.style.position = state.originalPosition;
    }

    stateMap.delete(el);
  },
};
