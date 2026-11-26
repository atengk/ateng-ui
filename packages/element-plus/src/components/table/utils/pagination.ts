/**
 * AtengTable 分页布局编排、窄容器响应式降级与空/单页收敛工具。
 *
 * @author Ateng
 * @since 2026-11-26
 */

import type { TablePaginationAlign } from '../types';

/**
 * 窄容器响应式断点阈值（px）。
 */
export const TABLE_PAGINATION_BREAKPOINT_SM = 640;
export const TABLE_PAGINATION_BREAKPOINT_XS = 480;

/**
 * 分页布局解析入参。
 */
export interface ResolvePaginationOptions {
  /** 原始 layout 配置字符串 */
  layout: string;
  /** 总记录数 */
  total: number;
  /** 每页条数 */
  pageSize: number;
  /** 主轴对齐模式 */
  align: TablePaginationAlign;
  /** 单页时是否隐藏 jumper */
  hideJumperOnSinglePage: boolean;
  /** 是否开启窄容器响应式降级 */
  responsive: boolean;
  /** 根容器实时宽度（px） */
  containerWidth?: number;
  /** 配置的基础页码按钮数量 */
  pagerCount?: number;
}

/**
 * 分页解析结果。
 */
export interface ResolvedPaginationState {
  /** 最终透传至 ElPagination 的 layout 字符串 */
  layout: string;
  /** 是否触发了 -> 左右分栏分组 */
  hasSplitRight: boolean;
  /** 归一化与响应式降级后的合法奇数 pagerCount (5~21) */
  pagerCount: number;
  /** 响应式紧凑尺寸 */
  size?: 'small';
}

/**
 * 将页码按钮数安全规范化为 Element Plus 允许的奇数范围（5~21）。
 *
 * @param value 外部传入的页码按钮数
 * @returns 合法的奇数页码按钮数，默认 7
 */
export function normalizePagerCount(value?: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 7;
  }
  const truncated = Math.trunc(value);
  if (truncated <= 5) {
    return 5;
  }
  if (truncated >= 21) {
    return 21;
  }
  return truncated % 2 === 1 ? truncated : truncated + 1;
}

/**
 * 安全剔除指定布局令牌，若剔除后将失去全部非分割符控件，则保留原令牌列表作为保底。
 */
function stripLayoutTokens(tokens: string[], targets: ReadonlySet<string>): string[] {
  const filtered = tokens.filter(token => !targets.has(token));
  const hasCoreControl = filtered.some(token => token !== '->');
  return hasCoreControl ? filtered : tokens;
}

/**
 * 解析最终生效的分页布局、对齐分组、pagerCount 与尺寸。
 *
 * @param options 分页解析配置
 * @returns 解析后的分页属性状态
 */
export function resolveEffectivePagination(
  options: ResolvePaginationOptions,
): ResolvedPaginationState {
  const basePagerCount = normalizePagerCount(options.pagerCount);
  const rawTokens = options.layout
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);

  let tokens = rawTokens.length > 0 ? [...rawTokens] : ['prev', 'pager', 'next'];

  // 1. 单页自动收敛冗余 jumper（仅在 total > 0 且总页数 <= 1 时触发）
  const safePageSize = Math.max(1, options.pageSize || 10);
  const totalPages = options.total > 0 ? Math.ceil(options.total / safePageSize) : 0;
  if (options.hideJumperOnSinglePage && options.total > 0 && totalPages <= 1) {
    tokens = stripLayoutTokens(tokens, new Set(['jumper']));
  }

  // 2. 窄容器响应式降级（< 640px 收敛 jumper 与 pagerCount；< 480px 进一步收敛 sizes 并切换 small）
  let effectivePagerCount = basePagerCount;
  let effectiveSize: 'small' | undefined;
  const width = options.containerWidth;

  if (options.responsive && typeof width === 'number' && width > 0) {
    if (width < TABLE_PAGINATION_BREAKPOINT_SM) {
      effectivePagerCount = Math.min(basePagerCount, 5);
      tokens = stripLayoutTokens(tokens, new Set(['jumper']));
    }
    if (width < TABLE_PAGINATION_BREAKPOINT_XS) {
      tokens = stripLayoutTokens(tokens, new Set(['sizes']));
      effectiveSize = 'small';
    }
  }

  // 3. 主轴对齐分布：end 模式剥离 -> 强制靠右；between 模式下在前置 total 后自动注入 -> 分组
  if (options.align === 'end') {
    tokens = tokens.filter(token => token !== '->');
    return {
      layout: tokens.join(', '),
      hasSplitRight: false,
      pagerCount: effectivePagerCount,
      size: effectiveSize,
    };
  }

  let hasSplitRight = tokens.includes('->');
  if (!hasSplitRight) {
    const totalIndex = tokens.indexOf('total');
    if (totalIndex >= 0 && totalIndex < tokens.length - 1) {
      tokens = [...tokens.slice(0, totalIndex + 1), '->', ...tokens.slice(totalIndex + 1)];
      hasSplitRight = true;
    }
  }

  return {
    layout: tokens.join(', '),
    hasSplitRight,
    pagerCount: effectivePagerCount,
    size: effectiveSize,
  };
}
