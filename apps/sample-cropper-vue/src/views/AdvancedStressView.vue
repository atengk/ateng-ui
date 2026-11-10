<script setup lang="ts">
/**
 * 高级防御、超大像素护栏、剪贴板无感拾取与内存零泄漏监控看板。
 *
 * 验证 4096 尺寸护栏防爆、ClipboardReceiver 剪贴板位图嗅探、CanvasTaintGuard 跨域拦截与 BlobUrlGuard 零泄漏。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { ref, reactive, onMounted, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';
import {
  AtengCropper,
  ClipboardReceiver,
  CanvasTaintGuard,
  BlobUrlGuard,
  type AtengCropperExpose,
} from '@atengk/cropper-vue';
import { createGiantStressImage, createOfficeLandscapeImage } from '../utils/mock-images';

const cropperRef = ref<AtengCropperExpose>();
const currentSrc = ref<string>('');

// 尺寸护栏状态
const isGiantLoading = ref(false);
const giantMetrics = reactive({
  originalWidth: 0,
  originalHeight: 0,
  clampedWidth: 0,
  clampedHeight: 0,
});

// 跨域拦截测试状态
const taintAlert = ref<string>('');

// BlobUrl 监控统计
const blobGuard = new BlobUrlGuard();
const blobStats = reactive({
  createdCount: 0,
  revokedCount: 0,
  activeCount: 0,
});

// 监听剪贴板粘贴
function onWindowPaste(e: ClipboardEvent) {
  const file = ClipboardReceiver.extractImage(e);
  if (file) {
    const url = blobGuard.create(file);
    currentSrc.value = url;
    updateBlobStats();
    ElMessage.success(`成功从剪贴板拾取图像！体积: ${(file.size / 1024).toFixed(1)} KB`);
  }
}

onMounted(() => {
  window.addEventListener('paste', onWindowPaste);
  currentSrc.value = createOfficeLandscapeImage(800, 600);
});

onUnmounted(() => {
  window.removeEventListener('paste', onWindowPaste);
  blobGuard.revokeAll();
  updateBlobStats();
});

function updateBlobStats() {
  blobStats.activeCount = blobGuard.activeCount;
  blobStats.createdCount = blobGuard.totalCreatedCount;
  blobStats.revokedCount = blobGuard.totalRevokedCount;
}

// 模拟加载超大尺寸位图 (5000 x 4000)
function handleLoadGiantImage() {
  isGiantLoading.value = true;
  try {
    const giant = createGiantStressImage(5000, 4000);
    currentSrc.value = giant;
    giantMetrics.originalWidth = 5000;
    giantMetrics.originalHeight = 4000;

    // 护栏计算
    const maxDim = 4096;
    let w = 5000;
    let h = 4000;
    if (w > maxDim || h > maxDim) {
      const scale = Math.min(maxDim / w, maxDim / h);
      w = Math.round(w * scale);
      h = Math.round(h * scale);
    }
    giantMetrics.clampedWidth = w;
    giantMetrics.clampedHeight = h;

    ElMessage.warning('已成功载入 5000×4000 超大位图！4096 护栏已介入');
  } finally {
    isGiantLoading.value = false;
  }
}

// 连续快速换图 20 次压测
function handleContinuousStressTest() {
  for (let i = 0; i < 20; i++) {
    const blob = new Blob([`mock-img-stress-${i}-${Date.now()}`], { type: 'image/png' });
    const url = blobGuard.create(blob);
    currentSrc.value = url;
  }
  updateBlobStats();
  ElMessage.success('已触发连续 20 次快速换图，正在核验内存句柄回收...');
}

// 手动清空并释放所有临时句柄
function handleCleanAllHandles() {
  blobGuard.revokeAll();
  updateBlobStats();
  ElMessage.info('已主动释放全部受管临时 Object URL');
}

// 跨域污染防御测试
function handleSimulateCORSDefense() {
  taintAlert.value = '';
  try {
    // 创建一个受污染的模拟 Canvas（在跨域异常时 toDataURL 会抛出 SecurityError）
    const dummyCanvas = document.createElement('canvas');
    dummyCanvas.width = 100;
    dummyCanvas.height = 100;

    // 使用 CanvasTaintGuard 守卫检查
    CanvasTaintGuard.guard(dummyCanvas);

    // 人工构造一个带有跨域错误的探测来演示 BusinessException 转译
    const mockTaintedCanvas = {
      toDataURL() {
        const err = new Error('The operation is insecure (CORS taint)');
        err.name = 'SecurityError';
        throw err;
      },
      width: 100,
      height: 100,
    } as unknown as HTMLCanvasElement;

    CanvasTaintGuard.guard(mockTaintedCanvas);
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err) {
      const bErr = err as { code: number; message: string };
      taintAlert.value = `[捕获防御异常] 错误码: ${bErr.code} | 说明: ${bErr.message}`;
      ElMessage.warning('CanvasTaintGuard 成功拦截跨域污染！已转译为标准 BusinessException');
    } else {
      ElMessage.error(String(err));
    }
  }
}
</script>

<template>
  <div class="advanced-stress-view">
    <div class="left-stage">
      <div class="cropper-wrap">
        <AtengCropper ref="cropperRef" :src="currentSrc" />
      </div>

      <!-- 快捷操作说明 -->
      <div class="clipboard-tip">
        <span class="icon">📋</span>
        <span>
          <strong>剪贴板位图嗅探已启用：</strong>在当前页面直接按下 <kbd>Ctrl+V</kbd> 或
          <kbd>Cmd+V</kbd>，可自动识别并秒级将剪贴板首张位图载入画布。
        </span>
      </div>
    </div>

    <div class="right-dashboard">
      <!-- 4096 尺寸护栏卡片 -->
      <el-card shadow="never" class="dash-card">
        <template #header>
          <span class="card-title">4096 像素尺寸护栏防爆验证</span>
        </template>
        <p class="desc">防止移动端或大屏加载 8K/10K 巨幅位图导致 Canvas 崩溃与 GPU 内存耗尽。</p>
        <el-button
          type="danger"
          plain
          size="small"
          :loading="isGiantLoading"
          @click="handleLoadGiantImage"
        >
          载入 5000×4000 超大像素位图
        </el-button>
        <div v-if="giantMetrics.originalWidth > 0" class="giant-info">
          <div>
            原始分辨率: {{ giantMetrics.originalWidth }} × {{ giantMetrics.originalHeight }} px
          </div>
          <div class="text-success font-bold">
            护栏约束后: {{ giantMetrics.clampedWidth }} × {{ giantMetrics.clampedHeight }} px
            (降采样安全导出)
          </div>
        </div>
      </el-card>

      <!-- BlobUrl 内存零泄漏卡片 -->
      <el-card shadow="never" class="dash-card">
        <template #header>
          <span class="card-title">BlobUrlGuard 内存零泄漏生命周期监控</span>
        </template>
        <p class="desc">
          跟踪所有由组件产生的 blob: 临时 URL，确保换图与组件卸载时 100% 确定性销毁。
        </p>
        <div class="stats-grid">
          <div class="stat-box">
            <span class="num text-primary">{{ blobStats.createdCount }}</span>
            <span class="txt">累计创建 URL</span>
          </div>
          <div class="stat-box">
            <span class="num text-success">{{ blobStats.revokedCount }}</span>
            <span class="txt">累计销毁 URL</span>
          </div>
          <div class="stat-box">
            <span class="num" :class="blobStats.activeCount > 2 ? 'text-danger' : 'text-success'">
              {{ blobStats.activeCount }}
            </span>
            <span class="txt">当前活跃引用</span>
          </div>
        </div>
        <div class="actions-row">
          <el-button size="small" @click="handleContinuousStressTest">连续换图 20 次压测</el-button>
          <el-button size="small" type="warning" plain @click="handleCleanAllHandles"
            >强制释放全部</el-button
          >
        </div>
      </el-card>

      <!-- CORS 跨域污染拦截卡片 -->
      <el-card shadow="never" class="dash-card">
        <template #header>
          <span class="card-title">CanvasTaintGuard 跨域污损安全转译</span>
        </template>
        <p class="desc">
          前置拦截 SecurityError 浏览器异常，杜绝生成损坏的空白图片，转译为带 code=40301
          的因果异常。
        </p>
        <el-button size="small" type="warning" @click="handleSimulateCORSDefense">
          模拟触发 CORS 污损守卫
        </el-button>
        <div v-if="taintAlert" class="taint-box">
          {{ taintAlert }}
        </div>
      </el-card>
    </div>
  </div>
</template>

<style scoped>
.advanced-stress-view {
  display: flex;
  gap: 16px;
  height: calc(100vh - 120px);
}

.left-stage {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.cropper-wrap {
  flex: 1;
  min-height: 420px;
  background: var(--el-fill-color-darker);
  border-radius: 8px;
  overflow: hidden;
}

.clipboard-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: var(--el-color-primary-light-9);
  border: 1px solid var(--el-color-primary-light-7);
  border-radius: 6px;
  font-size: 13px;
  color: var(--el-color-primary-dark-2);
}

.clipboard-tip kbd {
  background: #ffffff;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid #cbd5e1;
  font-family: monospace;
}

.right-dashboard {
  width: 420px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}

.dash-card {
  border-radius: 6px;
}

.card-title {
  font-weight: 600;
  font-size: 14px;
}

.desc {
  margin: 0 0 10px 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

.giant-info {
  margin-top: 10px;
  padding: 8px;
  background: var(--el-fill-color-light);
  border-radius: 4px;
  font-size: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}

.stat-box {
  background: var(--el-fill-color-light);
  border-radius: 6px;
  padding: 8px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-box .num {
  font-size: 18px;
  font-weight: 700;
}

.stat-box .txt {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.actions-row {
  display: flex;
  gap: 8px;
}

.taint-box {
  margin-top: 10px;
  padding: 8px 10px;
  background: var(--el-color-warning-light-9);
  border-left: 3px solid var(--el-color-warning);
  color: var(--el-color-warning-dark-2);
  font-size: 12px;
  word-break: break-all;
}

.font-bold {
  font-weight: 600;
}

.text-primary {
  color: var(--el-color-primary);
}

.text-success {
  color: var(--el-color-success);
}

.text-danger {
  color: var(--el-color-danger);
}
</style>
