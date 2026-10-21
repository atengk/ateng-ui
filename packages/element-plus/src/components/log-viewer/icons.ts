/**
 * 实时日志终端内联矢量 SVG 图标组件。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { h, type FunctionalComponent } from 'vue';

export const IconScrollPause: FunctionalComponent = () =>
  h('svg', { viewBox: '0 0 1024 1024', width: '14', height: '14', fill: 'currentColor' }, [
    h('path', { d: 'M304 192h128v640H304zm288 0h128v640H592z' }),
  ]);

export const IconScrollPlay: FunctionalComponent = () =>
  h('svg', { viewBox: '0 0 1024 1024', width: '14', height: '14', fill: 'currentColor' }, [
    h('path', { d: 'M256 192l576 320-576 320z' }),
  ]);

export const IconClear: FunctionalComponent = () =>
  h('svg', { viewBox: '0 0 1024 1024', width: '14', height: '14', fill: 'currentColor' }, [
    h('path', {
      d: 'M832 256H672V160c0-35.2-28.8-64-64-64H416c-35.2 0-64 28.8-64 64v96H192c-17.6 0-32 14.4-32 32s14.4 32 32 32h64v544c0 52.8 43.2 96 96 96h320c52.8 0 96-43.2 96-96V320h64c17.6 0 32-14.4 32-32s-14.4-32-32-32zM416 160h192v96H416V160zm368 704c0 17.6-14.4 32-32 32H432c-17.6 0-32-14.4-32-32V320h384v544z',
    }),
  ]);

export const IconDownload: FunctionalComponent = () =>
  h('svg', { viewBox: '0 0 1024 1024', width: '14', height: '14', fill: 'currentColor' }, [
    h('path', {
      d: 'M512 640l226.24-226.24-45.28-45.28L544 517.44V128h-64v389.44L331.04 368.48l-45.28 45.28L512 640z',
    }),
    h('path', {
      d: 'M832 576v256a64 64 0 0 1-64 64H256a64 64 0 0 1-64-64V576H128v256a128 128 0 0 0 128 128h512a128 128 0 0 0 128-128V576h-64z',
    }),
  ]);
