<script setup lang="ts">
/**
 * 看板 4: Logo 防干扰与跨域防污损展厅。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { AtengQRCode, type QRCodePreset, type ErrorCorrectionLevel } from '@atengk/barcode-vue';

// 预设 Logo 样例库
const SAMPLE_LOGOS = [
  {
    name: '品牌 SVG (安全内联)',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="%232563eb"/><text x="50" y="62" font-size="36" font-family="sans-serif" font-weight="bold" fill="white" text-anchor="middle">AT</text></svg>',
  },
  {
    name: '成功绿盾 (安全 DataURL)',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="%2310b981"/><path d="M30 50 L45 65 L70 35" stroke="white" stroke-width="12" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  {
    name: '无 CORS 跨域图片 (模拟污损攻击)',
    url: 'https://example-forbidden-cors.invalid/logo.png',
  },
];

const selectedLogo = ref(SAMPLE_LOGOS[0]?.url || '');
const customLogoUrl = ref('');
const activeLogoUrl = computed(() => customLogoUrl.value || selectedLogo.value);

const qrValue = ref('https://github.com/atengk/ateng-ui');
const selectedPreset = ref<QRCodePreset>('tech-blue');
const requestedErrorLevel = ref<ErrorCorrectionLevel>('L');
const autoElevate = ref(true);

const hideBackgroundDots = ref(true);
const logoMargin = ref(4);
const logoSize = ref(0.24);

const enableCenterSlot = ref(false);
const centerSlotText = ref('PRO');

const lastLogoError = ref<string | null>(null);

const qrRef = ref<InstanceType<typeof AtengQRCode> | null>(null);

const handleLogoError = (err: Error) => {
  lastLogoError.value = err.message;
  ElMessage.warning(`跨域防污损守卫拦截: ${err.message}`);
};

const handleExport = async (format: 'png' | 'jpeg') => {
  if (!qrRef.value) {
    return;
  }
  try {
    await qrRef.value.download({
      filename: `ateng-qrcode-logo-guard`,
      format,
    });
    ElMessage.success(`已安全导出并下载 ${format.toUpperCase()}，Canvas 未受跨域污损！`);
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '导出失败');
  }
};
</script>

<template>
  <div class="qrcode-logo-guard-view">
    <!-- 头部说明卡片 -->
    <el-card shadow="never" class="overview-card">
      <div class="overview-header">
        <div>
          <h2 class="title">Logo 深度内嵌安全护栏与 CORS 防污损守卫</h2>
          <p class="subtitle">
            内嵌 Logo 自动提升纠错级别至 <code>Q(25%)</code> 或 <code>H(30%)</code> 确保扫码率；标配
            <code>CorsImageGuard</code> 拦截跨域未放行图片，坚决杜绝 Canvas 产生
            <code>Tainted</code> 污损导致导出抛出 <code>SecurityError</code>。
          </p>
        </div>
        <div class="status-tags">
          <el-tag type="success" size="large" effect="plain">容错智能提升: 已激活</el-tag>
          <el-tag type="warning" size="large" effect="plain">CORS 防污损: 拦截隔离</el-tag>
        </div>
      </div>
    </el-card>

    <!-- 工作台 -->
    <el-row :gutter="24" class="workspace-row">
      <!-- 左侧控制面板 -->
      <el-col :xs="24" :md="11">
        <el-card shadow="never" class="control-card">
          <template #header>
            <span class="header-text">⚙️ Logo 护栏与容错配置</span>
          </template>

          <el-form label-position="top">
            <el-form-item label="Logo 来源选择">
              <el-radio-group v-model="selectedLogo" @change="customLogoUrl = ''">
                <el-radio-button v-for="item in SAMPLE_LOGOS" :key="item.name" :value="item.url">
                  {{ item.name }}
                </el-radio-button>
              </el-radio-group>
            </el-form-item>

            <el-form-item label="自定义远程 Logo URL (可测试第三方地址)">
              <el-input
                v-model="customLogoUrl"
                placeholder="输入 http/https 远程图片链接或 DataURL"
                clearable
              />
            </el-form-item>

            <el-divider content-position="left">容错与保护圈调优</el-divider>

            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="期望纠错级别 (Error Level)">
                  <el-select v-model="requestedErrorLevel">
                    <el-option label="L (低 7% - 基础)" value="L" />
                    <el-option label="M (中 15% - 常规)" value="M" />
                    <el-option label="Q (高 25% - Logo保底)" value="Q" />
                    <el-option label="H (极高 30% - 工业极限)" value="H" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="容错自动保底提升">
                  <el-switch v-model="autoElevate" active-text="开启(升至Q)" inactive-text="关闭" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="清空 Logo 底层码点">
                  <el-switch
                    v-model="hideBackgroundDots"
                    active-text="开启清空"
                    inactive-text="保留杂点"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item :label="`保护圈边距: ${logoMargin}px`">
                  <el-slider v-model="logoMargin" :min="0" :max="12" :step="1" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-form-item :label="`Logo 尺寸比例: ${(logoSize * 100).toFixed(0)}% (安全上限 30%)`">
              <el-slider v-model="logoSize" :min="0.1" :max="0.35" :step="0.02" />
            </el-form-item>

            <el-divider content-position="left">中心富媒体插槽 (#logo)</el-divider>

            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="开启中心富媒体插槽">
                  <el-switch v-model="enableCenterSlot" active-text="开启" inactive-text="关闭" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="徽章文字">
                  <el-input v-model="centerSlotText" :disabled="!enableCenterSlot" />
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
        </el-card>
      </el-col>

      <!-- 右侧实测与安全导出 -->
      <el-col :xs="24" :md="13">
        <el-card shadow="never" class="preview-card">
          <template #header>
            <div class="card-header">
              <span class="header-text">🛡️ 实时安全预览与导出测试</span>
              <div class="actions">
                <el-button size="small" type="primary" plain @click="handleExport('png')">
                  安全导出 PNG
                </el-button>
                <el-button size="small" type="success" plain @click="handleExport('jpeg')">
                  安全导出 JPEG
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
                :logo="activeLogoUrl"
                :width="240"
                :height="240"
                :auto-elevate-error-correction="autoElevate"
                :logo-margin="logoMargin"
                :logo-size="logoSize"
                :image-options="{
                  hideBackgroundDots,
                }"
                :qr-options="{
                  errorCorrectionLevel: requestedErrorLevel,
                }"
                @logo-error="handleLogoError"
              >
                <!-- 中心富媒体插槽 -->
                <template v-if="enableCenterSlot" #logo>
                  <div class="badge-slot">
                    <span class="badge-text">{{ centerSlotText }}</span>
                  </div>
                </template>

                <div class="qr-sub-info">
                  <el-tag size="small" type="info">内嵌 Logo 容错测试</el-tag>
                </div>
              </AtengQRCode>
            </div>

            <!-- 跨域防污损警告提示 -->
            <el-alert
              v-if="lastLogoError"
              type="warning"
              show-icon
              :closable="false"
              class="security-alert"
            >
              <template #title>
                <strong>CORS 跨域守卫拦截提示：</strong>
              </template>
              {{ lastLogoError }}。守卫已自动隔离有害图片，二维码 Canvas
              保持未污损纯净状态，图片导出依然 100% 成功！
            </el-alert>

            <!-- 运行参数指标 -->
            <div class="metrics-box">
              <el-descriptions :column="2" border size="small">
                <el-descriptions-item label="原始请求容错">
                  <el-tag size="small">{{ requestedErrorLevel }}</el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="实际生效容错">
                  <el-tag size="small" type="success">
                    {{
                      autoElevate &&
                      activeLogoUrl &&
                      (requestedErrorLevel === 'L' || requestedErrorLevel === 'M')
                        ? 'Q (自动提升保底)'
                        : requestedErrorLevel
                    }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="Logo 区域清空">
                  {{ hideBackgroundDots ? '是 (无杂点干扰)' : '否 (底层码点透显)' }}
                </el-descriptions-item>
                <el-descriptions-item label="约束后 Logo 比例">
                  {{ (Math.min(logoSize, 0.3) * 100).toFixed(0) }}%
                </el-descriptions-item>
              </el-descriptions>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.qrcode-logo-guard-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.overview-card,
.control-card,
.preview-card {
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

.status-tags {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.card-header {
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
  padding: 16px 0;
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

.qr-sub-info {
  margin-top: 10px;
}

.badge-slot {
  background: var(--el-color-primary);
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
  letter-spacing: 0.5px;
  border: 2px solid #ffffff;
}

.security-alert {
  width: 100%;
  max-width: 520px;
}

.metrics-box {
  width: 100%;
  max-width: 520px;
}
</style>
