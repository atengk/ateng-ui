/**
 * setThemeColor 运行时租户换肤算法与 DOM 注入单元测试。
 *
 * 验证：
 * 1. 颜色混合算法与 Element Plus 官方 Sass color.mix 100% 精度对齐；
 * 2. 1~9 全阶梯 light 色阶、dark-2 色阶与 -rgb 通道正确挂载；
 * 3. 支持标准 6 位 Hex 与 3 位简写 Hex；
 * 4. 自定义 target 容器挂载与全局隔离；
 * 5. 非法参数前置防卫与快速失败；
 * 6. 确定性测试现场还原。
 *
 * @author Ateng
 * @since 2026-10-22
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setThemeColor } from '../../src/theme/setThemeColor';

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
    // 清理 document.documentElement 上的 inline styles
    document.documentElement.removeAttribute('style');
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
