<script setup lang="ts">
/**
 * 四维 DLP 数据防泄密与反审查自愈水印场景看板。
 *
 * 验证禁下载 (Ctrl+S)、禁打印 (Ctrl+P 与 @media print 样式抑制)、
 * 禁复制 (Copy/Cut/文字防选)、禁右键以及 MutationObserver 水印防篡改自愈。
 *
 * @author Ateng
 * @since 2026-11-05
 */

import { ref, computed } from 'vue';
import { AtengFileViewer } from '@atengk/file-viewer-vue';

const downloadable = ref<boolean>(false);
const printable = ref<boolean>(false);
const copyable = ref<boolean>(false);
const contextMenu = ref<boolean>(false);
const watermarkType = ref<'text' | 'custom' | 'none'>('text');
const lastEventMsg = ref<string>('DLP 硬核防御与防篡改水印已激活');

const watermarkConfig = computed(() => {
  if (watermarkType.value === 'none') return false;
  if (watermarkType.value === 'text') return '张三 10086 绝密尽职调查';
  return {
    text: '研发合规专阅 2026-11-05',
    color: '#e11d48',
    fontSize: 18,
    opacity: 0.25,
    rotate: -30,
  };
});

function triggerPrintTest(): void {
  lastEventMsg.value = '正在唤起浏览器打印 (测试打印白屏抑制与拦截)...';
  window.print();
}
</script>

<template>
  <div class="scenario-panel">
    <div class="scenario-toolbar">
      <div class="dlp-group">
        <span class="toolbar-label">🛡️ 四维 DLP 权限:</span>
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
          <span>允许复制文字 (Copy)</span>
        </label>
        <label class="dlp-checkbox">
          <input v-model="contextMenu" type="checkbox" />
          <span>允许右键菜单</span>
        </label>
      </div>

      <div class="watermark-group">
        <span class="toolbar-label">💧 安全防篡改水印:</span>
        <select v-model="watermarkType" class="dlp-select">
          <option value="none">关闭水印</option>
          <option value="text">标准文本水印 (张三 10086)</option>
          <option value="custom">高保真旋转警戒水印 (合规专阅)</option>
        </select>
        <button type="button" class="ctrl-btn ctrl-btn--danger" @click="triggerPrintTest">
          🖨️ 触发打印测试 (验证白屏抑制)
        </button>
      </div>
    </div>

    <div class="status-strip">
      <span class="warn-badge">🔒 DLP 安全审计模式</span>
      <span
        >下载: <strong>{{ downloadable ? '已放行' : '硬拦截' }}</strong></span
      >
      <span class="status-divider">|</span>
      <span
        >打印: <strong>{{ printable ? '已放行' : '白屏抑制' }}</strong></span
      >
      <span class="status-divider">|</span>
      <span
        >复制: <strong>{{ copyable ? '允许' : '防选拦截' }}</strong></span
      >
      <span class="status-divider">|</span>
      <span>水印防篡改: <strong>MutationObserver 实时自愈监视中 (F12 删除即刻还原)</strong></span>
    </div>

    <div class="viewer-container">
      <AtengFileViewer
        url="/sample.pdf"
        file-name="上市公司海外并购尽职调查报告.pdf"
        file-type="pdf"
        :downloadable="downloadable"
        :printable="printable"
        :copyable="copyable"
        :context-menu="contextMenu"
        :watermark="watermarkConfig"
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

.dlp-group,
.watermark-group {
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

.dlp-checkbox {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  user-select: none;
  font-size: 13px;
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

.ctrl-btn {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid #cbd5e1;
  background-color: #ffffff;
  transition: all 0.15s ease;
}

.ctrl-btn--danger {
  background-color: #fef2f2;
  border-color: #fecaca;
  color: #dc2626;
  font-weight: 600;
}

.ctrl-btn--danger:hover {
  background-color: #fee2e2;
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
