<script setup lang="ts">
/**
 * 企业级多标签导航 AtengTabsNav 特性自验展厅。
 *
 * @author Ateng
 * @since 2026-10-29
 */

import { ref } from 'vue';
import {
  ElAlert,
  ElCard,
  ElButton,
  ElRadioGroup,
  ElRadioButton,
  ElSwitch,
  ElTag,
  ElMessage,
} from 'element-plus';
import { AtengTabsNav, type TabItem, type TabsStyle } from '@atengk/element-plus';

// 风格与配置切换
const currentStyle = ref<TabsStyle>('card');
const draggable = ref(true);
const contextMenu = ref(true);
const showQuickActions = ref(true);
const showMaximize = ref(true);
const isMaximized = ref(false);

// 激活项与测试数据
const activeTabKey = ref('/dashboard');
let tabCounter = 1;

const tabs = ref<TabItem[]>([
  {
    key: '/dashboard',
    title: '工作台首页',
    affix: true,
  },
  {
    key: '/system/user',
    title: '用户权限管理',
    componentName: 'UserManagement',
  },
  {
    key: '/system/role',
    title: '角色与策略中心',
    componentName: 'RoleManagement',
  },
  {
    key: '/monitor/server',
    title: '服务器实时监控大盘',
    componentName: 'ServerMonitor',
  },
  {
    key: '/business/order',
    title: '电商订单中心明细',
    componentName: 'OrderList',
  },
  {
    key: '/finance/report',
    title: '财务季度对账报表',
    componentName: 'FinanceReport',
  },
  {
    key: '/dev/logs',
    title: '实时日志控制台',
    componentName: 'SystemLogs',
  },
]);

// 事件日志记录
const eventLogs = ref<string[]>([]);

const addLog = (msg: string): void => {
  const time = new Date().toLocaleTimeString();
  eventLogs.value.unshift(`[${time}] ${msg}`);
  if (eventLogs.value.length > 20) {
    eventLogs.value.pop();
  }
};

// 交互操作处理
const handleTabClick = (tab: TabItem): void => {
  addLog(`点击标签: ${tab.title} (${tab.key})`);
};

const handleTabClose = (key: string, tab: TabItem): void => {
  const idx = tabs.value.findIndex(t => t.key === key);
  if (idx >= 0) {
    tabs.value.splice(idx, 1);
    if (activeTabKey.value === key) {
      const next = tabs.value[idx] || tabs.value[idx - 1];
      activeTabKey.value = next ? next.key : '';
    }
    addLog(`关闭标签: ${tab.title} (${key})`);
    ElMessage.info(`已关闭标签: ${tab.title}`);
  }
};

const handleTabRefresh = (key: string, tab: TabItem): void => {
  addLog(`触发标签刷新: ${tab.title} (${key})`);
  ElMessage.success(`🔄 正在刷新页面: ${tab.title}`);
};

const handleTabOrderChange = (newTabs: TabItem[]): void => {
  tabs.value = newTabs;
  addLog(`拖拽调序完成，当前顺序: ${newTabs.map(t => t.title).join(' ➔ ')}`);
  ElMessage.success('标签拖拽排序成功！');
};

const handleMaximizeChange = (val: boolean): void => {
  isMaximized.value = val;
  addLog(`内容区全屏最大化状态改变: ${val ? '已最大化' : '已还原'}`);
  ElMessage.info(val ? '已进入内容最大化全屏' : '已退出最大化');
};

// 添加新标签
const addNewTab = (): void => {
  const id = ++tabCounter;
  const newTab: TabItem = {
    key: `/dynamic/page-${id}`,
    title: `动态任务标签 ${id}`,
    componentName: `DynamicPage${id}`,
  };
  tabs.value.push(newTab);
  activeTabKey.value = newTab.key;
  addLog(`追加新标签: ${newTab.title}`);
  ElMessage.success(`已打开 ${newTab.title}`);
};

// 重置所有标签
const resetTabs = (): void => {
  tabs.value = [
    { key: '/dashboard', title: '工作台首页', affix: true },
    { key: '/system/user', title: '用户权限管理' },
    { key: '/system/role', title: '角色与策略中心' },
  ];
  activeTabKey.value = '/dashboard';
  addLog('已重置标签列表');
};
</script>

