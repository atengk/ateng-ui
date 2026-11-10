<script setup lang="ts">
/**
 * 商业连续热敏小票单据预设组件。
 *
 * 规范 58mm / 80mm 商用小票收银排版，包含明细流水、优惠结算、取餐排队条码与底部锯齿撕纸线。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { computed } from 'vue';
import type { AtengReceiptSheetProps, ReceiptItem } from '../../types/presets';

const props = withDefaults(defineProps<AtengReceiptSheetProps>(), {
  widthPreset: 'receipt-80',
  storeName: '星巴克臻选咖啡 (创智天地店)',
  orderNo: () => `TK-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-8892`,
  cashier: '008号 收银员',
  time: () => new Date().toLocaleString(),
  items: () => [
    { name: '燕麦丝绒拿铁 (大杯/热)', qty: 1, price: 38.0 },
    { name: '经典美式咖啡 (超大杯/冰)', qty: 2, price: 30.0 },
    { name: '法式黄油可颂', qty: 1, price: 18.0 },
  ],
  totalAmount: undefined,
  discount: 5.0,
  paymentMethod: '微信刷卡支付',
  barcode: '9882 1092 8819',
  footerMessage: '凭此单据可至取餐台叫号取餐，如需电子发票请扫码开票。谢谢惠顾！',
});

/** 计算商品应付总额 */
const computedTotal = computed<number>(() => {
  if (typeof props.totalAmount === 'number') {
    return props.totalAmount;
  }
  const sum =
    props.items?.reduce((acc: number, item: ReceiptItem) => {
      return acc + (typeof item.amount === 'number' ? item.amount : item.price * item.qty);
    }, 0) || 0;
  return Math.max(0, sum - (props.discount || 0));
});

const is58mm = computed(() => props.widthPreset === 'receipt-58');
</script>

<template>
  <div
    class="at-receipt-sheet"
    :class="{ 'at-receipt-sheet--58mm': is58mm, 'at-receipt-sheet--80mm': !is58mm }"
  >
    <!-- 头部商户信息 -->
    <div class="at-receipt-sheet__header">
      <h3 class="store-name">{{ storeName }}</h3>
      <div class="meta-line">单号: {{ orderNo }}</div>
      <div class="meta-line">收银员: {{ cashier }}</div>
      <div class="meta-line">时间: {{ time }}</div>
    </div>

    <div class="at-receipt-sheet__divider">--------------------------------</div>

    <!-- 商品明细 -->
    <table class="at-receipt-sheet__items-table">
      <thead>
        <tr>
          <th style="text-align: left">品名</th>
          <th style="width: 35px; text-align: center">数量</th>
          <th style="width: 55px; text-align: right">金额</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(item, idx) in items" :key="idx">
          <td>{{ item.name }}</td>
          <td style="text-align: center">x{{ item.qty }}</td>
          <td style="text-align: right">
            ¥{{
              (typeof item.amount === 'number' ? item.amount : item.price * item.qty).toFixed(2)
            }}
          </td>
        </tr>
      </tbody>
    </table>

    <div class="at-receipt-sheet__divider">--------------------------------</div>

    <!-- 结算汇总 -->
    <div class="at-receipt-sheet__summary">
      <div v-if="discount && discount > 0" class="summary-row">
        <span>优惠立减：</span>
        <span>-¥{{ discount.toFixed(2) }}</span>
      </div>
      <div class="summary-row total">
        <span>实付总计：</span>
        <span class="total-price">¥{{ computedTotal.toFixed(2) }}</span>
      </div>
      <div class="summary-row">
        <span>支付方式：</span>
        <span>{{ paymentMethod }}</span>
      </div>
    </div>

    <!-- 条形码与取餐码 -->
    <div v-if="barcode" class="at-receipt-sheet__barcode-box">
      <div class="barcode-graphic">
        <span
          v-for="n in 36"
          :key="n"
          class="bar-line"
          :style="{ width: (n % 3 === 0 ? 3 : 1) + 'px' }"
        ></span>
      </div>
      <div class="barcode-text">{{ barcode }}</div>
    </div>

    <!-- 底部问候语 -->
    <div class="at-receipt-sheet__footer">
      <p>{{ footerMessage }}</p>
    </div>

    <!-- 锯齿撕纸虚线 -->
    <div class="at-receipt-sheet__tear-line">
      <span>- - - - - - - - - ✂ 撕纸线 - - - - - - - - -</span>
    </div>
  </div>
</template>

<style scoped>
.at-receipt-sheet {
  background-color: #ffffff;
  color: #000000;
  font-family: Consolas, 'Courier New', monospace, sans-serif;
  margin: 0 auto;
  box-sizing: border-box;
}

.at-receipt-sheet--80mm {
  width: 76mm;
  padding: 10px 14px;
  font-size: 13px;
}

.at-receipt-sheet--58mm {
  width: 54mm;
  padding: 6px 8px;
  font-size: 11px;
}

.at-receipt-sheet__header {
  text-align: center;
  margin-bottom: 8px;
}

.store-name {
  margin: 0 0 6px;
  font-size: 16px;
  font-weight: bold;
}

.at-receipt-sheet--58mm .store-name {
  font-size: 14px;
}

.meta-line {
  font-size: 11px;
  color: #333333;
  margin-top: 2px;
}

.at-receipt-sheet__divider {
  text-align: center;
  color: #666666;
  margin: 6px 0;
  overflow: hidden;
  letter-spacing: -1px;
}

.at-receipt-sheet__items-table {
  width: 100%;
  border-collapse: collapse;
}

.at-receipt-sheet__items-table th,
.at-receipt-sheet__items-table td {
  padding: 3px 0;
}

.at-receipt-sheet__items-table th {
  border-bottom: 1px dashed #666666;
  font-weight: bold;
}

.at-receipt-sheet__summary {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin: 6px 0;
}

.summary-row {
  display: flex;
  justify-content: space-between;
}

.summary-row.total {
  font-size: 15px;
  font-weight: bold;
  padding: 4px 0;
  border-top: 1px dashed #000000;
  border-bottom: 1px dashed #000000;
}

.at-receipt-sheet--58mm .summary-row.total {
  font-size: 13px;
}

.total-price {
  color: #000000;
}

.at-receipt-sheet__barcode-box {
  text-align: center;
  margin: 10px 0;
}

.barcode-graphic {
  display: inline-flex;
  height: 32px;
  align-items: stretch;
  gap: 2px;
}

.bar-line {
  background-color: #000000;
  display: inline-block;
}

.barcode-text {
  font-size: 12px;
  letter-spacing: 2px;
  margin-top: 4px;
}

.at-receipt-sheet__footer {
  text-align: center;
  font-size: 11px;
  color: #444444;
  margin: 8px 0;
}

.at-receipt-sheet__tear-line {
  text-align: center;
  font-size: 10px;
  color: #888888;
  margin-top: 12px;
  padding-top: 6px;
  border-top: 1px dashed #cccccc;
}
</style>
