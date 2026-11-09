/**
 * @atengk/form-designer-vue 不可变快照历史栈 (FormHistoryStack)。
 *
 * 遵循 ADR-0044 规约：
 * 1. 基于 Web 原生 structuredClone 捕获全量 FormSchema 不可变快照；
 * 2. 集成 300ms 防抖合并连续属性输入变更，消除琐碎快照；
 * 3. 施加最大容量（默认 30 步）环形队列截断防御，根绝内存泄漏；
 * 4. 响应式与对称暴露 canUndo / canRedo / undo / redo / flush / clear 语义。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import type { FormSchema, FormHistoryStackOptions } from '../types';
import { safeClone } from '../utils/path';

export class FormHistoryStack {
  private stack: FormSchema[] = [];
  private cursor = -1;
  private readonly maxLimit: number;
  private readonly debounceMs: number;
  private readonly onChange?: (snapshot: FormSchema, stack: FormHistoryStack) => void;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingSnapshot: FormSchema | null = null;

  constructor(initialSnapshot?: FormSchema, options: FormHistoryStackOptions = {}) {
    this.maxLimit = options.maxLimit ?? 30;
    this.debounceMs = options.debounceMs ?? 300;
    this.onChange = options.onChange;

    if (initialSnapshot) {
      this.push(initialSnapshot, true);
    }
  }

  /**
   * 压入新的快照。
   *
   * @param snapshot 最新的 Schema 实体
   * @param immediate 是否立即提交（为 false 时启用 300ms 防抖合并）
   */
  public push(snapshot: FormSchema, immediate = true): void {
    if (immediate) {
      this.cancelDebounce();
      this.commitSnapshot(snapshot);
    } else {
      this.pendingSnapshot = safeClone(snapshot);
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }
      this.debounceTimer = setTimeout(() => {
        this.flush();
      }, this.debounceMs);
    }
  }

  /**
   * 立即冲刷并提交当前防抖挂起的快照。
   */
  public flush(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.pendingSnapshot) {
      const p = this.pendingSnapshot;
      this.pendingSnapshot = null;
      this.commitSnapshot(p);
    }
  }

  /**
   * 撤销一步历史变更。
   */
  public undo(): FormSchema | null {
    this.flush();
    if (!this.canUndo) {
      return null;
    }
    this.cursor--;
    const target = this.stack[this.cursor];
    if (!target) {
      return null;
    }
    const cloned = safeClone(target);
    this.onChange?.(cloned, this);
    return cloned;
  }

  /**
   * 重做一步历史变更。
   */
  public redo(): FormSchema | null {
    this.flush();
    if (!this.canRedo) {
      return null;
    }
    this.cursor++;
    const target = this.stack[this.cursor];
    if (!target) {
      return null;
    }
    const cloned = safeClone(target);
    this.onChange?.(cloned, this);
    return cloned;
  }

  /**
   * 是否允许执行撤销。
   */
  public get canUndo(): boolean {
    return this.cursor > 0;
  }

  /**
   * 是否允许执行重做。
   */
  public get canRedo(): boolean {
    return this.cursor >= 0 && this.cursor < this.stack.length - 1;
  }

  /**
   * 获取当前快照副本。
   */
  public get current(): FormSchema | null {
    const cur = this.stack[this.cursor];
    return cur ? safeClone(cur) : null;
  }

  /**
   * 获取当前历史栈长度。
   */
  public get size(): number {
    return this.stack.length;
  }

  /**
   * 获取当前游标索引。
   */
  public get currentIndex(): number {
    return this.cursor;
  }

  /**
   * 重置清空历史快照栈。
   *
   * @param initialSnapshot 可选的新起始快照
   */
  public clear(initialSnapshot?: FormSchema): void {
    this.cancelDebounce();
    this.stack = [];
    this.cursor = -1;
    if (initialSnapshot) {
      this.push(initialSnapshot, true);
    }
  }

  /**
   * 销毁并释放定时器。
   */
  public dispose(): void {
    this.cancelDebounce();
    this.stack = [];
    this.cursor = -1;
  }

  private commitSnapshot(snapshot: FormSchema): void {
    // 截断当前游标之后的前进快照
    if (this.cursor < this.stack.length - 1) {
      this.stack.splice(this.cursor + 1);
    }

    this.stack.push(safeClone(snapshot));

    // 环形队列超出最大上限截断
    if (this.stack.length > this.maxLimit) {
      this.stack.shift();
    } else {
      this.cursor = this.stack.length - 1;
    }

    if (this.cursor >= this.stack.length) {
      this.cursor = this.stack.length - 1;
    }

    if (this.current) {
      this.onChange?.(this.current, this);
    }
  }

  private cancelDebounce(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.pendingSnapshot = null;
  }
}
