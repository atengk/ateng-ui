<script setup lang="ts">
/**
 * 外部物料库拖拽、自动寻空与手柄防误触隔离展厅看板 (Dashboard 4)。
 *
 * 验证外部物料组件 <AtengGridPaletteItem> 与指令 v-grid-drag-in 拖入网格自动落点，
 * 验证 autoPosition 自动寻空算法补齐坐标，
 * 验证拖拽手柄安全防线（卡片内容文本选中、表单输入与按钮点击完全隔离不误拖）。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { ref } from 'vue';
import {
  AtengGridLayout,
  AtengGridItem,
  AtengGridPaletteItem,
  vGridDragIn,
} from '@atengk/grid-layout-vue';
import type { GridLayoutItem } from '@atengk/grid-layout-vue';
import { ElMessage } from 'element-plus';

interface WidgetPayload {
  title: string;
  category: string;
  color: string;
  icon: string;
  description: string;
}

// 预置网格内已有卡片
const initialLayout: GridLayoutItem<WidgetPayload>[] = [
  {
    id: 'active-users',
    x: 0,
    y: 0,
    w: 6,
    h: 3,
    data: {
      title: '👥 在线活跃用户分析',
      category: '业务分析',
      color: 'primary',
      icon: 'User',
      description: '内容区域包含可交互输入框与按钮，实测手柄隔离防误触。',
    },
  },
  {
    id: 'api-gateway',
    x: 6,
    y: 0,
    w: 6,
    h: 3,
    data: {
      title: '🌐 API 网关吞吐热点',
      category: '网关监控',
      color: 'success',
      icon: 'Connection',
      description: '从左侧物料拖入新图元时，网格将智能吸附并计算避让。',
    },
  },
];

const layout = ref<GridLayoutItem<WidgetPayload>[]>(JSON.parse(JSON.stringify(initialLayout)));

const showGridLines = ref(true);
const editable = ref(true);
const draggableEntireItem = ref(false);
const dropLogs = ref<Array<{ time: string; id: string | number; pos: string; title: string }>>([]);

// 预定义物料库物料
const paletteItems: Array<{
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  data: WidgetPayload;
}> = [
  {
    w: 3,
    h: 2,
    minW: 2,
    minH: 2,
    data: {
      title: '📊 实时成交金额',
      category: '财务数据',
      color: 'danger',
      icon: 'Money',
      description: '3x2 小规格指标卡',
    },
  },
  {
    w: 4,
    h: 2,
    minW: 3,
    minH: 2,
    data: {
      title: '🚨 系统异常告警',
      category: '告警中心',
      color: 'warning',
      icon: 'Warning',
      description: '4x2 标准通知图元',
    },
  },
  {
    w: 6,
    h: 3,
    minW: 4,
    minH: 2,
    data: {
      title: '📈 转化漏斗分析',
      category: '转化模型',
      color: 'primary',
      icon: 'TrendCharts',
      description: '6x3 宽幅图表容器',
    },
  },
];

// 指令拖拽物料
const directiveItem = {
  w: 4,
  h: 3,
  minW: 3,
  minH: 2,
  data: {
    title: '🖥️ 集群 CPU 负载仪表',
    category: '基础设施',
    color: 'info',
    icon: 'Cpu',
    description: '通过 v-grid-drag-in 指令直接赋能原生 DOM 元素拖入',
  },
};

const onDropItem = (item: GridLayoutItem<WidgetPayload>) => {
  const time = new Date().toLocaleTimeString();
  dropLogs.value.unshift({
    time,
    id: item.id,
    pos: `(${item.x}, ${item.y}) 跨度: ${item.w}×${item.h}`,
    title: item.data?.title ?? '未知图元',
  });
  ElMessage.success(`物料成功拖入网格：${item.data?.title ?? item.id}`);
};

const handleAddAutoPosition = () => {
  const newIndex = layout.value.length + 1;
  const newItem: GridLayoutItem<WidgetPayload> = {
    id: `auto-card-${Date.now()}`,
    w: 4,
    h: 2,
    autoPosition: true,
    data: {
      title: `⚡ 自动寻空卡片 #${newIndex}`,
      category: '自动编排',
      color: 'success',
      icon: 'MagicStick',
      description: '未指定 x, y 坐标，系统自动扫描首个无重叠空位补齐。',
    },
  };
  layout.value.push(newItem);
  ElMessage.info('触发 autoPosition 自动寻空插入新卡片');
};

const removeCard = (id: string | number) => {
  const index = layout.value.findIndex(item => String(item.id) === String(id));
  if (index !== -1) {
    layout.value.splice(index, 1);
  }
};

const resetLayout = () => {
  layout.value = JSON.parse(JSON.stringify(initialLayout));
  dropLogs.value = [];
};
</script>

<template>
  <div class="palette-dashboard">
    <!-- 顶部状态栏 -->
    <div class="dashboard-header">
      <div class="header-left">
        <h2 class="dashboard-title">看板 4：外部物料库拖拽入网格与自动寻空切片</h2>
        <p class="dashboard-desc">
          验证 <code>&lt;AtengGridPaletteItem&gt;</code> 与
          <code>v-grid-drag-in</code> 外部图元平滑拖入网格自动落点； 验证
          <code>autoPosition</code> 自动扫描首个空槽补位；
          验证拖拽手柄安全防线：卡片内容区域表单输入、按钮点击与文本选取完全不受误拖扰动。
        </p>
      </div>
      <div class="header-metrics">
        <el-tag type="info" size="large">画布卡片: {{ layout.length }} 项</el-tag>
        <el-tag :type="draggableEntireItem ? 'warning' : 'success'" size="large">
          手柄模式: {{ draggableEntireItem ? '整卡片任意拖拽' : '手柄隔离防误触 (推荐)' }}
        </el-tag>
      </div>
    </div>

    <!-- 顶部快捷操作坞 -->
    <el-card class="control-card" shadow="never">
      <div class="control-row">
        <div class="control-group">
          <span class="control-label">手柄防误触隔离:</span>
          <el-switch
            v-model="draggableEntireItem"
            active-text="整卡片拖拽"
            inactive-text="仅手柄拖拽"
          />
        </div>

        <div class="control-group">
          <span class="control-label">网格辅助参考线:</span>
          <el-switch v-model="showGridLines" />
        </div>

        <div class="control-group">
          <span class="control-label">编辑态:</span>
          <el-switch v-model="editable" />
        </div>

        <div class="control-group action-buttons">
          <el-button type="primary" size="small" @click="handleAddAutoPosition">
            ➕ 编程式自动寻空插入 (autoPosition)
          </el-button>
          <el-button size="small" @click="resetLayout"> 🔄 重置初始画布 </el-button>
        </div>
      </div>
    </el-card>

    <!-- 主展示区：左侧物料库 + 右侧网格工作台 -->
    <div class="workspace-container">
      <!-- 左侧物料库抽屉面板 -->
      <aside class="palette-sidebar">
        <div class="sidebar-header">
          <span class="sidebar-title">📦 物料元库 (Palette)</span>
          <el-tag size="small" type="primary">按住拖入画布</el-tag>
        </div>

        <div class="palette-section">
          <div class="section-title">组件封装物料 (&lt;AtengGridPaletteItem&gt;)</div>
          <div class="palette-list">
            <AtengGridPaletteItem
              v-for="(pItem, idx) in paletteItems"
              :key="idx"
              :item="pItem"
              class="palette-card-wrapper"
            >
              <div class="palette-item-box" :class="`palette-item-box--${pItem.data.color}`">
                <div class="palette-item-top">
                  <span class="palette-item-name">{{ pItem.data.title }}</span>
                  <el-tag size="small" effect="plain">{{ pItem.w }}×{{ pItem.h }}</el-tag>
                </div>
                <div class="palette-item-sub">{{ pItem.data.description }}</div>
              </div>
            </AtengGridPaletteItem>
          </div>
        </div>

        <div class="palette-section">
          <div class="section-title">声明式指令物料 (v-grid-drag-in)</div>
          <div v-grid-drag-in="directiveItem" class="directive-item-box">
            <div class="palette-item-top">
              <span class="palette-item-name">{{ directiveItem.data.title }}</span>
              <el-tag size="small" type="info">{{ directiveItem.w }}×{{ directiveItem.h }}</el-tag>
            </div>
            <div class="palette-item-sub">{{ directiveItem.data.description }}</div>
          </div>
        </div>

        <div class="sidebar-footer">
          <div class="drag-hint">
            💡 提示：按住物料卡片向右拖入虚线网格区域，释放鼠标即可完成无损落点！
          </div>
        </div>
      </aside>

      <!-- 右侧网格工作台 -->
      <section class="grid-canvas">
        <AtengGridLayout
          v-model:layout="layout"
          :cell-height="'80px'"
          :show-grid-lines="showGridLines"
          :editable="editable"
          :draggable-entire-item="draggableEntireItem"
          @drop-item="onDropItem"
        >
          <AtengGridItem v-for="item in layout" :key="item.id" :item="item">
            <div class="canvas-card">
              <!-- 手柄区域 -->
              <div class="canvas-card-header at-grid-drag-handle">
                <div class="header-info">
                  <span class="drag-icon">⋮⋮</span>
                  <span class="card-title">{{ item.data?.title }}</span>
                </div>
                <div class="header-actions">
                  <el-tag size="small" :type="item.data?.color ?? 'info'">
                    {{ item.w }}×{{ item.h }}
                  </el-tag>
                  <el-button size="small" type="danger" link @click.stop="removeCard(item.id)">
                    ✕
                  </el-button>
                </div>
              </div>

              <!-- 卡片内容区域 (测试手柄防误触隔离) -->
              <div class="canvas-card-body">
                <p class="card-desc">{{ item.data?.description }}</p>

                <!-- 防误触防线验证测试控件 -->
                <div class="interactive-sandbox">
                  <div class="sandbox-label">🛡️ 手柄隔离交互测试区 (点击/输入不触发卡片拖拽)：</div>
                  <div class="sandbox-controls">
                    <el-input
                      placeholder="尝试在此处键入文本或划词选中..."
                      size="small"
                      style="flex: 1"
                      @click.stop
                    />
                    <el-button
                      size="small"
                      type="primary"
                      plain
                      @click.stop="ElMessage.info('卡片内按钮点击成功，未触发卡片拖拽！')"
                    >
                      测试点击
                    </el-button>
                  </div>
                </div>

                <div class="canvas-card-footer">
                  <span>当前坐标: ({{ item.x }}, {{ item.y }})</span>
                  <span>类别: {{ item.data?.category }}</span>
                </div>
              </div>
            </div>
          </AtengGridItem>
        </AtengGridLayout>
      </section>
    </div>

    <!-- 底部落点审计日志与 JSON 监视器 -->
    <div class="bottom-panels">
      <el-card class="log-card" shadow="never">
        <template #header>
          <div class="panel-header">
            <span>📥 物料拖入落点审计日志 (Drop Audit)</span>
            <el-tag size="small" type="success">{{ dropLogs.length }} 次拖入</el-tag>
          </div>
        </template>
        <div v-if="dropLogs.length === 0" class="empty-logs">
          暂无拖入记录，尝试从左侧物料库拖入卡片！
        </div>
        <div v-else class="logs-list">
          <div v-for="(log, idx) in dropLogs" :key="idx" class="log-row">
            <span class="log-time">{{ log.time }}</span>
            <span class="log-title">{{ log.title }}</span>
            <el-tag size="small">{{ log.pos }}</el-tag>
            <span class="log-id">ID: {{ log.id }}</span>
          </div>
        </div>
      </el-card>

      <el-card class="json-card" shadow="never">
        <template #header>
          <div class="panel-header">
            <span>📋 实时布局数据流 (JSON Inspector)</span>
          </div>
        </template>
        <pre class="json-pre"><code>{{ JSON.stringify(layout, null, 2) }}</code></pre>
      </el-card>
    </div>
  </div>
</template>

<style scoped>
.palette-dashboard {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 0;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 16px;
}

.dashboard-title {
  font-size: 18px;
  margin: 0 0 6px 0;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.dashboard-desc {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

.dashboard-desc code {
  background-color: var(--el-fill-color-light);
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--el-color-primary);
}

.header-metrics {
  display: flex;
  gap: 12px;
}

.control-card {
  background-color: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
}

.control-row {
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-regular);
}

.action-buttons {
  margin-left: auto;
}

.workspace-container {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.palette-sidebar {
  width: 280px;
  flex-shrink: 0;
  background-color: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  padding: 16px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.sidebar-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  margin-bottom: 8px;
}

.palette-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.palette-card-wrapper {
  margin: 0 !important;
  width: 100% !important;
  height: auto !important;
  position: static !important;
}

.palette-item-box {
  padding: 10px 12px;
  border-radius: 6px;
  background-color: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color);
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.palette-item-box:hover {
  border-color: var(--el-color-primary);
  box-shadow: var(--el-box-shadow-light);
  transform: translateY(-1px);
}

.directive-item-box {
  padding: 10px 12px;
  border-radius: 6px;
  background-color: var(--el-fill-color-light);
  border: 1px dashed var(--el-color-info);
  cursor: grab;
  user-select: none;
  transition: all 0.2s ease;
}

.directive-item-box:active {
  cursor: grabbing;
}

.palette-item-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.palette-item-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.palette-item-sub {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.drag-hint {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  line-height: 1.4;
  background-color: var(--el-fill-color-lighter);
  padding: 8px;
  border-radius: 4px;
}

.grid-canvas {
  flex: 1;
  min-height: 480px;
  background-color: var(--el-bg-color-page);
  border: 2px dashed var(--el-border-color);
  border-radius: 8px;
  padding: 12px;
  box-sizing: border-box;
}

.canvas-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: var(--at-grid-border-radius, 8px);
  box-shadow: var(--el-box-shadow-lighter);
  overflow: hidden;
  box-sizing: border-box;
}

.canvas-card-header {
  padding: 8px 12px;
  background-color: var(--el-fill-color-lighter);
  border-bottom: 1px solid var(--el-border-color-lighter);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 6px;
}

.drag-icon {
  font-weight: bold;
  color: var(--el-text-color-placeholder);
  cursor: grab;
}

.card-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.canvas-card-body {
  flex: 1;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 8px;
  user-select: text;
}

.card-desc {
  margin: 0;
  font-size: 12px;
  color: var(--el-text-color-regular);
}

.interactive-sandbox {
  background-color: var(--el-fill-color-lighter);
  padding: 8px;
  border-radius: 4px;
}

.sandbox-label {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  margin-bottom: 6px;
}

.sandbox-controls {
  display: flex;
  gap: 8px;
}

.canvas-card-footer {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--el-text-color-secondary);
  border-top: 1px dashed var(--el-border-color-lighter);
  padding-top: 6px;
}

.bottom-panels {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  font-weight: 600;
}

.empty-logs {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  text-align: center;
  padding: 24px 0;
}

.logs-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 180px;
  overflow-y: auto;
}

.log-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  padding: 4px 6px;
  background-color: var(--el-fill-color-light);
  border-radius: 4px;
}

.log-time {
  color: var(--el-text-color-placeholder);
  font-family: monospace;
}

.log-title {
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.log-id {
  margin-left: auto;
  font-family: monospace;
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.json-pre {
  margin: 0;
  max-height: 180px;
  overflow-y: auto;
  font-family: Consolas, Monaco, monospace;
  font-size: 11px;
  background-color: var(--el-fill-color-darker);
  color: var(--el-text-color-primary);
  padding: 10px;
  border-radius: 4px;
}
</style>
