<script setup lang="ts">
/**
 * sample-barcode-vue 展厅顶层应用框架。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { ref, onMounted, watch } from 'vue';
import BarcodeBasicView from './views/BarcodeBasicView.vue';
import BarcodeTypographyView from './views/BarcodeTypographyView.vue';
import QRCodePresetsView from './views/QRCodePresetsView.vue';
import QRCodeLogoGuardView from './views/QRCodeLogoGuardView.vue';

const activeTab = ref('barcode-basic');
const isDark = ref(false);

onMounted(() => {
  const hash = window.location.hash.replace('#/', '').replace('#', '');
  if (hash === 'qrcode-logo-guard' || window.location.pathname.includes('/qrcode-logo-guard')) {
    activeTab.value = 'qrcode-logo-guard';
  } else if (hash === 'qrcode-presets' || window.location.pathname.includes('/qrcode-presets')) {
    activeTab.value = 'qrcode-presets';
  } else if (
    hash === 'barcode-typography' ||
    window.location.pathname.includes('/barcode-typography')
  ) {
    activeTab.value = 'barcode-typography';
  } else if (
    hash === 'barcode-basic' ||
    hash === '' ||
    window.location.pathname.includes('/barcode-basic')
  ) {
    activeTab.value = 'barcode-basic';
  }
});

watch(activeTab, tab => {
  window.location.hash = `#/${tab}`;
});

const toggleDark = () => {
  isDark.value = !isDark.value;
  if (isDark.value) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};
</script>

<template>
  <el-container class="sample-app">
    <el-header class="sample-header" height="60px">
      <div class="header-left">
        <span class="logo-icon">📊</span>
        <h1 class="header-title">@atengk/barcode-vue 条码二维码与视觉扫码自验展厅</h1>
        <el-tag size="small" type="success" effect="plain">L2 领域扩展层</el-tag>
        <el-tag size="small" type="info" effect="plain">Port: 3015</el-tag>
      </div>
      <div class="header-right">
        <el-button size="small" :type="isDark ? 'warning' : 'info'" plain @click="toggleDark">
          {{ isDark ? '☀️ 亮色模式' : '🌙 暗色模式' }}
        </el-button>
        <el-link
          href="https://github.com/atengk/ateng-ui/issues/322"
          target="_blank"
          type="primary"
          :underline="false"
        >
          查看规格书 #322
        </el-link>
      </div>
    </el-header>

    <el-main class="sample-main">
      <el-tabs v-model="activeTab" type="border-card" class="sample-tabs">
        <el-tab-pane label="📦 1. 一维条码与防崩溃容错" name="barcode-basic">
          <BarcodeBasicView />
        </el-tab-pane>
        <el-tab-pane label="✍️ 2. 工业排版与肉眼防错" name="barcode-typography">
          <BarcodeTypographyView />
        </el-tab-pane>
        <el-tab-pane label="🎨 3. 艺术二维码与企业主题" name="qrcode-presets">
          <QRCodePresetsView />
        </el-tab-pane>
        <el-tab-pane label="🛡️ 4. Logo 护栏与防污损" name="qrcode-logo-guard">
          <QRCodeLogoGuardView />
        </el-tab-pane>
      </el-tabs>
    </el-main>
  </el-container>
</template>

<style scoped>
.sample-app {
  min-height: 100vh;
  background-color: var(--el-bg-color-page);
}

.sample-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background-color: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-light);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  font-size: 24px;
}

.header-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.sample-main {
  padding: 20px 24px;
}

.sample-tabs {
  min-height: calc(100vh - 100px);
}
</style>
