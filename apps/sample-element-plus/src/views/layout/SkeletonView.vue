<script setup lang="ts">
/**
 * 页面骨架屏占位容器 AtengPageSkeleton 自验页面。
 *
 * @author Ateng
 * @since 2026-10-22
 */

import { ref, computed } from 'vue';
import {
  ElCard,
  ElButton,
  ElRadioGroup,
  ElRadioButton,
  ElSwitch,
  ElAlert,
  ElTable,
  ElTableColumn,
  ElDescriptions,
  ElDescriptionsItem,
  ElTag,
  ElPagination,
} from 'element-plus';
import { AtengPageSkeleton, type AtengSkeletonType } from '@atengk/element-plus';

const currentType = ref<AtengSkeletonType>('table');
const isLoading = ref(true);

const toggleLoading = () => {
  isLoading.value = !isLoading.value;
};

// 表格高拟真参数化交互状态
const tableLoading = ref(true);
const tableRows = ref(4);
const showPagination = ref(true);
const showHeader = ref(true);
const widthPreset = ref<'default' | 'order' | 'compact'>('order');

const columnWidthPresets = {
  default: undefined,
  order: [180, 220, '25%', 140],
  compact: [80, 140, '20%', 120, '25%', 100],
};

const currentColumnWidths = computed(() => columnWidthPresets[widthPreset.value]);

// 真实模拟数据
const mockTable = [
  { orderNo: 'ORD-20261022-001', customer: '腾讯科技', amount: '¥ 120,000.00', status: '已履约' },
  { orderNo: 'ORD-20261022-002', customer: '阿里巴巴', amount: '¥ 85,000.00', status: '待审核' },
  { orderNo: 'ORD-20261022-003', customer: '字节跳动', amount: '¥ 240,000.00', status: '已履约' },
];
</script>

