<script setup lang="ts">
/**
 * Simple Editor 场景：经典轻量自适应富文本自验展厅。
 *
 * 验证：
 * 1. AtengSimpleEditor 独立预设开箱即用；
 * 2. 紧凑单行自适应响应式折叠工具栏与“更多 (•••)”菜单；
 * 3. 声明式 tools 筛选工具集与 dense 紧凑模式；
 * 4. 彻底隔离斜杠面板与选区浮层，零输入干扰；
 * 5. Ref 实例方法与多轨数据绑定。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import {
  AtengSimpleEditor,
  type AtengSimpleEditorInstance,
  type SimpleToolbarItem,
} from '@atengk/editor-vue';

const editorRef = ref<AtengSimpleEditorInstance | null>(null);

const defaultHtml = `<h2>📝 Simple Editor 经典轻量富文本</h2>
<p>这是专为<strong>常规业务表单</strong>、<strong>博客发布</strong>与<strong>审批流备注</strong>量身定制的轻量级预设。</p>
<p>具备以下设计优势：</p>
<ul>
  <li><strong>单行自适应响应式工具栏</strong>：在视口较窄时，次要工具会自动折叠入“更多 (•••)”操作菜单；</li>
  <li><strong>零斜杠面板与零气泡干扰</strong>：键入 <code>/</code> 或划选文字时不会弹出浮层，保持极佳的传统录入体验；</li>
  <li><strong>支持声明式 tools 过滤</strong>：可按业务需要仅展示精简的几个操作按钮；</li>
  <li><strong>支持 dense 紧凑模式</strong>：适合嵌入抽屉或紧凑表单栅格中。</li>
</ul>
<blockquote>
  <p>轻巧、极速、无干扰 —— 企业级基础表单首选。</p>
</blockquote>`;

const content = ref<string>(defaultHtml);
const isDense = ref<boolean>(false);
const isReadOnly = ref<boolean>(false);
const isDisabled = ref<boolean>(false);
const containerWidthMode = ref<'100%' | '750px' | '500px' | '380px'>('100%');
const toolFilterMode = ref<'all' | 'essential' | 'minimal'>('all');

const activeTab = ref<string>('html');

const selectedTools = ref<SimpleToolbarItem[] | undefined>(undefined);

const handleToolFilterChange = (val: 'all' | 'essential' | 'minimal') => {
  if (val === 'all') {
    selectedTools.value = undefined;
  } else if (val === 'essential') {
    selectedTools.value = [
      'undo',
      'redo',
      'heading',
      'bold',
      'italic',
      'underline',
      'list',
      'link',
      'image',
      'clear',
      'fullscreen',
    ];
  } else {
    selectedTools.value = ['bold', 'italic', 'underline', 'link', 'clear'];
  }
};

const handleClear = () => {
  editorRef.value?.clearContent();
  ElMessage.info('已清空编辑器内容');
};

const handleReset = () => {
  editorRef.value?.setContent(defaultHtml);
  ElMessage.success('已重置为默认内容');
};

const handleCopyHtml = async () => {
  const html = editorRef.value?.getHTML() ?? '';
  try {
    await navigator.clipboard.writeText(html);
    ElMessage.success('已复制 HTML 内容');
  } catch {
    ElMessage.error('复制失败');
  }
};
</script>

<template>
  <div class="simple-scenario">
    <div class="scenario-intro">
      <div class="intro-title">
        <h3>AtengSimpleEditor 独立预设实测</h3>
        <el-tag type="primary" size="small">Preset: Simple</el-tag>
      </div>
      <p class="intro-desc">
        体验专为中后台表单设计的经典编辑器。支持单行自适应收缩、声明式工具过滤、紧凑模式以及零打字干扰防护。
      </p>
    </div>

    <!-- 操控面板 -->
    <div class="control-panel">
      <div class="control-group">
        <span class="control-label">容器宽度模拟：</span>
        <el-radio-group v-model="containerWidthMode" size="small">
          <el-radio-button value="100%">全宽 (100%)</el-radio-button>
          <el-radio-button value="750px">平板 (750px)</el-radio-button>
          <el-radio-button value="500px">紧凑 (500px)</el-radio-button>
          <el-radio-button value="380px">窄屏 (380px)</el-radio-button>
        </el-radio-group>
      </div>

      <div class="control-group">
        <span class="control-label">工具集配置：</span>
        <el-radio-group v-model="toolFilterMode" size="small" @change="handleToolFilterChange">
          <el-radio-button value="all">全量预设</el-radio-button>
          <el-radio-button value="essential">精选集 (Essential)</el-radio-button>
          <el-radio-button value="minimal">极简集 (Minimal)</el-radio-button>
        </el-radio-group>
      </div>

      <div class="control-group switch-group">
        <span class="switch-label">紧凑模式 (dense)</span>
        <el-switch v-model="isDense" />

        <span class="switch-label">只读模式 (readOnly)</span>
        <el-switch v-model="isReadOnly" />

        <span class="switch-label">禁用状态 (disabled)</span>
        <el-switch v-model="isDisabled" />
      </div>

      <div class="control-group btn-group">
        <el-button size="small" @click="handleReset">重设默认</el-button>
        <el-button size="small" type="danger" plain @click="handleClear">清空内容</el-button>
        <el-button size="small" type="primary" plain @click="handleCopyHtml">复制 HTML</el-button>
      </div>
    </div>

    <!-- 模拟响应式容器 -->
    <div class="editor-wrapper" :style="{ width: containerWidthMode, maxWidth: '100%' }">
      <AtengSimpleEditor
        ref="editorRef"
        v-model="content"
        :dense="isDense"
        :tools="selectedTools"
        :read-only="isReadOnly"
        :disabled="isDisabled"
        placeholder="在这里输入业务内容..."
        :max-length="2000"
      />
    </div>

    <!-- 数据看板 -->
    <div class="data-board">
      <el-tabs v-model="activeTab" type="card">
        <el-tab-pane label="实时 HTML 产物" name="html">
          <pre class="code-view"><code>{{ content }}</code></pre>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<style scoped>
.simple-scenario {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.scenario-intro {
  padding: 12px 16px;
  background-color: var(--el-fill-color-light, #f5f7fa);
  border-radius: 6px;
}

.intro-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.intro-title h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.intro-desc {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--el-text-color-secondary, #909399);
}

.control-panel {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  background-color: var(--el-bg-color, #ffffff);
  border: 1px solid var(--el-border-color-lighter, #e4e7ed);
  border-radius: 6px;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-label {
  font-size: 13px;
  color: var(--el-text-color-regular, #606266);
}

.switch-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.switch-label {
  font-size: 13px;
  color: var(--el-text-color-regular, #606266);
  margin-left: 8px;
}

.switch-label:first-child {
  margin-left: 0;
}

.editor-wrapper {
  margin: 0 auto;
  transition: width 0.3s ease;
}

.data-board {
  margin-top: 8px;
}

.code-view {
  margin: 0;
  padding: 12px;
  background-color: var(--el-fill-color-dark, #1e1e1e);
  color: var(--el-text-color-regular, #abb2bf);
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.5;
  max-height: 200px;
  overflow: auto;
  font-family: 'Fira Code', Consolas, Monaco, monospace;
}
</style>
