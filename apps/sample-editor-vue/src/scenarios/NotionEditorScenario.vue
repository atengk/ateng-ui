<script setup lang="ts">
/**
 * Notion-like Editor 场景：现代沉浸式无界白板自验展厅。
 *
 * 验证：
 * 1. AtengNotionEditor 预设纯净无顶栏无界白板流式体验；
 * 2. 原生左侧六点悬浮手柄 (AtengDragHandle) 悬停感知、拖拽重排与块级快捷菜单；
 * 3. 纯原生重点高亮卡片 (CalloutBlock) 4 态语义呈现与交互；
 * 4. 纯原生交互式折叠列表 (ToggleList) 展开与收起；
 * 5. 键入 "/" 触发斜杠物料面板（集成 Callout、Toggle、待办与表格）；
 * 6. 响应式白板排版（居中限制宽度）与实例多轨数据绑定。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { AtengNotionEditor, type AtengNotionEditorInstance } from '@atengk/editor-vue';

const editorRef = ref<AtengNotionEditorInstance | null>(null);

const defaultHtml = `<h1>🚀 Notion-like 现代沉浸式知识库白板</h1>
<p>这是专为<strong>团队知识库</strong>、<strong>产品需求文档 (PRD)</strong> 与<strong>敏捷在线协作</strong>打造的白板流式预设。</p>

<div class="at-editor-callout at-editor-callout--info" data-callout-type="info" data-callout-icon="💡">
  <div class="at-editor-callout__content">
    <p><strong>架构提示</strong>：纯净无顶栏设计，完全依赖左侧六点拖拽手柄、划词微气泡与键盘 <code>/</code> 斜杠快捷物料流转。</p>
  </div>
</div>

<div class="at-editor-toggle is-open" data-open="true">
  <div class="at-editor-toggle__content">
    <p><strong>📌 点击左侧小三角即可折叠/展开本节内容：核心优势盘点</strong></p>
    <p>1. <strong>六点拖拽手柄</strong>：鼠标悬停任意块左侧浮出，支持上下拖拽直接重排文档，点击可调出块级转换菜单；</p>
    <p>2. <strong>Callout 高亮卡片</strong>：内置提示 (info)、警告 (warning)、错误 (error)、成功 (success) 4 态语义色彩；</p>
    <p>3. <strong>Toggle 折叠列表</strong>：原地折叠下属大段内容或二级清单，保证超长文档排版条理清晰。</p>
  </div>
</div>

<div class="at-editor-callout at-editor-callout--warning" data-callout-type="warning" data-callout-icon="⚠️">
  <div class="at-editor-callout__content">
    <p><strong>避坑指南</strong>：在编辑区空白处输入 <code>&gt;&gt;&nbsp;</code> 可一键创建折叠列表，输入 <code>&gt;!&nbsp;</code> 可直接创建高亮卡片。</p>
  </div>
</div>

<ul data-type="taskList">
  <li data-type="taskItem" data-checked="true">发布 AtengNotionEditor 纯原生沉浸白板预设</li>
  <li data-type="taskItem" data-checked="true">实现原生六点手柄块级位移与块菜单</li>
  <li data-type="taskItem" data-checked="true">交付 CalloutBlock 4 态语义高亮与 ToggleList 折叠扩展</li>
  <li data-type="taskItem" data-checked="false">探索 Agent AI 边写边审与 DOCX 物理分页排版</li>
</ul>

<div class="at-editor-callout at-editor-callout--success" data-callout-type="success" data-callout-icon="✅">
  <div class="at-editor-callout__content">
    <p><strong>准出合格</strong>：所有扩展与交互均通过离线全自洽单元测试守护，零外部 UI 框架依赖！</p>
  </div>
</div>`;

const content = ref<string>(defaultHtml);
const enableDragHandle = ref<boolean>(true);
const enableSlashCommand = ref<boolean>(true);
const enableBubbleMenu = ref<boolean>(true);
const canvasWidth = ref<string>('860px');
const isReadOnly = ref<boolean>(false);
const activeTab = ref<string>('html');

const handleInsertCallout = (type: 'info' | 'warning' | 'error' | 'success') => {
  const icons = { info: '💡', warning: '⚠️', error: '🚫', success: '✅' };
  editorRef.value?.editor?.chain().focus().toggleCalloutBlock({ type, icon: icons[type] }).run();
  ElMessage.success(`已应用 ${type} 重点高亮强调块`);
};

const handleInsertToggle = () => {
  editorRef.value?.editor?.chain().focus().toggleToggleList({ open: true }).run();
  ElMessage.success('已应用交互式折叠列表');
};

const handleToggleFullscreen = () => {
  editorRef.value?.toggleFullscreen();
};
</script>

<template>
  <div class="notion-editor-scenario">
    <div class="scenario-header">
      <div class="title-group">
        <h3>AtengNotionEditor 沉浸式知识库白板预设</h3>
        <p class="subtitle">
          纯净无顶栏无界画布，由左侧六点手柄、划词微气泡与 <code>/</code> 斜杠快捷面板驱动，内置
          Callout 4 态卡片与 Toggle 块级折叠。
        </p>
      </div>
      <div class="header-actions">
        <el-button-group>
          <el-button size="small" type="primary" plain @click="handleInsertCallout('info')">
            💡 插入提示
          </el-button>
          <el-button size="small" type="warning" plain @click="handleInsertCallout('warning')">
            ⚠️ 插入警告
          </el-button>
          <el-button size="small" type="danger" plain @click="handleInsertCallout('error')">
            🚫 插入错误
          </el-button>
          <el-button size="small" type="success" plain @click="handleInsertCallout('success')">
            ✅ 插入成功
          </el-button>
          <el-button size="small" plain @click="handleInsertToggle"> ▶ 折叠列表 </el-button>
          <el-button size="small" plain @click="handleToggleFullscreen"> ⛶ 全屏白板 </el-button>
        </el-button-group>
      </div>
    </div>

    <!-- 操控面板 -->
    <div class="scenario-toolbar">
      <div class="toolbar-item">
        <span class="label">画布宽度：</span>
        <el-radio-group v-model="canvasWidth" size="small">
          <el-radio-button value="760px">760px 紧凑</el-radio-button>
          <el-radio-button value="860px">860px 默认</el-radio-button>
          <el-radio-button value="1000px">1000px 宽屏</el-radio-button>
          <el-radio-button value="100%">100% 满宽</el-radio-button>
        </el-radio-group>
      </div>

      <div class="toolbar-item">
        <el-checkbox v-model="enableDragHandle">启用六点手柄</el-checkbox>
        <el-checkbox v-model="enableSlashCommand">启用斜杠命令 (/)</el-checkbox>
        <el-checkbox v-model="enableBubbleMenu">启用划词气泡</el-checkbox>
        <el-checkbox v-model="isReadOnly">只读模式</el-checkbox>
      </div>
    </div>

    <!-- 白板编辑主区域 -->
    <div class="canvas-wrapper">
      <AtengNotionEditor
        ref="editorRef"
        v-model="content"
        :drag-handle="enableDragHandle"
        :slash-command="enableSlashCommand"
        :bubble-menu="enableBubbleMenu"
        :read-only="isReadOnly"
        :max-width="canvasWidth"
        min-height="450px"
        placeholder="在此输入内容，或键入 '/' 插入物料块..."
      />
    </div>

    <!-- 实时数据审阅抽屉/卡片 -->
    <div class="scenario-output">
      <el-tabs v-model="activeTab" type="border-card">
        <el-tab-pane label="实时 HTML 产物" name="html">
          <pre class="code-preview"><code>{{ content }}</code></pre>
        </el-tab-pane>
        <el-tab-pane label="实时 Markdown 产物" name="markdown">
          <pre class="code-preview"><code>{{ editorRef?.getMarkdown() }}</code></pre>
        </el-tab-pane>
        <el-tab-pane label="ProseMirror AST JSON" name="json">
          <pre
            class="code-preview"
          ><code>{{ JSON.stringify(editorRef?.getJSON(), null, 2) }}</code></pre>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<style scoped>
.notion-editor-scenario {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 1100px;
  margin: 0 auto;
  padding: 8px 16px;
}

.scenario-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  padding-bottom: 12px;
}

.title-group h3 {
  margin: 0 0 6px;
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.subtitle {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.scenario-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding: 10px 14px;
  background-color: var(--el-fill-color-light);
  border-radius: var(--el-border-radius-base);
  border: 1px solid var(--el-border-color-lighter);
}

.toolbar-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.toolbar-item .label {
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.canvas-wrapper {
  background-color: var(--el-bg-color);
  border: 1px dashed var(--el-border-color);
  border-radius: 8px;
  padding: 24px 16px;
  min-height: 500px;
  box-shadow: var(--el-box-shadow-lighter);
  transition: all 0.2s ease;
}

.scenario-output {
  margin-top: 12px;
}

.code-preview {
  margin: 0;
  max-height: 240px;
  overflow: auto;
  font-family: monospace;
  font-size: 12px;
  line-height: 1.5;
  background-color: var(--el-fill-color-darker);
  color: var(--el-text-color-primary);
  padding: 12px;
  border-radius: 4px;
}
</style>
