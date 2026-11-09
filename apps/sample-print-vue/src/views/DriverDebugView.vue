<script setup lang="ts">
/**
 * 多驱动与样式保真调试看板。
 *
 * 验证无头隐藏 iframe 浏览器打印、StyleHarvester 样式抓取、表单输入值实时克隆与指令/Hook 双模触发。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { usePrint } from '@atengk/print-vue';

const { isPrinting, print } = usePrint();

const customerName = ref('杭州蚂蚁智能科技有限公司');
const invoiceType = ref('专票');
const remarks = ref('请于工作日安排顺丰速运寄送至园区前台。');
const customCss = ref('');

const handlePrintByHook = async () => {
  try {
    await print('#demo-invoice-sheet', {
      extraCss: customCss.value ? customCss.value : undefined,
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
  <div class="driver-debug-container">
    <el-card shadow="never" class="control-panel">
      <template #header>
        <div class="panel-header">
          <span class="panel-title">🖨️ 浏览器无头 iframe 打印调度控制台</span>
          <el-tag :type="isPrinting ? 'warning' : 'success'" size="small">
            状态: {{ isPrinting ? '正在打印...' : '就绪' }}
          </el-tag>
        </div>
      </template>

      <el-form label-width="120px" size="default">
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="客户名称">
              <el-input v-model="customerName" placeholder="输入客户名称测试表单克隆" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="发票类型">
              <el-select v-model="invoiceType" style="width: 100%">
                <el-option label="增值税专用发票" value="专票" />
                <el-option label="增值税普通发票" value="普票" />
                <el-option label="电子发票" value="电票" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="备注说明">
              <el-input v-model="remarks" placeholder="输入备注信息" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="动态追加 CSS">
          <el-input
            v-model="customCss"
            type="textarea"
            :rows="2"
            placeholder="如输入: .invoice-sheet { border: 2px dashed #3b82f6 !important; }"
          />
        </el-form-item>

        <el-form-item label="触发方式">
          <el-button type="primary" :loading="isPrinting" @click="handlePrintByHook">
            1. 编程 Hook 调用: print('#demo-invoice-sheet')
          </el-button>
          <el-button v-print="'#demo-invoice-sheet'" type="success">
            2. 指令声明式绑定: v-print="'#demo-invoice-sheet'"
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <div class="preview-wrapper">
      <div id="demo-invoice-sheet" class="invoice-sheet">
        <div class="invoice-header">
          <div class="company-brand">
            <h2 class="company-name">浙江阿腾数智物流装备有限公司</h2>
            <p class="company-sub">Zhejiang Ateng Digital Logistics Co., Ltd.</p>
          </div>
          <div class="invoice-title-block">
            <h1 class="invoice-title">出 库 发 货 单</h1>
            <p class="invoice-no">单号: CK-20261110-8899</p>
          </div>
        </div>

        <div class="meta-grid">
          <div class="meta-item">
            <span class="label">收货客户：</span>
            <span class="value">{{ customerName }}</span>
          </div>
          <div class="meta-item">
            <span class="label">开单日期：</span>
            <span class="value">2026-11-10</span>
          </div>
          <div class="meta-item">
            <span class="label">发票类型：</span>
            <span class="value">{{ invoiceType }}</span>
          </div>
          <div class="meta-item">
            <span class="label">经手人员：</span>
            <span class="value">Ateng</span>
          </div>
        </div>

        <table class="detail-table">
          <thead>
            <tr>
              <th style="width: 60px">序号</th>
              <th>物料编码</th>
              <th>商品及规格描述</th>
              <th style="width: 80px">单位</th>
              <th style="width: 100px">数量</th>
              <th style="width: 120px">单价(元)</th>
              <th style="width: 140px">金额小计(元)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td>MAT-00912</td>
              <td>智能激光条码扫码枪 (USB免驱版)</td>
              <td>台</td>
              <td>10</td>
              <td>280.00</td>
              <td>2,800.00</td>
            </tr>
            <tr>
              <td>2</td>
              <td>MAT-00915</td>
              <td>连续热敏热敏不干胶标签纸 (80mm*50mm)</td>
              <td>卷</td>
              <td>50</td>
              <td>18.50</td>
              <td>925.00</td>
            </tr>
            <tr>
              <td>3</td>
              <td>MAT-00920</td>
              <td>高保真防伪多联复写票据纸 (241*140 二等分)</td>
              <td>箱</td>
              <td>5</td>
              <td>160.00</td>
              <td>800.00</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colspan="4" style="text-align: right; font-weight: bold">
                合计金额人民币(大写)：
              </td>
              <td colspan="3" style="font-weight: bold; color: #b91c1c">
                肆仟伍佰贰拾伍元整 (¥4,525.00)
              </td>
            </tr>
          </tfoot>
        </table>

        <div class="signature-section">
          <div class="sig-col">制单人：Ateng</div>
          <div class="sig-col">仓管发货：李建国</div>
          <div class="sig-col">承运提货人：_____________</div>
          <div class="sig-col">客户收货签字：_____________</div>
        </div>

        <div class="footer-note">
          <p>备注：{{ remarks }}</p>
          <p class="anti-counterfeit">
            【声明】本单据由 @atengk/print-vue 高保真自动排版生成，印章齐备方可生效。
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.driver-debug-container {
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

.preview-wrapper {
  display: flex;
  justify-content: center;
  background: #e2e8f0;
  padding: 30px;
  border-radius: 8px;
  overflow: auto;
}

.invoice-sheet {
  width: 210mm;
  min-height: 148mm;
  background: #ffffff;
  box-shadow:
    0 10px 25px -5px rgba(0, 0, 0, 0.1),
    0 8px 10px -6px rgba(0, 0, 0, 0.1);
  padding: 15mm;
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  color: #1e293b;
}

.invoice-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 2px solid #0f172a;
  padding-bottom: 12px;
  margin-bottom: 14px;
}

.company-name {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

.company-sub {
  margin: 4px 0 0;
  font-size: 11px;
  color: #64748b;
}

.invoice-title {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 4px;
  color: #0f172a;
}

.invoice-no {
  margin: 4px 0 0;
  font-size: 12px;
  color: #475569;
  text-align: right;
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-bottom: 14px;
  font-size: 13px;
}

.meta-item .label {
  color: #64748b;
}

.meta-item .value {
  font-weight: 600;
  color: #1e293b;
}

.detail-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 14px;
  font-size: 13px;
}

.detail-table th,
.detail-table td {
  border: 1px solid #cbd5e1;
  padding: 8px 10px;
  text-align: left;
}

.detail-table th {
  background: #f1f5f9;
  font-weight: 600;
  color: #334155;
}

.signature-section {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
  font-size: 13px;
  border-top: 1px dashed #cbd5e1;
  padding-top: 14px;
}

.footer-note {
  margin-top: 14px;
  font-size: 11px;
  color: #64748b;
}

.anti-counterfeit {
  margin-top: 4px;
  color: #94a3b8;
  font-style: italic;
}
</style>
