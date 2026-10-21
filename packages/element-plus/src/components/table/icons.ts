/**
 * 表格工具栏内联轻量矢量 SVG 图标组件。
 *
 * 保持纯原生、零第三方图标库臃肿依赖。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { h, type FunctionalComponent } from 'vue';

/**
 * 刷新图标。
 */
export const IconRefresh: FunctionalComponent = () => {
  return h(
    'svg',
    {
      viewBox: '0 0 1024 1024',
      width: '16',
      height: '16',
      fill: 'currentColor',
    },
    [
      h('path', {
        d: 'M770.56 226.56A384 384 0 1 0 896 512a32 32 0 1 0-64 0 320 320 0 1 1-104.96-238.08L672 320h224V96l-125.44 130.56z',
      }),
    ],
  );
};
IconRefresh.displayName = 'IconRefresh';

/**
 * 表格密度图标。
 */
export const IconDensity: FunctionalComponent = () => {
  return h(
    'svg',
    {
      viewBox: '0 0 1024 1024',
      width: '16',
      height: '16',
      fill: 'currentColor',
    },
    [
      h('path', {
        d: 'M128 192h768a32 32 0 0 1 0 64H128a32 32 0 0 1 0-64zm0 288h768a32 32 0 0 1 0 64H128a32 32 0 0 1 0-64zm0 288h768a32 32 0 0 1 0 64H128a32 32 0 0 1 0-64z',
      }),
    ],
  );
};
IconDensity.displayName = 'IconDensity';

/**
 * 斑马纹图标。
 */
export const IconStripe: FunctionalComponent = () => {
  return h(
    'svg',
    {
      viewBox: '0 0 1024 1024',
      width: '16',
      height: '16',
      fill: 'currentColor',
    },
    [
      h('path', {
        d: 'M160 160h704a32 32 0 0 1 32 32v640a32 32 0 0 1-32 32H160a32 32 0 0 1-32-32V192a32 32 0 0 1 32-32zm32 64v128h640V224H192zm0 192v192h640V416H192zm0 256v128h640V672H192z',
      }),
    ],
  );
};
IconStripe.displayName = 'IconStripe';

/**
 * 全屏图标。
 */
export const IconFullscreen: FunctionalComponent = () => {
  return h(
    'svg',
    {
      viewBox: '0 0 1024 1024',
      width: '16',
      height: '16',
      fill: 'currentColor',
    },
    [
      h('path', {
        d: 'M160 96h192a32 32 0 0 1 0 64H224v128a32 32 0 0 1-64 0V96zm672 0a32 32 0 0 1 32 32v192a32 32 0 0 1-64 0V160h-128a32 32 0 0 1 0-64h192zM192 864h128a32 32 0 0 1 0 64H160a32 32 0 0 1-32-32v-192a32 32 0 0 1 64 0v128zm640-160a32 32 0 0 1 32 32v192a32 32 0 0 1-32 32h-192a32 32 0 0 1 0-64h128v-128a32 32 0 0 1 32-32z',
      }),
    ],
  );
};
IconFullscreen.displayName = 'IconFullscreen';

/**
 * 还原/退出全屏图标。
 */
export const IconFullscreenExit: FunctionalComponent = () => {
  return h(
    'svg',
    {
      viewBox: '0 0 1024 1024',
      width: '16',
      height: '16',
      fill: 'currentColor',
    },
    [
      h('path', {
        d: 'M384 128h64a32 32 0 0 1 32 32v224a32 32 0 0 1-32 32H224a32 32 0 0 1 0-64h128V160a32 32 0 0 1 32-32zm256 0a32 32 0 0 1 32 32v192h128a32 32 0 0 1 0 64H576a32 32 0 0 1-32-32V160a32 32 0 0 1 32-32zm-224 480a32 32 0 0 1 32 32v224a32 32 0 0 1-64 0V736H224a32 32 0 0 1 0-64h192a32 32 0 0 1 32 32zm224 0a32 32 0 0 1 32-32h192a32 32 0 0 1 0 64H736v128a32 32 0 0 1-64 0V640a32 32 0 0 1 32-32z',
      }),
    ],
  );
};
IconFullscreenExit.displayName = 'IconFullscreenExit';

/**
 * 列设置图标。
 */
export const IconColumnSetting: FunctionalComponent = () => {
  return h(
    'svg',
    {
      viewBox: '0 0 1024 1024',
      width: '16',
      height: '16',
      fill: 'currentColor',
    },
    [
      h('path', {
        d: 'M256 160a32 32 0 0 1 32 32v64a32 32 0 0 1-64 0v-64a32 32 0 0 1 32-32zm0 256a32 32 0 0 1 32 32v384a32 32 0 0 1-64 0V448a32 32 0 0 1 32-32zm256-256a32 32 0 0 1 32 32v320a32 32 0 0 1-64 0V192a32 32 0 0 1 32-32zm0 512a32 32 0 0 1 32 32v128a32 32 0 0 1-64 0V704a32 32 0 0 1 32-32zm256-512a32 32 0 0 1 32 32v128a32 32 0 0 1-64 0V192a32 32 0 0 1 32-32zm0 320a32 32 0 0 1 32 32v320a32 32 0 0 1-64 0V544a32 32 0 0 1 32-32zM192 320h128a32 32 0 0 1 0 64H192a32 32 0 0 1 0-64zm256 256h128a32 32 0 0 1 0 64H448a32 32 0 0 1 0-64zm256-192h128a32 32 0 0 1 0 64H704a32 32 0 0 1 0-64z',
      }),
    ],
  );
};
IconColumnSetting.displayName = 'IconColumnSetting';
