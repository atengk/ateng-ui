/**
 * @atengk/element-plus 工业级现代多主题引擎 - 运行时租户换肤算法与品牌色生成器。
 *
 * 核心特性：
 * 1. 颜色混合算法 100% 对齐 Element Plus 官方 Sass color.mix($color-white, $base, weight)；
 * 2. 动态演算 1~9 级全阶梯 light 浅色阶与 dark-2 深色阶；
 * 3. 支持暗黑模式感知与自适应色阶演算（mix with dark-base #141414），彻底消除暗黑模式下 light-9 刺眼近白；
 * 4. 动态生成 -rgb 透明度通道与 4px 激光 Focus-Ring 光晕环；
 * 5. 支持标准 6 位 Hex 与 3 位简写 Hex，并提供非法值快速防卫；
 * 6. 支持挂载到自定义 target 容器，天然支持微前端与多租户局部隔离。
 *
 * @author Ateng
 * @since 2026-10-22
 */

export interface ThemeColorOptions {
  /** 目标挂载 DOM 节点，默认 document.documentElement */
  target?: HTMLElement;
  /** 是否同步更新暗黑模式深色阶，默认 true */
  updateDark?: boolean;
  /** 显式指定是否为暗黑模式；未指定时自动探测 target.classList.contains('dark') */
  isDark?: boolean;
}

/**
 * 线性插值色彩混合算法，100% 对齐 Sass color.mix 规范。
 *
 * @param color1 目标混合色 [r, g, b]
 * @param color2 基础色 [r, g, b]
 * @param weight 目标色占比权重 (0 ~ 1)
 */
export function mixColor(
  color1: [number, number, number],
  color2: [number, number, number],
  weight: number,
): string {
  const p = Math.min(1, Math.max(0, weight));
  const w2 = 1 - p;

  const r = Math.round(color1[0] * p + color2[0] * w2);
  const g = Math.round(color1[1] * p + color2[1] * w2);
  const b = Math.round(color1[2] * p + color2[2] * w2);

  const toHex = (n: number) => Math.min(255, Math.max(0, n)).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * 动态设定应用或指定容器的主品牌色，全自动演算 1~9 级色阶与 RGB 通道。
 *
 * @param hex 十六进制颜色值，如 '#4f46e5'、'#409eff' 或简写 '#09f'
 * @param options 可选配置（目标挂载节点与暗黑模式适配）
 * @returns boolean 是否设定成功
 */
export function setThemeColor(hex: string, options?: ThemeColorOptions): boolean {
  if (!hex || typeof hex !== 'string') {
    console.warn(`[AtengTheme] 非法的颜色输入: ${String(hex)}，必须为有效的十六进制颜色值。`);
    return false;
  }

  // 1. 去除首部 # 并统一转为小写
  let raw = hex.trim().replace(/^#/, '').toLowerCase();

  // 2. 支持 3 位 Hex 简写展开为 6 位 (如 09f -> 0099ff)
  if (raw.length === 3) {
    raw = raw
      .split('')
      .map(char => char + char)
      .join('');
  }

  // 3. 校验 6 位 Hex 合法性
  if (!/^[0-9a-f]{6}$/.test(raw)) {
    console.warn(`[AtengTheme] 非法的十六进制颜色格式: "${hex}"，支持格式如 "#4f46e5" 或 "#09f"。`);
    return false;
  }

  // 4. 解析 RGB 通道
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  const baseRgb: [number, number, number] = [r, g, b];
  const fullHex = `#${raw}`;

  // 5. 目标容器解析
  const target =
    options?.target ?? (typeof document !== 'undefined' ? document.documentElement : null);
  if (!target || !target.style) {
    return false;
  }

  // 6. 挂载基础主色与 RGB 透明度通道
  target.style.setProperty('--el-color-primary', fullHex);
  target.style.setProperty('--el-color-primary-rgb', `${r}, ${g}, ${b}`);

  // 7. 判断暗黑模式自适应
  const isDarkMode = options?.isDark ?? (target ? target.classList.contains('dark') : false);

  const whiteRgb: [number, number, number] = [255, 255, 255];
  const blackRgb: [number, number, number] = [0, 0, 0];
  const darkBaseRgb: [number, number, number] = [20, 20, 20]; // #141414 Element Plus 暗黑基底

  if (isDarkMode && options?.updateDark !== false) {
    // 暗黑模式下：与 Element Plus 暗黑基底 #141414 进行混合演算
    for (let i = 1; i <= 9; i++) {
      const darkLightHex = mixColor(darkBaseRgb, baseRgb, i / 10);
      target.style.setProperty(`--el-color-primary-light-${i}`, darkLightHex);
    }
    // dark-2 在暗黑模式下混入白色增强对比度
    const dark2Hex = mixColor(whiteRgb, baseRgb, 0.2);
    target.style.setProperty('--el-color-primary-dark-2', dark2Hex);
  } else {
    // 浅色模式下：与纯白 #ffffff 进行混合演算
    for (let i = 1; i <= 9; i++) {
      const lightHex = mixColor(whiteRgb, baseRgb, i / 10);
      target.style.setProperty(`--el-color-primary-light-${i}`, lightHex);
    }
    // dark-2 在浅色模式下混入黑色
    const dark2Hex = mixColor(blackRgb, baseRgb, 0.2);
    target.style.setProperty('--el-color-primary-dark-2', dark2Hex);
  }

  // 8. 衍生微光阴影与发光环
  target.style.setProperty(
    '--at-shadow-focus-ring',
    `0 0 0 1px ${fullHex}, 0 0 0 4px rgba(${r}, ${g}, ${b}, 0.18)`,
  );
  target.style.setProperty('--at-ambient-glow', `rgba(${r}, ${g}, ${b}, 0.14)`);

  return true;
}
