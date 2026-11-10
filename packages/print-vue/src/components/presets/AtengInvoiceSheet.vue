<script setup lang="ts">
/**
 * 企业标准物资销售发票与结算单据预设组件。
 *
 * 遵循现代企业结算凭证规约，集成明细表格、大写金额自动转换、经手人签字与电子印章加盖。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { computed } from 'vue';
import type { AtengInvoiceSheetProps, InvoiceItem } from '../../types/presets';
import { digitUppercase } from '../../utils/currency';
import AtengPrintSeal from '../AtengPrintSeal.vue';

const props = withDefaults(defineProps<AtengInvoiceSheetProps>(), {
  title: '企业商品物资销售发货与结算单',
  orderNo: () => `IV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-001`,
  date: () => new Date().toISOString().slice(0, 10),
  customer: '常州华科智能制造实业有限公司',
  seller: '上海蚂蚁数字化智能科技有限公司',
  warehouse: '华东自营 1 号总仓',
  items: () => [
    {
      name: '工业高性能伺服驱动器 24V',
      spec: 'DC12-48V 10A 峰值 20A',
      unit: '台',
      qty: 4,
      price: 340.0,
    },
    { name: '微型无刷直流电机', spec: '24V 3000RPM 直径 28mm', unit: '台', qty: 4, price: 185.0 },
    {
      name: '高柔性屏蔽编码器电缆',
      spec: '4*0.2 + 2*0.5 耐弯曲',
      unit: '米',
      qty: 20,
      price: 14.8,
    },
  ],
  remarks: '请于到货后 48 小时内核对外观完好与出厂合格证，凭本单提货结算。',
  operator: '张建国 (财务制单)',
  auditor: '李志远 (复核/仓管)',
  receiver: '王振华 (收货代表)',
  showSeal: true,
  sealCompany: '上海蚂蚁数字化智能科技有限公司',
  sealTitle: '财务发货专用章',
  sealCode: '91310115MA1H888888',
});

/** 计算总金额 */
const totalAmount = computed<number>(() => {
  if (!props.items || props.items.length === 0) return 0;
  return props.items.reduce((sum: number, item: InvoiceItem) => {
    const itemAmount = typeof item.amount === 'number' ? item.amount : item.price * item.qty;
    return sum + itemAmount;
  }, 0);
});

/** 人民币大写金额 */
const uppercaseAmount = computed<string>(() => {
  return digitUppercase(totalAmount.value);
});
</script>

