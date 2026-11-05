<script setup lang="ts">
/**
 * 无头状态机 Hook (useFileViewer) 与弱引用阅读状态记忆场景看板。
 *
 * 验证基于 useFileViewer 无头状态机编排多页翻页、多 Sheet 工作表流转、
 * 缩放控制与基于 WeakMap 的 preserveViewState 阅读位置切 Tab 销毁重绘自愈。
 *
 * @author Ateng
 * @since 2026-11-05
 */

import { ref } from 'vue';
import {
  AtengFileViewer,
  useFileViewer,
  type FileViewerSheet,
  type AtengFileViewerInstance,
} from '@atengk/file-viewer-vue';

const viewerRef = ref<AtengFileViewerInstance | null>(null);
const currentPage = ref<number>(1);
const currentSheet = ref<number | string>(0);
const preserveViewState = ref<boolean>(true);
const isViewerMounted = ref<boolean>(true);
const lastEventMsg = ref<string>('就绪');

const sampleSheets: FileViewerSheet[] = [
  { id: 0, name: '季度汇总资产表' },
  { id: 1, name: '部门明细核算' },
  { id: 2, name: '应收账款账龄分析' },
];

const headlessViewer = useFileViewer({
  viewerRef: () => viewerRef.value,
  fileName: () => '2026年第三季度集团财务对账明细.xlsx',
  fileType: () => 'xlsx',
  page: () => currentPage.value,
  sheet: () => currentSheet.value,
});

function remountViewer(): void {
  isViewerMounted.value = false;
  lastEventMsg.value = '组件已销毁卸载，正在验证 preserveViewState 状态记忆...';
  setTimeout(() => {
    isViewerMounted.value = true;
    lastEventMsg.value = '组件已重新挂载，阅读位置、工作表与缩放比例已自动恢复！';
  }, 300);
}

function handlePageChange(page: number, total?: number): void {
  lastEventMsg.value = `页码流转: 第 ${page} 页 / 共 ${total || '?'} 页`;
}

function handleSheetChange(sheet: number | string, sheetName?: string): void {
  lastEventMsg.value = `工作表流转: [${sheet}] ${sheetName || ''}`;
}
</script>

<template>
  <div class="scenario-panel">
    <div class="scenario-toolbar">
      <div class="control-row">
        <div class="feature-group">
          <span class="feature-label">📑 多页控制 (v-model:page):</span>
          <button type="button" class="mini-btn" @click="headlessViewer.prevPage">上一页</button>
          <span class="page-indicator">第 {{ currentPage }} 页</span>
          <button type="button" class="mini-btn" @click="headlessViewer.nextPage">下一页</button>
          <button type="button" class="mini-btn" @click="headlessViewer.setPage(3)">
            直达第 3 页
          </button>
        </div>

        <div class="feature-group">
          <span class="feature-label">📊 工作表切换 (v-model:sheet):</span>
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
          <span class="feature-label">🔍 缩放指令:</span>
          <button type="button" class="mini-btn" @click="headlessViewer.zoomIn">放大 (+)</button>
          <button type="button" class="mini-btn" @click="headlessViewer.zoomOut">缩小 (-)</button>
          <button type="button" class="mini-btn" @click="headlessViewer.resetZoom">重置</button>
        </div>

        <div class="feature-group">
          <span class="feature-label">💾 弱引用状态记忆:</span>
          <label class="dlp-checkbox">
            <input v-model="preserveViewState" type="checkbox" />
            <span>开启记忆</span>
          </label>
          <button type="button" class="mini-btn mini-btn--primary" @click="remountViewer">
            🔄 模拟切 Tab 销毁重绘
          </button>
        </div>
      </div>
    </div>

    <div class="status-strip">
      <span
        >当前工作表:
        <strong
          >[{{ currentSheet }}] {{ sampleSheets.find(s => s.id === currentSheet)?.name }}</strong
        ></span
      >
      <span class="status-divider">|</span>
      <span
        >当前页码: <strong>{{ currentPage }}</strong></span
      >
      <span class="status-divider">|</span>
      <span
        >WeakMap 记忆:
        <strong>{{ preserveViewState ? '已开启 (切 Tab 进度自动复原)' : '已关闭' }}</strong></span
      >
      <span class="status-divider">|</span>
      <span
        >状态反馈: <em class="status-msg">{{ lastEventMsg }}</em></span
      >
    </div>

    <div class="viewer-container">
      <AtengFileViewer
        v-if="isViewerMounted"
        ref="viewerRef"
        v-model:page="currentPage"
        v-model:sheet="currentSheet"
        url="/sample.xlsx"
        file-name="2026年第三季度集团财务对账明细.xlsx"
        file-type="xlsx"
        :sheets="sampleSheets"
        :preserve-view-state="preserveViewState"
        height="100%"
        @page-change="handlePageChange"
        @sheet-change="handleSheetChange"
      />
      <div v-else class="remount-placeholder">
        <div class="remount-spinner"></div>
        <p>组件已销毁卸载，正在验证 WeakMap 弱引用阅读状态自愈还原...</p>
      </div>
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
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  padding: 8px 16px;
  border-radius: 8px;
}

.control-row {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.feature-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.feature-label {
  font-weight: 600;
  font-size: 13px;
  color: #334155;
}

.page-indicator {
  font-size: 12px;
  font-weight: 600;
  color: #2563eb;
  padding: 0 4px;
}

.mini-btn {
  padding: 4px 10px;
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
