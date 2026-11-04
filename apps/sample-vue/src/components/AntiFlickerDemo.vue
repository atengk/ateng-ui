<script setup lang="ts">
/**
 * sample-vue 高阶防闪烁加载状态机自验卡片组件。
 *
 * 对比 150ms 静默延迟保护期（极速 0ms 视觉打扰）与 300ms 最小展示期（平滑过渡，杜绝 1 帧闪现）。
 *
 * @author Ateng
 * @since 2026-11-04
 */

import { ref } from 'vue';
import { useAntiFlicker } from '@atengk/vue';

// 原始加载状态
const rawLoading = ref(false);

// 经过防闪烁时序包装的受控状态（默认 150ms 延迟，300ms 最小展示）
const antiFlickerLoading = useAntiFlicker(rawLoading, {
  delay: 150,
  minDuration: 300,
});

// 操作跟踪日志
const lastAction = ref('尚未触发测试');
const requestTime = ref(0);

// 模拟异步请求
const triggerRequest = (duration: number, desc: string) => {
  rawLoading.value = true;
  requestTime.value = duration;
  lastAction.value = `[发起请求] ${desc} (模拟耗时: ${duration}ms)`;

  setTimeout(() => {
    rawLoading.value = false;
    lastAction.value = `[请求完成] ${desc} (耗时 ${duration}ms 已结束)`;
  }, duration);
};
</script>

<template>
  <section id="card-anti-flicker" class="card">
    <h2>12. 视觉防抖时序状态机自验 (useAntiFlicker)</h2>
    <p class="desc">
      测试 150ms 静默延迟（耗时 &lt; 150ms 加载不露头）与 300ms
      最小展示期（突破阈值后保证平滑展示，彻底根绝 1 帧闪烁震颤）。
    </p>

    <div class="flicker-demo">
      <div class="button-group">
        <button
          class="btn"
          :disabled="rawLoading"
          @click="triggerRequest(50, '微服务极速探针 (50ms)')"
        >
          极速接口 (50ms - 验证 0 闪烁)
        </button>
        <button
          class="btn"
          :disabled="rawLoading"
          @click="triggerRequest(180, '轻量业务查询 (180ms)')"
        >
          短时接口 (180ms - 验证 300ms 补齐)
        </button>
        <button
          class="btn btn-secondary"
          :disabled="rawLoading"
          @click="triggerRequest(600, '报表重计算 (600ms)')"
        >
          慢速接口 (600ms - 验证常规加载)
        </button>
      </div>

      <div class="comparison-grid">
        <div class="status-panel">
          <h3>原始裸 Loading (未防抖)</h3>
          <div :class="['loading-box', rawLoading ? 'loading-on' : 'loading-off']">
            {{ rawLoading ? '⚡ 原始 Loading 闪现中...' : '⚪ 空闲 (Idle)' }}
          </div>
          <span class="hint">特点：极速请求下易出现 1 帧闪白震颤</span>
        </div>

        <div class="status-panel">
          <h3>useAntiFlicker 受控 Loading</h3>
          <div
            :class="['loading-box', 'anti-box', antiFlickerLoading ? 'loading-on' : 'loading-off']"
          >
            {{ antiFlickerLoading ? '🛡️ 防闪烁平滑展示中 (≥300ms)...' : '⚪ 空闲 (0ms 视觉打扰)' }}
          </div>
          <span class="hint">特点：&lt;150ms 零打扰，≥150ms 平滑淡出</span>
        </div>
      </div>

      <div class="trace-info">
        <span class="label">当前动作追踪:</span>
        <span class="highlight">{{ lastAction }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped src="./anti-flicker-demo.css"></style>
