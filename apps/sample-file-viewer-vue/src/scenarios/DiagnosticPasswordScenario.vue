<script setup lang="ts">
/**
 * 结构化异常分类诊断与加密文档原地密码解密场景看板。
 *
 * 验证 6 大异常分类（ADR-0004 403 双态拦截、老旧二进制格式建议、超时、损坏）
 * 以及受保护加密 PDF 原地密码输入状态机与一键解密重试。
 *
 * @author Ateng
 * @since 2026-11-05
 */

import { ref } from 'vue';
import {
  AtengFileViewer,
  useFileViewer,
  type FileViewerDiagnostic,
  type AtengFileViewerInstance,
} from '@atengk/file-viewer-vue';

const viewerRef = ref<AtengFileViewerInstance | null>(null);
const currentUrl = ref<string>('/sample.docx');
const currentName = ref<string>('企业采购框架协议.docx');
const currentType = ref<string>('docx');
const selectedFile = ref<File | undefined>(undefined);
const lastDiagnostic = ref<FileViewerDiagnostic | null>(null);
const currentPasswordProp = ref<string>('');
const lastEventMsg = ref<string>('就绪 (健康状态)');

const { isPasswordRequired, submitPassword } = useFileViewer({
  viewerRef: () => viewerRef.value,
  fileName: () => currentName.value,
  fileType: () => currentType.value,
  password: () => currentPasswordProp.value,
});

function simulateBlobError(): void {
  const errorJson = JSON.stringify({
    code: 403,
    msg: '您无权查看该机密财务审计报告',
    traceId: 'tr-sec-403-' + Date.now().toString(36),
  });
  const errorBlob = new Blob([errorJson], { type: 'application/json' });
  selectedFile.value = errorBlob as File;
  currentUrl.value = '';
  currentName.value = '集团绝密财务审计表.xlsx';
  currentType.value = 'xlsx';
  lastEventMsg.value = '已载入模拟 403 JSON 错误流，触发 ADR-0004 双态异常拦截！';
}

function simulateEncryptedDoc(): void {
  selectedFile.value = undefined;
  currentUrl.value = 'https://example.com/protected.pdf';
  currentName.value = '企业高管薪酬机密汇总(受保护).pdf';
  currentType.value = 'pdf';
  lastEventMsg.value = '已模拟加密文档，正在激活原地密码解密状态机';
}

function simulateLegacyDoc(): void {
  selectedFile.value = undefined;
  currentUrl.value = 'https://example.com/legacy_contract.doc';
  currentName.value = '1998年历史外贸协议档案.doc';
  currentType.value = 'doc';
  lastEventMsg.value = '已载入早期二进制格式 (.doc)，已触发结构化升级建议！';
}

function simulateCorruptDoc(): void {
  const badBlob = new Blob(['INVALID_BINARY_BYTES_HEADER'], { type: 'application/pdf' });
  selectedFile.value = badBlob as File;
  currentUrl.value = '';
  currentName.value = '已损坏的技术草案.pdf';
  currentType.value = 'pdf';
  lastEventMsg.value = '已载入伪造损坏文件，触发格式损坏诊断分类！';
}

function resetNormal(): void {
  selectedFile.value = undefined;
  currentUrl.value = '/sample.docx';
  currentName.value = '企业采购框架协议.docx';
  currentType.value = 'docx';
  lastDiagnostic.value = null;
  lastEventMsg.value = '已恢复正常健康文档';
}

function handleDiagnostic(diag: FileViewerDiagnostic): void {
  lastDiagnostic.value = diag;
  lastEventMsg.value = `[${diag.category}] ${diag.title}: ${diag.message}`;
}

function handlePasswordSubmit(pwd: string): void {
  lastEventMsg.value = `密码提交: 已尝试使用密码 "${pwd}" 原地解密`;
}
</script>

