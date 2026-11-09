<script setup lang="ts">
/**
 * AtengFormCodeDrawer 代码与 Schema 导出抽屉。
 *
 * 遵循 ADR-0044 规范，提供四目标（SFC/AST/JSON Schema/Mock）即时预览、一键复制、原生 Blob 导出与编辑器插槽反转。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { computed, ref } from 'vue';
import { ElDrawer, ElRadioGroup, ElRadioButton, ElButton, ElMessage } from 'element-plus';
import type { FormSchema, CodeGeneratorTarget } from '../types';
import { CodeGenerator } from '../generator';

const props = withDefaults(
  defineProps<{
    /** 表单 AST Schema 对象 */
    schema: FormSchema;
    /** 抽屉标题 */
    title?: string;
  }>(),
  {
    title: '表单代码与 Schema 导出',
  },
);

const visible = defineModel<boolean>({ default: false });

const activeTab = ref<CodeGeneratorTarget>('sfc');
const copySuccess = ref(false);

/** 当前选中的生成目标代码 */
const generatedCode = computed<string>(() => {
  if (!props.schema) return '';
  switch (activeTab.value) {
    case 'sfc':
      return CodeGenerator.toVueSfc(props.schema, {
        componentName: props.schema.id
          ? props.schema.id.replace(/[^a-zA-Z0-9]/g, '') || 'DynamicForm'
          : 'DynamicForm',
      });
    case 'ast':
      return CodeGenerator.toSchemaJson(props.schema);
    case 'json-schema':
      return JSON.stringify(CodeGenerator.toStandardJsonSchema(props.schema), null, 2);
    case 'mock':
      return JSON.stringify(CodeGenerator.toMockData(props.schema), null, 2);
    default:
      return '';
  }
});

/** 当前代码语言 */
const currentLanguage = computed<string>(() => {
  return activeTab.value === 'sfc' ? 'html' : 'json';
});

/** 当前文件导出下载默认文件名 */
const downloadFileName = computed<string>(() => {
  const baseName = props.schema.id || 'form';
  switch (activeTab.value) {
    case 'sfc':
      return `${baseName}.vue`;
    case 'ast':
      return `${baseName}.schema.json`;
    case 'json-schema':
      return `${baseName}.draft07.json`;
    case 'mock':
      return `${baseName}.mock.json`;
    default:
      return `${baseName}.txt`;
  }
});

/** 复制到剪贴板 */
const handleCopy = async () => {
  const code = generatedCode.value;
  if (!code) return;

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(code);
    } else {
      // 兼容后备方案
      const textArea = document.createElement('textarea');
      textArea.value = code;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
    copySuccess.value = true;
    ElMessage.success('代码已成功复制到剪贴板！');
    setTimeout(() => {
      copySuccess.value = false;
    }, 2000);
  } catch (error) {
    ElMessage.error(`复制失败: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/** 原生 Blob 文件安全下载 */
const handleDownload = () => {
  const code = generatedCode.value;
  if (!code) return;

  try {
    const mime =
      activeTab.value === 'sfc' ? 'text/plain;charset=utf-8' : 'application/json;charset=utf-8';
    const blob = new Blob([code], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = downloadFileName.value;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // 释放临时 Blob URL 句柄
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
    ElMessage.success(`文件 ${downloadFileName.value} 下载已就绪`);
  } catch (error) {
    ElMessage.error(`下载文件失败: ${error instanceof Error ? error.message : String(error)}`);
  }
};
</script>

<template>
  <ElDrawer
    v-model="visible"
    :title="title"
    size="55%"
    direction="rtl"
    destroy-on-close
    class="at-form-code-drawer"
  >
    <div class="at-form-code-drawer__body">
      <!-- 头部控制条 -->
      <div class="at-form-code-drawer__toolbar">
        <ElRadioGroup v-model="activeTab" size="small">
          <ElRadioButton value="sfc">Vue 3 SFC</ElRadioButton>
          <ElRadioButton value="ast">AST JSON</ElRadioButton>
          <ElRadioButton value="json-schema">JSON Schema</ElRadioButton>
          <ElRadioButton value="mock">Mock 数据</ElRadioButton>
        </ElRadioGroup>

        <div class="at-form-code-drawer__actions">
          <ElButton size="small" type="primary" plain @click="handleCopy">
            {{ copySuccess ? '已复制 ✔' : '一键复制' }}
          </ElButton>
          <ElButton size="small" type="success" plain @click="handleDownload"> 导出下载 </ElButton>
        </div>
      </div>

      <!-- 代码内容展示区：支持外部编辑器插槽反转注入 -->
      <div class="at-form-code-drawer__content">
        <slot name="code-editor" :code="generatedCode" :language="currentLanguage" :tab="activeTab">
          <pre class="at-form-code-pre"><code>{{ generatedCode }}</code></pre>
        </slot>
      </div>
    </div>
  </ElDrawer>
</template>

<style scoped>
.at-form-code-drawer__body {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 12px;
}

.at-form-code-drawer__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--el-border-color-lighter, #ebeef5);
}

.at-form-code-drawer__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.at-form-code-drawer__content {
  flex: 1;
  min-height: 0;
  overflow: auto;
  border-radius: 6px;
  background-color: var(--el-fill-color-darker, #1e1e1e);
  border: 1px solid var(--el-border-color, #dcdfe6);
}

.at-form-code-pre {
  margin: 0;
  padding: 16px;
  font-family: var(--el-font-family-monospace, 'Fira Code', Consolas, Monaco, monospace);
  font-size: 13px;
  line-height: 1.6;
  color: var(--el-text-color-regular, #d4d4d4);
  white-space: pre-wrap;
  word-break: break-all;
  user-select: text;
}
</style>
