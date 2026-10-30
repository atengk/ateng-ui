<script setup lang="ts">
/**
 * DOCX Editor 场景：A4 物理分页排版与公文合同自验展厅。
 *
 * 验证与展示：
 * 1. AtengDocxEditor 与 AtengPageCanvas A4 真实物理纸张（210mm × 297mm）仿真排版；
 * 2. 纵横向比例（portrait/landscape）与多预设页边距（standard/narrow/wide）动态切换；
 * 3. 顶部毫米级刻度标尺 AtengPageRuler 与左右边距游标滑块；
 * 4. 双击交互式编辑页眉页脚与动态页码标签（第 X 页 / 共 Y 页）；
 * 5. 内容高度实时测量与不破坏编辑的虚拟分页槽；
 * 6. 原生浏览器 A4 物理分页打印与 PDF 导出对齐。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import {
  AtengDocxEditor,
  type AtengDocxEditorInstance,
  type PageOrientation,
  type PageMarginPreset,
} from '@atengk/editor-vue';

const docxEditorRef = ref<AtengDocxEditorInstance | null>(null);

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
      <td>已交付 (Phase 3)</td>
    </tr>
    <tr>
      <td>客户端 docx 纯前端转译</td>
      <td>核心团队</td>
      <td>OpenXML 工业级导出</td>
      <td>已交付 (工单 #199)</td>
    </tr>
    <tr>
      <td>AtengDocxEditor 场景预设</td>
      <td>Ateng</td>
      <td>A4 物理分页与标尺</td>
      <td>已交付 (Phase 3)</td>
    </tr>
  </tbody>
</table>

<blockquote>
  <p>备注：公文排版支持纯前端一键导出标准二进制 .docx 文件与原生浏览器 A4 物理分页打印。</p>
</blockquote>`;

const docxContent = ref<string>(defaultDocxHtml);
const orientation = ref<PageOrientation>('portrait');
const pageMargin = ref<PageMarginPreset>('standard');
const showRuler = ref<boolean>(true);
const headerText = ref<string>('关于加快推进数字化基础设施转型的指导意见');
const footerText = ref<string>('绝密公文 · 内部流通 · 严禁翻印');
const currentPageCount = ref<number>(1);
const isExporting = ref<boolean>(false);

const handleExportDocx = async (): Promise<void> => {
  if (!docxEditorRef.value) return;
  try {
    isExporting.value = true;
    const blob = await docxEditorRef.value.exportDocx({
      fileName: '企业数字化基础设施指导意见.docx',
      orientation: orientation.value,
      pageMargin: pageMargin.value,
      header: headerText.value,
      footer: footerText.value,
      showPageNumber: true,
    });
    ElMessage.success(
      `🎉 成功在客户端生成并下载标准 Word 文档（${(blob.size / 1024).toFixed(1)} KB）！`,
    );
  } catch (error) {
    ElMessage.error(`导出 Word 失败: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    isExporting.value = false;
  }
};

const handlePrintPreview = (): void => {
  docxEditorRef.value?.print();
};

const handlePageCountChange = (count: number): void => {
  currentPageCount.value = count;
};
</script>

<template>
  <div class="docx-scenario">
    <div class="scenario-intro">
      <div class="intro-title">
        <span class="badge">Phase 3 工业级排版</span>
        <h2>📄 DOCX Editor：A4 物理分页仿真与公文排版预设</h2>
      </div>
      <p class="intro-desc">
        面向标书、公文拟发、法律合同与红头通知等场景打造。解决传统 Web 富文本“无界滚动流”无法进行 A4
        纸张物理对齐、动态跨页断行与页码计算的顽疾。支持双向绑定、双击交互式编辑页眉页脚与厘米标尺。
      </p>

      <div class="intro-cards">
        <div class="card-item">
          <div class="card-title">🖨️ A4 物理纸张与断页槽</div>
          <div class="card-text">
            严格对齐 210mm × 297mm
            物理规格与纸张阴影，内容超出单页可用高度时自动计算总页数并呈现虚拟断页槽。
          </div>
        </div>
        <div class="card-item">
          <div class="card-title">📐 页边距辅助标尺与排版</div>
          <div class="card-text">
            顶部悬浮动态毫米级刻度标尺，支持纵向/横向比例切换与标准/窄/宽多档页边距即时响应。
          </div>
        </div>
        <div class="card-item">
          <div class="card-title">📑 双击交互式页眉页脚与页码</div>
          <div class="card-text">
            双击直接在行内编辑页眉页脚文字，自动计算并展示“第 X 页 / 共 Y 页”动态页码标签。
          </div>
        </div>
        <div class="card-item">
          <div class="card-title">💾 纯前端 OpenXML 二进制导出</div>
          <div class="card-text">
            对齐浏览器 A4 物理打印与即将到来的纯前端 .docx 文件二进制 AST 导出。
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

          <el-radio-group v-model="pageMargin" size="small">
            <el-radio-button value="standard">标准边距 (25.4mm)</el-radio-button>
            <el-radio-button value="narrow">窄边距 (12.7mm)</el-radio-button>
            <el-radio-button value="wide">宽边距 (50.8mm)</el-radio-button>
          </el-radio-group>

          <el-switch v-model="showRuler" active-text="显示刻度标尺" />
        </div>

        <div class="right-actions">
          <el-tag type="info" size="small">
            📄 当前预估页数：{{ docxEditorRef?.totalPages ?? currentPageCount }} 页
          </el-tag>
          <el-button type="primary" size="small" :loading="isExporting" @click="handleExportDocx">
            💾 导出为 Word (.docx)
          </el-button>
          <el-button size="small" @click="handlePrintPreview"> 🖨️ 浏览器物理打印预览 </el-button>
        </div>
      </div>
    </el-card>

    <!-- 真实 AtengDocxEditor 场景预设挂载 -->
    <div class="docx-editor-wrapper">
      <AtengDocxEditor
        ref="docxEditorRef"
        v-model="docxContent"
        :orientation="orientation"
        :page-margin="pageMargin"
        :show-ruler="showRuler"
        :header="headerText"
        :footer="footerText"
        :show-page-number="true"
        placeholder="请输入正规公文或合同正文..."
        @update:header="val => (headerText = val)"
        @update:footer="val => (footerText = val)"
        @page-count-change="handlePageCountChange"
      />
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
  background-color: var(--el-color-success-light-9, #f0f9eb);
  color: var(--el-color-success, #67c23a);
  border: 1px solid var(--el-color-success-light-5, #c2e7b0);
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

.right-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.docx-editor-wrapper {
  width: 100%;
  display: flex;
  flex-direction: column;
}

@media print {
  .scenario-intro,
  .control-panel {
    display: none !important;
  }
}
</style>
