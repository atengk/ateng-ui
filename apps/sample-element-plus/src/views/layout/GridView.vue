<script setup lang="ts">
/**
 * 企业级容器查询自适应流式网格 AtengGrid 自验页面。
 *
 * @author Ateng
 * @since 2026-10-23
 */

import { ref } from 'vue';
import {
  ElAlert,
  ElCard,
  ElSlider,
  ElRadioGroup,
  ElRadioButton,
  ElTag,
  ElButton,
} from 'element-plus';
import { AtengGrid, AtengSplitLayout } from '@atengk/element-plus';

// 1. 控制器配置状态
const minWidth = ref(240);
const gapSize = ref(16);
const isFixedCols = ref(false);
const fixedColsCount = ref(3);
const itemCount = ref(8);
const splitRatio = ref(320);

// 2. 模拟卡片数据集
const cardItems = [
  { id: 1, title: 'CPU 负载监控', value: '42.8%', tag: '核心计算', desc: '8核 Intel Xeon E5' },
  { id: 2, title: '物理内存占用', value: '18.4 GB', tag: '资源内存', desc: '总计 32.0 GB DDR4' },
  { id: 3, title: '网络出向带宽', value: '128 Mbps', tag: '流量通信', desc: '峰值限速 1000 Mbps' },
  { id: 4, title: '磁盘 IOPS 吞吐', value: '2,450', tag: '存储吞吐', desc: 'NVMe SSD 阵列卷' },
  { id: 5, title: '活跃数据库连接', value: '86 个', tag: '持久连接', desc: 'HikariCP 线程池稳定' },
  { id: 6, title: 'Redis 命中率', value: '99.4%', tag: '缓存命中', desc: 'QPS: 12,800 op/s' },
  { id: 7, title: '异步队列堆积', value: '0 条', tag: '消息队列', desc: 'Kafka Partition 0~3' },
  {
    id: 8,
    title: 'API 网关 2xx 比率',
    value: '99.98%',
    tag: '可用性指标',
    desc: '过去 24 小时 SLA',
  },
  { id: 9, title: '微服务节点总数', value: '24 实例', tag: 'K8s Pods', desc: '就绪探针 100% 存活' },
  { id: 10, title: '告警事件 (24h)', value: '3 次', tag: '异常监控', desc: '均已自动自愈恢复' },
  { id: 11, title: '文件存储容量', value: '1.82 TB', tag: 'MinIO 对象', desc: '剩余 8.18 TB 可用' },
  { id: 12, title: 'TLS 证书有效期', value: '182 天', tag: '安全认证', desc: '自动续期证书链' },
];

const resetDefaults = () => {
  minWidth.value = 240;
  gapSize.value = 16;
  isFixedCols.value = false;
  fixedColsCount.value = 3;
  itemCount.value = 8;
  splitRatio.value = 320;
};
</script>

