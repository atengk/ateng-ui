<script setup lang="ts">
/**
 * 骨架与通用容器大满贯综合实战自验展厅。
 *
 * 核心装配能力：
 * 1. 纯无状态基础布局 AtengLayout + AtengAside + AtengContent：轻量侧栏折叠与横向自动排版；
 * 2. 页面主体承载容器 AtengPageContainer：自适应视口撑满 (fitViewport)、声明式操作流折叠 (extraActions)、防篡改安全水印与沉浸无页头模式；
 * 3. 弹性分栏容器 AtengSplitLayout：边缘阻尼磁吸附 (snapThreshold)、双击快速折叠复位与键盘无障碍微调；
 * 4. 楼层电梯导航 AtengAnchor：零胶水自动探测并绑定祖先页面容器的局部滚动内容宿主；
 * 5. 吸底操作栏 AtengFooterBar：容器总线自动感知注册高度并由父容器动态追加等高 padding 垫块，防内容遮挡；
 * 6. 双轨骨架屏协同：页面级 AtengPageSkeleton (高拟真参数化表格形态) + 局部细粒度 v-skeleton 原地微骨架 (Zero-CLS)。
 *
 * @author Ateng
 * @since 2026-10-25
 */

import { ref } from 'vue';
import {
  ElButton,
  ElTag,
  ElSwitch,
  ElMessage,
  ElTable,
  ElTableColumn,
  ElAlert,
  ElCard,
  ElRadioGroup,
  ElRadioButton,
} from 'element-plus';
import {
  AtengLayout,
  AtengAside,
  AtengContent,
  AtengPageContainer,
  AtengSplitLayout,
  AtengFooterBar,
  AtengAnchor,
  AtengPageSkeleton,
  type AtengAnchorItem,
  type AtengPageActionItem,
} from '@atengk/element-plus';

// 1. 响应式交互状态
const asideCollapsed = ref(false);
const splitSize = ref('240px');
const pageLoading = ref(false);
const microSkeletonLoading = ref(false);
const watermarkEnabled = ref(true);
const headerVisible = ref(true);
const footerSlotMode = ref<'nested' | 'slot'>('nested');

// 2. 楼层锚点配置
const suiteAnchorItems: AtengAnchorItem[] = [
  { href: '#sec-overview', title: '协同总线全景' },
  { href: '#sec-metrics', title: '核心指标大盘' },
  { href: '#sec-table', title: '核心数据明细' },
  { href: '#sec-form', title: '安全配置表单' },
];

// 3. 声明式页头操作流
const pageActions: AtengPageActionItem[] = [
  {
    key: 'refresh',
    label: '刷新大盘',
    type: 'primary',
    onClick: () => {
      pageLoading.value = true;
      setTimeout(() => {
        pageLoading.value = false;
        ElMessage.success('大盘数据已刷新');
      }, 800);
    },
  },
  {
    key: 'micro',
    label: '切换微骨架',
    onClick: () => {
      microSkeletonLoading.value = !microSkeletonLoading.value;
      ElMessage.info(`微骨架加载状态: ${microSkeletonLoading.value}`);
    },
  },
  {
    key: 'export',
    label: '导出清单',
    onClick: () => ElMessage.success('触发导出清单'),
  },
  {
    key: 'audit',
    label: '安全审计日志',
    divided: true,
    onClick: () => ElMessage.warning('查看审计日志'),
  },
  {
    key: 'lock',
    label: '一键熔断锁定',
    disabled: true,
  },
];

