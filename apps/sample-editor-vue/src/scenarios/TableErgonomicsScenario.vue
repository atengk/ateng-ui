<script setup lang="ts">
/**
 * 表格操控人体工学与列宽自由拖拽自验场景 (Table Ergonomics Scenario)。
 *
 * 验证 TipTap Table 家族扩展在真实浏览器环境下的完整交互能力：
 * 1. 默认开启 resizable: true，支持鼠标移动至表格列竖线拖拽重设列宽；
 * 2. 光标进入表格单元格时自适应动态定位唤起全中文 <AtengTableBubbleMenu />；
 * 3. 验证 100% UI 插槽反转，业务层通过 #table-menu 插槽自由定制 Element Plus 控件。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { ref } from 'vue';
import { AtengEditor, type AtengEditorInstance } from '@atengk/editor-vue';

// 初始富文本表格内容（预置业务数据表格）
const initialTableContent = `
<h2>📊 团队季度交付与里程碑一览表</h2>
<p>本示例演示 TipTap Table 工业级人体工学交互。点击下方任意单元格可唤起上下文微浮层，鼠标悬停列边框可拖拽重设列宽：</p>
<table>
  <thead>
    <tr>
      <th>模块名称</th>
      <th>所属层级</th>
      <th>当前状态</th>
      <th>交付工单</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>@atengk/core</td>
      <td>L0 原生核心层</td>
      <td>已就绪 (Production)</td>
      <td>#101 ~ #120</td>
    </tr>
    <tr>
      <td>@atengk/vue</td>
      <td>L1 无头响应式层</td>
      <td>已就绪 (Production)</td>
      <td>#121 ~ #145</td>
    </tr>
    <tr>
      <td>@atengk/editor-vue</td>
      <td>L2 专用扩展层</td>
      <td>迭代中 (In Progress)</td>
      <td>#184 ~ #190</td>
    </tr>
  </tbody>
</table>
<p>💡 提示：在表格中可通过 Tab 键在单元格之间平滑跳转，光标置于最后单元格按 Tab 可快速追加新行。</p>
`;

const tableHtml = ref<string>(initialTableContent);
const slotTableHtml = ref<string>(initialTableContent);

const editorRef = ref<AtengEditorInstance | null>(null);

// 快捷操作指令
const insertTable = () => {
  editorRef.value?.editor?.value
    ?.chain()
    .focus()
    .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
    .run();
};

const addRowBefore = () => {
  editorRef.value?.editor?.value?.chain().focus().addRowBefore().run();
};

const addRowAfter = () => {
  editorRef.value?.editor?.value?.chain().focus().addRowAfter().run();
};

const addColBefore = () => {
  editorRef.value?.editor?.value?.chain().focus().addColumnBefore().run();
};

const addColAfter = () => {
  editorRef.value?.editor?.value?.chain().focus().addColumnAfter().run();
};

const toggleHeader = () => {
  editorRef.value?.editor?.value?.chain().focus().toggleHeaderRow().run();
};

const mergeCells = () => {
  editorRef.value?.editor?.value?.chain().focus().mergeCells().run();
};

const splitCell = () => {
  editorRef.value?.editor?.value?.chain().focus().splitCell().run();
};

const deleteRow = () => {
  editorRef.value?.editor?.value?.chain().focus().deleteRow().run();
};

const deleteCol = () => {
  editorRef.value?.editor?.value?.chain().focus().deleteColumn().run();
};

const deleteTable = () => {
  editorRef.value?.editor?.value?.chain().focus().deleteTable().run();
};

const resetContent = () => {
  tableHtml.value = initialTableContent;
};
</script>

<template>
  <div class="table-scenario">
    <el-alert
      type="success"
      :closable="false"
      show-icon
      title="TipTap Table 家族与列宽自由拖拽 (resizable: true)"
      description="当鼠标悬停在表格列竖线边框时，会自动呈现列宽调整手柄（column-resize-handle），支持按住鼠标左键任意向左/向右拖拽改变单元格宽度；点击单元格时光标上方将自适应弹出全中文动态操作气泡浮层。"
      class="scenario-alert"
    />

    <!-- 实测区域一：开箱即用默认表格人体工学 -->
    <el-card shadow="never" class="editor-card">
      <template #header>
        <div class="card-header">
          <div class="header-title">
            <span class="title-text">示例一：开箱即用表格操控与动态气泡浮层</span>
            <el-tag size="small" type="primary">默认原生微气泡菜单</el-tag>
          </div>
          <div class="header-actions">
            <el-button-group size="small">
              <el-button type="primary" plain @click="insertTable">➕ 插入 3x3 表格</el-button>
              <el-button @click="addRowBefore">⬆️ 前插行</el-button>
              <el-button @click="addRowAfter">⬇️ 追加行</el-button>
              <el-button @click="addColBefore">⬅️ 前插列</el-button>
              <el-button @click="addColAfter">➡️ 追加列</el-button>
              <el-button @click="toggleHeader">📑 切换表头行</el-button>
              <el-button @click="mergeCells">🔲 合并单元格</el-button>
              <el-button @click="splitCell">✂️ 拆分单元格</el-button>
              <el-button type="danger" plain @click="deleteRow">🗑️ 删当前行</el-button>
              <el-button type="danger" plain @click="deleteCol">🗑️ 删当前列</el-button>
              <el-button type="danger" plain @click="deleteTable">❌ 删整表</el-button>
            </el-button-group>
            <el-button size="small" @click="resetContent">🔄 重置演示数据</el-button>
          </div>
        </div>
      </template>

      <div class="editor-box">
        <AtengEditor
          ref="editorRef"
          v-model="tableHtml"
          placeholder="可点击上方按钮插入表格，或在表格内编辑..."
          min-height="300px"
          height="380px"
        />
      </div>

      <div class="echo-area">
        <div class="echo-title">实时数据发射流回显 (HTML 格式)</div>
        <pre class="echo-code"><code>{{ tableHtml }}</code></pre>
      </div>
    </el-card>

    <!-- 实测区域二：插槽反转体验 (100% Slot Inversion) -->
    <el-card shadow="never" class="editor-card">
      <template #header>
        <div class="card-header">
          <div class="header-title">
            <span class="title-text">示例二：#table-menu 插槽 100% 表现层反转替换</span>
            <el-tag size="small" type="warning">Element Plus 控件接管</el-tag>
          </div>
          <span class="sub-tip">由调用方通过具名插槽反转定制气泡悬浮栏，完全接管表现层渲染。</span>
        </div>
      </template>

      <div class="editor-box">
        <AtengEditor v-model="slotTableHtml" min-height="260px" height="320px">
          <template #table-menu="{ editor }">
            <div v-if="editor && editor.value?.isActive('table')" class="custom-slot-menu">
              <el-tag size="small" type="info" effect="dark">📌 自定义表格工具栏</el-tag>
              <el-button-group size="small">
                <el-button
                  type="primary"
                  size="small"
                  @click="editor.value?.chain().focus().addRowAfter().run()"
                >
                  加行
                </el-button>
                <el-button
                  type="primary"
                  size="small"
                  @click="editor.value?.chain().focus().addColumnAfter().run()"
                >
                  加列
                </el-button>
                <el-button
                  type="warning"
                  size="small"
                  @click="editor.value?.chain().focus().toggleHeaderRow().run()"
                >
                  表头
                </el-button>
                <el-button
                  type="danger"
                  size="small"
                  @click="editor.value?.chain().focus().deleteTable().run()"
                >
                  删表
                </el-button>
              </el-button-group>
            </div>
          </template>
        </AtengEditor>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.table-scenario {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.scenario-alert {
  margin-bottom: 4px;
}

.editor-card {
  border-radius: 8px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-text {
  font-weight: 600;
  font-size: 15px;
}

.sub-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.editor-box {
  margin-bottom: 16px;
}

.echo-area {
  background-color: var(--el-fill-color-light, #fafafa);
  border: 1px solid var(--el-border-color-lighter, #ebeef5);
  border-radius: 6px;
  padding: 12px 16px;
}

.echo-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  margin-bottom: 8px;
}

.echo-code {
  margin: 0;
  font-family: Consolas, Monaco, monospace;
  font-size: 11px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 120px;
  overflow-y: auto;
  color: var(--el-text-color-regular);
}

.custom-slot-menu {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  background-color: var(--el-bg-color-overlay, #ffffff);
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
</style>
