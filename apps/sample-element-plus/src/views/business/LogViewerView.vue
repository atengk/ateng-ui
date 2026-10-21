<script setup lang="ts">
/**
 * AtengLogViewer 实时日志终端自验展厅。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { ref, onUnmounted } from 'vue';
import { ElCard, ElButton, ElSpace, ElMessage, ElDivider } from 'element-plus';
import { AtengLogViewer, type AtengLogViewerInstance } from '@atengk/element-plus';

const logViewerRef = ref<AtengLogViewerInstance>();

// 初始种子日志
const initialLogs = [
  '[2026-10-21 20:00:01.102] [INFO] [main] c.a.u.Application: Starting Service with PID 8904',
  '[2026-10-21 20:00:02.341] [INFO] [main] c.a.u.n.NettyWebServer: Netty started on port 8080 (http)',
  '[2026-10-21 20:00:03.011] [INFO] [main] c.a.u.r.RedisConnection: Connected to Redis cluster at 127.0.0.1:6379',
  '[2026-10-21 20:00:05.512] [INFO] [pool-1-thread-1] c.a.u.s.SyncTask: Initialized cron schedule job [EVERY_30S]',
  '[2026-10-21 20:00:10.892] [WARN] [http-nio-8080-exec-1] c.a.u.s.SecurityFilter: Slow token verification took 128ms',
  '[2026-10-21 20:00:12.441] [ERROR] [http-nio-8080-exec-2] c.a.u.c.OrderController: Database deadlock detected during order settlement: ID=900213012938102',
];

const logs = ref<string[]>([...initialLogs]);
const isGenerating = ref<boolean>(false);
let timer: ReturnType<typeof setInterval> | null = null;
let counter = 1;

// 模拟实时日志推送
const toggleLiveLogs = () => {
  if (isGenerating.value) {
    if (timer) clearInterval(timer);
    timer = null;
    isGenerating.value = false;
    ElMessage.info('已暂停模拟实时日志流');
  } else {
    isGenerating.value = true;
    ElMessage.success('已启动模拟实时日志流 (每 400ms 推送一条)');
    timer = setInterval(() => {
      const levels = ['INFO', 'INFO', 'WARN', 'ERROR', 'DEBUG'];
      const lvl = levels[Math.floor(Math.random() * levels.length)];
      const line = `[${new Date().toISOString()}] [${lvl}] [worker-${counter % 4}] ServiceTask-${counter}: Processed chunk #${counter} with payload size ${(Math.random() * 1024).toFixed(0)}B`;
      counter += 1;
      logViewerRef.value?.appendLog(line);
    }, 400);
  }
};

const handleClear = () => {
  ElMessage.info('终端已清屏');
};

const handleDownload = (allLines: string[]) => {
  ElMessage.success(`下载已触发，共计导出 ${allLines.length} 行`);
};

onUnmounted(() => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
});
</script>

<template>
  <div class="log-viewer-view">
    <ElCard shadow="never" class="demo-card">
      <template #header>
        <div class="card-header">
          <span class="title">AtengLogViewer 实时运维日志滚屏终端</span>
          <span class="subtitle">面向容器监控、CI/CD 构建与服务端调试的高性能轻量级终端组件</span>
        </div>
      </template>

      <div class="control-bar">
        <ElSpace wrap :size="16">
          <ElButton :type="isGenerating ? 'danger' : 'primary'" @click="toggleLiveLogs">
            {{ isGenerating ? '⏹ 停止模拟实时流' : '▶ 启动模拟实时日志流' }}
          </ElButton>
          <ElButton @click="logViewerRef?.clear()"> 清空终端 </ElButton>
          <ElButton @click="logViewerRef?.download('sample_export.log')"> 导出日志 </ElButton>
          <ElButton @click="logViewerRef?.scrollToBottom()"> 贴底滚动 </ElButton>
        </ElSpace>
      </div>

      <ElDivider />

      <div class="terminal-wrapper">
        <AtengLogViewer
          ref="logViewerRef"
          :logs="logs"
          :max-lines="1000"
          height="460px"
          title="Production Application Console (PID: 8904)"
          @clear="handleClear"
          @download="handleDownload"
        />
      </div>
    </ElCard>
  </div>
</template>

<style scoped lang="scss">
.log-viewer-view {
  padding: 20px;

  .demo-card {
    border-radius: 8px;
  }

  .card-header {
    display: flex;
    flex-direction: column;
    gap: 4px;

    .title {
      font-size: 18px;
      font-weight: 600;
      color: var(--el-text-color-primary);
    }

    .subtitle {
      font-size: 13px;
      color: var(--el-text-color-secondary);
    }
  }

  .control-bar {
    margin-bottom: 8px;
  }

  .terminal-wrapper {
    margin-top: 12px;
  }
}
</style>