// 4. 表格示例数据
const sampleData = ref([
  {
    id: 'TX-1001',
    service: '微服务网关 (Gateway)',
    qps: '18,520',
    latency: '4.2ms',
    status: '健康',
  },
  { id: 'TX-1002', service: '认证授权中心 (Auth)', qps: '8,210', latency: '6.8ms', status: '健康' },
  {
    id: 'TX-1003',
    service: '交易结算引擎 (Settlement)',
    qps: '4,150',
    latency: '12.5ms',
    status: '正常',
  },
  {
    id: 'TX-1004',
    service: '日志分析流 (LogStream)',
    qps: '35,800',
    latency: '2.1ms',
    status: '健康',
  },
  {
    id: 'TX-1005',
    service: '大模型推理管道 (LLM Pipeline)',
    qps: '1,240',
    latency: '180.4ms',
    status: '繁忙',
  },
  { id: 'TX-1006', service: '数据同步作业 (CDC)', qps: '9,430', latency: '8.7ms', status: '健康' },
  {
    id: 'TX-1007',
    service: '对象存储网关 (OSS Gateway)',
    qps: '6,100',
    latency: '15.3ms',
    status: '健康',
  },
  {
    id: 'TX-1008',
    service: '消息中间件中枢 (MQ Cluster)',
    qps: '42,000',
    latency: '1.8ms',
    status: '健康',
  },
]);

// 5. 吸底操作提交
const handleSaveSuite = async () => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  ElMessage.success('大满贯综合配置已保存！');
};
</script>

