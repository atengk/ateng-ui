<script setup lang="ts">
/**
 * BarcodeTypographyView 工业排版与肉眼防错看板。
 *
 * 演示条形码文字位置、字号、对齐控制、肉眼防错段落空格分组与一键多格式图像导出。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { ref, reactive, computed } from 'vue';
import {
  AtengBarcode,
  formatEan13,
  formatItf14,
  formatCode128Grouped,
  formatIsbn,
  type BarcodeFormat,
  type BarcodeTextPosition,
  type BarcodeTextAlign,
  type BarcodeExportFormat,
} from '@atengk/barcode-vue';

// 排版参数
const typography = reactive({
  value: '6901234567892',
  format: 'EAN13' as BarcodeFormat,
  textPosition: 'bottom' as BarcodeTextPosition,
  textAlign: 'center' as BarcodeTextAlign,
  fontSize: 20,
  font: 'monospace',
  textMargin: 4,
  margin: 16,
  template: 'ean13',
});

// 条形码组件实例引用
const barcodeRef = ref<InstanceType<typeof AtengBarcode> | null>(null);

// 根据选中的模板计算 formatText 格式化函数
const activeFormatFn = computed(() => {
  switch (typography.template) {
    case 'ean13':
      return formatEan13;
    case 'itf14':
      return formatItf14;
    case 'code128-4':
      return (code: string) => formatCode128Grouped(code, 4);
    case 'isbn':
      return formatIsbn;
    case 'bracket':
      return (code: string) => `[ ${code} ]`;
    case 'none':
    default:
      return undefined;
  }
});

// 快速切换标准场景
const switchScene = (scene: 'ean' | 'itf' | 'wms' | 'isbn') => {
  if (scene === 'ean') {
    typography.value = '6901234567892';
    typography.format = 'EAN13';
    typography.template = 'ean13';
  } else if (scene === 'itf') {
    typography.value = '10012345678902';
    typography.format = 'ITF14';
    typography.template = 'itf14';
  } else if (scene === 'wms') {
    typography.value = 'ATENG-WMS-20261110';
    typography.format = 'CODE128';
    typography.template = 'code128-4';
  } else if (scene === 'isbn') {
    typography.value = '9787123456789';
    typography.format = 'EAN13';
    typography.template = 'isbn';
  }
};

// 导出与下载状态
const isExporting = ref(false);
const exportMessage = ref('');

const handleExport = async (format: BarcodeExportFormat) => {
  if (!barcodeRef.value) return;
  try {
    isExporting.value = true;
    await barcodeRef.value.download(format, `barcode-${typography.format.toLowerCase()}`);
    exportMessage.value = `[${new Date().toLocaleTimeString()}] 成功导出并触发下载: barcode-${typography.format.toLowerCase()}.${format === 'jpeg' ? 'jpg' : format}`;
  } catch (err) {
    exportMessage.value = `导出失败: ${err instanceof Error ? err.message : String(err)}`;
  } finally {
    isExporting.value = false;
  }
};
</script>

<template>
  <div class="barcode-typography-view">
    <el-row :gutter="24">
      <!-- 左侧：排版与格式化参数设置 -->
      <el-col :span="10">
        <el-card shadow="hover" class="control-card">
          <template #header>
            <div class="card-title">
              <span>✍️ 工业级排版与格式化管道</span>
            </div>
          </template>

          <el-form label-position="top">
            <el-form-item label="条码数值 (Value)">
              <el-input v-model="typography.value" placeholder="输入条码字符串" />
            </el-form-item>

            <el-row :gutter="12">
              <el-col :span="12">
                <el-form-item label="文字垂直位置 (Position)">
                  <el-radio-group v-model="typography.textPosition">
                    <el-radio-button value="bottom">下方 (Bottom)</el-radio-button>
                    <el-radio-button value="top">上方 (Top)</el-radio-button>
                  </el-radio-group>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="水平对齐 (Align)">
                  <el-radio-group v-model="typography.textAlign">
                    <el-radio-button value="left">居左</el-radio-button>
                    <el-radio-button value="center">居中</el-radio-button>
                    <el-radio-button value="right">居右</el-radio-button>
                  </el-radio-group>
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="12">
              <el-col :span="12">
                <el-form-item label="文字字号 (FontSize)">
                  <el-slider v-model="typography.fontSize" :min="12" :max="36" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="条码文字间距 (TextMargin)">
                  <el-slider v-model="typography.textMargin" :min="0" :max="20" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="12">
              <el-col :span="12">
                <el-form-item label="字体族 (Font)">
                  <el-select v-model="typography.font" class="w-full">
                    <el-option label="等宽字体 (monospace)" value="monospace" />
                    <el-option label="无衬线体 (Arial)" value="Arial" />
                    <el-option label="经典等宽 (Courier New)" value="Courier New" />
                    <el-option label="系统默认 (sans-serif)" value="sans-serif" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="肉眼防错格式化模板">
                  <el-select v-model="typography.template" class="w-full">
                    <el-option label="EAN-13 1-6-6 结构" value="ean13" />
                    <el-option label="ITF-14 包装分段" value="itf14" />
                    <el-option label="CODE128 四位一空" value="code128-4" />
                    <el-option label="ISBN-13 标准书号" value="isbn" />
                    <el-option label="带括号高亮 [ CODE ]" value="bracket" />
                    <el-option label="不格式化 (紧凑原样)" value="none" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>

          <el-divider>🏭 典型防错排版场景一键切换</el-divider>
          <div class="preset-buttons">
            <el-button size="small" type="primary" plain @click="switchScene('ean')">
              零售商品 EAN-13 (1-6-6)
            </el-button>
            <el-button size="small" type="success" plain @click="switchScene('itf')">
              外箱储运 ITF-14
            </el-button>
            <el-button size="small" type="warning" plain @click="switchScene('wms')">
              WMS 物流箱唛 (4位分组)
            </el-button>
            <el-button size="small" type="info" plain @click="switchScene('isbn')">
              图书国际书号 (ISBN-13)
            </el-button>
          </div>

          <el-divider>💾 高保真多格式图像导出</el-divider>
          <div class="export-actions">
            <el-button type="primary" :loading="isExporting" @click="handleExport('png')">
              📥 导出 PNG 高清图
            </el-button>
            <el-button type="success" :loading="isExporting" @click="handleExport('jpeg')">
              📥 导出 JPEG 图
            </el-button>
            <el-button type="warning" :loading="isExporting" @click="handleExport('svg')">
              📥 导出 SVG 纯矢量
            </el-button>
          </div>
        </el-card>
      </el-col>

      <!-- 右侧：对比展示大盘 -->
      <el-col :span="14">
        <el-card shadow="hover" class="preview-card">
          <template #header>
            <div class="card-title">
              <span>👀 人眼防串行核对体验对比</span>
              <el-tag type="success" size="small">矢量排版同步</el-tag>
            </div>
          </template>

          <div class="comparison-grid">
            <!-- 优化前 -->
            <div class="compare-item">
              <div class="compare-label danger-label">❌ 传统未分组（人眼容易串行看错）</div>
              <div class="barcode-box">
                <AtengBarcode
                  :value="typography.value"
                  :format="typography.format"
                  :font-size="typography.fontSize"
                  :text-position="typography.textPosition"
                  :text-align="typography.textAlign"
                  :text-margin="typography.textMargin"
                  :margin="typography.margin"
                  :font="typography.font"
                />
              </div>
            </div>

            <!-- 优化后 -->
            <div class="compare-item">
              <div class="compare-label success-label">
                ✅ formatText 优化后（段落清晰、秒识防错）
              </div>
              <div class="barcode-box highlight-box">
                <AtengBarcode
                  ref="barcodeRef"
                  :value="typography.value"
                  :format="typography.format"
                  :font-size="typography.fontSize"
                  :text-position="typography.textPosition"
                  :text-align="typography.textAlign"
                  :text-margin="typography.textMargin"
                  :margin="typography.margin"
                  :font="typography.font"
                  :format-text="activeFormatFn"
                />
              </div>
            </div>
          </div>

          <div v-if="exportMessage" class="export-log">
            {{ exportMessage }}
          </div>
        </el-card>

        <!-- 知识小贴士 -->
        <el-card shadow="never" class="info-card">
          <template #header>
            <div class="card-title">💡 为什么需要 formatText 格式化管道？</div>
          </template>
          <div class="tip-content">
            <p>
              在传统条形码生成库中，底部的文字通常直接打印原始紧凑字符串。当面临 13 位 EAN-13、14
              位外箱条码或 20 位物流追踪号时，
              现场人工拣货员在核对数字时极易出现“串行”、“漏看一位”等视觉疲劳错误。
            </p>
            <p>
              <code>@atengk/barcode-vue</code> 的
              <code>formatText</code>
              钩子在<strong>不改变条形码实际机器激光扫描数据</strong>的前提下，
              将底部展示文本解耦并通过格式化管道美化分段，真正做到了“机器扫描毫厘不差、人工肉眼核对清晰秒认”。
            </p>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.barcode-typography-view {
  padding: 8px 0;
}

.card-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
  font-size: 15px;
}

.preset-buttons,
.export-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.comparison-grid {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.compare-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.compare-label {
  font-size: 13px;
  font-weight: 600;
}

.danger-label {
  color: #ef4444;
}

.success-label {
  color: #10b981;
}

.barcode-box {
  min-height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  padding: 16px;
  overflow: auto;
}

.highlight-box {
  background-color: rgba(16, 185, 129, 0.04);
  border-color: rgba(16, 185, 129, 0.4);
}

.export-log {
  margin-top: 16px;
  padding: 10px 14px;
  background-color: var(--el-fill-color-light);
  border-radius: 6px;
  font-size: 13px;
  color: #10b981;
  font-family: monospace;
}

.info-card {
  margin-top: 16px;
}

.tip-content {
  font-size: 13px;
  line-height: 1.7;
  color: var(--el-text-color-regular);
}

.tip-content p {
  margin: 0 0 8px 0;
}

.w-full {
  width: 100%;
}
</style>
