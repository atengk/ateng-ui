<script setup lang="ts">
/**
 * 看板 5: 摄像头扫码器与长宽比构型自适应展厅。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import {
  AtengCodeScanner,
  type ScanMode,
  type ScannerFacingMode,
  type ScanResult,
  type ScannerCameraDevice,
} from '@atengk/barcode-vue';

const scanMode = ref<ScanMode>('all');
const facingMode = ref<ScannerFacingMode>('environment');
const selectedCameraId = ref<string>('');
const fps = ref(10);
const autoStart = ref(true);
const showLaser = ref(true);
const showControls = ref(true);

const availableCameras = ref<ScannerCameraDevice[]>([]);
const scannerRef = ref<InstanceType<typeof AtengCodeScanner> | null>(null);

interface HistoryRecord {
  id: string;
  text: string;
  format?: string;
  time: string;
}

const scanHistory = ref<HistoryRecord[]>([]);

const handleCameraReady = (cameras: ScannerCameraDevice[]) => {
  availableCameras.value = cameras;
  if (cameras.length > 0 && !selectedCameraId.value) {
    selectedCameraId.value = cameras[0]?.id ?? '';
  }
};

const handleScan = (result: ScanResult) => {
  const record: HistoryRecord = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    text: result.text,
    format: result.format ?? 'UNKNOWN',
    time: new Date().toLocaleTimeString(),
  };
  scanHistory.value.unshift(record);
  if (scanHistory.value.length > 20) {
    scanHistory.value.pop();
  }
  ElMessage.success(`识别成功 [${record.format}]: ${record.text}`);
};

const handleError = (err: Error) => {
  ElMessage.error(`扫码异常: ${err.message}`);
};

const clearHistory = () => {
  scanHistory.value = [];
  ElMessage.info('已清空扫码记录');
};

const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success('条码内容已复制至剪贴板');
  } catch {
    ElMessage.warning('复制失败，请手动选取');
  }
};

// 离线模拟注入扫码事件（用于在无摄像头的工控机/PC 端体验）
const simulateScan = (sampleText: string, formatName: string) => {
  handleScan({
    text: sampleText,
    format: formatName,
  });
};
</script>

<template>
  <div class="camera-scanner-view">
    <!-- 头部说明卡片 -->
    <el-card shadow="never" class="overview-card">
      <div class="overview-header">
        <div>
          <h2 class="title">摄像头扫码器按需懒加载与长宽比构型自适应</h2>
          <p class="subtitle">
            底层 <code>html5-qrcode</code> 强制通过异步动态
            <code>import()</code> 按需懒加载，未挂载扫码器时 <code>0 字节</code> 打入主产物；支持
            <code>barcode</code> 狭长宽屏（2.8:1）构型算法收敛与正方形二维码自适应，
            切入后台自动暂停释放摄像头硬件轨道，根除发热与指示灯常亮。
          </p>
        </div>
        <div class="overview-tags">
          <el-tag type="success" effect="dark">动态 import 懒加载</el-tag>
          <el-tag type="primary">2.8:1 狭长构型自适应</el-tag>
          <el-tag type="warning">硬件生命周期守卫</el-tag>
        </div>
      </div>
    </el-card>

    <div class="main-layout">
      <!-- 左侧：扫码器实时视口展示 -->
      <el-card shadow="never" class="scanner-card">
        <template #header>
          <div class="card-header">
            <span class="card-title">📷 实时摄像头取景视口</span>
            <div class="header-actions">
              <el-radio-group v-model="scanMode" size="small">
                <el-radio-button value="all">全模式</el-radio-button>
                <el-radio-button value="barcode">一维条码 (2.8:1 宽屏)</el-radio-button>
                <el-radio-button value="qr-code">二维码 (1:1 方框)</el-radio-button>
              </el-radio-group>
            </div>
          </div>
        </template>

        <div class="scanner-container">
          <AtengCodeScanner
            ref="scannerRef"
            :scan-mode="scanMode"
            :facing-mode="facingMode"
            :camera-id="selectedCameraId || undefined"
            :fps="fps"
            :auto-start="autoStart"
            :show-laser="showLaser"
            :show-controls="showControls"
            @scan="handleScan"
            @error="handleError"
            @camera-ready="handleCameraReady"
          >
            <template #error="{ error: err }">
              <div class="custom-error">
                <span class="error-emoji">📹</span>
                <p class="error-title">摄像头启动受阻</p>
                <p class="error-desc">{{ err.message }}</p>
                <el-button size="small" type="primary" plain @click="scannerRef?.start()">
                  重试启动
                </el-button>
              </div>
            </template>
          </AtengCodeScanner>
        </div>

        <!-- 外部扩展控制工具条 -->
        <div class="scanner-quick-tools">
          <el-button
            size="small"
            :type="scannerRef?.isScanning ? 'danger' : 'success'"
            @click="scannerRef?.isScanning ? scannerRef.stop() : scannerRef?.start()"
          >
            {{ scannerRef?.isScanning ? '⏹ 停止采集' : '▶ 启动采集' }}
          </el-button>

          <el-button
            size="small"
            :disabled="!scannerRef?.isScanning"
            @click="scannerRef?.isPaused ? scannerRef.resume() : scannerRef?.pause()"
          >
            {{ scannerRef?.isPaused ? '▶ 恢复扫描' : '⏸ 暂停帧' }}
          </el-button>

          <el-button
            size="small"
            :disabled="!scannerRef?.torchSupported"
            :type="scannerRef?.torchActive ? 'warning' : 'default'"
            @click="scannerRef?.toggleTorch()"
          >
            {{ scannerRef?.torchActive ? '💡 关闭手电筒' : '💡 开启补光灯' }}
          </el-button>

          <el-button size="small" @click="scannerRef?.flipCamera()">
            🔄 翻转镜头 ({{ facingMode === 'environment' ? '后置' : '前置' }})
          </el-button>
        </div>
      </el-card>

      <!-- 右侧：构型参数调节与扫码流水线记录 -->
      <div class="side-panel">
        <el-card shadow="never" class="settings-card">
          <template #header>
            <span class="card-title">⚙️ 构型参数与硬件控制</span>
          </template>

          <el-form label-position="top" size="small">
            <el-form-item label="物理摄像头设备选择">
              <el-select
                v-model="selectedCameraId"
                placeholder="自动选择主摄"
                style="width: 100%"
                :disabled="availableCameras.length === 0"
              >
                <el-option
                  v-for="cam in availableCameras"
                  :key="cam.id"
                  :label="cam.label"
                  :value="cam.id"
                />
              </el-select>
              <div class="form-hint">
                已探测可用摄像头: {{ availableCameras.length }} 个 (无硬件时优雅降级为空列表)
              </div>
            </el-form-item>

            <el-row :gutter="12">
              <el-col :span="12">
                <el-form-item label="默认镜头朝向">
                  <el-select v-model="facingMode" style="width: 100%">
                    <el-option label="后置主摄 (environment)" value="environment" />
                    <el-option label="前置镜头 (user)" value="user" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="采样帧率 (FPS)">
                  <el-input-number v-model="fps" :min="5" :max="30" style="width: 100%" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="12">
              <el-col :span="12">
                <el-form-item label="激光扫描线动画">
                  <el-switch v-model="showLaser" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="内建悬浮工具栏">
                  <el-switch v-model="showControls" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-divider content-position="left">模拟扫码脉冲 (无摄像头时验证)</el-divider>
            <div class="simulation-btns">
              <el-button
                size="small"
                plain
                type="primary"
                @click="simulateScan('6901234567890', 'EAN_13')"
              >
                模拟 EAN-13 商品码
              </el-button>
              <el-button
                size="small"
                plain
                type="success"
                @click="simulateScan('https://atengk.com/barcode', 'QR_CODE')"
              >
                模拟 URL 二维码
              </el-button>
              <el-button
                size="small"
                plain
                type="warning"
                @click="simulateScan('ITF-14-1234567890', 'ITF_14')"
              >
                模拟 ITF-14 箱码
              </el-button>
            </div>
          </el-form>
        </el-card>

        <!-- 扫码流水线记录列表 -->
        <el-card shadow="never" class="history-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">📋 扫码识别流水线 ({{ scanHistory.length }})</span>
              <el-button
                size="small"
                link
                type="danger"
                :disabled="scanHistory.length === 0"
                @click="clearHistory"
              >
                清空记录
              </el-button>
            </div>
          </template>

          <div v-if="scanHistory.length === 0" class="empty-history">
            暂无扫码数据，请将条码对准取景框或点击上方模拟扫码按钮
          </div>

          <div v-else class="history-list">
            <div v-for="item in scanHistory" :key="item.id" class="history-item">
              <div class="item-meta">
                <el-tag size="small" type="info">{{ item.format }}</el-tag>
                <span class="item-time">{{ item.time }}</span>
              </div>
              <div class="item-body">
                <code class="item-text">{{ item.text }}</code>
                <el-button size="small" link type="primary" @click="copyText(item.text)">
                  复制
                </el-button>
              </div>
            </div>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<style scoped>
.camera-scanner-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.overview-card {
  border-radius: 8px;
}

.overview-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: var(--el-text-color-primary);
}

.subtitle {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  margin: 0;
  line-height: 1.6;
}

.subtitle code {
  background: var(--el-fill-color);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
}

.overview-tags {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.main-layout {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 16px;
  align-items: start;
}

.scanner-card {
  border-radius: 8px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  font-weight: 600;
  font-size: 15px;
}

.scanner-container {
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: var(--el-fill-color-darker);
  border-radius: 8px;
  min-height: 380px;
  padding: 16px;
  overflow: hidden;
}

.scanner-quick-tools {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px dashed var(--el-border-color);
}

.side-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.settings-card,
.history-card {
  border-radius: 8px;
}

.form-hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}

.simulation-btns {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.empty-history {
  padding: 32px 16px;
  text-align: center;
  color: var(--el-text-color-placeholder);
  font-size: 13px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 280px;
  overflow-y: auto;
}

.history-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 12px;
  background-color: var(--el-fill-color-light);
  border-radius: 6px;
  border-left: 3px solid var(--el-color-primary);
}

.item-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.item-time {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.item-body {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.item-text {
  font-family: monospace;
  font-size: 13px;
  word-break: break-all;
}

.custom-error {
  padding: 24px;
  text-align: center;
}

.error-emoji {
  font-size: 36px;
}

.error-title {
  font-size: 15px;
  font-weight: 600;
  margin: 8px 0 4px;
}

.error-desc {
  font-size: 13px;
  color: var(--el-color-danger);
  margin-bottom: 12px;
}

@media (max-width: 992px) {
  .main-layout {
    grid-template-columns: 1fr;
  }
}
</style>
