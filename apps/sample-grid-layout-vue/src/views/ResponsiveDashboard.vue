<script setup lang="ts">
/**
 * 容器尺寸断点、纯 CSS 网格参考线与 CSS Tokens 体系展厅看板 (Dashboard 3)。
 *
 * 验证基于容器自身 ResizeObserver 驱动的多列响应式断点 (12/6/2/1 列平滑切换)，
 * 验证纯 CSS 辅助参考线 (showGridLines) 显隐与行高 (cellHeight) 热更新，
 * 验证 Element Plus 暗黑模式 CSS Tokens 动态联动。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { computed, ref } from 'vue';
import { AtengGridLayout, AtengGridItem } from '@atengk/grid-layout-vue';
import type { GridLayoutItem } from '@atengk/grid-layout-vue';

interface ResponsiveCardPayload {
  title: string;
  category: string;
  color: string;
  description: string;
}

const initialCards: GridLayoutItem<ResponsiveCardPayload>[] = [
  {
    id: 'kpi-summary',
    x: 0,
    y: 0,
    w: 6,
    h: 3,
    minW: 2,
    minH: 2,
    data: {
      title: '📊 核心指标大盘 (KPI Overview)',
      category: '汇总分析',
      color: 'primary',
      description: '大屏占据 6 列，在中屏收缩时自动排满 6 列，小屏自动顺延折叠。',
    },
  },
  {
    id: 'realtime-flow',
    x: 6,
    y: 0,
    w: 6,
    h: 3,
    minW: 2,
    minH: 2,
    data: {
      title: '📈 实时流量拓扑 (Network Flow)',
      category: '网络监控',
      color: 'success',
      description: '容器收缩时自动根据当前剩余栅格自适应流转，保持高内聚视觉平衡。',
    },
  },
  {
    id: 'task-queue',
    x: 0,
    y: 3,
    w: 4,
    h: 2,
    minW: 2,
    minH: 2,
    data: {
      title: '⚡ 异步任务流水线 (Task Queue)',
      category: '作业调度',
      color: 'warning',
      description: '占据 4 列，在 6 列中屏与 2 列小屏状态下平滑重排。',
    },
  },
  {
    id: 'system-load',
    x: 4,
    y: 3,
    w: 4,
    h: 2,
    minW: 2,
    minH: 2,
    data: {
      title: '🖥️ 计算集群负载 (Cluster Load)',
      category: '基础设施',
      color: 'info',
      description: '监控节点 CPU/内存/IO 吞吐，随着容器宽度自适应紧凑避让。',
    },
  },
  {
    id: 'audit-log',
    x: 8,
    y: 3,
    w: 4,
    h: 2,
    minW: 2,
    minH: 2,
    data: {
      title: '🛡️ 安全审计审计日志 (Audit Log)',
      category: '风控安全',
      color: 'danger',
      description: '支持纯 CSS 网格线对齐，暗黑模式自动感知切换主题色。',
    },
  },
];

const layout = ref<GridLayoutItem<ResponsiveCardPayload>[]>(
  JSON.parse(JSON.stringify(initialCards)),
);

const showGridLines = ref(true);
const editable = ref(true);
const cellHeight = ref<string>('80px');
const containerWidthPercent = ref(100);
const customPixelWidth = ref<number | null>(null);

// 记录实时容器宽度与断点数据
const currentObservedWidth = ref(1200);
const activeColumns = ref(12);

const onBreakpointChange = (payload: { width: number; column: number }) => {
  currentObservedWidth.value = Math.round(payload.width);
  activeColumns.value = payload.column;
};

const currentBreakpointTag = computed(() => {
  const w = currentObservedWidth.value;
  if (w < 576) {
    return { name: 'xs (超小屏)', tag: 'danger' };
  }
  if (w < 768) {
    return { name: 'sm (小屏)', tag: 'warning' };
  }
  if (w < 992) {
    return { name: 'md (中屏)', tag: 'primary' };
  }
  return { name: 'lg (大屏/超大屏)', tag: 'success' };
});

const containerStyle = computed(() => {
  if (customPixelWidth.value !== null) {
    return {
      width: `${customPixelWidth.value}px`,
      maxWidth: '100%',
    };
  }
  return {
    width: `${containerWidthPercent.value}%`,
  };
});

const setPresetWidth = (widthType: 'full' | 'lg' | 'md' | 'sm' | 'xs') => {
  switch (widthType) {
    case 'full':
      customPixelWidth.value = null;
      containerWidthPercent.value = 100;
      break;
    case 'lg':
      customPixelWidth.value = 1050;
      break;
    case 'md':
      customPixelWidth.value = 850;
      break;
    case 'sm':
      customPixelWidth.value = 650;
      break;
    case 'xs':
      customPixelWidth.value = 420;
      break;
  }
};

const resetLayout = () => {
  layout.value = JSON.parse(JSON.stringify(initialCards));
};
</script>

<template>
  <div class="responsive-dashboard">
    <!-- 顶部状态指示栏 -->
    <div class="dashboard-header">
      <div class="header-left">
        <h2 class="dashboard-title">看板 3：容器自适应断点、网格参考线与 CSS Tokens 体系</h2>
        <p class="dashboard-desc">
          基于容器自身 <code>ResizeObserver</code> 动态计算断点，脱离
          <code>window.innerWidth</code> 绑架； 支持纯 CSS 渐变渲染辅助参考网格与暗黑模式 CSS Tokens
          无缝切换。
        </p>
      </div>
      <div class="header-metrics">
        <div class="metric-badge">
          <span class="metric-label">实测容器宽度:</span>
          <el-tag type="info" size="large" effect="plain">{{ currentObservedWidth }} px</el-tag>
        </div>
        <div class="metric-badge">
          <span class="metric-label">当前断点:</span>
          <el-tag :type="currentBreakpointTag.tag" size="large">{{
            currentBreakpointTag.name
          }}</el-tag>
        </div>
        <div class="metric-badge">
          <span class="metric-label">活动栅格列数:</span>
          <el-tag type="success" size="large">{{ activeColumns }} 列</el-tag>
        </div>
      </div>
    </div>

    <!-- 交互控制面板 -->
    <el-card class="control-card" shadow="never">
      <div class="control-row">
        <!-- 容器宽度滑块与预设 -->
        <div class="control-group width-presets">
          <span class="control-label">容器宽度快速预设:</span>
          <el-button-group>
            <el-button
              size="small"
              :type="
                customPixelWidth === null && containerWidthPercent === 100 ? 'primary' : 'default'
              "
              @click="setPresetWidth('full')"
            >
              100% 全宽
            </el-button>
            <el-button
              size="small"
              :type="customPixelWidth === 1050 ? 'primary' : 'default'"
              @click="setPresetWidth('lg')"
            >
              1050px (lg / 12列)
            </el-button>
            <el-button
              size="small"
              :type="customPixelWidth === 850 ? 'primary' : 'default'"
              @click="setPresetWidth('md')"
            >
              850px (md / 6列)
            </el-button>
            <el-button
              size="small"
              :type="customPixelWidth === 650 ? 'primary' : 'default'"
              @click="setPresetWidth('sm')"
            >
              650px (sm / 2列)
            </el-button>
            <el-button
              size="small"
              :type="customPixelWidth === 420 ? 'primary' : 'default'"
              @click="setPresetWidth('xs')"
            >
              420px (xs / 1列)
            </el-button>
          </el-button-group>
        </div>

        <!-- 连续宽度调节滑块 -->
        <div class="control-group slider-group">
          <span class="control-label">连续调节宽度 (px):</span>
          <el-slider
            v-model="currentObservedWidth"
            :min="360"
            :max="1400"
            :step="10"
            style="width: 200px"
            @input="
              (val: number) => {
                customPixelWidth = val;
              }
            "
          />
        </div>
      </div>

      <el-divider style="margin: 12px 0" />

      <div class="control-row">
        <!-- 辅助参考线 -->
        <div class="control-group">
          <span class="control-label">纯 CSS 辅助参考线:</span>
          <el-switch v-model="showGridLines" active-text="开启" inactive-text="关闭" />
        </div>

        <!-- 行高切换 -->
        <div class="control-group">
          <span class="control-label">动态行高 (cellHeight):</span>
          <el-radio-group v-model="cellHeight" size="small">
            <el-radio-button value="60px">60px (紧凑)</el-radio-button>
            <el-radio-button value="80px">80px (标准)</el-radio-button>
            <el-radio-button value="100px">100px (舒展)</el-radio-button>
            <el-radio-button value="120px">120px (巨幅)</el-radio-button>
          </el-radio-group>
        </div>

        <!-- 编辑态切换 -->
        <div class="control-group">
          <span class="control-label">可编辑态:</span>
          <el-switch v-model="editable" active-text="编辑中" inactive-text="只读预览" />
        </div>

        <!-- 重置 -->
        <div class="control-group">
          <el-button size="small" @click="resetLayout"> 🔄 重置布局 </el-button>
        </div>
      </div>
    </el-card>

    <!-- 弹性可收缩容器外壳 -->
    <div class="container-wrapper" :style="containerStyle">
      <div class="container-ruler-bar">
        <span class="ruler-tip">
          📐 容器边界模拟 (当前宽度: {{ currentObservedWidth }}px | {{ activeColumns }} 栅格列)
        </span>
      </div>

      <AtengGridLayout
        v-model:layout="layout"
        responsive
        :cell-height="cellHeight"
        :show-grid-lines="showGridLines"
        :editable="editable"
        @breakpoint-change="onBreakpointChange"
      >
        <AtengGridItem v-for="item in layout" :key="item.id" :item="item">
          <div class="card-content">
            <div class="card-header at-grid-drag-handle">
              <span class="card-title">{{ item.data?.title }}</span>
              <el-tag size="small" :type="item.data?.color ?? 'info'">
                {{ item.w }}×{{ item.h }}
              </el-tag>
            </div>
            <div class="card-body">
              <p class="card-desc">{{ item.data?.description }}</p>
              <div class="card-footer">
                <span class="card-coord">
                  坐标: <strong>({{ item.x }}, {{ item.y }})</strong>
                </span>
                <span class="card-cat"> 分类: {{ item.data?.category }} </span>
              </div>
            </div>
          </div>
        </AtengGridItem>
      </AtengGridLayout>
    </div>

    <!-- 实时 JSON 监视器 -->
    <el-card class="json-inspector-card" shadow="never">
      <template #header>
        <div class="json-header">
          <span>📋 实时响应式布局数据流 (JSON Inspector)</span>
          <el-tag size="small" type="info">{{ layout.length }} 项卡片</el-tag>
        </div>
      </template>
      <pre class="json-pre"><code>{{ JSON.stringify(layout, null, 2) }}</code></pre>
    </el-card>
  </div>
</template>

<style scoped>
.responsive-dashboard {
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
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.metric-badge {
  display: flex;
  align-items: center;
  gap: 6px;
}

.metric-label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
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

.container-wrapper {
  margin: 0 auto;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 2px dashed var(--el-border-color);
  border-radius: var(--at-grid-border-radius, 8px);
  padding: 12px;
  box-sizing: border-box;
  background-color: var(--el-bg-color-page);
}

.container-ruler-bar {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 4px 12px;
  margin-bottom: 12px;
  background-color: var(--el-fill-color-light);
  border-radius: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.ruler-tip {
  font-weight: 500;
}

.card-content {
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

.card-header {
  padding: 10px 14px;
  background-color: var(--el-fill-color-lighter);
  border-bottom: 1px solid var(--el-border-color-lighter);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-body {
  flex: 1;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.card-desc {
  margin: 0;
  font-size: 12px;
  color: var(--el-text-color-regular);
  line-height: 1.5;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  color: var(--el-text-color-secondary);
  border-top: 1px dashed var(--el-border-color-lighter);
  padding-top: 8px;
  margin-top: 8px;
}

.json-inspector-card {
  margin-top: 12px;
}

.json-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  font-size: 14px;
}

.json-pre {
  margin: 0;
  max-height: 220px;
  overflow-y: auto;
  font-family: Consolas, Monaco, 'Courier New', monospace;
  font-size: 12px;
  background-color: var(--el-fill-color-darker);
  color: var(--el-text-color-primary);
  padding: 12px;
  border-radius: 6px;
}
</style>
