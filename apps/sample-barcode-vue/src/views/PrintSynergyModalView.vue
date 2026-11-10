<script setup lang="ts">
/**
 * 看板 8: 扫码弹窗 (<AtengCodeScannerModal />) 与 @atengk/print-vue 标签套打生态协同展厅。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import {
  AtengBarcode,
  AtengQRCode,
  AtengCodeScannerModal,
  type ScanResult,
} from '@atengk/barcode-vue';
import { AtengLabelSheet, vPrint } from '@atengk/print-vue';

interface MaterialLabel {
  id: string;
  code: string;
  title: string;
  spec: string;
  qrPayload: string;
}

const showScannerModal = ref(false);
const autoClose = ref(true);

const materialList = ref<MaterialLabel[]>([
  {
    id: 'M-001',
    code: 'SKU-69012345001',
    title: '精密伺服驱动电机 400W',
    spec: 'SV-400-A22 / 220V',
    qrPayload: 'https://atengk.com/mat/M-001',
  },
  {
    id: 'M-002',
    code: 'SKU-69012345002',
    title: '工业千兆交换机 8口',
    spec: 'SW-1008-IND / IP40',
    qrPayload: 'https://atengk.com/mat/M-002',
  },
  {
    id: 'M-003',
    code: 'SKU-69012345003',
    title: '高精度激光测距传感器',
    spec: 'LS-200M-CAN / 0.1mm',
    qrPayload: 'https://atengk.com/mat/M-003',
  },
  {
    id: 'M-004',
    code: 'SKU-69012345004',
    title: '嵌入式工控主板 Core-i7',
    spec: 'IPC-9800-ATX / 32G',
    qrPayload: 'https://atengk.com/mat/M-004',
  },
]);

const handleModalScan = (result: ScanResult) => {
  const newIndex = materialList.value.length + 1;
  const newCode = result.text.toUpperCase();

  materialList.value.push({
    id: `M-00${newIndex}`,
    code: newCode,
    title: `扫码入库新物料 #${newIndex}`,
    spec: `AUTO-BATCH-${Date.now().toString().slice(-4)}`,
    qrPayload: `https://atengk.com/scan/${newCode}`,
  });

  ElMessage.success(`已通过脱壳扫码弹窗捕获 [${result.format ?? 'CODE'}] 并加入标签打印队列`);
};

const handleRemoveItem = (id: string) => {
  materialList.value = materialList.value.filter(item => item.id !== id);
  ElMessage.info('已从打印标签队列移除该物料');
};
</script>

<template>
  <div class="print-synergy-modal-view">
    <!-- 头部说明卡片 -->
    <el-card shadow="never" class="overview-card">
      <div class="overview-header">
        <div>
          <h2 class="title">
            扫码弹窗 (<AtengCodeScannerModal />) 与 @atengk/print-vue 批量套打协同
          </h2>
          <p class="subtitle">
            交付开箱即用的轻量脱壳扫码弹窗 <code>&lt;AtengCodeScannerModal /&gt;</code>，基于纯原生
            CSS 变量 + Vue Teleport 驱动， 彻底解耦具体 UI 库；与
            <code>@atengk/print-vue</code> 标签纸套打组件（<code>&lt;AtengLabelSheet /&gt;</code>）
            形成<strong>“扫码识别入库 ➔ 矢量条码/二维码高保真毫米级批量套打”</strong>的工业级闭环。
          </p>
        </div>
        <div class="overview-tags">
          <el-tag type="success" effect="dark">脱壳扫码弹窗 (Teleport)</el-tag>
          <el-tag type="primary">@atengk/print-vue 协同</el-tag>
          <el-tag type="warning">毫米级矢量单据套打</el-tag>
        </div>
      </div>
    </el-card>

    <div class="synergy-layout">
      <!-- 控制与操作栏 -->
      <el-card shadow="never" class="toolbar-card">
        <div class="toolbar-content">
          <div class="left-actions">
            <el-button type="primary" @click="showScannerModal = true">
              📷 弹出扫码弹窗扫入物料 (&lt;AtengCodeScannerModal /&gt;)
            </el-button>
            <el-button v-print="'#material-label-sheet'" type="success" plain>
              🖨️ 触发全页标签纸批量打印 (v-print)
            </el-button>
          </div>

          <div class="right-options">
            <el-checkbox v-model="autoClose">扫码成功后自动关闭弹窗</el-checkbox>
            <el-tag size="small" type="info">当前待打印物料: {{ materialList.length }} 贴</el-tag>
          </div>
        </div>
      </el-card>

      <!-- 批量物料标签套打画板展示区 -->
      <el-card shadow="never" class="sheet-preview-card">
        <template #header>
          <div class="preview-header">
            <span class="preview-title">📑 仓储物料标签纸批量套打预览 (A4 规格 2x2 格局)</span>
            <span class="preview-tip">SVG 纯矢量输出，单据打印物理放大 0 模糊失真</span>
          </div>
        </template>

        <div id="material-label-sheet" class="label-sheet-wrapper">
          <AtengLabelSheet
            :label-width="95"
            :label-height="65"
            :cols="2"
            :rows="2"
            :row-gap="6"
            :col-gap="6"
          >
            <template #default>
              <div
                v-for="mat in materialList.slice(0, 4)"
                :key="mat.id"
                class="material-label-card"
              >
                <div class="label-header">
                  <span class="label-brand">ATENG-WMS</span>
                  <span class="label-id">{{ mat.id }}</span>
                </div>

                <div class="label-title">{{ mat.title }}</div>
                <div class="label-spec">规格: {{ mat.spec }}</div>

                <div class="label-codes-row">
                  <!-- 纯矢量一维条码 -->
                  <div class="barcode-wrapper">
                    <AtengBarcode
                      :value="mat.code"
                      format="CODE128"
                      render-type="svg"
                      :width="1.3"
                      :height="36"
                      :font-size="11"
                      :margin="2"
                    />
                  </div>

                  <!-- 打印专用高对比度二维码 -->
                  <div class="qrcode-wrapper">
                    <AtengQRCode
                      :value="mat.qrPayload"
                      preset="standard"
                      render-type="svg"
                      :size="54"
                      :margin="1"
                    />
                  </div>
                </div>
              </div>
            </template>
          </AtengLabelSheet>
        </div>
      </el-card>

      <!-- 队列物料清单列表卡片 -->
      <el-card shadow="never" class="queue-card">
        <template #header>
          <span class="card-title">📋 待套打标签物料明细</span>
        </template>

        <el-table :data="materialList" size="small" border stripe>
          <el-table-column prop="id" label="物料编号" width="90" />
          <el-table-column prop="code" label="条码编码 (Code128)" width="180">
            <template #default="{ row }">
              <code>{{ row.code }}</code>
            </template>
          </el-table-column>
          <el-table-column prop="title" label="物料名称" min-width="160" />
          <el-table-column prop="spec" label="规格型号" width="160" />
          <el-table-column label="操作" width="90" align="center">
            <template #default="{ row }">
              <el-button link type="danger" size="small" @click="handleRemoveItem(row.id)">
                移除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <!-- 挂载轻量脱壳扫码弹窗组件 -->
    <AtengCodeScannerModal
      v-model="showScannerModal"
      title="仓储物料出入库扫码登记"
      :auto-close-on-success="autoClose"
      scan-mode="all"
      @scan="handleModalScan"
    />
  </div>
</template>

<style scoped>
.print-synergy-modal-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.overview-card,
.toolbar-card,
.sheet-preview-card,
.queue-card {
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

.synergy-layout {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.toolbar-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.left-actions,
.right-options {
  display: flex;
  align-items: center;
  gap: 12px;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.preview-title {
  font-weight: 600;
  font-size: 15px;
}

.preview-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.label-sheet-wrapper {
  display: flex;
  justify-content: center;
  background-color: var(--el-fill-color-darker);
  padding: 24px;
  border-radius: 8px;
  overflow: auto;
}

/* 标签卡片样式 */
.material-label-card {
  width: 100%;
  height: 100%;
  border: 1px dashed #cbd5e1;
  padding: 6px 10px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background-color: #ffffff;
  color: #0f172a;
}

.label-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 2px;
}

.label-brand {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: #1e40af;
}

.label-id {
  font-size: 11px;
  font-family: monospace;
  font-weight: bold;
}

.label-title {
  font-size: 12px;
  font-weight: bold;
  margin-top: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.label-spec {
  font-size: 10px;
  color: #64748b;
  margin-bottom: 2px;
}

.label-codes-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.barcode-wrapper {
  flex: 1;
  overflow: hidden;
  display: flex;
  justify-content: flex-start;
}

.qrcode-wrapper {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}
</style>
