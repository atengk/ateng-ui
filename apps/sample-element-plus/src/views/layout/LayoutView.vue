<script setup lang="ts">
/**
 * AtengLayout 基础无状态布局架构套件特性展厅。
 *
 * @author Ateng
 * @since 2026-10-25
 */

import { ref } from 'vue';
import {
  AtengLayout,
  AtengHeader,
  AtengAside,
  AtengContent,
  AtengFooter,
} from '@atengk/element-plus';
import { ElCard, ElButton, ElRadioGroup, ElRadioButton } from 'element-plus';

const collapsed1 = ref(false);
const collapsed2 = ref(false);
const direction = ref<'auto' | 'horizontal' | 'vertical'>('auto');
</script>

<template>
  <div class="layout-sample-page">
    <div class="page-title-area">
      <h2>AtengLayout 纯无状态基础布局架构套件</h2>
      <p class="desc">
        纯 CSS/Flex 驱动，零业务/零路由绑定的语义化布局基础设施。运行时自动扫描子节点识别 AtengAside
        并无缝切换横向排版，支持受控折叠与自定义触发条。
      </p>
    </div>

    <!-- 演示 1: 经典 Header-Content-Footer 纵向排版 -->
    <ElCard class="sample-card" header="1. 经典 Header-Content-Footer 纵向布局">
      <div class="demo-box">
        <AtengLayout class="demo-layout">
          <AtengHeader height="48px" class="demo-header">Header (高度 48px)</AtengHeader>
          <AtengContent class="demo-content">Content (主体内容弹性撑满)</AtengContent>
          <AtengFooter height="36px" class="demo-footer">Footer (底栏 36px)</AtengFooter>
        </AtengLayout>
      </div>
    </ElCard>

    <!-- 演示 2: Header + (Aside + Content) 自动识别 Aside 横向排版 -->
    <ElCard class="sample-card" header="2. Header + (Aside + Content) 自动识别 Aside 横向排版">
      <div class="card-controls">
        <ElButton size="small" type="primary" @click="collapsed1 = !collapsed1">
          {{ collapsed1 ? '展开侧边栏' : '折叠侧边栏' }}
        </ElButton>
        <span class="status-tip"
          >当前状态: {{ collapsed1 ? '已折叠 (48px)' : '已展开 (200px)' }}</span
        >
      </div>
      <div class="demo-box">
        <AtengLayout class="demo-layout" style="height: 320px">
          <AtengHeader height="48px" class="demo-header">Top Header (固定顶栏)</AtengHeader>
          <AtengLayout>
            <AtengAside
              v-model:collapsed="collapsed1"
              collapsible
              width="200px"
              collapsed-width="48px"
              class="demo-aside"
            >
              <div class="aside-menu-mock">
                <div class="menu-item">📁 项目目录</div>
                <div class="menu-item">⚙️ 系统设置</div>
                <div class="menu-item">👥 权限成员</div>
              </div>
            </AtengAside>
            <AtengContent class="demo-content">
              <div class="content-mock">
                <h4>主内容区 (AtengContent)</h4>
                <p>
                  父级 AtengLayout 自动识别子级包含 AtengAside，无需手动配置 direction 即可自动转为
                  row 横向排版。
                </p>
              </div>
            </AtengContent>
          </AtengLayout>
          <AtengFooter height="36px" class="demo-footer">Footer 版权信息</AtengFooter>
        </AtengLayout>
      </div>
    </ElCard>

    <!-- 演示 3: Aside 自定义 #trigger 插槽与自定义宽度 -->
    <ElCard class="sample-card" header="3. 自定义 #trigger 折叠插槽与方向强制覆盖">
      <div class="card-controls">
        <span class="ctrl-label">方向强制覆盖 (direction):</span>
        <ElRadioGroup v-model="direction" size="small">
          <ElRadioButton value="auto">自动探测 (默认)</ElRadioButton>
          <ElRadioButton value="vertical">强制纵向 (vertical)</ElRadioButton>
          <ElRadioButton value="horizontal">强制横向 (horizontal)</ElRadioButton>
        </ElRadioGroup>
      </div>
      <div class="demo-box">
        <AtengLayout
          class="demo-layout"
          style="height: 280px"
          :direction="direction === 'auto' ? undefined : direction"
        >
          <AtengAside
            v-model:collapsed="collapsed2"
            collapsible
            width="220px"
            collapsed-width="56px"
            class="demo-aside"
          >
            <div class="aside-menu-mock">
              <div class="menu-item">📊 数据总览</div>
              <div class="menu-item">🔔 消息通知</div>
            </div>
            <template #trigger="{ collapsed, toggle }">
              <div class="custom-trigger" @click="toggle">
                <span>{{ collapsed ? '👉 展开' : '👈 收起侧栏' }}</span>
              </div>
            </template>
          </AtengAside>
          <AtengContent class="demo-content">
            <div class="content-mock">
              <h4>自定义触发条区域</h4>
              <p>支持通过 #trigger 插槽灵活定制属于你的折叠按钮风格。</p>
            </div>
          </AtengContent>
        </AtengLayout>
      </div>
    </ElCard>
  </div>
</template>

<style scoped>
.layout-sample-page {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-title-area {
  margin-bottom: 24px;
}

.page-title-area h2 {
  font-size: 22px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0 0 8px 0;
}

.page-title-area .desc {
  color: var(--el-text-color-secondary);
  font-size: 14px;
  margin: 0;
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
  flex-wrap: wrap;
}

.status-tip {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.ctrl-label {
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.demo-box {
  border: 1px solid var(--el-border-color);
  border-radius: var(--el-border-radius-base);
  overflow: hidden;
}

.demo-layout {
  min-height: 180px;
}

.demo-header {
  display: flex;
  align-items: center;
  padding: 0 20px;
  background-color: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  font-weight: 500;
}

.demo-content {
  padding: 20px;
  background-color: var(--el-bg-color);
}

.demo-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--el-fill-color-light);
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.demo-aside {
  background-color: var(--el-fill-color-lighter);
}

.aside-menu-mock {
  padding: 12px;
}

.menu-item {
  padding: 8px 12px;
  margin-bottom: 4px;
  font-size: 13px;
  border-radius: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--el-text-color-regular);
  background-color: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
}

.content-mock h4 {
  margin: 0 0 8px 0;
  color: var(--el-text-color-primary);
}

.content-mock p {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 13px;
  line-height: 1.5;
}

.custom-trigger {
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--el-color-primary-light-8);
  color: var(--el-color-primary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}

.custom-trigger:hover {
  background-color: var(--el-color-primary-light-7);
}
</style>
