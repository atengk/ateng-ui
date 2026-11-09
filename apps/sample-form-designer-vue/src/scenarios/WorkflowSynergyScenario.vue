<script setup lang="ts">
/**
 * 场景四：BPMN 流程协同与节点权限矩阵 (FieldPermissionMatrix) 仿真看板。
 *
 * 遵循 ADR-0017、ADR-0044 与“Node Overrides Schema”仲裁准则：
 * 1. 模拟多节点流转（发起申请 -> 主管审批 -> 财务复核 -> 归档存查）；
 * 2. 字段只读态实现脱壳无框纯文本渲染，支持金额货币格式化与手机号隐私脱敏；
 * 3. 隐藏态字段从渲染树与校验队列中同时剔除，杜绝被隐藏必填项阻塞提交；
 * 4. 保持内存真明文契约，展示脱敏收敛于渲染管道。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { AtengFormRenderer } from '@atengk/form-designer-vue';
import type {
  FormSchema,
  FieldPermissionMatrix,
  FormRendererInstance,
} from '@atengk/form-designer-vue';

const formRef = ref<FormRendererInstance | null>(null);

// 当前模拟流程节点类型
type WorkflowNodeKey = 'applicant' | 'manager' | 'finance' | 'archived';
const currentNode = ref<WorkflowNodeKey>('applicant');

const formData = ref<Record<string, unknown>>({
  applicantName: '张三',
  phone: '13812345678',
  department: 'rd',
  amount: 6850.5,
  reason: '采购高性能 AI 开发工作站与双 4K 显示器。',
  managerOpinion: '',
  ledgerCode: 'FIN-2026-9908',
  financeOpinion: '',
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
      id: 'w_name',
      type: 'input',
      modelKey: 'applicantName',
      label: '报销申请人',
      placeholder: '请输入申请人姓名',
      defaultValue: '张三',
      rules: [{ required: true, message: '申请人姓名不能为空' }],
    },
    {
      id: 'w_phone',
      type: 'input',
      modelKey: 'phone',
      label: '联系手机 (只读态自动脱敏)',
      placeholder: '请输入 11 位手机号码',
      defaultValue: '13812345678',
      rules: [{ required: true, message: '联系手机不能为空' }],
      props: { formatType: 'phone' },
    },
    {
      id: 'w_dept',
      type: 'select',
      modelKey: 'department',
      label: '归属部门',
      defaultValue: 'rd',
      options: [
        { label: '研发基础设施 (R&D)', value: 'rd' },
        { label: 'AI 算法工程院 (AI Lab)', value: 'ai' },
        { label: '产品用户体验 (Design)', value: 'design' },
      ],
      rules: [{ required: true, message: '请选择归属部门' }],
    },
    {
      id: 'w_amount',
      type: 'input',
      modelKey: 'amount',
      label: '报销总金额 (只读态自动货币化)',
      placeholder: '请输入报销金额',
      defaultValue: 6850.5,
      rules: [{ required: true, message: '报销金额不能为空' }],
      props: { formatType: 'currency', currencySymbol: '¥', precision: 2 },
    },
    {
      id: 'w_reason',
      type: 'textarea',
      modelKey: 'reason',
      label: '详细报销事由',
      placeholder: '请详细阐明费用支出原因与用途...',
      defaultValue: '',
      rules: [{ required: true, message: '详细报销事由不能为空' }],
    },
    {
      id: 'w_manager_opinion',
      type: 'textarea',
      modelKey: 'managerOpinion',
      label: '直属主管审批意见',
      placeholder: '请签署审批意见（主管节点强制必填）',
      defaultValue: '',
      rules: [{ required: true, message: '主管审批意见不能为空' }],
    },
    {
      id: 'w_ledger_code',
      type: 'input',
      modelKey: 'ledgerCode',
      label: '财务总账会计科目核算编码',
      placeholder: '请输入总账入账编码 (如 FIN-2026-XXXX)',
      defaultValue: '',
      rules: [{ required: true, message: '财务核算编码不能为空' }],
    },
    {
      id: 'w_finance_opinion',
      type: 'textarea',
      modelKey: 'financeOpinion',
      label: '财务合规复核决算意见',
      placeholder: '请签署复核决算意见（财务节点强制必填）',
      defaultValue: '',
      rules: [{ required: true, message: '财务复核意见不能为空' }],
    },
  ],
};

// 预设计划各审批节点的权限矩阵
const nodePermissionsMap: Record<WorkflowNodeKey, FieldPermissionMatrix> = {
  // 1. 发起人填报节点：基础信息可编辑，主管与财务意见隐藏
  applicant: {
    applicantName: 'editable',
    phone: 'editable',
    department: 'editable',
    amount: 'editable',
    reason: 'editable',
    managerOpinion: 'hidden',
    ledgerCode: 'hidden',
    financeOpinion: 'hidden',
  },
  // 2. 主管审批节点：申请信息只读脱壳，主管意见强制必填，财务意见隐藏
  manager: {
    applicantName: 'readonly',
    phone: 'readonly',
    department: 'readonly',
    amount: 'readonly',
    reason: 'readonly',
    managerOpinion: 'required',
    ledgerCode: 'hidden',
    financeOpinion: 'hidden',
  },
  // 3. 财务复核节点：前序信息与主管意见只读脱壳，财务科目与意见强制必填
  finance: {
    applicantName: 'readonly',
    phone: 'readonly',
    department: 'readonly',
    amount: 'readonly',
    reason: 'readonly',
    managerOpinion: 'readonly',
    ledgerCode: 'required',
    financeOpinion: 'required',
  },
  // 4. 流程归档终态：全量字段只读脱壳
  archived: {
    applicantName: 'readonly',
    phone: 'readonly',
    department: 'readonly',
    amount: 'readonly',
    reason: 'readonly',
    managerOpinion: 'readonly',
    ledgerCode: 'readonly',
    financeOpinion: 'readonly',
  },
};

const currentPermissions = computed<FieldPermissionMatrix>(() => {
  return nodePermissionsMap[currentNode.value];
});

async function handleNextStep() {
  if (!formRef.value) return;
  const res = await formRef.value.validate();
  if (!res.valid) {
    ElMessage.error(`❌ 当前节点校验未通过: ${Object.values(res.errors).join(', ')}`);
    return;
  }

  if (currentNode.value === 'applicant') {
    currentNode.value = 'manager';
    formData.value.managerOpinion = '同意采购申请，符合研发硬件采购标准。';
    ElMessage.success('🚀 已提交发起申请，流转至【主管审批】节点');
  } else if (currentNode.value === 'manager') {
    currentNode.value = 'finance';
    formData.value.financeOpinion = '发票与报销凭据齐全，符合财务支出报销合规制度。';
    ElMessage.success('🚀 主管审批通过，流转至【财务复核】节点');
  } else if (currentNode.value === 'finance') {
    currentNode.value = 'archived';
    ElMessage.success('🎉 财务复核完毕，流程已全流程归档办结！');
  }
}

function handleReset() {
  currentNode.value = 'applicant';
  formData.value = {
    applicantName: '张三',
    phone: '13812345678',
    department: 'rd',
    amount: 6850.5,
    reason: '采购高性能 AI 开发工作站与双 4K 显示器。',
    managerOpinion: '',
    ledgerCode: 'FIN-2026-9908',
    financeOpinion: '',
  };
  formRef.value?.clearValidate();
  ElMessage.info('已重置为初始发起人填报节点');
}
</script>

<template>
  <div class="workflow-synergy-scenario">
    <div class="scenario-banner">
      <div class="banner-title">
        <h3>BPMN 流程协同与节点权限矩阵 (FieldPermissionMatrix) 看板</h3>
        <el-tag type="primary" effect="dark">流程权限最高优先级 (Node Overrides Schema)</el-tag>
      </div>
      <p class="banner-desc">
        深度对接 BPMN 流程引擎协同契约：在审批节点流转中无缝切换 editable / readonly / hidden /
        required 四态；
        只读态实现无边框脱壳纯文本渲染，支持金额货币化与隐私脱敏，并保持底层内存真明文契约。
      </p>
    </div>

    <!-- 节点模拟切换工具条 -->
    <div class="workflow-controller-card">
      <div class="controller-header">
        <span class="ctrl-title">当前 BPMN 模拟流转节点：</span>
        <el-radio-group v-model="currentNode" size="default">
          <el-radio-button value="applicant">1. 发起申请人 (Applicant)</el-radio-button>
          <el-radio-button value="manager">2. 直属主管审批 (Manager)</el-radio-button>
          <el-radio-button value="finance">3. 财务复核决算 (Finance)</el-radio-button>
          <el-radio-button value="archived">4. 流程办结归档 (Archived)</el-radio-button>
        </el-radio-group>
      </div>

      <div class="controller-actions">
        <el-button v-if="currentNode !== 'archived'" type="primary" @click="handleNextStep">
          节点校验并流转下一节点
        </el-button>
        <el-button @click="handleReset">重置回初始节点</el-button>
      </div>
    </div>

    <div class="scenario-layout">
      <!-- 左侧：表单渲染容器 -->
      <div class="layout-left">
        <div class="form-container-card">
          <AtengFormRenderer
            ref="formRef"
            v-model:form-data="formData"
            :schema="schema"
            :permissions="currentPermissions"
          />
        </div>
      </div>

      <!-- 右侧：当前节点权限矩阵与数据透视 -->
      <div class="layout-right">
        <!-- 权限矩阵速查 -->
        <div class="diag-card">
          <div class="diag-header">
            <h4>📋 当前节点权限仲裁矩阵 (FieldPermissionMatrix)</h4>
          </div>
          <div class="permission-table">
            <div
              v-for="(perm, fieldKey) in currentPermissions"
              :key="fieldKey"
              class="permission-row"
            >
              <span class="field-key">{{ fieldKey }}</span>
              <el-tag
                size="small"
                :type="
                  perm === 'editable'
                    ? 'success'
                    : perm === 'readonly'
                      ? 'info'
                      : perm === 'required'
                        ? 'danger'
                        : 'warning'
                "
              >
                {{ perm }}
              </el-tag>
            </div>
          </div>
        </div>

        <!-- 真实数据模型 -->
        <div class="diag-card">
          <div class="diag-header">
            <h4>💾 内存真实明文数据 (formData)</h4>
            <el-tag type="info" size="small">ADR-0017: 纯净明文无星号污染</el-tag>
          </div>
          <pre class="json-preview">{{ JSON.stringify(formData, null, 2) }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.workflow-synergy-scenario {
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

.workflow-controller-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--el-bg-color, #ffffff);
  border: 1px solid var(--el-border-color, #e2e8f0);
  border-radius: 8px;
  padding: 14px 20px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.controller-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ctrl-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary, #0f172a);
}

.controller-actions {
  display: flex;
  gap: 10px;
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

.permission-table {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.permission-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px;
  background: var(--el-fill-color-lighter, #f8fafc);
  border-radius: 4px;
}

.field-key {
  font-size: 13px;
  font-family: monospace;
  color: var(--el-text-color-regular, #334155);
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

@media (max-width: 992px) {
  .workflow-controller-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  .scenario-layout {
    grid-template-columns: 1fr;
  }
}
</style>
