<script setup lang="ts">
/**
 * sample-file-viewer 主展厅页面。
 *
 * 验证 @atengk/file-viewer 对 Word、Excel、PPT、PDF 以及本地选择文件的渲染支持。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import { ref, computed } from 'vue';
import { AtengFileViewer } from '@atengk/file-viewer';

interface PresetItem {
  label: string;
  url: string;
  name: string;
  type: string;
}

const presets: PresetItem[] = [
  { label: 'Word 文档 (.docx)', url: '/sample.docx', name: '企业合同规范.docx', type: 'docx' },
  { label: 'Excel 报表 (.xlsx)', url: '/sample.xlsx', name: '财务季度对账表.xlsx', type: 'xlsx' },
  { label: 'PPT 幻灯片 (.pptx)', url: '/sample.pptx', name: '产品架构推演.pptx', type: 'pptx' },
  { label: 'PDF 文档 (.pdf)', url: '/sample.pdf', name: '技术规格说明书.pdf', type: 'pdf' },
  { label: '无后缀接口流 (魔数嗅探)', url: '/sample.docx', name: '', type: '' },
];

const currentUrl = ref<string>('/sample.docx');
const currentName = ref<string>('企业合同规范.docx');
const currentType = ref<string>('docx');
const selectedFile = ref<File | undefined>(undefined);
const lastEventMsg = ref<string>('就绪');

// DLP 权限控制与水印测试状态
const downloadable = ref<boolean>(true);
const printable = ref<boolean>(true);
const copyable = ref<boolean>(true);
const contextMenu = ref<boolean>(true);
const watermarkType = ref<string>('text');

const watermarkConfig = computed(() => {
  if (watermarkType.value === 'none') return false;
  if (watermarkType.value === 'text') return '张三 10086 绝密文件';
  if (watermarkType.value === 'custom') {
    return {
      text: '研发审计专用 2026-10-26',
      color: '#e11d48',
      fontSize: 18,
      opacity: 0.22,
      rotate: -30,
    };
  }
  return false;
});

function selectPreset(item: PresetItem) {
  selectedFile.value = undefined;
  currentUrl.value = item.url;
  currentName.value = item.name;
  currentType.value = item.type;
  lastEventMsg.value = `切换至预设: ${item.label}`;
}

function simulateBlobError() {
  const errorJson = JSON.stringify({
    code: 403,
    msg: '您无权查看该机密财务审计报告',
    traceId: 'tr-sec-403-' + Date.now().toString(36),
  });
  const errorBlob = new Blob([errorJson], { type: 'application/json' });
  selectedFile.value = errorBlob as File;
  currentUrl.value = '';
  currentName.value = 'confidential_report.xlsx';
  currentType.value = 'xlsx';
  lastEventMsg.value = '已载入模拟 403 JSON 错误流，触发 ADR-0004 异常防御拦截';
}

function handleFileInput(e: Event) {
  const input = e.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    const file = input.files[0];
    selectedFile.value = file;
    currentUrl.value = '';
    currentName.value = file.name;
    const dotIdx = file.name.lastIndexOf('.');
    currentType.value = dotIdx >= 0 ? file.name.slice(dotIdx + 1) : '';
    lastEventMsg.value = `已加载本地文件: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
  }
}

function handleLoad(payload: { fileName: string; fileType?: string }) {
  lastEventMsg.value = `文档渲染成功: ${payload.fileName} [${payload.fileType}]`;
}

function handleError(err: unknown) {
  lastEventMsg.value = `文档解析异常: ${err instanceof Error ? err.message : String(err)}`;
}
</script>

<template>
  <div class="sample-container">
    <header class="sample-header">
      <div class="sample-title-group">
        <span class="sample-badge">L2 专用能力扩展</span>
        <h1>@atengk/file-viewer 自验展厅</h1>
      </div>
      <p class="sample-subtitle">
        纯前端浏览器原生离线渲染：支持 Word (.docx)、Excel (.xlsx)、PPT (.pptx)、PDF 与图片
      </p>
    </header>

    <div class="sample-controls">
      <div class="preset-buttons">
        <button
          v-for="item in presets"
          :key="item.type"
          type="button"
          class="ctrl-btn"
          :class="{ 'ctrl-btn--active': currentUrl === item.url && !selectedFile }"
          @click="selectPreset(item)"
        >
          {{ item.label }}
        </button>
      </div>

      <div class="local-upload">
        <button type="button" class="ctrl-btn ctrl-btn--danger" @click="simulateBlobError">
          🛡️ 模拟 403 错误流 (ADR-0004)
        </button>
        <label class="ctrl-btn ctrl-btn--upload">
          <span>📁 选择任意本地文件</span>
          <input type="file" style="display: none" @change="handleFileInput" />
        </label>
      </div>
    </div>

    <!-- 四维 DLP 权限与水印配置操作条 -->
    <div class="dlp-controls">
      <div class="dlp-group">
        <span class="dlp-label">🛡️ DLP 防泄密控制:</span>
        <label class="dlp-checkbox">
          <input v-model="downloadable" type="checkbox" />
          <span>允许下载 (Ctrl+S)</span>
        </label>
        <label class="dlp-checkbox">
          <input v-model="printable" type="checkbox" />
          <span>允许打印 (Ctrl+P)</span>
        </label>
        <label class="dlp-checkbox">
          <input v-model="copyable" type="checkbox" />
          <span>允许复制 (Copy/Cut)</span>
        </label>
        <label class="dlp-checkbox">
          <input v-model="contextMenu" type="checkbox" />
          <span>允许右键菜单</span>
        </label>
      </div>

      <div class="dlp-group">
        <span class="dlp-label">💧 安全防篡改水印:</span>
        <select v-model="watermarkType" class="dlp-select">
          <option value="none">关闭水印</option>
          <option value="text">标准文本水印 (张三 10086)</option>
          <option value="custom">高保真旋转警戒水印 (研发专用)</option>
        </select>
      </div>
    </div>

    <div class="sample-status-bar">
      <span
        >当前文件: <strong>{{ currentName }}</strong></span
      >
      <span class="status-divider">|</span>
      <span
        >格式识别: <strong>{{ currentType.toUpperCase() || '未知' }}</strong></span
      >
      <span class="status-divider">|</span>
      <span
        >状态反馈: <em class="status-msg">{{ lastEventMsg }}</em></span
      >
    </div>

    <div class="viewer-wrapper">
      <AtengFileViewer
        :url="currentUrl"
        :file="selectedFile"
        :file-name="currentName"
        :file-type="currentType"
        :downloadable="downloadable"
        :printable="printable"
        :copyable="copyable"
        :context-menu="contextMenu"
        :watermark="watermarkConfig"
        height="100%"
        @load="handleLoad"
        @error="handleError"
      />
    </div>
  </div>
</template>

<style scoped>
.sample-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  color: #1e293b;
  display: flex;
  flex-direction: column;
  height: 95vh;
  box-sizing: border-box;
}

.sample-header {
  margin-bottom: 16px;
}

.sample-title-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sample-badge {
  background-color: #3b82f6;
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 4px;
}

.sample-title-group h1 {
  font-size: 24px;
  margin: 0;
  color: #0f172a;
}

.sample-subtitle {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 14px;
}

.sample-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.preset-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.ctrl-btn {
  padding: 8px 14px;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
  background-color: #ffffff;
  color: #334155;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.ctrl-btn:hover {
  background-color: #f1f5f9;
  border-color: #94a3b8;
}

.ctrl-btn--active {
  background-color: #3b82f6;
  border-color: #3b82f6;
  color: #ffffff;
}

.ctrl-btn--active:hover {
  background-color: #2563eb;
  border-color: #2563eb;
}

.ctrl-btn--upload {
  display: inline-flex;
  align-items: center;
  background-color: #10b981;
  border-color: #10b981;
  color: #ffffff;
}

.ctrl-btn--upload:hover {
  background-color: #059669;
  border-color: #059669;
}

.ctrl-btn--danger {
  background-color: #ef4444;
  border-color: #ef4444;
  color: #ffffff;
}

.ctrl-btn--danger:hover {
  background-color: #dc2626;
  border-color: #dc2626;
}

.sample-status-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 12px;
  color: #475569;
  margin-bottom: 12px;
}

.status-divider {
  color: #cbd5e1;
}

.status-msg {
  color: #2563eb;
  font-style: normal;
}

.viewer-wrapper {
  flex: 1;
  min-height: 0;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.dlp-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  background-color: #f1f5f9;
  border-radius: 8px;
  margin-bottom: 12px;
  font-size: 13px;
}

.dlp-group {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.dlp-label {
  font-weight: 600;
  color: #334155;
}

.dlp-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  color: #475569;
}

.dlp-select {
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #cbd5e1;
  background-color: #ffffff;
  font-size: 13px;
  cursor: pointer;
}
</style>
