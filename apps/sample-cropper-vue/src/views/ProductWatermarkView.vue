<script setup lang="ts">
/**
 * 电商商品主图、防伪水印与智能体积压缩看板。
 *
 * 验证商品主图预设比例、applyWatermark 文字平铺合成、compressCanvas 质量二分与降采样。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { ref, reactive, onMounted, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';
import {
  AtengCropper,
  applyWatermark,
  compressCanvas,
  type AtengCropperExpose,
  type CropperWatermarkOptions,
  type CropperExportOptions,
} from '@atengk/cropper-vue';
import { createProductSampleImage, createOfficeLandscapeImage } from '../utils/mock-images';

const cropperRef = ref<AtengCropperExpose>();
const currentSrc = ref<string>('');
let localBlobUrl: string | null = null;

// 预设比例
const activeRatio = ref<number>(1);
const ratioOptions = [
  { label: '商品主图 (1:1)', value: 1 },
  { label: '详情竖图 (3:4)', value: 3 / 4 },
  { label: '店铺横幅 (16:9)', value: 16 / 9 },
];

// 水印配置
const enableWatermark = ref(true);
const watermarkForm = reactive<CropperWatermarkOptions>({
  text: '仅供平台实名认证使用，复印无效',
  color: 'rgba(220, 38, 38, 0.28)',
  fontSize: 18,
  rotate: -25,
  gapX: 80,
  gapY: 80,
});

// 压缩配置
const enableCompression = ref(true);
const compressConfig = reactive<CropperExportOptions>({
  maxByteSize: 300 * 1024, // 300KB
  quality: 0.9,
  maxWidth: 2048,
  maxHeight: 2048,
});

// 处理统计与结果
const isProcessing = ref(false);
const processedDataUrl = ref<string>('');
const stats = reactive({
  originalSize: 0,
  finalSize: 0,
  dimensions: '',
  watermarkTimeMs: 0,
  compressTimeMs: 0,
});

onMounted(() => {
  currentSrc.value = createProductSampleImage(900, 900);
});

onUnmounted(() => {
  if (localBlobUrl) {
    URL.revokeObjectURL(localBlobUrl);
    localBlobUrl = null;
  }
});

function handlePresetImage(type: 'product' | 'office') {
  if (localBlobUrl) {
    URL.revokeObjectURL(localBlobUrl);
    localBlobUrl = null;
  }
  currentSrc.value =
    type === 'product' ? createProductSampleImage(900, 900) : createOfficeLandscapeImage(1200, 800);
}

function handleFileUpload(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;
  const file = input.files[0];

  if (localBlobUrl) {
    URL.revokeObjectURL(localBlobUrl);
  }
  localBlobUrl = URL.createObjectURL(file);
  currentSrc.value = localBlobUrl;

  input.value = '';
  ElMessage.success(`商品图片「${file.name}」已载入画布`);
}

function handleRatioSelect(ratio: number) {
  activeRatio.value = ratio;
  cropperRef.value?.setAspectRatio(ratio);
}

// 执行复合导出流程：Canvas -> 水印合成 -> 智能压缩
async function handleProcessAndExport() {
  if (!cropperRef.value) return;
  isProcessing.value = true;
  try {
    // 1. 获取裁剪 Canvas
    const canvas = cropperRef.value.getCroppedCanvas();
    if (!canvas) {
      throw new Error('获取裁剪画布失败');
    }

    // 记录原始未压缩体积估算（按 0.92 JPEG 导出测试）
    const origDataUrl = canvas.toDataURL('image/jpeg', 0.92);
    stats.originalSize = Math.round(origDataUrl.length * 0.75);

    // 2. 水印合成
    const t0 = performance.now();
    let targetCanvas = canvas;
    if (enableWatermark.value) {
      targetCanvas = applyWatermark(canvas, { ...watermarkForm });
    }
    stats.watermarkTimeMs = Math.round(performance.now() - t0);

    // 3. 智能压缩与降采样
    const t1 = performance.now();
    let finalBlob: Blob;
    if (enableCompression.value) {
      finalBlob = await compressCanvas(targetCanvas, {
        format: 'image/jpeg',
        ...compressConfig,
      });
    } else {
      finalBlob = await new Promise<Blob>((resolve, reject) => {
        targetCanvas.toBlob(
          b => (b ? resolve(b) : reject(new Error('Canvas 转 Blob 失败'))),
          'image/jpeg',
          0.92,
        );
      });
    }
    stats.compressTimeMs = Math.round(performance.now() - t1);

    stats.finalSize = finalBlob.size;
    stats.dimensions = `${targetCanvas.width} × ${targetCanvas.height} px`;
    processedDataUrl.value = URL.createObjectURL(finalBlob);

    ElMessage.success('商品图防伪水印与智能体积压缩完成！');
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : '处理过程发生异常');
  } finally {
    isProcessing.value = false;
  }
}
</script>

<template>
  <div class="product-watermark-view">
    <div class="left-canvas-col">
      <div class="cropper-container">
        <AtengCropper ref="cropperRef" :src="currentSrc" :aspect-ratio="activeRatio" />
      </div>

      <!-- 处理结果对比卡片 -->
      <div v-if="processedDataUrl" class="result-card">
        <div class="result-header">
          <span class="badge">处理产物</span>
          <span class="meta-tip">尺寸: {{ stats.dimensions }}</span>
        </div>
        <div class="result-body">
          <div class="result-img-wrapper">
            <img :src="processedDataUrl" alt="处理后位图" class="result-img" />
          </div>
          <div class="stats-table">
            <div class="stat-row">
              <span class="s-label">裁剪原图体积:</span>
              <span>{{ (stats.originalSize / 1024).toFixed(1) }} KB</span>
            </div>
            <div class="stat-row">
              <span class="s-label">最终产物体积:</span>
              <span class="text-success font-bold"
                >{{ (stats.finalSize / 1024).toFixed(1) }} KB</span
              >
            </div>
            <div class="stat-row">
              <span class="s-label">压缩率:</span>
              <span class="text-primary font-bold">
                {{
                  (((stats.originalSize - stats.finalSize) / stats.originalSize) * 100).toFixed(1)
                }}%
              </span>
            </div>
            <div class="stat-row">
              <span class="s-label">水印合成耗时:</span>
              <span>{{ stats.watermarkTimeMs }} ms</span>
            </div>
            <div class="stat-row">
              <span class="s-label">智能压缩耗时:</span>
              <span>{{ stats.compressTimeMs }} ms</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧配置控制台 -->
    <div class="right-config-col">
      <!-- 商品图片输入源 -->
      <el-card shadow="never" class="config-card">
        <template #header>
          <span class="title">商品图片输入源</span>
        </template>
        <div class="source-action-row">
          <el-button size="small" @click="handlePresetImage('product')">电商商品图</el-button>
          <el-button size="small" @click="handlePresetImage('office')">横幅场景图</el-button>
          <label class="custom-upload-btn el-button el-button--small el-button--primary is-plain">
            本地上传
            <input type="file" accept="image/*" class="hide-input" @change="handleFileUpload" />
          </label>
        </div>
      </el-card>

      <!-- 预设电商比例 -->
      <el-card shadow="never" class="config-card">
        <template #header>
          <span class="title">电商标准场景预设</span>
        </template>
        <el-radio-group v-model="activeRatio" size="small" @change="handleRatioSelect">
          <el-radio-button v-for="opt in ratioOptions" :key="opt.label" :value="opt.value">
            {{ opt.label }}
          </el-radio-button>
        </el-radio-group>
      </el-card>

      <!-- 防伪文字水印配置 -->
      <el-card shadow="never" class="config-card">
        <template #header>
          <div class="card-head-row">
            <span class="title">防伪倾斜平铺水印</span>
            <el-switch v-model="enableWatermark" size="small" />
          </div>
        </template>
        <div v-if="enableWatermark" class="form-grid">
          <div class="form-item full-width">
            <span class="label">水印文案:</span>
            <el-input v-model="watermarkForm.text" size="small" />
          </div>
          <div class="form-item">
            <span class="label">倾斜角度:</span>
            <el-slider v-model="watermarkForm.rotate" :min="-90" :max="90" size="small" />
          </div>
          <div class="form-item">
            <span class="label">字号 (px):</span>
            <el-input-number v-model="watermarkForm.fontSize" :min="12" :max="60" size="small" />
          </div>
          <div class="form-item">
            <span class="label">水平间距:</span>
            <el-input-number v-model="watermarkForm.gapX" :min="20" :max="200" size="small" />
          </div>
          <div class="form-item">
            <span class="label">垂直间距:</span>
            <el-input-number v-model="watermarkForm.gapY" :min="20" :max="200" size="small" />
          </div>
        </div>
        <div v-else class="disabled-tip">已停用水印合成</div>
      </el-card>

      <!-- 智能二分降采样压缩配置 -->
      <el-card shadow="never" class="config-card">
        <template #header>
          <div class="card-head-row">
            <span class="title">智能体积二分与降采样</span>
            <el-switch v-model="enableCompression" size="small" />
          </div>
        </template>
        <div v-if="enableCompression" class="form-grid">
          <div class="form-item full-width">
            <span class="label">目标体积限制:</span>
            <el-radio-group v-model="compressConfig.maxByteSize" size="small">
              <el-radio-button :value="150 * 1024">150 KB</el-radio-button>
              <el-radio-button :value="300 * 1024">300 KB</el-radio-button>
              <el-radio-button :value="500 * 1024">500 KB</el-radio-button>
              <el-radio-button :value="1024 * 1024">1 MB</el-radio-button>
            </el-radio-group>
          </div>
          <div class="form-item">
            <span class="label">最大尺寸护栏:</span>
            <el-input-number
              v-model="compressConfig.maxWidth"
              :min="800"
              :max="4096"
              size="small"
            />
          </div>
          <div class="form-item">
            <span class="label">初始质量 ({{ compressConfig.quality }}):</span>
            <el-slider
              v-model="compressConfig.quality"
              :min="0.1"
              :max="1"
              :step="0.05"
              size="small"
              style="width: 130px"
            />
          </div>
        </div>
        <div v-else class="disabled-tip">已停用体积压缩</div>
      </el-card>

      <!-- 触发执行动作 -->
      <el-button
        type="primary"
        size="default"
        class="action-btn"
        :loading="isProcessing"
        @click="handleProcessAndExport"
      >
        执行合成水印并压缩导出
      </el-button>
    </div>
  </div>
</template>

<style scoped>
.product-watermark-view {
  display: flex;
  gap: 16px;
  height: calc(100vh - 120px);
}

.left-canvas-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.cropper-container {
  flex: 1;
  min-height: 380px;
  background: var(--el-fill-color-darker);
  border-radius: 8px;
  overflow: hidden;
}

.result-card {
  padding: 12px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
}

.result-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.badge {
  font-size: 12px;
  font-weight: 600;
  color: var(--el-color-primary);
}

.meta-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.result-body {
  display: flex;
  gap: 16px;
  align-items: center;
}

.result-img-wrapper {
  width: 140px;
  height: 140px;
  background: repeating-conic-gradient(#e2e8f0 0% 25%, #ffffff 0% 50%) 50% / 12px 12px;
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.result-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.stats-table {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
}

.s-label {
  color: var(--el-text-color-secondary);
}

.font-bold {
  font-weight: 600;
}

.text-success {
  color: var(--el-color-success);
}

.text-primary {
  color: var(--el-color-primary);
}

.right-config-col {
  width: 400px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}

.config-card {
  border-radius: 6px;
}

.title {
  font-weight: 600;
  font-size: 14px;
}

.card-head-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.form-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.form-item .label {
  width: 85px;
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.full-width {
  width: 100%;
}

.disabled-tip {
  font-size: 13px;
  color: var(--el-text-color-placeholder);
  padding: 8px 0;
}

.action-btn {
  width: 100%;
  margin-top: 4px;
}

.source-action-row {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.custom-upload-btn {
  cursor: pointer;
  margin-bottom: 0;
}

.hide-input {
  display: none;
}
</style>
