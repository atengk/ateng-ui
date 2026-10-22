<script setup lang="ts">
/**
 * 企业级吸底操作栏 AtengFooterBar 自验页面。
 *
 * @author Ateng
 * @since 2026-10-22
 */

import { ref } from 'vue';
import {
  ElCard,
  ElForm,
  ElFormItem,
  ElInput,
  ElSelect,
  ElOption,
  ElButton,
  ElRadioGroup,
  ElRadioButton,
  ElSwitch,
  ElAlert,
  ElMessage,
} from 'element-plus';
import { AtengFooterBar } from '@atengk/element-plus';

const position = ref<'sticky' | 'fixed'>('sticky');
const placeholder = ref(true);
const isSubmitting = ref(false);

const formData = ref({
  systemName: 'Ateng Enterprise Platform',
  version: '2.5.0-RELEASE',
  domain: 'https://admin.ateng.local',
  adminEmail: 'root@ateng.local',
  clusterSize: '3 Nodes (High Availability)',
  maxConnections: '5000',
  description: '工业级企业系统全栈配置，包含权限、路由网关、缓存与多租户隔离规范。',
  securityPolicy: 'Strict-Level-3',
  backupSchedule: 'Daily at 02:00 UTC',
});

const handleSubmit = async () => {
  isSubmitting.value = true;
  await new Promise(resolve => setTimeout(resolve, 1500));
  isSubmitting.value = false;
  ElMessage.success('系统配置参数已成功持久化并分发至集群！');
};

const handleReset = () => {
  ElMessage.info('表单字段已重置');
};
</script>

<template>
  <div class="footer-bar-view">
    <ElCard header="企业级吸底操作栏 AtengFooterBar">
      <ElAlert
        title="长表单吸底与防遮挡机制"
        type="info"
        description="支持 sticky（容器内自然吸底）与 fixed（全屏底部悬浮）双模；fixed 模式下标配 placeholder 自动透明垫块，彻底杜绝最底部字段被悬浮条遮挡的痛点；提供 leftOffset 侧边栏避让偏移。"
        show-icon
        :closable="false"
        style="margin-bottom: 20px"
      />

      <div class="ctrl-bar">
        <span>定位模式：</span>
        <ElRadioGroup v-model="position" size="small">
          <ElRadioButton value="sticky">粘滞吸底 (Sticky)</ElRadioButton>
          <ElRadioButton value="fixed">视口悬浮 (Fixed)</ElRadioButton>
        </ElRadioGroup>

        <span style="margin-left: 20px">防遮挡垫块 (placeholder)：</span>
        <ElSwitch v-model="placeholder" :disabled="position !== 'fixed'" />
      </div>

      <!-- 长表单模拟 -->
      <ElForm :model="formData" label-width="140px" class="long-form">
        <ElFormItem label="系统名称">
          <ElInput v-model="formData.systemName" />
        </ElFormItem>
        <ElFormItem label="基线版本">
          <ElInput v-model="formData.version" />
        </ElFormItem>
        <ElFormItem label="服务域名">
          <ElInput v-model="formData.domain" />
        </ElFormItem>
        <ElFormItem label="管理员邮箱">
          <ElInput v-model="formData.adminEmail" />
        </ElFormItem>
        <ElFormItem label="集群规约">
          <ElInput v-model="formData.clusterSize" />
        </ElFormItem>
        <ElFormItem label="最大并发连接">
          <ElInput v-model="formData.maxConnections" />
        </ElFormItem>
        <ElFormItem label="安全防护级别">
          <ElSelect v-model="formData.securityPolicy" style="width: 100%">
            <ElOption label="严格级别 3 (银行级双向校验)" value="Strict-Level-3" />
            <ElOption label="标准级别 2 (微服务通用防护)" value="Standard-Level-2" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="自动备份周期">
          <ElInput v-model="formData.backupSchedule" />
        </ElFormItem>
        <ElFormItem label="详细业务陈述">
          <ElInput v-model="formData.description" type="textarea" :rows="4" />
        </ElFormItem>
      </ElForm>

      <!-- 吸底操作栏 -->
      <AtengFooterBar
        :position="position"
        :placeholder="placeholder"
        :left-offset="position === 'fixed' ? '260px' : 'auto'"
      >
        <template #extra>
          <span>💾 草稿已于 10:45 自动保存</span>
          <span style="color: var(--el-color-success)">● 配置状态已同步</span>
        </template>

        <ElButton :disabled="isSubmitting" @click="handleReset">重置修改</ElButton>
        <ElButton type="primary" :loading="isSubmitting" @click="handleSubmit">
          保存并分发配置
        </ElButton>
      </AtengFooterBar>
    </ElCard>
  </div>
</template>

<style scoped>
.footer-bar-view {
  width: 100%;
}

.ctrl-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  padding: 12px 16px;
  background-color: var(--el-bg-color-page);
  border-radius: var(--el-border-radius-base);
  font-size: 14px;
}

.long-form {
  max-width: 800px;
  margin-bottom: 24px;
}
</style>
