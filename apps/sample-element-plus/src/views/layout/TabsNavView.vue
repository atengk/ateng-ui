<script setup lang="ts">
/**
 * 企业级多标签导航 AtengTabsNav 特性自验展厅。
 *
 * @author Ateng
 * @since 2026-10-29
 */

import { ref, computed, onUnmounted } from 'vue';
import { useTabsNav } from '@atengk/vue';
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

let tabCounter = 1;

// 集成 useTabsNav 无头状态机
const {
  tabs,
  activeKey: activeTabKey,
  cachedViews: _cachedViews,
  openTab,
  closeTab,
  refreshTab,
  isMaximized,
} = useTabsNav({
  defaultActiveKey: '/dashboard',
  defaultTabs: [
    { key: '/dashboard', title: '工作台首页', affix: true, componentName: 'DashboardView' },
    { key: '/system/user', title: '用户权限管理', componentName: 'UserManagement' },
    { key: '/system/role', title: '角色与策略中心', componentName: 'RoleManagement' },
    { key: '/monitor/server', title: '服务器实时监控大盘', componentName: 'ServerMonitor' },
    { key: '/business/order', title: '电商订单中心明细', componentName: 'OrderList' },
    { key: '/finance/report', title: '财务季度对账报表', componentName: 'FinanceReport' },
    { key: '/dev/logs', title: '实时日志控制台', componentName: 'SystemLogs' },
  ],
});

interface EventLogItem {
  time: string;
  type: 'click' | 'close' | 'refresh' | 'order' | 'maximize' | 'open' | 'reset';
  action: string;
  message: string;
}

// 事件日志记录
const eventLogs = ref<EventLogItem[]>([]);

const addLog = (type: EventLogItem['type'], action: string, message: string): void => {
  const time = new Date().toLocaleTimeString();
  eventLogs.value.unshift({ time, type, action, message });
  if (eventLogs.value.length > 50) {
    eventLogs.value.pop();
  }
};

// 保持 KeepAlive 缓存名单在界面上稳定展示，避免 refreshTab 瞬态销毁重建时引起 DOM 跳跃裂开
const displayCachedViews = computed(() => {
  const names = new Set<string>();
  for (const tab of tabs.value) {
    if (tab.componentName && tab.componentName.trim().length > 0) {
      names.add(tab.componentName.trim());
    }
  }
  return Array.from(names);
});

const refreshingKey = ref<string | null>(null);
const refreshingCompName = computed(() => {
  if (!refreshingKey.value) return null;
  const target = tabs.value.find(t => t.key === refreshingKey.value);
  return target?.componentName || null;
});

// 交互操作处理
const handleTabClick = (tab: TabItem): void => {
  addLog('click', '点击标签', `${tab.title} (${tab.key})`);
};

const handleTabClose = (key: string, tab: TabItem): void => {
  closeTab(key);
  addLog('close', '关闭标签', `${tab.title} (${key})`);
  ElMessage.info(`已关闭标签: ${tab.title}`);
};

let refreshTimer: ReturnType<typeof setTimeout> | null = null;

const handleTabRefresh = async (key: string, tab: TabItem): Promise<void> => {
  refreshingKey.value = key;
  await refreshTab(key);
  addLog('refresh', '局部刷新', `${tab.title} (${key})，瞬态从 cachedViews 剔除并重新挂载`);
  ElMessage.success(`🔄 正在局部刷新页面: ${tab.title}`);
  if (refreshTimer) {
    clearTimeout(refreshTimer);
  }
  refreshTimer = setTimeout(() => {
    if (refreshingKey.value === key) {
      refreshingKey.value = null;
    }
    refreshTimer = null;
  }, 180);
};

onUnmounted(() => {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
});

const handleTabOrderChange = (newTabs: TabItem[]): void => {
  tabs.value = newTabs;
  addLog('order', '拖拽调序', `当前顺序: ${newTabs.map(t => t.title).join(' ➔ ')}`);
  ElMessage.success('标签拖拽排序成功！');
};

const handleMaximizeChange = (val: boolean): void => {
  isMaximized.value = val;
  addLog('maximize', '全屏视图', val ? '已进入内容全屏沉浸最大化模式' : '已退出全屏恢复普通视图');
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
  openTab(newTab);
  addLog('open', '追加标签', `${newTab.title} (${newTab.key})`);
  ElMessage.success(`已打开 ${newTab.title}`);
};

