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

export const IconArrowDown: FunctionalComponent = () => {
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
      h('line', { x1: '12', y1: '5', x2: '12', y2: '19' }),
      h('polyline', { points: '19 12 12 19 5 12' }),
    ],
  );
};
IconArrowDown.displayName = 'IconArrowDown';

export const IconTool: FunctionalComponent = () => {
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
        d: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z',
      }),
    ],
  );
};
IconTool.displayName = 'IconTool';

export const IconLoading: FunctionalComponent = () => {
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
      class: 'at-ai-chat__spin',
    },
    [h('path', { d: 'M21 12a9 9 0 1 1-6.219-8.56' })],
  );
};
IconLoading.displayName = 'IconLoading';

export const IconX: FunctionalComponent = () => {
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
      h('line', { x1: '18', y1: '6', x2: '6', y2: '18' }),
      h('line', { x1: '6', y1: '6', x2: '18', y2: '18' }),
    ],
  );
};
IconX.displayName = 'IconX';

export const IconAlertTriangle: FunctionalComponent = () => {
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
        d: 'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z',
      }),
      h('line', { x1: '12', y1: '9', x2: '12', y2: '13' }),
      h('line', { x1: '12', y1: '17', x2: '12.01', y2: '17' }),
    ],
  );
};
IconAlertTriangle.displayName = 'IconAlertTriangle';

export const IconFileCode: FunctionalComponent = () => {
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
      h('path', { d: 'M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z' }),
      h('polyline', { points: '14 2 14 8 20 8' }),
      h('polyline', { points: '10 13 8 15 10 17' }),
      h('polyline', { points: '14 13 16 15 14 17' }),
    ],
  );
};
IconFileCode.displayName = 'IconFileCode';

export const IconEye: FunctionalComponent = () => {
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
      h('path', { d: 'M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z' }),
      h('circle', { cx: '12', cy: '12', r: '3' }),
    ],
  );
};
IconEye.displayName = 'IconEye';

export const IconGitDiff: FunctionalComponent = () => {
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
      h('circle', { cx: '6', cy: '6', r: '3' }),
      h('circle', { cx: '18', cy: '18', r: '3' }),
      h('path', { d: 'M6 9v6a3 3 0 0 0 3 3h6' }),
    ],
  );
};
IconGitDiff.displayName = 'IconGitDiff';

export const IconDownload: FunctionalComponent = () => {
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
      h('path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }),
      h('polyline', { points: '7 10 12 15 17 10' }),
      h('line', { x1: '12', y1: '15', x2: '12', y2: '3' }),
    ],
  );
};
IconDownload.displayName = 'IconDownload';

export const IconMaximize: FunctionalComponent = () => {
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
      h('polyline', { points: '15 3 21 3 21 9' }),
      h('polyline', { points: '9 21 3 21 3 15' }),
      h('line', { x1: '21', y1: '3', x2: '14', y2: '10' }),
      h('line', { x1: '3', y1: '21', x2: '10', y2: '14' }),
    ],
  );
};
IconMaximize.displayName = 'IconMaximize';

export const IconMinimize: FunctionalComponent = () => {
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
      h('polyline', { points: '4 14 10 14 10 20' }),
      h('polyline', { points: '20 10 14 10 14 4' }),
      h('line', { x1: '14', y1: '10', x2: '21', y2: '3' }),
      h('line', { x1: '3', y1: '21', x2: '10', y2: '14' }),
    ],
  );
};
IconMinimize.displayName = 'IconMinimize';

export const IconThumbsUp: FunctionalComponent = () => {
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
      h('path', { d: 'M7 10v12' }),
      h('path', {
        d: 'M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h3',
      }),
    ],
  );
};
IconThumbsUp.displayName = 'IconThumbsUp';

export const IconThumbsDown: FunctionalComponent = () => {
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
      h('path', { d: 'M17 14V2' }),
      h('path', {
        d: 'M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-3',
      }),
    ],
  );
};
IconThumbsDown.displayName = 'IconThumbsDown';

export const IconRotateCcw: FunctionalComponent = () => {
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
      h('path', { d: 'M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8' }),
      h('path', { d: 'M3 3v5h5' }),
    ],
  );
};
IconRotateCcw.displayName = 'IconRotateCcw';

export const IconEdit: FunctionalComponent = () => {
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
      h('path', { d: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7' }),
      h('path', { d: 'M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z' }),
    ],
  );
};
IconEdit.displayName = 'IconEdit';

export const IconVolume2: FunctionalComponent = () => {
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
      h('polygon', { points: '11 5 6 9 2 9 2 15 6 15 11 19 11 5' }),
      h('path', { d: 'M15.54 8.46a5 5 0 0 1 0 7.07' }),
      h('path', { d: 'M19.07 4.93a10 10 0 0 1 0 14.14' }),
    ],
  );
};
IconVolume2.displayName = 'IconVolume2';

export const IconVolumeX: FunctionalComponent = () => {
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
      h('polygon', { points: '11 5 6 9 2 9 2 15 6 15 11 19 11 5' }),
      h('line', { x1: '23', y1: '9', x2: '17', y2: '15' }),
      h('line', { x1: '17', y1: '9', x2: '23', y2: '15' }),
    ],
  );
};
IconVolumeX.displayName = 'IconVolumeX';

export const IconPaperclip: FunctionalComponent = () => {
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
        d: 'm21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l7.88-7.88',
      }),
    ],
  );
};
IconPaperclip.displayName = 'IconPaperclip';

export const IconTrash: FunctionalComponent = () => {
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
      h('path', { d: 'M3 6h18' }),
      h('path', { d: 'M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6' }),
      h('path', { d: 'M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2' }),
    ],
  );
};
IconTrash.displayName = 'IconTrash';
