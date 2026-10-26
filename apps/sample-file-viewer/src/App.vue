<script setup lang="ts">
/**
 * sample-file-viewer 主展厅页面。
 *
 * 验证 @atengk/file-viewer 对 Word、Excel、PPT、PDF 的渲染，
 * 以及 DLP 权限控制、防篡改水印、v-model:page 受控翻页、
 * v-model:sheet 工作表切换、TOC 目录大纲与 preserveViewState 状态记忆恢复。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import { ref, computed } from 'vue';
import {
  AtengFileViewer,
  useFileViewer,
  type FileViewerSheet,
  type FileViewerDocumentAnchor,
  type AtengFileViewerInstance,
} from '@atengk/file-viewer';

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

// 工单 #134 新增：多页、多 Sheet、TOC 与状态记忆
const currentPage = ref<number>(1);
const currentSheet = ref<number | string>(0);
const preserveViewState = ref<boolean>(true);
const isViewerMounted = ref<boolean>(true);
const viewerInstanceRef = ref<AtengFileViewerInstance | null>(null);

// 模拟 Excel 多工作表
const sampleSheets = computed<FileViewerSheet[]>(() => {
  if (currentType.value === 'xlsx' || currentType.value === 'xls') {
    return [
      { id: 0, name: '季度汇总资产表' },
      { id: 1, name: '部门明细核算' },
      { id: 2, name: '应收账款账龄分析' },
    ];
  }
  return [];
});

// 模拟文档大纲 TOC 列表
const sampleTocList = computed<FileViewerDocumentAnchor[]>(() => {
  if (currentType.value === 'pdf' || currentType.value === 'docx') {
    return [
      { id: 'sec-1', index: 0, label: '第 1 章：项目业务背景与目标', page: 1 },
      { id: 'sec-2', index: 1, label: '第 2 章：四层无环单向拓扑架构设计', page: 3 },
      { id: 'sec-3', index: 2, label: '第 3 章：三阶智能类型嗅探与流式拉取', page: 6 },
      { id: 'sec-4', index: 3, label: '第 4 章：四维 DLP 数据防泄密与防篡改水印', page: 9 },
    ];
  }
  return [];
});

// 引入 useFileViewer 无头 Hook 联动
const headlessViewer = useFileViewer({
  viewerRef: () => viewerInstanceRef.value,
  fileName: () => currentName.value,
  fileType: () => currentType.value,
  page: () => currentPage.value,
  sheet: () => currentSheet.value,
  downloadable: () => downloadable.value,
  printable: () => printable.value,
});

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
  currentPage.value = 1;
  currentSheet.value = 0;
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
    currentPage.value = 1;
    currentSheet.value = 0;
    lastEventMsg.value = `已加载本地文件: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
  }
}

function remountViewer() {
  isViewerMounted.value = false;
  lastEventMsg.value = '组件已销毁卸载，正在验证 preserveViewState 状态记忆...';
  setTimeout(() => {
    isViewerMounted.value = true;
    lastEventMsg.value = '组件已重新挂载，阅读位置、缩放与旋转已自动恢复！';
  }, 300);
}

function handleLoad(payload: { fileName: string; fileType?: string }) {
  lastEventMsg.value = `文档渲染成功: ${payload.fileName} [${payload.fileType}]`;
}

function handleError(err: unknown) {
  lastEventMsg.value = `文档解析异常: ${err instanceof Error ? err.message : String(err)}`;
}

function handlePageChange(page: number, total?: number) {
  lastEventMsg.value = `页码切换: 第 ${page} 页 / 共 ${total || '?'} 页`;
}

function handleSheetChange(sheet: number | string, sheetName?: string) {
  lastEventMsg.value = `工作表切换: [${sheet}] ${sheetName || ''}`;
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
        纯前端浏览器原生全格式预览：受控多页翻页、多 Sheet 工作表、TOC 目录大纲、DLP
        防泄密与状态记忆恢复
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
        <span class="dlp-label">🛡️ DLP 防泄密:</span>
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

    <!-- 工单 #134 控制栏：受控页码、工作表与状态记忆开关 -->
    <div class="feature-bar">
      <div class="feature-group">
        <span class="feature-label">📑 多页受控 (v-model:page):</span>
        <button type="button" class="mini-btn" @click="headlessViewer.prevPage">上一页</button>
        <span class="page-text">当前第 {{ currentPage }} 页</span>
        <button type="button" class="mini-btn" @click="headlessViewer.nextPage">下一页</button>
        <button type="button" class="mini-btn" @click="headlessViewer.setPage(5)">
          直达第 5 页
        </button>
      </div>

      <div v-if="sampleSheets.length > 0" class="feature-group">
        <span class="feature-label">📊 工作表受控 (v-model:sheet):</span>
        <button
          v-for="s in sampleSheets"
          :key="s.id"
          type="button"
          class="mini-btn"
          :class="{ 'mini-btn--active': currentSheet === s.id }"
          @click="headlessViewer.setSheet(s.id)"
        >
          {{ s.name }}
        </button>
      </div>

      <div class="feature-group">
        <span class="feature-label">💾 弱引用阅读记忆:</span>
        <label class="dlp-checkbox">
          <input v-model="preserveViewState" type="checkbox" />
          <span>开启记忆</span>
        </label>
        <button type="button" class="mini-btn mini-btn--primary" @click="remountViewer">
          🔄 模拟切 Tab 销毁重绘
        </button>
        <button type="button" class="mini-btn" @click="headlessViewer.toggleToc()">
          📖 切换目录大纲 (Hook 指令)
        </button>
      </div>
    </div>

    <div class="sample-status-bar">
      <span
        >当前文件: <strong>{{ currentName }}</strong></span
      >
      <span class="status-divider">|</span>
      <span
        >格式: <strong>{{ currentType.toUpperCase() || '未知' }}</strong></span
      >
      <span class="status-divider">|</span>
      <span
        >页码: <strong>{{ currentPage }}</strong> | 工作表:
        <strong>{{ currentSheet }}</strong></span
      >
      <span class="status-divider">|</span>
      <span
        >状态反馈: <em class="status-msg">{{ lastEventMsg }}</em></span
      >
    </div>

    <div class="viewer-wrapper">
      <AtengFileViewer
        v-if="isViewerMounted"
        ref="viewerInstanceRef"
        v-model:page="currentPage"
        v-model:sheet="currentSheet"
        :url="currentUrl"
        :file="selectedFile"
        :file-name="currentName"
        :file-type="currentType"
        :sheets="sampleSheets"
        :toc-list="sampleTocList"
        :preserve-view-state="preserveViewState"
        :downloadable="downloadable"
        :printable="printable"
        :copyable="copyable"
        :context-menu="contextMenu"
        :watermark="watermarkConfig"
        height="100%"
        @load="handleLoad"
        @error="handleError"
        @page-change="handlePageChange"
        @sheet-change="handleSheetChange"
      />
      <div v-else class="remount-placeholder">
        <div class="remount-spinner"></div>
        <p>组件已销毁卸载，正在验证切 Tab 状态弱引用复原...</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sample-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  box-sizing: border-box;
  background-color: #f8fafc;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  padding: 16px 24px;
  gap: 12px;
}

.sample-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sample-title-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sample-badge {
  background-color: #e0e7ff;
  color: #4338ca;
  font-size: 12px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
}

.sample-header h1 {
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.sample-subtitle {
  font-size: 13px;
  color: #64748b;
  margin: 0;
}

.sample-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.preset-buttons {
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

.ctrl-btn--active:hover {
  background-color: #1d4ed8;
}

.ctrl-btn--danger {
  background-color: #fef2f2;
  border-color: #fecaca;
  color: #dc2626;
}

.ctrl-btn--danger:hover {
  background-color: #fee2e2;
  border-color: #fca5a5;
}

.ctrl-btn--upload {
  background-color: #ecfdf5;
  border-color: #a7f3d0;
  color: #059669;
}

.ctrl-btn--upload:hover {
  background-color: #d1fae5;
}

.local-upload {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dlp-controls,
.feature-bar {
  display: flex;
  align-items: center;
  gap: 20px;
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  flex-wrap: wrap;
}

.dlp-group,
.feature-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.dlp-label,
.feature-label {
  font-weight: 600;
  color: #334155;
}

.dlp-checkbox {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  user-select: none;
  color: #475569;
}

.dlp-select {
  padding: 4px 8px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 12px;
  color: #334155;
  outline: none;
}

.mini-btn {
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 12px;
  border: 1px solid #cbd5e1;
  background-color: #ffffff;
  color: #334155;
  cursor: pointer;
  transition: all 0.15s ease;
}

.mini-btn:hover {
  background-color: #f1f5f9;
}

.mini-btn--active {
  background-color: #2563eb;
  border-color: #2563eb;
  color: #ffffff;
}

.mini-btn--primary {
  background-color: #eff6ff;
  border-color: #bfdbfe;
  color: #1d4ed8;
  font-weight: 600;
}

.mini-btn--primary:hover {
  background-color: #dbeafe;
}

.page-text {
  font-size: 12px;
  font-weight: 600;
  color: #2563eb;
}

.sample-status-bar {
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

.viewer-wrapper {
  flex: 1;
  min-height: 0;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  background-color: #ffffff;
  position: relative;
}

.remount-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #64748b;
  gap: 12px;
}

.remount-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e2e8f0;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: remount-spin 0.6s linear infinite;
}

@keyframes remount-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
