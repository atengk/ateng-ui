<script setup lang="ts">
/**
 * sample-vue 响应式通用 Composables 场景自验沙箱展厅。
 *
 * @author Ateng
 * @since 2026-10-19
 */

import { VERSION as VUE_PKG_VERSION } from '@atengk/vue';
import { VERSION as CORE_PKG_VERSION } from '@atengk/core';
import ConfigDemo from './components/ConfigDemo.vue';
import UtilsDemo from './components/UtilsDemo.vue';
import RequestDemo from './components/RequestDemo.vue';
import PaginationDemo from './components/PaginationDemo.vue';
import LatestDemo from './components/LatestDemo.vue';
import AuthTenantDemo from './components/AuthTenantDemo.vue';
import IdempotentDemo from './components/IdempotentDemo.vue';
import ExcelDemo from './components/ExcelDemo.vue';
import UploadDemo from './components/UploadDemo.vue';
import StreamDemo from './components/StreamDemo.vue';
import WebSocketDemo from './components/WebSocketDemo.vue';
</script>

<template>
  <main class="sample-container">
    <header class="header">
      <h1>@atengk/vue 自验沙箱展厅</h1>
      <div class="version-badges">
        <span class="badge">@atengk/core: v{{ CORE_PKG_VERSION }}</span>
        <span class="badge badge-vue">@atengk/vue: v{{ VUE_PKG_VERSION }}</span>
      </div>
    </header>

    <!-- 1. 全局配置注入自验组件 -->
    <ConfigDemo />

    <!-- 2. 纯原生受管微工具自验组件 -->
    <UtilsDemo />

    <!-- 3. 异步请求状态机自验组件 -->
    <RequestDemo />

    <!-- 4. 契约分页状态机自验组件 -->
    <PaginationDemo />

    <!-- 5. 异步时序竞态双重防御自验组件 -->
    <LatestDemo />

    <!-- 6. 响应式鉴权与多租户切片自验组件 -->
    <AuthTenantDemo />

    <!-- 7. 前端提交防刷与幂等互斥锁自验组件 -->
    <IdempotentDemo />

    <!-- 8. Fesod 流式 Excel 导出与批注回写自验组件 -->
    <ExcelDemo />

    <!-- 9. 大文件分片切片与受控并发上传自验组件 -->
    <UploadDemo />

    <!-- 10. SSE 大模型打字机流式响应自验组件 -->
    <StreamDemo />

    <!-- 11. WebSocket 全双工长连接心跳状态机自验组件 -->
    <WebSocketDemo />
  </main>
</template>

<style scoped src="./app.css"></style>
