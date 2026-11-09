/**
 * AtengMermaidBlock 组件单元测试。
 *
 * 验证动态按需加载、成功渲染 SVG 图表与解析异常降级保护。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import AtengMermaidBlock from '../src/components/AtengMermaidBlock.vue';

// 拦截 dynamic import('mermaid')
vi.mock('mermaid', () => {
  return {
    default: {
      initialize: vi.fn(),
      render: vi.fn().mockImplementation(async (id: string, text: string) => {
        if (text.includes('INVALID_SYNTAX')) {
          throw new Error('Mermaid syntax error: unknown keyword');
        }
        return {
          svg: `<svg id="${id}" data-testid="mock-mermaid"><text>Mock Diagram</text></svg>`,
        };
      }),
    },
  };
});

describe('AtengMermaidBlock', () => {
  it('异步动态加载并成功渲染 Mermaid SVG 图表', async () => {
    const wrapper = mount(AtengMermaidBlock, {
      props: {
        code: `
flowchart TD
  A[Start] --> B[End]
        `.trim(),
      },
    });

    // 等待异步动态 import 与渲染完成
    await vi.waitFor(() => {
      expect(wrapper.find('.at-ai-chat__mermaid-svg').exists()).toBe(true);
    });

    expect(wrapper.html()).toContain('Mock Diagram');
    expect(wrapper.find('.at-ai-chat__mermaid-error').exists()).toBe(false);
    wrapper.unmount();
  });

  it('遇到语法错误时降级展示错误描述与原始代码', async () => {
    const wrapper = mount(AtengMermaidBlock, {
      props: {
        code: 'INVALID_SYNTAX flowchart',
      },
    });

    await vi.waitFor(() => {
      expect(wrapper.find('.at-ai-chat__mermaid-error').exists()).toBe(true);
    });

    expect(wrapper.text()).toContain('Mermaid 图表解析失败');
    expect(wrapper.text()).toContain('Mermaid syntax error');
    expect(wrapper.find('.at-ai-chat__code-pre').text()).toContain('INVALID_SYNTAX flowchart');
    wrapper.unmount();
  });
});