<template>
  <div class="scenario-panel">
    <div class="scenario-toolbar">
      <div class="sim-buttons">
        <span class="toolbar-label">模拟异常注入:</span>
        <button type="button" class="ctrl-btn ctrl-btn--danger" @click="simulateBlobError">
          🛡️ 403 权限受阻 (ADR-0004)
        </button>
        <button type="button" class="ctrl-btn ctrl-btn--amber" @click="simulateEncryptedDoc">
          🔒 加密 PDF (原地解密)
        </button>
        <button type="button" class="ctrl-btn ctrl-btn--info" @click="simulateLegacyDoc">
          📜 老旧 .doc 二进制 (升级建议)
        </button>
        <button type="button" class="ctrl-btn ctrl-btn--purple" @click="simulateCorruptDoc">
          💥 损坏二进制 (格式损坏)
        </button>
        <button type="button" class="ctrl-btn" @click="resetNormal">🔄 恢复健康状态</button>
      </div>

      <div v-if="isPasswordRequired" class="password-action">
        <button type="button" class="ctrl-btn ctrl-btn--primary" @click="submitPassword('123456')">
          🔑 一键代填密码 "123456" 原地解密
        </button>
      </div>
    </div>

    <!-- 诊断结果展示条 -->
    <div class="diagnostic-card" :class="{ 'diagnostic-card--active': !!lastDiagnostic }">
      <div class="diag-header">
        <span class="diag-category-badge">{{
          lastDiagnostic ? lastDiagnostic.category.toUpperCase() : 'HEALTHY'
        }}</span>
        <strong class="diag-title">{{
          lastDiagnostic ? lastDiagnostic.title : '系统与网络运行正常，未检测到任何格式或传输异常'
        }}</strong>
      </div>
      <p class="diag-desc">
        {{
          lastDiagnostic
            ? lastDiagnostic.message
            : '所有预设与渲染器处于健康就绪状态，点击上方模拟按钮可注入特定故障。'
        }}
      </p>
      <div v-if="lastDiagnostic?.suggestion" class="diag-suggestion">
        💡 建议指引: {{ lastDiagnostic.suggestion }}
      </div>
    </div>

    <div class="viewer-container">
      <AtengFileViewer
        ref="viewerRef"
        :url="currentUrl"
        :file="selectedFile"
        :file-name="currentName"
        :file-type="currentType"
        :password="currentPasswordProp"
        height="100%"
        @diagnostic="handleDiagnostic"
        @password-submit="handlePasswordSubmit"
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

.sim-buttons,
.password-action {
  display: flex;
  align-items: center;
  gap: 8px;
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

.ctrl-btn--danger {
  background-color: #fef2f2;
  border-color: #fecaca;
  color: #dc2626;
}

.ctrl-btn--amber {
  background-color: #fffbeb;
  border-color: #fde68a;
  color: #b45309;
}

.ctrl-btn--info {
  background-color: #f0f9ff;
  border-color: #bae6fd;
  color: #0369a1;
}

.ctrl-btn--purple {
  background-color: #faf5ff;
  border-color: #e9d5ff;
  color: #7e22ce;
}

.ctrl-btn--primary {
  background-color: #eff6ff;
  border-color: #bfdbfe;
  color: #1d4ed8;
  font-weight: 600;
}

.diagnostic-card {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 13px;
}

.diagnostic-card--active {
  background-color: #fff1f2;
  border-color: #fecdd3;
}

.diag-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.diag-category-badge {
  background-color: #e2e8f0;
  color: #475569;
  font-size: 11px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 4px;
}

.diagnostic-card--active .diag-category-badge {
  background-color: #e11d48;
  color: #ffffff;
}

.diag-title {
  color: #0f172a;
  font-size: 13px;
}

.diag-desc {
  color: #64748b;
  margin: 0 0 4px 0;
  font-size: 12px;
}

.diag-suggestion {
  color: #b45309;
  font-weight: 500;
  font-size: 12px;
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
