<script setup lang="ts">
/**
 * 长单据动态分页防撕裂与动态页码看板。
 *
 * 演示 100 行高密度表格自动物理分页、表头跨页复用、v-print-no-split 行块防截断推移，
 * 以及多页动态页码与总页数插槽注入。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { ref, computed } from 'vue';
import {
  AtengPrintSheet,
  vPrintNoSplit,
  type PaperPreset,
  type PaperOrientation,
} from '@atengk/print-vue';
import { ElMessage } from 'element-plus';

interface PurchaseItem {
  id: number;
  code: string;
  name: string;
  spec: string;
  unit: string;
  qty: number;
  price: number;
  amount: number;
  status: string;
}

// 控件状态
const autoPaginate = ref(true);
const rowCount = ref(100);
const preset = ref<PaperPreset>('a4');
const orientation = ref<PaperOrientation>('portrait');
const scale = ref(0.85);

const sheetRef = ref<InstanceType<typeof AtengPrintSheet> | null>(null);

// 生成 100 行采购单模拟数据
const materials = [
  { name: '微型无刷直流伺服电机', spec: '24V 3000RPM 直径 28mm', unit: '台', price: 185.0 },
  { name: '高精度工业光学编码器', spec: '1024 脉冲/转 差分输出', unit: '个', price: 92.5 },
  { name: '精密行星齿轮减速箱', spec: '减速比 1:10 额定 15N.m', unit: '套', price: 260.0 },
  { name: '嵌入式 CANopen 驱动器', spec: 'DC12-48V 10A 峰值 20A', unit: '块', price: 340.0 },
  { name: '高柔性屏蔽伺服编码器电缆', spec: '4*0.2 + 2*0.5 耐弯曲', unit: '米', price: 14.8 },
  { name: '工业航空插头线束公母对插', spec: 'M12-8芯 A-Code IP67', unit: '套', price: 28.0 },
  { name: '聚氨酯双联防静电同步带', spec: 'HTD-3M 宽度 15mm 齿数 120', unit: '条', price: 36.5 },
];

const purchaseList = computed<PurchaseItem[]>(() => {
  const list: PurchaseItem[] = [];
  for (let i = 1; i <= rowCount.value; i++) {
    const template = materials[(i - 1) % materials.length];
    const qty = ((i * 7) % 50) + 10;
    const amount = Number((qty * template.price).toFixed(2));
    list.push({
      id: i,
      code: `MAT-${String(1000 + i).padStart(6, '0')}`,
      name: template.name,
      spec: template.spec,
      unit: template.unit,
      qty,
      price: template.price,
      amount,
      status: i % 5 === 0 ? '加急直发' : '标准入库',
    });
  }
  return list;
});

const totalAmount = computed(() => {
  return purchaseList.value.reduce((acc, cur) => acc + cur.amount, 0).toFixed(2);
});

const totalQuantity = computed(() => {
  return purchaseList.value.reduce((acc, cur) => acc + cur.qty, 0);
});

const handlePrint = async () => {
  if (!sheetRef.value) return;
  try {
    await sheetRef.value.print();
    ElMessage.success('已拉起浏览器打印调度管线！');
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : '打印执行失败');
  }
};
</script>

<template>
  <div class="pagination-demo">
    <!-- 顶部控制条 -->
    <div class="control-panel">
      <div class="control-group">
        <span class="control-label">防截断引擎：</span>
        <el-switch
          v-model="autoPaginate"
          active-text="开启自动物理分页"
          inactive-text="关闭 (单体长页)"
        />
      </div>

      <div class="control-group">
        <span class="control-label">数据规模：</span>
        <el-radio-group v-model="rowCount" size="small">
          <el-radio-button :value="30">30 行</el-radio-button>
          <el-radio-button :value="60">60 行</el-radio-button>
          <el-radio-button :value="100">100 行 (基准)</el-radio-button>
          <el-radio-button :value="150">150 行</el-radio-button>
        </el-radio-group>
      </div>

      <div class="control-group">
        <span class="control-label">纸张规格：</span>
        <el-select v-model="preset" size="small" style="width: 130px">
          <el-option label="A4 标准单" value="a4" />
          <el-option label="A5 较小单" value="a5" />
          <el-option label="连续针式 241" value="continuous-241-140" />
        </el-select>
      </div>

      <div class="control-group">
        <span class="control-label">方向：</span>
        <el-radio-group v-model="orientation" size="small">
          <el-radio-button value="portrait">纵向</el-radio-button>
          <el-radio-button value="landscape">横向</el-radio-button>
        </el-radio-group>
      </div>

      <div class="control-group" style="width: 220px">
        <span class="control-label">视口缩放：{{ Math.round(scale * 100) }}%</span>
        <el-slider v-model="scale" :min="0.5" :max="1.2" :step="0.05" size="small" />
      </div>

      <div class="control-actions">
        <el-button type="primary" size="small" @click="handlePrint"> 🖨️ 打印当前长单据 </el-button>
      </div>
    </div>

    <!-- 状态指示横幅 -->
    <el-alert
      v-if="autoPaginate"
      type="success"
      :closable="false"
      show-icon
      title="动态分页防截断引擎已生效"
      description="自动检测 100 行表格与底边物理切点，跨页行整体完整推移至下一页起始，续页自动补齐表头并在每页底部注入实时页码插槽。"
      class="alert-box"
    />
    <el-alert
      v-else
      type="warning"
      :closable="false"
      show-icon
      title="动态分页引擎已关闭（单长页模式）"
      description="整张 100 行表格将在单一视口中渲染；调用浏览器打印时可能导致行文本被物理纸张边缘拦腰切断。"
      class="alert-box"
    />

    <!-- 单据视口与仿真排版容器 -->
    <div class="sheet-viewport">
      <AtengPrintSheet
        ref="sheetRef"
        :auto-paginate="autoPaginate"
        :preset="preset"
        :orientation="orientation"
        :scale="scale"
        padding="12mm"
      >
        <!-- 动态页眉插槽 -->
        <template #header="{ pageIndex, totalPages }">
          <div class="order-header">
            <div class="order-header-top">
              <div class="company-brand">
                <span class="brand-logo">🏛️</span>
                <span class="brand-name">阿腾工业装备制造有限公司</span>
              </div>
              <div class="order-title">物料采购出入库结算单</div>
              <div class="order-page-badge">第 {{ pageIndex }} 页 / 共 {{ totalPages }} 页</div>
            </div>
            <div class="order-meta-grid">
              <div><strong>单据编号：</strong>PO-20261110-8899</div>
              <div><strong>供应商：</strong>阿腾智能高精部件工业生态协同仓</div>
              <div><strong>制单日期：</strong>2026-11-10</div>
              <div><strong>结算币种：</strong>CNY (人民币)</div>
            </div>
          </div>
        </template>

        <!-- 主体单据内容（100 行表格与尾部卡片） -->
        <div class="order-body">
          <table class="order-table">
            <thead>
              <tr>
                <th style="width: 50px">序号</th>
                <th style="width: 120px">物料编码</th>
                <th>物料名称与规格型号</th>
                <th style="width: 60px">单位</th>
                <th style="width: 70px">数量</th>
                <th style="width: 80px">单价(元)</th>
                <th style="width: 90px">小计金额</th>
                <th style="width: 80px">状态</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in purchaseList"
                :key="item.id"
                v-print-no-split
                :class="{ 'zebra-row': item.id % 2 === 0 }"
              >
                <td style="text-align: center">{{ item.id }}</td>
                <td style="font-family: monospace">{{ item.code }}</td>
                <td>
                  <div class="item-name">{{ item.name }}</div>
                  <div class="item-spec">{{ item.spec }}</div>
                </td>
                <td style="text-align: center">{{ item.unit }}</td>
                <td style="text-align: right">{{ item.qty }}</td>
                <td style="text-align: right">{{ item.price.toFixed(2) }}</td>
                <td style="text-align: right; font-weight: bold">{{ item.amount.toFixed(2) }}</td>
                <td style="text-align: center">
                  <span class="badge" :class="item.id % 5 === 0 ? 'badge-urgent' : 'badge-std'">
                    {{ item.status }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- 结算汇总卡片（防截断） -->
          <div v-print-no-split class="order-summary-card">
            <div class="summary-item">
              <span>合计总数量：</span>
              <strong>{{ totalQuantity }} 件</strong>
            </div>
            <div class="summary-item">
              <span>采购总金额（含税）：</span>
              <strong class="total-price">¥ {{ totalAmount }}</strong>
            </div>
          </div>

          <!-- 签字审核栏（防截断） -->
          <div v-print-no-split class="order-sign-section">
            <div class="sign-col">制单人：<span>Ateng</span></div>
            <div class="sign-col">库管核验：<span>__________</span></div>
            <div class="sign-col">质检验收：<span>__________</span></div>
            <div class="sign-col">财务审核：<span>__________</span></div>
          </div>
        </div>

        <!-- 动态页脚插槽 -->
        <template #footer="{ pageIndex, totalPages }">
          <div class="order-footer">
            <div class="footer-left">
              注：本单据一式三联，加盖阿腾工业装备制造检验专用章后生效。
            </div>
            <div class="footer-center">第 {{ pageIndex }} 页 / 共 {{ totalPages }} 页</div>
            <div class="footer-right">打印时间：2026-11-10 08:00:00</div>
          </div>
        </template>
      </AtengPrintSheet>
    </div>
  </div>
</template>

<style scoped>
.pagination-demo {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.control-panel {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  background: #ffffff;
  padding: 12px 16px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.control-group {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.control-label {
  color: #475569;
  font-weight: 500;
  white-space: nowrap;
}

.control-actions {
  margin-left: auto;
}

.alert-box {
  margin-bottom: 4px;
}

.sheet-viewport {
  display: flex;
  justify-content: center;
  padding: 24px;
  background: #e2e8f0;
  border-radius: 8px;
  min-height: 800px;
  overflow: auto;
}

/* 采购单视觉样式 */
.order-header {
  border-bottom: 2px solid #0f172a;
  padding-bottom: 8px;
  margin-bottom: 8px;
}

