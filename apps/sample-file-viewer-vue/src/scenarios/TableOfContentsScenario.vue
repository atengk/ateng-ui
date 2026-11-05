<script setup lang="ts">
/**
 * 真实 DOM 章节大纲提取与目录联动 (TOC) 场景看板。
 *
 * 验证基于 HeadingSemanticExtractor 从真实 DOM 树自动提取大纲、
 * 1~6 级树状缩进、平滑锚点跳转定位与外部 Mock 大纲注入覆盖能力。
 *
 * @author Ateng
 * @since 2026-11-05
 */

import { ref, computed } from 'vue';
import {
  AtengFileViewer,
  useFileViewer,
  type FileViewerDocumentAnchor,
  type AtengFileViewerInstance,
} from '@atengk/file-viewer-vue';

const viewerRef = ref<AtengFileViewerInstance | null>(null);
const currentUrl = ref<string>('/sample.docx');
const currentName = ref<string>('企业采购框架协议.docx');
const currentType = ref<string>('docx');
const lastEventMsg = ref<string>('已自动提取文档 DOM 大纲');
const useCustomToc = ref<boolean>(false);

// 模拟外部注入的定制大纲（覆盖测试）
const mockTocList: FileViewerDocumentAnchor[] = [
  { id: 'sec-1', index: 0, label: '第 1 章：项目业务背景与战略目标 (外部注入)', page: 1 },
  { id: 'sec-2', index: 1, label: '第 2 章：系统四层单向无环架构设计 (外部注入)', page: 2 },
  { id: 'sec-3', index: 2, label: '第 3 章：三阶智能类型嗅探与流式传输 (外部注入)', page: 3 },
  { id: 'sec-4', index: 3, label: '第 4 章：四维 DLP 防泄密与防篡改水印 (外部注入)', page: 4 },
  { id: 'sec-5', index: 4, label: '第 5 章：企业私有化部署与静态资产寻址 (外部注入)', page: 5 },
];

const activeTocList = computed<FileViewerDocumentAnchor[]>(() => {
  return useCustomToc.value ? mockTocList : [];
});

const { toggleToc } = useFileViewer({
  viewerRef: () => viewerRef.value,
  fileName: () => currentName.value,
  fileType: () => currentType.value,
});

function switchDoc(type: 'docx' | 'md' | 'pdf'): void {
  if (type === 'docx') {
    currentUrl.value = '/sample.docx';
    currentName.value = '企业采购框架协议.docx';
    currentType.value = 'docx';
  } else if (type === 'md') {
    currentUrl.value = '/sample.md';
    currentName.value = '现代前端工业级架构实践指南.md';
    currentType.value = 'md';
  } else {
    currentUrl.value = '/sample.pdf';
    currentName.value = '微服务全景技术规格说明书.pdf';
    currentType.value = 'pdf';
  }
  lastEventMsg.value = `已切换至: ${currentName.value}，正在重新提取大纲`;
}
</script>

<template>
  <div class="scenario-panel">
    <div class="scenario-toolbar">
      <div class="doc-switch">
        <span class="toolbar-label">切换长篇文档:</span>
        <button
          type="button"
          class="ctrl-btn"
          :class="{ 'ctrl-btn--active': currentType === 'docx' }"
          @click="switchDoc('docx')"
        >
          📄 采购协议 (.docx)
        </button>
        <button
          type="button"
          class="ctrl-btn"
          :class="{ 'ctrl-btn--active': currentType === 'md' }"
          @click="switchDoc('md')"
        >
          📝 架构指南 (.md)
        </button>
        <button
          type="button"
          class="ctrl-btn"
          :class="{ 'ctrl-btn--active': currentType === 'pdf' }"
          @click="switchDoc('pdf')"
        >
          📑 规格说明 (.pdf)
        </button>
      </div>

      <div class="toc-controls">
        <button type="button" class="ctrl-btn ctrl-btn--primary" @click="toggleToc">
          📖 展开/收起目录大纲
        </button>
        <label
          class="dlp-checkbox"
          title="勾选后将强制覆盖为外部静态 Mock 章节；取消勾选将 100% 自动提取文档真实 DOM 大纲"
        >
          <input v-model="useCustomToc" type="checkbox" />
          <span>外部 Mock 大纲注入测试</span>
        </label>
      </div>
    </div>

    <div class="status-strip">
      <span
        >当前文档: <strong>{{ currentName }}</strong></span
      >
      <span class="status-divider">|</span>
      <span
        >大纲模式:
        <strong>{{
          useCustomToc ? '外部 Mock 注入覆盖' : '真实 DOM 自动提取 (原生解析)'
        }}</strong></span
      >
      <span class="status-divider">|</span>
      <span
        >操作指示: <em class="status-msg">{{ lastEventMsg }}</em></span
      >
    </div>

    <div class="viewer-container">
      <AtengFileViewer
        ref="viewerRef"
        :url="currentUrl"
        :file-name="currentName"
        :file-type="currentType"
        :toc-list="activeTocList"
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
  gap: 12px;
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  padding: 8px 16px;
  border-radius: 8px;
  flex-wrap: wrap;
}

.doc-switch,
.toc-controls {
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

.ctrl-btn--active {
  background-color: #2563eb;
  border-color: #2563eb;
  color: #ffffff;
}

.ctrl-btn--primary {
  background-color: #eff6ff;
  border-color: #bfdbfe;
  color: #1d4ed8;
  font-weight: 600;
}

.ctrl-btn--primary:hover {
  background-color: #dbeafe;
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
