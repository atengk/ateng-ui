<script setup lang="ts">
/**
 * 仓储货架物料条码/资产标签预设组件。
 *
 * 规范工业热敏标签纸高密度微小字号排版，包含物料名称、SKU、库位代码、批次与二维码标定块。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { computed } from 'vue';
import type { AtengLabelSheetProps } from '../../types/presets';

const props = withDefaults(defineProps<AtengLabelSheetProps>(), {
  materialName: '高精度工业光学编码器',
  materialCode: 'SKU-MOT-2026-088',
  spec: '1024 P/R 差分输出 24V',
  batchNo: 'BATCH-202611-A',
  location: '库位: A-03-24',
  unit: 'PCS (个)',
  date: () => new Date().toISOString().slice(0, 10),
  qrValue: 'SKU-MOT-2026-088',
  sizePreset: 'medium',
});

const sizeStyle = computed(() => {
  switch (props.sizePreset) {
    case 'small':
      return { width: '40mm', height: '30mm', fontSize: '9px' };
    case 'large':
      return { width: '80mm', height: '50mm', fontSize: '12px' };
    case 'medium':
    default:
      return { width: '60mm', height: '40mm', fontSize: '10.5px' };
  }
});
</script>

<template>
  <div class="at-label-sheet" :style="sizeStyle">
    <!-- 头部物料标题与库位标识 -->
    <div class="at-label-sheet__header">
      <strong class="title">{{ materialName }}</strong>
      <span class="location-badge">{{ location }}</span>
    </div>

    <!-- 主体：左侧属性字段，右侧二维码块 -->
    <div class="at-label-sheet__body">
      <div class="fields-col">
        <div class="field-item">
          <span class="label">编码:</span>
          <span class="val font-mono">{{ materialCode }}</span>
        </div>
        <div class="field-item">
          <span class="label">规格:</span>
          <span class="val text-truncate">{{ spec }}</span>
        </div>
        <div class="field-item">
          <span class="label">批次:</span>
          <span class="val font-mono">{{ batchNo }}</span>
        </div>
        <div class="field-item">
          <span class="label">入库:</span>
          <span class="val">{{ date }} ({{ unit }})</span>
        </div>
      </div>

      <!-- 二维码几何拟真块 -->
      <div class="qr-col">
        <svg viewBox="0 0 40 40" class="qr-svg">
          <!-- 模拟 QR 码三个角的探测方块 -->
          <rect x="2" y="2" width="10" height="10" fill="#000000" />
          <rect x="4" y="4" width="6" height="6" fill="#ffffff" />
          <rect x="5.5" y="5.5" width="3" height="3" fill="#000000" />

          <rect x="28" y="2" width="10" height="10" fill="#000000" />
          <rect x="30" y="4" width="6" height="6" fill="#ffffff" />
          <rect x="31.5" y="5.5" width="3" height="3" fill="#000000" />

          <rect x="2" y="28" width="10" height="10" fill="#000000" />
          <rect x="4" y="30" width="6" height="6" fill="#ffffff" />
          <rect x="5.5" y="31.5" width="3" height="3" fill="#000000" />

          <!-- 点阵数据点 -->
          <rect x="15" y="5" width="3" height="3" fill="#000000" />
          <rect x="21" y="8" width="3" height="3" fill="#000000" />
          <rect x="16" y="16" width="4" height="4" fill="#000000" />
          <rect x="22" y="18" width="3" height="3" fill="#000000" />
          <rect x="15" y="26" width="3" height="3" fill="#000000" />
          <rect x="20" y="31" width="4" height="4" fill="#000000" />
          <rect x="30" y="22" width="3" height="3" fill="#000000" />
          <rect x="33" y="30" width="3" height="3" fill="#000000" />
        </svg>
      </div>
    </div>
  </div>
</template>

<style scoped>
.at-label-sheet {
  background-color: #ffffff;
  border: 1px solid #000000;
  box-sizing: border-box;
  padding: 4px 6px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #000000;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow: hidden;
}

.at-label-sheet__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #000000;
  padding-bottom: 2px;
  margin-bottom: 3px;
}

.at-label-sheet__header .title {
  font-size: 1.1em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 70%;
}

.location-badge {
  background-color: #000000;
  color: #ffffff;
  padding: 1px 4px;
  font-size: 0.85em;
  font-weight: bold;
  border-radius: 2px;
}

.at-label-sheet__body {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
}

.fields-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.field-item {
  display: flex;
  line-height: 1.25;
}

.field-item .label {
  font-weight: 600;
  color: #333333;
  margin-right: 3px;
  flex-shrink: 0;
}

.field-item .val {
  color: #000000;
}

.font-mono {
  font-family: Consolas, monospace;
}

.text-truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.qr-col {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.qr-svg {
  width: 100%;
  height: 100%;
}
</style>
