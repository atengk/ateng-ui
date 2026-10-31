/**
 * 3×3 视口点阵采样白屏感知与容器白名单二次复验插件 (WhiteScreenPlugin)。
 *
 * @author Ateng
 * @since 2026-10-31
 */

import type { WhiteScreenPayload } from '../types/event';
import type { MonitorKernelInstance, MonitorPlugin } from '../types/plugin';
import { getElementSelector } from './error';

/** 默认根容器选择器列表 */
export const DEFAULT_ROOT_SELECTORS: readonly string[] = [
  'html',
  'body',
  '#app',
  '#root',
  '.app-container',
  '.main-container',
];

/** 默认骨架屏与 Loading 遮罩白名单选择器列表 */
export const DEFAULT_WHITELIST_SELECTORS: readonly string[] = [
  '.at-skeleton',
  '.el-loading-mask',
  '.loading',
  '.skeleton',
  '[data-loading]',
  '[data-skeleton]',
];

/**
 * 视口单个采样点检测诊断结果。
 */
export interface SamplePointDiagnostic {
  x: number;
  y: number;
  target: string;
  isRoot: boolean;
  isWhitelisted: boolean;
}

/**
 * 白屏感知插件配置选项。
 */
export interface WhiteScreenPluginOptions {
  /** 根挂载容器选择器列表，命中且无有效业务子节点视为根容器 */
  rootSelectors?: readonly string[];

  /** 骨架屏与 Loading 遮罩白名单选择器列表，命中则豁免告警 */
  whitelistSelectors?: readonly string[];

  /** 初检延迟时间 T1 (毫秒)，默认 3000ms */
  initialDelay?: number;

  /** 初检怀疑白屏后的二次防抖复验延迟时间 T2 (毫秒)，默认 1500ms */
  recheckDelay?: number;

  /** 是否在 window load 事件后自动启动初检，默认 true */
  autoCheckOnLoad?: boolean;

  /** 判定为白屏所需的采样点命中根容器比例阈值 (0.0 ~ 1.0)，默认 1.0 (全命中) */
  threshold?: number;
}

/**
 * 白屏插件实例接口，额外暴露手动检查方法以供路由联动。
 */
export interface WhiteScreenPluginInstance extends MonitorPlugin {
  /**
   * 手动触发一次完整的两阶段白屏检测（如在 SPA 路由切换后调用）。
   *
   * @returns 检测最终是否判定为真白屏
   */
  check: () => Promise<boolean>;
}

/**
 * 判断指定元素自身是否直接匹配给定的选择器集合（不向上追溯祖先链）。
 *
 * @param element 目标元素
 * @param selectors 选择器列表
 * @returns 是否直接匹配
 */
export function isDirectRootElement(
  element: Element | null | undefined,
  selectors: readonly string[],
): boolean {
  if (!element || typeof element.matches !== 'function') {
    return false;
  }

  for (const sel of selectors) {
    try {
      if (element.matches(sel)) {
        return true;
      }
    } catch {
      // 忽略非法选择器语法
    }
  }

  return false;
}

/**
 * 判断指定元素是否匹配给定的选择器集合（包含自身及向上追溯祖先链）。
 *
 * @param element 目标元素
 * @param selectors 选择器列表
 * @returns 是否匹配
 */
export function matchesAnySelector(
  element: Element | null | undefined,
  selectors: readonly string[],
): boolean {
  if (!element || typeof element.matches !== 'function') {
    return false;
  }

  const docEl = typeof document !== 'undefined' ? document.documentElement : null;
  let curr: Element | null = element;
  while (curr && curr !== docEl) {
    for (const sel of selectors) {
      try {
        if (curr.matches(sel)) {
          return true;
        }
      } catch {
        // 忽略非法选择器语法
      }
    }
    curr = curr.parentElement;
  }

  return false;
}

/**
 * 判定元素是否为根容器，或为空的纯布局容器（无子节点且无文本，且其祖先链命中根容器）。
 * 针对 SPA 路由视图空包装 div 实施防假阴性识别。
 *
 * @param element 目标元素
 * @param rootSelectors 根选择器清单
 * @returns 是否应当识别为根/空容器
 */
