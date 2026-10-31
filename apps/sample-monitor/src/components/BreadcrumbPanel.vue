<script setup lang="ts">
/**
 * 用户行为面包屑与三级脱敏演练面板。
 *
 * @author Ateng
 * @since 2026-10-31
 */

import { ref } from 'vue';
import {
  ElButton,
  ElInput,
  ElCard,
  ElTag,
  ElTimeline,
  ElTimelineItem,
  ElMessage,
} from 'element-plus';
import { setupSampleMonitor } from '../monitor';
import type { BreadcrumbItem } from '@atengk/monitor';

const monitor = setupSampleMonitor();
const testInput = ref('普通用户输入内容');
const passwordInput = ref('MyPassword123456');
const breadcrumbs = ref<BreadcrumbItem[]>([]);

const refreshBreadcrumbs = () => {
  const plugin = monitor.getPlugin('breadcrumb') as
    { getBreadcrumbs?: () => BreadcrumbItem[] } | undefined;
  if (plugin && typeof plugin.getBreadcrumbs === 'function') {
    breadcrumbs.value = plugin.getBreadcrumbs().slice().reverse();
  }
};

// 触发普通按钮点击
const onCommonClick = () => {
  ElMessage.info('触发普通按钮点击');
  setTimeout(refreshBreadcrumbs, 50);
};

// 触发虚拟路由流转
const onNavigate = (path: string) => {
  window.history.pushState(null, '', path);
  ElMessage.success(`触发 SPA 虚拟路由流转 ➜ ${path}`);
  setTimeout(refreshBreadcrumbs, 80);
};

// 打印测试日志
const onLogConsole = () => {
  console.log('用户在面板中执行了查询动作', { filter: 'active', page: 1 });
  ElMessage.info('已记录一条控制台轨迹日志');
  setTimeout(refreshBreadcrumbs, 50);
};
</script>

<template>
  <el-card shadow="never" class="panel-card">
    <template #header>
      <div class="card-header">
        <span class="title">4. 用户行为面包屑轨迹与三级脱敏时间轴</span>
        <el-tag type="primary" effect="plain">Breadcrumb & PII Sanitizer</el-tag>
      </div>
    </template>

    <div class="test-controls">
      <div class="input-group">
        <label>普通输入框：</label>
        <el-input v-model="testInput" placeholder="输入普通文本" style="width: 200px" />
      </div>

      <div class="input-group">
        <label>密码框 (自动掩码)：</label>
        <el-input
          v-model="passwordInput"
          type="password"
          placeholder="密码内容自动脱敏"
          style="width: 200px"
        />
      </div>

      <div class="input-group">
        <label>脱敏容器 [data-monitor-mask]：</label>
        <span data-monitor-mask="true" class="mask-box">
          敏感身份证: 110101199001018888 (点击此文本验证掩码)
        </span>
      </div>
    </div>

    <div class="action-buttons">
      <el-button type="primary" plain @click="onCommonClick">
        点击测试按钮 (生成 UI Click 面包屑)
      </el-button>
      <el-button type="success" plain @click="onNavigate('/dashboard/orders?status=all')">
        流转至订单中心 (触发虚拟路由与 PAGE_VIEW)
      </el-button>
      <el-button type="warning" plain @click="onNavigate('/user/settings#security')">
        流转至安全设置 (Hash 路由)
      </el-button>
      <el-button type="info" plain @click="onLogConsole"> 记录 Console 轨迹日志 </el-button>
      <el-button @click="refreshBreadcrumbs">刷新面包屑时间轴</el-button>
    </div>

    <div class="timeline-container">
      <h4>最近行为轨迹时间轴 (最新在前)：</h4>
      <el-timeline v-if="breadcrumbs.length > 0">
        <el-timeline-item
          v-for="(item, index) in breadcrumbs.slice(0, 8)"
          :key="index"
          :timestamp="new Date(item.timestamp).toLocaleTimeString()"
          :type="item.level === 'error' ? 'danger' : item.type === 'route' ? 'success' : 'primary'"
        >
          <span class="breadcrumb-msg">
            <el-tag size="small" class="type-tag">{{ item.type }}</el-tag>
            {{ item.message }}
          </span>
        </el-timeline-item>
      </el-timeline>
      <p v-else class="empty-tip">暂无行为面包屑记录，点击上方按钮触发交互</p>
    </div>
  </el-card>
</template>

<style scoped>
.panel-card {
  margin-bottom: 20px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.title {
  font-weight: 600;
  font-size: 16px;
}
.test-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}
.input-group {
  display: flex;
  align-items: center;
  gap: 8px;
}
.mask-box {
  padding: 6px 12px;
  background: var(--el-color-danger-light-9);
  color: var(--el-color-danger);
  border: 1px dashed var(--el-color-danger);
  border-radius: 4px;
  cursor: pointer;
  user-select: none;
}
.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}
.timeline-container {
  margin-top: 16px;
  padding: 12px;
  background: var(--el-fill-color-light);
  border-radius: 6px;
}
.timeline-container h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
}
.type-tag {
  margin-right: 8px;
}
.breadcrumb-msg {
  font-size: 13px;
}
.empty-tip {
  color: var(--el-text-color-placeholder);
  font-size: 13px;
}
</style>
