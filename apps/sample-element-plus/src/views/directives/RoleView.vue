<script setup lang="ts">
/**
 * 角色控制指令 v-role 自验页面。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { ref, watchEffect } from 'vue';
import { useAuth } from '@atengk/vue';
import { ElCard, ElRadioGroup, ElRadioButton, ElButton, ElAlert, ElTag } from 'element-plus';

const auth = useAuth();

const currentRole = ref('editor');

watchEffect(() => {
  auth.setRoles([currentRole.value]);
});
</script>

<template>
  <div class="role-view">
    <ElCard header="角色控制指令 v-role">
      <ElAlert
        title="指令特性说明"
        type="info"
        description="支持基于角色的权限判定；若当前用户拥有 admin / superadmin 超级管理员角色，默认自动全放行；支持 .disabled 置灰修饰符与 .all 联合角色修饰符。"
        show-icon
        :closable="false"
        style="margin-bottom: 20px"
      />

      <div class="control-panel">
        <span class="label">切换当前身份：</span>
        <ElRadioGroup v-model="currentRole">
          <ElRadioButton value="admin">超级管理员 (admin)</ElRadioButton>
          <ElRadioButton value="editor">运营编辑 (editor)</ElRadioButton>
          <ElRadioButton value="user">普通会员 (user)</ElRadioButton>
        </ElRadioGroup>
      </div>

      <div class="status-tags">
        <span class="label">生效角色：</span>
        <ElTag type="success">{{ currentRole }}</ElTag>
        <span
          v-if="currentRole === 'admin'"
          style="color: var(--el-color-success); font-size: 13px"
        >
          🌟 超级管理员拥有全局豁免放行权！
        </span>
      </div>

      <div class="demo-section">
        <h3>1. 角色物理移除控制（非该角色直接隐藏）</h3>
        <div class="btn-group">
          <ElButton v-role="'admin'" type="danger"> 仅系统管理员可见 </ElButton>
          <ElButton v-role="'editor'" type="primary"> 运营编辑专属入口 </ElButton>
          <ElButton v-role="['editor', 'user']" type="success"> 编辑或会员可见 </ElButton>
        </div>
      </div>

      <div class="demo-section">
        <h3>2. 角色置灰控制 (.disabled)</h3>
        <div class="btn-group">
          <ElButton v-role.disabled="'admin'" type="danger"> 管理员功能 (置灰态) </ElButton>
          <ElButton v-role.disabled="'editor'" type="primary"> 运营功能 (置灰态) </ElButton>
        </div>
      </div>
    </ElCard>
  </div>
</template>

<style scoped>
.control-panel,
.status-tags {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.label {
  font-weight: 600;
  color: var(--el-text-color-regular);
}
.demo-section {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px dashed var(--el-border-color-lighter);
}
.demo-section h3 {
  margin-bottom: 12px;
  font-size: 15px;
  color: var(--el-text-color-primary);
}
.btn-group {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
</style>
