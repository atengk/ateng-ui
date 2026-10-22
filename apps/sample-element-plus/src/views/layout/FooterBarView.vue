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
const autoOffset = ref(true);
const sidebarCollapsed = ref(false);
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
        title="长表单吸底与智能避让机制"
        type="info"
        description="支持 sticky（容器内自然吸底）与 fixed（全屏底部悬浮）双模；fixed 模式下标配 placeholder 自动透明垫块，杜绝最底部字段被悬浮条遮挡；支持 autoOffset 结合 ResizeObserver 智能对齐目标容器宽度，侧边栏折叠/展开动画期间保持严丝合缝平滑跟手。"
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

        <span style="margin-left: 20px">容器智能对齐避让 (autoOffset)：</span>
        <ElSwitch v-model="autoOffset" :disabled="position !== 'fixed'" />

        <ElButton
          v-if="position === 'fixed' && autoOffset"
          size="small"
          type="primary"
          plain
          style="margin-left: 12px"
          @click="sidebarCollapsed = !sidebarCollapsed"
        >
          {{ sidebarCollapsed ? '展开侧边栏 (240px)' : '折叠侧边栏 (64px)' }}
        </ElButton>
      </div>

      <!-- 模拟带有侧边栏的自适应工作区容器 -->
      <div class="simulated-workspace">
        <!-- 模拟侧边栏 -->
        <aside
          v-if="position === 'fixed' && autoOffset"
          class="simulated-sidebar"
          :class="{ 'is-collapsed': sidebarCollapsed }"
        >
          <div class="sidebar-title">
            {{ sidebarCollapsed ? 'AT' : 'ATENG ADMIN' }}
          </div>
          <div class="sidebar-item">📊 运行看板</div>
          <div class="sidebar-item">📦 容器配置</div>
          <div class="sidebar-item">⚙️ 系统网关</div>
        </aside>

        <!-- 主体内容容器 -->
        <main class="simulated-main">
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
            :auto-offset="autoOffset"
            :left-offset="position === 'fixed' && !autoOffset ? '260px' : 'auto'"
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
        </main>
      </div>
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
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 24px;
  padding: 12px 16px;
  background-color: var(--el-bg-color-page);
  border-radius: var(--el-border-radius-base);
  font-size: 14px;
}

.simulated-workspace {
  display: flex;
  min-height: 480px;
  border: 1px dashed var(--el-border-color);
  border-radius: 6px;
  background-color: var(--el-bg-color);
  overflow: hidden;
}

.simulated-sidebar {
  width: 240px;
  background-color: var(--el-fill-color-darker);
  color: var(--el-text-color-primary);
  border-right: 1px solid var(--el-border-color);
  display: flex;
  flex-direction: column;
  padding: 16px;
  gap: 12px;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-sizing: border-box;
  flex-shrink: 0;
}

.simulated-sidebar.is-collapsed {
  width: 64px;
  padding: 16px 8px;
}

.sidebar-title {
  font-weight: 600;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.sidebar-item {
  font-size: 13px;
  padding: 8px;
  border-radius: 4px;
  background-color: var(--el-fill-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.simulated-main {
  flex: 1;
  min-width: 0;
  padding: 20px;
  box-sizing: border-box;
}

.long-form {
  max-width: 800px;
  margin-bottom: 24px;
}
</style>
