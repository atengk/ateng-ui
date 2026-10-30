<script setup lang="ts">
/**
 * 场景六：弹窗挂载自愈、脱壳全屏与纯净只读模式自验展厅 (Dialog, Teleport Fullscreen & ReadOnly)。
 *
 * 验证：
 * 1. 在 <el-dialog> 隐藏弹窗打开时，基于 ResizeObserver 实现 0x0 几何自愈，彻底杜绝光标位移与排版错乱；
 * 2. 脱壳全屏 (Teleport Fullscreen)：点击全屏突破弹窗 CSS Transform 局部裁剪，提升至 document.body 顶层；
 * 3. 纯净文章只读模式 (readOnly: true)：隐藏所有工具栏、微浮层与状态栏，呈现优雅排版。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { AtengEditor, type AtengEditorInstance } from '@atengk/editor-vue';

const dialogVisible = ref<boolean>(false);
const editorInDialogRef = ref<AtengEditorInstance | null>(null);
const readerEditorRef = ref<AtengEditorInstance | null>(null);

const articleContent = ref<string>(`
<h1>🏛️ 工业级前端基础设施架构白皮书</h1>
<p>在企业级现代 Web 应用研发中，富文本内容创作面临两大经典痛点：<strong>弹窗内尺寸计算坍塌</strong> 与 <strong>局部容器层级裁剪</strong>。</p>
<h2>1. 尺寸几何自愈机制</h2>
<p>当编辑器被置于初始处于 <code>display: none</code> 的 Dialog、Drawer 或非首屏 Tab 中时，容器几何尺寸为 0x0。<code>@atengk/editor-vue</code> 内置 <code>ResizeObserver</code>，在弹窗唤醒展开的第一瞬间自动触发视图派发自愈重绘，保障输入体验平滑稳定。</p>
<h2>2. 脱壳全屏穿透</h2>
<p>通常情况下，若父级弹窗配备了 <code>transform</code> 或 <code>perspective</code> 动画，普通的 <code>position: fixed</code> 会被局部容器拦截裁剪。本组件通过脱壳提升机制直达 <code>document.body</code> 顶层（z-index: 3000），实现真正意义上的沉浸式全屏创作。</p>
<blockquote>
  <p>💡 “简单的事情做到极致就是工业级。” —— ateng-ui 研发团队</p>
</blockquote>
`);

const isReadOnlyMode = ref<boolean>(true);

const openDialog = (): void => {
  dialogVisible.value = true;
};

const handleDialogFullscreen = (): void => {
  editorInDialogRef.value?.toggleFullscreen();
  ElMessage.info('已触发脱壳全屏，请按 Esc 或点击工具栏退出');
};
</script>

<template>
  <div class="dialog-readonly-scenario">
    <div class="scenario-panel">
      <!-- 操控栏 -->
      <div class="scenario-controls">
        <div class="controls-left">
          <el-button type="primary" size="small" @click="openDialog">
            🪟 打开对话框中的富文本编辑器 (Dialog 0x0 几何自愈)
          </el-button>
          <div class="switch-item">
            <span class="switch-label">文章阅读器模式 (readOnly)：</span>
            <el-switch v-model="isReadOnlyMode" />
          </div>
        </div>
        <div class="controls-right">
          <el-tag :type="isReadOnlyMode ? 'success' : 'info'" size="small">
            {{ isReadOnlyMode ? '当前状态：纯净阅读模式 (无边框/零浮层)' : '当前状态：编辑模式' }}
          </el-tag>
        </div>
      </div>

      <!-- 纯净阅读态展示区 -->
      <div class="reader-container" :class="{ 'is-reader-active': isReadOnlyMode }">
        <AtengEditor
          ref="readerEditorRef"
          v-model="articleContent"
          :read-only="isReadOnlyMode"
          min-height="350px"
        />
      </div>

      <!-- 模态弹窗中的编辑器自愈演练 -->
      <el-dialog
        v-model="dialogVisible"
        title="模态弹窗中的富文本编辑器 (0x0 尺寸自愈与脱壳全屏)"
        width="800px"
        destroy-on-close
      >
        <div class="dialog-editor-container">
          <div class="dialog-tip">
            💡 弹窗默认采用 CSS transform
            进行渐变缩放。点击工具栏最右侧的<strong>全屏按钮</strong>，验证 Teleport
            脱壳全屏能否突破当前弹窗边框裁剪：
          </div>

          <AtengEditor ref="editorInDialogRef" v-model="articleContent" min-height="320px" />
        </div>

        <template #footer>
          <div class="dialog-footer">
            <el-button size="small" @click="handleDialogFullscreen">
              ⛶ 弹窗内触发脱壳全屏
            </el-button>
            <el-button type="primary" size="small" @click="dialogVisible = false">
              完成并关闭
            </el-button>
          </div>
        </template>
      </el-dialog>
    </div>
  </div>
</template>

<style scoped>
.dialog-readonly-scenario {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.scenario-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.scenario-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px 16px;
  background-color: var(--el-fill-color-light, #f5f7fa);
  border-radius: 6px;
  border: 1px solid var(--el-border-color-lighter, #e4e7ed);
}

.controls-left,
.controls-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.switch-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.switch-label {
  font-size: 13px;
  color: var(--el-text-color-regular, #606266);
}

.reader-container {
  padding: 16px;
  background-color: var(--el-bg-color, #ffffff);
  border-radius: 6px;
  border: 1px solid var(--el-border-color-lighter, #e4e7ed);
  transition: all 0.2s ease;
}

.reader-container.is-reader-active {
  background-color: transparent;
  border: 1px dashed var(--el-border-color, #dcdfe6);
}

.dialog-editor-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dialog-tip {
  font-size: 13px;
  color: var(--el-text-color-regular, #606266);
  padding: 8px 12px;
  background-color: var(--el-fill-color-light, #f5f7fa);
  border-radius: 4px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
