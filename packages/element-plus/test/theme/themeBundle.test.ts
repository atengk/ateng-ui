/**
 * ThemePro 样式编译产物与零 !important 质量门禁测试。
 *
 * 验证：
 * 1. dist/theme-pro.css 产物存在且包含完整样式规则；
 * 2. 100% 恪守零 !important 铁律，不破坏业务层自然特异度；
 * 3. 极窄冷钛滚动条、文本链接与排版文本规则正确编译；
 * 4. 核心科技预设与 Slate 暗黑模式基底变量完整。
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
