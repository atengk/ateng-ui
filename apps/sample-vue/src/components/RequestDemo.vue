<script setup lang="ts">
/**
 * sample-vue 异步请求状态机自验卡片组件。
 *
 * 验证 useRequest 的 loading/data/error 只读状态机流转、参数驱动与本地乐观更新 mutate。
 *
 * @author Ateng
 * @since 2026-11-04
 */

import { ref } from 'vue';
import { useRequest } from '@atengk/vue';

// 真实业务语义：企业用户与角色档案
interface UserProfile {
  id: number;
  name: string;
  role: string;
}

// 模拟异步请求服务函数
const fetchUser = async (id: number): Promise<UserProfile> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return {
    id,
    name: id === 1 ? '张三 (超级管理员)' : '李四 (运营人员)',
    role: id === 1 ? 'ADMIN' : 'OPERATOR',
  };
};

const currentUserId = ref(1);
const userRequest = useRequest(fetchUser, {
  defaultParams: [1],
});

const onSwitchUser = (id: number) => {
  currentUserId.value = id;
  userRequest.run(id);
};

const onOptimisticMutate = () => {
  userRequest.mutate(prev =>
    prev
      ? { ...prev, name: `${prev.name} [本地乐观修改 ${new Date().toLocaleTimeString()}]` }
      : undefined,
  );
};
</script>

<template>
  <section class="card">
    <h2>3. 异步请求状态机自验 (useRequest)</h2>
    <p class="desc">
      体验只读状态机（loading, data, error）、默认自动执行、手动切换参数、刷新以及本地乐观变更
      mutate。
    </p>
    <div class="request-demo">
      <div class="button-group">
        <button class="btn" :disabled="userRequest.loading.value" @click="userRequest.refresh()">
          {{ userRequest.loading.value ? '请求处理中...' : '刷新当前用户 (refresh)' }}
        </button>
        <button
          class="btn btn-secondary"
          :disabled="userRequest.loading.value"
          @click="onSwitchUser(currentUserId === 1 ? 2 : 1)"
        >
          切换加载用户 (ID: {{ currentUserId === 1 ? 2 : 1 }})
        </button>
        <button
          class="btn btn-secondary"
          :disabled="!userRequest.data.value"
          @click="onOptimisticMutate"
        >
          乐观更新数据 (mutate)
        </button>
      </div>

      <div class="state-display">
        <div class="state-row">
          <span class="label">Loading 状态机:</span>
          <span
            :class="['status-tag', userRequest.loading.value ? 'status-active' : 'status-idle']"
          >
            {{ userRequest.loading.value ? 'Loading (加载中)' : 'Idle (就绪)' }}
          </span>
        </div>
        <div class="state-row">
          <span class="label">当前数据实体 (只读 Ref):</span>
          <pre class="json-code">{{
            JSON.stringify(userRequest.data.value, null, 2) || '(暂无数据)'
          }}</pre>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped src="./request-demo.css"></style>
