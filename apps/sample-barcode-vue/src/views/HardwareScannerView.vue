<script setup lang="ts">
/**
 * 看板 7: 手持物理扫码枪 (HID) 无头监听与表单防污染守卫展厅。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { useHardwareScanner, vHardwareScannerReceiver } from '@atengk/barcode-vue';

const preventInputPollution = ref(true);
const maxIntervalMs = ref(30);
const duplicateIntervalMs = ref(1000);
const beepFeedback = ref(true);
const vibrateFeedback = ref(true);

// 表单输入框字段
const normalOperatorInput = ref('');
const normalRemarkInput = ref('');
const targetBarcodeInput = ref('');

interface HardwareScanLog {
  id: string;
  code: string;
  time: string;
  count: number;
}

const hardwareLogs = ref<HardwareScanLog[]>([]);

const scanner = useHardwareScanner({
  preventInputPollution: preventInputPollution.value,
  maxIntervalMs: maxIntervalMs.value,
  duplicateIntervalMs: duplicateIntervalMs.value,
  beepFeedback: beepFeedback.value,
  vibrateFeedback: vibrateFeedback.value,
  onScan: code => {
    const log: HardwareScanLog = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      code,
      time: new Date().toLocaleTimeString(),
      count: scanner.totalScannedCount.value,
    };
    hardwareLogs.value.unshift(log);
    if (hardwareLogs.value.length > 20) {
      hardwareLogs.value.pop();
    }
    ElMessage.success(`物理扫码枪成功捕获: ${code}`);
  },
});

const clearLogs = () => {
  hardwareLogs.value = [];
  scanner.resetDeduplication();
  ElMessage.info('已清空硬件扫码记录');
};

const handleFormSubmit = () => {
  ElMessage.warning(
    '警告：表单触发了同步 Submit 提交！若非主动回车，说明被扫码枪意外污染触发表单提交。',
  );
};

/**
 * 模拟工业物理扫码枪以高频时序脉冲 (12ms 间隔) 发送按键序列。
 */
