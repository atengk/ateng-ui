<script setup lang="ts">
/**
 * sample-vue 响应式通用 Composables 8 大领域全景交互沙箱展厅。
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
import SelectionDemo from './components/SelectionDemo.vue';
import LatestDemo from './components/LatestDemo.vue';
import IdempotentDemo from './components/IdempotentDemo.vue';
import AuthTenantDemo from './components/AuthTenantDemo.vue';
import ExcelDemo from './components/ExcelDemo.vue';
import UploadDemo from './components/UploadDemo.vue';
import StreamDemo from './components/StreamDemo.vue';
import WebSocketDemo from './components/WebSocketDemo.vue';
import AntiFlickerDemo from './components/AntiFlickerDemo.vue';
import TabsNavDemo from './components/TabsNavDemo.vue';

const navList = [
  { id: 'domain-context', title: '1. 上下文与微工具' },
  { id: 'domain-request', title: '2. 请求状态机' },
  { id: 'domain-pagination', title: '3. 分页与多选' },
  { id: 'domain-anti-race', title: '4. 竞态与防刷' },
  { id: 'domain-auth-tenant', title: '5. 鉴权与租户' },
  { id: 'domain-binary', title: '6. 二进制与导出' },
  { id: 'domain-realtime', title: '7. 实时流与长连' },
  { id: 'domain-visual-nav', title: '8. 防抖与标签导航' },
];

const scrollTo = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};
</script>

<template>
  <main class="sample-container">
    <header class="header">
      <div class="header-top">
        <h1>@atengk/vue 自验沙箱展厅</h1>
        <div class="version-badges">
          <span class="badge">@atengk/core: v{{ CORE_PKG_VERSION }}</span>
          <span class="badge badge-vue">@atengk/vue: v{{ VUE_PKG_VERSION }}</span>
        </div>
      </div>
      <nav class="domain-nav">
        <button v-for="nav in navList" :key="nav.id" class="nav-item" @click="scrollTo(nav.id)">
          {{ nav.title }}
        </button>
      </nav>
    </header>

    <div id="domain-context"><ConfigDemo /><UtilsDemo /></div>
    <div id="domain-request"><RequestDemo /></div>
    <div id="domain-pagination"><PaginationDemo /><SelectionDemo /></div>
    <div id="domain-anti-race"><LatestDemo /><IdempotentDemo /></div>
    <div id="domain-auth-tenant"><AuthTenantDemo /></div>
    <div id="domain-binary"><ExcelDemo /><UploadDemo /></div>
    <div id="domain-realtime"><StreamDemo /><WebSocketDemo /></div>
    <div id="domain-visual-nav"><AntiFlickerDemo /><TabsNavDemo /></div>
  </main>
</template>

<style scoped src="./app.css"></style>
