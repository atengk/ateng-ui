<script setup lang="ts">
/**
 * 场景七：全景高清快照与防泄密安全水印 (SnapshotWatermarkScenario)。
 *
 * 验证 FlowSnapshot 工业级快照与安全能力：
 * 1. 最小外接边界自适应计算：自动根据图元分布计算边界与留白 Padding；
 * 2. 视网膜抗锯齿高清防虚：支持 2x/3x DPR 栅格化导出，彻底消除模糊发虚；
 * 3. 矢量 SVG 与安全文本矩阵水印：支持纯前端防泄密旋转倾斜矩阵水印与原位缩略图预览。
 *
 * @author Ateng
 * @since 2026-11-05
 */

import { ref, onUnmounted } from 'vue';
import {
  AtengFlowDesigner,
  FlowNodeType,
  FlowSnapshot,
  DEFAULT_STENCIL_GROUPS,
  type FlowGraph,
  type FlowSnapshotOptions,
  type AtengFlowDesignerInstance,
} from '@atengk/flow-vue';

const designerRef = ref<AtengFlowDesignerInstance | null>(null);
const snapshotFormat = ref<'png' | 'jpeg' | 'webp' | 'svg'>('png');
const snapshotDpr = ref<number>(2);
const snapshotPadding = ref<number>(40);
const snapshotEnableWatermark = ref<boolean>(true);
const snapshotWatermarkText = ref<string>('内部机密流转 @张三 2026-11-05');
const previewImageUrl = ref<string>('');
const isExporting = ref<boolean>(false);

const initialGraph: FlowGraph = {
  nodes: [
    {
      id: 'start-1',
      type: FlowNodeType.START,
      x: 120,
      y: 180,
      text: '立项申报',
    },
    {
      id: 'task-review',
      type: FlowNodeType.USER_TASK,
      x: 320,
      y: 180,
      text: '技术委员会评审',
      properties: { assignee: 'role:tech_committee' },
    },
    {
      id: 'task-fund',
      type: FlowNodeType.USER_TASK,
      x: 540,
      y: 180,
      text: '资金专项拨付',
      properties: { assignee: 'role:fund_manager' },
    },
    {
      id: 'end-1',
      type: FlowNodeType.END,
      x: 760,
      y: 180,
      text: '立项办结',
    },
  ],
  edges: [
    { id: 'e1', type: 'polyline', sourceNodeId: 'start-1', targetNodeId: 'task-review' },
    { id: 'e2', type: 'polyline', sourceNodeId: 'task-review', targetNodeId: 'task-fund' },
    { id: 'e3', type: 'polyline', sourceNodeId: 'task-fund', targetNodeId: 'end-1' },
  ],
};

const graphData = ref<FlowGraph>(JSON.parse(JSON.stringify(initialGraph)));

const getOptions = (): FlowSnapshotOptions => {
  return {
    format: snapshotFormat.value,
    dpr: snapshotDpr.value,
    padding: snapshotPadding.value,
    backgroundColor: '#ffffff',
    watermark: snapshotEnableWatermark.value
      ? {
          text: snapshotWatermarkText.value,
          font: '14px sans-serif',
          color: 'rgba(150, 150, 150, 0.22)',
          angle: -25,
          gapX: 180,
          gapY: 100,
        }
      : undefined,
  };
};

const handleGeneratePreview = async () => {
  const lf = designerRef.value?.lf;
  if (!lf) return;

  isExporting.value = true;
  try {
    const opts = getOptions();
    if (opts.format === 'svg') {
      const svg = FlowSnapshot.getSvgString(lf);
      previewImageUrl.value = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    } else {
      const dataUrl = await FlowSnapshot.getSnapshot(lf, opts);
      previewImageUrl.value = dataUrl;
    }
  } catch (err) {
    alert(`生成快照失败: ${String(err)}`);
  } finally {
    isExporting.value = false;
  }
};

