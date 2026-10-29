<script setup lang="ts">
/**
 * AtengProLayout 框架布局套件实装展厅。
 *
 * 核心演示：
 * 1. Side 经典侧边导航模式：数据驱动递归菜单、顶栏折叠把手、面包屑与 Tabs 协同；
 * 2. Top 顶部通栏导航模式：横向一级菜单自适应、视口最大化排版；
 * 3. 后端异构字段别名自适应映射（fieldNames）：零业务数据预处理；
 * 4. 吸底操作栏（AtengFooterBar）动态避让总线联动。
 *
 * @author Ateng
 * @since 2026-10-29
 */

import { ref, computed, type Component } from 'vue';
import { useTabsNav } from '@atengk/vue';
import {
  AtengProLayout,
  AtengTabsNav,
  AtengFooterBar,
  type ProMenuItem,
} from '@atengk/element-plus';
import {
  ElCard,
  ElRadioGroup,
  ElRadioButton,
  ElButton,
  ElTag,
  ElBadge,
  ElAvatar,
  ElSwitch,
  ElMessage,
} from 'element-plus';
import { IconDashboard, IconSetting, IconAnalytics, IconInfo } from './components/LayoutIcons';
import DashboardSandbox from './components/DashboardSandbox.vue';
import UserListSandbox from './components/UserListSandbox.vue';
import AnalyticsSandbox from './components/AnalyticsSandbox.vue';

// 1. 标准菜单源数据
const standardMenuData: ProMenuItem[] = [
  { path: '/dashboard', title: '工作台首页', icon: IconDashboard, affix: true },
  {
    path: '/system',
    title: '系统管理',
    icon: IconSetting,
    children: [
      { path: '/system/user', title: '用户列表', badge: 12, badgeType: 'danger' },
      { path: '/system/role', title: '角色权限' },
      { path: '/system/log', title: '操作日志' },
    ],
  },
  {
    path: '/analytics',
    title: '统计分析',
    icon: IconAnalytics,
    children: [
      { path: '/analytics/realtime', title: '实时大盘', badge: 'NEW', badgeType: 'success' },
      { path: '/analytics/report', title: '月度报表' },
    ],
  },
  { path: '/about', title: '关于项目', icon: IconInfo },
];

// 2. 状态控制与 useTabsNav 状态机集成
const activeLayout = ref<'side' | 'top' | 'mix'>('side');
const collapsed = ref(false);
const activeMenu = ref('/system/user');
const mixAutoSelectFirstLeaf = ref(true);
const useBuiltinTabs = ref(true);

// 移动端沙箱状态控制
const mobileDrawerCollapsed = ref(true);

// useTabsNav 无头响应式状态机
const {
  tabs: layoutTabs,
  activeKey: layoutActiveTab,
  cachedViews,
  openTab,
  closeTab,
  refreshTab,
  isMaximized: layoutMaximized,
} = useTabsNav({
  defaultActiveKey: '/system/user',
  defaultTabs: [
    { key: '/dashboard', title: '工作台首页', affix: true, componentName: 'DashboardSandbox' },
    { key: '/system/user', title: '用户列表', componentName: 'UserListSandbox' },
    { key: '/analytics/realtime', title: '实时大盘', componentName: 'AnalyticsSandbox' },
  ],
});

// 组件映射表
const componentMap: Record<string, Component> = {
  '/dashboard': DashboardSandbox,
  '/system/user': UserListSandbox,
  '/analytics/realtime': AnalyticsSandbox,
};

const activeComponent = computed(() => {
  return componentMap[activeMenu.value] || null;
});

const handleMenuSelect = (path: string, item?: ProMenuItem) => {
  activeMenu.value = path;
  layoutActiveTab.value = path;
  const compName =
    path === '/dashboard'
      ? 'DashboardSandbox'
      : path === '/system/user'
        ? 'UserListSandbox'
        : path === '/analytics/realtime'
          ? 'AnalyticsSandbox'
          : undefined;

  openTab({
    key: path,
    title: item?.title || path,
    componentName: compName,
    closable: path !== '/dashboard',
  });
};