<template>
  <div class="tabs-nav-view" :class="{ 'is-simulated-maximized': isMaximized }">
    <ElAlert
      title="AtengTabsNav 企业级多标签导航组件特性展厅"
      type="success"
      description="集成横向溢出平滑滚动与鼠标滚轮滑动、激活项自适应居中、原生零依赖 HTML5 拖拽调序防呆、Element Plus 原生 ElDropdown 右键快捷上下文菜单、快捷批量关闭面板与 card / pill / line 三大视觉风格形态。"
      show-icon
      :closable="false"
      style="margin-bottom: 20px"
    />

    <!-- 控制台面板 -->
    <ElCard class="ctrl-card" header="交互调试控制台">
      <div class="ctrl-row">
        <div class="ctrl-item">
          <span class="label">视觉形态 (styleType)：</span>
          <ElRadioGroup v-model="currentStyle" size="small">
            <ElRadioButton value="card">Card 卡片</ElRadioButton>
            <ElRadioButton value="pill">Pill 胶囊</ElRadioButton>
            <ElRadioButton value="line">Line 极简下划线</ElRadioButton>
          </ElRadioGroup>
        </div>

        <div class="ctrl-item">
          <span class="label">原生拖拽排序 (draggable)：</span>
          <ElSwitch v-model="draggable" size="small" />
        </div>

        <div class="ctrl-item">
          <span class="label">右键上下文菜单 (contextMenu)：</span>
          <ElSwitch v-model="contextMenu" size="small" />
        </div>

        <div class="ctrl-item">
          <span class="label">快捷操作按钮 (showQuickActions)：</span>
          <ElSwitch v-model="showQuickActions" size="small" />
        </div>

        <div class="ctrl-item">
          <span class="label">最大化按钮 (showMaximize)：</span>
          <ElSwitch v-model="showMaximize" size="small" />
        </div>
      </div>

      <div class="ctrl-actions">
        <ElButton type="primary" size="small" @click="addNewTab"> ➕ 追加新标签 </ElButton>
        <ElButton size="small" @click="resetTabs"> 🔄 重置默认标签 </ElButton>
        <span class="status-badge">
          当前激活 Key:
          <ElTag size="small" type="primary">{{ activeTabKey || '无' }}</ElTag>
        </span>
      </div>
    </ElCard>

    <!-- 演示容器主体 -->
    <ElCard class="demo-card" header="AtengTabsNav 全真交互展示">
      <div class="tabs-wrapper">
        <AtengTabsNav
          v-model="activeTabKey"
          v-model:tabs="tabs"
          v-model:is-maximized="isMaximized"
          :style-type="currentStyle"
          :draggable="draggable"
          :context-menu="contextMenu"
          :show-quick-actions="showQuickActions"
          :show-maximize="showMaximize"
          @tab-click="handleTabClick"
          @tab-close="handleTabClose"
          @tab-refresh="handleTabRefresh"
          @tab-order-change="handleTabOrderChange"
          @maximize-change="handleMaximizeChange"
        />
      </div>

      <!-- 模拟视图内容区 -->
      <div class="simulated-content">
        <div class="content-header">
          <h3>当前激活视图：{{ tabs.find(t => t.key === activeTabKey)?.title || '未选中' }}</h3>
          <p class="content-sub">
            路由唯一键：<code>{{ activeTabKey }}</code> |
            提示：可在标签上长按并拖拽鼠标排序，或鼠标滚轮横向滑动，亦可右键单击任意标签呼出上下文快捷菜单。
          </p>
        </div>

        <!-- 实时操作事件日志终端 -->
        <div class="event-terminal">
          <div class="terminal-title">事件实时流动监听终端：</div>
          <div class="terminal-body">
            <div v-for="(log, idx) in eventLogs" :key="idx" class="terminal-line">
              {{ log }}
            </div>
            <div v-if="eventLogs.length === 0" class="terminal-empty">
              暂无事件派发，请尝试在上方标签栏进行点击、拖拽调序、滚动或右键菜单操作...
            </div>
          </div>
        </div>
      </div>
    </ElCard>
  </div>
</template>

<style scoped lang="scss">
.tabs-nav-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
  transition: all 0.3s ease;

  &.is-simulated-maximized {
    padding: 10px;
    background-color: var(--el-bg-color-page, #f2f3f5);
  }
}

.ctrl-card {
  .ctrl-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 20px;
    margin-bottom: 16px;
  }

  .ctrl-item {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--el-text-color-regular, #606266);
  }

  .ctrl-actions {
    display: flex;
    align-items: center;
    gap: 12px;
    padding-top: 12px;
    border-top: 1px dashed var(--el-border-color-lighter, #ebeef5);
  }

  .status-badge {
    margin-left: auto;
    font-size: 13px;
    color: var(--el-text-color-secondary, #909399);
  }
}

.demo-card {
  .tabs-wrapper {
    border: 1px solid var(--el-border-color-lighter, #ebeef5);
    border-radius: var(--el-border-radius-base, 4px);
    overflow: hidden;
  }

  .simulated-content {
    margin-top: 16px;
    padding: 20px;
    background-color: var(--el-fill-color-blank, #ffffff);
    border: 1px solid var(--el-border-color-lighter, #ebeef5);
    border-radius: var(--el-border-radius-base, 4px);
    min-height: 240px;
  }

  .content-header {
    margin-bottom: 16px;

    h3 {
      margin: 0 0 6px 0;
      color: var(--el-text-color-primary, #303133);
    }

    .content-sub {
      margin: 0;
      font-size: 13px;
      color: var(--el-text-color-secondary, #909399);

      code {
        padding: 2px 6px;
        background-color: var(--el-fill-color-light, #f5f7fa);
        border-radius: 4px;
        color: var(--el-color-primary, #409eff);
      }
    }
  }

  .event-terminal {
    background-color: var(--el-fill-color-darker, #1e1e1e);
    border-radius: 6px;
    padding: 12px 16px;
    font-family: Consolas, Monaco, monospace;
    font-size: 12px;
    color: #a9b7c6;

    .terminal-title {
      font-weight: bold;
      color: #e5eaf3;
      margin-bottom: 8px;
      border-bottom: 1px solid #333333;
      padding-bottom: 4px;
    }

    .terminal-body {
      max-height: 140px;
      overflow-y: auto;
    }

    .terminal-line {
      line-height: 1.6;
      color: #98c379;
    }

    .terminal-empty {
      color: #5c6370;
      font-style: italic;
    }
  }
}
</style>
