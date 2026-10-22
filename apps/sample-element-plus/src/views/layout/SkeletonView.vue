<script setup lang="ts">
/**
 * 页面骨架屏占位容器 AtengPageSkeleton 自验页面。
 *
 * @author Ateng
 * @since 2026-10-22
 */

import { ref } from 'vue';
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
} from 'element-plus';
import { AtengPageSkeleton, type AtengSkeletonType } from '@atengk/element-plus';

const currentType = ref<AtengSkeletonType>('table');
const isLoading = ref(true);

const toggleLoading = () => {
  isLoading.value = !isLoading.value;
};

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
        title="4 大典型后台骨架模态"
        type="info"
        description="开箱即用支持 table（检索表单+表格）、form（表单栅格）、detail（详情结构）、card（卡片网格）四大高频后台预设；数据加载完成时自带平滑淡入淡出（Fade Transition）过渡，消除突变与闪变。"
        show-icon
        :closable="false"
        style="margin-bottom: 20px"
      />

      <div class="ctrl-bar">
        <span>骨架屏预设模态：</span>
        <ElRadioGroup v-model="currentType" size="small">
          <ElRadioButton value="table">表格型 (table)</ElRadioButton>
          <ElRadioButton value="form">表单型 (form)</ElRadioButton>
          <ElRadioButton value="detail">详情型 (detail)</ElRadioButton>
          <ElRadioButton value="card">卡片型 (card)</ElRadioButton>
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

.query-title {
  font-size: 15px;
  font-weight: 600;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.product-card {
  padding: 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: var(--el-border-radius-base);
  background-color: var(--el-fill-color-blank);
}
</style>