<template>
  <div class="container-suite-view">
    <!-- 顶部全局控制面板 -->
    <div class="suite-toolbar">
      <div class="toolbar-title">
        <span class="badge">PRO</span>
        <strong>容器与骨架套件大满贯综合实战 (Container Suite)</strong>
      </div>
      <div class="toolbar-controls">
        <span class="ctrl-item">
          <span>防篡改水印：</span>
          <ElSwitch v-model="watermarkEnabled" />
        </span>
        <span class="ctrl-item">
          <span>沉浸模式 (隐藏页头)：</span>
          <ElSwitch v-model="headerVisible" />
        </span>
        <span class="ctrl-item">
          <span>整页高拟真骨架屏：</span>
          <ElSwitch v-model="pageLoading" />
        </span>
        <span class="ctrl-item">
          <span>原地微骨架 (Zero-CLS)：</span>
          <ElSwitch v-model="microSkeletonLoading" />
        </span>
        <span class="ctrl-item">
          <span>底栏协同模式：</span>
          <ElRadioGroup v-model="footerSlotMode" size="small">
            <ElRadioButton value="nested">内容末尾嵌套</ElRadioButton>
            <ElRadioButton value="slot">#footer 具名插槽</ElRadioButton>
          </ElRadioGroup>
        </span>
      </div>
    </div>

    <!-- 1. 无状态外层基础布局：AtengLayout -->
    <AtengLayout class="suite-main-layout">
      <!-- 可折叠侧边栏：AtengAside -->
      <AtengAside
        v-model:collapsed="asideCollapsed"
        width="220px"
        collapsed-width="64px"
        collapsible
        class="suite-aside"
      >
        <div class="aside-nav-header">
          <span v-if="!asideCollapsed">系统资源拓扑</span>
          <span v-else>拓扑</span>
        </div>
        <div class="aside-nav-body">
          <div class="nav-item is-active">
            <span class="dot"></span>
            <span v-if="!asideCollapsed">核心网关服务群</span>
          </div>
          <div class="nav-item">
            <span class="dot"></span>
            <span v-if="!asideCollapsed">分布式存储集群</span>
          </div>
          <div class="nav-item">
            <span class="dot"></span>
            <span v-if="!asideCollapsed">AI 计算推理节点</span>
          </div>
        </div>
      </AtengAside>

      <!-- 2. 主体内容区：AtengContent 承载 AtengPageContainer -->
      <AtengContent class="suite-content">
        <AtengPageContainer
          title="微服务集群管控中枢"
          sub-title="基于 AtengLayout + PageContainer + SplitLayout + FooterBar + Anchor 全维协同"
          :breadcrumb="[
            { label: '控制台', path: '/' },
            { label: '容器基础设施' },
            { label: '集群综合管控' },
          ]"
          fit-viewport
          :header-visible="headerVisible"
          :watermark="watermarkEnabled ? 'Ateng Cloud 工业级安全管控' : undefined"
          :extra-actions="pageActions"
          :max-visible-actions="3"
        >
          <template #tags>
            <ElTag type="success" size="small">运行中 (8/8)</ElTag>
            <ElTag type="primary" size="small">双模滚动正常</ElTag>
          </template>

          <!-- 底部固定/悬浮插槽模式演示 -->
          <template v-if="footerSlotMode === 'slot'" #footer>
            <AtengFooterBar
              position="sticky"
              submit-text="保存系统管控参数 (专属 #footer 插槽)"
              show-reset
              show-cancel
              :on-submit="handleSaveSuite"
            />
          </template>

          <!-- 3. 高拟真页面骨架屏包装：AtengPageSkeleton -->
          <AtengPageSkeleton
            :loading="pageLoading"
            type="table"
            :rows="6"
            :columns="5"
            :column-widths="['120px', '240px', '140px', '120px', '100px']"
            show-pagination
            show-header
          >
            <!-- 4. 弹性拖拽分栏布局：AtengSplitLayout -->
            <AtengSplitLayout
              v-model="splitSize"
              :snap-threshold="70"
              min="160px"
              max="360px"
              class="suite-split-layout"
            >
              <!-- 分栏第一栏：电梯楼层导航锚点 AtengAnchor -->
              <template #first>
                <div class="suite-anchor-panel">
                  <div class="panel-title">电梯导航 (局部联动)</div>
                  <!-- AtengAnchor 零胶水自动向上感知并绑定 AtengPageContainer 局部内容滚动宿主 -->
                  <AtengAnchor
                    :items="suiteAnchorItems"
                    direction="vertical"
                    style="margin-top: 12px"
                  />
                </div>
              </template>

              <!-- 分栏第二栏：主业务工作区 -->
              <template #second>
                <div class="suite-workspace">
                  <!-- 楼层 1：全景概览 -->
                  <div id="sec-overview" class="section-block">
                    <ElAlert
                      title="工业级容器协同总线 (Container Context Bus) 深度装配"
                      type="success"
                      description="AtengPageContainer 向上文注入 PAGE_CONTAINER_INJECTION_KEY 总线；左侧 AtengAnchor 在未显式指定 container 属性时，自动识别并绑定页面容器局部滚动内容区；底部 AtengFooterBar 自动向父容器注册高度，父容器为滚动区域动态追加等高 padding-bottom 垫块，彻底杜绝底栏遮挡内容末尾表单与按钮；右侧操作流支持超出 3 项自动收折至下拉菜单。"
                      show-icon
                      :closable="false"
                    />
                  </div>

                  <!-- 楼层 2：核心指标大盘（支持 v-skeleton 原地细粒度微骨架，Zero-CLS） -->
                  <div id="sec-metrics" class="section-block">
                    <h3 class="section-heading">核心运行指标</h3>
                    <div class="metrics-grid">
                      <ElCard shadow="hover" class="metric-card">
                        <div class="metric-label">全网总吞吐量</div>
                        <div v-skeleton="microSkeletonLoading" class="metric-value">
                          126,890 <span class="metric-unit">QPS</span>
                        </div>
                      </ElCard>
                      <ElCard shadow="hover" class="metric-card">
                        <div class="metric-label">平均集群延迟</div>
                        <div v-skeleton="microSkeletonLoading" class="metric-value">
                          3.85 <span class="metric-unit">ms</span>
                        </div>
                      </ElCard>
                      <ElCard shadow="hover" class="metric-card">
                        <div class="metric-label">节点健康度</div>
                        <div v-skeleton="microSkeletonLoading" class="metric-value">
                          99.99 <span class="metric-unit">%</span>
                        </div>
                      </ElCard>
                      <ElCard shadow="hover" class="metric-card">
                        <div class="metric-label">安全防护阻断</div>
                        <div v-skeleton="microSkeletonLoading" class="metric-value">
                          1,420 <span class="metric-unit">次/日</span>
                        </div>
                      </ElCard>
                    </div>
                  </div>

                  <!-- 楼层 3：服务明细表格 -->
                  <div id="sec-table" class="section-block">
                    <h3 class="section-heading">服务集群实时明细</h3>
                    <ElTable :data="sampleData" border stripe style="width: 100%">
                      <ElTableColumn prop="id" label="服务编号" width="130" />
                      <ElTableColumn prop="service" label="服务名称" min-width="220" />
                      <ElTableColumn prop="qps" label="实时 QPS" width="140" />
                      <ElTableColumn prop="latency" label="P99 延迟" width="120" />
                      <ElTableColumn prop="status" label="运行状态" width="100">
                        <template #default="{ row }">
                          <ElTag :type="row.status === '健康' ? 'success' : 'warning'" size="small">
                            {{ row.status }}
                          </ElTag>
                        </template>
                      </ElTableColumn>
                    </ElTable>
                  </div>

                  <!-- 楼层 4：安全管控配置 -->
                  <div id="sec-form" class="section-block">
                    <h3 class="section-heading">安全管控策略与提交</h3>
                    <ElCard shadow="never" class="config-card">
                      <p>
                        当前处于微服务高可用集群保护状态，所有流量均经由安全网关过滤。点击下方吸底操作栏提交配置修改。
                      </p>
                      <div style="display: flex; gap: 16px; margin-top: 12px">
                        <ElButton>导出配置快照</ElButton>
                        <ElButton type="primary" plain>重载集群路由</ElButton>
                      </div>
                    </ElCard>
                  </div>

                  <!-- 5. 内容末尾嵌套 AtengFooterBar (自动向父容器注册高度并获得 padding 占位) -->
                  <div v-if="footerSlotMode === 'nested'" class="nested-footer-wrapper">
                    <AtengFooterBar
                      position="sticky"
                      submit-text="保存集群协同配置 (内容区嵌套模式)"
                      show-reset
                      show-cancel
                      :on-submit="handleSaveSuite"
                    />
                  </div>
                </div>
              </template>
            </AtengSplitLayout>
          </AtengPageSkeleton>
        </AtengPageContainer>
      </AtengContent>
    </AtengLayout>
  </div>
