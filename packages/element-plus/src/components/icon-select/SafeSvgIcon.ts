/**
 * 安全的 SVG 矢量路径白名单渲染功能组件（纯 VNode，杜绝 v-html 注入风险）。
 *
 * @author Ateng
 * @since 2026-11-27
 */

import { h, type FunctionalComponent } from 'vue';
import { parseSafeSvgElements } from './svgUtils';

/**
 * SafeSvgIcon 函数组件入参契约。
 */
export interface SafeSvgIconProps {
  /** 原始 SVG 内部图形字符串 */
  svgPath?: string;
  /** 图标渲染宽高尺寸（默认 '1em'） */
  size?: string;
}

/**
 * 安全矢量图标 SVG 渲染组件。
 */
export const SafeSvgIcon: FunctionalComponent<SafeSvgIconProps> = props => {
  const iconSize = props.size ?? '1em';
  const elements = parseSafeSvgElements(props.svgPath);

  return h(
    'svg',
    {
      viewBox: '0 0 1024 1024',
      width: iconSize,
      height: iconSize,
      'aria-hidden': 'true',
    },
    elements.map(item => h(item.tag, item.attrs)),
  );
};

SafeSvgIcon.props = ['svgPath', 'size'];
SafeSvgIcon.displayName = 'SafeSvgIcon';
