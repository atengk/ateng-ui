/**
 * @atengk/element-plus 工业级现代多主题引擎 - 客户端自动化主题生命周期编排器。
 *
 * 核心特性：
 * 1. 深度适配 light / dark / auto 三态主题模式流转；
 * 2. 具备 transition storm 防御（切换瞬间附加 html.is-theme-switching，冻结所有 transition 规避重绘卡顿）；
 * 3. 自动监听系统 prefers-color-scheme 变化并提供 100% 确定性的 cleanup 卸载注销；
 * 4. 联动 setThemeColor 自动同步演算深浅色阶；
 * 5. 纯原生纯函数设计，保持零框架依赖与离线安全。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import { setThemeColor } from './setThemeColor';

export type ThemeMode = 'light' | 'dark' | 'auto';
export type ActiveTheme = 'light' | 'dark';

export interface InitThemeOptions {
  /** 默认或初始品牌色（如 '#4f46e5'） */
  themeColor?: string;
  /** 本地存储 Key，默认 'ateng-theme-mode' */
  storageKey?: string;
  /** 是否监听系统 prefers-color-scheme 变化，默认 true */
  listenSystemPreference?: boolean;
  /** 默认模式，当本地无持久化存储时生效，默认 'auto' */
  defaultMode?: ThemeMode;
  /** 目标挂载 DOM 节点，默认 document.documentElement */
  target?: HTMLElement;
}

export interface ThemeManager {
  /** 获取当前设定的主题模式 ('light' | 'dark' | 'auto') */
  getMode: () => ThemeMode;
  /** 获取当前实际生效的主题 ('light' | 'dark') */
  getActiveTheme: () => ActiveTheme;
  /** 设置主题模式 */
  setMode: (mode: ThemeMode) => void;
  /** 设置主品牌色并自适应深浅色阶 */
  setColor: (hex: string) => boolean;
  /** 销毁监听器与释放资源 */
  cleanup: () => void;
}

/**
 * 初始化客户端主题系统，协调暗黑模式、品牌色与系统偏好。
 *
 * @param options 可选配置项
 * @returns ThemeManager 主题生命周期控制器
 */
export function initTheme(options?: InitThemeOptions): ThemeManager {
  const storageKey = options?.storageKey ?? 'ateng-theme-mode';
  const listenSystem = options?.listenSystemPreference ?? true;
  const defaultMode = options?.defaultMode ?? 'auto';

  let currentColor = options?.themeColor;
  let switchTimer: ReturnType<typeof setTimeout> | null = null;

  // 1. 获取目标 DOM 根节点
  const getTarget = (): HTMLElement | null => {
    if (options?.target) {
      return options.target;
    }
    return typeof document !== 'undefined' ? document.documentElement : null;
  };

  // 2. 获取 MediaQueryList 句柄
  const getMql = (): MediaQueryList | null => {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      return window.matchMedia('(prefers-color-scheme: dark)');
    }
    return null;
  };

  // 3. 从本地存储或默认值解析初始模式
  const readInitialMode = (): ThemeMode => {
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved === 'light' || saved === 'dark' || saved === 'auto') {
          return saved;
        }
      } catch {
        // localStorage 异常安全降级
      }
    }
    return defaultMode;
  };

  let currentMode: ThemeMode = readInitialMode();

  // 4. 计算当前真实生效的主题
  const computeActiveTheme = (mode: ThemeMode): ActiveTheme => {
    if (mode === 'auto') {
      const mql = getMql();
      return mql?.matches ? 'dark' : 'light';
    }
    return mode;
  };

  // 5. 应用主题到 DOM 节点并执行防重绘抖动
  const applyTheme = (mode: ThemeMode) => {
    const target = getTarget();
    if (!target) {
      return;
    }

    const activeTheme = computeActiveTheme(mode);

    // 冻结 CSS 过渡动效以防样式风暴 (Transition Storm)
    target.classList.add('is-theme-switching');
    if (switchTimer) {
      clearTimeout(switchTimer);
    }
    switchTimer = setTimeout(() => {
      target.classList.remove('is-theme-switching');
      switchTimer = null;
    }, 250);

    // 切换 dark 类
    if (activeTheme === 'dark') {
      target.classList.add('dark');
    } else {
      target.classList.remove('dark');
    }

    // 若存在自定义主色，同步演算色阶
    if (currentColor) {
      setThemeColor(currentColor, { target, isDark: activeTheme === 'dark' });
    }
  };

  // 6. 系统偏好变化监听
  const mql = getMql();
  const handleMediaChange = () => {
    if (currentMode === 'auto') {
      applyTheme('auto');
    }
  };

  if (listenSystem && mql) {
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', handleMediaChange);
    } else if ('addListener' in mql) {
      // 兼容早期 Safari / 移动端 WebView
      (mql as unknown as { addListener: (cb: () => void) => void }).addListener(handleMediaChange);
    }
  }

  // 7. 初始执行一次主题应用
  applyTheme(currentMode);

  // 8. 构造并返回 ThemeManager 门面
  return {
    getMode: () => currentMode,
    getActiveTheme: () => computeActiveTheme(currentMode),
    setMode: (mode: ThemeMode) => {
      currentMode = mode;
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(storageKey, mode);
        } catch {
          // 降级忽略写入失败
        }
      }
      applyTheme(mode);
    },
    setColor: (hex: string) => {
      currentColor = hex;
      const target = getTarget();
      const activeTheme = computeActiveTheme(currentMode);
      return setThemeColor(hex, { target: target ?? undefined, isDark: activeTheme === 'dark' });
    },
    cleanup: () => {
      if (switchTimer) {
        clearTimeout(switchTimer);
        switchTimer = null;
      }
      if (listenSystem && mql) {
        if (typeof mql.removeEventListener === 'function') {
          mql.removeEventListener('change', handleMediaChange);
        } else if ('removeListener' in mql) {
          (mql as unknown as { removeListener: (cb: () => void) => void }).removeListener(
            handleMediaChange,
          );
        }
      }
    },
  };
}
