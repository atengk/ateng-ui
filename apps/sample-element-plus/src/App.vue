<script setup lang="ts">
/**
 * sample-element-plus 展厅根布局组件。
 *
 * 集成经典中后台双栏布局：顶部 Header 附带暗黑模式与全局尺寸控制器，
 * 左侧侧边栏支持路由导航，主区域承载独立页面视图。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import {
  ElContainer,
  ElHeader,
  ElAside,
  ElMain,
  ElMenu,
  ElMenuItem,
  ElSubMenu,
  ElConfigProvider,
  ElButton,
  ElRadioGroup,
  ElRadioButton,
  ElScrollbar,
  ElIcon,
} from 'element-plus';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import { VERSION } from '@atengk/element-plus';

const route = useRoute();

// 侧边栏折叠状态
const isCollapse = ref(false);
const toggleCollapse = () => {
  isCollapse.value = !isCollapse.value;
};

// 全局尺寸控制 (large | default | small)
const globalSize = ref<'large' | 'default' | 'small'>('default');

// 暗黑模式控制
const isDark = ref(false);

const toggleDark = () => {
  isDark.value = !isDark.value;
  if (isDark.value) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

onMounted(() => {
  isDark.value = document.documentElement.classList.contains('dark');
});
</script>

<template>
  <ElConfigProvider :size="globalSize" :locale="zhCn">
    <ElContainer class="layout-container">
      <!-- 顶部 Header -->
      <ElHeader class="layout-header">
        <div class="logo-area">
          <span class="logo-title">@atengk/element-plus 基础设施全特性展厅</span>
          <span class="version-tag">v{{ VERSION }}</span>
        </div>
        <div class="header-controls">
          <div class="control-group">
            <span class="ctrl-label">全局尺寸：</span>
            <ElRadioGroup v-model="globalSize" size="small">
              <ElRadioButton value="large">Large</ElRadioButton>
              <ElRadioButton value="default">Default</ElRadioButton>
              <ElRadioButton value="small">Small</ElRadioButton>
            </ElRadioGroup>
          </div>
          <ElButton size="small" @click="toggleDark">
            {{ isDark ? '☀️ 浅色模式' : '🌙 暗黑模式' }}
          </ElButton>
        </div>
      </ElHeader>

      <ElContainer class="layout-body">
        <!-- 左侧导航侧边栏 (由 CSS 统一受管驱动，彻底消除内联 width 冲突与收发展开抽搐) -->
        <ElAside class="layout-aside" :class="{ 'is-collapsed': isCollapse }">
          <div class="aside-inner">
            <!-- 虚拟悬浮滚动条：0px 物理挤占，彻底消除折叠展开抖动与横向溢出 -->
            <ElScrollbar class="aside-scrollbar" wrap-class="aside-scrollbar-wrap">
              <ElMenu
                router
                unique-opened
                :collapse="isCollapse"
                :collapse-transition="false"
                :default-active="route.path"
                class="layout-menu"
              >
                <!-- 1. 指令套件 -->
                <ElSubMenu index="directives">
                  <template #title>
                    <ElIcon class="sub-menu-icon"><span>⚡</span></ElIcon>
                    <span class="sub-menu-title">指令套件 (Directives)</span>
                  </template>
                  <ElMenuItem index="/directives/permission" title="权限控制 (v-permission)">
                    权限控制 (v-permission)
                  </ElMenuItem>
                  <ElMenuItem index="/directives/role" title="角色控制 (v-role)">
                    角色控制 (v-role)
                  </ElMenuItem>
                  <ElMenuItem index="/directives/idempotent" title="幂等防重 (v-idempotent)">
                    幂等防重 (v-idempotent)
                  </ElMenuItem>
                  <ElMenuItem index="/directives/copy" title="剪贴板复制 (v-copy)">
                    剪贴板复制 (v-copy)
                  </ElMenuItem>
                  <ElMenuItem index="/directives/watermark" title="动态防篡改水印 (v-watermark)">
                    动态防篡改水印 (v-watermark)
                  </ElMenuItem>
                </ElSubMenu>

                <!-- 2. 页面骨架与容器 -->
                <ElSubMenu index="layout">
                  <template #title>
                    <ElIcon class="sub-menu-icon"><span>🏛️</span></ElIcon>
                    <span class="sub-menu-title">页面骨架与容器 (Layout)</span>
                  </template>
                  <ElMenuItem
                    index="/layout/page-container"
                    title="页面主体容器 (AtengPageContainer)"
                  >
                    页面主体容器 (AtengPageContainer)
                  </ElMenuItem>
                  <ElMenuItem index="/layout/split-layout" title="弹性分栏容器 (AtengSplitLayout)">
                    弹性分栏容器 (AtengSplitLayout)
                  </ElMenuItem>
                  <ElMenuItem index="/layout/footer-bar" title="吸底操作栏 (AtengFooterBar)">
                    吸底操作栏 (AtengFooterBar)
                  </ElMenuItem>
                  <ElMenuItem index="/layout/card" title="结构化卡片 (AtengCard)">
                    结构化卡片 (AtengCard)
                  </ElMenuItem>
                  <ElMenuItem index="/layout/card-group" title="卡片组手风琴 (AtengCardGroup)">
                    卡片组手风琴 (AtengCardGroup)
                  </ElMenuItem>
                  <ElMenuItem index="/layout/skeleton" title="页面骨架屏 (AtengPageSkeleton)">
                    页面骨架屏 (AtengPageSkeleton)
                  </ElMenuItem>
                  <ElMenuItem index="/layout/watermark" title="防篡改水印容器 (AtengWatermark)">
                    防篡改水印容器 (AtengWatermark)
                  </ElMenuItem>
                  <ElMenuItem index="/layout/grid" title="容器自适应网格 (AtengGrid)">
                    容器自适应网格 (AtengGrid)
                  </ElMenuItem>
                  <ElMenuItem index="/layout/anchor" title="电梯锚点导航 (AtengAnchor)">
                    电梯锚点导航 (AtengAnchor)
                  </ElMenuItem>
                </ElSubMenu>

                <!-- 3. 交互容器 -->
                <ElSubMenu index="containers">
                  <template #title>
                    <ElIcon class="sub-menu-icon"><span>📦</span></ElIcon>
                    <span class="sub-menu-title">交互容器 (Containers)</span>
                  </template>
                  <ElMenuItem index="/containers/dialog" title="弹窗容器 (AtengDialog)">
                    弹窗容器 (AtengDialog)
                  </ElMenuItem>
                  <ElMenuItem index="/containers/drawer" title="抽屉容器 (AtengDrawer)">
                    抽屉容器 (AtengDrawer)
                  </ElMenuItem>
                  <ElMenuItem index="/containers/empty" title="缺省占位 (AtengEmpty)">
                    缺省占位 (AtengEmpty)
                  </ElMenuItem>
                  <ElMenuItem index="/containers/loading" title="现代轻量加载 (AtengLoading)">
                    现代轻量加载 (AtengLoading)
                  </ElMenuItem>
                </ElSubMenu>

                <!-- 4. 表格与检索 -->
                <ElSubMenu index="table">
                  <template #title>
                    <ElIcon class="sub-menu-icon"><span>📊</span></ElIcon>
                    <span class="sub-menu-title">表格与检索 (Table & Query)</span>
                  </template>
                  <ElMenuItem index="/table/query-form" title="搜索表单 (AtengQueryForm)">
                    搜索表单 (AtengQueryForm)
                  </ElMenuItem>
                  <ElMenuItem index="/table/crud" title="综合表格沙箱 (AtengTable CRUD)">
                    综合表格沙箱 (AtengTable CRUD)
                  </ElMenuItem>
                </ElSubMenu>

                <!-- 5. 业务控件套件 -->
                <ElSubMenu index="business">
                  <template #title>
                    <ElIcon class="sub-menu-icon"><span>🧩</span></ElIcon>
                    <span class="sub-menu-title">业务控件套件 (Business)</span>
                  </template>
                  <ElMenuItem index="/business/dict" title="字典管理套件 (AtengDict*)">
                    字典管理套件 (AtengDict*)
                  </ElMenuItem>
                  <ElMenuItem index="/business/descriptions" title="结构化详情 (AtengDescriptions)">
                    结构化详情 (AtengDescriptions)
                  </ElMenuItem>
                  <ElMenuItem index="/business/date-range" title="时间范围选择 (AtengDateRange)">
                    时间范围选择 (AtengDateRange)
                  </ElMenuItem>
                  <ElMenuItem
                    index="/business/excel-feedback"
                    title="导入错误反馈 (AtengExcelFeedback)"
                  >
                    导入错误反馈 (AtengExcelFeedback)
                  </ElMenuItem>
                  <ElMenuItem index="/business/upload" title="大文件切片上传 (AtengUpload)">
                    大文件切片上传 (AtengUpload)
                  </ElMenuItem>
                  <ElMenuItem index="/business/stream-text" title="AI 流式打字机 (AtengStreamText)">
                    AI 流式打字机 (AtengStreamText)
                  </ElMenuItem>
                  <ElMenuItem index="/business/log-viewer" title="实时日志终端 (AtengLogViewer)">
                    实时日志终端 (AtengLogViewer)
                  </ElMenuItem>
                  <ElMenuItem index="/business/statistic" title="指标翻牌统计 (AtengStatistic)">
                    指标翻牌统计 (AtengStatistic)
                  </ElMenuItem>
                  <ElMenuItem index="/business/code-view" title="源码数据高亮 (AtengCodeView)">
                    源码数据高亮 (AtengCodeView)
                  </ElMenuItem>
                  <ElMenuItem
                    index="/business/icon-select"
                    title="通用图标选择器 (AtengIconSelect)"
                  >
                    通用图标选择器 (AtengIconSelect)
                  </ElMenuItem>
                  <ElMenuItem index="/business/captcha" title="验证码倒计时 (AtengCaptcha)">
                    验证码倒计时 (AtengCaptcha)
                  </ElMenuItem>
                  <ElMenuItem
                    index="/business/file-preview"
                    title="多格式文件预览 (AtengFilePreview)"
                  >
                    多格式文件预览 (AtengFilePreview)
                  </ElMenuItem>
                </ElSubMenu>

                <!-- 6. 现代多主题 -->
                <ElSubMenu index="theme">
                  <template #title>
                    <ElIcon class="sub-menu-icon"><span>🎨</span></ElIcon>
                    <span class="sub-menu-title">现代多主题 (Pro Theme)</span>
                  </template>
                  <ElMenuItem index="/theme-pro" title="🌟 旗舰全景大沙箱 (Panorama)">
                    🌟 旗舰全景大沙箱 (Panorama)
                  </ElMenuItem>
                  <ElMenuItem
                    index="/theme/buttons-inputs"
                    title="按钮与表单控件 (Buttons & Inputs)"
                  >
                    按钮与表单控件 (Buttons & Inputs)
                  </ElMenuItem>
                  <ElMenuItem index="/theme/tables" title="流体表格与防抖 (Tables & Anti-Jitter)">
                    流体表格与防抖 (Tables & Anti-Jitter)
                  </ElMenuItem>
                  <ElMenuItem
                    index="/theme/tags-overlays"
                    title="标签、开关与轻量浮层 (Tags & Overlays)"
                  >
                    标签、开关与轻量浮层 (Tags & Overlays)
                  </ElMenuItem>
                  <ElMenuItem index="/theme/tenant" title="动态租户换肤 API (Tenant Theme Engine)">
                    动态租户换肤 API (Tenant Theme Engine)
                  </ElMenuItem>
                  <ElMenuItem
                    index="/theme/cards-navigations"
                    title="卡片、导航与选择分页 (Cards & Navigations)"
                  >
                    卡片、导航与选择分页 (Cards & Navigations)
                  </ElMenuItem>
                </ElSubMenu>
              </ElMenu>
            </ElScrollbar>

            <!-- 底部一键折叠收起控制把手 -->
            <div
              class="collapse-footer"
              :title="isCollapse ? '展开侧边栏' : '收起侧边栏'"
              @click="toggleCollapse"
            >
              <svg
                v-if="!isCollapse"
                viewBox="0 0 24 24"
                width="15"
                height="15"
                stroke="currentColor"
                stroke-width="2"
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="collapse-svg"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
                <path d="M15 9l-3 3 3 3" />
              </svg>
              <svg
                v-else
                viewBox="0 0 24 24"
                width="15"
                height="15"
                stroke="currentColor"
                stroke-width="2"
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="collapse-svg"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
                <path d="M13 15l3-3-3-3" />
              </svg>
              <span v-if="!isCollapse" class="collapse-label">收起侧边栏</span>
            </div>
          </div>
        </ElAside>

        <!-- 主内容区 -->
        <ElMain class="layout-main">
          <router-view />
        </ElMain>
      </ElContainer>
    </ElContainer>
  </ElConfigProvider>
</template>

<style>
/* 全局基础重置 */
html,
body,
#app {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
  overflow: hidden; /* 彻底锁定外层 window，杜绝亚像素双重滚动条 */
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  background-color: var(--el-bg-color-page);
  color: var(--el-text-color-primary);
}
</style>

