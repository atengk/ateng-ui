<script setup lang="ts">
/**
 * 权限控制指令 v-permission 自验页面。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { ref, watchEffect } from 'vue';
import { useAuth } from '@atengk/vue';
import { ElCard, ElButton, ElCheckboxGroup, ElCheckbox, ElAlert, ElTag } from 'element-plus';

const auth = useAuth();

// 可选权限清单
const availablePermissions = [
  { label: '新增用户 (sys:user:add)', value: 'sys:user:add' },
  { label: '编辑用户 (sys:user:edit)', value: 'sys:user:edit' },
  { label: '删除用户 (sys:user:delete)', value: 'sys:user:delete' },
];

const selectedPermissions = ref<string[]>(['sys:user:add']);

watchEffect(() => {
  auth.setPermissions(selectedPermissions.value);
});
</script>

<template>
  <div class="permission-view">
    <ElCard header="权限控制指令 v-permission">
      <ElAlert
        title="指令特性说明"
        type="info"
        description="默认在无权限时物理移除 DOM 并在原位保留 <!--v-permission--> 注释锚点（当权限恢复时原位插回）；支持 .disabled 修饰符将按钮降级为置灰不可点击态（捕获阶段拦截事件）；支持 .all 修饰符要求满足全部权限。"
        show-icon
        :closable="false"
        style="margin-bottom: 20px"
      />

      <div class="control-panel">
        <span class="label">当前具备的权限码：</span>
        <ElCheckboxGroup v-model="selectedPermissions">
          <ElCheckbox v-for="item in availablePermissions" :key="item.value" :value="item.value">
            {{ item.label }}
          </ElCheckbox>
        </ElCheckboxGroup>
      </div>

      <div class="status-tags">
        <span class="label">当前生效权限：</span>
        <ElTag
          v-for="perm in selectedPermissions"
          :key="perm"
          type="primary"
          style="margin-right: 8px"
        >
          {{ perm }}
        </ElTag>
        <span v-if="selectedPermissions.length === 0" style="color: var(--el-text-color-secondary)"
          >暂无任何权限</span
        >
      </div>

      <div class="demo-section">
        <h3>1. 默认物理移除模式（无权限时移除节点留注释锚点）</h3>
        <div class="btn-group">
          <ElButton v-permission="'sys:user:add'" type="primary">
            新增用户 (sys:user:add)
          </ElButton>
          <ElButton v-permission="'sys:user:edit'" type="success">
            编辑用户 (sys:user:edit)
          </ElButton>
          <ElButton v-permission="'sys:user:delete'" type="danger">
            删除用户 (sys:user:delete)
          </ElButton>
        </div>
      </div>

      <div class="demo-section">
        <h3>2. .disabled 置灰降级模式（保留节点并拦截所有交互）</h3>
        <div class="btn-group">
          <ElButton v-permission.disabled="'sys:user:add'" type="primary">
            新增 (无权限置灰)
          </ElButton>
          <ElButton v-permission.disabled="'sys:user:edit'" type="success">
            编辑 (无权限置灰)
          </ElButton>
          <ElButton v-permission.disabled="'sys:user:delete'" type="danger">
            删除 (无权限置灰)
          </ElButton>
        </div>
      </div>

      <div class="demo-section">
        <h3>3. .all 且逻辑模式（必须同时具备新增和编辑）</h3>
        <div class="btn-group">
          <ElButton v-permission.all="['sys:user:add', 'sys:user:edit']" type="warning">
            复合高级操作 (需同时具备新增和编辑)
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
