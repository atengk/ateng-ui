<script setup lang="ts">
/**
 * 百兆内存防崩护栏 (SizeGuard) 与渐进传输指示场景看板。
 *
 * 验证超大工程文件/高分辨率图纸堆内存熔断警告、强行破除渲染 (forceRender)、
 * 渐进下载进度条、瞬时速率 (MB/s) 与预计剩余时间 (ETA) 计算。
 *
 * @author Ateng
 * @since 2026-11-05
 */

import { ref } from 'vue';
import {
  AtengFileViewer,
  useFileViewer,
  type FileViewerDownloadProgress,
  type AtengFileViewerInstance,
} from '@atengk/file-viewer-vue';

const viewerRef = ref<AtengFileViewerInstance | null>(null);
const currentUrl = ref<string>('/sample.pdf');
const currentName = ref<string>('特大型城市地下管网综合规划图.pdf');
const currentType = ref<string>('pdf');
const selectedFile = ref<File | undefined>(undefined);
const maxSizeLimit = ref<string>('50MB');
const lastProgressMsg = ref<string>('');
const lastEventMsg = ref<string>('就绪');

const { isSizeGuarded, forceRender } = useFileViewer({
  viewerRef: () => viewerRef.value,
  fileName: () => currentName.value,
  fileType: () => currentType.value,
  maxSize: () => maxSizeLimit.value,
});

function simulateLargeFile(): void {
  const largeBlob = new Blob(['x'], { type: 'application/pdf' });
  Object.defineProperty(largeBlob, 'size', { value: 120 * 1024 * 1024 });
  selectedFile.value = largeBlob as File;
  currentUrl.value = '';
  currentName.value = '特大型城市地下管网综合规划图(120MB).pdf';
  currentType.value = 'pdf';
  lastEventMsg.value = '已载入 120MB 超大虚拟文件，已成功触发 SizeGuard 内存熔断拦截！';
}

function resetNormalFile(): void {
  selectedFile.value = undefined;
  currentUrl.value = '/sample.pdf';
  currentName.value = '微服务全景技术规格说明书.pdf';
  currentType.value = 'pdf';
  lastEventMsg.value = '已恢复正常尺寸文档';
}

function handleSizeGuard(payload: { size: number; maxSize: number }): void {
  lastEventMsg.value = `SizeGuard 拦截触发: 当前文件 ${(payload.size / (1024 * 1024)).toFixed(1)} MB 超过阈值 ${(payload.maxSize / (1024 * 1024)).toFixed(0)} MB`;
}

function handleProgress(progress: FileViewerDownloadProgress): void {
  lastProgressMsg.value = `${progress.percent}% (${progress.formattedLoaded} / ${progress.formattedTotal}, ${progress.formattedSpeed})`;
}
</script>

<template>
  <div class="scenario-panel">
    <div class="scenario-toolbar">
      <div class="threshold-group">
        <span class="toolbar-label">🛑 防崩安全阈值 (SizeGuard):</span>
        <select v-model="maxSizeLimit" class="dlp-select">
          <option value="20MB">20 MB (严苛阈值测试)</option>
          <option value="50MB">50 MB (常用阈值)</option>
          <option value="100MB">100 MB (标准安全基准)</option>
          <option value="500MB">500 MB (超宽上限)</option>
        </select>
        <button type="button" class="ctrl-btn ctrl-btn--danger" @click="simulateLargeFile">
          🛑 载入 120MB 超大虚拟文件
        </button>
        <button type="button" class="ctrl-btn" @click="resetNormalFile">🔄 恢复正常文件</button>
      </div>

      <div class="action-group">
        <button
          v-if="isSizeGuarded"
          type="button"
          class="ctrl-btn ctrl-btn--warning"
          @click="forceRender"
        >
          ⚡ 强行破除拦截并加载 (forceRender)
        </button>
      </div>
    </div>

    <div class="status-strip">
      <span v-if="isSizeGuarded" class="warn-badge">⚠️ 拦截状态：文件超出安全大小</span>
      <span v-else class="ok-badge">✅ 大小在安全范围内</span>
      <span class="status-divider">|</span>
      <span
        >当前文件: <strong>{{ currentName }}</strong></span
      >
      <span class="status-divider">|</span>
      <span
        >传输监控: <strong>{{ lastProgressMsg || '静态就绪' }}</strong></span
      >
      <span class="status-divider">|</span>
      <span
        >状态反馈: <em>{{ lastEventMsg }}</em></span
      >
    </div>

    <div class="viewer-container">
      <AtengFileViewer
        ref="viewerRef"
        :url="currentUrl"
        :file="selectedFile"
        :file-name="currentName"
        :file-type="currentType"
        :max-size="maxSizeLimit"
        height="100%"
        @size-guard="handleSizeGuard"
        @progress="handleProgress"
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
  gap: 12px;
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  padding: 8px 16px;
  border-radius: 8px;
  flex-wrap: wrap;
}

.threshold-group,
.action-group {
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

.ctrl-btn {
  padding: 5px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  border: 1px solid #cbd5e1;
  background-color: #ffffff;
  color: #334155;
  cursor: pointer;
  transition: all 0.15s ease;
}

.ctrl-btn:hover {
  background-color: #f1f5f9;
}

.ctrl-btn--danger {
  background-color: #fef2f2;
  border-color: #fecaca;
  color: #dc2626;
  font-weight: 600;
}

.ctrl-btn--warning {
  background-color: #fffbeb;
  border-color: #fde68a;
  color: #b45309;
  font-weight: 600;
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

.warn-badge {
  background-color: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 600;
}

.ok-badge {
  background-color: #ecfdf5;
  color: #059669;
  border: 1px solid #a7f3d0;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 600;
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
