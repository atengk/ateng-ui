/**
 * CompletionRegistry 受管生命周期智能补全注册中心与辅助工具。
 *
 * 依据 ADR-0035 与工单 #181：
 * 1. 封装生命周期受管的 registerCompletionProvider 辅助工具；
 * 2. 避免 Monaco 全局 CompletionItemProvider 跨页面与多次渲染泄漏；
 * 3. 统一由 Registry 纳管，支持单个或全量确定性清理注销。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import * as monaco from 'monaco-editor';
import type { CodeLanguage, CompletionProviderFn } from '../types';

/**
 * 受管智能补全注册中心。
 */
export class CompletionRegistry {
  private static disposables: monaco.IDisposable[] = [];

  /**
   * 注册受管生命周期的智能补全项提供者。
   *
   * @param language 编程语言
   * @param provider 补全项生成函数
   * @returns IDisposable 句柄，调用 dispose() 即可从全局注销
   */
  public static register(
    language: CodeLanguage,
    provider: CompletionProviderFn,
  ): monaco.IDisposable {
    const disposable = monaco.languages.registerCompletionItemProvider(language, {
      provideCompletionItems: async (model, position) => {
        const res = await provider(model, position);
        if (Array.isArray(res)) {
          return { suggestions: res };
        }
        return res;
      },
    });

    this.disposables.push(disposable);

    return {
      dispose: () => {
        disposable.dispose();
        const idx = this.disposables.indexOf(disposable);
        if (idx !== -1) {
          this.disposables.splice(idx, 1);
        }
      },
    };
  }

  /**
   * 获取当前由 Registry 纳管的活跃提供者数量。
   */
  public static getActiveCount(): number {
    return this.disposables.length;
  }

  /**
   * 清空注销由 CompletionRegistry 纳管的所有全局智能补全项。
   */
  public static disposeAll(): void {
    this.disposables.forEach(d => {
      try {
        d.dispose();
      } catch {
        // 容错处理
      }
    });
    this.disposables = [];
  }
}

/**
 * 注册受管补全提供者的便捷门面函数。
 *
 * @param language 编程语言
 * @param provider 补全提供者函数
 * @returns 具备 dispose() 注销能力的对象句柄
 */
export function registerCompletionProvider(
  language: CodeLanguage,
  provider: CompletionProviderFn,
): monaco.IDisposable {
  return CompletionRegistry.register(language, provider);
}
