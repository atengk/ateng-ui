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
  const themeSwitchScssPath = path.resolve(__dirname, '../../src/styles/_theme-switch.scss');
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
    expect(fs.existsSync(themeSwitchScssPath)).toBe(true);

    const loadingBaseContent = fs.readFileSync(loadingBaseScssPath, 'utf-8');
    const themeSwitchContent = fs.readFileSync(themeSwitchScssPath, 'utf-8');

    expect(loadingBaseContent.match(/!important/g)).toBeNull();
    expect(themeSwitchContent.match(/!important/g)).toBeNull();
  });
});
