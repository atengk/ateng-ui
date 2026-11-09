<script setup lang="ts">
/**
 * 场景一：最小运行态表单渲染器与三段式 AST 数据流自验看板。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { AtengFormRenderer } from '@atengk/form-designer-vue';
import type {
  FormSchema,
  FieldPermissionMatrix,
  FormRendererInstance,
} from '@atengk/form-designer-vue';

const formRef = ref<FormRendererInstance | null>(null);

const isReadonly = ref<boolean>(false);
const isDisabled = ref<boolean>(false);
const currentPermissionMode = ref<'default' | 'manager' | 'finance'>('default');

const schema: FormSchema = {
  version: '1.0',
  formConfig: {
    layout: 'vertical',
    labelPosition: 'top',
    labelWidth: 100,
    colon: true,
  },
  widgetList: [
    {
      id: 'w_username',
      type: 'input',
      modelKey: 'username',
      label: '申请人姓名',
      placeholder: '请输入申请人真实姓名',
      defaultValue: '张三',
      rules: [{ required: true, message: '申请人姓名不能为空' }],
    },
    {
      id: 'w_department',
      type: 'select',
      modelKey: 'department',
      label: '所属部门',
      defaultValue: 'rd',
      options: [
        { label: '研发中心 (R&D)', value: 'rd' },
        { label: '产品运营 (Product)', value: 'product' },
        { label: '财务结算 (Finance)', value: 'finance' },
      ],
      rules: [{ required: true, message: '请选择所属部门' }],
    },
    {
      id: 'w_reason',
      type: 'textarea',
      modelKey: 'application.reason',
      label: '申请事由',
      placeholder: '请详细阐述出差或物资申请原因...',
      defaultValue: '参加 2026 年前端基础设施架构研讨会。',
      rules: [
        { required: true, message: '申请事由不能为空' },
        { min: 5, message: '申请事由最少输入 5 个字符' },
      ],
    },
    {
      id: 'w_urgent',
      type: 'checkbox',
      modelKey: 'application.isUrgent',
      label: '加急审批',
      defaultValue: false,
    },
    {
      id: 'w_audit_type',
      type: 'radio',
      modelKey: 'auditType',
      label: '审核通道',
      defaultValue: 'standard',
      options: [
        { label: '标准通道', value: 'standard' },
        { label: '绿色特快', value: 'green' },
      ],
    },
  ],
};

const formData = ref<Record<string, unknown>>({
  username: '李四',
  department: 'rd',
  application: {
    reason: '申请参与前端 L2 架构专项评审。',
    isUrgent: true,
  },
  auditType: 'green',
});

const permissionMatrix = ref<FieldPermissionMatrix>({});

const onPermissionChange = (val: 'default' | 'manager' | 'finance'): void => {
  currentPermissionMode.value = val;
  if (val === 'default') {
    permissionMatrix.value = {};
  } else if (val === 'manager') {
    // 主管审核：申请人与部门只读，其他可操作
    permissionMatrix.value = {
      username: 'readonly',
      department: 'readonly',
    };
  } else if (val === 'finance') {
    // 财务归档：全部只读，加急标记隐藏
    permissionMatrix.value = {
      username: 'readonly',
      department: 'readonly',
      'application.reason': 'readonly',
      'application.isUrgent': 'hidden',
      auditType: 'readonly',
    };
  }
};

const handleSubmit = (data: Record<string, unknown>): void => {
  ElMessage.success('表单校验通过，数据已成功提交！');
  console.log('表单最终提交数据：', data);
};

const handleValidateFail = (errors: Record<string, string>): void => {
  ElMessage.error(`表单校验失败：${Object.values(errors).join('；')}`);
};

const handleManualValidate = async (): Promise<void> => {
  if (formRef.value) {
    const res = await formRef.value.validate();
    if (res.valid) {
      ElMessage.success('表单全量校验通过！');
    } else {
      ElMessage.warning(`存在校验错误：${Object.values(res.errors).join('；')}`);
    }
  }
};

const handleReset = (): void => {
  if (formRef.value) {
    formRef.value.resetFields();
    ElMessage.info('表单已重置回初始快照');
  }
};
</script>

<template>
  <div class="minimal-scenario">
    <div class="control-panel">
      <div class="panel-section">
        <span class="section-title">全局开关：</span>
        <el-checkbox v-model="isReadonly" label="全局只读 (readonly)" />
        <el-checkbox v-model="isDisabled" label="全局禁用 (disabled)" />
      </div>

      <div class="panel-section">
        <span class="section-title">模拟流程节点权限：</span>
        <el-radio-group v-model="currentPermissionMode" size="small" @change="onPermissionChange">
          <el-radio-button value="default">发起人 (全可写)</el-radio-button>
          <el-radio-button value="manager">主管审批 (核心只读)</el-radio-button>
          <el-radio-button value="finance">财务归档 (全只读+隐藏加急)</el-radio-button>
        </el-radio-group>
      </div>

      <div class="panel-actions">
        <el-button type="primary" size="small" @click="handleManualValidate">
          调用 validate() 校验
        </el-button>
        <el-button size="small" @click="handleReset">调用 resetFields() 重置</el-button>
      </div>
    </div>

    <div class="scenario-layout">
      <!-- 表单渲染视口 -->
      <div class="form-viewport card-box">
        <h3 class="box-title">动态表单实时渲染区 (AtengFormRenderer)</h3>
        <AtengFormRenderer
          ref="formRef"
          v-model:form-data="formData"
          :schema="schema"
          :permissions="permissionMatrix"
          :readonly="isReadonly"
          :disabled="isDisabled"
          @submit="handleSubmit"
          @validate-fail="handleValidateFail"
        >
          <template #footer="{ submit, reset }">
            <el-button type="primary" @click="submit">确认提交申请</el-button>
            <el-button @click="reset">清空重填</el-button>
          </template>
        </AtengFormRenderer>
      </div>

      <!-- 数据模型实时镜像 -->
      <div class="json-viewport card-box">
        <h3 class="box-title">双向响应式 formData 数据快照 (v-model)</h3>
        <pre class="json-content">{{ JSON.stringify(formData, null, 2) }}</pre>

        <h3 class="box-title" style="margin-top: 20px">
          当前生效流程权限矩阵 (FieldPermissionMatrix)
        </h3>
        <pre class="json-content">{{ JSON.stringify(permissionMatrix, null, 2) }}</pre>
      </div>
    </div>
  </div>
</template>

<style scoped>
.minimal-scenario {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.control-panel {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background-color: var(--el-fill-color-light, #f1f5f9);
  border-radius: 8px;
  gap: 16px;
}

.panel-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-regular, #475569);
}

.scenario-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.card-box {
  background: var(--el-bg-color, #ffffff);
  border: 1px solid var(--el-border-color-light, #e2e8f0);
  border-radius: 8px;
  padding: 20px;
}

.box-title {
  margin: 0 0 16px 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary, #0f172a);
  border-bottom: 1px solid var(--el-border-color-lighter, #f1f5f9);
  padding-bottom: 8px;
}

.json-content {
  margin: 0;
  padding: 12px;
  background-color: var(--el-fill-color-darker, #0f172a);
  color: #38bdf8;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  border-radius: 6px;
  overflow-x: auto;
  max-height: 240px;
}

@media (max-width: 900px) {
  .scenario-layout {
    grid-template-columns: 1fr;
  }
}
</style>
