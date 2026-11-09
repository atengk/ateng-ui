<script setup lang="ts">
/**
 * 基础栅格与双向 JSON 绑定看板 (Dashboard 1)。
 *
 * 验证核心栅格渲染、拖拽缩放位移、数据双向同步与增删项能力。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { ref } from 'vue';
import { AtengGridLayout, AtengGridItem } from '@atengk/grid-layout-vue';
import type { GridLayoutItem } from '@atengk/grid-layout-vue';

interface CardPayload {
  title: string;
  tag: string;
  type: string;
}

const initialCards: GridLayoutItem<CardPayload>[] = [
  {
    id: 'stat-sales',
    x: 0,
    y: 0,
    w: 4,
    h: 2,
    data: { title: '总销售额', tag: 'KPI', type: 'primary' },
  },
  {
    id: 'stat-users',
    x: 4,
    y: 0,
    w: 4,
    h: 2,
    data: { title: '活跃用户数', tag: '实时', type: 'success' },
  },
  {
    id: 'stat-orders',
    x: 8,
    y: 0,
    w: 4,
    h: 2,
    data: { title: '待发货订单', tag: '待办', type: 'warning' },
  },
  {
    id: 'chart-trend',
    x: 0,
    y: 2,
    w: 8,
    h: 3,
    data: { title: '核心转化趋势', tag: '分析', type: 'info' },
  },
  {
    id: 'notice-card',
    x: 8,
    y: 2,
    w: 4,
    h: 3,
    locked: true,
    data: { title: '系统锁定公告', tag: '锁定', type: 'danger' },
  },
];

const layout = ref<GridLayoutItem<CardPayload>[]>(JSON.parse(JSON.stringify(initialCards)));
const editable = ref(true);
const showGridLines = ref(true);
const column = ref(12);

const handleAddCard = () => {
  const newId = `custom-${Date.now().toString().slice(-4)}`;
  layout.value.push({
    id: newId,
    w: 4,
    h: 2,
    autoPosition: true,
    data: {
      title: `自定义卡片 #${newId}`,
      tag: '动态',
      type: 'primary',
    },
  });
};

const handleRemoveCard = (id: string | number) => {
  const index = layout.value.findIndex(item => item.id === id);
  if (index !== -1) {
    layout.value.splice(index, 1);
  }
};

const handleReset = () => {
  layout.value = JSON.parse(JSON.stringify(initialCards));
};
</script>

<template>
  <div class="basic-dashboard">
    <div class="basic-dashboard__toolbar">
      <el-space wrap>
        <el-button type="primary" @click="handleAddCard">新增卡片 (自动寻空)</el-button>
        <el-button @click="handleReset">重置默认布局</el-button>
        <el-divider direction="vertical" />
        <el-switch v-model="editable" active-text="编辑态" inactive-text="只读态" />
        <el-switch v-model="showGridLines" active-text="显示参考线" inactive-text="隐藏参考线" />
        <el-divider direction="vertical" />
        <span class="toolbar-label">列数：</span>
        <el-radio-group v-model="column" size="small">
          <el-radio-button :value="12">12 列</el-radio-button>
          <el-radio-button :value="6">6 列</el-radio-button>
        </el-radio-group>
      </el-space>
    </div>

    <div class="basic-dashboard__content">
      <!-- 左侧网格工作区 -->
      <div class="basic-dashboard__canvas">
        <AtengGridLayout
          v-model:layout="layout"
          :column="column"
          :editable="editable"
          :show-grid-lines="showGridLines"
          cell-height="80px"
        >
          <AtengGridItem v-for="item in layout" :key="item.id" :item="item">
            <template #default="{ item: current }">
              <el-card class="dashboard-card" shadow="hover">
                <template #header>
                  <div class="card-header at-grid-item__header">
                    <span class="card-title">{{ current.data?.title }}</span>
                    <el-space>
                      <el-tag size="small" :type="current.data?.type || 'info'">{{
                        current.data?.tag
                      }}</el-tag>
                      <el-button
                        v-if="!current.locked && editable"
                        link
                        type="danger"
                        size="small"
                        @click.stop="handleRemoveCard(current.id)"
                      >
                        删除
                      </el-button>
                    </el-space>
                  </div>
                </template>
                <div class="card-body">
                  <p class="card-meta">
                    坐标: <code>(x: {{ current.x }}, y: {{ current.y }})</code>
                  </p>
                  <p class="card-meta">
                    尺寸: <code>{{ current.w }} × {{ current.h }}</code>
                  </p>
                  <p v-if="current.locked" class="card-locked-tip">🔒 静态锁控项 (禁止拖动/缩放)</p>
                </div>
              </el-card>
            </template>
          </AtengGridItem>
        </AtengGridLayout>
      </div>

      <!-- 右侧实时 JSON 双向数据视窗 -->
      <div class="basic-dashboard__sidebar">
        <el-card class="json-card" shadow="never">
          <template #header>
            <div class="json-header">
              <span>双向 JSON 实时数据流 ({{ layout.length }} 项)</span>
            </div>
          </template>
          <pre class="json-viewer">{{ JSON.stringify(layout, null, 2) }}</pre>
        </el-card>
      </div>
    </div>
  </div>
</template>

<style scoped>
.basic-dashboard {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: calc(100vh - 120px);
}

.basic-dashboard__toolbar {
  padding: 12px 16px;
  background-color: var(--el-bg-color);
  border-radius: 8px;
  border: 1px solid var(--el-border-color-light);
}

.toolbar-label {
  font-size: 14px;
  color: var(--el-text-color-regular);
}

.basic-dashboard__content {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 16px;
  align-items: start;
}

.basic-dashboard__canvas {
  background-color: var(--el-bg-color);
  border-radius: 8px;
  border: 1px solid var(--el-border-color-light);
  min-height: 600px;
  padding: 8px;
}

.dashboard-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

:deep(.dashboard-card .el-card__body) {
  flex: 1;
  overflow: auto;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-title {
  font-weight: 600;
  font-size: 14px;
}

.card-body {
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.card-meta {
  margin: 4px 0;
}

.card-locked-tip {
  color: var(--el-color-danger);
  font-size: 12px;
  margin-top: 8px;
}

.basic-dashboard__sidebar {
  position: sticky;
  top: 16px;
}

.json-card {
  height: 650px;
  display: flex;
  flex-direction: column;
}

:deep(.json-card .el-card__body) {
  flex: 1;
  overflow: auto;
  padding: 8px 12px;
}

.json-viewer {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-primary);
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