const handleTabClick = (tab: { key: string }) => {
  activeMenu.value = tab.key;
  layoutActiveTab.value = tab.key;
};

const handleTabClose = (key: string) => {
  closeTab(key);
  activeMenu.value = layoutActiveTab.value;
};

const refreshingTabKey = ref<string | null>(null);
const isRefreshing = computed(() => !!refreshingTabKey.value);

const handleTabRefresh = async (key: string) => {
  if (refreshingTabKey.value) return;
  refreshingTabKey.value = key;
  await refreshTab(key);
  // 留出 180ms 平滑状态缓冲，杜绝人眼可见的组件销毁/重载抽搐跳跃
  await new Promise(resolve => setTimeout(resolve, 180));
  refreshingTabKey.value = null;
  ElMessage.success(`🔄 页面已局部重新挂载刷新: ${key}`);
};

// 保持 KeepAlive 缓存名单在界面上稳定展示，避免 refreshTab 瞬态销毁重建时引起 DOM 跳跃裂开
const displayCachedViews = computed(() => {
  const names = new Set<string>();
  for (const tab of layoutTabs.value) {
    if (tab.componentName && tab.componentName.trim().length > 0) {
      names.add(tab.componentName.trim());
    }
  }
  return Array.from(names);
});

const refreshingComponentName = computed(() => {
  if (!refreshingTabKey.value) return null;
  const targetTab = layoutTabs.value.find(t => t.key === refreshingTabKey.value);
  return targetTab?.componentName || null;
});

// 3. 后端异构字段源数据
interface BackendMenuItem {
  url: string;
  name: string;
  subList?: BackendMenuItem[];
  badgeNum?: number;
}

const backendData: BackendMenuItem[] = [
  { url: '/home', name: '运营总览' },
  {
    url: '/biz',
    name: '业务审批流',
    subList: [
      { url: '/biz/order', name: '订单审批', badgeNum: 5 },
      { url: '/biz/refund', name: '退款审核', badgeNum: 2 },
    ],
  },
  { url: '/doc', name: '开发文档' },
];
const activeBackendMenu = ref('/biz/order');
const backendCollapsed = ref(false);
</script>

