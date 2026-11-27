/**
 * 高亮分词片段结构化渲染组件（纯 Text VNode，替代 v-html 杜绝 XSS 风险并保持 white-space: pre 零空白偏移）。
 *
 * @author Ateng
 * @since 2026-11-27
 */

import { h, type FunctionalComponent } from 'vue';

/**
 * 单个文本分词高亮片段。
 */
export interface HighlightSegment {
  /** 渲染纯文本内容 */
  text: string;
  /** 可选高亮语义样式类名 */
  className?: string;
}

/**
 * TokenSegments 函数组件入参契约。
 */
export interface TokenSegmentsProps {
  /** 待渲染的结构化分词片段序列 */
  segments: HighlightSegment[];
  /** 高亮片段包裹元素标签（默认 'span'，日志终端场景传 'mark'） */
  highlightTag?: 'span' | 'mark';
  /** 外层容器可选类名 */
  wrapperClass?: string;
}

/**
 * 将分词片段渲染为纯安全 Text/Span/Mark 虚拟节点，避免模板换行引入 pre 空白污染。
 */
export const TokenSegments: FunctionalComponent<TokenSegmentsProps> = props =>
  h(
    'span',
    props.wrapperClass ? { class: props.wrapperClass } : undefined,
    props.segments.map(seg =>
      seg.className
        ? h(props.highlightTag ?? 'span', { class: seg.className }, seg.text)
        : seg.text,
    ),
  );

TokenSegments.props = ['segments', 'highlightTag', 'wrapperClass'];
TokenSegments.displayName = 'TokenSegments';