<style scoped>
.layout-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.layout-header {
  height: 56px;
  background-color: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-lighter);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}

.logo-area {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.version-tag {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 12px;
  background-color: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  font-weight: 500;
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ctrl-label {
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.layout-body {
  flex: 1;
  overflow: hidden !important;
}

.layout-aside {
  width: 270px;
  min-width: 270px;
  max-width: 270px;
  flex-shrink: 0;
  background-color: var(--el-bg-color);
  border-right: 1px solid var(--el-border-color-lighter);
  transition:
    width 0.28s cubic-bezier(0.2, 0, 0, 1),
    min-width 0.28s cubic-bezier(0.2, 0, 0, 1),
    max-width 0.28s cubic-bezier(0.2, 0, 0, 1);
  overflow: hidden !important; /* 彻底物理屏蔽原生滚动条 */
}

.layout-aside.is-collapsed {
  width: 64px;
  min-width: 64px;
  max-width: 64px;
}

.aside-inner {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.aside-scrollbar {
  flex: 1;
  height: 100%;
  overflow: hidden;
}

:deep(.aside-scrollbar-wrap) {
  overflow-x: hidden !important; /* 彻底杜绝横向滚动条 */
}

.layout-menu {
  width: 100% !important;
  border-right: none !important;
  background-color: transparent;
  user-select: none;
}

/* 关键抗抖动防线：永久建立 BFC 隔离，根除展开结束瞬间 6px 外边距塌陷跳动 */
:deep(.el-menu--inline) {
  overflow: hidden !important;
}

/* 文本单行防折行与平滑淡出锁定，杜绝动画过渡期间文字折行撑高容器 */
:deep(.el-sub-menu__title),
:deep(.el-menu-item) {
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

.sub-menu-icon {
  font-size: 15px;
  font-style: normal;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
  flex-shrink: 0;
}

.sub-menu-title {
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  display: inline-block;
  transition: opacity 0.2s cubic-bezier(0.2, 0, 0, 1);
}

.layout-aside.is-collapsed .sub-menu-title,
.layout-aside.is-collapsed .collapse-label {
  opacity: 0;
  pointer-events: none;
}

/* 底部收起触发条 */
.collapse-footer {
  height: 42px;
  border-top: 1px solid var(--el-border-color-lighter);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  color: var(--el-text-color-secondary);
  font-size: 12.5px;
  background-color: var(--el-bg-color);
  transition:
    background-color 0.15s,
    color 0.15s;
  flex-shrink: 0;
  user-select: none;
}

.collapse-footer:hover {
  background-color: var(--el-fill-color-light);
  color: var(--el-color-primary);
}

.collapse-svg {
  flex-shrink: 0;
}

.collapse-label {
  white-space: nowrap;
  font-weight: 500;
  transition: opacity 0.2s cubic-bezier(0.2, 0, 0, 1);
}

.layout-main {
  padding: 20px;
  overflow-y: auto;
  background-color: var(--el-bg-color-page);
}
</style>
