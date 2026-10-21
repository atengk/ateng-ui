/**
 * 统一缺省态与异常占位组件纯矢量内联 SVG 插画集合。
 *
 * 颜色与描边深度复用 Element Plus 原生 CSS 变量（--el-*），天然完美自适应浅色与暗黑模式。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { h, type FunctionalComponent } from 'vue';
import type { AtengEmptyStatus } from './types';

/**
 * 状态默认文案映射表。
 */
export const DEFAULT_STATUS_DESCRIPTIONS: Record<AtengEmptyStatus, string> = {
  empty: '暂无数据',
  search: '未找到匹配结果',
  '403': '抱歉，您暂无访问该页面的权限',
  'network-error': '网络连接异常，请检查网络后重试',
  '500': '服务开小差了，请稍后重试',
};

export interface IllustrationProps {
  size?: number;
}

/**
 * 空数据插画 (Empty)。
 */
export const IllustrationEmpty: FunctionalComponent<IllustrationProps> = props => {
  const size = props.size ?? 160;
  return h(
    'svg',
    {
      class: 'at-empty-illustration at-empty-illustration--empty',
      viewBox: '0 0 160 160',
      width: size,
      height: size,
      fill: 'none',
      xmlns: 'http://www.w3.org/2000/svg',
    },
    [
      // 底盘阴影椭圆
      h('ellipse', {
        cx: 80,
        cy: 136,
        rx: 56,
        ry: 10,
        fill: 'var(--el-fill-color-darker)',
        opacity: 0.25,
      }),
      // 盒子底座与内部
      h('path', {
        d: 'M32 64L80 44L128 64L80 84L32 64Z',
        fill: 'var(--el-fill-color-light)',
        stroke: 'var(--el-border-color)',
        'stroke-width': 2,
      }),
      // 盒子正面左侧
      h('path', {
        d: 'M32 64L80 84V124L32 104V64Z',
        fill: 'var(--el-fill-color)',
        stroke: 'var(--el-border-color)',
        'stroke-width': 2,
      }),
      // 盒子正面右侧
      h('path', {
        d: 'M80 84L128 64V104L80 124V84Z',
        fill: 'var(--el-fill-color-dark)',
        stroke: 'var(--el-border-color)',
        'stroke-width': 2,
      }),
      // 盒子左开盖翻页
      h('path', {
        d: 'M32 64L16 48L64 32L80 44L32 64Z',
        fill: 'var(--el-fill-color-light)',
        stroke: 'var(--el-border-color)',
        'stroke-width': 2,
      }),
      // 右翻盖
      h('path', {
        d: 'M128 64L144 48L96 32L80 44L128 64Z',
        fill: 'var(--el-fill-color-light)',
        stroke: 'var(--el-border-color)',
        'stroke-width': 2,
      }),
      // 悬浮装饰：主色高亮光点与空虚线
      h('circle', {
        cx: 80,
        cy: 32,
        r: 3,
        fill: 'var(--el-color-primary)',
      }),
      h('circle', {
        cx: 116,
        cy: 28,
        r: 2,
        fill: 'var(--el-color-primary-light-5)',
      }),
      h('path', {
        d: 'M68 64H92',
        stroke: 'var(--el-color-primary)',
        'stroke-width': 2,
        'stroke-linecap': 'round',
        'stroke-dasharray': '3 3',
      }),
    ],
  );
};

/**
 * 搜索无结果插画 (Search)。
 */
