<script setup lang="ts">
/**
 * 白屏感知与容器白名单演练面板。
 *
 * @author Ateng
 * @since 2026-10-31
 */

import { ref } from 'vue';
import { ElButton, ElMessage, ElCard, ElTag } from 'element-plus';
import { setupSampleMonitor } from '../monitor';
import { sampleViewport, type WhiteScreenPayload } from '@atengk/monitor';

const monitor = setupSampleMonitor();
const containerStatus = ref<'normal' | 'blank' | 'skeleton' | 'loading'>('normal');
const lastResult = ref<string>('尚未采样');

// 统一受管采样逻辑
const executeSample = () => {
  return sampleViewport(
    ['html', 'body', '#white-screen-sandbox', '#app'],
    ['.skeleton-box', '.at-skeleton', '.el-loading-mask', '.loading-mask'],
  );
};

// 1. 模拟白屏 (清空视窗)
const simulateWhiteScreen = () => {
  containerStatus.value = 'blank';
  ElMessage.warning('容器已清空，模拟白屏崩溃中...');

  setTimeout(() => {
    const res = executeSample();
    lastResult.value = res.isSuspected ? '检测到白屏异常！' : '视窗正常';
    if (res.isSuspected) {
      monitor.emit<WhiteScreenPayload>({
        type: 'white_screen',
        level: 'fatal',
        payload: {
          name: 'WHITE_SCREEN_ERROR',
          isWhiteScreen: true,
          samplePoints: res.points,
          hitSelectors: res.hitSelectors,
          viewport: res.viewport,
          duration: 15,
        },
      });
    }
  }, 100);
};

// 2. 模拟骨架屏白名单免报
const simulateSkeleton = () => {
  containerStatus.value = 'skeleton';
  ElMessage.info('展示骨架屏中 (命中骨架屏白名单)...');

  setTimeout(() => {
    const res = executeSample();
    lastResult.value = res.isSuspected ? '检测到白屏异常！' : '骨架屏白名单生效，未触发白屏';
  }, 100);
};

// 3. 模拟 Loading 遮罩白名单免报
const simulateLoading = () => {
  containerStatus.value = 'loading';
  ElMessage.info('展示 Loading 遮罩中 (命中 Loading 遮罩白名单)...');

  setTimeout(() => {
    const res = executeSample();
    lastResult.value = res.isSuspected ? '检测到白屏异常！' : 'Loading 遮罩白名单生效，未触发白屏';
  }, 100);
};

// 4. 自愈恢复
const restoreNormal = () => {
  containerStatus.value = 'normal';
  lastResult.value = '正常展示中';
  ElMessage.success('视窗已恢复正常内容');
};
</script>

<template>
  <el-card shadow="never" class="panel-card">
    <template #header>
      <div class="card-header">
        <span class="title">2. 白屏感知与容器白名单自愈视窗</span>
        <el-tag type="warning" effect="plain">White Screen Detection</el-tag>
      </div>
    </template>

    <div class="actions-grid">
      <el-button type="danger" plain @click="simulateWhiteScreen">
        模拟清空视窗 (触发白屏崩溃告警)
      </el-button>
      <el-button type="info" plain @click="simulateSkeleton">
        切换骨架屏 (验证白名单免报机制)
      </el-button>
      <el-button type="primary" plain @click="simulateLoading">
        切换 Loading 遮罩 (验证遮罩白名单)
      </el-button>
      <el-button type="success" plain @click="restoreNormal"> 自愈恢复正常内容 </el-button>
      <el-tag :type="lastResult.includes('白屏异常') ? 'danger' : 'success'" class="result-tag">
        采样判定: {{ lastResult }}
      </el-tag>
    </div>

    <div id="white-screen-sandbox" class="sandbox-view">
      <div v-if="containerStatus === 'normal'" class="content-box">
        <h4>企业级业务数据看板</h4>
        <p>订单总数: 12,840 笔 | 今日活跃用户: 3,450 人 | 系统健康度: 99.98%</p>
      </div>

      <div v-else-if="containerStatus === 'skeleton'" class="skeleton-box">
        <div class="skeleton-line" />
        <div class="skeleton-line short" />
      </div>

      <div v-else-if="containerStatus === 'loading'" class="el-loading-mask loading-box">
        <div class="loading-content">
          <span>🌀 正在请求核心业务数据... (Loading 遮罩白名单保护中)</span>
        </div>
      </div>

      <div v-else class="blank-box">
        <!-- 裸空白节点，模拟页面崩溃或未渲染 -->
      </div>
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
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}
.sandbox-view {
  min-height: 120px;
  border: 1px dashed var(--el-border-color);
  border-radius: 6px;
  padding: 16px;
  background: var(--el-fill-color-light);
}
.content-box h4 {
  margin: 0 0 8px 0;
  color: var(--el-text-color-primary);
}
.content-box p {
  margin: 0;
  color: var(--el-text-color-secondary);
}
.skeleton-line {
  height: 20px;
  background: linear-gradient(90deg, #e0e0e0 25%, #f5f5f5 50%, #e0e0e0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
  border-radius: 4px;
  margin-bottom: 10px;
}
.skeleton-line.short {
  width: 60%;
}
@keyframes loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
