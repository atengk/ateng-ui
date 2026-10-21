/**
 * 导出按钮内联轻量矢量 SVG 图标组件。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { h, type FunctionalComponent } from 'vue';

export const IconExport: FunctionalComponent = () => {
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
        d: 'M512 640l226.24-226.24-45.28-45.28L544 517.44V128h-64v389.44L331.04 368.48l-45.28 45.28L512 640z',
      }),
      h('path', {
        d: 'M832 576v256a64 64 0 0 1-64 64H256a64 64 0 0 1-64-64V576H128v256a128 128 0 0 0 128 128h512a128 128 0 0 0 128-128V576h-64z',
      }),
    ],
  );
};
IconExport.displayName = 'IconExport';
