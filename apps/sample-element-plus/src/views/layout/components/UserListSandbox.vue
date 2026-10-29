<script setup lang="ts">
/**
 * 用户列表沙箱组件，用于验证 KeepAlive 真实缓存保留与局部刷新。
 *
 * @author Ateng
 * @since 2026-10-29
 */

import { ref } from 'vue';
import { ElInput } from 'element-plus';

defineOptions({
  name: 'UserListSandbox',
});

const keyword = ref('张三');
const role = ref('admin');
const mountTime = new Date().toLocaleTimeString();
</script>

<template>
  <div class="sandbox-subview">
    <h4>👥 用户列表 (KeepAlive 缓存组件: UserListSandbox)</h4>
    <p class="time-info">
      实例挂载时间戳: <strong>{{ mountTime }}</strong> （切换标签保持输入，右键刷新局部重新挂载）
    </p>
    <div class="form-group">
      <span>搜索用户名：</span>
      <ElInput v-model="keyword" placeholder="输入搜索用户名" style="width: 200px" />
      <span style="margin-left: 16px">分配角色：</span>
      <ElInput v-model="role" placeholder="输入角色" style="width: 160px" />
    </div>
  </div>
</template>

<style scoped>
.sandbox-subview h4 {
  margin: 0 0 8px 0;
  color: var(--el-text-color-primary);
}

.time-info {
  margin: 0 0 14px 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.time-info strong {
  color: var(--el-color-primary);
}

.form-group {
  display: flex;
  align-items: center;
  font-size: 13px;
  color: var(--el-text-color-regular);
}
</style>