export const IllustrationSearch: FunctionalComponent<IllustrationProps> = props => {
  const size = props.size ?? 160;
  return h(
    'svg',
    {
      class: 'at-empty-illustration at-empty-illustration--search',
      viewBox: '0 0 160 160',
      width: size,
      height: size,
      fill: 'none',
      xmlns: 'http://www.w3.org/2000/svg',
    },
    [
      // 底盘
      h('ellipse', {
        cx: 80,
        cy: 136,
        rx: 52,
        ry: 8,
        fill: 'var(--el-fill-color-darker)',
        opacity: 0.25,
      }),
      // 背景空白文档
      h('rect', {
        x: 44,
        y: 28,
        width: 72,
        height: 94,
        rx: 6,
        fill: 'var(--el-fill-color-light)',
        stroke: 'var(--el-border-color)',
        'stroke-width': 2,
      }),
      // 文档折角
      h('path', {
        d: 'M98 28V46H116',
        fill: 'none',
        stroke: 'var(--el-border-color)',
        'stroke-width': 2,
      }),
      // 空白虚线横条
      h('line', {
        x1: 58,
        y1: 52,
        x2: 88,
        y2: 52,
        stroke: 'var(--el-text-color-placeholder)',
        'stroke-width': 2,
        'stroke-linecap': 'round',
      }),
      h('line', {
        x1: 58,
        y1: 66,
        x2: 102,
        y2: 66,
        stroke: 'var(--el-text-color-placeholder)',
        'stroke-width': 2,
        'stroke-linecap': 'round',
        'stroke-dasharray': '4 4',
      }),
      // 放大镜主圆盘
      h('circle', {
        cx: 92,
        cy: 88,
        r: 26,
        fill: 'var(--el-bg-color)',
        stroke: 'var(--el-color-primary)',
        'stroke-width': 3,
      }),
      // 放大镜高光反射
      h('path', {
        d: 'M80 76C84 72 90 70 96 70',
        stroke: 'var(--el-color-primary-light-3)',
        'stroke-width': 2.5,
        'stroke-linecap': 'round',
      }),
      // 放大镜把手
      h('line', {
        x1: 111,
        y1: 107,
        x2: 132,
        y2: 128,
        stroke: 'var(--el-color-primary)',
        'stroke-width': 5,
        'stroke-linecap': 'round',
      }),
    ],
  );
};

/**
 * 403 无权限插画 (Forbidden)。
 */
export const Illustration403: FunctionalComponent<IllustrationProps> = props => {
  const size = props.size ?? 160;
  return h(
    'svg',
    {
      class: 'at-empty-illustration at-empty-illustration--403',
      viewBox: '0 0 160 160',
      width: size,
      height: size,
      fill: 'none',
      xmlns: 'http://www.w3.org/2000/svg',
    },
    [
      // 底盘
      h('ellipse', {
        cx: 80,
        cy: 136,
        rx: 52,
        ry: 8,
        fill: 'var(--el-fill-color-darker)',
        opacity: 0.25,
      }),
      // 盾牌外轮廓
      h('path', {
        d: 'M80 28L120 44V80C120 106 80 126 80 126C80 126 40 106 40 80V44L80 28Z',
        fill: 'var(--el-fill-color-light)',
        stroke: 'var(--el-border-color)',
        'stroke-width': 2.5,
      }),
      // 锁梁
      h('path', {
        d: 'M70 74V62C70 56.5 74.5 52 80 52C85.5 52 90 56.5 90 62V74',
        fill: 'none',
        stroke: 'var(--el-color-warning)',
        'stroke-width': 3,
        'stroke-linecap': 'round',
      }),
      // 锁身
      h('rect', {
        x: 64,
        y: 74,
        width: 32,
        height: 26,
        rx: 4,
        fill: 'var(--el-color-warning)',
      }),
      // 钥匙孔
      h('circle', {
        cx: 80,
        cy: 84,
        r: 3,
        fill: 'var(--el-bg-color)',
      }),
      h('line', {
        x1: 80,
        y1: 87,
        x2: 80,
        y2: 92,
        stroke: 'var(--el-bg-color)',
        'stroke-width': 2,
        'stroke-linecap': 'round',
      }),
    ],
  );
};

/**
 * 网络异常插画 (Network Error)。
 */
