<script setup lang="ts">
/**
 * sample-vue 全局配置与上下文注入自验卡片组件。
 *
 * 验证 createAtengVue 插件与 useAtengConfig 解析 Hook 的默认值与单例回退。
 *
 * @author Ateng
 * @since 2026-11-04
 */

import { getCurrentInstance } from 'vue';
import { resolveAtengConfig, useAtengConfig } from '@atengk/vue';

const config = useAtengConfig();
// 模拟自定义指令等非 setup() 作用域，基于组件实例 provides / appContext.provides 直接解析生效配置
const instance = getCurrentInstance();
const resolvedFromProvides = resolveAtengConfig(
  (instance?.provides ?? instance?.appContext.provides) as Record<PropertyKey, unknown> | undefined,
);
</script>

<template>
  <section class="card">
    <h2>1. 全局配置注入自验 (createAtengVue & useAtengConfig)</h2>
    <p class="desc">
      主应用入口已通过
      <code>app.use(createAtengVue({ defaultSize: 20 }))</code> 注册全局插件。
    </p>
    <div class="config-grid">
      <div class="config-item">
        <span class="label">全局默认分页大小 (defaultSize):</span>
        <span class="value">{{ config.defaultSize }} 条/页</span>
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
      <div class="config-item">
        <span class="label">非 Setup 上下文解析验证 (resolveAtengConfig):</span>
        <span class="value">
          defaultSize = {{ resolvedFromProvides.defaultSize }} / AuthManager
          {{ resolvedFromProvides.authManager ? '已对齐' : '未就绪' }}
        </span>
      </div>
    </div>
  </section>
</template>

<style scoped src="./config-demo.css"></style>