<template>
  <div class="skeleton-view">
    <ElCard header="页面骨架屏占位容器 AtengPageSkeleton">
      <ElAlert
        title="5 大典型后台骨架屏形态与流式自适应网格"
        type="info"
        description="开箱即用支持 table（检索表单+表格）、form（表单栅格）、detail（详情结构）、card（流式卡片网格）、dashboard（4 指标卡+双图表看板）五大高频后台预设；卡片与仪表盘升级为现代 CSS Grid auto-fit + minmax 流式自适应网格，窄屏自然换行无溢出；数据加载完成时自带平滑淡入淡出（Fade Transition）过渡，消除突变闪变。"
        show-icon
        :closable="false"
        style="margin-bottom: 20px"
      />

      <div class="ctrl-bar">
        <span>骨架屏预设形态：</span>
        <ElRadioGroup v-model="currentType" size="small">
          <ElRadioButton value="table">表格型 (table)</ElRadioButton>
          <ElRadioButton value="form">表单型 (form)</ElRadioButton>
          <ElRadioButton value="detail">详情型 (detail)</ElRadioButton>
          <ElRadioButton value="card">卡片型 (card)</ElRadioButton>
          <ElRadioButton value="dashboard">看板型 (dashboard)</ElRadioButton>
        </ElRadioGroup>

        <span style="margin-left: 20px">加载状态 (loading)：</span>
        <ElSwitch v-model="isLoading" />
        <ElButton size="small" type="primary" style="margin-left: 12px" @click="toggleLoading">
          {{ isLoading ? '切换为加载完成' : '重新进入加载态' }}
        </ElButton>
      </div>

      <div class="skeleton-demo-box">
        <AtengPageSkeleton :loading="isLoading" :type="currentType" :rows="4">
          <!-- 真实业务视图（加载完成后淡入展示） -->
          <div class="real-content">
            <!-- 真实表格展示 -->
            <div v-if="currentType === 'table'" class="real-table-view">
              <div class="real-query">
                <span class="query-title">查询结果 (共 3 笔订单)：</span>
                <ElTag type="success">数据已加载就绪</ElTag>
              </div>
              <ElTable :data="mockTable" border stripe>
                <ElTableColumn prop="orderNo" label="订单编号" width="180" />
                <ElTableColumn prop="customer" label="客户名称" width="200" />
                <ElTableColumn prop="amount" label="合同金额" />
                <ElTableColumn prop="status" label="履约状态" width="120">
                  <template #default="{ row }">
                    <ElTag :type="row.status === '已履约' ? 'success' : 'warning'" size="small">
                      {{ row.status }}
                    </ElTag>
                  </template>
                </ElTableColumn>
              </ElTable>
            </div>

            <!-- 真实表单展示 -->
            <div v-else-if="currentType === 'form'" class="real-form-view">
              <h3>系统安全密钥配置</h3>
              <p>真实表单内容已渲染完成，支持密码双因子验证与授权策略流转。</p>
            </div>

            <!-- 真实详情展示 -->
            <div v-else-if="currentType === 'detail'" class="real-detail-view">
              <ElDescriptions title="企业客户主档案" :column="3" border>
                <ElDescriptionsItem label="企业名称">深度创新网络技术有限公司</ElDescriptionsItem>
                <ElDescriptionsItem label="统一信用代码">91110000MA00ABCD1X</ElDescriptionsItem>
                <ElDescriptionsItem label="签约状态">
                  <ElTag type="success" size="small">已签约</ElTag>
                </ElDescriptionsItem>
                <ElDescriptionsItem label="注册资金">¥ 5,000 万元</ElDescriptionsItem>
                <ElDescriptionsItem label="法人代表">张总</ElDescriptionsItem>
                <ElDescriptionsItem label="联系邮箱">legal@company.example</ElDescriptionsItem>
              </ElDescriptions>
            </div>

            <!-- 真实卡片网格 -->
            <div v-else-if="currentType === 'card'" class="real-card-view">
              <div class="card-grid">
                <div v-for="i in 6" :key="i" class="product-card">
                  <h4>微服务中间件 Cluster #{{ i }}</h4>
                  <p>状态：集群健康度 100%，已运行 45 天无故障。</p>
                </div>
              </div>
            </div>

            <!-- 真实仪表盘展示 -->
            <div v-else-if="currentType === 'dashboard'" class="real-dashboard-view">
              <div class="dashboard-stats-grid">
                <div class="dash-stat-item">
                  <div class="stat-title">今日核心营收 (GMV)</div>
                  <div class="stat-value">¥ 2,891,420.00</div>
                  <div class="stat-sub">较昨日 +14.2% ↑</div>
                </div>
                <div class="dash-stat-item">
                  <div class="stat-title">有效支付订单</div>
                  <div class="stat-value">5,820 笔</div>
                  <div class="stat-sub">履约率 99.4%</div>
                </div>
                <div class="dash-stat-item">
                  <div class="stat-title">活跃企业租户</div>
                  <div class="stat-value">1,248 家</div>
                  <div class="stat-sub">新增 32 家</div>
                </div>
                <div class="dash-stat-item">
                  <div class="stat-title">网关请求总数</div>
                  <div class="stat-value">84.9 万次</div>
                  <div class="stat-sub">平均延时 18ms</div>
                </div>
              </div>

              <div class="dashboard-charts-grid">
                <div class="dash-chart-card">
                  <div class="dash-chart-header">
                    <h4>📈 24 小时交易波动走势图</h4>
                    <ElTag size="small">实时流</ElTag>
                  </div>
                  <div class="chart-content-box">[折线走势图真实渲染区域]</div>
                </div>
                <div class="dash-chart-card">
                  <div class="dash-chart-header">
                    <h4>🍩 业务线营收贡献分布</h4>
                    <ElTag size="small" type="success">按自然月</ElTag>
                  </div>
                  <div class="chart-content-box">[环形占比图真实渲染区域]</div>
                </div>
              </div>
            </div>
          </div>
        </AtengPageSkeleton>
      </div>
    </ElCard>

    <!-- 增强卡片：高拟真参数化表格骨架屏 -->
    <ElCard header="高拟真参数化表格骨架屏 (Table Parameterized Skeleton)" style="margin-top: 24px">
      <ElAlert
        title="列宽自定义 (columnWidths)、假分页占位 (showPagination) 与纯表格开关 (showHeader)"
        type="success"
        description="支持通过 columnWidths 传入数字或百分比数组精准对齐真实表格各列比例；支持通过 showPagination: true 在表格底部自动渲染高拟真假分页条占位（包含总计、页码按钮与尺寸切换器）；支持通过 showHeader: false 隐藏顶部搜索区骨架，适应纯表格场景。"
        show-icon
        :closable="false"
        style="margin-bottom: 20px"
      />

      <div class="ctrl-bar">
        <span>列宽预设 (columnWidths)：</span>
        <ElRadioGroup v-model="widthPreset" size="small">
          <ElRadioButton value="order">四列业务表 [180, 220, '25%', 140]</ElRadioButton>
          <ElRadioButton value="compact"
            >六列紧凑表 [80, 140, '20%', 120, '25%', 100]</ElRadioButton
          >
          <ElRadioButton value="default">默认五列均分</ElRadioButton>
        </ElRadioGroup>

        <span style="margin-left: 16px">假分页占位 (showPagination)：</span>
        <ElSwitch v-model="showPagination" />

        <span style="margin-left: 16px">搜索区骨架 (showHeader)：</span>
        <ElSwitch v-model="showHeader" />

        <span style="margin-left: 16px">加载态 (loading)：</span>
        <ElSwitch v-model="tableLoading" />
      </div>

      <div class="skeleton-demo-box">
        <AtengPageSkeleton
          :loading="tableLoading"
          type="table"
          :rows="tableRows"
          :column-widths="currentColumnWidths"
          :show-pagination="showPagination"
          :show-header="showHeader"
        >
          <div class="real-content">
            <div v-if="showHeader" class="real-query">
              <span class="query-title">高拟真业务数据表格 (共 3 笔订单)：</span>
              <ElTag type="success">真实数据加载就绪</ElTag>
            </div>
            <ElTable :data="mockTable" border stripe>
              <ElTableColumn prop="orderNo" label="订单编号" width="180" />
              <ElTableColumn prop="customer" label="客户名称" width="220" />
              <ElTableColumn prop="amount" label="合同金额" />
              <ElTableColumn prop="status" label="履约状态" width="140">
                <template #default="{ row }">
                  <ElTag :type="row.status === '已履约' ? 'success' : 'warning'" size="small">
                    {{ row.status }}
                  </ElTag>
                </template>
              </ElTableColumn>
            </ElTable>
            <div v-if="showPagination" class="real-pagination">
              <span class="pagination-info">共 3 条记录</span>
              <ElPagination layout="prev, pager, next" :total="3" :page-size="10" />
            </div>
          </div>
        </AtengPageSkeleton>
      </div>
    </ElCard>
  </div>
