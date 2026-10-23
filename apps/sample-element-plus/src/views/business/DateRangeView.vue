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

// 5. 禁用策略状态 (Ticket #116 新增)
const disableFutureRange = ref<[DateRangeValue, DateRangeValue] | null>(null);
const disablePastRange = ref<[DateRangeValue, DateRangeValue] | null>(null);
const maxRangeDaysValue = ref<[DateRangeValue, DateRangeValue] | null>(null);

const handleResetQuery = () => {
  queryParams.startTime = '';
  queryParams.endTime = '';
};
</script>

<template>
  <div class="date-range-view">
    <ElCard header="快捷时间范围选择器 AtengDateRange (Ticket #116 增强)">
      <ElAlert
        title="组件核心能力"
        type="info"
        description="基于 el-date-picker 增强封装：开箱内置今天、昨天、近7天、近30天、本周、上周、本月、本季度、本年 9 大常用自然业务周期；双字段解构绑定协议（v-model:start 与 v-model:end）与表单重置深度联动；默认开启智能时刻对齐（autoTime: true），起始时间对齐 00:00:00，截止时间对齐 23:59:59；开箱支持 disableFuture 禁用未来、disablePast 禁用过去以及 maxRangeDays 最大跨度天数限制。"
        show-icon
        :closable="false"
        style="margin-bottom: 20px"
      />

      <!-- 1. 双字段解构绑定演示 -->
      <div class="demo-section">
        <div class="section-title">
          <span>1. 双字段解构绑定协议 (v-model:start / v-model:end 与表单重置联动)</span>
          <ElButton type="warning" size="small" @click="handleResetQuery">
            一键清空重置表单
          </ElButton>
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
        <div class="section-title">3. 9 大预置自然周期与自定义快捷项扩展 (Ticket #116)</div>
        <ElForm label-width="140px" class="demo-form">
          <ElFormItem label="预置 9 大自然跨度">
            <AtengDateRange
              v-model="basicRange"
              value-format="YYYY-MM-DD"
              format="YYYY-MM-DD"
              style="width: 380px"
            />
            <span class="value-hint"
              >点击查看内置 9 大自然周期：今天/昨天/近7天/近30天/本周/上周/本月/本季度/本年</span
            >
          </ElFormItem>

          <ElFormItem label="自定义快捷项">
            <AtengDateRange
              v-model="customRange"
              :shortcuts="customShortcuts"
              value-format="YYYY-MM-DD"
              style="width: 380px"
            />
            <span class="value-hint">自定义「近 60 天」「本季度」扩展</span>
          </ElFormItem>
        </ElForm>
      </div>

      <ElDivider />

      <!-- 4. 禁用策略开箱预置 (Ticket #116 新增) -->
      <div class="demo-section">
        <div class="section-title">
          4. 禁用策略开箱预置 (disableFuture / disablePast / maxRangeDays)
        </div>
        <ElForm label-width="180px" class="demo-form">
          <ElFormItem label="禁用未来 (disableFuture)">
            <AtengDateRange
              v-model="disableFutureRange"
              disable-future
              value-format="YYYY-MM-DD"
              placeholder="大于今天的日期置灰"
              style="width: 380px"
            />
            <span class="value-hint">业务日志、历史回溯场景常用</span>
          </ElFormItem>

          <ElFormItem label="禁用过去 (disablePast)">
            <AtengDateRange
              v-model="disablePastRange"
              disable-past
              value-format="YYYY-MM-DD"
              placeholder="小于今天的日期置灰"
              style="width: 380px"
            />
            <span class="value-hint">活动规划、未来排期场景常用</span>
          </ElFormItem>

          <ElFormItem label="最大跨度 30 天 (maxRangeDays)">
            <AtengDateRange
              v-model="maxRangeDaysValue"
              :max-range-days="30"
              value-format="YYYY-MM-DD"
              placeholder="选定第一天后前后限30天"
              style="width: 380px"
            />
            <span class="value-hint">选定起始日后自动动态置灰超出 30 天的日期</span>
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
