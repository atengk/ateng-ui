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
} from 'element-plus';
import { VERSION } from '@atengk/element-plus';

const route = useRoute();

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
  <ElConfigProvider :size="globalSize">
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
        <!-- 左侧导航侧边栏 -->
        <ElAside width="260px" class="layout-aside">
          <ElMenu router :default-active="route.path" class="layout-menu">
            <ElSubMenu index="directives">
              <template #title>
                <span>⚡ 指令套件 (Directives)</span>
              </template>
              <ElMenuItem index="/directives/permission"> 权限控制 (v-permission) </ElMenuItem>
              <ElMenuItem index="/directives/role"> 角色控制 (v-role) </ElMenuItem>
              <ElMenuItem index="/directives/idempotent"> 幂等防重 (v-idempotent) </ElMenuItem>
              <ElMenuItem index="/directives/copy"> 剪贴板复制 (v-copy) </ElMenuItem>
              <ElMenuItem index="/directives/watermark"> 动态防篡改水印 (v-watermark) </ElMenuItem>
            </ElSubMenu>

            <ElSubMenu index="layout">
              <template #title>
                <span>🏛️ 页面骨架与容器 (Layout & Containers)</span>
              </template>
              <ElMenuItem index="/layout/page-container">
                页面主体容器 (AtengPageContainer)
              </ElMenuItem>
              <ElMenuItem index="/layout/split-layout">
                弹性分栏容器 (AtengSplitLayout)
              </ElMenuItem>
              <ElMenuItem index="/layout/footer-bar"> 吸底操作栏 (AtengFooterBar) </ElMenuItem>
              <ElMenuItem index="/layout/card"> 结构化卡片 (AtengCard) </ElMenuItem>
              <ElMenuItem index="/layout/skeleton"> 页面骨架屏 (AtengPageSkeleton) </ElMenuItem>
            </ElSubMenu>

            <ElSubMenu index="containers">
              <template #title>
                <span>📦 交互容器 (Containers)</span>
              </template>
              <ElMenuItem index="/containers/dialog"> 弹窗容器 (AtengDialog) </ElMenuItem>
              <ElMenuItem index="/containers/drawer"> 抽屉容器 (AtengDrawer) </ElMenuItem>
              <ElMenuItem index="/containers/empty"> 缺省占位 (AtengEmpty) </ElMenuItem>
            </ElSubMenu>

            <ElSubMenu index="table">
              <template #title>
                <span>📊 表格与检索 (Table & Query)</span>
              </template>
              <ElMenuItem index="/table/query-form"> 搜索表单 (AtengQueryForm) </ElMenuItem>
              <ElMenuItem index="/table/crud"> 综合表格沙箱 (AtengTable CRUD) </ElMenuItem>
            </ElSubMenu>

            <ElSubMenu index="business">
              <template #title>
                <span>🧩 业务控件套件 (Business Suite)</span>
              </template>
              <ElMenuItem index="/business/dict"> 字典管理套件 (AtengDict*) </ElMenuItem>
              <ElMenuItem index="/business/descriptions">
                结构化详情 (AtengDescriptions)
              </ElMenuItem>
              <ElMenuItem index="/business/date-range"> 时间范围选择 (AtengDateRange) </ElMenuItem>
              <ElMenuItem index="/business/excel-feedback">
                导入错误反馈 (AtengExcelFeedback)
              </ElMenuItem>
              <ElMenuItem index="/business/upload"> 大文件切片上传 (AtengUpload) </ElMenuItem>
              <ElMenuItem index="/business/stream-text">
                AI 流式打字机 (AtengStreamText)
              </ElMenuItem>
              <ElMenuItem index="/business/log-viewer"> 实时日志终端 (AtengLogViewer) </ElMenuItem>
              <ElMenuItem index="/business/statistic"> 指标翻牌统计 (AtengStatistic) </ElMenuItem>
              <ElMenuItem index="/business/code-view"> 源码数据高亮 (AtengCodeView) </ElMenuItem>
              <ElMenuItem index="/business/icon-select">
                通用图标选择器 (AtengIconSelect)
              </ElMenuItem>
              <ElMenuItem index="/business/captcha"> 验证码倒计时 (AtengCaptcha) </ElMenuItem>
              <ElMenuItem index="/business/file-preview">
                多格式文件预览 (AtengFilePreview)
              </ElMenuItem>
            </ElSubMenu>

            <ElSubMenu index="theme">
              <template #title>
                <span>🎨 现代多主题 (Pro Theme)</span>
              </template>
              <ElMenuItem index="/theme-pro"> 🌟 旗舰全景大沙箱 (Panorama) </ElMenuItem>
              <ElMenuItem index="/theme/buttons-inputs">
                按钮与表单控件 (Buttons & Inputs)
              </ElMenuItem>
              <ElMenuItem index="/theme/tables"> 流体表格与防抖 (Tables & Anti-Jitter) </ElMenuItem>
              <ElMenuItem index="/theme/tags-overlays">
                标签、开关与毛玻璃浮层 (Tags & Overlays)
              </ElMenuItem>
              <ElMenuItem index="/theme/tenant">
                动态租户换肤 API (Tenant Theme Engine)
              </ElMenuItem>
              <ElMenuItem index="/theme/cards-navigations">
                卡片、导航与选择分页 (Cards & Navigations)
              </ElMenuItem>
            </ElSubMenu>
          </ElMenu>
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
  overflow: hidden;
}

.layout-aside {
  background-color: var(--el-bg-color);
  border-right: 1px solid var(--el-border-color-lighter);
}

.layout-menu {
  border-right: none;
  height: 100%;
}

.layout-main {
  padding: 20px;
  overflow-y: auto;
  background-color: var(--el-bg-color-page);
}
</style>
