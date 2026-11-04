<script setup lang="ts">
/**
 * sample-vue 全局配置与上下文注入自验卡片组件。
 *
 * 验证 createAtengVue 插件与 useAtengConfig 解析 Hook 的默认值与单例回退。
 *
 * @author Ateng
 * @since 2026-11-04
 */

import { useAtengConfig } from '@atengk/vue';

const config = useAtengConfig();
</script>

<template>
  <section class="card">
    <h2>1. 全局配置注入自验 (createAtengVue & useAtengConfig)</h2>
    <p class="desc">
      主应用入口已通过
      <code>app.use(createAtengVue({ defaultPageSize: 20 }))</code> 注册全局插件。
    </p>
    <div class="config-grid">
      <div class="config-item">
        <span class="label">全局默认分页大小 (defaultPageSize):</span>
        <span class="value">{{ config.defaultPageSize }} 条/页</span>
      </div>
      <div class="config-item">
        <span class="label">流式客户端自动挂载 (autoConnectStream):</span>
        <span class="value">{{ config.autoConnectStream ? '开启' : '关闭' }}</span>
      </div>
      <div class="config-item">
        <span class="label">WebSocket 客户端自动挂载 (autoConnectWebSocket):</span>
        <span class="value">{{ config.autoConnectWebSocket ? '开启' : '关闭' }}</span>
      </div>
      <div class="config-item">
        <span class="label">默认 HTTP 客户端注入状态:</span>
        <span class="value">{{ config.httpClient ? '已注入 (@atengk/core)' : '未就绪' }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped src="./config-demo.css"></style>
