<script setup lang="ts">
/**
 * sample-cropper-vue 展厅顶层应用框架。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { ref } from 'vue';

const title = ref('sample-cropper-vue 图片裁剪自验展厅');
</script>

<template>
  <div class="sample-container">
    <header class="sample-header">
      <h1 class="sample-title">{{ title }}</h1>
      <p class="sample-desc">基于 cropperjs 1.6.x 封装的工业级图片裁剪与图像处理扩展模块</p>
    </header>
    <main class="sample-main">
      <el-card shadow="hover">
        <template #header>
          <span>工程基线搭建完成</span>
        </template>
        <p>子包脚手架、双模构建与洋葱依赖拓扑已就绪，当前正在推进组件实现阶段。</p>
      </el-card>
    </main>
  </div>
</template>

<style scoped>
.sample-container {
  min-height: 100vh;
  padding: 24px;
  background-color: var(--el-bg-color-page);
  color: var(--el-text-color-primary);
}

.sample-header {
  margin-bottom: 24px;
}

.sample-title {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.sample-desc {
  margin: 0;
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.sample-main {
  max-width: 1200px;
}
</style>