// 重置所有标签
const resetTabs = (): void => {
  tabs.value = [
    { key: '/dashboard', title: '工作台首页', affix: true, componentName: 'DashboardView' },
    { key: '/system/user', title: '用户权限管理', componentName: 'UserManagement' },
    { key: '/system/role', title: '角色与策略中心', componentName: 'RoleManagement' },
  ];
  activeTabKey.value = '/dashboard';
  addLog('reset', '重置标签', '已重置所有标签列表至初始基准线');
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

        <div class="ctrl-item">
          <span class="label">KeepAlive 缓存名单 (cachedViews)：</span>
          <ElTag
            v-for="c in displayCachedViews"
            :key="c"
            size="small"
            :type="c === refreshingCompName ? 'warning' : 'success'"
            :disable-transitions="true"
            style="margin-right: 4px"
          >
            {{ c }}
          </ElTag>
          <span
            v-if="displayCachedViews.length === 0"
            style="color: var(--el-text-color-secondary); font-size: 12px"
            >（暂无缓存）</span
          >
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

    <!-- 演示容器主体（支持真实全屏沉浸最大化模式） -->
    <ElCard
      class="demo-card"
      :class="{ 'is-fullscreen-maximized': isMaximized }"
      header="AtengTabsNav 全真交互展示"
    >
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

        <!-- 实时操作事件日志极客终端 -->
        <div class="event-terminal">
          <div class="terminal-header">
            <div class="terminal-dots">
              <span class="dot dot-close" />
              <span class="dot dot-minimize" />
              <span class="dot dot-maximize" />
            </div>
            <div class="terminal-title">
              <span class="terminal-icon">⚡</span>
              <span>TERMINAL // TABS-NAV EVENT STREAM</span>
            </div>
            <div class="terminal-actions">
              <button type="button" class="terminal-btn" title="清空日志" @click="eventLogs = []">
                🧹 清空
              </button>
            </div>
          </div>
          <div class="terminal-body">
            <div v-for="(log, idx) in eventLogs" :key="idx" class="terminal-line">
              <span class="log-prefix">➜</span>
              <span class="log-time">{{ log.time }}</span>
              <span class="log-type" :class="`type-${log.type}`">{{ log.action }}</span>
              <span class="log-msg">{{ log.message }}</span>
            </div>
            <div v-if="eventLogs.length === 0" class="terminal-empty">
              <span class="cursor-blink">▋</span>
              暂无事件派发，请在上方标签栏进行点击、拖拽调序、滚动或右键菜单操作...
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
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);

  .tabs-wrapper {
    border: 1px solid var(--el-border-color-lighter, #ebeef5);
    border-bottom: none;
    border-radius: 6px 6px 0 0;
    overflow: hidden;
    background-color: var(--el-bg-color, #ffffff);
  }

  .simulated-content {
    margin-top: 0;
    padding: 20px;
    background-color: var(--el-fill-color-blank, #ffffff);
    border: 1px solid var(--el-border-color-lighter, #ebeef5);
    border-radius: 0 0 6px 6px;
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

  // ==========================================
  // 高颜值极客 macOS 终端面板
  // ==========================================
  .event-terminal {
    background-color: #1a1c23;
    border-radius: 8px;
    border: 1px solid #2d3139;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    overflow: hidden;
    font-family: 'JetBrains Mono', Consolas, Monaco, monospace;

    .terminal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 32px;
      padding: 0 12px;
      background-color: #232731;
      border-bottom: 1px solid #2d3139;
      user-select: none;
    }

    .terminal-dots {
      display: flex;
      gap: 6px;

      .dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;

        &-close {
          background-color: #ff5f56;
        }
        &-minimize {
          background-color: #ffbd2e;
        }
        &-maximize {
          background-color: #27c93f;
        }
      }
    }

    .terminal-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.5px;
      color: #9da5b4;

      .terminal-icon {
        color: #e5c07b;
      }
    }

    .terminal-btn {
      padding: 2px 8px;
      font-size: 11px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #abb2bf;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        background: rgba(97, 175, 239, 0.2);
        color: #61afef;
        border-color: #61afef;
      }
    }

    .terminal-body {
      padding: 12px 14px;
      max-height: 180px;
      overflow-y: auto;
      font-size: 12px;
      line-height: 1.8;

      &::-webkit-scrollbar {
        width: 6px;
      }
      &::-webkit-scrollbar-thumb {
        background: #3e4451;
        border-radius: 3px;
      }
    }

    .terminal-line {
      display: flex;
      align-items: baseline;
      gap: 8px;
      white-space: nowrap;
      animation: terminalFadeIn 0.15s ease;
    }

    .log-prefix {
      color: #98c379;
      font-weight: bold;
    }

    .log-time {
      color: #5c6370;
      font-size: 11px;
    }

    .log-type {
      display: inline-block;
      padding: 0 6px;
      border-radius: 3px;
      font-size: 11px;
      font-weight: 500;
      line-height: 18px;

      &.type-click {
        background: rgba(97, 175, 239, 0.15);
        color: #61afef;
      }
      &.type-open {
        background: rgba(152, 195, 121, 0.15);
        color: #98c379;
      }
      &.type-close {
        background: rgba(224, 108, 117, 0.15);
        color: #e06c75;
      }
      &.type-refresh {
        background: rgba(229, 192, 123, 0.15);
        color: #e5c07b;
      }
      &.type-order {
        background: rgba(198, 120, 221, 0.15);
        color: #c678dd;
      }
      &.type-maximize {
        background: rgba(86, 182, 194, 0.15);
        color: #56b6c2;
      }
      &.type-reset {
        background: rgba(171, 178, 191, 0.15);
        color: #abb2bf;
      }
    }

    .log-msg {
      color: #abb2bf;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .terminal-empty {
      color: #5c6370;
      font-style: italic;

      .cursor-blink {
        color: #98c379;
        display: inline-block;
        animation: terminalBlink 1s infinite;
      }
    }
  }

  // ==========================================
  // 全屏沉浸工作台模式 (突破普通流，覆盖全屏视口)
  // ==========================================
  &.is-fullscreen-maximized {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100vw;
    height: 100vh;
    z-index: 2500;
    border-radius: 0;
    border: none;
    margin: 0;
    padding: 0;
    box-shadow: none;
    background-color: var(--el-bg-color-page, #f5f7fa);
    display: flex;
    flex-direction: column;

    :deep(.el-card__header) {
      display: none;
    }

    :deep(.el-card__body) {
      flex: 1;
      padding: 0;
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }

    .tabs-wrapper {
      border-radius: 0;
      border-left: none;
      border-right: none;
      border-top: none;
      border-bottom: 1px solid var(--el-border-color-lighter, #ebeef5);
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      z-index: 10;
    }

    .simulated-content {
      flex: 1;
      margin: 16px;
      border-radius: 8px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      border: 1px solid var(--el-border-color-lighter, #ebeef5);
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
    }
  }
}

@keyframes terminalBlink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}

@keyframes terminalFadeIn {
  from {
    opacity: 0;
    transform: translateY(-2px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
