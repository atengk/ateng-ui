<script setup lang="ts">
/**
 * 脱壳模态弹窗填报场景看板。
 *
 * 对应 ADR-0049 弹窗脱壳架构，演示 Teleport 挂载、全屏切换、0x0 自愈与确认数据回传。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { ref } from 'vue';
import {
  AtengSpreadsheetModal,
  type SpreadsheetRecord,
  type SpreadsheetColumn,
  type SpreadsheetSnapshot,
} from '@atengk/spreadsheet-vue';

const isModalVisible = ref(false);
const submittedResult = ref<string>('');

// 待弹窗填报的产品批量调价清单
const productPriceList = ref<SpreadsheetRecord[]>([
  {
    productSku: 'SKU-APPLE-16-PRO',
    name: '旗舰级移动计算终端 (256GB)',
    costPrice: 5999,
    retailPrice: 7999,
    discountRate: '15%',
  },
  {
    productSku: 'SKU-MACBOOK-AIR-M3',
    name: '轻薄生产力便携本 (16GB+512GB)',
    costPrice: 6899,
    retailPrice: 8999,
    discountRate: '10%',
  },
  {
    productSku: 'SKU-STUDIO-DISPLAY-27',
    name: '5K 超视网膜专业级显示器',
    costPrice: 8999,
    retailPrice: 11499,
    discountRate: '5%',
  },
]);

const modalColumns: SpreadsheetColumn[] = [
  { key: 'productSku', title: '商品 SKU', width: 180, required: true },
  { key: 'name', title: '商品品名', width: 220, required: true },
  { key: 'costPrice', title: '进货成本(元)', width: 120 },
  { key: 'retailPrice', title: '建议零售价(元)', width: 130 },
  { key: 'discountRate', title: '活动折扣率', width: 110 },
];

/**
 * 确认保存回调。
 */
const handleConfirm = (payload: {
  snapshot: SpreadsheetSnapshot;
  data: SpreadsheetRecord[];
}): void => {
  productPriceList.value = payload.data;
  submittedResult.value = JSON.stringify(
    {
      confirmedAt: new Date().toISOString(),
      recordCount: payload.data.length,
      data: payload.data,
    },
    null,
    2,
  );
};

/**
 * 取消回调。
 */
const handleCancel = (): void => {
  // 取消处理
};
</script>

<template>
  <div class="modal-dialog-view">
    <div class="dashboard-toolbar">
      <div class="toolbar-title">
        <h3>脱壳模态弹窗看板 (&lt;AtengSpreadsheetModal /&gt;)</h3>
        <p>
          Vue 3 原生 Teleport 驱动，100% 物理脱耦 Element Plus，打开时通过 ResizeGuard 自动自愈 0x0
          视口
        </p>
      </div>

      <div class="toolbar-actions">
        <button
          class="at-demo-btn at-demo-btn--primary"
          type="button"
          @click="isModalVisible = true"
        >
          打开批量调价模态弹窗
        </button>
      </div>
    </div>

    <!-- 弹窗组件 -->
    <AtengSpreadsheetModal
      v-model:visible="isModalVisible"
      title="电商大促商品批量调价工作台"
      :data="productPriceList"
      :columns="modalColumns"
      confirm-text="确认调价生效"
      cancel-text="放弃修改"
      @confirm="handleConfirm"
      @cancel="handleCancel"
    >
      <template #trigger="{ open }">
        <div class="trigger-card">
          <p>当前调价列表共 {{ productPriceList.length }} 件商品，点击下方按钮唤起弹窗：</p>
          <button class="at-demo-btn at-demo-btn--primary" type="button" @click="open">
            唤起模态弹窗 (插槽驱动)
          </button>
        </div>
      </template>
    </AtengSpreadsheetModal>

    <!-- 提交结果回显 -->
    <div v-if="submittedResult" class="submit-echo-card">
      <div class="echo-header">
        <h4>弹窗 @confirm 回传数据确认 (已成功同步回显)</h4>
        <button class="at-demo-btn-text" type="button" @click="submittedResult = ''">
          清空回显
        </button>
      </div>
      <pre class="echo-body">{{ submittedResult }}</pre>
    </div>
  </div>
</template>

<style scoped>
.modal-dialog-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.dashboard-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background-color: var(--at-spreadsheet-bg, #ffffff);
  border: 1px solid var(--at-spreadsheet-border-color, #e4e7ed);
  border-radius: 6px;
}

.toolbar-title h3 {
  margin: 0 0 4px;
  font-size: 16px;
}

.toolbar-title p {
  margin: 0;
  font-size: 12px;
  color: #909399;
}

.trigger-card {
  padding: 24px;
  background-color: #ffffff;
  border: 1px dashed #dcdfe6;
  border-radius: 6px;
  text-align: center;
}

.trigger-card p {
  margin: 0 0 16px;
  color: #606266;
}

.at-demo-btn {
  padding: 6px 14px;
  font-size: 13px;
  border-radius: 4px;
  border: 1px solid #dcdfe6;
  background-color: #ffffff;
  cursor: pointer;
  transition: all 0.2s;
}

.at-demo-btn:hover {
  border-color: #409eff;
  color: #409eff;
}

.at-demo-btn--primary {
  background-color: #409eff;
  border-color: #409eff;
  color: #ffffff;
}

.at-demo-btn-text {
  background: transparent;
  border: none;
  color: #409eff;
  cursor: pointer;
  font-size: 12px;
}

.submit-echo-card {
  background-color: #1e1e1e;
  border-radius: 6px;
  padding: 14px;
  color: #d4d4d4;
  font-family: monospace;
  font-size: 12px;
}

.echo-header {
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid #333;
  padding-bottom: 8px;
  margin-bottom: 8px;
}

.echo-header h4 {
  margin: 0;
  color: #67c23a;
  font-size: 13px;
}

.echo-body {
  margin: 0;
  max-height: 220px;
  overflow: auto;
}
</style>
