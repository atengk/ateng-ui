<script setup lang="ts">
/**
 * 多格式办公文档原生离线渲染与智能类型嗅探场景看板。
 *
 * 验证 Word (.docx)、Markdown (.md)、Excel (.xlsx)、PPT (.pptx)、PDF (.pdf)、
 * 矢量图片 (.svg) 以及无扩展名接口流二进制魔数智能嗅探渲染。
 *
 * @author Ateng
 * @since 2026-11-05
 */

import { ref } from 'vue';
import { AtengFileViewer } from '@atengk/file-viewer-vue';

interface PresetItem {
  label: string;
  url: string;
  name: string;
  type: string;
}

const presets: PresetItem[] = [
  {
    label: 'Word 合同规范 (.docx)',
    url: '/sample.docx',
    name: '企业采购框架协议.docx',
    type: 'docx',
  },
  {
    label: 'Markdown 实践指南 (.md)',
    url: '/sample.md',
    name: '现代前端工业级架构实践指南.md',
    type: 'md',
  },
  {
    label: 'Excel 财务对账 (.xlsx)',
    url: '/sample.xlsx',
    name: '2026年第三季度集团财务对账明细.xlsx',
    type: 'xlsx',
  },
  {
    label: 'PPT 技术演进 (.pptx)',
    url: '/sample.pptx',
    name: '现代云原生微服务技术演进推演.pptx',
    type: 'pptx',
  },
  {
    label: 'PDF 规格说明书 (.pdf)',
    url: '/sample.pdf',
    name: '微服务全景技术规格说明书.pdf',
    type: 'pdf',
  },
  {
    label: 'SVG 电气布线图 (.svg)',
    url: '/sample.svg',
    name: '数据中心机房电气布线矢量图.svg',
    type: 'svg',
  },
  { label: '无后缀接口流 (魔数嗅探)', url: '/sample.docx', name: '未定名契约流', type: '' },
];

const currentUrl = ref<string>('/sample.docx');
const currentName = ref<string>('企业采购框架协议.docx');
const currentType = ref<string>('docx');
const selectedFile = ref<File | undefined>(undefined);
const lastEventMsg = ref<string>('就绪');

function selectPreset(item: PresetItem): void {
  selectedFile.value = undefined;
  currentUrl.value = item.url;
  currentName.value = item.name;
  currentType.value = item.type;
  lastEventMsg.value = `切换至预设: ${item.label}`;
}

function handleFileInput(e: Event): void {
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

function handleLoad(payload: { fileName: string; fileType?: string }): void {
  lastEventMsg.value = `文档渲染成功: ${payload.fileName} [${payload.fileType || '自动嗅探'}]`;
}

function handleError(err: unknown): void {
  lastEventMsg.value = `文档解析异常: ${err instanceof Error ? err.message : String(err)}`;
}
</script>

<template>
  <div class="scenario-panel">
    <div class="scenario-toolbar">
      <div class="preset-buttons">
        <button
          v-for="item in presets"
          :key="item.label"
          type="button"
          class="ctrl-btn"
          :class="{ 'ctrl-btn--active': currentUrl === item.url && !selectedFile }"
          @click="selectPreset(item)"
        >
          {{ item.label }}
        </button>
      </div>

      <div class="action-buttons">
        <label class="ctrl-btn ctrl-btn--upload">
          <span>📁 选择任意本地文件</span>
          <input type="file" style="display: none" @change="handleFileInput" />
        </label>
      </div>
    </div>

    <div class="status-strip">
      <span
        >当前文件: <strong>{{ currentName }}</strong></span
      >
      <span class="status-divider">|</span>
      <span
        >格式: <strong>{{ currentType.toUpperCase() || '无后缀魔数嗅探中' }}</strong></span
      >
      <span class="status-divider">|</span>
      <span
        >状态反馈: <em class="status-msg">{{ lastEventMsg }}</em></span
      >
    </div>

    <div class="viewer-container">
      <AtengFileViewer
        :url="currentUrl"
        :file="selectedFile"
        :file-name="currentName"
        :file-type="currentType"
        height="100%"
        @load="handleLoad"
        @error="handleError"
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
  gap: 10px;
  flex-wrap: wrap;
}

.preset-buttons,
.action-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.ctrl-btn {
  padding: 6px 14px;
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
  border-color: #94a3b8;
}

.ctrl-btn--active {
  background-color: #2563eb;
  border-color: #2563eb;
  color: #ffffff;
}

.ctrl-btn--upload {
  background-color: #ecfdf5;
  border-color: #a7f3d0;
  color: #059669;
}

.ctrl-btn--upload:hover {
  background-color: #d1fae5;
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

.status-msg {
  color: #2563eb;
  font-style: normal;
  font-weight: 500;
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
