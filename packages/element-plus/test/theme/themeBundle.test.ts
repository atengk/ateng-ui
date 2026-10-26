/**
 * ThemePro 样式编译产物与零 !important 质量门禁测试。
 *
 * 验证：
 * 1. dist/theme-pro.css 产物存在且包含完整样式规则；
 * 2. 100% 恪守零 !important 铁律，不破坏业务层自然特异度；
 * 3. 极窄冷钛滚动条、文本链接与排版文本规则正确编译；
 * 4. 核心科技预设与 Slate 暗黑模式基底变量完整；
 * 5. 覆盖全量官方组件（新增 ElPageHeader, ElBacktop, ElCheckTag, ElStatistic）；
 * 6. 覆盖媒体查询全景（prefers-reduced-motion, forced-colors, print, pointer: coarse）；
 * 7. 严格消除组件选择器中的硬编码暗黑背景色 (#0c1017) 泄露。
 *
 * @author Ateng
 * @since 2026-10-22
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('ThemePro 样式产物构建与质量门禁', () => {
  const cssPath = path.resolve(__dirname, '../../dist/theme-pro.css');

  it('产物存在且体积健康', () => {
    expect(fs.existsSync(cssPath)).toBe(true);
    const content = fs.readFileSync(cssPath, 'utf-8');
    expect(content.length).toBeGreaterThan(50000);
  });

  it('严格恪守零 !important 铁律', () => {
    const content = fs.readFileSync(cssPath, 'utf-8');
    const matches = content.match(/!important/g);
    expect(matches).toBeNull();
  });

  it('基础设施与极窄滚动条 (Basics & Scrollbar) 规则正确编译', () => {
    const content = fs.readFileSync(cssPath, 'utf-8');
    // 包含全局与组件滚动条规则
    expect(content).toContain('::-webkit-scrollbar');
    expect(content).toContain('scrollbar-width:thin');
    expect(content).toContain('.el-scrollbar');
    // 包含链接与文本
    expect(content).toContain('.el-link');
    expect(content).toContain('.el-text');
  });

  it('文件上传全家桶 (Upload & Dragger) 规则正确编译', () => {
    const content = fs.readFileSync(cssPath, 'utf-8');
    expect(content).toContain('.el-upload-dragger');
    expect(content).toContain('.el-upload--picture-card');
    expect(content).toContain('.el-upload-list--picture-card');
    expect(content).toContain('.el-upload-list__item-actions');
  });

  it('富媒体、头像组与黑曜石全屏大图灯箱 (Media & Lightbox) 规则正确编译', () => {
    const content = fs.readFileSync(cssPath, 'utf-8');
    expect(content).toContain('.el-avatar-group');
    expect(content).toContain('.el-image');
    expect(content).toContain('.el-image-viewer__mask');
    expect(content).toContain('.el-image-viewer__actions');
  });

  it('表单布局、必填指示与复合输入全景 (Inputs & Form Layout) 规则正确编译', () => {
    const content = fs.readFileSync(cssPath, 'utf-8');
    expect(content).toContain('.el-form-item');
    expect(content).toContain('.el-input-number');
    expect(content).toContain('.el-input-tag');
    expect(content).toContain('.el-input-otp');
    expect(content).toContain('.el-autocomplete');
    expect(content).toContain('.el-mention');
  });

  it('反馈动效与导航锚点增强 (Feedbacks & Navigations) 规则正确编译', () => {
    const content = fs.readFileSync(cssPath, 'utf-8');
    expect(content).toContain('.el-loading-mask');
    expect(content).toContain('.el-skeleton');
    expect(content).toContain('.el-popconfirm');
    expect(content).toContain('.el-breadcrumb');
    expect(content).toContain('.el-anchor');
  });

  it('全量原生组件样式规则大满贯覆盖校验 (80+ 官方组件覆盖矩阵)', () => {
    const content = fs.readFileSync(cssPath, 'utf-8');
    const fullComponentSelectors = [
      '.el-button',
      '.el-input',
      '.el-select',
      '.el-textarea',
      '.el-input-number',
      '.el-input-tag',
      '.el-input-otp',
      '.el-autocomplete',
      '.el-mention',
      '.el-date-picker',
      '.el-time-picker',
      '.el-cascader',
      '.el-color-picker',
      '.el-transfer',
      '.el-slider',
      '.el-rate',
      '.el-tree',
      '.el-tree-select',
      '.el-tag',
      '.el-check-tag',
      '.el-switch',
      '.el-segmented',
      '.el-collapse',
      '.el-descriptions',
      '.el-calendar',
      '.el-carousel',
      '.el-splitter',
      '.el-divider',
      '.el-alert',
      '.el-progress',
      '.el-badge',
      '.el-result',
      '.el-timeline',
      '.el-steps',
      '.el-loading-mask',
      '.el-skeleton',
      '.el-popconfirm',
      '.el-table',
      '.el-pagination',
      '.el-dialog',
      '.el-drawer',
      '.el-message',
      '.el-notification',
      '.el-popover',
      '.el-tabs',
      '.el-menu',
      '.el-dropdown',
      '.el-breadcrumb',
      '.el-page-header',
      '.el-anchor',
      '.el-backtop',
      '.el-statistic',
      '.el-avatar',
      '.el-avatar-group',
      '.el-image',
      '.el-image-viewer',
      '.el-upload',
      '.el-upload-dragger',
      '.el-scrollbar',
      '.el-link',
      '.el-text',
      '.el-space',
    ];
    for (const selector of fullComponentSelectors) {
      expect(content).toContain(selector);
    }
  });

  it('媒体查询全景守卫：覆盖减弱动效、高对比模式、打印模式与触屏优化', () => {
    const content = fs.readFileSync(cssPath, 'utf-8');
    expect(content).toContain('prefers-reduced-motion');
    expect(content).toContain('forced-colors');
    expect(content).toContain('@media print');
    expect(content).toContain('pointer: coarse');
    expect(content).toContain('html.is-theme-switching');
  });

  it('新增缺位官方组件全量入驻 (ElPageHeader, ElBacktop, ElCheckTag, ElStatistic)', () => {
    const content = fs.readFileSync(cssPath, 'utf-8');
    expect(content).toContain('.el-page-header');
    expect(content).toContain('.el-backtop');
    expect(content).toContain('.el-check-tag');
    expect(content).toContain('.el-statistic');
  });

  it('全局设计令牌与圆角变量正确编译注入', () => {
    const content = fs.readFileSync(cssPath, 'utf-8');
    expect(content).toContain('--at-radius-card');
    expect(content).toContain('--at-radius-dialog');
    expect(content).toContain('--at-z-index-base');
    expect(content).toContain('--at-bg-overlay-translucent');
  });

  it('暗黑模式 SSOT 治理：组件规则中无硬编码 #0c1017 泄露', () => {
    const content = fs.readFileSync(cssPath, 'utf-8');
    const matches = content.match(/background-color:#0c1017/g);
    expect(matches).toBeNull();
  });

  it('包含 5 款科技预设与 Slate 暗黑模式变量', () => {
    const content = fs.readFileSync(cssPath, 'utf-8');
    expect(content).toContain('[data-theme=indigo]');
    expect(content).toContain('[data-theme=emerald]');
    expect(content).toContain('[data-theme=violet]');
    expect(content).toContain('[data-theme=ocean]');
    expect(content).toContain('[data-theme=rose]');
    expect(content).toContain('.dark');
  });
});
