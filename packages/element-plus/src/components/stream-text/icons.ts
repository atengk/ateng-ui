/**
 * 流式打字机内联矢量 SVG 图标组件。
 *
 * 保持纯原生、零第三方图标库依赖。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { h, type FunctionalComponent } from 'vue';

export const IconCopy: FunctionalComponent = () => {
  return h(
    'svg',
    {
      viewBox: '0 0 1024 1024',
      width: '14',
      height: '14',
      fill: 'currentColor',
    },
    [
      h('path', {
        d: 'M768 832a128 128 0 0 1-128 128H192A128 128 0 0 1 64 832V384a128 128 0 0 1 128-128v64a64 64 0 0 0-64 64v448a64 64 0 0 0 64 64h448a64 64 0 0 0 64-64h64z',
      }),
      h('path', {
        d: 'M384 128a64 64 0 0 0-64 64v512a64 64 0 0 0 64 64h448a64 64 0 0 0 64-64V192a64 64 0 0 0-64-64H384zm0-64h448a128 128 0 0 1 128 128v512a128 128 0 0 1-128 128H384a128 128 0 0 1-128-128V192a128 128 0 0 1 128-128z',
      }),
    ],
  );
};
IconCopy.displayName = 'IconCopy';
