<script setup lang="ts">
/**
 * sample-vue 大文件分片切片与受控并发上传自验卡片组件。
 *
 * 演示 useUpload 在大文件切片划分、受控并发上传（concurrency: 3）、进度统计、
 * 单切片局部指数退避重试、在途暂停与恢复（断点续传）、以及取消重置交互。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { computed, ref } from 'vue';
import { useUpload, type UploadChunkItem } from '@atengk/vue';

// 1. 模拟交互状态与日志
const logs = ref<string[]>([]);
const simulateError = ref<boolean>(false);
const simulatedLatency = ref<number>(250);
const selectedFileName = ref<string>('');
const selectedFile = ref<File | Blob | null>(null);

const addLog = (msg: string): void => {
  logs.value.unshift(`[${new Date().toLocaleTimeString()}] ${msg}`);
  if (logs.value.length > 25) {
    logs.value.pop();
  }
};

// 2. 格式化工具
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

// 3. 实例化 useUpload 状态机
const uploadCoordinator = useUpload<{ chunkId: number; size: number }>({
  chunkSize: 2 * 1024 * 1024, // 2MB 单片，便于快速演示多切片效果
  concurrency: 3, // 最大 3 并发
  maxRetries: 2, // 允许局部重试 2 次
  retryDelay: 300, // 重试基础退避 300ms
  uploadChunk: async (chunk: UploadChunkItem<{ chunkId: number; size: number }>, signal) => {
    // 模拟网络延迟
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, simulatedLatency.value);
      signal?.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new Error('切片上传请求已被中止'));
      });
    });

    // 模拟第 1 片首次上传网络抖动抛错（测试局部自动重试机制）
    if (simulateError.value && chunk.index === 1 && chunk.retryCount === 0) {
      addLog(
        `[模拟故障] 切片 #${chunk.index} 模拟发生 504 Gateway Timeout，触发指数退避局部重试...`,
      );
      throw new Error('504 Gateway Timeout (模拟网络抖动)');
    }

    return { chunkId: chunk.index, size: chunk.size };
  },
  onProgress: (percent, loaded, total) => {
    addLog(`[上传进度] ${percent}% (${formatBytes(loaded)} / ${formatBytes(total)})`);
  },
  onChunkSuccess: chunk => {
    addLog(`[切片完成] 切片 #${chunk.index} 上传成功 (${formatBytes(chunk.size)})`);
  },
  onChunkError: (chunk, err) => {
    addLog(
      `[切片重试] 切片 #${chunk.index} 捕获异常: ${String(err)}，重试第 ${chunk.retryCount} 次`,
    );
  },
  onSuccess: results => {
    addLog(`[上传完毕] 全部分片 (${results.length} 片) 上传成功！`);
  },
  onError: err => {
    addLog(`[上传终止] 遇到严重错误: ${String(err)}`);
  },
  onStatusChange: nextStatus => {
    addLog(`[状态流转] status -> ${nextStatus}`);
  },
});

// 4. 用户交互动作
const handleFileChange = (e: Event): void => {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    const file = target.files[0];
    selectedFile.value = file;
    selectedFileName.value = `${file.name} (${formatBytes(file.size)})`;
    uploadCoordinator.reset();
    addLog(`[选取文件] 已选择本地文件: ${selectedFileName.value}`);
  }
};

const handleCreateMockFile = (): void => {
  const mockSize = 12 * 1024 * 1024; // 12MB 虚拟文件
  const buffer = new Uint8Array(mockSize);
  const blob = new Blob([buffer], { type: 'application/octet-stream' });
  selectedFile.value = blob;
  selectedFileName.value = `模拟 12MB 测试大文件 (${formatBytes(mockSize)})`;
  uploadCoordinator.reset();
  addLog(`[创建虚拟文件] 已就绪 12MB 虚拟数据（将切分为 6 片，每片 2MB）`);
};

const handleStartUpload = async (): Promise<void> => {
  if (!selectedFile.value) {
    addLog('[提示] 请先选择本地文件或创建虚拟大文件');
    return;
  }
  try {
    addLog('[启动上传] 正在初始化切片队列与并发调度器...');
    await uploadCoordinator.upload(selectedFile.value);
  } catch {
    // 异常已由 onError 监听与状态机接管
  }
};

const handlePause = (): void => {
  uploadCoordinator.pause();
  addLog('[主动操作] 用户点击暂停上传');
};

const handleResume = async (): Promise<void> => {
  addLog('[主动操作] 用户点击恢复上传，正在扫描断点续传...');
  try {
    await uploadCoordinator.resume();
  } catch {
    // 异常已由 onError 监听
  }
};

const handleCancel = (): void => {
  uploadCoordinator.cancel();
  addLog('[主动操作] 用户点击取消上传');
};

const handleReset = (): void => {
  uploadCoordinator.reset();
  selectedFile.value = null;
  selectedFileName.value = '';
  addLog('[主动操作] 状态机已完全重置为闲置状态');
};

const isUploadDisabled = computed(() => {
  return !selectedFile.value || uploadCoordinator.uploading.value;
});
</script>

<template>
  <section class="card">
    <h2>9. 大文件分片切片与受控并发上传自验 (useUpload)</h2>
    <p class="desc">
      响应式桥接 UploadCoordinator，支持纯原生切片计算、受控并发排队（默认
      3）、切片级状态与加权进度统计、暂停/恢复断点续传、局部退避重试与生命周期防泄漏。
    </p>

    <!-- 状态指示条 -->
    <div class="meta-bar">
      <div class="meta-item">
        <span>上传状态机:</span>
        <span :class="['status-tag', `status-${uploadCoordinator.status.value}`]">
          {{ uploadCoordinator.status.value }}
        </span>
      </div>
      <div class="meta-item">
        <span>上传中 (uploading):</span>
        <strong>{{ uploadCoordinator.uploading.value ? '是 (true)' : '否 (false)' }}</strong>
      </div>
      <div class="meta-item">
        <span>总切片数:</span>
        <strong>{{ uploadCoordinator.chunks.value.length }} 片</strong>
      </div>
      <div class="meta-item">
        <span>数据传输:</span>
        <strong>
          {{ formatBytes(uploadCoordinator.loadedBytes.value) }} /
          {{ formatBytes(uploadCoordinator.totalBytes.value) }}
        </strong>
      </div>
    </div>

    <!-- 总体进度条 -->
    <div class="progress-section">
      <div class="progress-header">
        <span>总体上传进度</span>
        <span>{{ uploadCoordinator.progress.value }}%</span>
      </div>
      <div class="progress-bar-container">
        <div
          class="progress-bar-fill"
          :style="{ width: `${uploadCoordinator.progress.value}%` }"
        ></div>
      </div>
    </div>

    <!-- 参数与模拟配置栏 -->
    <div class="config-row">
      <div class="config-item">
        <label>
          <input v-model="simulateError" type="checkbox" />
          模拟切片 #1 首次网络抖动 (测试局部自动重试)
        </label>
      </div>
      <div class="config-item">
        <label>单片耗时:</label>
        <select v-model.number="simulatedLatency">
          <option :value="100">100ms (极速)</option>
          <option :value="250">250ms (适中)</option>
          <option :value="600">600ms (慢速)</option>
        </select>
      </div>
    </div>

    <!-- 控制面板 -->
    <div class="control-panel">
      <div class="file-input-wrapper">
        <input
          type="file"
          class="file-input"
          :disabled="uploadCoordinator.uploading.value"
          @change="handleFileChange"
        />
      </div>

      <div class="actions-row">
        <button
          class="btn btn-secondary"
          :disabled="uploadCoordinator.uploading.value"
          @click="handleCreateMockFile"
        >
          创建 12MB 虚拟大文件
        </button>

        <button class="btn" :disabled="isUploadDisabled" @click="handleStartUpload">
          {{ uploadCoordinator.uploading.value ? '上传中...' : '开始上传 (upload)' }}
        </button>

        <button
          class="btn btn-warning"
          :disabled="!uploadCoordinator.uploading.value"
          @click="handlePause"
        >
          暂停上传 (pause)
        </button>

        <button
          class="btn"
          :disabled="uploadCoordinator.status.value !== 'paused'"
          @click="handleResume"
        >
          断点恢复 (resume)
        </button>

        <button
          class="btn btn-danger"
          :disabled="
            uploadCoordinator.status.value === 'idle' ||
            uploadCoordinator.status.value === 'success'
          "
          @click="handleCancel"
        >
          取消 (cancel)
        </button>

        <button class="btn btn-secondary" @click="handleReset">重置 (reset)</button>
      </div>
    </div>

    <!-- 切片状态网格 -->
    <div v-if="uploadCoordinator.chunks.value.length > 0" class="chunks-section">
      <div class="chunks-section-title">
        分片队列可视化 (共 {{ uploadCoordinator.chunks.value.length }} 个分片，受控并发 3):
      </div>
      <div class="chunks-grid">
        <div
          v-for="chunk in uploadCoordinator.chunks.value"
          :key="chunk.index"
          :class="['chunk-card', `chunk-card-${chunk.status}`]"
        >
          <div class="chunk-header">
            <span>分片 #{{ chunk.index }}</span>
            <span class="chunk-size">{{ formatBytes(chunk.size) }}</span>
          </div>
          <span :class="['chunk-badge', `status-${chunk.status}`]">
            {{ chunk.status }}
          </span>
          <span v-if="chunk.retryCount > 0" class="chunk-retry-badge">
            已重试 {{ chunk.retryCount }} 次
          </span>
        </div>
      </div>
    </div>

    <!-- 实时交互日志 -->
    <div class="log-box">
      <div v-if="logs.length === 0" class="log-item">
        [就绪] 暂无操作日志，请选择文件或点击“创建 12MB 虚拟大文件”体验分片上传...
      </div>
      <div v-for="(log, idx) in logs" :key="idx" class="log-item">
        {{ log }}
      </div>
    </div>
  </section>
</template>

<style scoped src="./upload-demo.css"></style>
