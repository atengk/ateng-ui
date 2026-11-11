<script setup lang="ts">
/**
 * 看板四 · 弹窗脱壳全屏与只读审计场景看板。
 *
 * 验证原生 <Teleport to="body"> 脱壳模态弹窗唤起、0x0 展开自愈重绘、
 * 只读模式锁定防篡改、Retina 高清图片导出与下载。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import { ref } from 'vue';
import {
  AtengGantt,
  AtengGanttModal,
  type GanttTaskRecord,
  type GanttMode,
} from '@atengk/gantt-vue';
import { agileWbsTasks, agileColumns } from '../data/mock-gantt-data';

const modalVisible = ref<boolean>(false);
const isFullscreen = ref<boolean>(false);
const currentMode = ref<GanttMode>('readonly');
const tasks = ref<GanttTaskRecord[]>(JSON.parse(JSON.stringify(agileWbsTasks)));

const inlineGanttRef = ref<InstanceType<typeof AtengGantt> | null>(null);
const modalGanttRef = ref<InstanceType<typeof AtengGanttModal> | null>(null);

const exportedImageSrc = ref<string>('');
const isExporting = ref<boolean>(false);
const exportStatusMsg = ref<string>('');

/**
 * 唤起模态弹窗。
 */
const openModal = (fullscreen = false): void => {
  isFullscreen.value = fullscreen;
  modalVisible.value = true;
};

/**
 * 切换交互/只读模式。
 */
const toggleAuditMode = (): void => {
  currentMode.value = currentMode.value === 'readonly' ? 'interactive' : 'readonly';
};

/**
 * 导出高清全景图片并预览。
 */
const handleExportPreview = async (): Promise<void> => {
  isExporting.value = true;
  exportStatusMsg.value = '正在栅格化渲染高分辨率排程全景图...';

  try {
    const dataUrl = await inlineGanttRef.value?.exportImage({
      format: 'png',
      fileName: 'agile-wbs-schedule',
      pixelRatio: 2,
      includeTable: true,
      viewRange: 'all',
    });

    if (dataUrl) {
      exportedImageSrc.value = dataUrl;
      exportStatusMsg.value = '导出完成，已生成 2x 高清预览图！';
    } else {
      exportStatusMsg.value = '导出未返回图像数据';
    }
  } catch (err) {
    exportStatusMsg.value = `导出失败: ${(err as Error).message}`;
  } finally {
    isExporting.value = false;
  }
};

/**
 * 触发直接下载图片文件。
 */
const handleDirectDownload = async (): Promise<void> => {
  await inlineGanttRef.value?.downloadImage({
    format: 'png',
    fileName: `gantt-export-${Date.now()}`,
    pixelRatio: 2,
    includeTable: true,
  });
};

const handleModalSave = (savedTasks: GanttTaskRecord[]): void => {
  tasks.value = [...savedTasks];
  exportStatusMsg.value = `弹窗修改已持久化同步，共 ${savedTasks.length} 项任务！`;
};
</script>

