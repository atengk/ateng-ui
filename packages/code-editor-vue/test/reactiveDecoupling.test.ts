/**
 * 响应式解耦防线、增量光标防丢与长文本性能治理单元测试。
 *
 * @author Ateng
 * @since 2026-10-29
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isReactive, nextTick } from 'vue';
import { useCodeEditor } from '../src/composables/useCodeEditor';

describe('响应式解耦防线与增量光标保护测试 (Ticket #179)', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('防线 1：Monaco 实例与 TextModel 必须为 markRaw 原始对象，绝对严禁被 Vue Proxy 代理', () => {
    const { editor, model, dispose } = useCodeEditor(container, {
      value: 'console.log("hello");',
      language: 'typescript',
    });

    expect(editor.value).not.toBeNull();
    expect(model.value).not.toBeNull();

    // 严密断言：杜绝深层 Proxy 劫持导致的打字卡顿
    expect(isReactive(editor.value)).toBe(false);
    expect(isReactive(model.value)).toBe(false);

    dispose();
  });

  it('防线 2：增量编辑管道必须保持光标位置与选区，并保留 Undo/Redo 历史栈', async () => {
    const initialText = ['function test() {', '  const a = 1;', '  return a;', '}'].join('\n');

    const { editor, model, getValue, applyIncrementalEdit, undo, redo, dispose } = useCodeEditor(
      container,
      {
        value: initialText,
        language: 'typescript',
      },
    );

    const ed = editor.value!;
    expect(model.value).toBeDefined();

    // 1. 将光标定位在第 2 行第 5 列
    ed.setPosition({ lineNumber: 2, column: 5 });
    expect(ed.getPosition()).toEqual({ lineNumber: 2, column: 5 });

    // 2. 外部异步追加/更新代码（例如在末尾新增一行）
    const updatedText = [
      'function test() {',
      '  const a = 1;',
      '  return a;',
      '}',
      '// appended line',
    ].join('\n');

    applyIncrementalEdit(updatedText);

    // 3. 断言文本已更新
    expect(getValue()).toBe(updatedText);

    // 4. 断言光标没有被粗暴重置到 (1, 1)，依旧精准停留在第 2 行第 5 列
    const newPos = ed.getPosition();
    expect(newPos).toEqual({ lineNumber: 2, column: 5 });

    // 5. 验证 Undo 历史记录栈未被冲垮，可通过 undo 恢复
    undo();
    expect(getValue()).toBe(initialText);

    // 6. 验证 Redo 历史记录可用
    redo();
    expect(getValue()).toBe(updatedText);

    dispose();
  });

  it('防线 3：大文件性能治理（> 50,000 行），自动触发自适应保护模式', async () => {
    // 构造超长文本（50,005 行）
    const largeLines = new Array(50005).fill('const x = 1;');
    const largeText = largeLines.join('\n');

    const { isLargeFile, applyIncrementalEdit, dispose } = useCodeEditor(container, {
      value: 'console.log("init");',
      language: 'typescript',
      largeFileThreshold: 50000,
    });

    expect(isLargeFile.value).toBe(false);

    // 应用超大文本
    applyIncrementalEdit(largeText);
    await nextTick();

    // 断言大文件保护已激活
    expect(isLargeFile.value).toBe(true);

    // 恢复小文本（10 行）
    applyIncrementalEdit('console.log("normal");');
    await nextTick();

    // 断言退出大文件保护模式
    expect(isLargeFile.value).toBe(false);

    dispose();
  });
});
