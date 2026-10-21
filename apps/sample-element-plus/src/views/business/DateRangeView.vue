<script setup lang="ts">
/**
 * 快捷时间范围选择器 AtengDateRange 自验页面。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { ref, reactive } from 'vue';
import {
  ElCard,
  ElAlert,
  ElForm,
  ElFormItem,
  ElDivider,
  ElSwitch,
  ElTag,
  ElButton,
} from 'element-plus';
import { AtengDateRange, type DateRangeValue, type DateRangeShortcut } from '@atengk/element-plus';

// 1. 基础数组绑定
const basicRange = ref<[DateRangeValue, DateRangeValue] | null>(null);

// 2. 双字段解构绑定模型 (模拟典型搜索表单)
const queryParams = reactive({
  keyword: '订单流水',
  startTime: '2026-10-01 00:00:00',
  endTime: '2026-10-20 23:59:59',
});

// 3. 智能时刻对齐控制
const autoTime = ref(true);
const dateTimeRange = ref<[DateRangeValue, DateRangeValue] | null>(null);

// 4. 自定义快捷项（近 60 天与本季度）
const customShortcuts: DateRangeShortcut[] = [
  {
    text: '近 60 天',
    value: () => {
      const end = new Date();
      const start = new Date();
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 60);
      return [start, end];
    },
  },
  {
    text: '本季度',
    value: () => {
      const now = new Date();
      const currentMonth = now.getMonth();
      const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
      const start = new Date(now.getFullYear(), quarterStartMonth, 1);
      const end = new Date(now.getFullYear(), quarterStartMonth + 3, 0);
      return [start, end];
    },
  },
];
const customRange = ref<[DateRangeValue, DateRangeValue] | null>(null);

// 仅允许选择过去 90 天内且不大于今天
const disabledFutureDate = (time: Date) => {
  return time.getTime() > Date.now();
};

const handleResetQuery = () => {
  queryParams.startTime = '';
  queryParams.endTime = '';
};
</script>

<template>
  <div class="date-range-view">
    <ElCard header="快捷时间范围选择器 AtengDateRange">
      <ElAlert
        title="组件核心能力"
        type="info"
        description="基于 el-date-picker 增强封装：预置今天、昨天、近7天、近30天、本周、上周、本月等常用自然时间跨度；双字段解构绑定协议（v-model:start 与 v-model:end），彻底告别手动拆解数组；默认开启智能时刻对齐（autoTime: true），起始时间对齐 00:00:00，截止时间对齐 23:59:59，杜绝边界丢失。"
        show-icon
        :closable="false"
        style="margin-bottom: 20px"
      />

      <!-- 1. 双字段解构绑定演示 -->
      <div class="demo-section">
        <div class="section-title">
          <span>1. 双字段解构绑定协议 (v-model:start / v-model:end)</span>
          <ElButton size="small" @click="handleResetQuery"> 重置表单时间 </ElButton>
        </div>
        <ElForm :model="queryParams" label-width="140px" class="demo-form">
          <ElFormItem label="统计时间范围">
            <AtengDateRange
              v-model:start="queryParams.startTime"
              v-model:end="queryParams.endTime"
              value-format="YYYY-MM-DD HH:mm:ss"
              start-placeholder="开始时间"
              end-placeholder="结束时间"
              style="width: 380px"
            />
          </ElFormItem>
        </ElForm>

        <div class="state-preview">
          <span class="preview-label">解构响应式状态同步监控：</span>
          <ElTag type="success" class="state-tag">
            startTime: {{ queryParams.startTime || '(null / 空)' }}
          </ElTag>
          <ElTag type="warning" class="state-tag">
            endTime: {{ queryParams.endTime || '(null / 空)' }}
          </ElTag>
        </div>
      </div>

      <ElDivider />

      <!-- 2. 传统数组绑定与智能时刻对齐 -->
      <div class="demo-section">
        <div class="section-title">
          <span>2. 智能时刻对齐 (autoTime: {{ autoTime ? '开启' : '关闭' }})</span>
          <div class="ctrl-toggle">
            <span class="ctrl-label">自动对齐 00:00:00 ~ 23:59:59：</span>
            <ElSwitch v-model="autoTime" />
          </div>
        </div>

        <ElForm label-width="140px" class="demo-form">
          <ElFormItem label="日期范围">
            <AtengDateRange
              v-model="dateTimeRange"
              :auto-time="autoTime"
              value-format="YYYY-MM-DD HH:mm:ss"
              placeholder="请选择日期范围"
              style="width: 380px"
            />
            <span class="value-hint">
              绑定值：{{ dateTimeRange ? JSON.stringify(dateTimeRange) : '未选择' }}
            </span>
          </ElFormItem>
        </ElForm>
      </div>

      <ElDivider />

      <!-- 3. 预置与自定义自然时间快捷跨度 -->
      <div class="demo-section">
        <div class="section-title">3. 基础自然跨度与自定义快捷项扩展</div>
        <ElForm label-width="140px" class="demo-form">
          <ElFormItem label="预置自然跨度">
            <AtengDateRange
              v-model="basicRange"
              value-format="YYYY-MM-DD"
              format="YYYY-MM-DD"
              style="width: 380px"
            />
            <span class="value-hint">点击输入框查看内置 7 大自然时间选项</span>
          </ElFormItem>

          <ElFormItem label="自定义快捷项">
            <AtengDateRange
              v-model="customRange"
              :shortcuts="customShortcuts"
              :disabled-date="disabledFutureDate"
              value-format="YYYY-MM-DD"
              style="width: 380px"
            />
            <span class="value-hint">自定义「近 60 天」「本季度」且未来日期禁用</span>
          </ElFormItem>
        </ElForm>
      </div>
    </ElCard>
  </div>
</template>

<style scoped>
.date-range-view {
  max-width: 1100px;
}

.demo-section {
  padding: 8px 0;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ctrl-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ctrl-label {
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.demo-form {
  margin-top: 10px;
}

.state-preview {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background-color: var(--el-fill-color-light);
  border-radius: 4px;
  margin-top: 8px;
}

.preview-label {
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.state-tag {
  font-family: monospace;
  font-size: 12px;
}

.value-hint {
  margin-left: 14px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