<template>
  <div class="at-invoice-sheet">
    <!-- 单据表头 -->
    <div class="at-invoice-sheet__header">
      <h2 class="at-invoice-sheet__title">{{ title }}</h2>
      <div class="at-invoice-sheet__meta">
        <span
          >单据编号: <strong>{{ orderNo }}</strong></span
        >
        <span>开票日期: {{ date }}</span>
        <span>发货仓库: {{ warehouse }}</span>
      </div>
    </div>

    <!-- 购销双方信息 -->
    <div class="at-invoice-sheet__parties">
      <div class="at-invoice-sheet__party-col">
        <span class="label">购货客户：</span>
        <span class="value">{{ customer }}</span>
      </div>
      <div class="at-invoice-sheet__party-col">
        <span class="label">销货单位：</span>
        <span class="value">{{ seller }}</span>
      </div>
    </div>

    <!-- 商品明细表格 -->
    <table class="at-invoice-sheet__table">
      <thead>
        <tr>
          <th style="width: 45px; text-align: center">序号</th>
          <th style="text-align: left">物资品名</th>
          <th style="text-align: left">规格型号</th>
          <th style="width: 50px; text-align: center">单位</th>
          <th style="width: 70px; text-align: right">数量</th>
          <th style="width: 85px; text-align: right">含税单价</th>
          <th style="width: 95px; text-align: right">金额小计</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(item, idx) in items" :key="idx">
          <td style="text-align: center">{{ idx + 1 }}</td>
          <td>
            <strong>{{ item.name }}</strong>
          </td>
          <td class="spec-col">{{ item.spec || '-' }}</td>
          <td style="text-align: center">{{ item.unit }}</td>
          <td style="text-align: right">{{ item.qty }}</td>
          <td style="text-align: right">¥{{ item.price.toFixed(2) }}</td>
          <td style="text-align: right; font-weight: bold">
            ¥{{
              (typeof item.amount === 'number' ? item.amount : item.price * item.qty).toFixed(2)
            }}
          </td>
        </tr>
      </tbody>
      <tfoot>
        <tr class="total-row">
          <td colspan="2" style="text-align: center; font-weight: bold">合计人民币 (大写)</td>
          <td colspan="3" class="uppercase-col">{{ uppercaseAmount }}</td>
          <td style="text-align: right; font-weight: bold">小写合计:</td>
          <td style="text-align: right; font-weight: bold; color: #dc2626">
            ¥{{ totalAmount.toFixed(2) }}
          </td>
        </tr>
      </tfoot>
    </table>

    <!-- 备注说明 -->
    <div v-if="remarks" class="at-invoice-sheet__remarks">
      <span class="label">备注意见：</span>
      <span class="text">{{ remarks }}</span>
    </div>

    <!-- 签名与印章栏 -->
    <div class="at-invoice-sheet__footer">
      <div class="sign-item">制单开票：{{ operator }}</div>
      <div class="sign-item">核对复核：{{ auditor }}</div>
      <div class="sign-item">提货签收：{{ receiver }}</div>

      <!-- 电子印章 -->
      <slot name="seal">
        <AtengPrintSeal
          v-if="showSeal"
          :company="sealCompany"
          :title="sealTitle"
          :code="sealCode"
          :size="115"
          color="#dc2626"
          :rotate="-15"
          bottom="10px"
          right="30px"
        />
      </slot>
    </div>
  </div>
</template>

<style scoped>
.at-invoice-sheet {
  position: relative;
  background-color: #ffffff;
  padding: 24px 28px;
  color: #0f172a;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  max-width: 800px;
  margin: 0 auto;
}

.at-invoice-sheet__header {
  text-align: center;
  border-bottom: 2px solid #0284c7;
  padding-bottom: 12px;
  margin-bottom: 16px;
}

.at-invoice-sheet__title {
  margin: 0;
  font-size: 20px;
  letter-spacing: 2px;
  color: #0f172a;
}

.at-invoice-sheet__meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #64748b;
  margin-top: 6px;
}

.at-invoice-sheet__parties {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  margin-bottom: 14px;
}

.at-invoice-sheet__party-col .label {
  font-weight: 600;
  color: #334155;
}

.at-invoice-sheet__party-col .value {
  color: #0f172a;
}

.at-invoice-sheet__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  margin-bottom: 14px;
}

.at-invoice-sheet__table th,
.at-invoice-sheet__table td {
  border: 1px solid #cbd5e1;
  padding: 6px 8px;
}

.at-invoice-sheet__table th {
  background-color: #f8fafc;
  font-weight: 600;
  color: #1e293b;
}

.spec-col {
  font-size: 11px;
  color: #475569;
}

.total-row {
  background-color: #f1f5f9;
}

.uppercase-col {
  font-weight: bold;
  letter-spacing: 1px;
  color: #0284c7;
}

.at-invoice-sheet__remarks {
  font-size: 12px;
  background-color: #f8fafc;
  padding: 8px 12px;
  border-radius: 4px;
  margin-bottom: 16px;
  border: 1px dashed #cbd5e1;
}

.at-invoice-sheet__remarks .label {
  font-weight: 600;
  color: #475569;
}

.at-invoice-sheet__remarks .text {
  color: #334155;
}

.at-invoice-sheet__footer {
  position: relative;
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #475569;
  padding-top: 12px;
  border-top: 1px solid #cbd5e1;
  margin-top: 24px;
}

.sign-item {
  min-width: 160px;
}
</style>
