/**
 * presets 动态预设注册与按需插拔单元测试。
 *
 * 验证 registerPreset、unregisterPreset、getRegisteredPresets 与
 * 组件 :preset 属性的动态挂载和去重合并机制。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerPreset,
  unregisterPreset,
  getRegisteredPresets,
  clearPresets,
  resolvePresets,
  type FileViewerPreset,
} from '../src/utils/presets';

describe('presets 动态重型格式预设扩展测试', () => {
  beforeEach(() => {
    clearPresets();
  });

  const cadPreset: FileViewerPreset = {
    id: 'preset-cad',
    label: 'CAD 工程图纸预设 (DWG/DXF/DWF)',
    renderers: [
      {
        id: 'renderer-cad-engine',
        definitions: [{ id: 'cad-definition', extensions: ['dwg', 'dxf', 'dwf'] }],
      },
    ],
  };

  const model3dPreset: FileViewerPreset = {
    id: 'preset-3d',
    label: '3D 工程模型预设 (GLTF/GLB/STL/OBJ)',
    renderers: [
      {
        id: 'renderer-3d-engine',
        definitions: [{ id: '3d-definition', extensions: ['gltf', 'glb', 'stl', 'obj'] }],
      },
    ],
  };

  it('支持全局注册预设，并在 getRegisteredPresets 中获取已注册列表', () => {
    expect(getRegisteredPresets()).toEqual([]);

    registerPreset(cadPreset);
    expect(getRegisteredPresets().length).toBe(1);
    expect(getRegisteredPresets()[0].id).toBe('preset-cad');

    // 重复注册相同 id 应当幂等替换
    registerPreset({ ...cadPreset, label: 'CAD 更新预设' });
    expect(getRegisteredPresets().length).toBe(1);
    expect(getRegisteredPresets()[0].label).toBe('CAD 更新预设');
  });

  it('支持根据 id 动态注销指定预设', () => {
    registerPreset(cadPreset);
    registerPreset(model3dPreset);
    expect(getRegisteredPresets().length).toBe(2);

    unregisterPreset('preset-cad');
    expect(getRegisteredPresets().length).toBe(1);
    expect(getRegisteredPresets()[0].id).toBe('preset-3d');
  });

  it('resolvePresets 能够安全合并全局预设与组件局部传入的 :preset 属性', () => {
    registerPreset(cadPreset);

    // 局部传入单个预设
    const merged1 = resolvePresets(model3dPreset);
    expect(merged1.length).toBe(2);
    expect(merged1.map(p => p.id)).toContain('preset-cad');
    expect(merged1.map(p => p.id)).toContain('preset-3d');

    // 局部传入数组并自动去重
    const merged2 = resolvePresets([cadPreset, model3dPreset]);
    expect(merged2.length).toBe(2);
  });

  it('未提供任何局部与全局预设时保底返回空数组', () => {
    expect(resolvePresets(undefined)).toEqual([]);
    expect(resolvePresets([])).toEqual([]);
  });
});
