/**
 * @atengk/ai-chat-vue 原生内联 SVG 图标组件。
 *
 * 保持 L2 零外部图标依赖纯净律。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { h, type FunctionalComponent } from 'vue';

export const IconSend: FunctionalComponent = () => {
  return h(
    'svg',
    {
      viewBox: '0 0 24 24',
      width: '16',
      height: '16',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '2',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    },
    [
      h('line', { x1: '22', y1: '2', x2: '11', y2: '13' }),
      h('polygon', { points: '22 2 15 22 11 13 2 9 22 2' }),
    ],
  );
};
IconSend.displayName = 'IconSend';

export const IconStop: FunctionalComponent = () => {
  return h(
    'svg',
    {
      viewBox: '0 0 24 24',
      width: '14',
      height: '14',
      fill: 'currentColor',
    },
    [h('rect', { x: '4', y: '4', width: '16', height: '16', rx: '2' })],
  );
};
IconStop.displayName = 'IconStop';