.order-header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.company-brand {
  font-size: 13px;
  color: #475569;
  display: flex;
  align-items: center;
  gap: 4px;
}

.order-title {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: 1px;
}

.order-page-badge {
  font-size: 12px;
  font-weight: bold;
  color: #2563eb;
  background: #eff6ff;
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid #bfdbfe;
}

.order-meta-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  font-size: 11px;
  color: #334155;
  gap: 4px;
}

.order-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
  margin-bottom: 8px;
}

.order-table th {
  background-color: #f8fafc;
  border: 1px solid #94a3b8;
  padding: 6px 4px;
  font-weight: 600;
  color: #1e293b;
  text-align: center;
}

.order-table td {
  border: 1px solid #cbd5e1;
  padding: 4px 6px;
  color: #334155;
}

.zebra-row {
  background-color: #f8fafc;
}

.item-name {
  font-weight: 500;
  color: #0f172a;
}

.item-spec {
  font-size: 10px;
  color: #64748b;
}

.badge {
  font-size: 10px;
  padding: 1px 4px;
  border-radius: 3px;
}

.badge-std {
  background: #f1f5f9;
  color: #475569;
}

.badge-urgent {
  background: #fee2e2;
  color: #dc2626;
  font-weight: bold;
}

.order-summary-card {
  display: flex;
  justify-content: flex-end;
  gap: 24px;
  padding: 8px 12px;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  margin-top: 8px;
  font-size: 12px;
}

.total-price {
  color: #dc2626;
  font-size: 14px;
}

.order-sign-section {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  font-size: 11px;
  margin-top: 16px;
  padding-top: 8px;
  border-top: 1px dashed #cbd5e1;
}

.sign-col span {
  display: inline-block;
  min-width: 60px;
}

.order-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 10px;
  color: #64748b;
  border-top: 1px solid #e2e8f0;
  padding-top: 4px;
}
</style>
