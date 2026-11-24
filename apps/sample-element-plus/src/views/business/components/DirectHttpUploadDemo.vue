<script setup lang="ts">
/**
 * AtengUpload 非分片直传自定义 httpRequest 执行器与属性分层透传演示组件。
 *
 * @author Ateng
 * @since 2026-11-23
 */

import { ref, onUnmounted } from 'vue';
import {
  ElButton,
  ElRadioGroup,
  ElRadioButton,
  ElTag,
  ElMessage,
  type UploadRequestOptions,
  type UploadFile,
  type UploadUserFile,
  type UploadRawFile,
  type UploadProgressEvent,
} from 'element-plus';
import { BusinessException } from '@atengk/core';
import { AtengUpload } from '@atengk/element-plus';

type UploadAjaxError = Parameters<UploadRequestOptions['onError']>[0];

type MockOutcome = 'success' | 'biz-error' | 'unauthorized';

const fileList = ref<UploadUserFile[]>([]);
const mockOutcome = ref<MockOutcome>('success');
const directLogs = ref<string[]>([]);
const activeTimers = new Set<ReturnType<typeof setTimeout>>();

function appendLog(message: string): void {
  directLogs.value.unshift(`[${new Date().toLocaleTimeString()}] ${message}`);
}

function scheduleDelay(ms: number): Promise<void> {
  return new Promise(resolve => {
    const timer = setTimeout(() => {
      activeTimers.delete(timer);
      resolve();
    }, ms);
    activeTimers.add(timer);
  });
}

onUnmounted(() => {
  for (const timer of activeTimers) {
    clearTimeout(timer);
  }
  activeTimers.clear();
});

/**
 * 模拟委托 @atengk/core http 客户端的统一直传执行器：
 * 自动携带鉴权上下文，并在 HTTP 200 下识别 Result.fail 业务错误信封。
 */
const handleDirectHttpRequest = async (options: UploadRequestOptions): Promise<unknown> => {
  const fileName = options.file.name || 'contract-attachment.pdf';
  appendLog(
    `发起自定义 httpRequest 直传：action=${options.action}, method=${options.method}, field=${options.filename}, file=${fileName}`,
  );

  try {
    options.onProgress({ percent: 35 } as UploadProgressEvent);
    await scheduleDelay(180);
    options.onProgress({ percent: 80 } as UploadProgressEvent);
    await scheduleDelay(180);

    if (mockOutcome.value === 'biz-error') {
      throw new BusinessException(
        5001,
        '归档存储空间不足，请清理过期附件后重试',
        'trace-upload-5001',
      );
    }

    if (mockOutcome.value === 'unauthorized') {
      throw new BusinessException(401, '登录凭据已失效，请重新登录后上传', 'trace-upload-401');
    }

    options.onProgress({ percent: 100 } as UploadProgressEvent);
    const result = {
      fileId: `doc-${Date.now()}`,
      url: `https://cdn.atengk.com/contracts/${encodeURIComponent(fileName)}`,
    };
    options.onSuccess(result);
    appendLog(`直传成功：fileId=${result.fileId}, url=${result.url}`);
    return result;
  } catch (err) {
    const normalizedError = err instanceof Error ? err : new Error(String(err));
    const ajaxError = Object.assign(normalizedError, {
      status: err instanceof BusinessException ? err.code : 500,
      method: options.method,
      url: options.action,
    }) as UploadAjaxError;
    options.onError(ajaxError);
    appendLog(`拦截直传异常：${normalizedError.message}`);
    throw normalizedError;
  }
};

const notifyUploadSuccess = (fileName: string): void => {
  ElMessage.success(`文件 "${fileName}" 自定义直传成功`);
};

const notifyUploadError = (fileName: string, message: string): void => {
  ElMessage.error(`文件 "${fileName}" 直传失败：${message}`);
};

const handleDirectSuccess = (_response: unknown, uploadFile: UploadFile): void => {
  notifyUploadSuccess(uploadFile.name);
};

const handleDirectError = (error: Error, uploadFile: UploadFile): void => {
  notifyUploadError(uploadFile.name, error.message);
};

