<script setup lang="ts">
/**
 * 场景二：校验引擎、异步网络防抖与时序抗竞态自验看板。
 *
 * 遵循 ADR-0013 与 ADR-0044 规约：
 * 1. 验证同步规则（必填、格式正则、数值区间、内置 email/integer 等）；
 * 2. 验证异步网络查重、防抖延迟（debounceMs）与校验中状态（validating 指示器）；
 * 3. 验证逻辑流水号与 AbortController 时序双重防御（快速输入不发生先发后至覆盖）。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { AtengFormRenderer } from '@atengk/form-designer-vue';
import type { FormSchema, FormRendererInstance } from '@atengk/form-designer-vue';

const formRef = ref<FormRendererInstance | null>(null);

const formData = ref<Record<string, unknown>>({
  username: '',
  email: '',
  age: 25,
  inviteCode: '',
});

const validationLogs = ref<string[]>([]);

function appendLog(msg: string) {
  const time = new Date().toLocaleTimeString();
  validationLogs.value.unshift(`[${time}] ${msg}`);
  if (validationLogs.value.length > 20) {
    validationLogs.value.pop();
  }
}

// 模拟已占用的用户名库
const OCCUPIED_USERNAMES = ['admin', 'root', 'administrator', 'system', 'tester'];

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
      id: 'w_username',
      type: 'input',
      modelKey: 'username',
      label: '注册账号 (带异步查重与防抖)',
      placeholder: '请输入账号（试输入 admin 或 root 触发占用）',
      defaultValue: '',
      rules: [
        { required: true, message: '账号不能为空', trigger: 'blur' },
        { min: 3, max: 20, message: '账号长度须在 3 到 20 个字符之间', trigger: 'blur' },
        {
          pattern: /^[a-zA-Z0-9_]+$/,
          message: '账号仅支持英文字母、数字和下划线',
          trigger: 'change',
        },
        {
          debounceMs: 400,
          trigger: 'change',
          asyncValidator: async (_rule, val) => {
            if (!val || typeof val !== 'string') return;
            appendLog(`[网络请求发起] 正在校验账号 "${val}" 是否可用...`);
            // 模拟 500ms 服务端延迟
            await new Promise(resolve => setTimeout(resolve, 500));
            if (OCCUPIED_USERNAMES.includes(val.toLowerCase())) {
              appendLog(`[校验失败] 账号 "${val}" 已被占用！`);
              throw new Error(`账号 "${val}" 已被注册，请更换`);
            }
            appendLog(`[校验通过] 账号 "${val}" 可用`);
          },
        },
      ],
    },
    {
      id: 'w_email',
      type: 'input',
      modelKey: 'email',
      label: '电子邮箱 (内置类型校验)',
      placeholder: '请输入常用邮箱地址',
      defaultValue: '',
      rules: [
        { required: true, message: '邮箱地址不能为空', trigger: 'blur' },
        { type: 'email', message: '请输入合法有效的邮箱格式', trigger: 'blur' },
      ],
    },
    {
      id: 'w_age',
      type: 'input',
      modelKey: 'age',
      label: '用户年龄 (数值与范围校验)',
      placeholder: '请输入年龄 (18 - 100)',
      defaultValue: 25,
      rules: [
        { required: true, message: '年龄不能为空' },
        { type: 'integer', message: '年龄必须为整数' },
        { min: 18, max: 100, message: '年龄必须在 18 至 100 岁之间' },
      ],
    },
    {
      id: 'w_invite',
      type: 'input',
      modelKey: 'inviteCode',
      label: '内部邀请码 (精确长度与异步校验)',
      placeholder: '请输入 6 位邀请码 (例如 VIP888)',
      defaultValue: '',
      rules: [
        { required: true, message: '邀请码不能为空' },
        { len: 6, message: '邀请码必须为 6 位字符' },
        {
          debounceMs: 300,
          asyncValidator: async (_rule, val) => {
            if (!val || String(val).length !== 6) return;
            appendLog(`[网络请求发起] 正在核验邀请码 "${val}"...`);
            await new Promise(resolve => setTimeout(resolve, 400));
            if (val !== 'VIP888') {
              appendLog(`[校验失败] 邀请码 "${val}" 无效`);
              throw new Error('邀请码不存在或已过期 (体验有效码: VIP888)');
            }
            appendLog(`[校验通过] 邀请码 "${val}" 核验成功`);
          },
        },
      ],
    },
  ],
};

const isValidating = computed<boolean>(() => {
  return formRef.value?.validating ?? false;
});

const currentValidatingFields = computed<string[]>(() => {
  return formRef.value?.validatingFields ?? [];
});

async function handleValidateAll() {
  if (!formRef.value) return;
  appendLog('>>> 触发全量表单校验 (validate)...');
  const res = await formRef.value.validate();
  if (res.valid) {
    ElMessage.success('🎉 表单全量校验通过，允许提交！');
    appendLog('>>> 全量表单校验通过！');
  } else {
    ElMessage.error(`❌ 表单校验未通过，存在 ${Object.keys(res.errors).length} 个错误`);
    appendLog(`>>> 校验失败: ${JSON.stringify(res.errors)}`);
  }
}

async function handleValidateUsername() {
  if (!formRef.value) return;
  appendLog('>>> 单独校验 username 字段...');
  const res = await formRef.value.validateField('username');
  if (res.valid) {
    ElMessage.success('username 校验通过');
  } else {
    ElMessage.warning(`username 校验不通过: ${res.error}`);
  }
}

function handleClearUsername() {
  formRef.value?.clearValidate('username');
  appendLog('已清除 username 错误');
}

function handleClearAll() {
  formRef.value?.clearValidate();
  appendLog('已清除全量表单错误');
}

function handleReset() {
  formRef.value?.resetFields();
  appendLog('已调用 resetFields 重置表单');
}

// 竞态测试：先发慢请求（输入 admin 查重需要 800ms 失败），紧接着发快请求（输入 vip 查重只需 100ms 成功）
async function handleRaceConditionStressTest() {
  if (!formRef.value) return;
  appendLog('🚀 启动并发竞态抗干扰测试：模拟快速先发慢请求(admin)，再发快请求(vip_user)...');

  formData.value.username = 'admin';
  formRef.value.validateField('username');

  // 100ms 后立即变更为有效账号
  setTimeout(() => {
    formData.value.username = 'vip_user';
    formRef.value?.validateField('username');
    appendLog('⚡ 紧随其后发起第二个快请求 (vip_user)...');
  }, 100);
}
</script>

<template>
  <div class="async-validation-scenario">
    <div class="scenario-banner">
      <div class="banner-title">
        <h3>校验引擎、防抖网络与时序抗竞态看板</h3>
        <div class="status-tags">
          <el-tag :type="isValidating ? 'warning' : 'success'" effect="dark">
            {{ isValidating ? '⏳ 网络校验中...' : '✔ 状态就绪' }}
          </el-tag>
          <el-tag v-if="currentValidatingFields.length > 0" type="info">
            校验中字段: {{ currentValidatingFields.join(', ') }}
          </el-tag>
        </div>
      </div>
      <p class="banner-desc">
        全面对齐 async-validator 标准规范，支持同步规则、内置类型以及防抖异步接口校验；
        依托流水号与物理 AbortSignal 双重防线，根绝快速键入导致的“先发后至”状态回退。
      </p>
    </div>

    <div class="scenario-layout">
      <!-- 左侧：表单容器与操作工具条 -->
      <div class="layout-left">
        <div class="action-toolbar">
          <el-button type="primary" :loading="isValidating" @click="handleValidateAll">
            提交并全量校验 (validate)
          </el-button>
          <el-button @click="handleValidateUsername">校验账号 (validateField)</el-button>
          <el-button @click="handleClearUsername">清除账号错误</el-button>
          <el-button @click="handleClearAll">清除全量错误</el-button>
          <el-button @click="handleReset">重置表单</el-button>
          <el-button type="warning" plain @click="handleRaceConditionStressTest">
            ⚡ 并发竞态压力测试
          </el-button>
        </div>

        <div class="form-container-card">
          <AtengFormRenderer ref="formRef" v-model:form-data="formData" :schema="schema" />
        </div>
      </div>

      <!-- 右侧：实时数据流与校验诊断日志 -->
      <div class="layout-right">
        <div class="diag-card">
          <div class="diag-header">
            <h4>📊 实时双向表单数据 (formData)</h4>
          </div>
          <pre class="json-preview">{{ JSON.stringify(formData, null, 2) }}</pre>
        </div>

        <div class="diag-card">
          <div class="diag-header">
            <h4>🔍 校验日志与抗竞态跟踪</h4>
            <el-button text size="small" @click="validationLogs = []">清空</el-button>
          </div>
          <div class="log-container">
            <div v-if="validationLogs.length === 0" class="empty-log">
              暂无日志，输入表单或触发校验查看跟踪
            </div>
            <div
              v-for="(log, idx) in validationLogs"
              :key="idx"
              class="log-item"
              :class="{
                'log-error': log.includes('失败'),
                'log-success': log.includes('通过'),
                'log-info': log.includes('发起') || log.includes('>>>'),
              }"
            >
              {{ log }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.async-validation-scenario {
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

.status-tags {
  display: flex;
  gap: 8px;
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
  flex-wrap: wrap;
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

.log-container {
  max-height: 240px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-right: 4px;
}

.empty-log {
  font-size: 12px;
  color: var(--el-text-color-placeholder, #94a3b8);
  text-align: center;
  padding: 20px 0;
}

.log-item {
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 4px;
  background: var(--el-fill-color-lighter, #f8fafc);
  color: var(--el-text-color-regular, #334155);
  font-family: monospace;
}

.log-item.log-error {
  background: #fef2f2;
  color: #dc2626;
  border-left: 3px solid #dc2626;
}

.log-item.log-success {
  background: #f0fdf4;
  color: #16a34a;
  border-left: 3px solid #16a34a;
}

.log-item.log-info {
  background: #f0f9ff;
  color: #0284c7;
  border-left: 3px solid #0284c7;
}

@media (max-width: 992px) {
  .scenario-layout {
    grid-template-columns: 1fr;
  }
}
</style>
