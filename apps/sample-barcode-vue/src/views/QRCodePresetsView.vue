<script setup lang="ts">
/**
 * 看板 3: 艺术二维码与企业主题展厅。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import {
  AtengQRCode,
  type QRCodePreset,
  type DrawType,
  type DotType,
  type CornerSquareType,
} from '@atengk/barcode-vue';

interface PresetItem {
  id: QRCodePreset;
  title: string;
  desc: string;
  tag: string;
}

const PRESET_LIST: PresetItem[] = [
  {
    id: 'standard',
    title: '极简标准',
    desc: '极简纯黑白直角（高保真打印与极端工业现场首选）',
    tag: '打印首选',
  },
  {
    id: 'industrial',
    title: '冷灰钛金',
    desc: '高对比冷灰钛金（设备铭牌与资产标签专用）',
    tag: '资产铭牌',
  },
  {
    id: 'tech-blue',
    title: '科技蓝',
    desc: '现代科技蓝微圆角渐变（SaaS 平台与企业中台）',
    tag: 'SaaS中台',
  },
  {
    id: 'elegant-dots',
    title: '柔和点阵',
    desc: '柔和点阵圆角风格（对外营销宣传与单页）',
    tag: '营销宣传',
  },
  {
    id: 'classy',
    title: '典雅商务',
    desc: '典雅商务风格（高端商务与证书凭据）',
    tag: '高端商务',
  },
  {
    id: 'minimal-fluid',
    title: '流体渐变',
    desc: '流体微圆角渐变（移动端 Web 交互）',
    tag: '移动互动',
  },
];

const selectedPreset = ref<QRCodePreset>('tech-blue');
const qrValue = ref('https://github.com/atengk/ateng-ui');
const qrType = ref<DrawType>('canvas');
const qrSize = ref(220);
const qrMargin = ref(4);
const autoDpr = ref(true);
const customDotType = ref<DotType>('rounded');
const customCornerType = ref<CornerSquareType>('extra-rounded');

const qrRef = ref<InstanceType<typeof AtengQRCode> | null>(null);

const handlePresetChange = (preset: QRCodePreset) => {
  selectedPreset.value = preset;
};

const handleExport = async (format: 'png' | 'jpeg' | 'svg') => {
  if (!qrRef.value) {
    return;
  }
  try {
    await qrRef.value.download({
      filename: `ateng-qrcode-${selectedPreset.value}`,
      format,
    });
    ElMessage.success(`已成功下载 ${format.toUpperCase()} 格式二维码！`);
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '导出失败');
  }
};
</script>

<template>
  <div class="qrcode-presets-view">
    <!-- 头部说明卡片 -->
    <el-card shadow="never" class="overview-card">
      <div class="overview-header">
        <div>
          <h2 class="title">艺术二维码容器与企业级主题预设</h2>
          <p class="subtitle">
            基于 <code>qr-code-styling</code> 封装统一表现容器
            <code>&lt;AtengQRCode /&gt;</code> 与无头状态机 <code>useQRCode()</code>，内置 6
            大企业级主题预设，原生支持高分屏 Canvas Retina 像素自适应与无损 SVG 矢量渲染。
          </p>
        </div>
        <div class="dpr-badge">
          <el-tag type="success" size="large" effect="dark">
            当前环境 DPR: {{ typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1 }}x
          </el-tag>
        </div>
      </div>
    </el-card>

    <!-- 主操作区 -->
    <el-row :gutter="24" class="workspace-row">
      <!-- 左侧控制面板 -->
      <el-col :xs="24" :md="10">
        <el-card shadow="never" class="control-card">
          <template #header>
            <div class="card-header">
              <span class="header-text">⚙️ 样式与微调配置</span>
            </div>
          </template>

          <el-form label-position="top" size="default">
            <el-form-item label="企业级主题预设 (Preset)">
              <el-radio-group v-model="selectedPreset" @change="handlePresetChange">
                <el-radio-button v-for="item in PRESET_LIST" :key="item.id" :value="item.id">
                  {{ item.title }}
                </el-radio-button>
              </el-radio-group>
            </el-form-item>

            <el-form-item label="二维码内容 (Value / URL)">
              <el-input v-model="qrValue" placeholder="请输入 URL 或文本" clearable />
            </el-form-item>

            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="渲染模式 (Type)">
                  <el-radio-group v-model="qrType">
                    <el-radio-button value="canvas">Canvas</el-radio-button>
                    <el-radio-button value="svg">SVG 矢量</el-radio-button>
                  </el-radio-group>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="高分屏防锯齿 (Auto DPR)">
                  <el-switch
                    v-model="autoDpr"
                    active-text="开启"
                    inactive-text="关闭"
                    :disabled="qrType === 'svg'"
                  />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item :label="`尺寸 (${qrSize}px)`">
                  <el-slider v-model="qrSize" :min="140" :max="360" :step="10" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item :label="`边距 (${qrMargin}px)`">
                  <el-slider v-model="qrMargin" :min="0" :max="20" :step="2" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-divider content-position="left">高级码点形态覆写</el-divider>

            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="码点类型 (Dots)">
                  <el-select v-model="customDotType">
                    <el-option label="方形 (Square)" value="square" />
                    <el-option label="微圆角 (Rounded)" value="rounded" />
                    <el-option label="圆点 (Dots)" value="dots" />
                    <el-option label="典雅 (Classy)" value="classy" />
                    <el-option label="大圆角 (Extra Rounded)" value="extra-rounded" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="码眼外框 (Corner Square)">
                  <el-select v-model="customCornerType">
                    <el-option label="方形 (Square)" value="square" />
                    <el-option label="圆角 (Extra Rounded)" value="extra-rounded" />
                    <el-option label="圆圈 (Dot)" value="dot" />
                    <el-option label="典雅 (Classy)" value="classy" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
        </el-card>
      </el-col>

      <!-- 右侧实时预览与导出 -->
      <el-col :xs="24" :md="14">
        <el-card shadow="never" class="preview-card">
          <template #header>
            <div class="preview-header">
              <span class="header-text">🎨 实时预览与无损导出</span>
              <div class="actions">
                <el-button size="small" type="primary" plain @click="handleExport('png')">
                  下载 PNG
                </el-button>
                <el-button size="small" type="success" plain @click="handleExport('jpeg')">
                  下载 JPEG
                </el-button>
                <el-button
                  size="small"
                  type="warning"
                  plain
                  :disabled="qrType !== 'svg'"
                  @click="handleExport('svg')"
                >
                  下载 SVG
                </el-button>
              </div>
            </div>
          </template>

          <div class="preview-stage">
            <div class="qr-render-box">
              <AtengQRCode
                ref="qrRef"
                :value="qrValue"
                :preset="selectedPreset"
                :type="qrType"
                :width="qrSize"
                :height="qrSize"
                :margin="qrMargin"
                :auto-dpr="autoDpr"
                :dots-options="{ type: customDotType }"
                :corners-square-options="{ type: customCornerType }"
              >
                <div class="qr-label">
                  <span class="preset-name">{{ selectedPreset.toUpperCase() }}</span>
                  <span class="sub-tip">手机相机或扫码器可立即验证</span>
                </div>
              </AtengQRCode>
            </div>

            <div class="tech-specs">
              <el-descriptions :column="2" border size="small">
                <el-descriptions-item label="当前主题">
                  <el-tag size="small">{{ selectedPreset }}</el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="渲染内核">
                  {{ qrType === 'canvas' ? 'HTML5 Canvas' : 'SVG Vector' }}
                </el-descriptions-item>
                <el-descriptions-item label="高分屏适配">
                  {{ autoDpr && qrType === 'canvas' ? '已激活 (DPR 倍率渲染)' : '未激活' }}
                </el-descriptions-item>
                <el-descriptions-item label="逻辑尺寸">
                  {{ qrSize }} × {{ qrSize }} px
                </el-descriptions-item>
              </el-descriptions>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 底部六大企业预设矩阵全景卡片 -->
    <el-card shadow="never" class="matrix-card">
      <template #header>
        <span class="header-text">🌟 六大企业级主题全景对比矩阵</span>
      </template>

      <el-row :gutter="16">
        <el-col
          v-for="item in PRESET_LIST"
          :key="item.id"
          :xs="12"
          :sm="8"
          :md="4"
          class="matrix-col"
        >
          <div
            class="preset-item-card"
            :class="{ active: selectedPreset === item.id }"
            @click="selectedPreset = item.id"
          >
            <div class="card-tag">
              <el-tag size="small" effect="plain">{{ item.tag }}</el-tag>
            </div>
            <div class="item-qr-wrap">
              <AtengQRCode
                :value="qrValue"
                :preset="item.id"
                :width="120"
                :height="120"
                :margin="2"
              />
            </div>
            <div class="item-title">{{ item.title }}</div>
            <div class="item-desc">{{ item.desc }}</div>
          </div>
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<style scoped>
.qrcode-presets-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.overview-card {
  border-radius: 8px;
  border-color: var(--el-border-color-light);
}

.overview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.title {
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.subtitle {
  margin: 0;
  font-size: 14px;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
}

.subtitle code {
  color: var(--el-color-primary);
  background-color: var(--el-fill-color-light);
  padding: 2px 6px;
  border-radius: 4px;
}

.workspace-row {
  margin-bottom: 4px;
}

.control-card,
.preview-card,
.matrix-card {
  border-radius: 8px;
  border-color: var(--el-border-color-light);
}

.card-header,
.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-text {
  font-weight: 600;
  font-size: 15px;
  color: var(--el-text-color-primary);
}

.preview-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 24px 0 8px;
}

.qr-render-box {
  padding: 24px;
  background: var(--el-fill-color-lighter);
  border: 1px dashed var(--el-border-color);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.qr-label {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.preset-name {
  font-weight: 700;
  letter-spacing: 1px;
  font-size: 13px;
  color: var(--el-color-primary);
}

.sub-tip {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.tech-specs {
  width: 100%;
  max-width: 480px;
}

.matrix-col {
  margin-bottom: 12px;
}

.preset-item-card {
  padding: 12px;
  background-color: var(--el-fill-color-blank);
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transition: all 0.25s ease;
  height: 100%;
  box-sizing: border-box;
}

.preset-item-card:hover {
  border-color: var(--el-color-primary);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.preset-item-card.active {
  border-color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
}

.card-tag {
  margin-bottom: 8px;
}

.item-qr-wrap {
  margin-bottom: 8px;
  display: flex;
  justify-content: center;
}

.item-title {
  font-weight: 600;
  font-size: 13px;
  color: var(--el-text-color-primary);
  margin-bottom: 4px;
}

.item-desc {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  text-align: center;
  line-height: 1.4;
}
</style>
