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
import {
  AtengCodeEditor,
  formatSql,
  CompletionRegistry,
  registerCompletionProvider,
  type CodeEditorExpose,
} from '../src';

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

  it('防线 1.1：formatSql 能够完美隔离单双引号字符串、反引号与注释，不篡改内部文本', () => {
    const sqlWithLiteral =
      "select id, 'select * from user where id = 1' as query_str, \"desc\", `status` from t where note = 'order by name' and comment = '-- not a comment';";
    const formatted = formatSql(sqlWithLiteral);

    // 字符串内部的小写与特殊符号必须保持 100% 原始不变
    expect(formatted).toContain("'select * from user where id = 1'");
    expect(formatted).toContain("'order by name'");
    expect(formatted).toContain("'-- not a comment'");
    expect(formatted).toContain('"desc"');
    expect(formatted).toContain('`status`');
    // 外层关键字仍正确大写
    expect(formatted).toContain('SELECT');
    expect(formatted).toContain('AS query_str');
    expect(formatted).toContain('FROM t');
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
    const ed = vm.getEditor();
    expect(ed).not.toBeNull();

    // 验证 decorations collection 已建立
    const decorations = ed?.getModel()?.getAllDecorations() ?? [];
    const highlightDecs = decorations.filter(d =>
      d.options.className?.includes('at-code-editor__highlight-line'),
    );
    expect(highlightDecs.length).toBe(2);

    // 动态更新高亮行
    await wrapper.setProps({ highlightLines: [3] });
    await nextTick();

    const updatedDecs = ed?.getModel()?.getAllDecorations() ?? [];
    const updatedHighlights = updatedDecs.filter(d =>
      d.options.className?.includes('at-code-editor__highlight-line'),
    );
    expect(updatedHighlights.length).toBe(1);
  });

  it('防线 5：CompletionRegistry 与 registerCompletionProvider 生命周期受管并支持集中式清理', () => {
    const disposeSpy1 = vi.fn();
    const disposeSpy2 = vi.fn();
    let callCount = 0;
    vi.spyOn(monaco.languages, 'registerCompletionItemProvider').mockImplementation(() => {
      callCount++;
      return { dispose: callCount === 1 ? disposeSpy1 : disposeSpy2 };
    });

    const handle1 = registerCompletionProvider('sql', () => []);
    CompletionRegistry.register('json', () => []);

    expect(CompletionRegistry.getActiveCount()).toBe(2);

    // 单项释放
    handle1.dispose();
    expect(disposeSpy1).toHaveBeenCalledTimes(1);
    expect(CompletionRegistry.getActiveCount()).toBe(1);

    // 集中式全量清空
    CompletionRegistry.disposeAll();
    expect(disposeSpy2).toHaveBeenCalledTimes(1);
    expect(CompletionRegistry.getActiveCount()).toBe(0);
  });

  it('防线 1.2：formatSql 保持 LEFT JOIN 等复合子句完整不被拆行，并规范逗号空格', () => {
    const rawSql =
      "select u.id,u.username,u.email,count(o.id) as order_count,sum(o.total_amount) as total_spent from sys_user u left join biz_order o on u.id = o.user_id where u.status = 1 and u.created_at >= '2026-01-01' group by u.id, u.username having total_spent > 500 order by total_spent desc limit 20;";
    const formatted = formatSql(rawSql);

    // 绝对不能出现单独一行的 LEFT 或单独一行的 JOIN
    const lines = formatted.split('\n');
    expect(lines.some(l => l === 'LEFT')).toBe(false);
    expect(lines.some(l => l.startsWith('LEFT JOIN'))).toBe(true);
    expect(lines.some(l => l.startsWith('GROUP BY'))).toBe(true);
    expect(lines.some(l => l.startsWith('ORDER BY'))).toBe(true);
    // 逗号后必须规范带空格
    expect(formatted).toContain('u.id, u.username, u.email');
  });

  it('防线 2.1：从 typescript 动态切换至 sql 语言后，调用 format() 能够即时格式化 SQL', async () => {
    wrapper = mount(AtengCodeEditor, {
      props: {
        modelValue: 'select u.id,u.name from sys_user u left join biz_order o on u.id = o.user_id;',
        language: 'typescript',
      },
      attachTo: document.body,
    });

    await nextTick();
    const vm = wrapper.vm as unknown as CodeEditorExpose;

    // 动态切到 sql 语言
    await wrapper.setProps({ language: 'sql' });
    await nextTick();

    await vm.format();
    const formatted = vm.getValue();
    expect(formatted).toContain('SELECT');
    expect(formatted).toContain('FROM sys_user u');
    expect(formatted).toContain('LEFT JOIN');
  });

  it('防线 6：JSON 编辑器创建带 .json 扩展名的合法 URI 并支持动态 setJsonSchema', async () => {
    const testSchema = {
      type: 'object',
      properties: { name: { type: 'string' } },
    };

    wrapper = mount(AtengCodeEditor, {
      props: {
        modelValue: '{"name": 123}',
        language: 'json',
        jsonSchema: testSchema,
      },
      attachTo: document.body,
    });

    await nextTick();
    const vm = wrapper.vm as unknown as CodeEditorExpose;
    const model = vm.getModel();
    expect(model).not.toBeNull();
    // 必须带有 .json 扩展名以激活 Monaco JSON 语言诊断
    expect(model?.uri.toString()).toMatch(/\.json$/);

    // 验证 setJsonSchema 能正常调用而不崩溃
    expect(() => vm.setJsonSchema({ type: 'object' })).not.toThrow();
  });
});
