<script setup lang="ts">
/**
 * DOCX Editor 场景：A4 物理分页排版与公文合同自验展厅。
 *
 * 验证与展示：
 * 1. AtengEditor 多态门面 mode="docx" 公文排版模式挂载；
 * 2. 对标 Phase 3（工单 #198 / #199）A4 物理纸张（210mm × 297mm）仿真排版体验；
 * 3. 动态虚拟断页槽、页边距标尺与双击交互式页眉页脚页码规划；
 * 4. 纯前端 prosemirrorJsonToDocxBlob OpenXML 二进制生成与合规打印蓝图。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { AtengEditor, type AtengEditorInstance } from '@atengk/editor-vue';

const editorRef = ref<AtengEditorInstance | null>(null);

const defaultDocxHtml = `<h1 style="text-align: center;">关于加快推进数字化基础设施转型的指导意见</h1>
<p style="text-align: center; color: #888;">〔2026〕创发字第 1024 号 · 绝密文件</p>
<hr />
<p>各直属业务中心、平台工程架构组、前端基础设施实验室：</p>
<p>为全面对标国际一流研发基础设施水准，贯彻落实<strong>企业级基础设施核心套件自主可控</strong>战略决策，现就全面推进现代富文本与内容创作预设体系（L2 专用扩展层）建设提出如下实施细则：</p>

<h3>第一条 总体目标与排版基准</h3>
<p>严格恪守 <strong>A4 物理纸张（210mm × 297mm）</strong>规范，建立符合印刷排版合规标准的边距与跨页渲染流水线。在纯前端环境下消除因不同客户端视口缩放导致的公文格式跑版缺陷。</p>

<h3>第二条 核心履约与验收责任制</h3>
<table style="width: 100%; border-collapse: collapse;">
  <thead>
    <tr>
      <th>工程模块</th>
      <th>责任人</th>
      <th>排版规格</th>
      <th>交付状态</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>PageCanvas 仿真纸张</td>
      <td>核心团队</td>
      <td>A4 纵横向动态标尺</td>
      <td>规划中 (Phase 3)</td>
    </tr>
    <tr>
      <td>客户端 docx 纯前端转译</td>
      <td>核心团队</td>
      <td>OpenXML 工业级导出</td>
      <td>规划中 (Phase 3)</td>
    </tr>
    <tr>
      <td>AtengEditor 多态门面分发</td>
      <td>Ateng</td>
      <td>mode="docx" 原位分发</td>
      <td>已就绪 (Phase 1)</td>
    </tr>
  </tbody>
</table>

<blockquote>
  <p>备注：公文排版支持纯前端一键导出标准二进制 .docx 文件与原生浏览器 A4 物理分页打印。</p>
</blockquote>`;

const docxContent = ref<string>(defaultDocxHtml);
const orientation = ref<'portrait' | 'landscape'>('portrait');
const showRuler = ref<boolean>(true);
const simulatedPageCount = ref<number>(2);

const handleSimulatedExport = (): void => {
  ElMessage.success(
    '🚀 已调起 Phase 3 docx 二进制 AST 转译器（演示中：纯前端生成并自动下载 .docx 文件）',
  );
};

const handlePrintPreview = (): void => {
  window.print();
};
</script>

<template>
  <div class="docx-scenario">
    <div class="scenario-intro">
      <div class="intro-title">
        <span class="badge">Phase 3 蓝图</span>
        <h2>📄 DOCX Editor：A4 物理分页仿真与公文排版预设</h2>
      </div>
      <p class="intro-desc">
        面向标书、公文拟发、法律合同与红头通知等场景打造。解决传统 Web 富文本“无界滚动流”无法进行 A4
        纸张物理对齐、动态跨页断行与页码计算的顽疾。底层通过
        <code>&lt;AtengEditor mode="docx" /&gt;</code> 多态门面直接接入。
      </p>

      <div class="intro-cards">
        <div class="card-item">
          <div class="card-title">🖨️ A4 物理纸张与断页槽</div>
          <div class="card-text">
            严格对齐 210mm × 297mm
            纸张比例与阴影渲染，监听内容高度并在跨页时自适应插入物理断页缝隙。
          </div>
        </div>
        <div class="card-item">
          <div class="card-title">📐 页边距辅助标尺与排版</div>
          <div class="card-text">
            顶部与左侧悬浮动态毫米标尺，支持直观拖拽页边距并在不同纸张方向（纵向/横向）间无缝切换。
          </div>
        </div>
        <div class="card-item">
          <div class="card-title">📑 动态页眉页脚与页码</div>
          <div class="card-text">
            双击交互式编辑页眉公文标识，页脚自动计算“第 X 页 / 共 Y 页”，打印排版 100% 还原。
          </div>
        </div>
        <div class="card-item">
          <div class="card-title">💾 纯前端 OpenXML 二进制导出</div>
          <div class="card-text">
            基于 AST 转译直接在浏览器生成合法 <code>.docx</code> 二进制文件，零后端服务依赖。
          </div>
        </div>
      </div>
    </div>

    <!-- 操控面板 -->
    <el-card shadow="never" class="control-panel">
      <div class="controls-row">
        <div class="left-controls">
          <el-radio-group v-model="orientation" size="small">
            <el-radio-button value="portrait">纵向排版 (A4 Portrait)</el-radio-button>
            <el-radio-button value="landscape">横向排版 (A4 Landscape)</el-radio-button>
          </el-radio-group>

          <el-switch v-model="showRuler" active-text="显示毫米标尺 (Ruler)" />
        </div>

        <div class="right-actions">
          <el-button type="primary" size="small" @click="handleSimulatedExport">
            💾 导出为 Word (.docx)
          </el-button>
          <el-button size="small" @click="handlePrintPreview"> 🖨️ 浏览器物理打印预览 </el-button>
        </div>
      </div>
    </el-card>

    <!-- 纸张仿真容器 -->
    <div
      class="docx-canvas-wrapper"
      :class="{
        'is-landscape': orientation === 'landscape',
        'has-ruler': showRuler,
      }"
    >
      <div v-if="showRuler" class="mock-ruler">
        <span class="ruler-mark">0</span>
        <span class="ruler-mark">50mm</span>
        <span class="ruler-mark">100mm</span>
        <span class="ruler-mark">150mm</span>
        <span class="ruler-mark">210mm (A4)</span>
      </div>

      <div class="paper-sheet">
        <div class="paper-header">
          <span>〔发文字号〕创发〔2026〕1024号</span>
          <span>内部绝密 · 严禁翻印</span>
        </div>

        <AtengEditor
          ref="editorRef"
          v-model="docxContent"
          mode="docx"
          placeholder="请输入公文正文内容..."
          min-height="600px"
        />

        <div class="paper-footer">
          <span>第 1 页 / 共 {{ simulatedPageCount }} 页</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.docx-scenario {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.scenario-intro {
  background: var(--el-bg-color, #ffffff);
  border: 1px solid var(--el-border-color-lighter, #ebeef5);
  border-radius: 8px;
  padding: 20px 24px;
}

.intro-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.intro-title h2 {
  margin: 0;
  font-size: 18px;
  color: var(--el-text-color-primary, #303133);
}

.badge {
  background-color: var(--el-color-warning-light-9, #fdf6ec);
  color: var(--el-color-warning, #e6a23c);
  border: 1px solid var(--el-color-warning-light-5, #f3d19e);
  font-size: 12px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
}

.intro-desc {
  margin: 8px 0 16px;
  font-size: 13px;
  color: var(--el-text-color-secondary, #606266);
  line-height: 1.6;
}

.intro-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.card-item {
  padding: 12px;
  background-color: var(--el-fill-color-light, #f5f7fa);
  border-radius: 6px;
  border-left: 3px solid var(--el-color-primary, #409eff);
}

.card-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 4px;
  color: var(--el-text-color-primary, #303133);
}

.card-text {
  font-size: 12px;
  color: var(--el-text-color-secondary, #909399);
  line-height: 1.4;
}

.control-panel {
  border-radius: 8px;
}

.controls-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.left-controls {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.docx-canvas-wrapper {
  background: var(--el-fill-color-darker, #dcdfe6);
  padding: 32px 16px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 800px;
}

.mock-ruler {
  width: 794px;
  height: 24px;
  background: var(--el-fill-color, #f0f2f5);
  border: 1px solid var(--el-border-color, #dcdfe6);
  border-bottom: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px;
  box-sizing: border-box;
  font-size: 11px;
  color: var(--el-text-color-secondary, #909399);
}

.paper-sheet {
  width: 794px; /* A4 纵向 96DPI 像素宽度约 794px */
  background: #ffffff;
  color: #303133;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  padding: 48px 56px;
  box-sizing: border-box;
  min-height: 1123px; /* A4 纵向 96DPI 像素高度约 1123px */
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
}

.is-landscape .paper-sheet {
  width: 1123px;
  min-height: 794px;
}

.is-landscape .mock-ruler {
  width: 1123px;
}

.paper-header {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #909399;
  border-bottom: 1px solid #ebeef5;
  padding-bottom: 8px;
  margin-bottom: 24px;
}

.paper-footer {
  display: flex;
  justify-content: center;
  font-size: 12px;
  color: #909399;
  border-top: 1px solid #ebeef5;
  padding-top: 8px;
  margin-top: 24px;
}

@media print {
  .scenario-intro,
  .control-panel,
  .mock-ruler {
    display: none !important;
  }

  .docx-canvas-wrapper {
    background: transparent !important;
    padding: 0 !important;
  }

  .paper-sheet {
    box-shadow: none !important;
    padding: 0 !important;
    width: 100% !important;
    min-height: auto !important;
  }
}
</style>
