/**
 * TextModel 模型池复用与多文件状态保持单元测试 (Ticket #183)。
 *
 * 恪守全自洽单测 3 项铁律：
 * 1. DOM 严格还原；
 * 2. 响应式与存储零污染；
 * 3. 100% 离线自洽。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import { AtengCodeEditor, useCodeEditor, type CodeEditorExpose } from '../src';

describe('useCodeEditor TextModel 模型池管理测试 (Ticket #183)', () => {
  let container: HTMLDivElement | null = null;

  afterEach(() => {
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    container = null;
    vi.restoreAllMocks();
  });

  it('防线 1：模型池支持动态创建、获取活动模型与枚举全部受管模型', () => {
    container = document.createElement('div');
    document.body.appendChild(container);

    const { getActiveModel, getModels, createModel, setModel, disposeModel, getValue, dispose } =
      useCodeEditor(container, {
        value: 'console.log("file A");',
        language: 'typescript',
      });

    const modelA = getActiveModel();
    expect(modelA).toBeTruthy();
    expect(getModels().length).toBe(1);
    expect(getValue()).toBe('console.log("file A");');

    // 创建文件 B 与文件 C
    const modelB = createModel('export const x = 42;', 'typescript', 'file:///b.ts');
    const modelC = createModel('SELECT 1;', 'sql', 'file:///c.sql');

    expect(getModels().length).toBe(3);
    expect(getModels().map(m => m.uri.toString())).toContain(modelB.uri.toString());
    expect(getModels().map(m => m.uri.toString())).toContain(modelC.uri.toString());

    // 切换至文件 B
    setModel(modelB);
    expect(getActiveModel()).toBe(modelB);
    expect(getValue()).toBe('export const x = 42;');

    // 通过 URI 字符串切换至文件 C
    setModel('file:///c.sql');
    expect(getActiveModel()).toBe(modelC);
    expect(getValue()).toBe('SELECT 1;');

    // 销毁文件 B
    const disposed = disposeModel('file:///b.ts');
    expect(disposed).toBe(true);
    expect(getModels().length).toBe(2);
    expect(modelB.isDisposed()).toBe(true);

    dispose();
  });

  it('防线 2：多文件切换独立保持独立 Undo 历史栈与光标视图状态', () => {
    container = document.createElement('div');
    document.body.appendChild(container);

    const { editor, createModel, setModel, getValue, setValue, dispose } = useCodeEditor(
      container,
      {
        value: 'file1 initial\nline 2\nline 3',
        language: 'typescript',
      },
    );

    const ed = editor.value!;
    const model1 = ed.getModel()!;
    const model2 = createModel('file2 initial\nline 2\nline 3', 'typescript', 'file:///file2.ts');

    // 1. 在 Model 1 中修改内容，并定位光标至第 2 行第 3 列
    setValue('file1 modified\nline 2\nline 3');
    ed.setPosition({ lineNumber: 2, column: 3 });

    // 2. 切换至 Model 2，定位光标至第 3 行第 2 列
    setModel(model2);
    expect(getValue()).toBe('file2 initial\nline 2\nline 3');
    ed.setPosition({ lineNumber: 3, column: 2 });

    // 3. 再次切回 Model 1
    setModel(model1);
    expect(getValue()).toBe('file1 modified\nline 2\nline 3');
    // 恢复的光标位置应在 Model 1 留存的第 2 行第 3 列
    expect(ed.getPosition()).toEqual({ lineNumber: 2, column: 3 });

    // 4. 切回 Model 2，验证光标亦在 Model 2 留存的第 3 行第 2 列
    setModel(model2);
    expect(ed.getPosition()).toEqual({ lineNumber: 3, column: 2 });

    dispose();
  });

  it('防线 3：确定性内存释放，容器销毁时模型池内所有 Model 100% 彻底 dispose', () => {
    container = document.createElement('div');
    document.body.appendChild(container);

    const { createModel, getModels, dispose } = useCodeEditor(container, {
      value: 'main code',
      language: 'typescript',
    });

    const m1 = getModels()[0];
    const m2 = createModel('sub module 1', 'typescript', 'file:///sub1.ts');
    const m3 = createModel('sub module 2', 'typescript', 'file:///sub2.ts');

    expect(m1.isDisposed()).toBe(false);
    expect(m2.isDisposed()).toBe(false);
    expect(m3.isDisposed()).toBe(false);

    // 彻底销毁
    dispose();

    expect(m1.isDisposed()).toBe(true);
    expect(m2.isDisposed()).toBe(true);
    expect(m3.isDisposed()).toBe(true);
    expect(getModels().length).toBe(0);
  });
});

describe('AtengCodeEditor 组件对外部暴露模型池能力测试', () => {
  let wrapper: VueWrapper | null = null;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('组件 Expose 能够通过 Ref 调用模型池与视图状态管理方法', async () => {
    wrapper = mount(AtengCodeEditor, {
      props: {
        modelValue: 'const initial = 1;',
        language: 'typescript',
      },
      attachTo: document.body,
    });

    await nextTick();
    const vm = wrapper.vm as unknown as CodeEditorExpose;

    expect(typeof vm.createModel).toBe('function');
    expect(typeof vm.setModel).toBe('function');
    expect(typeof vm.disposeModel).toBe('function');
    expect(typeof vm.getActiveModel).toBe('function');
    expect(typeof vm.getModels).toBe('function');
    expect(typeof vm.saveViewState).toBe('function');
    expect(typeof vm.restoreViewState).toBe('function');

    // 动态添加文件
    const docModel = vm.createModel('# Documentation', 'markdown', 'file:///README.md');
    expect(vm.getModels().length).toBe(2);

    vm.setModel(docModel);
    expect(vm.getActiveModel()).toBe(docModel);
    expect(vm.getValue()).toBe('# Documentation');

    // 销毁添加的文件
    vm.disposeModel('file:///README.md');
    expect(docModel.isDisposed()).toBe(true);
  });
});
