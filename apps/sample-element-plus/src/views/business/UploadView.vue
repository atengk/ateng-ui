<script setup lang="ts">
/**
 * 多源大文件切片上传器与多媒体文件在线预览套件 AtengUpload 自验页面。
 *
 * 核心验证维度：
 * 1. 深度组装 AtengFilePreview 灯箱：支持图片、PDF、音视频、代码文本在线预览及未知格式降级下载；
 * 2. beforePreview 业务前置守卫：显式拦截机密文件或异步阻断；
 * 3. 上传中（uploading）过渡态预览防误触保护；
 * 4. 确定性内存回收：本地 Blob 临时 ObjectURL 句柄随弹窗关闭或移除确定性销毁；
 * 5. 大文件分片切片模式（:chunk="true"）与断点续传/暂停/取消控制。
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
  ElSwitch,
  type UploadUserFile,
  type UploadFile,
} from 'element-plus';
import {
  AtengUpload,
  type AtengUploadInstance,
  type UploadMergeParams,
} from '@atengk/element-plus';
import type { UploadChunkItem } from '@atengk/vue';

// 1. 多格式文件列表（涵盖图片、PDF、音视频、代码与未知格式）
const multiFormatFileList = ref<UploadUserFile[]>([
  {
    name: 'logo-avatar.png',
    url: 'https://fuss10.elemecdn.com/e/5d/4a731a90594a4af544c0c25941171jpeg.jpeg',
  },
  {
    name: 'enterprise-agreement.pdf',
    url: 'https://cdn.atengk.com/storage/sample-agreement.pdf',
  },
  {
    name: 'system-overview.mp4',
    url: 'https://cdn.atengk.com/storage/sample-video.mp4',
  },
  {
    name: 'welcome-podcast.mp3',
    url: 'https://cdn.atengk.com/storage/sample-audio.mp3',
  },
  {
    name: 'gateway-config.json',
    url: 'https://cdn.atengk.com/storage/sample-config.json',
  },
  {
    name: 'secret-audit-report.pdf',
    url: 'https://cdn.atengk.com/storage/secret-audit.pdf',
  },
  {
    name: 'database-backup.dump',
    url: 'https://cdn.atengk.com/storage/db-backup.dump',
  },
]);

// 2. beforePreview 守卫配置开关与日志
const enableSecretGuard = ref(true);
const previewLogs = ref<string[]>([]);

const handleBeforePreview = (file: UploadFile): boolean => {
  previewLogs.value.unshift(
    `[${new Date().toLocaleTimeString()}] 触发 beforePreview 钩子校验：${file.name}`,
  );
  if (enableSecretGuard.value && file.name.includes('secret')) {
    ElMessage.error(`【前置守卫拦截】文件 "${file.name}" 属于绝密档案，禁止在当前终端调阅预览！`);
    previewLogs.value.unshift(
      `[${new Date().toLocaleTimeString()}] 拦截成功：阻止预览 "${file.name}"`,
    );
    return false;
  }
  previewLogs.value.unshift(
    `[${new Date().toLocaleTimeString()}] 放行预览：呼出 AtengFilePreview 灯箱`,
  );
  return true;
};

const handlePreviewClose = () => {
  previewLogs.value.unshift(
    `[${new Date().toLocaleTimeString()}] 预览灯箱已关闭，执行 ObjectURL 确定性回收`,
  );
};

// 添加模拟刚选取的本地 Blob 文件（测试确定性内存释放）
const handleAddLocalBlobFile = () => {
  const fakeBlob = new Blob(['console.log("local blob test");'], { type: 'text/javascript' });
  const rawFile = new File([fakeBlob], `local-script-${Date.now().toString().slice(-4)}.js`, {
    type: 'text/javascript',
  });
  multiFormatFileList.value.push({
    name: rawFile.name,
    raw: rawFile as unknown as File,
    status: 'ready',
    uid: Date.now(),
  });
  ElMessage.success(
    `已添加本地待上传文件 "${rawFile.name}"，点击列表项即可调起本地 ObjectURL 预览并在关闭后自动释放`,
  );
};

// 3. 切片上传实例引用与模拟状态
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
    <ElCard header="多源大文件切片上传与多媒体预览套件 AtengUpload">
      <ElAlert
        title="次核心基石套件深度集成"
        type="info"
        description="AtengUpload 深度组装 AtengFilePreview 全屏灯箱，点击已上传或待上传列表中的图片、PDF、音视频、代码文本或未知格式，即可自动根据 MIME 或扩展名推导展示，未知格式优雅降级为本地下载；支持 beforePreview 显式前置拦截；针对本地 Blob 临时 ObjectURL 句柄提供 100% 确定性内存回收；集成 useUpload 状态机支持超大文件分片、并发与断点续传。"
        show-icon
        :closable="false"
        style="margin-bottom: 20px"
      />

      <!-- 1. 多格式多媒体预览与前置守卫 -->
      <div class="demo-section">
        <div class="section-title">
          <span>1. 多格式文件在线预览灯箱与 beforePreview 守卫演示</span>
          <div class="action-buttons">
            <span class="guard-label">机密拦截守卫 (含 'secret')：</span>
            <ElSwitch
              v-model="enableSecretGuard"
              inline-prompt
              active-text="开"
              inactive-text="关"
            />
            <ElButton size="small" type="primary" plain @click="handleAddLocalBlobFile">
              + 添加本地待上传文件 (测试 ObjectURL 回收)
            </ElButton>
          </div>
        </div>

        <div class="upload-box">
          <AtengUpload
            v-model:file-list="multiFormatFileList"
            list-type="text"
            :show-preview="true"
            preview-title="AtengFilePreview 深度集成预览"
            :max-size="10 * 1024 * 1024"
            action="/api/mock/upload"
            :auto-upload="false"
            :before-preview="handleBeforePreview"
            @preview-close="handlePreviewClose"
            @size-exceed="(file, max) => ElMessage.error(`文件超出 ${max / 1024 / 1024}MB 限制`)"
            @type-reject="file => ElMessage.error(`非法文件格式: ${file.name}`)"
          >
            <ElButton type="primary">选择文件上传</ElButton>
            <template #tip>
              <div class="sub-hint">
                💡 提示：点击列表中的各项文件可呼出 AtengFilePreview
                全屏灯箱（支持图片/PDF/视频/音频/代码/未知降级），点击 "secret-audit-report.pdf"
                可体验前置拦截。
              </div>
            </template>
          </AtengUpload>
        </div>

        <!-- 预览日志流水 -->
        <div v-if="previewLogs.length > 0" class="log-box" style="margin-top: 14px">
          <div class="log-title">预览交互与前置拦截日志：</div>
          <div v-for="(log, idx) in previewLogs" :key="idx" class="log-line">
            {{ log }}
          </div>
        </div>
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
  flex-wrap: wrap;
  gap: 12px;
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
}

.guard-label {
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.upload-box {
  background-color: var(--el-fill-color-blank);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  padding: 16px;
}

.sub-hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 8px;
  line-height: 1.5;
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
  max-height: 180px;
  overflow-y: auto;
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
