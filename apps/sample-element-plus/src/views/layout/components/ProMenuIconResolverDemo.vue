<script setup lang="ts">
/**
 * AtengProLayout 字符串图标自定义解析 (iconResolver) 与 #menuIcon 插槽演示组件。
 *
 * @author Ateng
 * @since 2026-11-19
 */

import { ref, type Component } from 'vue';
import { AtengProLayout, type ProMenuItem, type ProMenuIconResolver } from '@atengk/element-plus';
import { ElCard, ElButton, ElRadioGroup, ElRadioButton, ElSwitch, ElTag } from 'element-plus';
import { IconDashboard, IconSetting, IconAnalytics, IconInfo } from './LayoutIcons';

const iconMap: Record<string, Component> = {
  Dashboard: IconDashboard,
  Setting: IconSetting,
  Analytics: IconAnalytics,
  Info: IconInfo,
};

const menuData: ProMenuItem[] = [
  { path: '/workbench', title: '工作台首页', icon: 'Dashboard' },
  {
    path: '/system',
    title: '系统管理',
    icon: 'Setting',
    badge: 3,
    children: [
      { path: '/system/overview', title: '系统指标', icon: 'Analytics' },
      { path: '/system/about', title: '版本信息', icon: 'Info' },
      { path: '/system/plain', title: '无图标子项' },
    ],
  },
];

const layoutMode = ref<'side' | 'top' | 'mix'>('side');
const collapsed = ref(false);
const useSlotMode = ref(false);
const activePath = ref('/system/overview');

const iconResolver: ProMenuIconResolver = icon => {
  if (typeof icon === 'string') {
    return iconMap[icon];
  }
  return icon;
};
</script>

<template>
  <ElCard class="sample-card" header="5. 字符串图标动态解析 (iconResolver) 与 #menuIcon 插槽">
    <p class="section-desc">
      直接传入后端菜单 JSON 中的 <code>"Dashboard"</code>、<code>"Setting"</code> 等字符串图标，
      无需递归预处理整棵 <code>menuData</code>：通过
      <code>:icon-resolver</code> 映射为矢量组件，或使用
      <code>#menuIcon</code> 插槽接管图标渲染，同时保留内置徽标、缩进与折叠居中对齐。
    </p>

    <div class="card-controls">
      <ElRadioGroup v-model="layoutMode" size="small">
        <ElRadioButton value="side">Side</ElRadioButton>
        <ElRadioButton value="top">Top</ElRadioButton>
        <ElRadioButton value="mix">Mix</ElRadioButton>
      </ElRadioGroup>

      <ElButton
        v-if="layoutMode !== 'top'"
        size="small"
        type="primary"
        plain
        @click="collapsed = !collapsed"
      >
        <span class="at-btn__label-stable" data-sizer="折叠侧栏 (验证居中与首字回退)">
          {{ collapsed ? '展开侧栏' : '折叠侧栏 (验证居中与首字回退)' }}
        </span>
      </ElButton>

      <ElSwitch
        v-model="useSlotMode"
        active-text="启用 #menuIcon 插槽渲染"
        inactive-text="启用 iconResolver 回调"
      />
    </div>

    <div class="demo-viewport" style="height: 320px">
      <AtengProLayout
        v-model:collapsed="collapsed"
        v-model:active-menu="activePath"
        :layout="layoutMode"
        :menu-data="menuData"
        :default-openeds="['/system']"
        :icon-resolver="useSlotMode ? undefined : iconResolver"
        title="Icon Resolver"
        style="min-height: 320px; height: 320px"
      >
        <template v-if="useSlotMode" #menuIcon="{ icon }">
          <component :is="iconMap[icon]" v-if="typeof icon === 'string' && iconMap[icon]" />
          <span v-else class="slot-icon-badge">{{ String(icon).slice(0, 1) }}</span>
        </template>

        <div class="sandbox-content">
          <div class="resolver-meta">
            <span>当前激活菜单：</span>
            <ElTag type="primary" size="small">{{ activePath }}</ElTag>
            <ElTag type="info" size="small">
              {{ useSlotMode ? '#menuIcon 作用域插槽模式' : 'iconResolver 映射模式' }}
            </ElTag>
          </div>
          <p class="resolver-tip">
            “无图标子项”未配置图标，在折叠状态下仍会自动回退首字徽标；已解析组件图标与内置徽标保持原有样式对齐。
          </p>
        </div>
      </AtengProLayout>
    </div>
  </ElCard>
</template>

<style scoped>
.sample-card {
  margin-bottom: 24px;
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

.card-controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 16px;
}

.demo-viewport {
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: var(--el-box-shadow-light);
}

.sandbox-content {
  background-color: var(--el-bg-color);
  border-radius: 6px;
  padding: 20px;
}

.resolver-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.resolver-tip {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.slot-icon-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  font-size: 12px;
  border-radius: 4px;
  background-color: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}
</style>