const simulateGunPulse = (code: string) => {
  let time = 1000;
  const chars = [...code, 'Enter'];

  chars.forEach((key, idx) => {
    setTimeout(() => {
      time += 12;
      const event = new KeyboardEvent('keydown', {
        key,
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(event, 'timeStamp', {
        value: time,
        configurable: true,
      });
      const activeEl = document.activeElement || window;
      activeEl.dispatchEvent(event);
    }, idx * 12);
  });
};

/**
 * 模拟人类正常慢速打字 (120ms 间隔) 发送按键序列。
 */
const simulateHumanTyping = (text: string) => {
  let time = 2000;
  const chars = [...text];

  chars.forEach((key, idx) => {
    setTimeout(() => {
      time += 120;
      const event = new KeyboardEvent('keydown', {
        key,
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(event, 'timeStamp', {
        value: time,
        configurable: true,
      });
      const activeEl = document.activeElement || window;
      activeEl.dispatchEvent(event);
    }, idx * 120);
  });
};
</script>

<template>
  <div class="hardware-scanner-view">
    <!-- 头部说明卡片 -->
    <el-card shadow="never" class="overview-card">
      <div class="overview-header">
        <div>
          <h2 class="title">手持物理扫码枪 (HID) 无头监听与表单防污染守卫</h2>
          <p class="subtitle">
            针对车间与仓库现场 80% 以上的 USB/蓝牙工业扫码枪（本质模拟高速键盘敲击），通过
            <code>&lt; 30ms</code> 击键时延聚类分析精准区分人类打字（&gt; 80ms）； 开启
            <strong>Form Guard 表单防污染守卫</strong>
            后，自动在事件捕获阶段拦截条码字符打入普通文本框， 配合
            <code>v-hardware-scanner-receiver</code> 靶向指令实现扫码结果全局定向注入指定输入框。
          </p>
        </div>
        <div class="overview-tags">
          <el-tag type="success" effect="dark">&lt; 30ms 时序聚类捕获</el-tag>
          <el-tag type="primary">Form Guard 防污染守卫</el-tag>
          <el-tag type="warning">v-hardware-scanner-receiver 靶向注入</el-tag>
        </div>
      </div>
    </el-card>

    <div class="main-layout">
      <!-- 左侧：表单防污染实景对照与靶向输入框 -->
      <div class="form-column">
        <el-card shadow="never" class="form-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">📝 生产入库单录入实景对照测试</span>
              <el-tag :type="preventInputPollution ? 'success' : 'danger'" size="small">
                防污染守卫: {{ preventInputPollution ? '已开启 (安全)' : '未开启 (易被污染)' }}
              </el-tag>
            </div>
          </template>

          <el-form label-position="top" @submit.prevent="handleFormSubmit">
            <!-- 普通未受保护的表单输入框 1 -->
            <el-form-item
              label="普通输入框 1: 经办人姓名 (未标记指令，光标在此处扫码将受到防污染保护)"
            >
              <el-input
                v-model="normalOperatorInput"
                placeholder="请点击此处聚焦光标，然后点击右侧模拟扫码或物理扫码"
                clearable
              >
                <template #prefix>👤</template>
              </el-input>
              <div class="form-tip">
                开启防污染守卫时：物理扫码枪高速字符<strong>绝不会打入此框</strong>，且回车<strong>不会触发表单提交</strong>。
              </div>
            </el-form-item>

            <!-- 普通未受保护的表单输入框 2 -->
            <el-form-item label="普通输入框 2: 单据业务备注 (长文本 TextArea，未标记指令)">
              <el-input
                v-model="normalRemarkInput"
                type="textarea"
                :rows="2"
                placeholder="测试普通多行文本输入框防污染..."
              />
            </el-form-item>

            <el-divider content-position="left"
              >靶向接收输入框 (v-hardware-scanner-receiver)</el-divider
            >

            <!-- 标记了靶向指令的专用输入框 -->
            <el-form-item
              label="🎯 靶向接收输入框: 物料/商品唯一条码 (已绑定 v-hardware-scanner-receiver)"
            >
              <el-input
                v-model="targetBarcodeInput"
                v-hardware-scanner-receiver
                placeholder="无论光标在页面何处，扫码枪识别后均自动定向注入此处..."
                clearable
                class="target-barcode-input"
              >
                <template #prefix>🏷️</template>
                <template #append>
                  <el-tag size="small" type="success" effect="dark">靶向注入点</el-tag>
                </template>
              </el-input>
              <div class="form-tip-success">
                当前无论光标处于经办人输入框、备注框或空白处，物理扫码枪扫码均会<strong>精准定向填入此处</strong>。
              </div>
            </el-form-item>
          </el-form>
        </el-card>

        <!-- 模拟脉冲测试控制台 -->
        <el-card shadow="never" class="pulse-simulator-card">
          <template #header>
            <span class="card-title">🧪 模拟击键时序发生器 (无物理扫码枪时体验)</span>
          </template>

          <div class="pulse-actions">
            <el-alert
              type="info"
              :closable="false"
              show-icon
              title="测试指引：请先用鼠标点击上方任一普通输入框使之聚焦，然后点击下方按钮观察字符是否被隔离"
              style="margin-bottom: 12px"
            />

            <div class="btn-group">
              <el-button type="primary" @click="simulateGunPulse('6901234567890')">
                🔫 模拟扫码枪高速脉冲 (12ms/键: 6901234567890)
              </el-button>

              <el-button type="success" @click="simulateGunPulse('SN-2026-X8890')">
                🔫 模拟扫码枪高速脉冲 (12ms/键: SN-2026-X8890)
              </el-button>

              <el-button type="warning" plain @click="simulateHumanTyping('AtengTyping')">
                ⌨️ 模拟人类正常慢速打字 (120ms/键: AtengTyping)
              </el-button>
            </div>
          </div>
        </el-card>
      </div>

      <!-- 右侧：硬件状态机与扫码流水明细 -->
      <div class="side-column">
        <!-- 参数配置卡片 -->
        <el-card shadow="never" class="config-card">
          <template #header>
            <span class="card-title">⚙️ 时序分析与守卫配置</span>
          </template>

          <el-form label-position="top" size="small">
            <el-form-item label="Form Guard 表单防污染守卫">
              <el-switch v-model="preventInputPollution" />
              <div class="form-tip">开启后拦截普通输入框的扫码枪脉冲字符打入与意外回车提交。</div>
            </el-form-item>

            <el-form-item label="连续击键判定最大阈值 (ms)">
              <el-slider
                v-model="maxIntervalMs"
                :min="10"
                :max="80"
                :step="5"
                show-input
                :format-tooltip="(v: number) => `${v} 毫秒`"
              />
              <div class="form-tip">
                字符间隔低于 {{ maxIntervalMs }}ms 判定为扫码枪；高于则判定为人类打字。
              </div>
            </el-form-item>

            <el-form-item label="同码防重复扫描冷却 (ms)">
              <el-input-number
                v-model="duplicateIntervalMs"
                :min="200"
                :max="5000"
                :step="200"
                style="width: 100%"
              />
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
          </el-form>
        </el-card>

        <!-- 硬件扫码流水明细 -->
        <el-card shadow="never" class="logs-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">📋 扫码枪捕获明细 ({{ hardwareLogs.length }})</span>
              <el-button
                size="small"
                link
                type="danger"
                :disabled="hardwareLogs.length === 0"
                @click="clearLogs"
              >
                清空明细
              </el-button>
            </div>
          </template>

          <div v-if="hardwareLogs.length === 0" class="empty-logs">
            尚未捕获硬件扫码数据。请连接 USB/蓝牙扫码枪扫码，或点击模拟发生器
          </div>

          <div v-else class="logs-list">
            <div v-for="log in hardwareLogs" :key="log.id" class="log-item">
              <div class="log-top">
                <el-tag size="small" type="success">HID 扫码枪</el-tag>
                <span class="log-time">{{ log.time }}</span>
              </div>
              <div class="log-bottom">
                <code class="log-code">{{ log.code }}</code>
                <span class="log-index">#{{ log.count }}</span>
              </div>
            </div>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hardware-scanner-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.overview-card,
.form-card,
.pulse-simulator-card,
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
  grid-template-columns: 1fr 380px;
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

.form-column,
.side-column {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}

.form-tip-success {
  font-size: 12px;
  color: var(--el-color-success);
  margin-top: 4px;
}

.target-barcode-input :deep(.el-input__wrapper) {
  border: 2px solid var(--el-color-success);
  background-color: var(--el-color-success-light-9);
}

.btn-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
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
  border-left: 3px solid var(--el-color-primary);
}

.log-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
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

.log-index {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

@media (max-width: 992px) {
  .main-layout {
    grid-template-columns: 1fr;
  }
}
</style>