const handleSimulateDirectUpload = async (): Promise<void> => {
  const sampleContent = new Blob(['%PDF-1.7 合同归档附件示例'], { type: 'application/pdf' });
  const rawFile = Object.assign(
    new File([sampleContent], `contract-${Date.now().toString().slice(-4)}.pdf`, {
      type: 'application/pdf',
    }),
    { uid: Date.now() },
  ) as UploadRawFile;

  try {
    await handleDirectHttpRequest({
      action: '/api/v1/contracts/upload',
      method: 'POST',
      data: { bizType: 'contract-archive' },
      filename: 'file',
      file: rawFile,
      headers: { Authorization: 'Bearer YOUR_API_TOKEN' },
      withCredentials: false,
      onProgress: evt => {
        appendLog(`上传进度回调：${evt.percent}%`);
      },
      onSuccess: res => {
        const uploaded = res as { fileId: string; url: string };
        fileList.value.push({
          name: rawFile.name,
          url: uploaded.url,
          status: 'success',
          uid: rawFile.uid,
        });
        notifyUploadSuccess(rawFile.name);
      },
      onError: err => {
        notifyUploadError(rawFile.name, err.message);
      },
    });
  } catch {
    // 异常已通过 onError 回调与执行日志处理
  }
};
</script>

<template>
  <div class="direct-http-demo">
    <div class="demo-header">
      <span class="demo-title">
        3. 非分片直传自定义 httpRequest（对接业务错误信封拦截与 inheritAttrs 隔离）
      </span>
      <div class="demo-controls">
        <ElRadioGroup v-model="mockOutcome" size="small">
          <ElRadioButton value="success">正常 Result.ok</ElRadioButton>
          <ElRadioButton value="biz-error">HTTP 200 业务异常</ElRadioButton>
          <ElRadioButton value="unauthorized">401 鉴权失效</ElRadioButton>
        </ElRadioGroup>
        <ElButton type="primary" size="small" @click="handleSimulateDirectUpload">
          一键模拟直传校验
        </ElButton>
      </div>
    </div>

    <div class="demo-card">
      <div class="demo-badges">
        <ElTag size="small" type="info">chunk: false</ElTag>
        <ElTag size="small" type="success">inheritAttrs: false</ElTag>
        <ElTag size="small">class/style 保留于 .at-upload 根容器</ElTag>
      </div>

      <AtengUpload
        v-model:file-list="fileList"
        class="direct-upload-root"
        style="max-width: 560px"
        data-testid="direct-http-uploader"
        action="/api/v1/contracts/upload"
        :chunk="false"
        :max-size="10 * 1024 * 1024"
        accept=".pdf,.doc,.docx,image/*"
        :http-request="handleDirectHttpRequest"
        @success="handleDirectSuccess"
        @error="handleDirectError"
      >
        <ElButton type="primary" plain>选取合同附件 (触发自定义 httpRequest)</ElButton>
        <template #tip>
          <div class="demo-hint">
            支持直接选取本地 PDF/Word/图片文件触发自定义直传，或点击右上角“一键模拟直传校验”测试
            Result 错误信封拦截。
          </div>
        </template>
      </AtengUpload>
    </div>

    <div v-if="directLogs.length > 0" class="direct-log-box">
      <div class="direct-log-title">自定义 httpRequest 直传执行日志：</div>
      <div v-for="(log, idx) in directLogs" :key="idx" class="direct-log-line">
        {{ log }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.direct-http-demo {
  padding: 8px 0;
}

.demo-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 14px;
}

.demo-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.demo-controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.demo-card {
  background-color: var(--el-fill-color-blank);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: var(--el-border-radius-base);
  padding: 16px;
}

.demo-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.demo-hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 8px;
  line-height: 1.5;
}

.direct-log-box {
  margin-top: 14px;
  background-color: var(--el-fill-color-darker);
  font-family: monospace;
  font-size: 12px;
  padding: 12px 16px;
  border-radius: var(--el-border-radius-base);
  max-height: 180px;
  overflow-y: auto;
}

.direct-log-title {
  font-weight: 600;
  margin-bottom: 6px;
  color: var(--el-text-color-primary);
}

.direct-log-line {
  color: var(--el-text-color-regular);
  line-height: 1.6;
}
</style>
