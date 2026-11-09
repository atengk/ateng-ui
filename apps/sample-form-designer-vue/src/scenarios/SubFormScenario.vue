<script setup lang="ts">
/**
 * 场景五：嵌套排版 (LayoutContainer) 与子表单 (DataContainer) 双模切片看板。
 *
 * 遵循 ADR-0044、ADR-0017 与容器二分法设计规范：
 * 1. LayoutContainer (Grid / Card)：纯排版几何容器，子控件字段平铺映射绑定至根模型；
 * 2. DataContainer (SubForm)：明细子表单，生成独立数组分支（formData.items = [...]）；
 * 3. 支持 table (紧凑编辑表格) 与 dialog-list (卡片列表 + 弹层填报) 双模切换；
 * 4. 支持行内字段精确定位校验 (Indexed Path items[0].name)，单元格实时高亮提示；
 * 5. 支持只读态下无边框文本脱壳与金额千分位格式化呈现。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { AtengFormRenderer } from '@atengk/form-designer-vue';
import type { FormSchema, FormRendererInstance } from '@atengk/form-designer-vue';

const formRef = ref<FormRendererInstance | null>(null);

// 模式控制
const subFormMode = ref<'table' | 'dialog-list'>('table');
const isReadonly = ref<boolean>(false);

// 表单双向绑定数据
const formData = ref<Record<string, unknown>>({
  orderNo: 'PO-20261109-008',
  dept: 'rd',
  orderDate: '2026-11-09',
  remarks: '2026 Q4 基础设施与前端工程化专用硬件采购。',
  items: [
    { name: 'Apple M4 Max Studio', spec: '128GB / 2TB', price: 29999, quantity: 2 },
    { name: 'Dell UltraSharp 32 4K', spec: 'U3223QE IPS Black', price: 5499, quantity: 4 },
  ],
});

// 动态构建 Schema（响应 subFormMode 切换）
const schema = computed<FormSchema>(() => ({
  version: '1.0',
  formConfig: {
    layout: 'vertical',
    labelPosition: 'top',
    colon: true,
  },
  widgetList: [
    {
      id: 'card_main_info',
      type: 'card',
      isContainer: true,
      props: {
        title: '采购订单主信息 (LayoutContainer: Card)',
        bordered: true,
      },
      children: [
        {
          id: 'grid_order_header',
          type: 'grid',
          isContainer: true,
          props: {
            cols: 3,
            gutter: 16,
          },
          children: [
            {
              id: 'widget_order_no',
              type: 'input',
              modelKey: 'orderNo',
              label: '采购单号',
              placeholder: '请输入订单编号',
              rules: [{ required: true, message: '采购单号不能为空' }],
            },
            {
              id: 'widget_dept',
              type: 'select',
              modelKey: 'dept',
              label: '申请部门',
              options: [
                { label: '基础架构部 (Infra)', value: 'rd' },
                { label: 'AI 智能应用院 (AI Lab)', value: 'ai' },
                { label: '综合管理运营 (Operation)', value: 'op' },
              ],
            },
            {
              id: 'widget_date',
              type: 'input',
              modelKey: 'orderDate',
              label: '采购拟定日期',
              placeholder: 'YYYY-MM-DD',
            },
          ],
        },
        {
          id: 'widget_remarks',
          type: 'textarea',
          modelKey: 'remarks',
          label: '采购事由与说明',
          placeholder: '请输入采购说明与用途...',
        },
      ],
    },
    {
      id: 'card_subform_items',
      type: 'card',
      isContainer: true,
      props: {
        title: `采购明细清单 (DataContainer: SubForm · 当前：${subFormMode.value === 'table' ? '紧凑表格模式' : '卡片弹窗模式'})`,
        bordered: true,
      },
      children: [
        {
          id: 'widget_items',
          type: 'subform',
          modelKey: 'items',
          label: '采购物料明细',
          isCollection: true,
          props: {
            displayMode: subFormMode.value,
            addButtonText: '添加采购物料',
            allowAdd: true,
            allowDelete: true,
            emptyText: '暂无采购明细数据，请点击上方按钮添加',
          },
          children: [
            {
              id: 'child_item_name',
              type: 'input',
              modelKey: 'name',
              label: '物料名称',
              placeholder: '如 MacBook Pro',
              rules: [{ required: true, message: '物料名称必填' }],
            },
            {
              id: 'child_item_spec',
              type: 'input',
              modelKey: 'spec',
              label: '规格型号',
              placeholder: '如 64GB 内存',
            },
            {
              id: 'child_item_price',
              type: 'input',
              modelKey: 'price',
              label: '单价 (元)',
              defaultValue: 0,
              props: {
                formatType: 'currency',
                currencySymbol: '¥',
                precision: 2,
              },
            },
            {
              id: 'child_item_qty',
              type: 'input',
              modelKey: 'quantity',
              label: '数量',
              defaultValue: 1,
            },
          ],
        },
      ],
    },
  ],
}));

// 计算总金额与物料项数
const summary = computed(() => {
  const items = Array.isArray(formData.value.items)
    ? (formData.value.items as Array<Record<string, unknown>>)
    : [];
  let totalCost = 0;
  for (const item of items) {
    const p = Number(item.price) || 0;
    const q = Number(item.quantity) || 0;
    totalCost += p * q;
  }
  return {
    count: items.length,
    totalCost: totalCost.toLocaleString('zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
  };
});

// 操作按钮方法
const handleValidate = async (): Promise<void> => {
  if (!formRef.value) return;
  const res = await formRef.value.validate();
  if (res.valid) {
    ElMessage.success('全表单校验通过，所有行内数据规范合规！');
  } else {
    ElMessage.error(
      `表单校验未通过，发现 ${Object.keys(res.errors).length} 项问题，请根据行内高亮修正！`,
    );
  }
};

const handleReset = (): void => {
  formRef.value?.resetFields();
  ElMessage.info('表单已重置回初始数据！');
};

const handleFillMockValid = (): void => {
  formData.value = {
    orderNo: 'PO-20261109-999',
    dept: 'ai',
    orderDate: '2026-11-10',
    remarks: 'AI 训练卡群集与液冷机架套件。',
    items: [
      { name: 'NVIDIA H100 NVL', spec: '94GB HBM3', price: 218000, quantity: 4 },
      { name: 'RoCE v2 400G 网卡', spec: 'ConnectX-7', price: 12500, quantity: 8 },
    ],
  };
  formRef.value?.clearValidate();
  ElMessage.success('已装载大宗合规测试数据！');
};

const handleFillMockInvalid = (): void => {
  formData.value = {
    orderNo: '',
    dept: 'rd',
    orderDate: '2026-11-09',
    remarks: '含有空物料名称的异常测试集。',
    items: [
      { name: '服务器机柜', spec: '42U 标准', price: 4500, quantity: 2 },
      { name: '', spec: '待确认', price: 900, quantity: 1 }, // 必填空项
      { name: '', spec: '配件未命名', price: 200, quantity: 5 }, // 必填空项
    ],
  };
  ElMessage.warning('已装载含非法空行的测试数据，点击“提交校验”观察行级定位错误！');
};
</script>

<template>
  <div class="subform-scenario">
    <!-- 顶部状态指示与模式控制栏 -->
    <div class="scenario-toolbar">
      <div class="toolbar-left">
        <span class="toolbar-title">动态子表单模式：</span>
        <el-radio-group v-model="subFormMode" size="default">
          <el-radio-button label="table">紧凑表格 (table)</el-radio-button>
          <el-radio-button label="dialog-list">卡片弹窗 (dialog-list)</el-radio-button>
        </el-radio-group>

        <el-divider direction="vertical" />

        <el-switch
          v-model="isReadonly"
          active-text="只读脱壳态 (readonly)"
          inactive-text="编辑填报态"
        />
      </div>

      <div class="toolbar-right">
        <el-button size="small" @click="handleFillMockValid">装载合规数据</el-button>
        <el-button size="small" type="warning" plain @click="handleFillMockInvalid"
          >装载违规数据</el-button
        >
        <el-button size="small" @click="handleReset">重置表单</el-button>
        <el-button size="small" type="primary" @click="handleValidate">触发表单全量校验</el-button>
      </div>
    </div>

    <!-- 采购汇总小卡片 -->
    <div class="summary-card">
      <div class="summary-item">
        <span class="label">明细物料条数：</span>
        <span class="val highlight">{{ summary.count }} 项</span>
      </div>
      <div class="summary-item">
        <span class="label">采购预算总估值：</span>
        <span class="val highlight currency">¥ {{ summary.totalCost }}</span>
      </div>
      <div class="summary-tip">
        💡 提示：在 table 模式下，直接在单元格修改单价或点击操作列删除；在 dialog-list
        模式下，点击卡片右上角“编辑”弹窗修改。
      </div>
    </div>

    <!-- 主展示区：表单容器与双向绑定数据并排 -->
    <div class="scenario-content">
      <div class="form-panel">
        <AtengFormRenderer
          ref="formRef"
          :schema="schema"
          :form-data="formData"
          :readonly="isReadonly"
          @update:form-data="val => (formData = val)"
        />
      </div>

      <div class="data-panel">
        <div class="panel-header">
          <span>📦 实时双向绑定数据模型 (formData)</span>
        </div>
        <pre class="json-code"><code>{{ JSON.stringify(formData, null, 2) }}</code></pre>
      </div>
    </div>
  </div>
</template>

<style scoped>
.subform-scenario {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.scenario-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px 16px;
  background-color: var(--el-bg-color, #ffffff);
  border: 1px solid var(--el-border-color-light, #e2e8f0);
  border-radius: 8px;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toolbar-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary, #1e293b);
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 12px 16px;
  background-color: var(--el-fill-color-light, #f8fafc);
  border: 1px solid var(--el-border-color-lighter, #e2e8f0);
  border-radius: 6px;
  font-size: 14px;
}

.summary-item .label {
  color: var(--el-text-color-secondary, #64748b);
}

.summary-item .val.highlight {
  font-weight: 600;
  color: var(--el-color-primary, #3b82f6);
}

.summary-item .val.currency {
  font-size: 16px;
  color: var(--el-color-success, #10b981);
}

.summary-tip {
  margin-left: auto;
  font-size: 13px;
  color: var(--el-text-color-secondary, #64748b);
}

.scenario-content {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 16px;
  align-items: start;
}

@media (max-width: 1024px) {
  .scenario-content {
    grid-template-columns: 1fr;
  }
}

.form-panel {
  background-color: var(--el-bg-color, #ffffff);
  border: 1px solid var(--el-border-color-light, #e2e8f0);
  border-radius: 8px;
  padding: 20px;
}

.data-panel {
  background-color: var(--el-bg-color, #ffffff);
  border: 1px solid var(--el-border-color-light, #e2e8f0);
  border-radius: 8px;
  overflow: hidden;
}

.panel-header {
  padding: 10px 14px;
  background-color: var(--el-fill-color-light, #f8fafc);
  border-bottom: 1px solid var(--el-border-color-light, #e2e8f0);
  font-weight: 600;
  font-size: 13px;
  color: var(--el-text-color-primary, #334155);
}

.json-code {
  margin: 0;
  padding: 14px;
  max-height: 520px;
  overflow-y: auto;
  font-family: 'JetBrains Mono', Consolas, Monaco, monospace;
  font-size: 12px;
  line-height: 1.5;
  background-color: var(--el-fill-color-darker, #0f172a);
  color: #38bdf8;
}
</style>
