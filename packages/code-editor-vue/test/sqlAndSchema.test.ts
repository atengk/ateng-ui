/**
 * SQL 智能格式化、JSON Schema 诊断与只读审计高亮测试。
 *
 * @author Ateng
 * @since 2026-10-29
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import * as monaco from 'monaco-editor';
import { AtengCodeEditor, formatSql, type CodeEditorExpose } from '../src';

describe('SQL 智能补全美化、JSON Schema 校验与只读审计高亮 (Ticket #181)', () => {
  let wrapper: VueWrapper | null = null;

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('防线 1：内置原生轻量 SQL 格式化器，能够规范大写关键词与换行缩进', () => {
    const rawSql = 'select id,name,age from sys_user where status=1 and age>18 order by id desc';
    const formatted = formatSql(rawSql);

    // 验证核心关键字大写并换行
    expect(formatted).toContain('SELECT');
    expect(formatted).toContain('FROM');
    expect(formatted).toContain('WHERE');
    expect(formatted).toContain('ORDER BY');
    expect(formatted).toContain('DESC');
    expect(formatted.split('\n').length).toBeGreaterThan(3);
  });

  it('防线 2：formatSqlProvider SPI 允许外部接管格式化，且在组件 format() 时优先调用', async () => {
    const customFormatter = vi
      .fn()
      .mockImplementation((sql: string) => `-- custom formatted\n${sql}`);

    wrapper = mount(AtengCodeEditor, {
      props: {
        modelValue: 'select 1;',
        language: 'sql',
        formatSqlProvider: customFormatter,
      },
      attachTo: document.body,
    });

    await nextTick();
    const vm = wrapper.vm as unknown as CodeEditorExpose;

    await vm.format();
    expect(customFormatter).toHaveBeenCalled();
    expect(vm.getValue()).toContain('-- custom formatted');
  });

  it('防线 3：受管补全提供者 (completionProvider) 注册并在组件卸载时确定性注销', async () => {
    const disposeSpy = vi.fn();
    const registerSpy = vi
      .spyOn(monaco.languages, 'registerCompletionItemProvider')
      .mockReturnValue({ dispose: disposeSpy });

    wrapper = mount(AtengCodeEditor, {
      props: {
        modelValue: 'SELECT ',
        language: 'sql',
        completionProvider: () => [
          {
            label: 'sys_user',
            kind: monaco.languages.CompletionItemKind.Class,
            insertText: 'sys_user',
          },
        ],
      },
      attachTo: document.body,
    });

    await nextTick();
    expect(registerSpy).toHaveBeenCalled();

    // 执行卸载
    wrapper.unmount();
    wrapper = null;
    await nextTick();

    // 验证确定性注销，杜绝跨页面全局污染
    expect(disposeSpy).toHaveBeenCalled();
  });

  it('防线 4：只读审计行高亮 (highlightLines: number[]) 装饰项正确创建与更新', async () => {
    wrapper = mount(AtengCodeEditor, {
      props: {
        modelValue: ['line 1', 'line 2 (critical)', 'line 3', 'line 4 (critical)'].join('\n'),
        readOnly: true,
        highlightLines: [2, 4],
      },
      attachTo: document.body,
    });

    await nextTick();
    const vm = wrapper.vm as unknown as CodeEditorExpose;
    const ed = vm.getEditor()!;

    // 验证 decorations collection 已建立
    const decorations = ed.getModel()?.getAllDecorations() ?? [];
    const highlightDecs = decorations.filter(d =>
      d.options.className?.includes('at-code-editor__highlight-line'),
    );
    expect(highlightDecs.length).toBe(2);

    // 动态更新高亮行
    await wrapper.setProps({ highlightLines: [3] });
    await nextTick();

    const updatedDecs = ed.getModel()?.getAllDecorations() ?? [];
    const updatedHighlights = updatedDecs.filter(d =>
      d.options.className?.includes('at-code-editor__highlight-line'),
    );
    expect(updatedHighlights.length).toBe(1);
  });
});
