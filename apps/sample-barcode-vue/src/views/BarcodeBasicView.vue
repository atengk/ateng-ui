<script setup lang="ts">
/**
 * BarcodeBasicView 一维条码生成与防崩溃容错大盘。
 *
 * 演示多条码格式实时生成、SVG/Canvas 渲染模式切换与离线校验防崩溃降级。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { ref, reactive } from 'vue';
import { AtengBarcode, type BarcodeFormat, type BarcodeRenderType } from '@atengk/barcode-vue';

// 基础表单状态
const form = reactive({
  value: 'ATENG-WMS-8899',
  format: 'CODE128' as BarcodeFormat,
  renderType: 'svg' as BarcodeRenderType,
  width: 2,
  height: 90,
  displayValue: true,
  fontSize: 18,
  margin: 12,
  lineColor: '#0f172a',
  background: '#ffffff',
});

// 快速模板预设
const presets = [
  {
    label: 'WMS 物流箱唛 (CODE128)',
    value: 'ATENG-WMS-20261110',
    format: 'CODE128' as BarcodeFormat,
  },
  { label: '零售商品条码 (EAN-13)', value: '6901234567892', format: 'EAN13' as BarcodeFormat },
  { label: '小型包装条码 (EAN-8)', value: '96385074', format: 'EAN8' as BarcodeFormat },
  { label: '工业外箱储运 (ITF-14)', value: '10012345678902', format: 'ITF14' as BarcodeFormat },
  { label: '设备资产标牌 (CODE39)', value: 'SN-MACH-8821', format: 'CODE39' as BarcodeFormat },
  { label: '制药包装代号 (Pharmacode)', value: '12345', format: 'pharmacode' as BarcodeFormat },
];

const applyPreset = (preset: (typeof presets)[0]) => {
  form.value = preset.value;
  form.format = preset.format;
};

// 异常测试桩数据
const invalidCases = [
  { label: '空字符串保底', value: '', format: 'CODE128' as BarcodeFormat },
  { label: 'EAN-13 校验位错误', value: '6901234567899', format: 'EAN13' as BarcodeFormat },
  { label: 'CODE128 中文异常拦截', value: '条码测试中文', format: 'CODE128' as BarcodeFormat },
  { label: 'CODE39 小写字符拦截', value: 'abc-lower-case', format: 'CODE39' as BarcodeFormat },
  { label: 'ITF 奇数位长度拦截', value: '12345', format: 'ITF' as BarcodeFormat },
];

const applyInvalidCase = (c: (typeof invalidCases)[0]) => {
  form.value = c.value;
  form.format = c.format;
};

// 事件监听与状态
const lastRenderedInfo = ref('');
const lastErrorInfo = ref('');

const onRendered = (p: { value: string; format: BarcodeFormat; renderType: BarcodeRenderType }) => {
  lastRenderedInfo.value = `[${new Date().toLocaleTimeString()}] 成功渲染 ${p.format} (${p.renderType}): ${p.value}`;
  lastErrorInfo.value = '';
};

const onError = (e: { message: string; value: string; format: BarcodeFormat }) => {
  lastErrorInfo.value = `[${new Date().toLocaleTimeString()}] 格式校验拦截: ${e.message}`;
  lastRenderedInfo.value = '';
};
</script>

<template>
  <div class="barcode-basic-view">
    <el-row :gutter="24">
      <!-- 左侧：参数控制面板 -->
      <el-col :span="10">
        <el-card shadow="hover" class="control-card">
          <template #header>
            <div class="card-title">
              <span>⚙️ 条形码参数控制</span>
            </div>
          </template>

          <el-form label-position="top" size="default">
            <el-form-item label="条码内容 (Value)">
              <el-input v-model="form.value" placeholder="请输入条码内容" clearable />
            </el-form-item>

            <el-row :gutter="12">
              <el-col :span="12">
                <el-form-item label="编码格式 (Format)">
                  <el-select v-model="form.format" class="w-full">
                    <el-option label="CODE128 (通用工业)" value="CODE128" />
                    <el-option label="EAN-13 (商品零售)" value="EAN13" />
                    <el-option label="EAN-8 (微型商品)" value="EAN8" />
                    <el-option label="CODE39 (汽车/军工)" value="CODE39" />
                    <el-option label="ITF-14 (外箱包装)" value="ITF14" />
                    <el-option label="ITF (交叉二五)" value="ITF" />
                    <el-option label="Pharmacode (医药包装)" value="pharmacode" />
                    <el-option label="Codabar (图书物流)" value="codabar" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="渲染模式 (RenderType)">
                  <el-radio-group v-model="form.renderType">
                    <el-radio-button value="svg">SVG (纯矢量)</el-radio-button>
                    <el-radio-button value="canvas">Canvas (位图)</el-radio-button>
                  </el-radio-group>
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="12">
              <el-col :span="12">
                <el-form-item label="线条基准宽度 (px)">
                  <el-slider v-model="form.width" :min="1" :max="4" :step="1" show-stops />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="条码高度 (px)">
                  <el-slider v-model="form.height" :min="40" :max="160" :step="10" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="12">
              <el-col :span="12">
                <el-form-item label="文字展示开关">
                  <el-switch
                    v-model="form.displayValue"
                    active-text="显示文本"
                    inactive-text="隐藏文本"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="文字字号 (px)">
                  <el-input-number v-model="form.fontSize" :min="12" :max="32" class="w-full" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="12">
              <el-col :span="12">
                <el-form-item label="静区边距 (Margin)">
                  <el-slider v-model="form.margin" :min="0" :max="30" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="线条颜色">
                  <el-color-picker v-model="form.lineColor" />
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>

          <el-divider>🏭 工业标准高频模板快速注入</el-divider>
          <div class="preset-buttons">
            <el-button v-for="p in presets" :key="p.label" size="small" @click="applyPreset(p)">
              {{ p.label }}
            </el-button>
          </div>

          <el-divider>🛡️ 异常输入与防崩溃熔断演练</el-divider>
          <div class="preset-buttons">
            <el-button
              v-for="c in invalidCases"
              :key="c.label"
              size="small"
              type="danger"
              plain
              @click="applyInvalidCase(c)"
            >
              {{ c.label }}
            </el-button>
          </div>
        </el-card>
      </el-col>

      <!-- 右侧：实时渲染展示大盘 -->
      <el-col :span="14">
        <el-card shadow="hover" class="preview-card">
          <template #header>
            <div class="card-title">
              <span>🖼️ 实时条形码高保真画布</span>
              <el-tag :type="form.renderType === 'svg' ? 'success' : 'primary'" size="small">
                {{ form.renderType.toUpperCase() }} 渲染模式
              </el-tag>
            </div>
          </template>

          <div class="barcode-stage">
            <AtengBarcode
              :value="form.value"
              :format="form.format"
              :render-type="form.renderType"
              :width="form.width"
              :height="form.height"
              :display-value="form.displayValue"
              :font-size="form.fontSize"
              :margin="form.margin"
              :line-color="form.lineColor"
              :background="form.background"
              @rendered="onRendered"
              @error="onError"
            >
              <template #error="{ message, value }">
                <div class="custom-error-banner">
                  <div class="error-badge">⚠️ 格式拦截</div>
                  <div class="error-detail">
                    <strong>原因：</strong>{{ message }}<br />
                    <strong>当前入参：</strong><code>"{{ value }}"</code>
                  </div>
                </div>
              </template>
            </AtengBarcode>
          </div>

          <!-- 状态通知日志栏 -->
          <div class="status-panel">
            <div v-if="lastRenderedInfo" class="log-item success-log">
              ✅ {{ lastRenderedInfo }}
            </div>
            <div v-if="lastErrorInfo" class="log-item error-log">🛑 {{ lastErrorInfo }}</div>
          </div>
        </el-card>

        <!-- 架构说明卡片 -->
        <el-card shadow="never" class="info-card">
          <template #header>
            <div class="card-title">📖 工业级设计与架构防线说明</div>
          </template>
          <ul class="info-list">
            <li>
              <strong>SVG 优先契约</strong>：默认采用纯矢量 SVG 渲染，完美与
              <code>@atengk/print-vue</code> 协同，纸张打印放大 100% 锐利不失真。
            </li>
            <li>
              <strong>离线防崩溃校验</strong>：内置
              <code>BarcodeValidator</code>
              前置纯算法离线校验，非法字符或空串绝不抛出未捕获异常，彻底消灭全站白屏。
            </li>
            <li>
              <strong>工业静区（Quiet Zone）</strong
              >：四周安全留白确保在深色背景或反光材质上依然保有充足的激光反射区。
            </li>
          </ul>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.barcode-basic-view {
  padding: 8px 0;
}

.card-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
  font-size: 15px;
}

.preset-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.barcode-stage {
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--el-fill-color-lighter);
  border: 1px dashed var(--el-border-color);
  border-radius: 8px;
  padding: 24px;
  overflow: auto;
}

.custom-error-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 18px;
  background-color: rgba(239, 68, 68, 0.08);
  border: 1px dashed #ef4444;
  border-radius: 8px;
  color: #dc2626;
  font-size: 13px;
}

.error-badge {
  font-weight: 700;
  white-space: nowrap;
}

.error-detail {
  line-height: 1.5;
}

.status-panel {
  margin-top: 16px;
  padding: 10px 14px;
  background-color: var(--el-fill-color-light);
  border-radius: 6px;
  font-size: 13px;
  font-family: monospace;
}

.success-log {
  color: #10b981;
}

.error-log {
  color: #ef4444;
}

.info-card {
  margin-top: 16px;
}

.info-list {
  margin: 0;
  padding-left: 20px;
  font-size: 13px;
  line-height: 1.8;
  color: var(--el-text-color-regular);
}

.w-full {
  width: 100%;
}
</style>
