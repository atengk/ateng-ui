<script setup lang="ts">
/**
 * 企业级多源大文件切片上传器与直传增强套件。
 *
 * 核心特性：
 * 1. 基础直传增强：文件大小/格式前置拦截、文件拖拽与图片缩略图大图弹窗预览；
 * 2. 深度绑定 @atengk/vue 的 useUpload 状态机，接管切片分块、并发控制、切片失败自动重试；
 * 3. 沉浸式进度呈现：渲染分片总体进度条、切片明细列表与暂停/继续/取消交互控制；
 * 4. 协议无关适配器：通过 customUploadChunk 与 customMerge 回调支持任意后端分片合并协议。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { shallowRef, ref, computed, onUnmounted } from 'vue';
import {
  ElUpload,
  ElProgress,
  ElButton,
  ElMessage,
  type UploadFile,
  type UploadFiles,
  type UploadUserFile,
  type UploadRawFile,
  type UploadProgressEvent,
  type UploadRequestOptions,
} from 'element-plus';
import { useUpload, type UploadStatus, type UploadChunkStatus } from '@atengk/vue';
import type { AtengUploadProps, AtengUploadEmits, AtengUploadExpose } from './types';
import AtengDialog from '../dialog/AtengDialog.vue';

defineOptions({
  name: 'AtengUpload',
});

const props = withDefaults(defineProps<AtengUploadProps>(), {
  chunk: false,
  chunkSize: 5 * 1024 * 1024,
  concurrency: 3,
  maxRetries: 3,
  retryDelay: 1000,
  customUploadChunk: undefined,
  customMerge: undefined,
  maxSize: undefined,
  accept: undefined,
  showPreview: true,
  previewTitle: '图片预览',
  showChunkList: true,
  action: '#',
  headers: () => ({}),
  method: 'POST',
  multiple: false,
  data: () => ({}),
  name: 'file',
  withCredentials: false,
  showFileList: true,
  drag: false,
  disabled: false,
  limit: undefined,
  listType: 'text',
  autoUpload: true,
  fileList: undefined,
  beforeUpload: undefined,
  beforeRemove: undefined,
});

const emit = defineEmits<AtengUploadEmits>();

const uploadRef = shallowRef<InstanceType<typeof ElUpload> | null>(null);
const currentFileName = ref('');

// 1. 响应式集成 useUpload 状态机
const {
  status: uploadStatus,
  uploading,
  progress: chunkProgress,
  loadedBytes,
  totalBytes,
  chunks: chunkList,
  error: _uploadError,
  upload: startChunkUpload,
  pause,
  resume,
  cancel: cancelChunkUpload,
  reset: resetChunkUpload,
} = useUpload({
  chunkSize: props.chunkSize,
  concurrency: props.concurrency,
  maxRetries: props.maxRetries,
  retryDelay: props.retryDelay,
  uploadChunk: async (chunk, signal) => {
    if (typeof props.customUploadChunk === 'function') {
      return await props.customUploadChunk(chunk, signal);
    }
    throw new Error('分片上传模式下必须提供 customUploadChunk 回调执行器');
  },
  onProgress: (progress, loaded, total) => {
    emit('chunk-progress', progress, loaded, total);
  },
  onChunkError: (_chunk, err) => {
    emit('chunk-error', err);
  },
  onSuccess: results => {
    emit('chunk-success', results);
  },
  onError: err => {
    emit('chunk-error', err);
  },
  onStatusChange: s => {
    emit('status-change', s);
  },
});

// 2. 格式化字节大小
function formatBytes(bytes: number): string {
  if (bytes <= 0 || isNaN(bytes)) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// 3. 文件格式匹配校验（支持逗号分隔后缀与通配符如 "image/*,.pdf"）
function matchesAccept(file: File, pattern: string): boolean {
  if (!pattern || !pattern.trim()) return true;

  const patterns = pattern
    .split(',')
    .map(p => p.trim().toLowerCase())
    .filter(Boolean);

  const fileName = (file.name || '').toLowerCase();
  const fileType = (file.type || '').toLowerCase();

  return patterns.some(rule => {
    if (rule.startsWith('.')) {
      return fileName.endsWith(rule);
    }
    if (rule.endsWith('/*')) {
      const prefix = rule.slice(0, -2);
      return fileType.startsWith(prefix);
    }
    return fileType === rule;
  });
}

// 4. 前置防卫拦截器
async function handleBeforeUpload(rawFile: UploadRawFile): Promise<boolean> {
  // A. 大小拦截校验
  if (typeof props.maxSize === 'number' && props.maxSize > 0 && rawFile.size > props.maxSize) {
    emit('size-exceed', rawFile, props.maxSize);
    ElMessage.error(`文件大小超出限制，最大允许 ${formatBytes(props.maxSize)}`);
    return false;
  }

  // B. 格式拦截校验
  if (props.accept && !matchesAccept(rawFile, props.accept)) {
    emit('type-reject', rawFile, props.accept);
    ElMessage.error(`文件格式不符合要求，仅支持 ${props.accept}`);
    return false;
  }

  // C. 透传外部自定义 beforeUpload 校验
  if (typeof props.beforeUpload === 'function') {
    const res = await props.beforeUpload(rawFile);
    if (res === false) return false;
  }

  return true;
}

// 5. 分片模式上传处理函数
async function uploadChunkFile(file: File | Blob): Promise<unknown> {
  currentFileName.value = (file as File).name || 'file';

  const results = await startChunkUpload(file);
  let finalResponse: unknown = results;

  if (typeof props.customMerge === 'function') {
    finalResponse = await props.customMerge({
      file,
      chunks: chunkList.value,
      totalChunks: chunkList.value.length,
    });
  }

  return finalResponse;
}

// 分片模式自定义上传协调器（接入 ElUpload 的 httpRequest）
async function handleCustomHttpRequest(options: UploadRequestOptions): Promise<unknown> {
  if (!props.chunk) {
    return;
  }

  const rawFile = options.file;

  try {
    const finalResponse = await uploadChunkFile(rawFile);
    options.onSuccess(finalResponse);
    return finalResponse;
  } catch (err) {
    options.onError(err as Error);
    throw err;
  }
}

// 6. 图片缩略图大图弹窗预览交互
const previewVisible = ref(false);
const previewImageUrl = ref('');
let createdBlobUrl = '';

function handlePreview(uploadFile: UploadFile): void {
  emit('preview', uploadFile);

  if (!props.showPreview) return;

  const isImage =
    uploadFile.raw?.type?.startsWith('image/') ||
    /\.(png|jpe?g|gif|webp|svg)$/i.test(uploadFile.name || '');

  if (isImage) {
    if (createdBlobUrl && typeof URL !== 'undefined' && URL.revokeObjectURL) {
      URL.revokeObjectURL(createdBlobUrl);
      createdBlobUrl = '';
    }

    if (uploadFile.url) {
      previewImageUrl.value = uploadFile.url;
    } else if (uploadFile.raw && typeof URL !== 'undefined' && URL.createObjectURL) {
      createdBlobUrl = URL.createObjectURL(uploadFile.raw);
      previewImageUrl.value = createdBlobUrl;
    }
    previewVisible.value = true;
  }
}

function handlePreviewClose(): void {
  previewVisible.value = false;
  if (createdBlobUrl && typeof URL !== 'undefined' && URL.revokeObjectURL) {
    URL.revokeObjectURL(createdBlobUrl);
    createdBlobUrl = '';
  }
}

onUnmounted(() => {
  if (createdBlobUrl && typeof URL !== 'undefined' && URL.revokeObjectURL) {
    URL.revokeObjectURL(createdBlobUrl);
    createdBlobUrl = '';
  }
});

// 7. 进度条状态文本转换
function getStatusText(status: UploadStatus): string {
  switch (status) {
    case 'uploading':
      return '上传中';
    case 'paused':
      return '已暂停';
    case 'success':
      return '上传成功';
    case 'error':
      return '上传失败';
    case 'canceled':
      return '已取消';
    default:
      return '就绪';
  }
}

function getChunkStatusText(status: UploadChunkStatus): string {
  switch (status) {
    case 'pending':
      return '等待中';
    case 'uploading':
      return '上传中';
    case 'success':
      return '已完成';
    case 'error':
      return '失败';
    case 'paused':
      return '暂停';
  }
}

const progressStatus = computed(() => {
  if (uploadStatus.value === 'success') return 'success';
  if (uploadStatus.value === 'error') return 'exception';
  if (uploadStatus.value === 'paused') return 'warning';
  return undefined;
});

// 8. 代理 ElUpload 原生事件
function handleChange(file: UploadFile, fileList: UploadFiles): void {
  emit('change', file, fileList);
}

function handleRemove(file: UploadFile, fileList: UploadFiles): void {
  emit('remove', file, fileList);
}

function handleSuccess(response: unknown, file: UploadFile, fileList: UploadFiles): void {
  emit('success', response, file, fileList);
}

function handleError(error: Error, file: UploadFile, fileList: UploadFiles): void {
  emit('error', error, file, fileList);
}

function handleProgress(evt: UploadProgressEvent, file: UploadFile, fileList: UploadFiles): void {
  emit('progress', evt, file, fileList);
}

function handleExceed(files: File[], fileList: UploadUserFile[]): void {
  emit('exceed', files, fileList);
}

function handleUpdateFileList(fileList: UploadUserFile[]): void {
  emit('update:fileList', fileList);
}

// 9. 控制门面方法
function clearFiles(): void {
  uploadRef.value?.clearFiles();
}

function submit(): void {
  uploadRef.value?.submit();
}

defineExpose<AtengUploadExpose>({
  uploadRef,
  uploadStatus,
  chunkProgress,
  uploading,
  chunks: chunkList,
  uploadChunkFile,
  pause,
  resume,
  cancel: cancelChunkUpload,
  reset: resetChunkUpload,
  clearFiles,
  submit,
});
</script>

<template>
  <div class="at-upload" :class="{ 'is-chunk': chunk }">
    <el-upload
      ref="uploadRef"
      class="at-upload__uploader"
      :action="action"
      :headers="headers"
      :method="method"
      :multiple="multiple"
      :data="data"
      :name="name"
      :with-credentials="withCredentials"
      :show-file-list="showFileList"
      :drag="drag"
      :accept="accept"
      :disabled="disabled"
      :limit="limit"
      :list-type="listType"
      :auto-upload="autoUpload"
      :file-list="fileList"
      :before-upload="handleBeforeUpload"
      :before-remove="beforeRemove"
      :http-request="chunk ? handleCustomHttpRequest : undefined"
      v-bind="$attrs"
      @update:file-list="handleUpdateFileList"
      @change="handleChange"
      @preview="handlePreview"
      @remove="handleRemove"
      @success="handleSuccess"
      @error="handleError"
      @progress="handleProgress"
      @exceed="handleExceed"
    >
      <template v-if="$slots.default" #default>
        <slot />
      </template>
      <template v-if="$slots.trigger" #trigger>
        <slot name="trigger" />
      </template>
      <template v-if="$slots.tip" #tip>
        <slot name="tip" />
      </template>
      <template v-if="$slots.file" #file="slotProps">
        <slot name="file" v-bind="slotProps" />
      </template>
    </el-upload>

    <!-- 分片模式进度沉浸面板 -->
    <div v-if="chunk && uploadStatus !== 'idle'" class="at-upload__chunk-panel">
      <div class="at-upload__chunk-header">
        <span class="at-upload__chunk-filename" :title="currentFileName">
          {{ currentFileName }}
        </span>
        <span class="at-upload__chunk-status-tag" :class="`is-${uploadStatus}`">
          {{ getStatusText(uploadStatus) }}
        </span>
      </div>

      <el-progress
        :percentage="chunkProgress"
        :status="progressStatus"
        :stroke-width="12"
        striped
        :striped-flow="uploadStatus === 'uploading'"
        class="at-upload__chunk-progress"
      />

      <div class="at-upload__chunk-footer">
        <span class="at-upload__chunk-meta">
          {{ formatBytes(loadedBytes) }} / {{ formatBytes(totalBytes) }}
        </span>

        <div class="at-upload__chunk-actions">
          <el-button
            v-if="uploadStatus === 'uploading'"
            size="small"
            type="warning"
            plain
            @click="pause"
          >
            暂停
          </el-button>
          <el-button
            v-if="uploadStatus === 'paused'"
            size="small"
            type="primary"
            plain
            @click="resume"
          >
            继续
          </el-button>
          <el-button
            v-if="uploadStatus === 'uploading' || uploadStatus === 'paused'"
            size="small"
            type="danger"
            plain
            @click="cancelChunkUpload"
          >
            取消
          </el-button>
          <el-button
            v-if="uploadStatus === 'error'"
            size="small"
            type="primary"
            plain
            @click="resume"
          >
            重试
          </el-button>
        </div>
      </div>

      <!-- 分片进度明细 -->
      <div v-if="showChunkList && chunkList.length > 0" class="at-upload__chunk-list">
        <div
          v-for="item in chunkList"
          :key="item.index"
          class="at-upload__chunk-item"
          :class="`is-${item.status}`"
        >
          <span class="at-upload__chunk-item-title">分片 #{{ item.index + 1 }}</span>
          <el-progress
            :percentage="item.progress"
            :status="
              item.status === 'success'
                ? 'success'
                : item.status === 'error'
                  ? 'exception'
                  : undefined
            "
            :stroke-width="6"
            class="at-upload__chunk-item-progress"
          />
          <span class="at-upload__chunk-item-status">{{ getChunkStatusText(item.status) }}</span>
        </div>
      </div>
    </div>

    <!-- 图片大图缩略图预览弹窗 -->
    <ateng-dialog
      v-model="previewVisible"
      :title="previewTitle"
      width="600px"
      :show-confirm="false"
      cancel-text="关闭"
      :append-to-body="false"
      @close="handlePreviewClose"
    >
      <div class="at-upload__preview-body">
        <img :src="previewImageUrl" class="at-upload__preview-img" alt="预览图" />
      </div>
    </ateng-dialog>
  </div>
</template>

<style scoped lang="scss">
.at-upload {
  width: 100%;

  &__chunk-panel {
    margin-top: 16px;
    padding: 16px;
    background-color: var(--el-fill-color-light, #f5f7fa);
    border: 1px solid var(--el-border-color-lighter, #ebeef5);
    border-radius: var(--el-border-radius-base, 4px);
  }

  &__chunk-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  &__chunk-filename {
    font-size: 14px;
    font-weight: 500;
    color: var(--el-text-color-primary, #303133);
    max-width: 70%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__chunk-status-tag {
    font-size: 12px;
    padding: 2px 8px;
    border-radius: 2px;
    background-color: var(--el-fill-color, #e4e7ed);
    color: var(--el-text-color-secondary, #909399);

    &.is-uploading {
      background-color: var(--el-color-primary-light-9, #ecf5ff);
      color: var(--el-color-primary, #409eff);
    }

    &.is-success {
      background-color: var(--el-color-success-light-9, #f0f9eb);
      color: var(--el-color-success, #67c23a);
    }

    &.is-paused {
      background-color: var(--el-color-warning-light-9, #fdf6ec);
      color: var(--el-color-warning, #e6a23c);
    }

    &.is-error {
      background-color: var(--el-color-danger-light-9, #fef0f0);
      color: var(--el-color-danger, #f56c6c);
    }
  }

  &__chunk-progress {
    margin-bottom: 8px;
  }

  &__chunk-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__chunk-meta {
    font-size: 12px;
    color: var(--el-text-color-secondary, #909399);
  }

  &__chunk-actions {
    display: flex;
    gap: 8px;
  }

  &__chunk-list {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px dashed var(--el-border-color-lighter, #ebeef5);
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 180px;
    overflow-y: auto;
  }

  &__chunk-item {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 12px;

    &-title {
      width: 60px;
      color: var(--el-text-color-regular, #606266);
    }

    &-progress {
      flex: 1;
      margin-bottom: 0;
    }

    &-status {
      width: 45px;
      text-align: right;
      color: var(--el-text-color-secondary, #909399);
    }
  }

  &__preview-body {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px;
  }

  &__preview-img {
    max-width: 100%;
    max-height: 500px;
    object-fit: contain;
    border-radius: var(--el-border-radius-base, 4px);
  }
}
</style>
