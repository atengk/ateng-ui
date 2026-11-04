<script setup lang="ts">
/**
 * sample-vue 多标签页无头响应式状态机自验卡片组件。
 *
 * 验证 useTabsNav 纯状态机对标签增删查改、Affix 保护、FIFO 超限淘汰与 KeepAlive 缓存名单联动。
 *
 * @author Ateng
 * @since 2026-11-04
 */

import { ref } from 'vue';
import { useTabsNav } from '@atengk/vue';

// 初始化多标签页状态机（设定上限 maxTabs: 5 测试 FIFO 自动淘汰）
const { tabs, activeKey, cachedViews, openTab, closeTab, closeOthers, closeAll, refreshTab } =
  useTabsNav({
    defaultActiveKey: '/workbench',
    defaultTabs: [
      {
        key: '/workbench',
        title: '工作台首页',
        affix: true,
        componentName: 'WorkbenchView',
      },
      {
        key: '/product/sku',
        title: '商品中心',
        closable: true,
        componentName: 'ProductSkuView',
      },
      {
        key: '/order/audit',
        title: '订单审核',
        closable: true,
        componentName: 'OrderAuditView',
      },
    ],
    maxTabs: 5,
  });

const refreshMsg = ref('');
const handleRefresh = async () => {
  refreshMsg.value = `正在刷新标签 [${activeKey.value}]...`;
  await refreshTab(activeKey.value);
  refreshMsg.value = `标签 [${activeKey.value}] 局部刷新完成！`;
  setTimeout(() => {
    refreshMsg.value = '';
  }, 2000);
};

// 预设候选标签字典
const candidateTabs = [
  {
    key: '/system/settings',
    title: '系统配置',
    componentName: 'SystemSettingsView',
  },
  {
    key: '/finance/ledger',
    title: '财务总账',
    componentName: 'FinanceLedgerView',
  },
  {
    key: '/crm/customer',
    title: '客户档案',
    componentName: 'CustomerArchiveView',
  },
  {
    key: '/log/audit',
    title: '操作审计日志',
    componentName: 'AuditLogView',
  },
];
</script>

<template>
  <section id="card-tabs-nav" class="card">
    <h2>13. 多标签页与 KeepAlive 缓存状态机自验 (useTabsNav)</h2>
    <p class="desc">
      验证无头响应式标签调度、Affix 固钉保护（不可关闭）、容量超限 FIFO 自动淘汰与 KeepAlive
      视图白名单 (cachedViews) 自动同步。
    </p>

    <div class="tabs-demo">
      <!-- 纯原生无头标签栏渲染 -->
      <div class="tabs-bar">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          :class="['tab-pill', { 'tab-active': tab.key === activeKey }]"
          @click="activeKey = tab.key"
        >
          <span v-if="tab.affix" class="affix-icon">📌</span>
          {{ tab.title }}
          <span
            v-if="!tab.affix"
            class="close-btn"
            title="关闭标签"
            @click.stop="closeTab(tab.key)"
          >
            ×
          </span>
        </button>
      </div>

      <!-- 操作按钮组 -->
      <div class="control-row">
        <div class="open-buttons">
          <button
            v-for="candidate in candidateTabs"
            :key="candidate.key"
            class="btn btn-secondary btn-sm"
            @click="openTab(candidate)"
          >
            + 打开 {{ candidate.title }}
          </button>
        </div>

        <div class="batch-buttons">
          <button class="btn btn-secondary btn-sm" @click="handleRefresh">🔄 刷新当前</button>
          <button class="btn btn-secondary btn-sm" @click="closeOthers()">关闭其他</button>
          <button class="btn btn-secondary btn-sm" @click="closeAll">全部关闭 (保留固钉)</button>
        </div>
      </div>

      <div v-if="refreshMsg" class="refresh-alert">
        {{ refreshMsg }}
      </div>

      <!-- 状态看板 -->
      <div class="state-board">
        <div class="board-row">
          <span class="board-label">当前激活 Key (activeKey):</span>
          <span class="board-value highlight"
            ><code>{{ activeKey }}</code></span
          >
        </div>
        <div class="board-row">
          <span class="board-label">当前标签数量 (上限 5 个，FIFO 淘汰最早未固定项):</span>
          <span class="board-value">{{ tabs.length }} / 5 个</span>
        </div>
        <div class="board-row">
          <span class="board-label">KeepAlive 缓存组件白名单 (cachedViews):</span>
          <div class="cached-list">
            <span v-for="view in cachedViews" :key="view" class="view-tag">{{ view }}</span>
            <span v-if="cachedViews.length === 0" class="empty-hint">暂无活跃缓存组件</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped src="./tabs-nav-demo.css"></style>