export const IllustrationNetworkError: FunctionalComponent<IllustrationProps> = props => {
  const size = props.size ?? 160;
  return h(
    'svg',
    {
      class: 'at-empty-illustration at-empty-illustration--network-error',
      viewBox: '0 0 160 160',
      width: size,
      height: size,
      fill: 'none',
      xmlns: 'http://www.w3.org/2000/svg',
    },
    [
      // 底盘
      h('ellipse', {
        cx: 80,
        cy: 136,
        rx: 52,
        ry: 8,
        fill: 'var(--el-fill-color-darker)',
        opacity: 0.25,
      }),
      // 云朵主体
      h('path', {
        d: 'M48 94H116C127 94 136 85 136 74C136 63.5 128 55 118 54C116 40 104 30 89 30C76 30 65 37 60 48C58 48 56 48 54 48C40 48 28 60 28 74C28 85 37 94 48 94Z',
        fill: 'var(--el-fill-color-light)',
        stroke: 'var(--el-border-color)',
        'stroke-width': 2,
      }),
      // 断开的闪电
      h('path', {
        d: 'M84 56L72 80H86L76 106',
        fill: 'none',
        stroke: 'var(--el-color-danger)',
        'stroke-width': 3,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
      }),
      // 断开警示叉叉
      h('line', {
        x1: 104,
        y1: 74,
        x2: 114,
        y2: 84,
        stroke: 'var(--el-color-danger)',
        'stroke-width': 2.5,
        'stroke-linecap': 'round',
      }),
      h('line', {
        x1: 114,
        y1: 74,
        x2: 104,
        y2: 84,
        stroke: 'var(--el-color-danger)',
        'stroke-width': 2.5,
        'stroke-linecap': 'round',
      }),
    ],
  );
};

/**
 * 500 系统异常插画 (Server Error)。
 */
export const Illustration500: FunctionalComponent<IllustrationProps> = props => {
  const size = props.size ?? 160;
  return h(
    'svg',
    {
      class: 'at-empty-illustration at-empty-illustration--500',
      viewBox: '0 0 160 160',
      width: size,
      height: size,
      fill: 'none',
      xmlns: 'http://www.w3.org/2000/svg',
    },
    [
      // 底盘
      h('ellipse', {
        cx: 80,
        cy: 136,
        rx: 52,
        ry: 8,
        fill: 'var(--el-fill-color-darker)',
        opacity: 0.25,
      }),
      // 主故障齿轮轮廓
      h('circle', {
        cx: 72,
        cy: 74,
        r: 28,
        fill: 'var(--el-fill-color-light)',
        stroke: 'var(--el-border-color)',
        'stroke-width': 2.5,
      }),
      // 齿轮内圈
      h('circle', {
        cx: 72,
        cy: 74,
        r: 12,
        fill: 'var(--el-bg-color)',
        stroke: 'var(--el-border-color)',
        'stroke-width': 2,
      }),
      // 齿轮外齿装饰
      h('path', {
        d: 'M72 40V46M72 102V108M38 74H44M100 74H106M48 50L52 54M92 94L96 98M48 98L52 94M92 54L96 50',
        stroke: 'var(--el-border-color)',
        'stroke-width': 4,
        'stroke-linecap': 'round',
      }),
      // 右下方警示三角标
      h('path', {
        d: 'M108 84L128 118H88L108 84Z',
        fill: 'var(--el-color-danger)',
        stroke: 'var(--el-bg-color)',
        'stroke-width': 2,
        'stroke-linejoin': 'round',
      }),
      // 警示感叹号
      h('line', {
        x1: 108,
        y1: 96,
        x2: 108,
        y2: 106,
        stroke: '#FFFFFF',
        'stroke-width': 2.5,
        'stroke-linecap': 'round',
      }),
      h('circle', {
        cx: 108,
        cy: 112,
        r: 1.5,
        fill: '#FFFFFF',
      }),
    ],
  );
};
