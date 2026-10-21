<script setup lang="ts">
/**
 * 多源大文件切片上传器 AtengUpload 自验页面。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { ref } from 'vue';
import {
  ElCard,
  ElAlert,
  ElButton,
  ElDivider,
  ElMessage,
  ElTag,
  ElProgress,
  type UploadUserFile,
} from 'element-plus';
import {
  AtengUpload,
  type AtengUploadInstance,
  type UploadMergeParams,
} from '@atengk/element-plus';
import type { UploadChunkItem } from '@atengk/vue';

// 1. 基础图片直传文件列表与预览
const imageFileList = ref<UploadUserFile[]>([
  {
    name: 'logo-avatar.png',
    url: 'https://fuss10.elemecdn.com/e/5d/4a731a90594a4af544c0c25941171jpeg.jpeg',
  },
]);

// 2. 切片上传实例引用与模拟状态
const uploadRef = ref<AtengUploadInstance | null>(null);
const chunkLogs = ref<string[]>([]);
const isChunkCompleted = ref(false);

// 模拟单个切片上传（耗时 400ms 并支持 signal 取消）
const handleCustomUploadChunk = async (
  chunk: UploadChunkItem<unknown>,
  signal?: AbortSignal,
): Promise<{ chunkIndex: number; success: boolean }> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      chunkLogs.value.unshift(
        `[${new Date().toLocaleTimeString()}] 切片 #${chunk.index + 1} 上传成功 (${(chunk.size / 1024).toFixed(1)} KB)`,
      );
      resolve({ chunkIndex: chunk.index, success: true });
    }, 400);

    if (signal) {
      signal.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new Error(`切片 #${chunk.index + 1} 上传已取消`));
      });
    }
  });
};

// 模拟全部分片合并动作
const handleCustomMerge = async (params: UploadMergeParams): Promise<{ fileUrl: string }> => {
  chunkLogs.value.unshift(
    `[${new Date().toLocaleTimeString()}] 触发服务端合并请求：总分片数 ${params.totalChunks}，文件 ${(params.file.size / 1024 / 1024).toFixed(2)} MB ...`,
  );
  // 模拟合并延迟 800ms
  await new Promise(resolve => setTimeout(resolve, 800));
  isChunkCompleted.value = true;
  chunkLogs.value.unshift(`[${new Date().toLocaleTimeString()}] 服务端合并完成！`);
  return { fileUrl: 'https://cdn.atengk.com/storage/sample-merged-file.zip' };
};

// 模拟选择大文件并触发切片上传
const handleSimulateChunkFile = async () => {
  isChunkCompleted.value = false;
  chunkLogs.value = [];
  chunkLogs.value.unshift(
    `[${new Date().toLocaleTimeString()}] 构造 15MB 模拟大文件并启动分片上传状态机 ...`,
  );

  // 构造一个 15MB 的模拟 Blob 假文件
  const buffer = new Uint8Array(15 * 1024 * 1024);
  const fakeFile = new File([buffer], 'enterprise-large-asset.zip', {
    type: 'application/zip',
  });

  if (uploadRef.value) {
    try {
      await uploadRef.value.uploadChunkFile(fakeFile);
      ElMessage.success('15MB 模拟大文件切片上传与合并全部成功！');
    } catch (err) {
      chunkLogs.value.unshift(`[${new Date().toLocaleTimeString()}] 上传终止：${String(err)}`);
    }
  }
};

const handlePause = () => {
  uploadRef.value?.pause();
  chunkLogs.value.unshift(`[${new Date().toLocaleTimeString()}] 用户点击：暂停分片上传`);
  ElMessage.info('已暂停上传');
};

const handleResume = async () => {
  chunkLogs.value.unshift(`[${new Date().toLocaleTimeString()}] 用户点击：恢复分片上传`);
  try {
    await uploadRef.value?.resume();
    ElMessage.success('恢复上传成功并完成合并！');
  } catch (err) {
    chunkLogs.value.unshift(`[${new Date().toLocaleTimeString()}] 恢复异常：${String(err)}`);
  }
};

const handleCancel = () => {
  uploadRef.value?.cancel();
  chunkLogs.value.unshift(`[${new Date().toLocaleTimeString()}] 用户点击：取消分片上传`);
  ElMessage.warning('已取消上传');
};

const handleReset = () => {
  uploadRef.value?.reset();
  isChunkCompleted.value = false;
  chunkLogs.value = [];
  ElMessage.info('分片状态机已重置');
};
</script>

<template>
  <div class="upload-view">
    <ElCard header="多源大文件切片上传器 AtengUpload">
      <ElAlert
        title="组件核心能力"
        type="info"
        description="双模合一上传套件：原生直传模式下内置文件类型拦截（accept）与文件体积前置防御（maxSize）；内置图片缩略图大图弹窗预览；开启 chunk 模式时，自动深度绑定 @atengk/vue 的 useUpload 核心状态机，支持大文件自动分片、并发控制、切片重试、暂停、恢复、秒级取消及自定义合并闭环。"
        show-icon
        :closable="false"
        style="margin-bottom: 20px"
      />

      <!-- 1. 基础图片直传与大图弹窗预览 -->
      <div class="demo-section">
        <div class="section-title">1. 基础图片直传增强（缩略图、大图弹窗预览、格式与体积拦截）</div>
        <div class="upload-box">
          <AtengUpload
            v-model:file-list="imageFileList"
            list-type="picture-card"
            :show-preview="true"
            preview-title="用户营业执照预览"
            accept="image/png,image/jpeg"
            :max-size="5 * 1024 * 1024"
            action="/api/mock/upload"
            :auto-upload="false"
            @size-exceed="(file, max) => ElMessage.error(`文件超出 ${max / 1024 / 1024}MB 限制`)"
            @type-reject="file => ElMessage.error(`非法文件格式: ${file.name}`)"
          >
            <div class="upload-trigger">
              <span class="trigger-icon">+</span>
              <span class="trigger-text">选择图片</span>
            </div>
          </AtengUpload>
        </div>
        <span class="sub-hint"
          >提示：点击图片缩略图上的放大镜即可调起内置 AtengDialog 高清预览大图。</span
        >
      </div>

      <ElDivider />

      <!-- 2. 大文件切片分片上传状态机 -->
      <div class="demo-section">
        <div class="section-title">
          <span>2. 大文件分片切片上传状态机 (:chunk="true" + 并发与断点控制)</span>
          <div class="action-buttons">
            <ElButton type="primary" size="small" @click="handleSimulateChunkFile">
              启动 15MB 文件分片上传
            </ElButton>
            <ElButton
              type="warning"
              size="small"
              :disabled="!uploadRef?.uploading"
              @click="handlePause"
            >
              暂停上传
            </ElButton>
            <ElButton
              type="success"
              size="small"
              :disabled="uploadRef?.uploadStatus !== 'paused'"
              @click="handleResume"
            >
              继续恢复
            </ElButton>
            <ElButton
              type="danger"
              size="small"
              :disabled="!uploadRef?.uploading && uploadRef?.uploadStatus !== 'paused'"
              @click="handleCancel"
            >
              取消中断
            </ElButton>
            <ElButton size="small" @click="handleReset"> 重置状态机 </ElButton>
          </div>
        </div>

        <!-- 隐藏原生选择器的纯状态机演示组件 -->
        <AtengUpload
          ref="uploadRef"
          :chunk="true"
          :chunk-size="3 * 1024 * 1024"
          :concurrency="2"
          :custom-upload-chunk="handleCustomUploadChunk"
          :custom-merge="handleCustomMerge"
          :show-chunk-list="true"
        />

        <!-- 状态机实时状态仪表盘 -->
        <div class="dashboard-panel" style="margin-top: 16px">
          <div class="dashboard-header">
            <div class="state-indicator">
              <span class="label">当前切片状态：</span>
              <ElTag
                :type="
                  uploadRef?.uploadStatus === 'success'
                    ? 'success'
                    : uploadRef?.uploadStatus === 'uploading'
                      ? 'primary'
                      : uploadRef?.uploadStatus === 'paused'
                        ? 'warning'
                        : uploadRef?.uploadStatus === 'error'
                          ? 'danger'
                          : 'info'
                "
              >
                {{ uploadRef?.uploadStatus || 'idle' }}
              </ElTag>
            </div>
            <div class="progress-percent">进度：{{ uploadRef?.chunkProgress || 0 }}%</div>
          </div>

          <ElProgress
            :percentage="uploadRef?.chunkProgress || 0"
            :status="
              uploadRef?.uploadStatus === 'success'
                ? 'success'
                : uploadRef?.uploadStatus === 'error'
                  ? 'exception'
                  : undefined
            "
            :stroke-width="14"
            style="margin-top: 10px"
          />
        </div>

        <!-- 切片执行日志流水 -->
        <div v-if="chunkLogs.length > 0" class="log-box" style="margin-top: 16px">
          <div class="log-title">切片上传流水与网络事件日志：</div>
          <div v-for="(log, idx) in chunkLogs" :key="idx" class="log-line">
            {{ log }}
          </div>
        </div>
      </div>
    </ElCard>
  </div>
</template>

<style scoped>
.upload-view {
  max-width: 1100px;
}

.demo-section {
  padding: 8px 0;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.upload-trigger {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.trigger-icon {
  font-size: 24px;
  color: var(--el-text-color-secondary);
}

.trigger-text {
  font-size: 12px;
  color: var(--el-text-color-regular);
  margin-top: 4px;
}

.sub-hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 8px;
  display: inline-block;
}

.dashboard-panel {
  padding: 14px 18px;
  background-color: var(--el-fill-color-light);
  border-radius: 6px;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.state-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.label {
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.progress-percent {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.log-box {
  background-color: var(--el-fill-color-darker);
  font-family: monospace;
  font-size: 12px;
  padding: 12px 16px;
  border-radius: 4px;
}

.log-title {
  font-weight: 600;
  margin-bottom: 6px;
  color: var(--el-text-color-primary);
}

.log-line {
  color: var(--el-text-color-regular);
  line-height: 1.6;
}
</style>
