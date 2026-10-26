<script setup lang="ts">
/**
 * sample-video-player-vue 展厅主容器。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import { ref } from 'vue';
import VodDemo from './components/VodDemo.vue';
import DeepVodDemo from './components/DeepVodDemo.vue';
import AuthSecurityDemo from './components/AuthSecurityDemo.vue';
import LiveDemo from './components/LiveDemo.vue';
import WatermarkDemo from './components/WatermarkDemo.vue';
import GridDemo from './components/GridDemo.vue';
import PtzDemo from './components/PtzDemo.vue';

const activeTab = ref<
  'vod' | 'deep-vod' | 'security' | 'live' | 'grid' | 'ptz' | 'watermark' | 'danmaku'
>('vod');

const tabs = [
  { id: 'vod', name: '标准富媒体点播 (VOD)' },
  { id: 'deep-vod', name: '点播深水区 (Seek/热键/打点/续播)' },
  { id: 'security', name: '企业鉴权与防线 (ADR-0004)' },
  { id: 'live', name: '流媒体低延迟直播 (HLS/FLV)' },
  { id: 'grid', name: '多路分屏监控矩阵 (1~16屏)' },
  { id: 'ptz', name: '安防云台控制 (PTZ)' },
  { id: 'watermark', name: '防录屏安全水印 (DLP)' },
  { id: 'danmaku', name: '弹幕系统与多字幕' },
] as const;
</script>

<template>
  <div class="sample-app">
    <!-- 展厅头部导航 -->
    <header class="sample-header">
      <div class="sample-header__left">
        <span class="sample-logo">🎬</span>
        <div>
          <h1 class="sample-title">@atengk/video-player-vue</h1>
          <p class="sample-desc">面向现代 Web 应用与企业级安防物联网的工业级流媒体播放基础设施</p>
        </div>
      </div>
      <div class="sample-header__tags">
        <span class="badge badge--primary">L2 专用能力扩展</span>
        <span class="badge badge--success">Vue 3.5+</span>
        <span class="badge badge--warning">零 Element Plus 依赖</span>
        <span class="badge badge--info">MIT 商业友好</span>
      </div>
    </header>

    <!-- 导航 Tab -->
    <nav class="sample-tabs">
      <button
        v-for="t in tabs"
        :key="t.id"
        class="tab-btn"
        :class="{ 'tab-btn--active': activeTab === t.id }"
        @click="activeTab = t.id"
      >
        {{ t.name }}
      </button>
    </nav>

    <!-- 主体验展区 -->
    <main class="sample-content">
      <div v-if="activeTab === 'vod'">
        <VodDemo />
      </div>

      <div v-else-if="activeTab === 'deep-vod'">
        <DeepVodDemo />
      </div>

      <div v-else-if="activeTab === 'security'">
        <AuthSecurityDemo />
      </div>

      <div v-else-if="activeTab === 'live'">
        <LiveDemo />
      </div>

      <div v-else-if="activeTab === 'watermark'">
        <WatermarkDemo />
      </div>

      <div v-else-if="activeTab === 'grid'">
        <GridDemo />
      </div>

      <div v-else-if="activeTab === 'ptz'">
        <PtzDemo />
      </div>

      <div v-else class="sample-placeholder">
        <div class="placeholder-card">
          <span class="placeholder-icon">🚧</span>
          <h3>该特性模块正在由后续工单持续交付中</h3>
          <p>
            当前处于工单 #141（脚手架自举与基础点播容器），请切换至【标准富媒体点播】进行体验验证。
          </p>
        </div>
      </div>
    </main>
  </div>
</template>

<style>
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  background-color: #f1f5f9;
  color: #1e293b;
}

.sample-app {
  max-width: 1440px;
  margin: 0 auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.sample-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  background-color: #ffffff;
  padding: 20px 24px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.sample-header__left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.sample-logo {
  font-size: 36px;
}

.sample-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
}

.sample-desc {
  margin: 4px 0 0;
  font-size: 13px;
  color: #64748b;
}

.sample-header__tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.badge {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 500;
}

.badge--primary {
  background-color: #e0f2fe;
  color: #0369a1;
}

.badge--success {
  background-color: #dcfce7;
  color: #15803d;
}

.badge--warning {
  background-color: #fef3c7;
  color: #b45309;
}

.badge--info {
  background-color: #f3e8ff;
  color: #7e22ce;
}

.sample-tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.tab-btn {
  padding: 8px 16px;
  border: 1px solid #cbd5e1;
  background-color: #ffffff;
  border-radius: 6px;
  color: #475569;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.tab-btn:hover {
  border-color: #1890ff;
  color: #1890ff;
}

.tab-btn--active {
  background-color: #1890ff;
  border-color: #1890ff;
  color: #ffffff;
}

.tab-btn--active:hover {
  background-color: #40a9ff;
  color: #ffffff;
}

.sample-content {
  background-color: #ffffff;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.sample-placeholder {
  padding: 60px 20px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.placeholder-card {
  text-align: center;
  max-width: 420px;
}

.placeholder-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 12px;
}

.placeholder-card h3 {
  margin: 0 0 8px;
  font-size: 16px;
  color: #1e293b;
}

.placeholder-card p {
  margin: 0;
  font-size: 13px;
  color: #64748b;
  line-height: 1.6;
}
</style>
