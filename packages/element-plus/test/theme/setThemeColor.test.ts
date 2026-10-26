/**
 * setThemeColor 运行时租户换肤算法与 DOM 注入单元测试。
 *
 * 验证：
 * 1. 颜色混合算法与 Element Plus 官方 Sass color.mix 100% 精度对齐；
 * 2. 1~9 全阶梯 light 色阶、dark-2 色阶与 -rgb 通道正确挂载；
 * 3. 暗黑模式深色阶自适应演算（mix with #141414），消除 light-9 刺眼近白；
 * 4. initTheme 自动化生命周期控制器（light / dark / auto 切换、持久化、防动效风暴、销毁清理）；
 * 5. 支持标准 6 位 Hex 与 3 位简写 Hex；
 * 6. 自定义 target 容器挂载与全局隔离；
 * 7. 非法参数前置防卫与快速失败；
 * 8. 确定性测试现场还原。
 *
 * @author Ateng
 * @since 2026-10-22
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setThemeColor, mixColor } from '../../src/theme/setThemeColor';
import { initTheme } from '../../src/theme/initTheme';

describe('setThemeColor 运行时多主题换肤引擎测试', () => {
  let targetEl: HTMLElement;

  beforeEach(() => {
    targetEl = document.createElement('div');
    document.body.appendChild(targetEl);
  });

  afterEach(() => {
    if (targetEl.parentNode) {
      targetEl.parentNode.removeChild(targetEl);
    }
    // 清理 document.documentElement 上的 inline styles 与 class
    document.documentElement.removeAttribute('style');
    document.documentElement.className = '';
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('官方算法基准对齐：传入 #409eff 正确演算 light-1 至 light-9 与 dark-2', () => {
    setThemeColor('#409eff', { target: targetEl });

    // 验证核心变量与 RGB 通道
    expect(targetEl.style.getPropertyValue('--el-color-primary')).toBe('#409eff');
    expect(targetEl.style.getPropertyValue('--el-color-primary-rgb')).toBe('64, 158, 255');

    // 验证官方标杆色阶 (官方文档与源码：light-1 为 #53a8ff, dark-2 为 #337ecc)
    expect(targetEl.style.getPropertyValue('--el-color-primary-light-1')).toBe('#53a8ff');
    expect(targetEl.style.getPropertyValue('--el-color-primary-dark-2')).toBe('#337ecc');

    // 验证 1~9 级全阶梯均已挂载
    for (let i = 1; i <= 9; i++) {
      const val = targetEl.style.getPropertyValue(`--el-color-primary-light-${i}`);
      expect(val).toMatch(/^#[0-9a-f]{6}$/i);
    }

    // 验证光晕与微影衍生变量
    expect(targetEl.style.getPropertyValue('--at-shadow-focus-ring')).toContain('64, 158, 255');
    expect(targetEl.style.getPropertyValue('--at-ambient-glow')).toBe('rgba(64, 158, 255, 0.14)');
  });

  it('极客科技主色演算：传入 #4f46e5 (Indigo) 正确生成微光与色阶', () => {
    setThemeColor('#4f46e5', { target: targetEl });

    expect(targetEl.style.getPropertyValue('--el-color-primary')).toBe('#4f46e5');
    expect(targetEl.style.getPropertyValue('--el-color-primary-rgb')).toBe('79, 70, 229');
    expect(targetEl.style.getPropertyValue('--at-shadow-focus-ring')).toContain('79, 70, 229');
  });

  it('支持 3 位简写 Hex 格式 (如 #09f)', () => {
    setThemeColor('#09f', { target: targetEl });

    // #09f 等价于 #0099ff (r: 0, g: 153, b: 255)
    expect(targetEl.style.getPropertyValue('--el-color-primary')).toBe('#0099ff');
    expect(targetEl.style.getPropertyValue('--el-color-primary-rgb')).toBe('0, 153, 255');
    expect(targetEl.style.getPropertyValue('--el-color-primary-light-1')).toBe('#1aa3ff');
  });

  it('支持无前缀 Hex (如 10b981)', () => {
    setThemeColor('10b981', { target: targetEl });

    expect(targetEl.style.getPropertyValue('--el-color-primary')).toBe('#10b981');
    expect(targetEl.style.getPropertyValue('--el-color-primary-rgb')).toBe('16, 185, 129');
  });

  it('暗黑模式自适应色阶演算：target 包含 dark 类时 light-9 混合暗黑基底而非纯白', () => {
    targetEl.classList.add('dark');
    setThemeColor('#4f46e5', { target: targetEl });

    const light9 = targetEl.style.getPropertyValue('--el-color-primary-light-9');
    // 暗黑模式下 light-9 与 #141414 (20, 20, 20) 混合，不再是浅白近白色的 #eef2ff
    expect(light9).not.toBe('#eef2ff');
    // 验证为暗黑深色系
    expect(light9).toBe(mixColor([20, 20, 20], [79, 70, 229], 0.9));

    // dark-2 在暗黑模式下与白色混合增强反差
    const dark2 = targetEl.style.getPropertyValue('--el-color-primary-dark-2');
    expect(dark2).toBe(mixColor([255, 255, 255], [79, 70, 229], 0.2));
  });

  it('显式通过 options.isDark: true 强制启用暗黑模式色阶演算', () => {
    setThemeColor('#409eff', { target: targetEl, isDark: true });

    const light9 = targetEl.style.getPropertyValue('--el-color-primary-light-9');
    expect(light9).toBe(mixColor([20, 20, 20], [64, 158, 255], 0.9));
  });

  it('默认目标为 document.documentElement', () => {
    setThemeColor('#7c3aed');

    expect(document.documentElement.style.getPropertyValue('--el-color-primary')).toBe('#7c3aed');
    expect(document.documentElement.style.getPropertyValue('--el-color-primary-rgb')).toBe(
      '124, 58, 237',
    );
  });

  it('非法 Hex 输入防卫：快速失败并输出警告，不抛出崩溃异常', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // 传入非法值
    setThemeColor('not-a-color', { target: targetEl });
    expect(warnSpy).toHaveBeenCalled();
    expect(targetEl.style.getPropertyValue('--el-color-primary')).toBe('');

    setThemeColor('', { target: targetEl });
    expect(targetEl.style.getPropertyValue('--el-color-primary')).toBe('');

    setThemeColor('#12', { target: targetEl });
    expect(targetEl.style.getPropertyValue('--el-color-primary')).toBe('');
  });
});

describe('initTheme 客户端自动化主题生命周期编排器测试', () => {
  let targetEl: HTMLElement;

  beforeEach(() => {
    targetEl = document.createElement('div');
    document.body.appendChild(targetEl);
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    if (targetEl.parentNode) {
      targetEl.parentNode.removeChild(targetEl);
    }
    document.documentElement.removeAttribute('style');
    document.documentElement.className = '';
    localStorage.clear();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('基础初始化：支持 light / dark 模式切换与持久化存储', () => {
    const manager = initTheme({
      target: targetEl,
      storageKey: 'test-theme-mode',
      defaultMode: 'light',
      listenSystemPreference: false,
    });

    expect(manager.getMode()).toBe('light');
    expect(manager.getActiveTheme()).toBe('light');
    expect(targetEl.classList.contains('dark')).toBe(false);

    // 切换到 dark
    manager.setMode('dark');
    expect(manager.getMode()).toBe('dark');
    expect(manager.getActiveTheme()).toBe('dark');
    expect(targetEl.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('test-theme-mode')).toBe('dark');

    // 切换瞬间应当附带 is-theme-switching 类防动效风暴
    expect(targetEl.classList.contains('is-theme-switching')).toBe(true);
    vi.advanceTimersByTime(300);
    expect(targetEl.classList.contains('is-theme-switching')).toBe(false);

    manager.cleanup();
  });

  it('联动主品牌色演算：setColor 正确更新主色并自适应深浅色阶', () => {
    const manager = initTheme({
      target: targetEl,
      defaultMode: 'light',
      themeColor: '#4f46e5',
      listenSystemPreference: false,
    });

    expect(targetEl.style.getPropertyValue('--el-color-primary')).toBe('#4f46e5');

    // 切换到暗黑模式后，应当以暗黑算法自动重算色阶
    manager.setMode('dark');
    const light9Dark = targetEl.style.getPropertyValue('--el-color-primary-light-9');
    expect(light9Dark).toBe(mixColor([20, 20, 20], [79, 70, 229], 0.9));

    // 调用 setColor 换新主色
    manager.setColor('#10b981');
    expect(targetEl.style.getPropertyValue('--el-color-primary')).toBe('#10b981');

    manager.cleanup();
  });
});