<template>
  <div class="pro-layout-sample-page">
    <div class="page-title-area">
      <h2>AtengProLayout 框架布局容器与数据驱动菜单展厅</h2>
      <p class="desc">
        面向企业级中后台的多形态框架布局基础设施。原生支持 Side（经典侧边）与
        Top（顶部通栏）模式切换，
        支持树形数据驱动菜单递归渲染、异构字段映射（fieldNames）、多标签与吸底操作栏（AtengFooterBar）智能避让。
      </p>
    </div>

    <!-- 演示 1: 经典 Side / Top / Mix 交互骨架沙箱与 KeepAlive 缓存实战 -->
    <ElCard
      class="sample-card"
      header="1. 模式切换、全屏沉浸最大化与 KeepAlive 状态缓存 (Side / Top / Mix)"
    >
      <div class="card-controls">
        <span class="control-label">布局模式：</span>
        <ElRadioGroup v-model="activeLayout" size="small">
          <ElRadioButton value="side">Side 侧边导航</ElRadioButton>
          <ElRadioButton value="top">Top 顶部通栏</ElRadioButton>
          <ElRadioButton value="mix">Mix 顶左混合</ElRadioButton>
        </ElRadioGroup>

        <template v-if="activeLayout === 'side' || activeLayout === 'mix'">
          <ElButton size="small" type="primary" plain @click="collapsed = !collapsed">
            {{ collapsed ? '展开侧边栏' : '折叠侧边栏' }}
          </ElButton>
          <span class="status-tip">
            状态: {{ collapsed ? '已折叠 (64px)' : '已展开 (220px)' }}
          </span>
        </template>

        <template v-if="activeLayout === 'mix'">
          <ElSwitch v-model="mixAutoSelectFirstLeaf" active-text="点击一级模块自动导航首个叶子" />
        </template>

        <ElSwitch
          v-model="useBuiltinTabs"
          active-text="内置标签 (showTabs)"
          inactive-text="插槽覆盖 (#tabs)"
        />

        <ElButton
          size="small"
          :type="layoutMaximized ? 'warning' : 'info'"
          plain
          @click="layoutMaximized = !layoutMaximized"
        >
          {{ layoutMaximized ? '🗗 退出沉浸最大化' : '🗖 全屏沉浸最大化' }}
        </ElButton>
      </div>

      <!-- 嵌入式 ProLayout 模拟沙箱 -->
      <div class="demo-viewport">
        <AtengProLayout
          v-model:collapsed="collapsed"
          v-model:active-menu="activeMenu"
          v-model:is-maximized="layoutMaximized"
          :layout="activeLayout"
          :menu-data="standardMenuData"
          :mix-auto-select-first-leaf="mixAutoSelectFirstLeaf"
          :show-tabs="useBuiltinTabs"
          :tabs-props="{
            tabs: layoutTabs,
            modelValue: layoutActiveTab,
            showMaximize: true,
            contextMenu: true,
          }"
          title="Ateng Cloud Admin"
          style="min-height: 520px; height: 520px"
          @menu-select="handleMenuSelect"
          @tab-click="handleTabClick"
          @tab-close="handleTabClose"
          @tab-refresh="handleTabRefresh"
        >
          <!-- 顶栏右侧定制区 -->
          <template #headerRight>
            <ElBadge :value="3" class="header-action-badge">
              <ElButton circle size="small">🔔</ElButton>
            </ElBadge>
            <div class="user-profile">
              <ElAvatar
                size="small"
                src="https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png"
              />
              <span class="username">Admin</span>
            </div>
          </template>

          <!-- 多标签栏插槽自定义覆盖演示 -->
          <template v-if="!useBuiltinTabs" #tabs>
            <AtengTabsNav
              v-model="layoutActiveTab"
              :tabs="layoutTabs"
              :show-maximize="true"
              style="border-bottom: none"
              @tab-click="handleTabClick"
              @tab-close="handleTabClose"
              @tab-refresh="handleTabRefresh"
            />
          </template>

          <!-- 内容主体区：KeepAlive 真实实装 -->
          <div class="sandbox-content">
            <div class="cache-status-bar">
              <div class="cache-status-left">
                <span class="cache-label">📦 KeepAlive 缓存名单 (:include="cachedViews")：</span>
                <div class="cache-tags-list">
                  <ElTag
                    v-for="view in displayCachedViews"
                    :key="view"
                    size="small"
                    :type="view === refreshingComponentName ? 'warning' : 'success'"
                    :disable-transitions="true"
                    class="cache-tag"
                  >
                    {{ view }}
                  </ElTag>
                </div>
              </div>
              <ElButton
                size="small"
                type="primary"
                plain
                :loading="isRefreshing"
                class="refresh-btn"
                @click="handleTabRefresh(layoutActiveTab)"
              >
                🔄 刷新当前视图 (refreshTab 调度)
              </ElButton>
            </div>

            <div class="keep-alive-wrapper" :class="{ 'is-refreshing': isRefreshing }">
              <KeepAlive :include="cachedViews">
                <component :is="activeComponent" :key="layoutActiveTab" />
              </KeepAlive>
            </div>
          </div>

          <!-- 底部版权与操作栏（验证最大化自动避让） -->
          <template #footer>
            <AtengFooterBar
              position="sticky"
              show-submit
              show-cancel
              submit-text="提交当前页数据"
              @submit="ElMessage.success('提交保存成功！')"
            >
              <template #extra>
                <span>已联动 AtengProLayout 避让总线（沉浸最大化模式下避让自动归零）</span>
              </template>
            </AtengFooterBar>
          </template>
        </AtengProLayout>
      </div>
    </ElCard>

    <!-- 演示 2: 后端异构字段自适应映射 (fieldNames) -->
    <ElCard
      class="sample-card"
      header="2. 异构菜单字段自适应映射（fieldNames 配置）与无图标回退徽标"
    >
      <p class="section-desc">
        无需业务层手写递归遍历转换数据字段。通过声明 <code>fieldNames</code>，框架底层自动解析
        <code>url</code> ➔ <code>path</code>、<code>name</code> ➔ <code>title</code>、<code
          >subList</code
        >
        ➔ <code>children</code>。当菜单未配置图标时，收起侧边栏自动激活<strong
          >首字徽标回退（Fallback Avatar）</strong
        >，绝不留白。
      </p>

      <div class="card-controls" style="margin-bottom: 12px">
        <ElButton size="small" type="primary" plain @click="backendCollapsed = !backendCollapsed">
          {{ backendCollapsed ? '展开侧边栏 (240px)' : '收起侧边栏 (测试首字回退 64px)' }}
        </ElButton>
        <span class="status-tip">
          状态: {{ backendCollapsed ? '已折叠（首字徽章高亮展示，悬停出 Tooltip）' : '已展开' }}
        </span>
      </div>

      <div class="demo-viewport" style="height: 320px">
        <AtengProLayout
          v-model:collapsed="backendCollapsed"
          v-model:active-menu="activeBackendMenu"
          layout="side"
          :menu-data="backendData"
          :field-names="{
            path: 'url',
            title: 'name',
            children: 'subList',
            badge: 'badgeNum',
          }"
          title="异构系统映射"
          aside-width="240px"
          style="min-height: 320px; height: 320px"
        >
          <div class="sandbox-content">
            <h4>选中后端路由：{{ activeBackendMenu }}</h4>
            <p>
              后端数据结构保持原样，无需手动转译为 ProMenuItem
              标准结构；未配图标时折叠自动回退首字徽章。
            </p>
          </div>
        </AtengProLayout>
      </div>
    </ElCard>

    <!-- 演示 3: AtengFooterBar 避让总线联动 -->
    <ElCard class="sample-card" header="3. 吸底操作栏（AtengFooterBar）智能避让总线联动">
      <p class="section-desc">
        在 <code>AtengProLayout</code> 内部使用 <code>AtengFooterBar</code> 时， 无需手动计算
        <code>leftOffset</code>。操作栏通过 <code>ATENG_PRO_LAYOUT_KEY</code>
        自动感知侧边栏展开（220px）与折叠（64px），并在折叠展开时平滑过渡对齐！
      </p>

      <div class="demo-viewport" style="height: 380px">
        <AtengProLayout
          v-model:collapsed="collapsed"
          layout="side"
          :menu-data="standardMenuData"
          title="避让演示"
          style="min-height: 380px; height: 380px"
        >
          <div class="sandbox-content" style="min-height: 140px">
            <ElButton size="small" type="primary" @click="collapsed = !collapsed">
              点击切换折叠（观察底部操作栏 left 自动随动）
            </ElButton>
          </div>

          <template #footer>
            <AtengFooterBar
              position="fixed"
              show-submit
              show-reset
              show-cancel
              submit-text="保存布局配置"
              @submit="ElMessage.success('提交保存成功！')"
            >
              <template #extra>
                <span>已联动 AtengProLayout 避让总线</span>
              </template>
            </AtengFooterBar>
          </template>
        </AtengProLayout>
      </div>
    </ElCard>

    <!-- 演示 4: 移动端抽屉遮罩 (Mobile Drawer Overlay) -->
    <ElCard class="sample-card" header="4. 移动端抽屉遮罩交互沙箱 (Mobile Drawer Overlay)">
      <p class="section-desc">
        当屏幕视口宽度小于断点阈值（默认 768px）时，侧边栏自动收起，展开时以<strong
          >抽屉遮罩浮层（Mobile Drawer Overlay）</strong
        >呈现。 点击背景半透明暗黑遮罩或选择任意菜单叶子节点，抽屉将自动平滑关闭。
      </p>

      <div class="card-controls">
        <ElButton
          type="primary"
          size="small"
          @click="mobileDrawerCollapsed = !mobileDrawerCollapsed"
        >
          {{ !mobileDrawerCollapsed ? '关闭移动端抽屉' : '呼出移动端抽屉' }}
        </ElButton>
        <span class="status-tip">
          抽屉状态: {{ !mobileDrawerCollapsed ? '已呼出展开 (遮罩显示)' : '已收起 (64px/隐藏)' }}
        </span>
      </div>

      <!-- 模拟窄屏移动端容器 -->
      <div class="demo-viewport" style="max-width: 480px; height: 380px; position: relative">
        <AtengProLayout
          v-model:collapsed="mobileDrawerCollapsed"
          layout="side"
          :menu-data="standardMenuData"
          :mobile-breakpoint="1920"
          title="移动端抽屉"
          style="min-height: 380px; height: 380px"
        >
          <div class="sandbox-content">
            <h4>📱 移动端窄屏模拟沙箱</h4>
            <p>
              在移动端模式下，侧边栏不挤压内容区宽度（asideWidth 自动归零）。
              点击遮罩背景或点击菜单项时，抽屉将自动收回。
            </p>
          </div>
        </AtengProLayout>
      </div>
    </ElCard>
  </div>
