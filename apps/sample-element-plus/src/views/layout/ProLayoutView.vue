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

import { ref } from 'vue';
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
  ElMessage,
} from 'element-plus';

// 1. 标准菜单源数据
const standardMenuData: ProMenuItem[] = [
  { path: '/dashboard', title: '工作台首页', icon: 'el-icon-monitor', affix: true },
  {
    path: '/system',
    title: '系统管理',
    icon: 'el-icon-setting',
    children: [
      { path: '/system/user', title: '用户列表', badge: 12, badgeType: 'danger' },
      { path: '/system/role', title: '角色权限' },
      { path: '/system/log', title: '操作日志' },
    ],
  },
  {
    path: '/analytics',
    title: '统计分析',
    icon: 'el-icon-data-line',
    children: [
      { path: '/analytics/realtime', title: '实时大盘', badge: 'NEW', badgeType: 'success' },
      { path: '/analytics/report', title: '月度报表' },
    ],
  },
  { path: '/about', title: '关于项目', icon: 'el-icon-info' },
];

// 2. 状态控制
const activeLayout = ref<'side' | 'top'>('side');
const collapsed = ref(false);
const activeMenu = ref('/system/user');

// 多标签栏协同数据
const tabsList = ref([
  { key: '/dashboard', title: '工作台首页', affix: true, closable: false },
  { key: '/system/user', title: '用户列表', closable: true },
  { key: '/analytics/realtime', title: '实时大盘', closable: true },
]);

const handleMenuSelect = (path: string, item?: ProMenuItem) => {
  activeMenu.value = path;
  if (!tabsList.value.some(t => t.key === path)) {
    tabsList.value.push({
      key: path,
      title: item?.title || path,
      closable: true,
    });
  }
};

const handleTabClose = (key: string) => {
  tabsList.value = tabsList.value.filter(t => t.key !== key);
  if (activeMenu.value === key && tabsList.value.length > 0) {
    const last = tabsList.value[tabsList.value.length - 1];
    if (last) {
      activeMenu.value = last.key;
    }
  }
};

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

    <!-- 演示 1: 经典 Side / Top 交互骨架沙箱 -->
    <ElCard class="sample-card" header="1. 模式切换与数据驱动菜单（Side / Top 模式）">
      <div class="card-controls">
        <span class="control-label">布局模式：</span>
        <ElRadioGroup v-model="activeLayout" size="small">
          <ElRadioButton value="side">Side 侧边导航模式</ElRadioButton>
          <ElRadioButton value="top">Top 顶部通栏模式</ElRadioButton>
        </ElRadioGroup>

        <template v-if="activeLayout === 'side'">
          <ElButton size="small" type="primary" plain @click="collapsed = !collapsed">
            {{ collapsed ? '展开侧边栏' : '折叠侧边栏' }}
          </ElButton>
          <span class="status-tip">
            状态: {{ collapsed ? '已折叠 (64px)' : '已展开 (220px)' }}
          </span>
        </template>
      </div>

      <!-- 嵌入式 ProLayout 模拟沙箱 -->
      <div class="demo-viewport">
        <AtengProLayout
          v-model:collapsed="collapsed"
          v-model:active-menu="activeMenu"
          :layout="activeLayout"
          :menu-data="standardMenuData"
          title="Ateng Cloud Admin"
          style="min-height: 480px; height: 480px"
          @menu-select="handleMenuSelect"
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

          <!-- 多标签栏插槽 -->
          <template #tabs>
            <AtengTabsNav
              v-model="activeMenu"
              :tabs="tabsList"
              style="border-bottom: none"
              @tab-click="k => (activeMenu = k)"
              @tab-remove="handleTabClose"
            />
          </template>

          <!-- 内容主体区 -->
          <div class="sandbox-content">
            <div class="content-banner">
              <h3>当前视图：{{ activeMenu }}</h3>
              <p>
                当前布局处于 <strong>{{ activeLayout }}</strong> 模式。 侧边栏展开宽度
                220px，折叠后自适应缩小为 64px。
              </p>
              <div class="action-tags">
                <ElTag type="success">数据驱动渲染</ElTag>
                <ElTag type="primary">递归无限层级</ElTag>
                <ElTag type="warning">面包屑与 Tabs 协同</ElTag>
              </div>
            </div>
          </div>

          <!-- 底部版权说明 -->
          <template #footer>
            <span>Copyright © 2026 Ateng Frontend Suite. All rights reserved.</span>
          </template>
        </AtengProLayout>
      </div>
    </ElCard>

    <!-- 演示 2: 后端异构字段自适应映射 (fieldNames) -->
    <ElCard class="sample-card" header="2. 异构菜单字段自适应映射（fieldNames 配置）">
      <p class="section-desc">
        无需业务层手写递归遍历转换数据字段。通过声明 <code>fieldNames</code>， 框架底层自动解析
        <code>url</code> ➔ <code>path</code>、<code>name</code> ➔ <code>title</code>、<code
          >subList</code
        >
        ➔ <code>children</code>。
      </p>

      <div class="demo-viewport" style="height: 320px">
        <AtengProLayout
          v-model:active-menu="activeBackendMenu"
          layout="side"
          :menu-data="backendData as any"
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
            <p>后端数据结构保持原样，无需手动转译为 ProMenuItem 标准结构。</p>
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

      <div class="demo-viewport" style="height: 300px; position: relative">
        <AtengProLayout
          v-model:collapsed="collapsed"
          layout="side"
          :menu-data="standardMenuData"
          title="避让演示"
          style="min-height: 300px; height: 300px"
        >
          <div class="sandbox-content">
            <ElButton size="small" type="primary" @click="collapsed = !collapsed">
              点击切换折叠（观察底部操作栏 left 自动随动）
            </ElButton>
          </div>

          <template #footer>
            <AtengFooterBar
              position="sticky"
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
</style>
