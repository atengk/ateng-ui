<script setup lang="ts">
/**
 * 角色控制指令 v-role 自验页面。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { ref, watchEffect } from 'vue';
import { useAuth } from '@atengk/vue';
import {
  ElCard,
  ElRadioGroup,
  ElRadioButton,
  ElSwitch,
  ElButton,
  ElAlert,
  ElTag,
} from 'element-plus';

const auth = useAuth();

const currentRole = ref('editor');
const grantAllDualRoles = ref(false);

watchEffect(() => {
  auth.setRoles(grantAllDualRoles.value ? ['editor', 'user'] : [currentRole.value]);
});
</script>

<template>
  <div class="role-view">
    <ElCard header="角色控制指令 v-role">
      <ElAlert
        title="指令特性说明"
        type="info"
        description="严格基于当前用户真实角色列表判定（admin / super_admin 不触发 v-role 全局放行；超管全局放行仅作用于 v-permission / hasPermission）；支持 .disabled 置灰修饰符与 .all 联合角色修饰符。"
        show-icon
        :closable="false"
        style="margin-bottom: 20px"
      />

      <div class="control-panel">
        <span class="label">切换当前身份：</span>
        <ElRadioGroup v-model="currentRole">
          <ElRadioButton value="admin">系统管理员 (admin)</ElRadioButton>
          <ElRadioButton value="super_admin">超级管理员 (super_admin)</ElRadioButton>
          <ElRadioButton value="editor">运营编辑 (editor)</ElRadioButton>
          <ElRadioButton value="user">普通会员 (user)</ElRadioButton>
        </ElRadioGroup>
      </div>

      <div class="status-tags">
        <span class="label">生效角色：</span>
        <ElTag v-if="!grantAllDualRoles" type="success">{{ currentRole }}</ElTag>
        <template v-else>
          <ElTag type="success">editor</ElTag>
          <ElTag type="success">user</ElTag>
        </template>
        <ElSwitch
          v-model="grantAllDualRoles"
          size="small"
          active-text="联合授权 (editor + user)"
          inactive-text="单角色模式"
        />
        <span
          v-if="!grantAllDualRoles && (currentRole === 'admin' || currentRole === 'super_admin')"
          style="color: var(--el-color-warning); font-size: 13px"
        >
          提示：v-role 仅校验真实角色归属，超管放行特权仅作用于 v-permission / hasPermission。
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

      <div class="demo-section">
        <h3>3. 联合角色全匹配控制 (.all)</h3>
        <div class="btn-group">
          <ElButton v-role.all="['editor', 'user']" type="warning">
            同时具备 editor 与 user 可见 (.all)
          </ElButton>
          <ElButton v-role.all.disabled="['editor', 'user']" type="info">
            双角色联合校验 (缺一即置灰 .all.disabled)
          </ElButton>
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
  flex-wrap: wrap;
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
