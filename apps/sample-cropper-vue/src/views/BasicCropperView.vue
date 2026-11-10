<script setup lang="ts">
/**
 * 基础画布与参数交互自验看板。
 *
 * 验证 AtengCropper 容器交互、比例切换、几何翻转/调平、实时几何参数与多轨导出。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import {
  AtengCropper,
  type AtengCropperExpose,
  type CropperResult,
  type CropperCropData,
  type CropperBoxData,
} from '@atengk/cropper-vue';
import { createOfficeLandscapeImage, createProductSampleImage } from '../utils/mock-images';

const cropperRef = ref<AtengCropperExpose>();

// 状态管理
const currentSrc = ref<string>('');
const aspectRatio = ref<number | undefined>(16 / 9);
const viewMode = ref<0 | 1 | 2 | 3>(1);
const levelAngle = ref<number>(0);

// 实时几何参数
const liveCropData = ref<CropperCropData | null>(null);
const liveBoxData = ref<CropperBoxData | null>(null);

// 导出状态
const isExporting = ref(false);
const exportResult = ref<CropperResult | null>(null);
const exportFormat = ref<'image/png' | 'image/jpeg' | 'image/webp'>('image/png');
const exportQuality = ref<number>(0.92);

// 比例预设列表
const ratioPresets = [
  { label: '自由', value: undefined },
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '16:9', value: 16 / 9 },
  { label: '2:3', value: 2 / 3 },
];

onMounted(() => {
  currentSrc.value = createOfficeLandscapeImage(1200, 800);
});

// 切换图片源
function handlePresetChange(type: 'office' | 'product') {
  currentSrc.value =
    type === 'office' ? createOfficeLandscapeImage(1200, 800) : createProductSampleImage(900, 900);
}

// 本地文件上传
function handleFileUpload(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;
  const file = input.files[0];
  currentSrc.value = URL.createObjectURL(file);
}

// 比例切换
function handleRatioChange(val: number | undefined) {
  aspectRatio.value = val;
  cropperRef.value?.setAspectRatio(val ?? NaN);
}

// 几何变换操作
function handleRotate(degree: number) {
  cropperRef.value?.rotate(degree);
  syncLiveMetrics();
}

function handleFlip(direction: 'horizontal' | 'vertical') {
  if (direction === 'horizontal') {
    cropperRef.value?.flipX();
  } else {
    cropperRef.value?.flipY();
  }
  syncLiveMetrics();
}

function handleZoom(ratio: number) {
  cropperRef.value?.zoom(ratio);
  syncLiveMetrics();
}

function handleReset() {
  levelAngle.value = 0;
  cropperRef.value?.reset();
  syncLiveMetrics();
}

// 调平滑块微调
function handleLevelChange(val: number) {
  cropperRef.value?.rotateTo(val);
  syncLiveMetrics();
}

// 同步几何度量数据
function syncLiveMetrics() {
  if (!cropperRef.value) return;
  liveCropData.value = cropperRef.value.getData();
  liveBoxData.value = cropperRef.value.getCropBoxData();
}

function onCropChange(data: CropperCropData) {
  liveCropData.value = data;
  if (cropperRef.value) {
    liveBoxData.value = cropperRef.value.getCropBoxData();
  }
}

// 多轨导出执行
async function handleExport() {
  if (!cropperRef.value) return;
  isExporting.value = true;
  try {
    const res = await cropperRef.value.exportResult({
      format: exportFormat.value,
      quality: exportQuality.value,
    });
    exportResult.value = res;
    ElMessage.success(
      `导出成功！尺寸: ${Math.round(res.data.width)}×${Math.round(res.data.height)}px，体积: ${(res.blob.size / 1024).toFixed(1)}KB`,
    );
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : '导出发生未知异常');
  } finally {
    isExporting.value = false;
  }
}

// 下载导出结果
function handleDownload() {
  if (!exportResult.value) return;
  const a = document.createElement('a');
  a.href = exportResult.value.dataUrl;
  const ext = exportFormat.value === 'image/jpeg' ? 'jpg' : exportFormat.value.split('/')[1];
  a.download = `crop-export-${Date.now()}.${ext}`;
  a.click();
}
</script>

<template>
  <div class="basic-cropper-view">
    <!-- 左侧主编辑与交互区 -->
    <div class="canvas-panel">
      <div class="cropper-box">
        <AtengCropper
          ref="cropperRef"
          :src="currentSrc"
          :aspect-ratio="aspectRatio"
          :view-mode="viewMode"
          @crop="onCropChange"
          @ready="syncLiveMetrics"
        />
      </div>

      <!-- 快捷几何工具栏 -->
      <div class="toolbar">
        <el-button-group>
          <el-button size="small" @click="handleRotate(-90)">↺ 左转 90°</el-button>
          <el-button size="small" @click="handleRotate(90)">↻ 右转 90°</el-button>
          <el-button size="small" @click="handleFlip('horizontal')">⇄ 水平翻转</el-button>
          <el-button size="small" @click="handleFlip('vertical')">⇅ 垂直翻转</el-button>
        </el-button-group>

        <el-button-group>
          <el-button size="small" @click="handleZoom(0.1)">＋ 放大</el-button>
          <el-button size="small" @click="handleZoom(-0.1)">－ 缩小</el-button>
          <el-button size="small" type="warning" plain @click="handleReset">↺ 复位</el-button>
        </el-button-group>

        <div class="level-slider">
          <span class="label">调平 ({{ levelAngle }}°):</span>
          <el-slider
            v-model="levelAngle"
            :min="-45"
            :max="45"
            :step="1"
            size="small"
            style="width: 140px"
            @input="handleLevelChange as any"
          />
        </div>
      </div>
    </div>

    <!-- 右侧控制与数据监视面板 -->
    <div class="control-panel">
      <!-- 图片源选择 -->
      <el-card shadow="never" class="control-card">
        <template #header>
          <span class="card-title">图片输入源</span>
        </template>
        <div class="control-row">
          <el-button size="small" @click="handlePresetChange('office')">商务办公图</el-button>
          <el-button size="small" @click="handlePresetChange('product')">电商商品图</el-button>
          <label class="custom-upload-btn el-button el-button--small el-button--primary is-plain">
            本地上传
            <input type="file" accept="image/*" class="hide-input" @change="handleFileUpload" />
          </label>
        </div>
      </el-card>

      <!-- 裁剪比例选择 -->
      <el-card shadow="never" class="control-card">
        <template #header>
          <span class="card-title">裁剪比例模式</span>
        </template>
        <div class="ratio-group">
          <el-radio-group v-model="aspectRatio" size="small" @change="handleRatioChange">
            <el-radio-button v-for="item in ratioPresets" :key="item.label" :value="item.value">
              {{ item.label }}
            </el-radio-button>
          </el-radio-group>
        </div>
      </el-card>

      <!-- 实时几何度量 -->
      <el-card shadow="never" class="control-card">
        <template #header>
          <span class="card-title">实时几何度量数据</span>
        </template>
        <div v-if="liveCropData" class="metrics-grid">
          <div class="metric-item">
            <span class="m-label">X:</span> {{ Math.round(liveCropData.x) }}px
          </div>
          <div class="metric-item">
            <span class="m-label">Y:</span> {{ Math.round(liveCropData.y) }}px
          </div>
          <div class="metric-item">
            <span class="m-label">宽:</span> {{ Math.round(liveCropData.width) }}px
          </div>
          <div class="metric-item">
            <span class="m-label">高:</span> {{ Math.round(liveCropData.height) }}px
          </div>
          <div class="metric-item">
            <span class="m-label">旋转:</span> {{ Math.round(liveCropData.rotate) }}°
          </div>
          <div class="metric-item">
            <span class="m-label">缩放X:</span> {{ liveCropData.scaleX }}
          </div>
        </div>
        <div v-else class="empty-tip">等待画布就绪...</div>
      </el-card>

      <!-- 多轨导出控制 -->
      <el-card shadow="never" class="control-card">
        <template #header>
          <span class="card-title">多轨导出与参数</span>
        </template>
        <div class="export-options">
          <div class="opt-row">
            <span class="m-label">格式:</span>
            <el-select v-model="exportFormat" size="small" style="width: 130px">
              <el-option label="image/png" value="image/png" />
              <el-option label="image/jpeg" value="image/jpeg" />
              <el-option label="image/webp" value="image/webp" />
            </el-select>
          </div>
          <div class="opt-row">
            <span class="m-label">质量 ({{ exportQuality }}):</span>
            <el-slider
              v-model="exportQuality"
              :min="0.1"
              :max="1"
              :step="0.05"
              size="small"
              style="width: 120px"
            />
          </div>
          <el-button
            type="primary"
            size="small"
            class="export-btn"
            :loading="isExporting"
            @click="handleExport"
          >
            执行 exportResult() 导出
          </el-button>
        </div>

        <!-- 导出预览 -->
        <div v-if="exportResult" class="export-preview">
          <div class="preview-img-box">
            <img :src="exportResult.dataUrl" alt="导出预览" class="preview-img" />
          </div>
          <div class="preview-info">
            <span
              >尺寸: {{ Math.round(exportResult.data.width) }} ×
              {{ Math.round(exportResult.data.height) }} px</span
            >
            <span>大小: {{ (exportResult.blob.size / 1024).toFixed(1) }} KB</span>
            <el-button type="success" size="small" plain @click="handleDownload"
              >下载文件</el-button
            >
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<style scoped>
.basic-cropper-view {
  display: flex;
  gap: 16px;
  height: calc(100vh - 120px);
}

.canvas-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.cropper-box {
  flex: 1;
  min-height: 400px;
  background: var(--el-fill-color-darker);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: var(--el-box-shadow-light);
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  flex-wrap: wrap;
}

.level-slider {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.control-panel {
  width: 380px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}

.control-card {
  border-radius: 6px;
}

.card-title {
  font-weight: 600;
  font-size: 14px;
}

.control-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.custom-upload-btn {
  cursor: pointer;
  margin-bottom: 0;
}

.hide-input {
  display: none;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.m-label {
  color: var(--el-text-color-secondary);
  font-weight: 500;
}

.empty-tip {
  font-size: 13px;
  color: var(--el-text-color-placeholder);
}

.export-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.opt-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.export-btn {
  width: 100%;
}

.export-preview {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--el-border-color);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preview-img-box {
  width: 100%;
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: repeating-conic-gradient(#e2e8f0 0% 25%, #ffffff 0% 50%) 50% / 16px 16px;
  border-radius: 4px;
  overflow: hidden;
}

.preview-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.preview-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
