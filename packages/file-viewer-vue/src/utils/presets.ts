/**
 * 动态重型渲染预设扩展与按需插拔管理器。
 *
 * 为避免工程图纸（CAD）、3D 模型、国产版式（OFD）、代码高亮等重型渲染内核膨胀主包体积，
 * 本模块提供全局与局部两种维度的按需插拔机制：
 * 1. 全局扩展：通过 registerPreset(preset) 动态扩充运行时支持的格式；
 * 2. 局部挂载：通过组件属性 :preset="cadPreset" 实现专属页面按需加载。
 *
 * @author Ateng
 * @since 2026-10-26
 */

export interface FileViewerPresetRendererDefinition {
  id: string;
  extensions?: string[];
  category?: string;
}

export interface FileViewerPresetRenderer {
  id: string;
  definitions?: FileViewerPresetRendererDefinition[];
  [key: string]: unknown;
}

export interface FileViewerPreset {
  /**
   * 预设唯一标识 (例如 'preset-cad', 'preset-3d')。
   */
  id: string;

  /**
   * 预设可读名称。
   */
  label?: string;

  /**
   * 包含的具体渲染器插件列表。
   */
  renderers?: FileViewerPresetRenderer[] | unknown[];

  /**
   * 预设默认携带的高级 options 配置。
   */
  options?: Record<string, unknown>;
}

// 全局已注册的预设哈希表 (id ➔ preset)
const registeredPresetsMap = new Map<string, FileViewerPreset>();

/**
 * 全局动态注册重型扩展预设。
 *
 * 若已存在相同 id 的预设，将幂等替换为最新实例。
 *
 * @param preset 待注册的预设对象
 */
export function registerPreset(preset: FileViewerPreset): void {
  if (!preset || !preset.id) {
    return;
  }
  registeredPresetsMap.set(preset.id, preset);
}

/**
 * 动态注销指定预设。
 *
 * @param presetId 预设唯一标识
 */
export function unregisterPreset(presetId: string): void {
  if (!presetId) {
    return;
  }
  registeredPresetsMap.delete(presetId);
}

/**
 * 获取当前全局已注册的所有预设列表副本。
 *
 * @returns 预设列表数组 (空安全保底返回 [])
 */
export function getRegisteredPresets(): FileViewerPreset[] {
  return Array.from(registeredPresetsMap.values());
}

/**
 * 清空全局预设注册表。
 */
export function clearPresets(): void {
  registeredPresetsMap.clear();
}

/**
 * 安全合并全局已注册预设与组件局部传入的 :preset 属性。
 *
 * 遵循局部优先并自动根据 id 去重合并。
 *
 * @param localPreset 组件局部传入的预设 (单个或数组)
 * @returns 去重合并后的完整有效预设列表
 */
export function resolvePresets(
  localPreset?: FileViewerPreset | FileViewerPreset[] | null,
): FileViewerPreset[] {
  const mergedMap = new Map<string, FileViewerPreset>();

  // 1. 注入全局已注册预设
  for (const preset of registeredPresetsMap.values()) {
    mergedMap.set(preset.id, preset);
  }

  // 2. 注入组件局部预设
  if (localPreset) {
    const list = Array.isArray(localPreset) ? localPreset : [localPreset];
    for (const item of list) {
      if (item && item.id) {
        mergedMap.set(item.id, item);
      }
    }
  }

  return Array.from(mergedMap.values());
}
