/**
 * AtengCodeView 源码高亮查看器组件单元测试。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { AtengCodeView } from '../src/components/code-view';
import { highlightLine } from '../src/components/code-view/highlight';
import {
  computeFoldRanges,
  buildFoldRangeMap,
  computeVisibleLines,
} from '../src/components/code-view/folding';

describe('AtengCodeView 源码与数据高亮查看器交互与契约测试', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('JSON 结构化渲染：自动美化对象并应用语法分词', async () => {
    const data = {
      name: 'Ateng UI',
      version: 1,
      active: true,
    };

    const wrapper = mount(AtengCodeView, {
      props: {
        code: data,
        language: 'json',
      },
    });

    expect(wrapper.classes()).toContain('at-code-view');
    expect(wrapper.classes()).toContain('at-code-view--dark');

    // 检查包含 key 和 value 的着色类
    expect(wrapper.find('.tok-key').exists()).toBe(true);
    expect(wrapper.find('.tok-string').exists()).toBe(true);
    expect(wrapper.find('.tok-number').exists()).toBe(true);
    expect(wrapper.find('.tok-boolean').exists()).toBe(true);

    wrapper.unmount();
  });

  it('SQL 语法高亮：关键词准确着色', async () => {
    const sql = 'SELECT id, username FROM sys_user WHERE status = 1;';
    const wrapper = mount(AtengCodeView, {
      props: {
        code: sql,
        language: 'sql',
      },
    });

    const keywords = wrapper.findAll('.tok-keyword');
    const kwTexts = keywords.map(k => k.text());
    expect(kwTexts).toContain('SELECT');
    expect(kwTexts).toContain('FROM');
    expect(kwTexts).toContain('WHERE');

    wrapper.unmount();
  });

  it('行号侧边栏受控展示：lineNumbers 属性开关', async () => {
    const wrapperWithLines = mount(AtengCodeView, {
      props: {
        code: 'Line 1\nLine 2\nLine 3',
        lineNumbers: true,
      },
    });
    expect(wrapperWithLines.find('.at-code-view__gutter').exists()).toBe(true);
    expect(wrapperWithLines.findAll('.at-code-view__line-no').length).toBe(3);
    wrapperWithLines.unmount();

    const wrapperNoLines = mount(AtengCodeView, {
      props: {
        code: 'Line 1\nLine 2',
        lineNumbers: false,
      },
    });
    expect(wrapperNoLines.find('.at-code-view__gutter').exists()).toBe(false);
    wrapperNoLines.unmount();
  });

  it('严格 XSS 字符转义防注入不变量', async () => {
    const maliciousCode = '<script>alert("xss")</script>';
    const wrapper = mount(AtengCodeView, {
      props: {
        code: maliciousCode,
        language: 'html',
      },
    });

    // 严禁在 DOM 中生成真正的 script 标签
    expect(wrapper.element.querySelectorAll('script').length).toBe(0);
    // 必须转义呈现
    expect(wrapper.text()).toContain('alert("xss")');

    wrapper.unmount();
  });

  it('一键复制契约与剪贴板回写', async () => {
    const code = 'const hello = "world";';
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
      writable: true,
    });

    const wrapper = mount(AtengCodeView, {
      props: {
        code,
        language: 'javascript',
      },
    });

    const success = await wrapper.vm.copy();
    expect(success).toBe(true);
    expect(writeText).toHaveBeenCalledWith(code);
    expect(wrapper.emitted('copy')).toBeTruthy();
    expect(wrapper.emitted('copy')?.[0]?.[0]).toBe(code);

    wrapper.unmount();
  });

  it('代码块折叠算法：纯原生成对括号计算与可见行过滤', () => {
    const lines = [
      '{',
      '  "user": {',
      '    "name": "ateng",',
      '    "roles": [',
      '      "admin",',
      '      "user"',
      '    ]',
      '  },',
      '  "active": true',
      '}',
    ];

    const ranges = computeFoldRanges(lines);
    expect(ranges.length).toBe(3);
    expect(ranges[0].startLine).toBe(0);
    expect(ranges[0].endLine).toBe(9);
    expect(ranges[1].startLine).toBe(1);
    expect(ranges[1].endLine).toBe(7);
    expect(ranges[2].startLine).toBe(3);
    expect(ranges[2].endLine).toBe(6);

    const rangeMap = buildFoldRangeMap(ranges);
    expect(rangeMap.has(1)).toBe(true);

    // 测试折叠第 1 行 (user 对象)
    const collapsed = new Set([1]);
    const visible = computeVisibleLines(lines, lines, rangeMap, collapsed);

    // 行 0 正常
    expect(visible[0].lineIndex).toBe(0);
    // 行 1 折叠，带占位文案
    expect(visible[1].lineIndex).toBe(1);
    expect(visible[1].isFolded).toBe(true);
    expect(visible[1].placeholder).toContain('... }');
    // 行 2..7 被跳过，下一可见行为行 8
    expect(visible[2].lineIndex).toBe(8);
  });

  it('交互式代码块折叠与全展开控制', async () => {
    const data = {
      project: 'ateng-ui',
      author: {
        name: 'Ateng',
        city: 'Guangzhou',
      },
      tags: ['ui', 'vue3'],
    };

    const wrapper = mount(AtengCodeView, {
      props: {
        code: data,
        collapsible: true,
      },
    });

    const vm = wrapper.vm;
    expect(vm.lineCount).toBeGreaterThan(5);

    // 初始状态未折叠
    expect(vm.getCollapsedLines().length).toBe(0);

    // 命令式全部折叠
    vm.foldAll();
    await wrapper.vm.$nextTick();
    expect(vm.getCollapsedLines().length).toBeGreaterThan(0);
    expect(wrapper.emitted('fold-change')).toBeTruthy();

    // 折叠占位符应出现在 DOM 中
    const foldMarker = wrapper.find('.at-code-view__fold-marker');
    expect(foldMarker.exists()).toBe(true);

    // 点击占位符展开
    await foldMarker.trigger('click');
    expect(vm.getCollapsedLines().includes(0)).toBe(false);

    // 命令式全部展开
    vm.unfoldAll();
    await wrapper.vm.$nextTick();
    expect(vm.getCollapsedLines().length).toBe(0);

    wrapper.unmount();
  });

  it('防御性处理：空数据与空行边界安全', async () => {
    const wrapper = mount(AtengCodeView, {
      props: {
        code: null,
      },
    });

    expect(wrapper.vm.getRawCode()).toBe('');
    expect(wrapper.vm.lineCount).toBe(0);
    expect(wrapper.text()).toContain('0 lines');

    wrapper.unmount();
  });

  it('TokenSegments 替换后保持 white-space: pre 逐字符缩进、空行与 highlightLine API 兼容', () => {
    const sample = 'function demo() {\n\n  const flag = true; // comment\n  return "ok";\n}';
    const wrapper = mount(AtengCodeView, {
      props: {
        code: sample,
        language: 'typescript',
        collapsible: false,
      },
    });

    try {
      const renderedLines = wrapper.findAll('.at-code-view__line');
      expect(renderedLines).toHaveLength(5);
      expect(renderedLines[0].element.textContent).toBe('function demo() {');
      expect(renderedLines[1].element.textContent).toBe('\u00A0');
      expect(renderedLines[2].element.textContent).toBe('  const flag = true; // comment');
      expect(renderedLines[3].element.textContent).toBe('  return "ok";');
      expect(renderedLines[4].element.textContent).toBe('}');
      expect(renderedLines[2].find('.tok-keyword').text()).toBe('const');
      expect(renderedLines[2].find('.tok-comment').text()).toBe('// comment');

      // 验证 XML/HTML 高亮与独立导出的 highlightLine API 兼容
      const xmlHtml = highlightLine('<tag attr="1" />', 'xml');
      expect(xmlHtml).toContain('<span class="tok-tag">tag</span>');
      expect(xmlHtml).toContain('<span class="tok-attr"> attr</span>');
      expect(highlightLine('', 'text')).toBe('&nbsp;');
    } finally {
      wrapper.unmount();
    }
  });
});
