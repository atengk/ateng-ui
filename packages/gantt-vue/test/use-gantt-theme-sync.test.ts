/**
 * useGanttThemeSync 单元测试套件。
 *
 * 验证暗黑主题嗅探、MutationObserver 响应、动态 updateOption 调色板注入与生命周期清理。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ref } from 'vue';
import {
  useGanttThemeSync,
  getGanttThemePalette,
  detectHostIsDark,
  resolveThemeIsDark,
} from '../src/composables/use-gantt-theme-sync';
import type { Gantt } from '@visactor/vtable-gantt';

describe('useGanttThemeSync Composable', () => {
  beforeEach(() => {
    document.documentElement.className = '';
  });

  afterEach(() => {
    document.documentElement.className = '';
  });

  it('应当正确解析默认 light 与 dark 调色板', () => {
    const lightPalette = getGanttThemePalette(false);
    expect(lightPalette.isDark).toBe(false);
    expect(lightPalette.headerBg).toBe('#f9fafb');
    expect(lightPalette.underlayBg).toBe('#ffffff');

    const darkPalette = getGanttThemePalette(true);
    expect(darkPalette.isDark).toBe(true);
    expect(darkPalette.headerBg).toBe('#1f2937');
    expect(darkPalette.underlayBg).toBe('#111827');
  });

  it('应当根据显式 theme 参数解析 isDark', () => {
    expect(resolveThemeIsDark('dark')).toBe(true);
    expect(resolveThemeIsDark('light')).toBe(false);
    expect(typeof detectHostIsDark()).toBe('boolean');
  });

  it('在 auto 模式下应当动态响应 documentElement.classList 变更', async () => {
    document.documentElement.classList.remove('dark');
    const onThemeChange = vi.fn();
    const { isDark, dispose } = useGanttThemeSync({
      theme: 'auto',
      onThemeChange,
    });

    expect(isDark.value).toBe(false);

    // 模拟宿主切换为暗黑模式
    document.documentElement.classList.add('dark');

    // 等待 MutationObserver 微任务派发
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(isDark.value).toBe(true);
    expect(onThemeChange).toHaveBeenCalledWith(true);

    // 模拟切回亮色模式
    document.documentElement.classList.remove('dark');
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(isDark.value).toBe(false);
    expect(onThemeChange).toHaveBeenCalledWith(false);

    dispose();
  });

  it('当提供 gantt 实例时，应当调用 updateOption 同步调色板', () => {
    const mockUpdateOption = vi.fn();
    const mockGantt = {
      updateOption: mockUpdateOption,
    } as unknown as Gantt;

    const { syncTheme, dispose } = useGanttThemeSync({
      gantt: mockGantt,
      theme: 'dark',
    });

    expect(mockUpdateOption).toHaveBeenCalledWith(
      expect.objectContaining({
        underlayBackgroundColor: '#111827',
        timelineHeader: expect.objectContaining({
          backgroundColor: '#1f2937',
        }),
      }),
    );

    // 手动指定切为亮色
    syncTheme(false);
    expect(mockUpdateOption).toHaveBeenCalledWith(
      expect.objectContaining({
        underlayBackgroundColor: '#ffffff',
        timelineHeader: expect.objectContaining({
          backgroundColor: '#f9fafb',
        }),
      }),
    );

    dispose();
  });

  it('当动态切换 theme 响应式变量时，应当自动同步并解绑观察器', async () => {
    const themeRef = ref<'auto' | 'light' | 'dark'>('light');
    const { isDark, dispose } = useGanttThemeSync({
      theme: themeRef,
    });

    expect(isDark.value).toBe(false);

    themeRef.value = 'dark';
    await new Promise(resolve => setTimeout(resolve, 20));

    expect(isDark.value).toBe(true);

    dispose();
  });
});
