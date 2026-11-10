<script setup lang="ts">
/**
 * 多规格纸张与排版仿真看板。
 *
 * 验证 A4、A5、58/80mm 热敏连续卷纸、241mm 针式多联单预设、
 * 毫米网格标尺 AtengPrintRuler、十字准星感知、视口仿真缩放、AtengPrintBreak 强制分页
 * 以及 4 大企业高频单据预设（发票结算单、热敏小票、快递面单、仓储货架标签）。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import {
  AtengPrintSheet,
  AtengPrintRuler,
  AtengPrintBreak,
  AtengInvoiceSheet,
  AtengReceiptSheet,
  AtengWaybillSheet,
  AtengLabelSheet,
  usePrint,
  type PaperPreset,
  type PaperOrientation,
} from '@atengk/print-vue';

// 视图模式：通用仿真 或 4 大企业高频单据预设
const sheetMode = ref<'custom' | 'invoice' | 'receipt' | 'waybill' | 'label'>('custom');

// 通用纸张设置
const selectedPreset = ref<PaperPreset>('a4');
const selectedOrientation = ref<PaperOrientation>('portrait');
const padding = ref('12mm');
const scale = ref(0.9);
const offsetX = ref(0);
const offsetY = ref(0);
const showRuler = ref(true);
const showCrosshair = ref(true);
const gridLines = ref(false);

// 小票与标签特定配置
const receiptPreset = ref<'receipt-80' | 'receipt-58'>('receipt-80');
const labelSizePreset = ref<'small' | 'medium' | 'large'>('large');

const { isPrinting, print } = usePrint();

const handlePrint = async () => {
  try {
    await print('#standard-sheet-preview', {
      onSuccess: () => {
        ElMessage.success('已成功唤起浏览器打印对话框');
      },
      onError: err => {
        ElMessage.error(`打印失败: ${err.message}`);
      },
    });
  } catch {
    // 异常已由 onError 接管
  }
};
</script>

<template>
  <div class="standard-sheets-container">
    <el-card shadow="never" class="control-panel">
      <template #header>
        <div class="panel-header">
          <span class="panel-title">📐 物理纸张排版规格与单据预设控制台</span>
          <div class="panel-actions">
            <el-tag size="small" type="info">当前模式: {{ sheetMode }}</el-tag>
            <el-button type="primary" size="small" :loading="isPrinting" @click="handlePrint">
              🖨️ 打印当前单据
            </el-button>
          </div>
        </div>
      </template>

      <el-form label-width="110px" size="default">
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="单据场景选择">
              <el-radio-group v-model="sheetMode">
                <el-radio-button value="custom">通用单据与标尺仿真</el-radio-button>
                <el-radio-button value="invoice">销售结算发票 (Invoice)</el-radio-button>
                <el-radio-button value="receipt">热敏收银小票 (Receipt)</el-radio-button>
                <el-radio-button value="waybill">三段码快递面单 (Waybill)</el-radio-button>
                <el-radio-button value="label">仓储物料标签 (Label)</el-radio-button>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 通用模式专属设置 -->
        <template v-if="sheetMode === 'custom'">
          <el-row :gutter="20">
            <el-col :span="6">
              <el-form-item label="纸张预设">
                <el-select v-model="selectedPreset" style="width: 100%">
                  <el-option label="A4 标准单据 (210×297mm)" value="a4" />
                  <el-option label="A5 便携票据 (148×210mm)" value="a5" />
                  <el-option label="80mm 热敏连续卷纸" value="receipt-80" />
                  <el-option label="58mm 热敏连续卷纸" value="receipt-58" />
                  <el-option label="241×140mm 针式二等分单" value="continuous-241-140" />
                  <el-option label="241×93mm 针式三等分单" value="continuous-241-93" />
                </el-select>
              </el-form-item>
            </el-col>

            <el-col :span="6">
              <el-form-item label="纸张方向">
                <el-radio-group v-model="selectedOrientation">
                  <el-radio-button value="portrait">纵向</el-radio-button>
                  <el-radio-button value="landscape">横向</el-radio-button>
                </el-radio-group>
              </el-form-item>
            </el-col>

            <el-col :span="6">
              <el-form-item label="物理页边距">
                <el-select v-model="padding" style="width: 100%">
                  <el-option label="紧凑 (5mm)" value="5mm" />
                  <el-option label="标准 (10mm)" value="10mm" />
                  <el-option label="开阔 (15mm)" value="15mm" />
                  <el-option label="宽松 (20mm)" value="20mm" />
                </el-select>
              </el-form-item>
            </el-col>

            <el-col :span="6">
              <el-form-item label="缩放倍率">
                <el-slider
                  v-model="scale"
                  :min="0.5"
                  :max="1.5"
                  :step="0.05"
                  :format-tooltip="v => `${Math.round(v * 100)}%`"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="6">
              <el-form-item label="X 轴微调偏移">
                <el-input-number v-model="offsetX" :min="-20" :max="20" :step="1">
                  <template #suffix>mm</template>
                </el-input-number>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="Y 轴微调偏移">
                <el-input-number v-model="offsetY" :min="-20" :max="20" :step="1">
                  <template #suffix>mm</template>
                </el-input-number>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="标尺辅助选项">
                <el-checkbox v-model="showRuler">启用毫米标尺</el-checkbox>
                <el-checkbox v-model="showCrosshair">鼠标十字准星</el-checkbox>
                <el-checkbox v-model="gridLines">10mm 网格辅助线</el-checkbox>
              </el-form-item>
            </el-col>
          </el-row>
        </template>

        <!-- 热敏小票特定设置 -->
        <el-row v-if="sheetMode === 'receipt'" :gutter="20">
          <el-col :span="8">
            <el-form-item label="卷纸宽度预设">
              <el-radio-group v-model="receiptPreset">
                <el-radio-button value="receipt-80">80mm 标准型</el-radio-button>
                <el-radio-button value="receipt-58">58mm 紧凑便携型</el-radio-button>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 标签特定设置 -->
        <el-row v-if="sheetMode === 'label'" :gutter="20">
          <el-col :span="8">
            <el-form-item label="标签尺寸预设">
              <el-radio-group v-model="labelSizePreset">
                <el-radio-button value="small">小型 40×30mm</el-radio-button>
                <el-radio-button value="medium">中型 60×40mm</el-radio-button>
                <el-radio-button value="large">大型 80×50mm</el-radio-button>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </el-card>

    <div class="sheet-viewport-box">
      <!-- 带有标尺包裹的预览 -->
      <component
        :is="showRuler && sheetMode === 'custom' ? AtengPrintRuler : 'div'"
        class="ruler-outer"
        :show-crosshair="showCrosshair"
        :grid-lines="gridLines"
        :scale="scale"
      >
        <!-- 1. 通用标尺仿真 -->
        <AtengPrintSheet
          v-if="sheetMode === 'custom'"
          id="standard-sheet-preview"
          :preset="selectedPreset"
          :orientation="selectedOrientation"
          :padding="padding"
          :scale="scale"
          :offset-x="offsetX"
          :offset-y="offsetY"
        >
          <template #default="{ pageIndex, totalPages, dimensions }">
            <div class="sheet-inner-card">
              <div class="sheet-title-row">
                <h2>企业销售出货明细单</h2>
                <div class="page-badge">
                  尺寸: {{ dimensions.width }} × {{ dimensions.height }} | 纸张:
                  {{ selectedPreset }}
                </div>
              </div>

              <div class="sheet-grid">
                <div>客户：杭州海康微影传感科技有限公司</div>
                <div>日期：2026-11-10</div>
                <div>经办：Ateng</div>
                <div>币种：CNY 人民币</div>
              </div>

              <table class="sheet-table">
                <thead>
                  <tr>
                    <th>品名</th>
                    <th>规格</th>
                    <th>数量</th>
                    <th>单价</th>
                    <th>金额</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>工业级手持激光终端</td>
                    <td>AT-PDA-800</td>
                    <td>5</td>
                    <td>1,200.00</td>
                    <td>6,000.00</td>
                  </tr>
                  <tr>
                    <td>热敏小票卷纸 (80mm)</td>
                    <td>80x60mm</td>
                    <td>20</td>
                    <td>15.00</td>
                    <td>300.00</td>
                  </tr>
                </tbody>
              </table>

              <!-- 强制分页符测试 -->
              <AtengPrintBreak />

              <div class="second-page-block">
                <h3>附件：收货验收与签章存根（第二联）</h3>
                <p>1. 请收货方核对物料完好无损后加盖收货专用章；</p>
                <p>2. 本联由物流配送经手人交回财务冲抵应收账款。</p>
                <div class="sign-boxes">
                  <div class="sign-cell">发货仓管：_____________</div>
                  <div class="sign-cell">物流承运：_____________</div>
                  <div class="sign-cell">客户签收：_____________</div>
                </div>
              </div>

              <div class="sheet-footer-line">
                <span>第 {{ pageIndex }} 页 / 共 {{ totalPages }} 页</span>
                <span>由 @atengk/print-vue 排版引擎生成</span>
              </div>
            </div>
          </template>
        </AtengPrintSheet>

        <!-- 2. 销售结算发票预设 -->
        <div v-else-if="sheetMode === 'invoice'" id="standard-sheet-preview" class="preset-wrapper">
          <AtengInvoiceSheet />
        </div>

        <!-- 3. 热敏收银小票预设 -->
        <div v-else-if="sheetMode === 'receipt'" id="standard-sheet-preview" class="preset-wrapper">
          <AtengReceiptSheet :width-preset="receiptPreset" />
        </div>

        <!-- 4. 三段码快递面单预设 -->
        <div v-else-if="sheetMode === 'waybill'" id="standard-sheet-preview" class="preset-wrapper">
          <AtengWaybillSheet />
        </div>

        <!-- 5. 仓储物料标签预设 -->
        <div v-else-if="sheetMode === 'label'" id="standard-sheet-preview" class="preset-wrapper">
          <AtengLabelSheet :size-preset="labelSizePreset" />
        </div>
      </component>
    </div>
  </div>
</template>

<style scoped>
.standard-sheets-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-title {
  font-weight: 600;
  font-size: 15px;
}

.panel-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sheet-viewport-box {
  display: flex;
  justify-content: center;
  background: #cbd5e1;
  padding: 24px;
  border-radius: 8px;
  overflow: auto;
  min-height: 500px;
}

.ruler-outer {
  max-width: 100%;
}

.preset-wrapper {
  background: #ffffff;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  border-radius: 4px;
}

.sheet-inner-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  font-size: 13px;
  color: #1e293b;
}

.sheet-title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  border-bottom: 2px solid #0f172a;
  padding-bottom: 8px;
}

.sheet-title-row h2 {
  margin: 0;
  font-size: 18px;
  color: #0f172a;
}

.page-badge {
  font-size: 11px;
  color: #64748b;
  font-family: monospace;
}

.sheet-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  font-size: 12px;
}

.sheet-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.sheet-table th,
.sheet-table td {
  border: 1px solid #cbd5e1;
  padding: 6px 8px;
  text-align: left;
}

.sheet-table th {
  background: #f8fafc;
}

.second-page-block {
  margin-top: 10px;
  padding: 10px;
  border: 1px dashed #94a3b8;
  border-radius: 4px;
  background: #fafafa;
}

.second-page-block h3 {
  margin: 0 0 6px;
  font-size: 14px;
  color: #334155;
}

.second-page-block p {
  margin: 4px 0;
  font-size: 12px;
  color: #64748b;
}

.sign-boxes {
  display: flex;
  justify-content: space-between;
  margin-top: 14px;
  font-size: 12px;
}

.sheet-footer-line {
  display: flex;
  justify-content: space-between;
  margin-top: 16px;
  font-size: 11px;
  color: #94a3b8;
  border-top: 1px solid #e2e8f0;
  padding-top: 8px;
}
</style>
