<script setup lang="ts">
/**
 * 故障注入与异常熔断模拟面板。
 *
 * @author Ateng
 * @since 2026-10-31
 */

import { ref } from 'vue';
import { ElButton, ElMessage, ElCard, ElTag } from 'element-plus';
import { setupSampleMonitor } from '../monitor';
import { captureVueError } from '@atengk/monitor';

const monitor = setupSampleMonitor();
const errorCount = ref(0);

// 1. 同步运行时异常
const triggerSyncError = () => {
  setTimeout(() => {
    throw new ReferenceError('测试同步运行时异常: userProfile is not defined');
  }, 0);
  ElMessage.warning('已触发同步异常抛出');
};

// 2. 异步 Promise 拒付异常
const triggerPromiseError = () => {
  Promise.reject(new Error('测试异步 Promise 未捕获异常: Network Timeout'));
  ElMessage.warning('已触发异步 Promise 拒付');
};

// 3. 静态资源 404 加载崩溃
const triggerResourceError = () => {
  const img = document.createElement('img');
  img.src = 'http://localhost:3010/assets/non-existent-banner-404.png';
  img.id = 'crash-resource-img';
  img.style.display = 'none';
  document.body.appendChild(img);
  ElMessage.warning('已插入 404 异常静态资源');
};

// 4. Vue 框架异常模拟
const triggerVueError = () => {
  captureVueError(
    monitor,
    new TypeError('Cannot read property of undefined (reading "userName")'),
    { $options: { name: 'UserProfileView' } },
    'render function',
  );
  ElMessage.warning('已模拟 Vue 组件运行时异常');
};

// 5. 高频连续异常触发熔断断路器
const triggerBatchErrors = () => {
  errorCount.value += 15;
  for (let i = 1; i <= 15; i++) {
    monitor.captureException(new Error(`高频风暴异常 #${i}`), {
      category: 'custom',
    });
  }
  ElMessage.error('已批量触发 15 次异常，断路器应进入熔断保护态');
};
</script>

<template>
  <el-card shadow="never" class="panel-card">
    <template #header>
      <div class="card-header">
        <span class="title">1. 故障注入与异常熔断控制台</span>
        <el-tag type="danger" effect="plain">Fault Injection & Circuit Breaker</el-tag>
      </div>
    </template>

    <div class="actions-grid">
      <el-button type="danger" plain @click="triggerSyncError"> 模拟 JS 同步运行时抛错 </el-button>
      <el-button type="warning" plain @click="triggerPromiseError">
        模拟 Promise 异步拒付异常
      </el-button>
      <el-button type="info" plain @click="triggerResourceError">
        模拟静态资源 404 加载崩溃
      </el-button>
      <el-button type="primary" plain @click="triggerVueError"> 模拟 Vue 组件渲染异常 </el-button>
      <el-button type="danger" @click="triggerBatchErrors">
        连续抛错 15 次 (触发熔断断路器)
      </el-button>
    </div>
  </el-card>
</template>

<style scoped>
.panel-card {
  margin-bottom: 20px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.title {
  font-weight: 600;
  font-size: 16px;
}
.actions-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
</style>
