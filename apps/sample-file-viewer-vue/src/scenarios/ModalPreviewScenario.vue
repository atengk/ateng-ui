<script setup lang="ts">
/**
 * 多模态表现容器（声明式弹窗与命令式 preview）场景看板。
 *
 * 验证声明式受控全屏弹窗组件 (<AtengFileViewerDialog>)，
 * 以及全局单行命令式预览调用 (FileViewer.preview) 的挂载与确定性销毁。
 *
 * @author Ateng
 * @since 2026-11-05
 */

import { ref } from 'vue';
import { AtengFileViewerDialog, FileViewer } from '@atengk/file-viewer-vue';

const isDialogVisible = ref<boolean>(false);
const lastEventMsg = ref<string>('就绪 (请点击按钮体验不同模态唤起)');

function openImperativePreview(): void {
  FileViewer.preview({
    url: '/sample.pdf',
    fileName: '上市公司海外并购尽职调查报告.pdf',
    fileType: 'pdf',
    downloadable: false,
    printable: false,
    watermark: '法务审计专阅 2026-11-05',
    onClose: () => {
      lastEventMsg.value = '命令式预览弹窗已关闭，宿主 DOM 已确定性完全移除，Vue 实例已销毁';
    },
  });
  lastEventMsg.value = '已通过 FileViewer.preview 动态在 document.body 挂载全屏预览弹窗';
}

function handleDialogLoad(payload: { fileName: string; fileType?: string }): void {
  lastEventMsg.value = `声明式弹窗渲染成功: ${payload.fileName} [${payload.fileType}]`;
}

function handleDialogError(err: unknown): void {
  lastEventMsg.value = `声明式弹窗异常: ${err instanceof Error ? err.message : String(err)}`;
}
</script>

<template>
  <div class="scenario-panel">
    <div class="scenario-toolbar">
      <div class="modal-buttons">
        <button type="button" class="ctrl-btn ctrl-btn--primary" @click="isDialogVisible = true">
          🖥️ 打开声明式全屏受控弹窗 (&lt;AtengFileViewerDialog&gt;)
        </button>

        <button type="button" class="ctrl-btn ctrl-btn--warning" @click="openImperativePreview">
          ⚡ 一行 JS 命令式唤起预览 (FileViewer.preview)
        </button>
      </div>
    </div>

    <!-- 演示背景说明卡片 -->
    <div class="modal-intro-card">
      <h3>多模态弹窗调用说明</h3>
      <div class="intro-grid">
        <div class="intro-box">
          <h4>1. 声明式全屏弹窗 (`<AtengFileViewerDialog />`)</h4>
          <p>
            适用于常规页面视图中预埋弹窗结构，支持 <code>v-model</code> 响应式双向受控、ESC
            键盘快捷退出、遮罩点击关闭、全屏热切换与 100% 插槽定制。
          </p>
        </div>
        <div class="intro-box">
          <h4>2. 命令式函数极速预览 (`FileViewer.preview`)</h4>
          <p>
            适用于后台管理表格操作列、行内超链接点击等场景。一行代码动态在
            <code>document.body</code> 创建挂载容器，弹窗关闭后自动执行
            <code>app.unmount()</code> 与节点移除，DOM 零残留。
          </p>
        </div>
      </div>
      <div class="event-feedback">
        <span
          >实时状态轨迹: <strong>{{ lastEventMsg }}</strong></span
        >
      </div>
    </div>

    <!-- 声明式弹窗组件 -->
    <AtengFileViewerDialog
      v-model="isDialogVisible"
      url="/sample.docx"
      file-name="企业采购框架协议.docx"
      file-type="docx"
      :downloadable="true"
      :printable="true"
      watermark="企业合规预览"
      dialog-width="92vw"
      dialog-height="90vh"
      @load="handleDialogLoad"
      @error="handleDialogError"
    >
      <template #header="{ title, close, toggleFullscreen, isFullscreen }">
        <div class="custom-dialog-header">
          <span class="custom-title">📑 [业务定制顶栏] {{ title }}</span>
          <div class="custom-actions">
            <button type="button" class="mini-tool-btn" @click="toggleFullscreen">
              {{ isFullscreen ? '🗗 还原' : '🗖 全屏' }}
            </button>
            <button type="button" class="mini-tool-btn mini-tool-btn--close" @click="close">
              ✕ 关闭
            </button>
          </div>
        </div>
      </template>
    </AtengFileViewerDialog>
  </div>
</template>

<style scoped>
.scenario-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 16px;
}

.scenario-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  padding: 12px 16px;
  border-radius: 8px;
}

.modal-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.ctrl-btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  border: 1px solid transparent;
}

.ctrl-btn--primary {
  background-color: #2563eb;
  color: #ffffff;
}

.ctrl-btn--primary:hover {
  background-color: #1d4ed8;
}

.ctrl-btn--warning {
  background-color: #f59e0b;
  color: #ffffff;
}

.ctrl-btn--warning:hover {
  background-color: #d97706;
}

.modal-intro-card {
  flex: 1;
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal-intro-card h3 {
  margin: 0;
  font-size: 16px;
  color: #0f172a;
}

.intro-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 16px;
}

.intro-box {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 14px 16px;
}

.intro-box h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #1e293b;
}

.intro-box p {
  margin: 0;
  font-size: 13px;
  color: #64748b;
  line-height: 1.6;
}

.event-feedback {
  background-color: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #1d4ed8;
  padding: 10px 14px;
  border-radius: 6px;
  font-size: 13px;
}

.custom-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.custom-title {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.custom-actions {
  display: flex;
  gap: 6px;
}

.mini-tool-btn {
  padding: 3px 8px;
  font-size: 12px;
  border: 1px solid #cbd5e1;
  background-color: #ffffff;
  border-radius: 4px;
  cursor: pointer;
}

.mini-tool-btn:hover {
  background-color: #f1f5f9;
}

.mini-tool-btn--close {
  color: #dc2626;
  border-color: #fecaca;
}

.mini-tool-btn--close:hover {
  background-color: #fef2f2;
}
</style>