</template>

<style scoped>
.pro-layout-sample-page {
  padding: 24px;
  background-color: var(--el-bg-color-page);
  min-height: 100vh;
}

.page-title-area {
  margin-bottom: 24px;
}

.page-title-area h2 {
  margin: 0 0 8px 0;
  font-size: 22px;
  color: var(--el-text-color-primary);
}

.page-title-area .desc {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 14px;
  line-height: 1.6;
}

.sample-card {
  margin-bottom: 24px;
}

.card-controls {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.control-label {
  font-size: 14px;
  color: var(--el-text-color-regular);
}

.status-tip {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.section-desc {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  margin-bottom: 16px;
}

.section-desc code {
  background-color: var(--el-fill-color);
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--el-color-primary);
}

.demo-viewport {
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: var(--el-box-shadow-light);
  position: relative;
  transform: translateZ(0);
}

.header-action-badge {
  display: inline-flex;
  margin-right: 12px;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 8px;
}

.username {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.sandbox-content {
  background-color: var(--el-bg-color);
  border-radius: 6px;
  padding: 20px;
  min-height: 200px;
}

.content-banner h3 {
  margin: 0 0 8px 0;
  color: var(--el-text-color-primary);
}

.content-banner p {
  margin: 0 0 16px 0;
  color: var(--el-text-color-secondary);
}

.action-tags {
  display: flex;
  gap: 8px;
}

.cache-status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background-color: var(--el-fill-color-light);
  border-radius: 6px;
  margin-bottom: 16px;
  min-height: 48px;
  box-sizing: border-box;
}

.cache-status-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  flex: 1;
  min-width: 0;
}

.cache-tags-list {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.cache-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-regular);
  flex-shrink: 0;
}

.cache-tag {
  font-family: Consolas, monospace;
}

.refresh-btn {
  flex-shrink: 0;
}

.keep-alive-wrapper {
  background-color: var(--el-bg-color-page);
  border: 1px dashed var(--el-border-color);
  border-radius: 6px;
  padding: 16px;
  min-height: 140px;
  box-sizing: border-box;
  transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.keep-alive-wrapper.is-refreshing {
  opacity: 0.45;
}

:deep(.sandbox-subview h4) {
  margin: 0 0 8px 0;
  color: var(--el-text-color-primary);
}

:deep(.time-info) {
  margin: 0 0 14px 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

:deep(.time-info strong) {
  color: var(--el-color-primary);
}

:deep(.form-group) {
  display: flex;
  align-items: center;
  font-size: 13px;
  color: var(--el-text-color-regular);
}
</style>
