<script setup lang="ts">
/**
 * 快递物流三段码标准电子面单预设组件。
 *
 * 规范标准快递 100mm × 150mm 热敏电子面单排版，包含大字路由分拣码、条码插槽与收寄件地址网格。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import type { AtengWaybillSheetProps } from '../../types/presets';

withDefaults(defineProps<AtengWaybillSheetProps>(), {
  expressName: '顺丰特快 (标杆专运)',
  trackingNo: 'SF108293810298',
  routingCode: '021 - 058 - A09',
  packageHub: '华东杭州转运中心',
  sender: () => ({
    name: '李晓明',
    phone: '138****5678',
    region: '上海市浦东新区',
    address: '张江高科纳贤路 800 号 3 幢 5 楼',
    company: '蚂蚁数智科技供应链事业部',
  }),
  receiver: () => ({
    name: '张建军',
    phone: '186****1234',
    region: '广东省深圳市南山区',
    address: '粤海街道科苑南路科技生态园 10 栋 A 座 1201',
    company: '深圳大族精密自动化制造中心',
  }),
  cargoName: '精密无刷电机及工控配件 * 1 箱',
  weight: '2.8 kg',
  itemCount: 1,
  freightType: '寄付月结 (账号: 02100892)',
  codAmount: undefined,
});
</script>

<template>
  <div class="at-waybill-sheet">
    <!-- 头部：品牌与大字三段码 -->
    <div class="at-waybill-sheet__header">
      <div class="carrier-name">{{ expressName }}</div>
      <div class="package-hub">{{ packageHub }}</div>
    </div>

    <!-- 大字路由分拣码 -->
    <div class="at-waybill-sheet__routing-box">
      <div class="routing-label">分拣集包码</div>
      <div class="routing-code">{{ routingCode }}</div>
    </div>

    <!-- 运单条形码展示区 -->
    <div class="at-waybill-sheet__barcode-area">
      <div class="barcode-graphic">
        <span
          v-for="n in 48"
          :key="n"
          class="bar-line"
          :style="{ width: (n % 4 === 0 ? 3 : 1) + 'px' }"
        ></span>
      </div>
      <div class="tracking-no">{{ trackingNo }}</div>
    </div>

    <!-- 收件人区域 (核心重点高亮) -->
    <div class="at-waybill-sheet__contact-box at-waybill-sheet__contact-box--receiver">
      <div class="contact-badge">收</div>
      <div class="contact-details">
        <div class="contact-name-row">
          <strong class="name">{{ receiver?.name }}</strong>
          <span class="phone">{{ receiver?.phone }}</span>
        </div>
        <div class="contact-address">
          <strong>{{ receiver?.region }}</strong> {{ receiver?.address }}
        </div>
        <div v-if="receiver?.company" class="contact-company">
          {{ receiver?.company }}
        </div>
      </div>
    </div>

    <!-- 寄件人区域 -->
    <div class="at-waybill-sheet__contact-box at-waybill-sheet__contact-box--sender">
      <div class="contact-badge">寄</div>
      <div class="contact-details">
        <div class="contact-name-row">
          <span class="name">{{ sender?.name }}</span>
          <span class="phone">{{ sender?.phone }}</span>
        </div>
        <div class="contact-address">{{ sender?.region }} {{ sender?.address }}</div>
      </div>
    </div>

    <!-- 托寄物明细与计费信息 -->
    <div class="at-waybill-sheet__cargo-info">
      <div class="cargo-row">
        <span
          >托寄物品：<strong>{{ cargoName }}</strong></span
        >
        <span
          >计费重量：<strong>{{ weight }}</strong></span
        >
      </div>
      <div class="cargo-row">
        <span>运费支付：{{ freightType }}</span>
        <span v-if="codAmount"
          >代收货款：<strong class="cod-val">¥{{ codAmount.toFixed(2) }}</strong></span
        >
      </div>
    </div>

    <!-- 底部存根虚线与签名核收 -->
    <div class="at-waybill-sheet__footer-stub">
      <div class="stub-meta">
        <span>签收栏：____________</span>
        <span>签收日期：____年__月__日</span>
      </div>
      <div class="stub-note">快递收发已完成实名验证与安检，如有破损请当场开箱验视。</div>
    </div>
  </div>
</template>

<style scoped>
.at-waybill-sheet {
  width: 98mm;
  min-height: 145mm;
  background-color: #ffffff;
  border: 1px solid #000000;
  box-sizing: border-box;
  padding: 8px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #000000;
  margin: 0 auto;
}

.at-waybill-sheet__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid #000000;
  padding-bottom: 4px;
}

.carrier-name {
  font-size: 16px;
  font-weight: 900;
  letter-spacing: 1px;
}

.package-hub {
  font-size: 12px;
  font-weight: bold;
}

.at-waybill-sheet__routing-box {
  background-color: #000000;
  color: #ffffff;
  padding: 6px 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 4px 0;
}

.routing-label {
  font-size: 10px;
  background-color: #ffffff;
  color: #000000;
  padding: 1px 4px;
  font-weight: bold;
}

.routing-code {
  font-size: 20px;
  font-weight: 900;
  letter-spacing: 2px;
}

.at-waybill-sheet__barcode-area {
  text-align: center;
  padding: 6px 0;
  border-bottom: 1px solid #000000;
}

.barcode-graphic {
  display: inline-flex;
  height: 38px;
  align-items: stretch;
  gap: 2px;
}

.bar-line {
  background-color: #000000;
  display: inline-block;
}

.tracking-no {
  font-size: 13px;
  font-weight: bold;
  letter-spacing: 2px;
  margin-top: 2px;
}

.at-waybill-sheet__contact-box {
  display: flex;
  gap: 8px;
  padding: 6px 4px;
  border-bottom: 1px solid #000000;
}

.contact-badge {
  width: 22px;
  height: 22px;
  background-color: #000000;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  border-radius: 2px;
  flex-shrink: 0;
}

.at-waybill-sheet__contact-box--receiver .name {
  font-size: 15px;
}

.contact-details {
  flex: 1;
}

.contact-name-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}

.contact-address {
  font-size: 12px;
  margin-top: 2px;
  line-height: 1.3;
}

.contact-company {
  font-size: 11px;
  color: #444444;
}

.at-waybill-sheet__contact-box--sender {
  background-color: #f8fafc;
}

.at-waybill-sheet__contact-box--sender .contact-badge {
  background-color: #64748b;
}

.at-waybill-sheet__cargo-info {
  padding: 6px 4px;
  font-size: 11px;
  border-bottom: 1px dashed #000000;
}

.cargo-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 2px;
}

.cod-val {
  color: #dc2626;
}

.at-waybill-sheet__footer-stub {
  padding: 6px 4px;
  font-size: 11px;
}

.stub-meta {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.stub-note {
  font-size: 9px;
  color: #666666;
}
</style>
