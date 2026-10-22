<script setup lang="ts">
/**
 * @atengk/element-plus 现代主题引擎 - 流体无框表格与排版防抖自验展厅。
 *
 * 验证维度：
 * 1. 彻底消除内部粗硬纵向边框，改用水平亚像素微米级分割基线；
 * 2. 表头规整冷灰独立分层 (浅色 #f1f5f9, 暗黑 #0f1522)，字重提升至 600；
 * 3. 紧凑精密内边距 (8px~10px)，平衡呼吸感与数据密度；
 * 4. 数据行 Hover 浅淡主题微流光 (浅色 4%，暗黑 6%) 与平滑过渡；
 * 5. 全面强制 tabular-nums 等宽排版，高频变动/翻页绝对零水平抖动；
 * 6. 沉浸式毛玻璃悬浮批量操作条 (.at-table__batch-bar)；
 * 7. 零 !important 逃生门：局部 class 随意覆写；
 * 8. 5 款科技主题预设实时秒切与暗黑模式深度自适应。
 *
 * @author Ateng
 * @since 2026-10-22
 */

import { ref, onUnmounted } from 'vue';
import {
  ElButton,
  ElTable,
  ElTableColumn,
  ElRadioGroup,
  ElRadioButton,
  ElTag,
  ElMessage,
  ElSwitch,
} from 'element-plus';
import { AtengCard } from '@atengk/element-plus';

// 1. 当前主题预设控制
const currentPreset = ref<'indigo' | 'emerald' | 'violet' | 'ocean' | 'rose'>('indigo');

const switchPreset = (preset: 'indigo' | 'emerald' | 'violet' | 'ocean' | 'rose') => {
  currentPreset.value = preset;
  document.documentElement.setAttribute('data-theme', preset);
  ElMessage.success({
    message: `已切换至 ${preset.toUpperCase()} 科技主题`,
    grouping: true,
  });
};

// 2. 表格展示数据集（包含长雪花 ID、金额、浮点数、时间戳）
interface ServerNode {
  id: string;
  nodeName: string;
  ip: string;
  qps: number;
  latency: number;
  memoryUsage: string;
  status: 'healthy' | 'warning' | 'critical';
  timestamp: string;
}

const tableData = ref<ServerNode[]>([
  {
    id: '1850982340912834001',
    nodeName: 'gateway-cluster-alpha-01',
    ip: '10.244.12.84',
    qps: 18452,
    latency: 1.28,
    memoryUsage: '42.8%',
    status: 'healthy',
    timestamp: '2026-10-22 14:30:00.124',
  },
  {
    id: '1850982340912834002',
    nodeName: 'auth-service-pod-02',
    ip: '10.244.18.109',
    qps: 9821,
    latency: 3.45,
    memoryUsage: '68.1%',
    status: 'healthy',
    timestamp: '2026-10-22 14:30:01.458',
  },
  {
    id: '1850982340912834003',
    nodeName: 'payment-core-db-replica-01',
    ip: '10.244.05.21',
    qps: 34102,
    latency: 8.92,
    memoryUsage: '89.4%',
    status: 'warning',
    timestamp: '2026-10-22 14:30:02.782',
  },
  {
    id: '1850982340912834004',
    nodeName: 'inference-vllm-worker-08',
    ip: '10.244.77.30',
    qps: 451,
    latency: 142.15,
    memoryUsage: '94.2%',
    status: 'critical',
    timestamp: '2026-10-22 14:30:03.901',
  },
  {
    id: '1850982340912834005',
    nodeName: 'redis-sentinel-master-01',
    ip: '10.244.02.15',
    qps: 112045,
    latency: 0.32,
    memoryUsage: '55.0%',
    status: 'healthy',
    timestamp: '2026-10-22 14:30:04.219',
  },
]);

// 3. 高频数字防抖实测控制器 (tabular-nums 防抖)
const isPulsing = ref(false);
let pulseTimer: ReturnType<typeof setInterval> | null = null;

const togglePulsing = (enabled: boolean) => {
  isPulsing.value = enabled;
  if (enabled) {
    pulseTimer = setInterval(() => {
      tableData.value = tableData.value.map(item => {
        const deltaQps = Math.floor(Math.random() * 500) - 250;
        const deltaLatency = Math.random() * 0.4 - 0.2;
        return {
          ...item,
          qps: Math.max(100, item.qps + deltaQps),
          latency: Number(Math.max(0.1, item.latency + deltaLatency).toFixed(2)),
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 23),
        };
      });
    }, 150);
  } else if (pulseTimer) {
    clearInterval(pulseTimer);
    pulseTimer = null;
  }
};

onUnmounted(() => {
  if (pulseTimer) {
    clearInterval(pulseTimer);
    pulseTimer = null;
  }
});

// 4. 多选与批量操作条
const selectedItems = ref<ServerNode[]>([]);
const handleSelectionChange = (selection: ServerNode[]) => {
  selectedItems.value = selection;
};
const clearSelection = () => {
  selectedItems.value = [];
};

// 5. 边框模式切换
const showBorder = ref(false);
</script>