<template>
  <div class="grid-view">
    <ElAlert
      title="AtengGrid 现代容器查询自适应流式网格"
      type="info"
      description="突破视口限制：彻底打破传统 @media 媒体查询只能按浏览器全屏宽度做断点的缺陷；基于纯 CSS Grid auto-fill + minmax 驱动，无论处于分栏拖拽、弹窗还是抽屉中，均能根据宿主自身实际物理宽度完美自适应换行，零 JS 监听计算损耗，零视口重排抖动。"
      show-icon
      :closable="false"
      style="margin-bottom: 20px"
    />

    <!-- 左侧控制器 + 右侧流式网格拖拽演示容器 -->
    <div class="split-wrapper">
      <AtengSplitLayout
        v-model="splitRatio"
        direction="horizontal"
        :min="260"
        :max="600"
        storage-key="ateng_grid_sample_split"
      >
        <!-- 左侧控制面板 -->
        <template #first>
          <div class="panel-left">
            <div class="panel-title">🎛️ 网格控制参数</div>

            <div class="ctrl-group">
              <span class="label">排版模式：</span>
              <ElRadioGroup v-model="isFixedCols" size="small">
                <ElRadioButton :value="false">流式自适应 (auto-fill)</ElRadioButton>
                <ElRadioButton :value="true">强制固定列 (cols)</ElRadioButton>
              </ElRadioGroup>
            </div>

            <div v-if="!isFixedCols" class="ctrl-group">
              <span class="label">最小单元宽度 (minItemWidth: {{ minWidth }}px)：</span>
              <ElSlider v-model="minWidth" :min="160" :max="420" :step="10" />
            </div>

            <div v-else class="ctrl-group">
              <span class="label">固定列数 (cols: {{ fixedColsCount }} 列)：</span>
              <ElSlider v-model="fixedColsCount" :min="1" :max="6" :step="1" />
            </div>

            <div class="ctrl-group">
              <span class="label">网格间距 (gap: {{ gapSize }}px)：</span>
              <ElSlider v-model="gapSize" :min="8" :max="40" :step="4" />
            </div>

            <div class="ctrl-group">
              <span class="label">展示卡片数量 ({{ itemCount }} 项)：</span>
              <ElSlider v-model="itemCount" :min="2" :max="12" :step="1" />
            </div>

            <div style="margin-top: 24px">
              <ElButton size="small" @click="resetDefaults">重置默认参数</ElButton>
            </div>

            <div class="tip-box">
              💡
              <b>拖拽分栏指引</b
              >：按住右侧垂直分割线左右拖动，观察右侧容器变宽或变窄时卡片列数如何丝滑、无跳跃地自适应重排！
            </div>
          </div>
        </template>

        <!-- 右侧 AtengGrid 自适应展示区 -->
        <template #second>
          <div class="panel-right">
            <div class="panel-header">
              <span style="font-weight: 600">📊 弹性云资源指标网格看板 (AtengGrid 容器)</span>
              <ElTag size="small" type="success">
                当前模式:
                {{ isFixedCols ? `固定 ${fixedColsCount} 列` : `自适应 (>= ${minWidth}px)` }}
              </ElTag>
            </div>

            <div class="grid-container-box">
              <AtengGrid
                :min-item-width="minWidth"
                :gap="gapSize"
                :cols="isFixedCols ? fixedColsCount : undefined"
              >
                <ElCard
                  v-for="item in cardItems.slice(0, itemCount)"
                  :key="item.id"
                  class="metric-card"
                  shadow="hover"
                >
                  <template #header>
                    <div class="metric-header">
                      <span class="metric-title">{{ item.title }}</span>
                      <ElTag size="small" effect="plain">{{ item.tag }}</ElTag>
                    </div>
                  </template>
                  <div class="metric-body">
                    <div class="metric-value">{{ item.value }}</div>
                    <div class="metric-desc">{{ item.desc }}</div>
                  </div>
                </ElCard>
              </AtengGrid>
            </div>
          </div>
        </template>
      </AtengSplitLayout>
    </div>
  </div>
</template>

<style scoped>
.grid-view {
  padding: 16px;
}

.split-wrapper {
  height: 680px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  overflow: hidden;
  background-color: var(--el-bg-color);
}

.panel-left {
  height: 100%;
  padding: 20px 16px;
  box-sizing: border-box;
  background-color: var(--el-bg-color-page);
  overflow-y: auto;
}

.panel-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 20px;
  color: var(--el-text-color-primary);
}

.ctrl-group {
  margin-bottom: 20px;
}

.label {
  display: block;
  font-size: 13px;
  color: var(--el-text-color-regular);
  margin-bottom: 8px;
}

.tip-box {
  margin-top: 24px;
  padding: 12px;
  border-radius: 6px;
  background-color: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  font-size: 12px;
  line-height: 1.6;
}

.panel-right {
  height: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  background-color: var(--el-bg-color);
}

.panel-header {
  padding: 14px 20px;
  border-bottom: 1px solid var(--el-border-color-light);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.grid-container-box {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  box-sizing: border-box;
}

.metric-card {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.metric-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.metric-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.metric-body {
  padding: 4px 0;
}

.metric-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--el-color-primary);
  margin-bottom: 6px;
}

.metric-desc {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
