<script setup lang="ts">
/**
 * 三级弹性离线资产寻址与动态重型预设插拔场景看板。
 *
 * 验证基于“本地同源 ➔ 内网私有化 MinIO ➔ 公共 CDN”三级优先级寻址，
 * 以及 CAD 工程图纸与 Three.js 3D 模型等重型渲染预设按需动态插拔。
 *
 * @author Ateng
 * @since 2026-11-05
 */

import { ref, computed } from 'vue';
import { AtengFileViewer } from '@atengk/file-viewer-vue';

const assetStrategy = ref<'local' | 'intranet' | 'cdn'>('local');
const enableCadPreset = ref<boolean>(true);
const enableModelPreset = ref<boolean>(false);
const lastEventMsg = ref<string>('静态资源寻址与预设就绪');

const resolvedAssetBaseUrl = computed(() => {
  if (assetStrategy.value === 'intranet') return 'http://192.168.10.88:9000/minio/file-viewer/';
  if (assetStrategy.value === 'cdn')
    return 'https://cdn.jsdelivr.net/npm/@file-viewer/assets@3.2.2/dist/';
  return '/file-viewer/';
});

const dynamicPresets = computed(() => {
  const list = [];
  if (enableCadPreset.value) {
    list.push({ id: 'preset-cad', label: 'CAD 工程图纸预设 (DWG/DXF)' });
  }
  if (enableModelPreset.value) {
    list.push({ id: 'preset-3d', label: 'Three.js 3D 模型预设 (GLTF/OBJ)' });
  }
  return list;
});
</script>

<template>
  <div class="scenario-panel">
    <div class="scenario-toolbar">
      <div class="strategy-group">
        <span class="toolbar-label">🌐 离线资产寻址策略:</span>
        <select v-model="assetStrategy" class="dlp-select">
          <option value="local">本地同源 (public/file-viewer/) [默认完全离线]</option>
          <option value="intranet">内网私有化基地址 (MinIO/局域网专网)</option>
          <option value="cdn">公共 CDN 高可用镜像 (JsDelivr 兜底)</option>
        </select>
        <code class="asset-url-badge">{{ resolvedAssetBaseUrl }}</code>
      </div>

      <div class="preset-group">
        <span class="toolbar-label">🧩 重型预设插拔:</span>
        <label class="dlp-checkbox">
          <input v-model="enableCadPreset" type="checkbox" />
          <span>CAD 工程图纸 (DWG/DXF)</span>
        </label>
        <label class="dlp-checkbox">
          <input v-model="enableModelPreset" type="checkbox" />
          <span>Three.js 3D 模型</span>
        </label>
      </div>
    </div>

    <div class="status-strip">
      <span
        >已装配重型预设:
        <strong>{{
          dynamicPresets.map(p => p.label).join('、') || '仅高频默认预设 (Office/PDF/图片)'
        }}</strong></span
      >
      <span class="status-divider">|</span>
      <span
        >静态 Worker/WASM 寻址: <strong>{{ assetStrategy.toUpperCase() }}</strong></span
      >
      <span class="status-divider">|</span>
      <span
        >运行提示: <em>{{ lastEventMsg }}</em></span
      >
    </div>

    <div class="viewer-container">
      <AtengFileViewer
        url="/sample.svg"
        file-name="智能制造总装工程图纸.svg"
        file-type="svg"
        :preset="dynamicPresets"
        :asset-base-url="resolvedAssetBaseUrl"
        height="100%"
      />
    </div>
  </div>
</template>

<style scoped>
.scenario-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 10px;
}

.scenario-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  padding: 8px 16px;
  border-radius: 8px;
  flex-wrap: wrap;
}

.strategy-group,
.preset-group {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.toolbar-label {
  font-weight: 600;
  font-size: 13px;
  color: #334155;
}

.dlp-select {
  padding: 4px 8px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 12px;
  color: #334155;
  outline: none;
}

.asset-url-badge {
  background-color: #eff6ff;
  color: #1d4ed8;
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid #bfdbfe;
}

.dlp-checkbox {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  user-select: none;
  font-size: 13px;
  color: #475569;
}

.status-strip {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #64748b;
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  padding: 6px 14px;
  border-radius: 6px;
}

.status-divider {
  color: #cbd5e1;
}

.viewer-container {
  flex: 1;
  min-height: 0;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  background-color: #ffffff;
}
</style>