<template>
  <div class="theme-tables-view">
    <!-- 顶部主题快速切换操作条 -->
    <AtengCard title="🎨 5 款极客科技主题预设实时切换" class="mb-4">
      <div class="preset-bar">
        <span class="label">当前主题:</span>
        <ElRadioGroup
          :model-value="currentPreset"
          @update:model-value="val => switchPreset(val as any)"
        >
          <ElRadioButton value="indigo">🌌 Indigo 极客靛蓝</ElRadioButton>
          <ElRadioButton value="emerald">🌲 Emerald 极客翠绿</ElRadioButton>
          <ElRadioButton value="violet">🔮 Violet 赛博幻紫</ElRadioButton>
          <ElRadioButton value="ocean">🌊 Ocean 商务深海</ElRadioButton>
          <ElRadioButton value="rose">🌹 Rose 极光绯红</ElRadioButton>
        </ElRadioGroup>
      </div>
      <p class="preset-tip">
        💡 提示：在上方切换主题，或在右上角切换深色模式，观察表格表头分层、Hover
        微流光与毛玻璃批量条实时联动！
      </p>
    </AtengCard>

    <!-- 1. 流体无框表格核心展示 -->
    <AtengCard title="📊 现代流体无框表格 (规整冷灰独立表头分层 + 亚像素微米水平基线)" class="mb-4">
      <div class="toolbar-row mb-3">
        <div class="toolbar-left">
          <span class="ctrl-text">开启高频数据波动 (实测 tabular-nums 零抖动)：</span>
          <ElSwitch
            :model-value="isPulsing"
            active-text="高频跳动 (150ms)"
            inactive-text="静态"
            @change="val => togglePulsing(val as boolean)"
          />
        </div>
        <div class="toolbar-right">
          <span class="ctrl-text">表格边框模式：</span>
          <ElSwitch v-model="showBorder" active-text="带微米边框" inactive-text="纯流体无框" />
        </div>
      </div>

      <!-- 表格主体 -->
      <ElTable
        :data="tableData"
        :border="showBorder"
        row-key="id"
        class="fluid-demo-table"
        @selection-change="handleSelectionChange"
      >
        <ElTableColumn type="selection" width="50" align="center" />
        <ElTableColumn prop="id" label="分布式雪花 ID" width="200">
          <template #default="{ row }">
            <span class="font-mono text-xs">{{ row.id }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="nodeName" label="集群服务节点" min-width="180">
          <template #default="{ row }">
            <span class="font-semibold">{{ row.nodeName }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="ip" label="内网 IP" width="130">
          <template #default="{ row }">
            <span class="font-mono text-xs">{{ row.ip }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="qps" label="实时 QPS" width="120" sortable align="right">
          <template #default="{ row }">
            <span class="metric-number">{{ row.qps.toLocaleString() }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="latency" label="延迟 (ms)" width="120" sortable align="right">
          <template #default="{ row }">
            <span class="metric-number" :class="{ 'text-danger': row.latency > 10 }">
              {{ row.latency.toFixed(2) }}
            </span>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="status" label="节点健康度" width="120" align="center">
          <template #default="{ row }">
            <ElTag v-if="row.status === 'healthy'" type="success" size="small" effect="light">
              健康运行
            </ElTag>
            <ElTag v-else-if="row.status === 'warning'" type="warning" size="small" effect="light">
              高负载告警
            </ElTag>
            <ElTag v-else type="danger" size="small" effect="light"> 熔断异常 </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="timestamp" label="上报时刻" min-width="180">
          <template #default="{ row }">
            <span class="font-mono text-xs text-muted">{{ row.timestamp }}</span>
          </template>
        </ElTableColumn>
      </ElTable>

      <!-- 批量操作条 (毛玻璃悬浮效果) -->
      <transition name="fade">
        <div v-if="selectedItems.length > 0" class="at-table__batch-bar mt-3">
          <div class="batch-bar-left">
            <span class="batch-bar-text">
              已勾选
              <strong class="at-table__batch-bar-count">{{ selectedItems.length }}</strong>
              台服务实例
            </span>
            <ElButton link type="primary" size="small" @click="clearSelection">清空</ElButton>
          </div>
          <div class="batch-bar-right">
            <ElButton size="small">批量重启</ElButton>
            <ElButton size="small" type="danger">批量隔离</ElButton>
          </div>
        </div>
      </transition>
    </AtengCard>

    <!-- 2. 零 !important 逃生门实测 -->
    <AtengCard title="🛡️ 零 !important 逃生门实测 (业务通过局部 class 随手天然覆盖)" class="mb-4">
      <p class="mb-3 text-sm text-muted">
        下方表格外挂类名
        <code>.custom-brand-table</code>，直接在局部写纯样式将表头定制为深海蓝底，验证主题引擎绝对零
        <code>!important</code> 绑架。
      </p>
      <ElTable :data="tableData.slice(0, 2)" class="custom-brand-table">
        <ElTableColumn prop="nodeName" label="自定义节点列" />
        <ElTableColumn prop="ip" label="内网 IP" />
        <ElTableColumn prop="qps" label="实时 QPS" />
      </ElTable>
    </AtengCard>
  </div>
</template>

<style scoped>
.theme-tables-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.preset-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.label {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-regular);
}

.preset-tip {
  margin-top: 10px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.toolbar-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.ctrl-text {
  font-size: 13px;
  color: var(--el-text-color-regular);
  margin-right: 8px;
}

.font-mono {
  font-family: var(--at-font-mono, monospace);
}

.font-semibold {
  font-weight: 600;
}

.text-xs {
  font-size: 11.5px;
}

.text-muted {
  color: var(--el-text-color-secondary);
}

.text-danger {
  color: var(--el-color-danger);
  font-weight: 600;
}

.metric-number {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.batch-bar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.batch-bar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.batch-bar-text {
  font-size: 13px;
  color: var(--el-text-color-regular);
}

/* 零 !important 逃生门局部样式：可天然轻松覆盖 */
.custom-brand-table :deep(thead th.el-table__cell) {
  background-color: #0369a1;
  color: #ffffff;
}
</style>