</template>

<style scoped>
.container-suite-view {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  overflow: hidden;
}

/* 顶部控制面板 */
.suite-toolbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background-color: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-light);
  box-sizing: border-box;
  flex-wrap: wrap;
  gap: 12px;
}

.toolbar-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.toolbar-title .badge {
  background-color: var(--el-color-primary);
  color: #fff;
  font-size: 10px;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 4px;
}

.toolbar-controls {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.ctrl-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--el-text-color-regular);
}

/* 主体布局 */
.suite-main-layout {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.suite-aside {
  background-color: var(--el-bg-color-page);
  border-right: 1px solid var(--el-border-color-light);
  display: flex;
  flex-direction: column;
}

.aside-nav-header {
  padding: 16px;
  font-weight: bold;
  font-size: 13px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  color: var(--el-text-color-primary);
}

.aside-nav-body {
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  color: var(--el-text-color-regular);
  transition: all 0.2s;
}

.nav-item:hover,
.nav-item.is-active {
  background-color: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  font-weight: 500;
}

.nav-item .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: currentColor;
}

.suite-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

/* 分栏布局 */
.suite-split-layout {
  height: 100%;
}

.suite-anchor-panel {
  padding: 16px 12px;
  box-sizing: border-box;
}

.panel-title {
  font-size: 12px;
  font-weight: bold;
  color: var(--el-text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.suite-workspace {
  padding: 16px;
  box-sizing: border-box;
}

.section-block {
  margin-bottom: 24px;
}

.section-heading {
  margin: 0 0 12px 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

/* 指标卡片网格 */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.metric-card {
  border-radius: 8px;
}

.metric-label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  margin-bottom: 8px;
}

.metric-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--el-text-color-primary);
  font-variant-numeric: tabular-nums;
  display: inline-block;
  min-width: 120px;
}

.metric-unit {
  font-size: 12px;
  font-weight: normal;
  color: var(--el-text-color-secondary);
}

.config-card {
  border-radius: 8px;
  background-color: var(--el-bg-color-page);
}

.nested-footer-wrapper {
  margin-top: 24px;
}
</style>
