/**
 * AtengMarkdownRenderer 核心渲染组件单元测试。
 *
 * 验证混合富文本、KaTeX 数学公式、代码块与 #code-block 插槽反转机制。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import AtengMarkdownRenderer from '../src/components/AtengMarkdownRenderer.vue';

// 拦截 mermaid
vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn().mockResolvedValue({ svg: '<svg class="mock-mermaid"></svg>' }),
  },
}));

describe('AtengMarkdownRenderer', () => {
  it('正确渲染混合 Markdown：包含粗体、列表、KaTeX 公式与代码块', () => {
    const content = `
这是一段 **加粗说明**，公式为 $E=mc^2$。

\`\`\`typescript
const version = "1.0.0";
\`\`\`

- 列表项 A
- 列表项 B
    `.trim();

    const wrapper = mount(AtengMarkdownRenderer, {
      props: { content },
    });

    expect(wrapper.find('.at-ai-chat__markdown').exists()).toBe(true);
    expect(wrapper.html()).toContain('<strong>加粗说明</strong>');
    expect(wrapper.html()).toContain('katex');
    expect(wrapper.find('.at-ai-chat__code-block').exists()).toBe(true);
    expect(wrapper.find('.at-ai-chat__code-lang').text()).toBe('typescript');

    wrapper.unmount();
  });

  it('支持 #code-block 插槽反转，将代码块交付给宿主渲染', () => {
    const content = `
前置文字。

\`\`\`json
{"name": "ateng-ui"}
\`\`\`
    `.trim();

    const wrapper = mount(AtengMarkdownRenderer, {
      props: { content },
      slots: {
        'code-block': `<template #code-block="{ language, code }">
          <div class="custom-host-editor">{{ language }} => {{ code }}</div>
        </template>`,
      },
    });

    expect(wrapper.find('.custom-host-editor').exists()).toBe(true);
    expect(wrapper.find('.custom-host-editor').text()).toContain('json => {"name": "ateng-ui"}');
    expect(wrapper.find('.at-ai-chat__code-pre').exists()).toBe(false);

    wrapper.unmount();
  });
});
