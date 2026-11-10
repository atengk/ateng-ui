<script setup lang="ts">
/**
 * 圆形头像与脱壳模态弹窗自验看板。
 *
 * 验证 AtengCropperModal 脱壳弹窗、物理圆形 Alpha 通道透明切片、多尺寸预览与模拟上传流程。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { AtengCropperModal, type CropperResult } from '@atengk/cropper-vue';
import { createAvatarSampleImage } from '../utils/mock-images';

// 模态弹窗控制
const modalVisible = ref(false);
const modalSrc = ref('');
const clipCircle = ref(true);

// 当前保存的头像与导出详情
const savedAvatar = ref<string>('');
const lastResult = ref<CropperResult | null>(null);

// 上传状态模拟
const isUploading = ref(false);
const uploadStatus = ref<string>('');

onMounted(() => {
  const initial = createAvatarSampleImage(800);
  modalSrc.value = initial;
  savedAvatar.value = initial;
});

// 打开更换头像弹窗
function openAvatarModal() {
  modalVisible.value = true;
}

// 本地文件选取作为头像源
function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;
  const file = input.files[0];
  modalSrc.value = URL.createObjectURL(file);
  modalVisible.value = true;
}

// 模拟头像上传异步流水线
async function handleAvatarConfirm(result: CropperResult) {
  lastResult.value = result;
  savedAvatar.value = result.dataUrl;

  // 模拟真实 API 上传（耗时 600ms）
  isUploading.value = true;
  uploadStatus.value = '正在上传头像至 OSS 对象存储...';
  try {
    await new Promise(resolve => setTimeout(resolve, 600));
    uploadStatus.value = `上传成功！文件: ${result.file.name} (${(result.blob.size / 1024).toFixed(1)} KB)`;
    ElMessage.success('头像更新并上传成功！');
  } catch {
    uploadStatus.value = '上传失败';
    ElMessage.error('模拟上传失败');
  } finally {
    isUploading.value = false;
  }
}
</script>

<template>
  <div class="avatar-cropper-view">
    <div class="avatar-card">
      <div class="card-header">
        <h2 class="title">企业个人中心 · 头像管理</h2>
        <p class="subtitle">
          验证 AtengCropperModal 零 UI 依赖脱壳弹窗、物理圆形透明切片（ctx.arc + clip）与四角透明
          Alpha 通道
        </p>
      </div>

      <!-- 用户信息与当前头像 -->
      <div class="profile-section">
        <div class="avatar-wrapper">
          <div class="avatar-circle-display" :class="{ 'is-checkerboard': true }">
            <img v-if="savedAvatar" :src="savedAvatar" alt="当前用户头像" class="avatar-img" />
            <div v-else class="avatar-placeholder">未设置</div>
          </div>
          <div class="avatar-actions">
            <el-button type="primary" size="default" @click="openAvatarModal"> 更换头像 </el-button>
            <label class="custom-upload-btn el-button el-button--default is-plain">
              从本地选取
              <input type="file" accept="image/*" class="hide-input" @change="handleFileSelect" />
            </label>
          </div>
        </div>

        <div class="user-meta">
          <div class="meta-row"><span class="label">用户名:</span> Ateng Developer</div>
          <div class="meta-row"><span class="label">所属团队:</span> ateng-ui 核心基础研发部</div>
          <div class="meta-row">
            <span class="label">账号状态:</span> <el-tag type="success" size="small">正常</el-tag>
          </div>
          <div v-if="uploadStatus" class="meta-row upload-log">
            <span class="label">网络响应:</span>
            <span :class="{ 'text-uploading': isUploading, 'text-success': !isUploading }">
              {{ uploadStatus }}
            </span>
          </div>
        </div>
      </div>

      <!-- 物理圆形裁剪对比与 Alpha 通道验证区 -->
      <div class="verification-section">
        <h3 class="section-title">物理圆形透明通道验证 (Alpha 通道底色剔除)</h3>
        <div class="verification-controls">
          <el-checkbox v-model="clipCircle">
            启用物理圆形透明切片 (clipCircle = true，离屏 Canvas 物理剔除四角)
          </el-checkbox>
        </div>

        <div v-if="lastResult" class="alpha-display-card">
          <div class="alpha-left">
            <span class="view-tag">棋盘格透明视口 (无黑白底色残留)</span>
            <div class="checkerboard-view">
              <img :src="lastResult.dataUrl" alt="Alpha 导出位图" class="alpha-img" />
            </div>
          </div>
          <div class="alpha-right">
            <h4 class="meta-title">切片导出物理参数：</h4>
            <ul class="meta-list">
              <li>
                <strong>规格尺寸:</strong> {{ Math.round(lastResult.data.width) }} ×
                {{ Math.round(lastResult.data.height) }} px
              </li>
              <li><strong>文件体积:</strong> {{ (lastResult.blob.size / 1024).toFixed(2) }} KB</li>
              <li>
                <strong>MIME 协议:</strong> {{ lastResult.blob.type }} (必须收敛为 PNG 保留透明度)
              </li>
              <li>
                <strong>物理裁剪:</strong>
                {{ clipCircle ? '物理透明圆形剔除 (ctx.arc + clip)' : '矩形标准导出' }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- 头像裁剪模态弹窗 -->
    <AtengCropperModal
      v-model="modalVisible"
      :src="modalSrc"
      title="裁剪个人头像"
      preset="avatar"
      :aspect-ratio="1"
      :clip-circle="clipCircle"
      @confirm="handleAvatarConfirm"
    />
  </div>
</template>

<style scoped>
.avatar-cropper-view {
  max-width: 900px;
  margin: 0 auto;
  padding: 16px 0;
}

.avatar-card {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  padding: 24px;
  box-shadow: var(--el-box-shadow-light);
}

.card-header {
  margin-bottom: 24px;
}

.title {
  margin: 0 0 8px 0;
  font-size: 20px;
  color: var(--el-text-color-primary);
}

.subtitle {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.profile-section {
  display: flex;
  gap: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  align-items: center;
}

.avatar-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.avatar-circle-display {
  width: 140px;
  height: 140px;
  border-radius: 50%;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.is-checkerboard {
  background: repeating-conic-gradient(#e2e8f0 0% 25%, #ffffff 0% 50%) 50% / 12px 12px;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-actions {
  display: flex;
  gap: 8px;
}

.custom-upload-btn {
  cursor: pointer;
  margin-bottom: 0;
}

.hide-input {
  display: none;
}

.user-meta {
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-size: 14px;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.label {
  color: var(--el-text-color-secondary);
  font-weight: 500;
  width: 70px;
}

.upload-log {
  margin-top: 8px;
  padding: 8px 12px;
  background: var(--el-fill-color-light);
  border-radius: 4px;
}

.text-uploading {
  color: var(--el-color-primary);
}

.text-success {
  color: var(--el-color-success);
}

.verification-section {
  margin-top: 24px;
}

.section-title {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.verification-controls {
  margin-bottom: 16px;
}

.alpha-display-card {
  display: flex;
  gap: 24px;
  padding: 16px;
  background: var(--el-fill-color-lighter);
  border-radius: 6px;
  border: 1px solid var(--el-border-color);
}

.alpha-left {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.view-tag {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.checkerboard-view {
  width: 160px;
  height: 160px;
  background: repeating-conic-gradient(#cbd5e1 0% 25%, #ffffff 0% 50%) 50% / 14px 14px;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.alpha-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.alpha-right {
  flex: 1;
}

.meta-title {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.meta-list {
  margin: 0;
  padding-left: 20px;
  font-size: 13px;
  color: var(--el-text-color-regular);
  line-height: 1.8;
}
</style>
