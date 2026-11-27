/**
 * `@atengk/element-plus` 基础样式产物 (`dist/index.css` / `style.css`) 完整性与解耦回归测试。
 *
 * 验证在不额外引入 `theme-pro.css` 时：
 * 1. `dist/index.css` 产物存在且包含核心 Design Tokens 保底变量；
 * 2. `AtengLoadingBar`（`.at-loading-bar`、`__track`、`is-active`、`is-error`）样式完整存在；
 * 3. `AtengLoading`（`.at-loading-container`、`shimmer`、`dots`、`skeleton` 与三套关键帧）样式完整存在；
 * 4. `initTheme()` 防闪烁保护（`html.is-theme-switching` 与 `.is-theme-switching`）同时支持根文档与自定义容器；
 * 5. `--el-color-primary-rgb`、`--el-color-danger-rgb` 与 `--el-mask-color` 具备安全 CSS Fallback；
 * 6. `.at-loading-container` 与 `.at-skeleton-active` 暗黑选择器均兼容 `:root.dark` 与子树 `.dark`；
 * 7. 下沉的加载与主题切换规则严格遵守零 `!important` 铁律。
 *
 * @author Ateng
 * @since 2026-11-24
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Base Style Bundle (dist/index.css) 产物完整性与解耦门禁', () => {
  const indexCssPath = path.resolve(__dirname, '../../dist/index.css');
  const loadingBaseScssPath = path.resolve(__dirname, '../../src/styles/_loading-base.scss');
  const switchBaseScssPath = path.resolve(__dirname, '../../src/styles/_switch-base.scss');
  const themeSwitchScssPath = path.resolve(__dirname, '../../src/styles/_theme-switch.scss');
  const overlaysBaseScssPath = path.resolve(__dirname, '../../src/styles/_overlays-base.scss');
  const readIndexCss = () => fs.readFileSync(indexCssPath, 'utf-8');

  it('dist/index.css 产物存在且体积健康', () => {
    expect(fs.existsSync(indexCssPath)).toBe(true);
    expect(readIndexCss().length).toBeGreaterThan(50000);
  });

  it('包含核心设计令牌保底变量与 v-skeleton 规则', () => {
    const content = readIndexCss();
    expect(content).toContain('--at-z-index-top-bar');
    expect(content).toContain('--at-radius-card');
    expect(content).toContain('.at-skeleton-active');
    expect(content).toContain('at-skeleton-pulse');
  });

  it('包含 AtengTable 双卡表面、AtengQueryForm 与分页容器自洽样式规则', () => {
    const content = readIndexCss();
    expect(content).toContain('.at-table__surface');
    expect(content).toContain('--at-table-card-radius');
    expect(content).toContain('--at-table-query-gap');
    expect(content).toContain('--at-query-form-border');
    expect(content).toContain('.at-table__pagination');
    expect(content).toContain('.at-excel-feedback__pagination');
  });

  it('包含 AtengLoadingBar 核心样式与 RGB 变量 CSS Fallback', () => {
    const content = readIndexCss();
    expect(content).toContain('.at-loading-bar');
    expect(content).toContain('.at-loading-bar__track');
    expect(content).toContain('.at-loading-bar.is-active');
    expect(content).toContain('.at-loading-bar.is-error');
    expect(content).toContain('--at-loading-bar-height');
    expect(content).toMatch(/var\(--el-color-primary-rgb,\s*64,\s*158,\s*255\)/);
    expect(content).toMatch(/var\(--el-color-danger-rgb,\s*245,\s*108,\s*108\)/);
  });

  it('包含 AtengLoading 全模态样式（shimmer / dots / skeleton）与三套关键帧', () => {
    const content = readIndexCss();
    expect(content).toContain('.at-loading-container');
    expect(content).toContain('.at-loading__content');
    expect(content).toContain('is-loading-shimmer');
    expect(content).toContain('.at-loading-shimmer-track');
    expect(content).toContain('.at-loading-shimmer-flow');
    expect(content).toContain('.at-loading-overlay');
    expect(content).toContain('.at-loading-text');
    expect(content).toContain('.at-loading-skeleton');
    expect(content).toContain('.at-loader-wave-dots');
    expect(content).toContain('atShimmerFlow');
    expect(content).toContain('atWaveBounce');
    expect(content).toContain('atSkeletonBreathe');
    // 浅色遮罩 Token 化
    expect(content).toMatch(/var\(--el-mask-color,\s*rgba\(255,\s*255,\s*255,\s*0?\.85\)\)/);
  });

  it('包含 initTheme() 过渡风暴防御规则，同时覆盖 html 与自定义 target 容器', () => {
    const content = readIndexCss();
    expect(content).toContain('html.is-theme-switching');
    expect(content).toContain('.is-theme-switching');
    expect(content).toContain('transition-property:none');
    expect(content).toContain('transition-duration:0s');
  });

  it('暗黑选择器兼容 :root.dark 与局部子树 .dark（不再局限于 html.dark）', () => {
    const content = readIndexCss();
    expect(content).toMatch(/:root\.dark\s+\.at-skeleton-active::?after/);
    expect(content).toMatch(/\.dark\s+\.at-skeleton-active::?after/);
    expect(content).toMatch(/:root\.dark\s+\.at-loading-container\s+\.at-loading-overlay/);
    expect(content).toMatch(/\.dark\s+\.at-loading-container\s+\.at-loading-overlay/);
    expect(content).not.toContain('html.dark .at-skeleton-active');
    expect(content).not.toContain('html.dark .at-loading-container');
  });

  it('抽离的共用功能样式源码存在且严格遵守零 !important 铁律', () => {
    expect(fs.existsSync(loadingBaseScssPath)).toBe(true);
    expect(fs.existsSync(switchBaseScssPath)).toBe(true);
    expect(fs.existsSync(themeSwitchScssPath)).toBe(true);
    expect(fs.existsSync(overlaysBaseScssPath)).toBe(true);

    const loadingBaseContent = fs.readFileSync(loadingBaseScssPath, 'utf-8');
    const switchBaseContent = fs.readFileSync(switchBaseScssPath, 'utf-8');
    const themeSwitchContent = fs.readFileSync(themeSwitchScssPath, 'utf-8');
    const overlaysBaseContent = fs.readFileSync(overlaysBaseScssPath, 'utf-8');

    expect(loadingBaseContent.match(/!important/g)).toBeNull();
    expect(switchBaseContent.match(/!important/g)).toBeNull();
    expect(themeSwitchContent.match(/!important/g)).toBeNull();
    expect(overlaysBaseContent.match(/!important/g)).toBeNull();
  });

  it('dist/index.css 独立包含 AtengDialog Flex 布局与非全屏视口钳位规则（零 theme-pro 依赖）', () => {
    const content = readIndexCss();
    expect(content).toContain('.el-dialog.at-dialog');
    expect(content).toContain('.el-dialog.at-dialog:not(.is-fullscreen)');
    expect(content).toContain('.el-dialog.at-dialog:not(.is-fullscreen):not(.is-align-center)');
    expect(content).toMatch(/\.el-dialog\.at-dialog\s+\.el-dialog__body\{[^}]*min-height:\s*0/);
    expect(content).toMatch(
      /\.el-dialog\.at-dialog\s+\.el-dialog__footer[^{]*\{[^}]*flex-shrink:\s*0/,
    );
  });

  it('AtengPageContainer 页头主行与操作区具备窄屏弹性换行与最大宽度约束（防 390px 溢出）', () => {
    const content = readIndexCss();
    expect(content).toMatch(
      /\.at-page-container__main-row\[data-v-[^\]]+\]\{[^}]*flex-wrap:\s*wrap/,
    );
    expect(content).toMatch(
      /\.at-page-container__extra-wrapper\[data-v-[^\]]+\]\{[^}]*flex-wrap:\s*wrap/,
    );
    expect(content).toMatch(
      /\.at-page-container__extra-wrapper\[data-v-[^\]]+\]\{[^}]*max-width:\s*100%/,
    );
    expect(content).toMatch(/\.at-page-container__extra\[data-v-[^\]]+\]\{[^}]*flex-wrap:\s*wrap/);
    expect(content).toMatch(
      /\.at-page-container__extra-actions\[data-v-[^\]]+\]\{[^}]*flex-wrap:\s*wrap/,
    );
    expect(content).toMatch(
      /\.at-page-container__extra-actions\[data-v-[^\]]+\]\{[^}]*max-width:\s*100%/,
    );
    expect(content).toMatch(
      /\.at-page-container__title\[data-v-[^\]]+\]\{[^}]*overflow-wrap:\s*anywhere/,
    );
    expect(content).toMatch(
      /\.at-page-container__sub-title\[data-v-[^\]]+\]\{[^}]*overflow-wrap:\s*anywhere/,
    );
  });

  it('AtengProLayout 移动抽屉遮罩彻底剥离 backdrop-filter 且收起态具备 visibility: hidden', () => {
    const content = readIndexCss();
    const maskRuleMatch = content.match(/\.at-pro-layout__drawer-mask\[data-v-[^\]]+\]\{[^}]+\}/);
    expect(maskRuleMatch).not.toBeNull();
    expect(maskRuleMatch![0]).not.toContain('backdrop-filter');
    expect(content).toMatch(
      /\.at-pro-layout\.is-mobile\.is-collapsed[^}]*\.at-pro-layout__aside\.is-mobile-drawer[^{]*\{[^}]*visibility:\s*hidden/,
    );
  });

  it('包含 ElSwitch 无 Preflight 盒模型防线与 AtengTable 刷新按钮旋转动画', () => {
    const content = readIndexCss();
    expect(content).toContain('.el-switch__core .el-switch__inner');
    expect(content).toContain('box-sizing:border-box');
    expect(content).toContain('.at-table__tool-btn');
    expect(content).toContain('at-table-spin');
  });
});
