<script setup lang="ts">
/**
 * 企业级多卡片手风琴编排容器 AtengCardGroup 自验页面。
 *
 * @author Ateng
 * @since 2026-10-23
 */

import { ref } from 'vue';
import {
  ElAlert,
  ElButton,
  ElSwitch,
  ElRadioGroup,
  ElRadioButton,
  ElTag,
  ElForm,
  ElFormItem,
  ElInput,
  ElCheckboxGroup,
  ElCheckbox,
  ElMessage,
} from 'element-plus';
import { AtengCardGroup, AtengCard, type AtengCardGroupInstance } from '@atengk/element-plus';

const groupRef = ref<AtengCardGroupInstance | null>(null);
const activeKeys = ref<(string | number)[]>(['basic']);
const accordionMode = ref(true);
const gutterValue = ref<'12px' | '16px' | '24px'>('16px');

// 示例表单状态
const formBasic = ref({
  systemName: 'Ateng 企业级运营中台',
  tenantCode: 'TENANT_DEFAULT_PROD',
  maintenanceMode: false,
});

const formPayment = ref({
  channels: ['alipay', 'wechat'],
  currency: 'CNY',
  autoSettle: true,
});

const formSecurity = ref({
  watermarkEnabled: true,
  auditLogRetentionDays: '180',
  dataMaskingLevel: 'high',
});

const formNotify = ref({
  webhookUrl: 'https://api.internal.com/hooks/monitor',
  alertThreshold: '500ms',
});

const handleExpandAll = () => {
  groupRef.value?.expandAll();
  ElMessage.success('已触发一键全部展开 (expandAll)');
};

const handleCollapseAll = () => {
  groupRef.value?.collapseAll();
  ElMessage.info('已触发一键全部收起 (collapseAll)');
};
</script>