</template>

<style scoped>
.skeleton-view {
  width: 100%;
}

.ctrl-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 20px;
  padding: 12px 16px;
  background-color: var(--el-bg-color-page);
  border-radius: var(--el-border-radius-base);
  font-size: 14px;
}

.skeleton-demo-box {
  min-height: 380px;
}

.real-content {
  padding: 16px;
  background-color: var(--el-bg-color);
  border-radius: var(--el-border-radius-base);
  border: 1px solid var(--el-border-color-lighter);
}

.real-query {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.real-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.pagination-info {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.query-title {
  font-size: 15px;
  font-weight: 600;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.product-card {
  padding: 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: var(--el-border-radius-base);
  background-color: var(--el-fill-color-blank);
}

/* 真实仪表盘样式 */
.dashboard-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.dash-stat-item {
  padding: 16px;
  background-color: var(--el-fill-color-light);
  border-radius: var(--el-border-radius-base);
}

.stat-title {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  margin-bottom: 8px;
}

.stat-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--el-color-primary);
  margin-bottom: 6px;
}

.stat-sub {
  font-size: 12px;
  color: var(--el-color-success);
}

.dashboard-charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 20px;
}

.dash-chart-card {
  padding: 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: var(--el-border-radius-base);
  background-color: var(--el-bg-color);
}

.dash-chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.chart-content-box {
  height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--el-fill-color-light);
  border-radius: 4px;
  color: var(--el-text-color-placeholder);
  font-size: 14px;
}
</style>