export function isRootOrEmptyContainer(
  element: Element | null | undefined,
  rootSelectors: readonly string[],
): boolean {
  if (!element || typeof element.matches !== 'function') {
    return false;
  }

  // 1. 元素自身直接匹配根容器
  if (isDirectRootElement(element, rootSelectors)) {
    return true;
  }

  // 2. 元素为无类名无标识的匿名空纯布局包装节点（无子节点、无文本），且其父级命中根容器
  const isAnonymousEmptyWrapper =
    !element.id &&
    (!element.className || (typeof element.className === 'string' && !element.className.trim())) &&
    element.childElementCount === 0 &&
    (!element.textContent || !element.textContent.trim());

  if (isAnonymousEmptyWrapper && isDirectRootElement(element.parentElement, rootSelectors)) {
    return true;
  }

  return false;
}

/**
 * 执行一次 3×3 视口点阵采样。
 *
 * @param rootSelectors 根容器选择器
 * @param whitelistSelectors 白名单选择器
 * @returns 9 个采样点的详细命中诊断及是否怀疑白屏判定
 */
export function sampleViewport(
  rootSelectors: readonly string[] = DEFAULT_ROOT_SELECTORS,
  whitelistSelectors: readonly string[] = DEFAULT_WHITELIST_SELECTORS,
  threshold: number = 1.0,
): {
  isSuspected: boolean;
  points: SamplePointDiagnostic[];
  hitSelectors: string[];
  viewport: { width: number; height: number };
} {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { isSuspected: false, points: [], hitSelectors: [], viewport: { width: 0, height: 0 } };
  }

  const width = window.innerWidth || document.documentElement?.clientWidth || 0;
  const height = window.innerHeight || document.documentElement?.clientHeight || 0;

  if (width <= 0 || height <= 0) {
    return { isSuspected: false, points: [], hitSelectors: [], viewport: { width, height } };
  }

  const points: SamplePointDiagnostic[] = [];
  let rootHitCount = 0;
  let hasWhitelist = false;

  // 3x3 均分网格坐标：x ∈ [1/6, 1/2, 5/6] * W, y ∈ [1/6, 1/2, 5/6] * H
  const xFractions = [1 / 6, 1 / 2, 5 / 6];
  const yFractions = [1 / 6, 1 / 2, 5 / 6];

  for (const yFrac of yFractions) {
    for (const xFrac of xFractions) {
      const x = Math.round(width * xFrac);
      const y = Math.round(height * yFrac);

      let targetEl: Element | null = null;
      let isRoot = false;
      let isWhitelisted = false;

      if (typeof document.elementsFromPoint === 'function') {
        const elements = document.elementsFromPoint(x, y);
        targetEl = elements[0] || null;

        // 1. 检查当前坐标点下是否有任意元素命中骨架屏/Loading 白名单
        for (const el of elements) {
          if (matchesAnySelector(el, whitelistSelectors)) {
            isWhitelisted = true;
            hasWhitelist = true;
            break;
          }
        }

        // 2. 检查顶层元素是否自身直接为根容器或空的纯布局容器
        if (targetEl) {
          isRoot = isRootOrEmptyContainer(targetEl, rootSelectors);
        } else {
          isRoot = true;
        }
      }

      if (isRoot && !isWhitelisted) {
        rootHitCount += 1;
      }

      points.push({
        x,
        y,
        target: targetEl ? getElementSelector(targetEl) : 'empty',
        isRoot,
        isWhitelisted,
      });
    }
  }

  const hitSelectors = Array.from(
    new Set(points.map(p => p.target).filter(t => Boolean(t) && t !== 'empty')),
  );

  // 若采样点命中白名单（骨架屏、过渡动画），视为正常过渡态，决不判定为白屏
  if (hasWhitelist) {
    return { isSuspected: false, points, hitSelectors, viewport: { width, height } };
  }

  const rootRatio = points.length > 0 ? rootHitCount / points.length : 0;
  const isSuspected = rootRatio >= threshold;

  return { isSuspected, points, hitSelectors, viewport: { width, height } };
}

/**
 * 创建 3×3 视口点阵采样白屏感知插件。
 *
 * @param options 插件配置项
 * @returns 具备两阶段复验与手动检查能力的 MonitorPlugin 实例
 */