<template>
  <div class="card-group-view">
    <ElAlert
      title="AtengCardGroup 多卡片手风琴编排容器"
      type="info"
      description="上下文总线：基于 Vue Provide/Inject 深度协调内部子 AtengCard，实现无感知卡片注册与状态互斥；单开互斥手风琴：开启 accordion 后展开某张卡片时自动收起其他卡片；双向状态绑定：通过 v-model:activeKeys 掌握所有展开卡片；对称操作门面：组件实例暴露 expandAll() 与 collapseAll() 一键批量控制。"
      show-icon
      :closable="false"
      style="margin-bottom: 20px"
    />

    <!-- 操作控制条 -->
    <div class="ctrl-bar">
      <span>手风琴模式 (accordion)：</span>
      <ElSwitch v-model="accordionMode" />

      <span style="margin-left: 20px">卡片间距 (gutter)：</span>
      <ElRadioGroup v-model="gutterValue" size="small">
        <ElRadioButton value="12px">紧凑 (12px)</ElRadioButton>
        <ElRadioButton value="16px">标准 (16px)</ElRadioButton>
        <ElRadioButton value="24px">宽松 (24px)</ElRadioButton>
      </ElRadioGroup>

      <span style="margin-left: 20px">批量操作门面：</span>
      <ElButton size="small" type="primary" plain @click="handleExpandAll">
        全部展开 (expandAll)
      </ElButton>
      <ElButton size="small" @click="handleCollapseAll">全部收起 (collapseAll)</ElButton>

      <div class="status-tags">
        <span class="status-lbl">当前展开卡片 (v-model:activeKeys)：</span>
        <ElTag v-for="key in activeKeys" :key="key" size="small" type="success">
          {{ key }}
        </ElTag>
        <span v-if="activeKeys.length === 0" class="empty-tip">[ 全部已折叠 ]</span>
      </div>
    </div>

    <!-- 手风琴多卡片容器 -->
    <AtengCardGroup
      ref="groupRef"
      v-model:active-keys="activeKeys"
      :accordion="accordionMode"
      :gutter="gutterValue"
    >
      <!-- 卡片 1：基础配置 -->
      <AtengCard
        name="basic"
        title="1. 系统基础环境配置"
        sub-title="全局租户标识与基础运行参数"
        tooltip="该配置项影响全局所有子微服务的运行上下文"
        collapsible
      >
        <template #extra>
          <ElTag size="small">系统运行中</ElTag>
        </template>
        <ElForm :model="formBasic" label-width="140px" class="sample-form">
          <ElFormItem label="系统名称：">
            <ElInput v-model="formBasic.systemName" placeholder="请输入系统展示名称" />
          </ElFormItem>
          <ElFormItem label="租户编码：">
            <ElInput v-model="formBasic.tenantCode" disabled />
          </ElFormItem>
          <ElFormItem label="系统维护模式：">
            <ElSwitch v-model="formBasic.maintenanceMode" />
            <span class="field-tip">开启后非管理员访问将跳转至友好维护页面</span>
          </ElFormItem>
        </ElForm>
      </AtengCard>

      <!-- 卡片 2：结算配置 -->
      <AtengCard
        name="payment"
        title="2. 结算与支付渠道配置"
        sub-title="多通道路由与清算清分规则"
        tooltip="支持动态热切换收单通道"
        collapsible
      >
        <ElForm :model="formPayment" label-width="140px" class="sample-form">
          <ElFormItem label="可用收单渠道：">
            <ElCheckboxGroup v-model="formPayment.channels">
              <ElCheckbox value="alipay">支付宝企业直付通</ElCheckbox>
              <ElCheckbox value="wechat">微信支付电商收付通</ElCheckbox>
              <ElCheckbox value="unionpay">银联电子账户直联</ElCheckbox>
            </ElCheckboxGroup>
          </ElFormItem>
          <ElFormItem label="T+1 自动清分结算：">
            <ElSwitch v-model="formPayment.autoSettle" />
          </ElFormItem>
        </ElForm>
      </AtengCard>

      <!-- 卡片 3：安全与审计 -->
      <AtengCard
        name="security"
        title="3. 数据安全与防篡改策略"
        sub-title="敏感合规审计与企业级防泄密"
        tooltip="采用离屏矢量 Canvas 与 MutationObserver 强力防范"
        collapsible
      >
        <ElForm :model="formSecurity" label-width="140px" class="sample-form">
          <ElFormItem label="启用防篡改安全水印：">
            <ElSwitch v-model="formSecurity.watermarkEnabled" />
            <span class="field-tip">自动在全屏与敏感业务页面打上员工工号防泄密水印</span>
          </ElFormItem>
          <ElFormItem label="操作审计留存期：">
            <ElInput
              v-model="formSecurity.auditLogRetentionDays"
              style="width: 200px"
              placeholder="天数"
            >
              <template #append>天</template>
            </ElInput>
          </ElFormItem>
        </ElForm>
      </AtengCard>

      <!-- 卡片 4：告警配置 -->
      <AtengCard
        name="notify"
        title="4. 智能告警与运维通告"
        sub-title="高风险操作实时推送到钉钉/飞书大群"
        tooltip="Webhook 签名采用 HMAC-SHA256 加密鉴权"
        collapsible
      >
        <ElForm :model="formNotify" label-width="140px" class="sample-form">
          <ElFormItem label="告警 Webhook：">
            <ElInput v-model="formNotify.webhookUrl" placeholder="https://..." />
          </ElFormItem>
          <ElFormItem label="慢查询阻断阈值：">
            <ElInput v-model="formNotify.alertThreshold" style="width: 200px" />
          </ElFormItem>
        </ElForm>
      </AtengCard>
    </AtengCardGroup>
  </div>
</template>

<style scoped>
.card-group-view {
  width: 100%;
}

.ctrl-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 20px;
  padding: 12px 16px;
  background-color: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: var(--el-border-radius-base);
  font-size: 14px;
}

.status-tags {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.status-lbl {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.empty-tip {
  font-size: 13px;
  color: var(--el-text-color-placeholder);
}

.sample-form {
  max-width: 640px;
  padding: 8px 0;
}

.field-tip {
  margin-left: 12px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