const handleDownloadSnapshot = async () => {
  const lf = designerRef.value?.lf;
  if (!lf) return;

  try {
    const opts = getOptions();
    await FlowSnapshot.download(lf, '流程全景高清快照', opts);
  } catch (err) {
    alert(`下载快照失败: ${String(err)}`);
  }
};

onUnmounted(() => {
  if (designerRef.value?.lf) {
    try {
      designerRef.value.lf.destroy();
    } catch {
      // 容错
    }
  }
});
</script>

<template>
  <div class="scenario-snapshot">
    <div class="scenario-toolbar">
      <div class="toolbar-left">
        <span class="toolbar-title">全景高清快照与安全水印导出展厅</span>
        <el-tag size="small" type="primary">2x / 3x DPR 视网膜抗锯齿</el-tag>
        <el-tag size="small" type="success">防泄密文本矩阵水印</el-tag>
      </div>
      <div class="toolbar-right">
        <el-button
          type="primary"
          size="small"
          :loading="isExporting"
          @click="handleGeneratePreview"
        >
          🖼️ 原地生成快照预览
        </el-button>
        <el-button size="small" @click="handleDownloadSnapshot">💾 物理下载快照文件</el-button>
      </div>
    </div>

    <!-- 快照参数控制栏 -->
    <div class="config-bar">
      <div class="config-item">
        <span class="config-label">导出格式:</span>
        <el-radio-group v-model="snapshotFormat" size="small">
          <el-radio-button value="png">PNG</el-radio-button>
          <el-radio-button value="jpeg">JPEG</el-radio-button>
          <el-radio-button value="webp">WebP</el-radio-button>
          <el-radio-button value="svg">SVG 矢量</el-radio-button>
        </el-radio-group>
      </div>

      <div class="config-item">
        <span class="config-label">清晰度 DPR:</span>
        <el-radio-group v-model="snapshotDpr" size="small">
          <el-radio-button :value="1">1x 标准</el-radio-button>
          <el-radio-button :value="2">2x 视网膜</el-radio-button>
          <el-radio-button :value="3">3x 超清</el-radio-button>
        </el-radio-group>
      </div>

      <div class="config-item">
        <el-checkbox v-model="snapshotEnableWatermark" label="启用防泄密矩阵水印" />
      </div>

      <div v-if="snapshotEnableWatermark" class="config-item watermark-text-box">
        <el-input
          v-model="snapshotWatermarkText"
          size="small"
          placeholder="自定义水印文本"
          style="width: 240px"
        />
      </div>
    </div>

    <div class="main-body">
      <div class="designer-canvas-box">
        <AtengFlowDesigner
          ref="designerRef"
          v-model="graphData"
          :stencil-groups="DEFAULT_STENCIL_GROUPS"
        />
      </div>

      <!-- 原地预览卡片 -->
      <div v-if="previewImageUrl" class="preview-panel">
        <div class="preview-header">
          <span class="preview-title">快照生成效果 (原位回显预览)</span>
          <el-button link type="primary" size="small" @click="previewImageUrl = ''">收起</el-button>
        </div>
        <div class="preview-img-box">
          <img :src="previewImageUrl" alt="流程快照预览" class="snapshot-img" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scenario-snapshot {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 8px;
  background-color: #ffffff;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  padding: 10px;
  box-sizing: border-box;
}

.scenario-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-title {
  font-weight: 700;
  font-size: 14px;
  color: #1e293b;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.config-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  background-color: #f8fafc;
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.config-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.config-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

.main-body {
  flex: 1;
  display: flex;
  gap: 12px;
  min-height: 520px;
  overflow: hidden;
}

.designer-canvas-box {
  flex: 1;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  overflow: hidden;
}

.preview-panel {
  width: 340px;
  display: flex;
  flex-direction: column;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background-color: #f8fafc;
  padding: 10px;
  box-sizing: border-box;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.preview-title {
  font-weight: 600;
  font-size: 12px;
  color: #1e293b;
}

.preview-img-box {
  flex: 1;
  overflow: auto;
  background-color: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
}

.snapshot-img {
  max-width: 100%;
  max-height: 100%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}
</style>
