<script setup lang="ts">
/**
 * 工作台沙箱组件，用于验证 KeepAlive 真实缓存保留与局部刷新。
 *
 * @author Ateng
 * @since 2026-10-29
 */

import { ref } from 'vue';
import { ElInput, ElButton } from 'element-plus';

defineOptions({
  name: 'DashboardSandbox',
});

const note = ref('工作台草稿备忘：测试 KeepAlive 缓存保留');
const counter = ref(10);
const mountTime = new Date().toLocaleTimeString();
</script>

<template>
  <div class="sandbox-subview">
    <h4>📊 工作台首页 (KeepAlive 缓存组件: DashboardSandbox)</h4>
    <p class="time-info">
      实例挂载时间戳: <strong>{{ mountTime }}</strong> （切换标签保持输入，右键刷新局部重新挂载）
    </p>
    <div class="form-group">
      <span>草稿输入：</span>
      <ElInput v-model="note" placeholder="输入内容测试切换标签缓存保留..." style="width: 320px" />
    </div>
    <div class="form-group" style="margin-top: 10px">
      <span>计数器状态：</span>
      <ElButton size="small" type="primary" plain @click="counter++">
        点击增加计数: {{ counter }}
      </ElButton>
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
