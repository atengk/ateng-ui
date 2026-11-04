<script setup lang="ts">
/**
 * sample-vue 纯原生受管微工具自验卡片组件。
 *
 * 验证 useDebounceFn 防抖、useThrottleFn 节流与 useEventListener 事件解绑的确定性生命周期。
 *
 * @author Ateng
 * @since 2026-11-04
 */

import { ref } from 'vue';
import { useDebounceFn, useThrottleFn, useEventListener } from '@atengk/vue';

// 1. 防抖测试状态
const debounceInput = ref('');
const debouncedValue = ref('');
const handleInput = useDebounceFn((val: string) => {
  debouncedValue.value = val;
}, 300);

// 2. 节流测试状态
const clickRawCount = ref(0);
const clickThrottledCount = ref(0);
const handleThrottledClick = useThrottleFn(() => {
  clickThrottledCount.value += 1;
}, 1000);

const onRawClick = () => {
  clickRawCount.value += 1;
  handleThrottledClick();
};

// 3. 受管全局事件监听自验状态
const windowClickCount = ref(0);
useEventListener(window, 'click', () => {
  windowClickCount.value += 1;
});
</script>

<template>
  <section class="card">
    <h2>2. 纯原生受管微工具自验 (Debounce / Throttle / EventListener)</h2>
    <div class="tools-grid">
      <div class="tool-box">
        <h3>防抖测试 (useDebounceFn 300ms)</h3>
        <input
          v-model="debounceInput"
          type="text"
          placeholder="连续快速输入测试防抖..."
          class="input"
          @input="handleInput(debounceInput)"
        />
        <p class="result">
          实时输入: <strong>{{ debounceInput || '(空)' }}</strong>
        </p>
        <p class="result">
          防抖决议: <strong class="highlight">{{ debouncedValue || '(等待输入)' }}</strong>
        </p>
      </div>

      <div class="tool-box">
        <h3>节流测试 (useThrottleFn 1000ms)</h3>
        <button class="btn" @click="onRawClick">狂点我测试节流 (1秒内仅计1次)</button>
        <p class="result">物理点击次数: {{ clickRawCount }} 次</p>
        <p class="result">
          节流生效次数: <strong class="highlight">{{ clickThrottledCount }} 次</strong>
        </p>
      </div>

      <div class="tool-box">
        <h3>受管全局事件监听 (useEventListener)</h3>
        <p class="desc">页面销毁时自动通过 onScopeDispose 确定性解绑：</p>
        <p class="result">
          全局 Window 点击累计: <strong class="highlight">{{ windowClickCount }} 次</strong>
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped src="./utils-demo.css"></style>
