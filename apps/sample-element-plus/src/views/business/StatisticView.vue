<script setup lang="ts">
/**
 * AtengStatistic 统计指标展厅。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { ref } from 'vue';
import { ElCard, ElRow, ElCol, ElButton, ElSpace, ElSwitch, ElDivider } from 'element-plus';
import { AtengStatistic, type AtengStatisticInstance } from '@atengk/element-plus';

const statRef1 = ref<AtengStatisticInstance>();
const statRef2 = ref<AtengStatisticInstance>();
const statRef3 = ref<AtengStatisticInstance>();
const statRef4 = ref<AtengStatisticInstance>();

const revenue = ref<number>(1892540.5);
const orderCount = ref<number>(23841);
const conversionRate = ref<number>(14.28);
const activeUsers = ref<number>(8520);

const isLoading = ref<boolean>(false);
const isInverse = ref<boolean>(false);

const handleRestartAll = () => {
  statRef1.value?.restart();
  statRef2.value?.restart();
  statRef3.value?.restart();
  statRef4.value?.restart();
};

const handleRandomize = () => {
  revenue.value = Math.floor(Math.random() * 5000000) + 1000000 + Number(Math.random().toFixed(2));
  orderCount.value = Math.floor(Math.random() * 50000) + 10000;
  conversionRate.value = Number((Math.random() * 20 + 5).toFixed(2));
  activeUsers.value = Math.floor(Math.random() * 20000) + 2000;
};
</script>

<template>
  <div class="statistic-view">
    <ElCard shadow="never" class="demo-card">
      <template #header>
        <div class="card-header">
          <span class="title">AtengStatistic 指标趋势与数字滚动呈现</span>
          <span class="subtitle">
            纯原生 requestAnimationFrame 平滑缓动过渡，支持千分位格式化、红绿涨跌微标与防抖骨架屏
          </span>
        </div>
      </template>

      <!-- 操作栏 -->
      <div class="toolbar">
        <ElSpace wrap :size="16">
          <ElButton type="primary" @click="handleRestartAll"> 🔄 重新播放翻牌动画 </ElButton>
          <ElButton @click="handleRandomize"> 🎲 随机刷新数值 </ElButton>
          <div class="ctrl-item">
            <span>加载骨架屏：</span>
            <ElSwitch v-model="isLoading" />
          </div>
          <div class="ctrl-item">
            <span>国际绿涨红跌配色：</span>
            <ElSwitch v-model="isInverse" />
          </div>
        </ElSpace>
      </div>

      <ElDivider />

      <!-- 指标卡片矩阵 -->
      <ElRow :gutter="20">
        <ElCol :xs="24" :sm="12" :md="6">
          <div class="stat-box">
            <AtengStatistic
              ref="statRef1"
              title="本月累计总销售额"
              :value="revenue"
              prefix="¥"
              :precision="2"
              trend="up"
              trend-value="+18.5%"
              :trend-color-inverse="isInverse"
              :loading="isLoading"
            />
          </div>
        </ElCol>

        <ElCol :xs="24" :sm="12" :md="6">
          <div class="stat-box">
            <AtengStatistic
              ref="statRef2"
              title="支付订单总量"
              :value="orderCount"
              suffix="笔"
              trend="up"
              trend-value="+8.2%"
              :trend-color-inverse="isInverse"
              :loading="isLoading"
            />
          </div>
        </ElCol>

        <ElCol :xs="24" :sm="12" :md="6">
          <div class="stat-box">
            <AtengStatistic
              ref="statRef3"
              title="支付转化率"
              :value="conversionRate"
              suffix="%"
              :precision="2"
              trend="down"
              trend-value="-1.4%"
              :trend-color-inverse="isInverse"
              :loading="isLoading"
            />
          </div>
        </ElCol>

        <ElCol :xs="24" :sm="12" :md="6">
          <div class="stat-box">
            <AtengStatistic
              ref="statRef4"
              title="当前活跃在线用户"
              :value="activeUsers"
              suffix="人"
              :loading="isLoading"
            />
          </div>
        </ElCol>
      </ElRow>
    </ElCard>
  </div>
</template>

<style scoped lang="scss">
.statistic-view {
  padding: 20px;

  .demo-card {
    border-radius: 8px;
  }

  .card-header {
    display: flex;
    flex-direction: column;
    gap: 4px;

    .title {
      font-size: 18px;
      font-weight: 600;
      color: var(--el-text-color-primary);
    }

    .subtitle {
      font-size: 13px;
      color: var(--el-text-color-secondary);
    }
  }

  .toolbar {
    margin-bottom: 8px;

    .ctrl-item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 14px;
      color: var(--el-text-color-regular);
    }
  }

  .stat-box {
    background: var(--el-fill-color-light);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
    padding: 18px 20px;
    transition: all 0.2s ease;

    &:hover {
      box-shadow: var(--el-box-shadow-light);
      border-color: var(--el-color-primary-light-7);
    }
  }
}
</style>