<template>
  <div class="scenario-panel">
    <div class="panel-header">
      <div class="header-info">
        <h3 class="panel-title">看板四 · 弹窗脱壳全屏与只读审计</h3>
        <p class="panel-desc">
          脱壳模态弹窗零 UI 库依赖、打开 0x0 视口自动重算自愈、只读审计锁死拖拽、Retina
          防虚全景图片导出。
        </p>
      </div>

      <div class="header-controls">
        <button
          type="button"
          class="ctrl-btn"
          :class="{ active: currentMode === 'readonly' }"
          @click="toggleAuditMode"
        >
          {{ currentMode === 'readonly' ? '🔒 当前: 只读审计模式' : '✏️ 当前: 可编辑模式' }}
        </button>
        <button type="button" class="ctrl-btn ctrl-btn--primary" @click="openModal(false)">
          🪟 打开排程模态弹窗
        </button>
        <button type="button" class="ctrl-btn" @click="openModal(true)">⛶ 打开真全屏排程</button>
      </div>
    </div>

    <!-- 导出控制栏 -->
    <div class="export-banner">
      <div class="banner-left">
        <button type="button" class="ctrl-btn" :disabled="isExporting" @click="handleExportPreview">
          📷 导出 2x 高清预览图
        </button>
        <button
          type="button"
          class="ctrl-btn"
          :disabled="isExporting"
          @click="handleDirectDownload"
        >
          ⬇️ 下载 PNG 文件
        </button>
        <span class="status-msg">{{ exportStatusMsg }}</span>
      </div>
    </div>

    <!-- 导出图像预览卡片 -->
    <div v-if="exportedImageSrc" class="preview-card">
      <div class="preview-header">
        <span class="preview-title">高清导出快照 (2x PixelRatio)</span>
        <button type="button" class="close-preview-btn" @click="exportedImageSrc = ''">
          ✕ 关闭预览
        </button>
      </div>
      <div class="preview-img-box">
        <img :src="exportedImageSrc" alt="Gantt Export Snapshot" class="snapshot-img" />
      </div>
    </div>

    <!-- 原地内嵌甘特图 (供只读审计与导出自验) -->
    <div class="gantt-wrapper">
      <AtengGantt
        ref="inlineGanttRef"
        v-model:tasks="tasks"
        v-model:mode="currentMode"
        :columns="agileColumns"
        scale="day"
      />
    </div>

    <!-- 原生脱壳模态弹窗组件 -->
    <AtengGanttModal
      ref="modalGanttRef"
      v-model="modalVisible"
      v-model:fullscreen="isFullscreen"
      v-model:tasks="tasks"
      title="敏捷研发排程决策工作台 (脱壳 Teleport)"
      :columns="agileColumns"
      scale="day"
      @save="handleModalSave"
    />
  </div>
</template>

<style scoped>
.scenario-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 12px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: var(--at-gantt-bg, #ffffff);
  border: 1px solid var(--at-gantt-border-color, #e5e7eb);
  border-radius: 8px;
}

.panel-title {
  margin: 0 0 4px 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--at-gantt-text-color, #1f2937);
}

.panel-desc {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--at-gantt-text-muted, #6b7280);
}

.header-controls {
  display: flex;
  gap: 8px;
}

.ctrl-btn {
  padding: 6px 12px;
  font-size: 0.8125rem;
  font-weight: 500;
  background-color: var(--at-gantt-bg, #ffffff);
  color: var(--at-gantt-text-color, #374151);
  border: 1px solid var(--at-gantt-border-color, #d1d5db);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.ctrl-btn:hover {
  background-color: var(--at-gantt-action-btn-hover-bg, rgba(0, 0, 0, 0.04));
}

.ctrl-btn.active {
  background-color: var(--at-gantt-warning-color, #f59e0b);
  color: #ffffff;
  border-color: var(--at-gantt-warning-color, #f59e0b);
}

.ctrl-btn--primary {
  background-color: var(--at-gantt-bar-color, #3b82f6);
  color: #ffffff;
  border-color: var(--at-gantt-bar-color, #3b82f6);
}

.ctrl-btn--primary:hover {
  background-color: var(--at-gantt-bar-progress-color, #1d4ed8);
}

.export-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background-color: var(--at-gantt-header-bg, #f9fafb);
  border: 1px solid var(--at-gantt-border-color, #e5e7eb);
  border-radius: 6px;
}

.banner-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-msg {
  font-size: 0.8125rem;
  color: var(--at-gantt-text-muted, #6b7280);
  font-family: monospace;
}

.preview-card {
  padding: 12px 16px;
  background-color: var(--at-gantt-header-bg, #f9fafb);
  border: 1px dashed var(--at-gantt-bar-color, #3b82f6);
  border-radius: 8px;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.preview-title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--at-gantt-text-color, #1f2937);
}

.close-preview-btn {
  font-size: 0.75rem;
  color: var(--at-gantt-delay-color, #ef4444);
  background: transparent;
  border: none;
  cursor: pointer;
}

.preview-img-box {
  max-height: 200px;
  overflow: auto;
  border: 1px solid var(--at-gantt-border-color, #e5e7eb);
  border-radius: 4px;
}

.snapshot-img {
  width: 100%;
  height: auto;
  display: block;
}

.gantt-wrapper {
  flex: 1;
  min-height: 440px;
  border-radius: 8px;
  overflow: hidden;
}
</style>
