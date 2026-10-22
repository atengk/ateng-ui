<script setup lang="ts">
/**
 * 企业级结构化卡片面板 AtengCard 自验页面。
 *
 * @author Ateng
 * @since 2026-10-22
 */

import { ref } from 'vue';
import {
  ElButton,
  ElSwitch,
  ElTag,
  ElAlert,
  ElRadioGroup,
  ElRadioButton,
  ElMessage,
} from 'element-plus';
import { AtengCard } from '@atengk/element-plus';

const isCollapsed = ref(false);
const isFullscreen = ref(false);
const isLoading = ref(false);
const shadowType = ref<'never' | 'hover' | 'always'>('hover');
const showBorder = ref(true);

const handleRefresh = () => {
  isLoading.value = true;
  setTimeout(() => {
    isLoading.value = false;
    ElMessage.success('面板数据已刷新！');
  }, 1000);
};

const handleFullscreen = (val: boolean) => {
  ElMessage.info(val ? '已进入全屏模式，按 ESC 退出' : '已退出全屏模式');
};
</script>

<template>
  <div class="card-view">
    <ElAlert
      title="AtengCard 核心特性"
      type="info"
      description="结构化头部：支持标准化标题、副标题、图标、Tooltip 气泡与 Extra 操作区；交互增强：右上角标配一键平滑折叠与视口全屏最大化（支持键盘 ESC 退出）；支持局部 loading 加载遮罩与阴影/边框令牌配置。"
      show-icon
      :closable="false"
      style="margin-bottom: 20px"
    />

    <div class="ctrl-bar">
      <span>阴影策略：</span>
      <ElRadioGroup v-model="shadowType" size="small">
        <ElRadioButton value="never">从不 (never)</ElRadioButton>
        <ElRadioButton value="hover">悬浮 (hover)</ElRadioButton>
        <ElRadioButton value="always">始终 (always)</ElRadioButton>
      </ElRadioGroup>

      <span style="margin-left: 20px">边框 (bordered)：</span>
      <ElSwitch v-model="showBorder" />

      <span style="margin-left: 20px">加载遮罩 (loading)：</span>
      <ElSwitch v-model="isLoading" />
    </div>

    <div class="card-grid">
      <!-- 演示卡片 1：全功能全屏与折叠面板 -->
      <AtengCard
        v-model:collapsed="isCollapsed"
        v-model:fullscreen="isFullscreen"
        title="实时核心交易分析看板"
        sub-title="每 10 秒刷新一次"
        tooltip="该指标由大数据中台实时聚合，延时低于 500ms"
        collapsible
        fullscreenable
        :loading="isLoading"
        :shadow="shadowType"
        :bordered="showBorder"
        @fullscreen="handleFullscreen"
      >
        <template #extra>
          <ElTag type="success" size="small">运行正常</ElTag>
          <ElButton size="small" @click="handleRefresh">刷新</ElButton>
        </template>

        <div class="chart-mockup">
          <div class="stat-row">
            <div class="stat-card">
              <div class="stat-num">¥ 1,289,450.00</div>
              <div class="stat-lbl">今日成交总额 (GMV)</div>
            </div>
            <div class="stat-card">
              <div class="stat-num">3,428 笔</div>
              <div class="stat-lbl">支付订单数</div>
            </div>
            <div class="stat-card">
              <div class="stat-num">99.98%</div>
              <div class="stat-lbl">交易成功率</div>
            </div>
          </div>
          <div class="chart-placeholder">
            <span>📊 [此处模拟高频可视化图表，在全屏模式下可铺满整个视口进行深度排查]</span>
          </div>
        </div>

        <template #footer>
          <div class="card-footer-info">
            <span>最后更新时间：2026-10-22 10:30:00</span>
            <ElButton link type="primary">查看明细报表 →</ElButton>
          </div>
        </template>
      </AtengCard>

      <!-- 演示卡片 2：基础简易卡片 -->
      <AtengCard
        title="快速配置引导"
        sub-title="系统环境配置检查项"
        collapsible
        :bordered="showBorder"
        :shadow="shadowType"
      >
        <ul class="checklist">
          <li>✅ Redis 缓存连接已就绪 (延时 1.2ms)</li>
          <li>✅ PostgreSQL 主从同步正常 (Lag 0s)</li>
          <li>✅ S3 / MinIO 对象存储直传凭据有效</li>
          <li>✅ WebSocket 日志广播通道已建立</li>
        </ul>
      </AtengCard>
    </div>
  </div>
</template>

<style scoped>
.card-view {
  width: 100%;
}

.ctrl-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding: 12px 16px;
  background-color: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: var(--el-border-radius-base);
  font-size: 14px;
}

.card-grid {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.chart-mockup {
  padding: 8px 0;
}

.stat-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  padding: 16px;
  background-color: var(--el-fill-color-light);
  border-radius: var(--el-border-radius-base);
  text-align: center;
}

.stat-num {
  font-size: 20px;
  font-weight: 700;
  color: var(--el-color-primary);
  margin-bottom: 6px;
}

.stat-lbl {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.chart-placeholder {
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--el-bg-color-page);
  border: 1px dashed var(--el-border-color);
  border-radius: var(--el-border-radius-base);
  color: var(--el-text-color-placeholder);
}

.card-footer-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.checklist {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-size: 14px;
}
</style>
