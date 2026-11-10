/**
 * useSpreadsheetThemeSync 主题热跟随单元测试。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ref, nextTick } from 'vue';
import { useSpreadsheetThemeSync } from '../src/composables/use-spreadsheet-theme-sync';

describe('useSpreadsheetThemeSync', () => {
  let mockHtmlElement: HTMLElement;

  beforeEach(() => {
    mockHtmlElement = document.documentElement;
    mockHtmlElement.className = '';
  });

  afterEach(() => {
    mockHtmlElement.className = '';
    vi.restoreAllMocks();
  });

  it('显式指定 light 或 dark 时应当直接触发对应主题', () => {
    const onThemeChange = vi.fn();
    const { currentResolvedTheme, destroy } = useSpreadsheetThemeSync('dark', onThemeChange);

    expect(currentResolvedTheme.value).toBe('dark');
    expect(onThemeChange).toHaveBeenCalledWith('dark');

    destroy();
  });

  it('auto 模式下默认无 dark 类时应当解析为 light', () => {
    const onThemeChange = vi.fn();
    const { currentResolvedTheme, destroy } = useSpreadsheetThemeSync('auto', onThemeChange);

    expect(currentResolvedTheme.value).toBe('light');
    expect(onThemeChange).toHaveBeenCalledWith('light');

    destroy();
  });

  it('auto 模式下当 html 包含 dark 类时应当解析为 dark', () => {
    mockHtmlElement.classList.add('dark');
    const onThemeChange = vi.fn();
    const { currentResolvedTheme, destroy } = useSpreadsheetThemeSync('auto', onThemeChange);

    expect(currentResolvedTheme.value).toBe('dark');
    expect(onThemeChange).toHaveBeenCalledWith('dark');

    destroy();
  });

  it('动态响应：theme 由 ref 改变时应当触发新主题回调', async () => {
    const themeRef = ref<'light' | 'dark' | 'auto'>('light');
    const onThemeChange = vi.fn();
    const { currentResolvedTheme, destroy } = useSpreadsheetThemeSync(themeRef, onThemeChange);

    expect(currentResolvedTheme.value).toBe('light');

    themeRef.value = 'dark';
    await nextTick();
    expect(currentResolvedTheme.value).toBe('dark');
    expect(onThemeChange).toHaveBeenCalledWith('dark');

    destroy();
  });

  it('调用 destroy 应当停止监听并清理资源', () => {
    const onThemeChange = vi.fn();
    const { destroy } = useSpreadsheetThemeSync('auto', onThemeChange);

    expect(() => destroy()).not.toThrow();
  });
});
