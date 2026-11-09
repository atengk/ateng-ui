<script setup lang="ts">
/**
 * 场景三：零 eval 动态规则树与安全算术 AST 解释器自验看板。
 *
 * 遵循 ADR-0013 与 ADR-0044 规约：
 * 1. 验证声明式条件树（eq/ne/gt/gte/lt/lte/in/empty）驱动的动态显隐与必填切换；
 * 2. 验证基于词法分析与递归下降的轻量算术 AST 级联计算（商品单价 × 数量 × 折扣 + 运费）；
 * 3. 验证 100% 免疫 CSP 与杜绝 XSS 注入的安全拦截对抗机制。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { AtengFormRenderer, SafeMathEvaluator } from '@atengk/form-designer-vue';
import type { FormSchema, FormRendererInstance } from '@atengk/form-designer-vue';

const formRef = ref<FormRendererInstance | null>(null);

const formData = ref<Record<string, unknown>>({
  needInvoice: false,
  companyName: '',
  taxCode: '',
  price: 120,
  quantity: 3,
  discountRate: 0.1,
  shippingFee: 15,
  subtotal: 0,
  totalAmount: 0,
});

// 表单 Schema 定义
const schema: FormSchema = {
  version: '1.0',
  formConfig: {
    layout: 'vertical',
    labelPosition: 'top',
    labelWidth: 120,
    colon: true,
  },
  widgetList: [
    {
      id: 'w_invoice',
      type: 'checkbox',
      modelKey: 'needInvoice',
      label: '是否开具增值税发票 (条件显隐联动)',
      defaultValue: false,
    },
    {
      id: 'w_company',
      type: 'input',
      modelKey: 'companyName',
      label: '公司发票抬头 (联动必填与显隐)',
      placeholder: '请输入开票单位完整名称',
      defaultValue: '',
      rules: [{ required: true, message: '开票单位名称不能为空' }],
      dynamicRules: [
        {
          conditions: [{ sourceKey: 'needInvoice', operator: 'eq', value: true }],
          actions: [
            { target: 'visible', value: true },
            { target: 'required', value: true },
          ],
          otherwise: [
            { target: 'visible', value: false },
            { target: 'required', value: false },
          ],
        },
      ],
    },
    {
      id: 'w_tax_code',
      type: 'input',
      modelKey: 'taxCode',
      label: '统一社会信用代码 (纳税人识别号)',
      placeholder: '请输入 18 位统一社会信用代码',
      defaultValue: '',
      rules: [
        { required: true, message: '纳税人识别号不能为空' },
        { len: 18, message: '统一社会信用代码必须为 18 位' },
      ],
      dynamicRules: [
        {
          conditions: [{ sourceKey: 'needInvoice', operator: 'eq', value: true }],
          actions: [
            { target: 'visible', value: true },
            { target: 'required', value: true },
          ],
          otherwise: [
            { target: 'visible', value: false },
            { target: 'required', value: false },
          ],
        },
      ],
    },
    {
      id: 'w_price',
      type: 'input',
      modelKey: 'price',
      label: '商品单价 (元)',
      placeholder: '请输入单价',
      defaultValue: 120,
      rules: [{ required: true, message: '单价不能为空' }],
    },
    {
      id: 'w_quantity',
      type: 'input',
      modelKey: 'quantity',
      label: '采购数量 (件)',
      placeholder: '请输入数量',
      defaultValue: 3,
      rules: [{ required: true, message: '数量不能为空' }],
    },
    {
      id: 'w_discount',
      type: 'input',
      modelKey: 'discountRate',
      label: '折扣让利比率 (如 0.1 表示 9 折优惠)',
      placeholder: '0 ~ 1 之间小数',
      defaultValue: 0.1,
    },
    {
      id: 'w_shipping',
      type: 'input',
      modelKey: 'shippingFee',
      label: '物流运费 (元)',
      defaultValue: 15,
    },
    {
      id: 'w_subtotal',
      type: 'input',
      modelKey: 'subtotal',
      label: '折后商品小计 (公式: price * quantity * (1 - discountRate))',
      defaultValue: 0,
      props: { disabled: true },
      dynamicRules: [
        {
          conditions: [{ sourceKey: 'price', operator: 'gte', value: 0 }],
          actions: [
            {
              target: 'value',
              value: 'price * quantity * (1 - discountRate)',
            },
          ],
        },
      ],
    },
    {
      id: 'w_total',
      type: 'input',
      modelKey: 'totalAmount',
      label: '订单总应付金额 (二级级联公式: subtotal + shippingFee)',
      defaultValue: 0,
      props: { disabled: true },
      dynamicRules: [
        {
          conditions: [{ sourceKey: 'subtotal', operator: 'gte', value: 0 }],
          actions: [
            {
              target: 'value',
              value: 'subtotal + shippingFee',
            },
          ],
        },
      ],
    },
  ],
};

// 安全 AST 沙箱对抗试验台
const sandboxExpr = ref<string>('price * quantity * (1 - discountRate) + shippingFee');
const customVarA = ref<number>(50);
const customVarB = ref<number>(2);

const sandboxContext = computed(() => {
  return {
    ...formData.value,
    a: customVarA.value,
    b: customVarB.value,
  };
});

const sandboxResult = computed<number>(() => {
  return SafeMathEvaluator.evaluate(sandboxExpr.value, sandboxContext.value);
});

const isAdversarialInput = computed<boolean>(() => {
  const raw = sandboxExpr.value.toLowerCase();
  return (
    raw.includes('window') ||
    raw.includes('document') ||
    raw.includes('constructor') ||
    raw.includes('__proto__') ||
    raw.includes('eval') ||
    raw.includes('function') ||
    raw.includes('cookie') ||
    raw.includes('location')
  );
});

function handlePresetMalicious(payload: string) {
  sandboxExpr.value = payload;
}

async function handleValidate() {
  if (!formRef.value) return;
  const res = await formRef.value.validate();
  if (res.valid) {
    ElMessage.success('🎉 表单全量校验通过！');
  } else {
    ElMessage.error(`❌ 表单校验未通过: ${Object.values(res.errors).join(', ')}`);
  }
}

function handleReset() {
  formRef.value?.resetFields();
  ElMessage.info('表单已重置至初始默认状态');
}
</script>

<template>
  <div class="dynamic-rule-scenario">
    <div class="scenario-banner">
      <div class="banner-title">
        <h3>零 eval 声明式规则树与轻量安全算术 AST 看板</h3>
        <el-tag type="success" effect="dark">100% 免疫 CSP 与 XSS</el-tag>
      </div>
      <p class="banner-desc">
        彻底杜绝传统表单使用 eval / new Function 带来的高危代码执行隐患；
        依托自研纯原生分词与递归下降算术 AST，实现毫秒级四则运算、路径插值与多级级联公式计算。
      </p>
    </div>

    <div class="scenario-layout">
      <!-- 左侧：动态表单与联动展示 -->
      <div class="layout-left">
        <div class="action-toolbar">
          <el-button type="primary" @click="handleValidate">校验并提交表单</el-button>
          <el-button @click="handleReset">重置表单</el-button>
        </div>

        <div class="form-container-card">
          <AtengFormRenderer ref="formRef" v-model:form-data="formData" :schema="schema" />
        </div>
      </div>

      <!-- 右侧：实时数据模型与安全 AST 对抗试验台 -->
      <div class="layout-right">
        <!-- 实时数据流 -->
        <div class="diag-card">
          <div class="diag-header">
            <h4>📊 实时双向表单数据 (formData)</h4>
          </div>
          <pre class="json-preview">{{ JSON.stringify(formData, null, 2) }}</pre>
        </div>

        <!-- 安全 AST 试验台 -->
        <div class="diag-card">
          <div class="diag-header">
            <h4>🛡️ 安全算术 AST 解释器对抗试验台</h4>
            <el-tag :type="isAdversarialInput ? 'danger' : 'success'" size="small">
              {{ isAdversarialInput ? '检测到恶意关键字 (安全拦截)' : '语法安全' }}
            </el-tag>
          </div>

          <div class="sandbox-body">
            <div class="input-row">
              <label>算术表达式 / 公式：</label>
              <el-input v-model="sandboxExpr" placeholder="输入公式或恶意注入测试" />
            </div>

            <div class="eval-result-row">
              <span>AST 计算结果：</span>
              <span class="result-number" :class="{ 'zero-fallback': isAdversarialInput }">
                {{ sandboxResult }}
              </span>
            </div>

            <div class="quick-presets">
              <span class="preset-label">快速对抗注入测试用例：</span>
              <div class="preset-buttons">
                <el-button
                  size="small"
                  type="danger"
                  plain
                  @click="handlePresetMalicious('window.location.href')"
                >
                  window.location
                </el-button>
                <el-button
                  size="small"
                  type="danger"
                  plain
                  @click="handlePresetMalicious('constructor.constructor(\'alert(1)\')()')"
                >
                  constructor 原型污染
                </el-button>
                <el-button
                  size="small"
                  type="danger"
                  plain
                  @click="handlePresetMalicious('__proto__.polluted = 1')"
                >
                  __proto__
                </el-button>
                <el-button
                  size="small"
                  type="success"
                  plain
                  @click="handlePresetMalicious('round(price * quantity * (1 - discountRate))')"
                >
                  round() 函数取整
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dynamic-rule-scenario {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.scenario-banner {
  background: var(--el-fill-color-light, #f1f5f9);
  border: 1px solid var(--el-border-color-lighter, #e2e8f0);
  border-radius: 8px;
  padding: 16px 20px;
}

.banner-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.banner-title h3 {
  margin: 0;
  font-size: 16px;
  color: var(--el-text-color-primary, #0f172a);
}

.banner-desc {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary, #64748b);
  line-height: 1.5;
}

.scenario-layout {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 20px;
}

.layout-left,
.layout-right {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.action-toolbar {
  display: flex;
  gap: 10px;
}

.form-container-card {
  background: var(--el-bg-color, #ffffff);
  border: 1px solid var(--el-border-color, #e2e8f0);
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.diag-card {
  background: var(--el-bg-color, #ffffff);
  border: 1px solid var(--el-border-color, #e2e8f0);
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.diag-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.diag-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary, #0f172a);
}

.json-preview {
  margin: 0;
  padding: 12px;
  background: var(--el-fill-color-darker, #0f172a);
  color: #38bdf8;
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.4;
  overflow-x: auto;
  font-family: 'Fira Code', monospace;
}

.sandbox-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.input-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.input-row label {
  font-size: 13px;
  color: var(--el-text-color-regular, #475569);
  font-weight: 500;
}

.eval-result-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--el-fill-color-lighter, #f8fafc);
  padding: 10px 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
}

.result-number {
  font-size: 18px;
  font-weight: 700;
  color: #0284c7;
  font-family: 'Fira Code', monospace;
}

.result-number.zero-fallback {
  color: #dc2626;
}

.quick-presets {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
}

.preset-label {
  font-size: 12px;
  color: var(--el-text-color-secondary, #64748b);
}

.preset-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

@media (max-width: 992px) {
  .scenario-layout {
    grid-template-columns: 1fr;
  }
}
</style>
