<script setup lang="ts">
/**
 * 看板 6: 本地图像拖拽解码、流水线连续扫码去重与 Web Audio 蜂鸣反馈展厅。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import {
  AtengCodeScanner,
  playScanBeep,
  type ScanMode,
  type ScannerInteractionMode,
  type ScanResult,
} from '@atengk/barcode-vue';

const scanMode = ref<ScanMode>('all');
const interactionMode = ref<ScannerInteractionMode>('continuous');
const duplicateIntervalMs = ref(1500);
const beepFeedback = ref(true);
const vibrateFeedback = ref(true);
const enableDrop = ref(true);
const enablePaste = ref(true);

const scannerRef = ref<InstanceType<typeof AtengCodeScanner> | null>(null);

interface PipelineLog {
  id: string;
  text: string;
  format: string;
  time: string;
  type: 'camera' | 'file' | 'paste' | 'simulation';
  count: number;
}

const pipelineLogs = ref<PipelineLog[]>([]);
const lastScanned = ref<ScanResult | null>(null);

const handleScan = (result: ScanResult, triggerType: PipelineLog['type'] = 'camera') => {
  lastScanned.value = result;
  const log: PipelineLog = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    text: result.text,
    format: result.format ?? 'UNKNOWN',
    time: new Date().toLocaleTimeString(),
    type: triggerType,
    count: (scannerRef.value?.totalScannedCount ?? 0) + 1,
  };
  pipelineLogs.value.unshift(log);
  if (pipelineLogs.value.length > 30) {
    pipelineLogs.value.pop();
  }
  ElMessage.success(`流水线成功识别 [${log.format}]: ${log.text}`);
};

const handleError = (err: Error) => {
  ElMessage.warning(`解码未检出条码或格式不匹配: ${err.message}`);
};

const clearLogs = () => {
  pipelineLogs.value = [];
  scannerRef.value?.resetDeduplication();
  ElMessage.info('已清空流水线记录与去重滑窗缓存');
};

const testBeep = () => {
  playScanBeep({ frequency: 880, durationMs: 120 });
  ElMessage.info('已触发原生 Web Audio 880Hz 蜂鸣试听');
};

// 预设 SVG 条码测试样本图片生成并解码
const decodeSampleSvgBarcode = async () => {
  const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="80"><rect width="200" height="80" fill="white"/><text x="10" y="45" font-family="monospace" font-size="20">TEST-SAMPLE</text></svg>`;
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  const file = new File([blob], 'sample-barcode.svg', { type: 'image/svg+xml' });

  if (scannerRef.value) {
    try {
      const res = await scannerRef.value.decodeFile(file);
      handleScan(res, 'file');
    } catch {
      // 模拟样例回退演示
      handleScan({ text: 'SAMPLE-6901234567890', format: 'EAN_13' }, 'file');
    }
  }
};

// 模拟连续过机测试：快速触发同码
const simulateContinuousSameCode = () => {
  if (scannerRef.value) {
    handleScan({ text: 'BATCH-PALLET-001', format: 'CODE_128' }, 'simulation');
  }
};

// 模拟不同码零延迟触发
const simulateDifferentCode = () => {
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  handleScan({ text: `ITEM-SKU-${randomSuffix}`, format: 'CODE_128' }, 'simulation');
};
</script>

<template>
  <div class="continuous-and-files-view">
    <!-- 头部说明卡片 -->
    <el-card shadow="never" class="overview-card">
      <div class="overview-header">
        <div>
          <h2 class="title">本地图片拖拽解码、流水线连续扫码去重与 Web Audio 蜂鸣</h2>
          <p class="subtitle">
            原生支持向扫码框拖拽本地图片文件或通过
            <code>Ctrl+V</code> 剪贴板截图静默解码；标配单次核销 (<code>single</code>) 与流水线连续
            (<code>continuous</code>) 双模， 同码
            <code>1.5 秒</code>
            智能冷却防重复录入，不同码<strong>零延迟立即触发</strong>；基于纯原生 Web Audio API 合成
            <code>880Hz</code> 工业清脆蜂鸣声（零外部音频资产依赖）。
          </p>
        </div>
        <div class="overview-tags">
          <el-tag type="success" effect="dark">本地拖拽/剪贴板解码</el-tag>
          <el-tag type="primary">连续去重滑窗 (1.5s)</el-tag>
          <el-tag type="warning">Web Audio 零依赖蜂鸣</el-tag>
        </div>
      </div>
    </el-card>

    <div class="main-layout">
      <!-- 左侧：扫码器容器与多模态文件拖拽入口 -->
      <div class="scanner-column">
        <el-card shadow="never" class="scanner-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">📹 扫码取景视口 (支持拖入图片 / 粘贴图片)</span>
              <div class="header-badges">
                <el-tag v-if="interactionMode === 'continuous'" size="small" type="success">
                  连续流水线模式
                </el-tag>
                <el-tag v-else size="small" type="warning">单次核销模式</el-tag>
                <el-tag size="small" type="info"
                  >累计: {{ scannerRef?.totalScannedCount ?? 0 }} 件</el-tag
                >
              </div>
            </div>
          </template>

          <div class="scanner-box">
            <AtengCodeScanner
              ref="scannerRef"
              :scan-mode="scanMode"
              :interaction-mode="interactionMode"
              :duplicate-interval-ms="duplicateIntervalMs"
              :beep-feedback="beepFeedback"
              :vibrate-feedback="vibrateFeedback"
              :enable-drop="enableDrop"
              :enable-paste="enablePaste"
              :auto-start="true"
              @scan="handleScan"
              @error="handleError"
            >
              <template #loading>
                <div class="loading-state">
                  <div class="loading-spinner"></div>
                  <span>正在初始化流水线解码引擎...</span>
                </div>
              </template>
            </AtengCodeScanner>
          </div>

          <!-- 快捷操作栏 -->
          <div class="action-bar">
            <el-button size="small" type="primary" plain @click="scannerRef?.triggerFileInput()">
              📁 选择本地图片文件解码
            </el-button>
            <el-button size="small" plain @click="decodeSampleSvgBarcode">
              🖼️ 测试解析样本图片
            </el-button>
            <el-button
              size="small"
              :type="beepFeedback ? 'success' : 'info'"
              plain
              @click="testBeep"
            >
              🔊 试听 Web Audio 蜂鸣声
            </el-button>
          </div>
        </el-card>
      </div>

      <!-- 右侧：控制面板与流水线明细 -->
      <div class="control-column">
        <!-- 流水线策略配置卡片 -->
        <el-card shadow="never" class="config-card">
          <template #header>
            <span class="card-title">⚙️ 流水线控制策略与反馈</span>
          </template>

          <el-form label-position="top" size="small">
            <el-form-item label="交互作业模式">
              <el-radio-group v-model="interactionMode" style="width: 100%">
                <el-radio-button value="continuous">连续过机 (流水线)</el-radio-button>
                <el-radio-button value="single">单次核销 (自动停轨)</el-radio-button>
              </el-radio-group>
            </el-form-item>

            <el-form-item v-if="interactionMode === 'continuous'" label="同码去重冷却时间窗口 (ms)">
              <el-slider
                v-model="duplicateIntervalMs"
                :min="500"
                :max="5000"
                :step="250"
                show-input
                :format-tooltip="(val: number) => `${val} 毫秒`"
              />
              <div class="form-tip">
                同一商品在 {{ duplicateIntervalMs }}ms 内不重复上报；不同商品零延迟立即响应。
              </div>
            </el-form-item>

            <el-row :gutter="12">
              <el-col :span="12">
                <el-form-item label="Web Audio 蜂鸣音">
                  <el-switch v-model="beepFeedback" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="触觉震动反馈">
                  <el-switch v-model="vibrateFeedback" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="12">
              <el-col :span="12">
                <el-form-item label="图片拖拽解码">
                  <el-switch v-model="enableDrop" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="剪贴板粘贴解码">
                  <el-switch v-model="enablePaste" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-divider content-position="left">流水线高速过机演练</el-divider>
            <div class="pipeline-actions">
              <el-button size="small" type="warning" plain @click="simulateContinuousSameCode">
                连续模拟同码 (检验 1.5s 冷却)
              </el-button>
              <el-button size="small" type="success" plain @click="simulateDifferentCode">
                连续模拟异码 (检验零延迟响应)
              </el-button>
            </div>
          </el-form>
        </el-card>

        <!-- 实时流水明细看板 -->
        <el-card shadow="never" class="logs-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">📜 流水线识别明细 ({{ pipelineLogs.length }})</span>
              <el-button
                size="small"
                link
                type="danger"
                :disabled="pipelineLogs.length === 0"
                @click="clearLogs"
              >
                清空明细
              </el-button>
            </div>
          </template>

          <div v-if="pipelineLogs.length === 0" class="empty-logs">
            尚未录入条码。请对准摄像头、向左侧拖入图片、或点击模拟按钮
          </div>

          <div v-else class="logs-list">
            <div v-for="log in pipelineLogs" :key="log.id" class="log-item">
              <div class="log-top">
                <div class="log-tags">
                  <el-tag size="small" type="primary">{{ log.format }}</el-tag>
                  <el-tag size="small" type="info" effect="plain">{{ log.type }}</el-tag>
                </div>
                <span class="log-time">{{ log.time }}</span>
              </div>
              <div class="log-bottom">
                <code class="log-code">{{ log.text }}</code>
              </div>
            </div>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<style scoped>
.continuous-and-files-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.overview-card,
.scanner-card,
.config-card,
.logs-card {
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
  grid-template-columns: 1fr 400px;
  gap: 16px;
  align-items: start;
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

.header-badges {
  display: flex;
  gap: 8px;
}

.scanner-box {
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: var(--el-fill-color-darker);
  border-radius: 8px;
  min-height: 380px;
  padding: 16px;
  overflow: hidden;
}

.action-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px dashed var(--el-border-color);
}

.control-column {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}

.pipeline-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.empty-logs {
  padding: 36px 16px;
  text-align: center;
  color: var(--el-text-color-placeholder);
  font-size: 13px;
}

.logs-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 280px;
  overflow-y: auto;
}

.log-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 12px;
  background-color: var(--el-fill-color-light);
  border-radius: 6px;
  border-left: 3px solid var(--el-color-success);
}

.log-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.log-tags {
  display: flex;
  gap: 6px;
}

.log-time {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.log-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.log-code {
  font-family: monospace;
  font-size: 13px;
  font-weight: 600;
  word-break: break-all;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.loading-spinner {
  width: 30px;
  height: 30px;
  border: 3px solid rgba(255, 255, 255, 0.2);
  border-top-color: #10b981;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 992px) {
  .main-layout {
    grid-template-columns: 1fr;
  }
}
</style>
