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

export const IconBrain: FunctionalComponent = () => {
  return h(
    'svg',
    {
      viewBox: '0 0 24 24',
      width: '14',
      height: '14',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '2',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    },
    [
      h('path', {
        d: 'M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.04z',
      }),
      h('path', {
        d: 'M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.04z',
      }),
    ],
  );
};
IconBrain.displayName = 'IconBrain';

export const IconChevronDown: FunctionalComponent = () => {
  return h(
    'svg',
    {
      viewBox: '0 0 24 24',
      width: '14',
      height: '14',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '2',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    },
    [h('polyline', { points: '6 9 12 15 18 9' })],
  );
};
IconChevronDown.displayName = 'IconChevronDown';

export const IconCopy: FunctionalComponent = () => {
  return h(
    'svg',
    {
      viewBox: '0 0 24 24',
      width: '14',
      height: '14',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '2',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    },
    [
      h('rect', { x: '9', y: '9', width: '13', height: '13', rx: '2', ry: '2' }),
      h('path', { d: 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' }),
    ],
  );
};
IconCopy.displayName = 'IconCopy';

export const IconCheck: FunctionalComponent = () => {
  return h(
    'svg',
    {
      viewBox: '0 0 24 24',
      width: '14',
      height: '14',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '2',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    },
    [h('polyline', { points: '20 6 9 17 4 12' })],
  );
};
IconCheck.displayName = 'IconCheck';
