<script setup lang="ts">
/**
 * 实时大盘沙箱组件，用于验证 KeepAlive 真实缓存保留与局部刷新。
 *
 * @author Ateng
 * @since 2026-10-29
 */

import { ref } from 'vue';
import { ElInput } from 'element-plus';

defineOptions({
  name: 'AnalyticsSandbox',
});

const metric = ref('2026 Q4 核心财务指标');
const mountTime = new Date().toLocaleTimeString();
</script>

<template>
  <div class="sandbox-subview">
    <h4>📈 实时大盘 (KeepAlive 缓存组件: AnalyticsSandbox)</h4>
    <p class="time-info">
      实例挂载时间戳: <strong>{{ mountTime }}</strong> （切换标签保持输入，右键刷新局部重新挂载）
    </p>
    <div class="form-group">
      <span>报表主题：</span>
      <ElInput v-model="metric" placeholder="输入大盘指标主题" style="width: 300px" />
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
