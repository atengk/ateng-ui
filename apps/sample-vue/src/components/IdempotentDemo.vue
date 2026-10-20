<script setup lang="ts">
/**
 * sample-vue 前端提交防刷与幂等互斥锁自验卡片组件。
 *
 * 演示 useIdempotent 在按钮连打、表单防重提交、以及超时防死锁自动释放等关键写操作场景下的互斥保护能力。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import { ref } from 'vue';
import { useIdempotent } from '@atengk/vue';

// 连打统计
const rawClickCount = ref(0);
const blockedCount = ref(0);
const executedCount = ref(0);
const logs = ref<string[]>([]);

const addLog = (msg: string) => {
  logs.value.unshift(`[${new Date().toLocaleTimeString()}] ${msg}`);
  if (logs.value.length > 15) {
    logs.value.pop();
  }
};

// 模拟正常业务写操作（如调用后端提交表单或支付扣款，耗时 800ms）
const submitOrderAction = async (orderId: string): Promise<string> => {
  executedCount.value += 1;
  addLog(`[写操作启动] 正在向后端提交订单 ${orderId}...`);
  await new Promise(resolve => setTimeout(resolve, 800));
  addLog(`[写操作成功] 订单 ${orderId} 写入完成，互斥锁即将自动释放`);
  return `SUCCESS_${orderId}`;
};

// 实例化防刷状态机
const orderSubmitter = useIdempotent<string, [string]>(submitOrderAction, {
  timeout: 3000,
  onBlocked: ([orderId]) => {
    blockedCount.value += 1;
    addLog(`[互斥阻断] 拦截重复点击！订单 ${orderId} 处于处理中，已成功阻断脏写`);
  },
  onSuccess: result => {
    addLog(`[回调通知] onSuccess 触发: ${result}`);
  },
});

// 模拟连击触发
const handleRapidClick = () => {
  rawClickCount.value += 1;
  orderSubmitter.run(`ORDER_NO_${String(rawClickCount.value).padStart(4, '0')}`);
};

// 模拟死锁场景（后端挂起 10s，但配置了 1200ms 超时强制释放）
const hangAction = async (): Promise<string> => {
  addLog('[模拟挂起] 启动无响应慢任务 (耗时 10s)，等待 1200ms 超时防死锁自动解锁...');
  await new Promise(resolve => setTimeout(resolve, 10000));
  return 'LATE_DONE';
};

const deadlockPreventer = useIdempotent(hangAction, {
  timeout: 1200,
  onBlocked: () => {
    addLog('[死锁测试阻断] 处于互斥锁加锁保护中');
  },
});

const handleHangClick = () => {
  deadlockPreventer.run();
};

const clearStats = () => {
  rawClickCount.value = 0;
  blockedCount.value = 0;
  executedCount.value = 0;
  logs.value = [];
};
</script>

<template>
  <section class="card">
    <h2>7. 前端提交防刷与幂等互斥锁自验 (useIdempotent)</h2>
    <p class="desc">
      针对按钮点击、表单提交、支付扣款等高风险写操作场景，提供前端执行中互斥锁
      <code>executing</code>
      与超时自动解除防死锁机制，从根源杜绝重复点击引发的脏写。
    </p>

    <!-- 状态监测条 -->
    <div class="meta-bar">
      <div class="meta-item">
        订单提交互斥锁:
        <span
          :class="['status-tag', orderSubmitter.executing.value ? 'status-active' : 'status-idle']"
        >
          {{
            orderSubmitter.executing.value ? '锁定中 (LOCKED - 执行中)' : '空闲中 (IDLE - 允许提交)'
          }}
        </span>
      </div>
      <div class="meta-item">
        防死锁测试互斥锁:
        <span
          :class="[
            'status-tag',
            deadlockPreventer.executing.value ? 'status-active' : 'status-idle',
          ]"
        >
          {{ deadlockPreventer.executing.value ? '锁定中 (LOCKED)' : '空闲中 (IDLE)' }}
        </span>
      </div>
    </div>

    <div class="demo-grid">
      <!-- 1. 疯狂连击防刷测试卡片 -->
      <div class="section-box">
        <h3>疯狂连击提交防刷测试</h3>
        <p class="desc">快速连续狂点按钮，观察物理连击如何被精确拦截阻断：</p>

        <div class="counter-grid">
          <div class="counter-item">
            <span class="counter-label">物理点击次数</span>
            <span class="counter-val">{{ rawClickCount }}</span>
          </div>
          <div class="counter-item">
            <span class="counter-label">互斥阻断次数</span>
            <span class="counter-val blocked">{{ blockedCount }}</span>
          </div>
          <div class="counter-item">
            <span class="counter-label">实际写库次数</span>
            <span class="counter-val highlight">{{ executedCount }}</span>
          </div>
        </div>

        <div class="btn-group">
          <button class="btn" @click="handleRapidClick">狂点我测试防重提交 (耗时 800ms)</button>
          <button class="btn btn-secondary btn-sm" @click="clearStats">重置计数</button>
        </div>
      </div>

      <!-- 2. 防死锁超时自动释放卡片 -->
      <div class="section-box">
        <h3>超时自动解除防死锁机制</h3>
        <p class="desc">
          模拟后端无响应挂起场景，设置 <code>timeout: 1200ms</code>，超时后互斥锁自动强解：
        </p>
        <div class="btn-group">
          <button
            class="btn btn-warning"
            :disabled="deadlockPreventer.executing.value"
            @click="handleHangClick"
          >
            {{
              deadlockPreventer.executing.value
                ? '任务挂起中 (等待 1.2s 超时解锁...)'
                : '触发挂起操作 (1.2s 超时防死锁)'
            }}
          </button>
          <button
            class="btn btn-secondary btn-sm"
            :disabled="!deadlockPreventer.executing.value"
            @click="deadlockPreventer.unlock()"
          >
            手动强解 (unlock)
          </button>
        </div>
      </div>
    </div>

    <!-- 实时日志监视 -->
    <div class="section-box">
      <h3>幂等互斥锁事件控制台</h3>
      <div class="log-console">
        <div v-for="(log, idx) in logs" :key="idx">{{ log }}</div>
        <div v-if="logs.length === 0" style="color: #64748b; font-style: italic">
          (暂无事件日志，点击上方按钮触发)
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped src="./idempotent-demo.css"></style>
