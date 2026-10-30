<script setup lang="ts">
/**
 * 场景一：基础现代富文本编辑与排版交互自验展厅。
 *
 * 验证：
 * 1. 标题、粗体、斜体、下划线、删除线、高亮、列表与引用排版；
 * 2. 代码块语法高亮（TypeScript / JavaScript / HTML 等）；
 * 3. 双向响应式 v-model 与 Markdown / JSON 多轨绑定；
 * 4. 只读阅读模式与表单禁用模式切换；
 * 5. Ref 实例方法调用（focus, clearContent, getHTML, getMarkdown）。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { ref } from 'vue';
import { AtengEditor, type AtengEditorInstance } from '@atengk/editor-vue';

const editorRef = ref<AtengEditorInstance | null>(null);

const defaultHtml = `<h1>⚡ ateng-ui / editor-vue 企业级现代富文本套件</h1>
<p>欢迎体验基于 <strong>TipTap 2.x</strong> 与 <em>ProseMirror</em> 底座驱动的工业级富文本编辑器！</p>
<p>本组件坚持 <mark>L2 专用能力/领域扩展层</mark> 定位，提供零第三方 UI 强依赖的纯净无头与原生微工具栏交互。</p>
<h2>✨ 核心特性矩阵</h2>
<ul data-type="taskList">
  <li data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>纯原生全中文微工具栏与 SVG 图标</p></div></li>
  <li data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>HTML、Markdown 与 JSON 三轨实时数据同步</p></div></li>
  <li data-checked="false"><label><input type="checkbox"><span></span></label><div><p>支持粘贴与拖拽图片直传（UploadHandler SPI）</p></div></li>
  <li data-checked="false"><label><input type="checkbox"><span></span></label><div><p>光标进入表格弹出动态上下文控制浮层</p></div></li>
</ul>
<blockquote>
  <p>💡 “简单的事情做到极致就是工业级。” —— ateng-ui 架构哲学</p>
</blockquote>
<pre><code>// TypeScript 代码高亮演示
export interface EditorConfig {
  theme: 'auto' | 'light' | 'dark';
  maxLength?: number;
  uploadHandler?: (file: File) => Promise&lt;string&gt;;
}
</code></pre>
`;

const htmlContent = ref<string>(defaultHtml);
const markdownContent = ref<string>('');
const jsonContent = ref<Record<string, unknown>>({});

const isReadOnly = ref<boolean>(false);
const isDisabled = ref<boolean>(false);
const isStickyToolbar = ref<boolean>(false);
const showToolbar = ref<boolean>(true);

const setPreset = (type: 'standard' | 'tech' | 'empty'): void => {
  if (type === 'standard') {
    htmlContent.value = defaultHtml;
  } else if (type === 'tech') {
    htmlContent.value = `<h1>技术文档排版示例</h1>
<p>下面展示一段复杂格式配置：</p>
<pre><code>import { AtengEditor } from '@atengk/editor-vue';

const editor = useEditor({
  placeholder: '开始记录你的思路...',
});
</code></pre>
<p>行内包含 <code>shallowRef</code> 与 <code>markRaw</code> 响应式安全契约。</p>
`;
  } else {
    htmlContent.value = '';
  }
};

const handleFocus = (): void => {
  editorRef.value?.focus('end');
};

const handleClear = (): void => {
  editorRef.value?.clearContent();
};
</script>

<template>
  <div class="basic-editor-scenario">
    <div class="scenario-panel">
      <!-- 控制台 -->
      <div class="control-bar">
        <div class="control-group">
          <span class="control-label">模版预设：</span>
          <el-button-group size="small">
            <el-button @click="setPreset('standard')">标准示例</el-button>
            <el-button @click="setPreset('tech')">技术文档</el-button>
            <el-button @click="setPreset('empty')">清空文档</el-button>
          </el-button-group>
        </div>

        <div class="control-group">
          <span class="control-label">状态开关：</span>
          <el-checkbox v-model="isReadOnly">只读模式 (readOnly)</el-checkbox>
          <el-checkbox v-model="isDisabled">禁用状态 (disabled)</el-checkbox>
          <el-checkbox v-model="showToolbar">展示工具栏</el-checkbox>
          <el-checkbox v-model="isStickyToolbar">吸顶工具栏</el-checkbox>
        </div>

        <div class="control-group">
          <span class="control-label">实例操作：</span>
          <el-button size="small" type="primary" plain @click="handleFocus">聚焦末尾</el-button>
          <el-button size="small" type="danger" plain @click="handleClear">清空内容</el-button>
        </div>
      </div>

      <!-- 编辑器主体 -->
      <div class="editor-wrapper">
        <AtengEditor
          ref="editorRef"
          v-model="htmlContent"
          v-model:markdown="markdownContent"
          v-model:json="jsonContent"
          placeholder="请输入精彩内容..."
          :read-only="isReadOnly"
          :disabled="isDisabled"
          :show-toolbar="showToolbar"
          :sticky-toolbar="isStickyToolbar"
          min-height="300px"
        />
      </div>

      <!-- 实时多轨数据核对看板 -->
      <div class="inspector-card">
        <el-tabs type="card" class="inspector-tabs">
          <el-tab-pane label="实时 HTML 产物">
            <pre class="code-preview"><code>{{ htmlContent }}</code></pre>
          </el-tab-pane>
          <el-tab-pane label="实时 Markdown 互转">
            <pre class="code-preview"><code>{{ markdownContent || '(空或待同步)' }}</code></pre>
          </el-tab-pane>
          <el-tab-pane label="ProseMirror JSON 结构树">
            <pre class="code-preview"><code>{{ JSON.stringify(jsonContent, null, 2) }}</code></pre>
          </el-tab-pane>
          <el-tab-pane label="容器状态">
            <div class="stats-grid">
              <div class="stat-item">
                <span class="stat-title">当前字符数</span>
                <span class="stat-value">{{ editorRef?.getText().length ?? 0 }} 字</span>
              </div>
              <div class="stat-item">
                <span class="stat-title">是否为空 (isEmpty)</span>
                <span class="stat-value">{{
                  editorRef?.isEmpty ? '是 (true)' : '否 (false)'
                }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-title">当前阅读模式</span>
                <span class="stat-value">{{ isReadOnly ? '只读' : '可编辑' }}</span>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>
  </div>
</template>

<style scoped>
.basic-editor-scenario {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.control-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  background-color: var(--el-fill-color-lighter, #fafafa);
  border: 1px solid var(--el-border-color-lighter, #ebeef5);
  border-radius: 6px;
  margin-bottom: 16px;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-label {
  font-size: 13px;
  color: var(--el-text-color-secondary, #909399);
  font-weight: 500;
}

.editor-wrapper {
  margin-bottom: 16px;
}

.inspector-card {
  border: 1px solid var(--el-border-color-lighter, #ebeef5);
  border-radius: 6px;
  background-color: var(--el-bg-color, #ffffff);
  padding: 12px;
}

.code-preview {
  margin: 0;
  padding: 12px;
  background-color: var(--el-fill-color-darker, #1e1e1e);
  color: #abb2bf;
  border-radius: 4px;
  font-family: Consolas, Monaco, monospace;
  font-size: 12px;
  max-height: 220px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  padding: 8px 0;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 14px;
  background-color: var(--el-fill-color-light, #f5f7fa);
  border-radius: 4px;
}

.stat-title {
  font-size: 12px;
  color: var(--el-text-color-secondary, #909399);
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-color-primary, #409eff);
}
</style>