export function createWhiteScreenPlugin(
  options?: WhiteScreenPluginOptions,
): WhiteScreenPluginInstance {
  const rootSelectors = options?.rootSelectors ?? DEFAULT_ROOT_SELECTORS;
  const whitelistSelectors = options?.whitelistSelectors ?? DEFAULT_WHITELIST_SELECTORS;
  const initialDelay = options?.initialDelay ?? 3000;
  const recheckDelay = options?.recheckDelay ?? 1500;
  const autoCheckOnLoad = options?.autoCheckOnLoad ?? true;
  const threshold = options?.threshold ?? 1.0;

  let activeKernel: MonitorKernelInstance | null = null;
  let timerT1: ReturnType<typeof setTimeout> | null = null;
  let timerT2: ReturnType<typeof setTimeout> | null = null;
  let abortPrevRecheck: (() => void) | null = null;
  let onLoadHandler: (() => void) | null = null;
  let checkSequence = 0;

  /**
   * 执行完整的两阶段复验检测逻辑。
   */
  const executeTwoPhaseCheck = async (): Promise<boolean> => {
    if (!activeKernel || !activeKernel.isInitialized) {
      return false;
    }

    // 每次触发新检测，前置安全取消前序等待中的第二阶段复验，防并发与内存挂起
    if (abortPrevRecheck) {
      abortPrevRecheck();
      abortPrevRecheck = null;
    }
    const currentCheckId = ++checkSequence;

    const startTime = Date.now();

    // 1. 第一阶段初检
    const firstCheck = sampleViewport(rootSelectors, whitelistSelectors, threshold);
    if (!firstCheck.isSuspected) {
      return false; // 初检正常，直接返回
    }

    // 2. 初检怀疑白屏，进入第二阶段延迟防抖复验
    const wasCancelled = await new Promise<boolean>(resolve => {
      if (timerT2) {
        clearTimeout(timerT2);
      }

      timerT2 = setTimeout(() => {
        timerT2 = null;
        abortPrevRecheck = null;
        resolve(false);
      }, recheckDelay);

      abortPrevRecheck = () => {
        if (timerT2) {
          clearTimeout(timerT2);
          timerT2 = null;
        }
        resolve(true);
      };
    });

    if (
      wasCancelled ||
      currentCheckId !== checkSequence ||
      !activeKernel ||
      !activeKernel.isInitialized
    ) {
      return false;
    }

    // 3. 第二阶段复验
    const secondCheck = sampleViewport(rootSelectors, whitelistSelectors, threshold);
    if (!secondCheck.isSuspected) {
      return false; // 二次复验已自愈（如懒加载组件完成渲染），消除假阳性误报
    }

    // 4. 两阶段均判定为白屏，正式向内核派发致命白屏事件
    const duration = Date.now() - startTime;
    const payload: WhiteScreenPayload = {
      name: 'WHITE_SCREEN_ERROR',
      isWhiteScreen: true,
      samplePoints: secondCheck.points,
      hitSelectors: secondCheck.hitSelectors,
      viewport: secondCheck.viewport,
      duration,
    };

    activeKernel.emit<WhiteScreenPayload>({
      type: 'white_screen',
      level: 'fatal',
      payload,
    });

    return true;
  };

  return {
    name: 'white-screen',

    setup(kernel: MonitorKernelInstance): void {
      activeKernel = kernel;

      if (typeof window === 'undefined') {
        return;
      }

      if (autoCheckOnLoad) {
        if (document.readyState === 'complete') {
          timerT1 = setTimeout(() => {
            void executeTwoPhaseCheck();
          }, initialDelay);
        } else {
          onLoadHandler = () => {
            timerT1 = setTimeout(() => {
              void executeTwoPhaseCheck();
            }, initialDelay);
          };
          window.addEventListener('load', onLoadHandler);
        }
      }
    },

    teardown(): void {
      activeKernel = null;

      if (abortPrevRecheck) {
        abortPrevRecheck();
        abortPrevRecheck = null;
      }

      if (timerT1) {
        clearTimeout(timerT1);
        timerT1 = null;
      }

      if (timerT2) {
        clearTimeout(timerT2);
        timerT2 = null;
      }

      if (onLoadHandler && typeof window !== 'undefined') {
        window.removeEventListener('load', onLoadHandler);
        onLoadHandler = null;
      }
    },

    check(): Promise<boolean> {
      return executeTwoPhaseCheck();
    },
  };
}
