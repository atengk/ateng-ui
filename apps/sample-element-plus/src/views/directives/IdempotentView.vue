<script setup lang="ts">
/**
 * 提交防重与前端幂等指令 v-idempotent 自验页面。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { ref } from 'vue';
import { ElCard, ElButton, ElAlert, ElMessage } from 'element-plus';

// 1. 时间窗口连击测试
const clickCount = ref(0);

const handleDelayClick = () => {
  clickCount.value += 1;
};

// 2. 异步互斥锁测试
const asyncSubmitCount = ref(0);

const handleAsyncSubmit = async () => {
  await new Promise(resolve => setTimeout(resolve, 2000));
  asyncSubmitCount.value += 1;
  ElMessage.success('异步表单提交成功！');
};

// 3. 异步抛错恢复测试
const handleFailingSubmit = async () => {
  await new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error('服务端处理超时或参数校验失败'));
    }, 1500);
  });
};
</script>

<template>
  <div class="idempotent-view">
    <ElCard header="提交防重与前端幂等指令 v-idempotent">
      <ElAlert
        title="指令特性说明"
        type="info"
        description="支持在 DOM 原生捕获阶段（Capture Phase）拦截高频暴力连击，切断下游所有重复处理。支持时间窗口防刷模式（窗口期阻断）与异步 Promise 互斥锁模式（自动联动 ElButton 的 is-loading / is-disabled 与 disabled 属性，Promise 决议或抛错后确定性恢复）。"
        show-icon
        :closable="false"
        style="margin-bottom: 20px"
      />

      <div class="demo-section">
        <h3>1. 时间窗口防刷模式（v-idempotent="1000"）</h3>
        <p class="desc">在 1000ms 时间窗口内快速疯狂连击，只有第一次有效触发点击：</p>
        <div class="action-row">
          <ElButton v-idempotent="1000" type="primary" @click="handleDelayClick">
            快速点击我 (1秒防刷)
          </ElButton>
          <span class="counter"
            >有效触发次数：<b>{{ clickCount }}</b> 次</span
          >
          <ElButton size="small" @click="clickCount = 0">重置计数</ElButton>
        </div>
      </div>

      <div class="demo-section">
        <h3>2. 异步 Promise 互斥锁模式（自动接管 Loading 与禁用）</h3>
        <p class="desc">
          执行 2 秒异步任务，期间按钮自动追加 is-loading、is-disabled 并禁用，连击完全被拦截：
        </p>
        <div class="action-row">
          <ElButton v-idempotent="handleAsyncSubmit" type="success">
            提交异步订单 (2秒耗时)
          </ElButton>
          <span class="counter"
            >成功完成提交：<b>{{ asyncSubmitCount }}</b> 次</span
          >
        </div>
      </div>

      <div class="demo-section">
        <h3>3. 异步异常恢复防假死测试</h3>
        <p class="desc">模拟异步请求抛错（1.5 秒后 reject），验证锁立即安全释放，杜绝页面假死：</p>
        <div class="action-row">
          <ElButton v-idempotent="handleFailingSubmit" type="danger">
            触发报错接口 (1.5秒后失败)
          </ElButton>
        </div>
      </div>
    </ElCard>
  </div>
</template>

<style scoped>
.demo-section {
  margin-bottom: 24px;
}
.demo-section h3 {
  margin-bottom: 8px;
  font-size: 15px;
  color: var(--el-text-color-primary);
}
.desc {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  margin-bottom: 12px;
}
.action-row {
  display: flex;
  align-items: center;
  gap: 16px;
}
.counter b {
  color: var(--el-color-primary);
  font-size: 16px;
}
</style>
