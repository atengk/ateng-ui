<script setup lang="ts">
/**
 * @atengk/editor-vue 企业级经典轻量 Simple Editor 预设组件。
 *
 * 专为常规表单、博客、CRM 备注与轻量后台内容录入场景打造。
 * 标配自适应单行折叠微工具栏与紧凑模式，严格隔离拖拽手柄与斜杠面板以杜绝输入干扰。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { ref } from 'vue';
import AtengEditor from './AtengEditor.vue';
import { createEditorExpose } from '../utils/expose';
import type { SimpleEditorProps, AtengEditorEmits, AtengEditorExpose } from '../types';

defineOptions({
  name: 'AtengSimpleEditor',
});

const props = withDefaults(defineProps<SimpleEditorProps>(), {
  modelValue: undefined,
  markdown: undefined,
  json: undefined,
  outputFormat: 'html',
  placeholder: '请输入正文内容...',
  editable: true,
  disabled: false,
  readOnly: false,
  autofocus: false,
  extensions: () => [],
  showToolbar: true,
  stickyToolbar: false,
  showTableMenu: true,
  showLinkMenu: true,
  showImageMenu: true,
  showBubbleMenu: false,
  showSlashCommand: false,
  maxLength: undefined,
  showStatusBar: true,
  showWordCount: true,
  showParagraphCount: true,
  uploadHandler: undefined,
  height: undefined,
  minHeight: undefined,
  maxHeight: undefined,
  tools: undefined,
  dense: false,
});

const emit = defineEmits<AtengEditorEmits>();

const editorRef = ref<InstanceType<typeof AtengEditor> | null>(null);

// 显式对外暴露全部核心门面（通过受管代理消除 Middle Man 样板重复）
defineExpose<AtengEditorExpose>(createEditorExpose(editorRef));
</script>

<template>
  <AtengEditor
    ref="editorRef"
    v-bind="$attrs"
    mode="simple"
    :tools="props.tools"
    :dense="props.dense"
    :model-value="props.modelValue"
    :markdown="props.markdown"
    :json="props.json"
    :output-format="props.outputFormat"
    :placeholder="props.placeholder"
    :editable="props.editable"
    :disabled="props.disabled"
    :read-only="props.readOnly"
    :autofocus="props.autofocus"
    :extensions="props.extensions"
    :show-toolbar="props.showToolbar"
    :sticky-toolbar="props.stickyToolbar"
    :show-table-menu="props.showTableMenu"
    :show-link-menu="props.showLinkMenu"
    :show-image-menu="props.showImageMenu"
    :show-bubble-menu="props.showBubbleMenu"
    :show-slash-command="false"
    :max-length="props.maxLength"
    :show-status-bar="props.showStatusBar"
    :show-word-count="props.showWordCount"
    :show-paragraph-count="props.showParagraphCount"
    :upload-handler="props.uploadHandler"
    :height="props.height"
    :min-height="props.minHeight"
    :max-height="props.maxHeight"
    class="at-simple-editor"
    :class="{ 'is-dense': props.dense }"
    @update:model-value="emit('update:modelValue', $event)"
    @update:markdown="emit('update:markdown', $event)"
    @update:json="emit('update:json', $event)"
    @change="emit('change', $event)"
    @focus="emit('focus')"
    @blur="emit('blur')"
    @upload-success="emit('uploadSuccess', $event)"
    @upload-error="(err, file) => emit('uploadError', err, file)"
    @update:fullscreen="emit('update:fullscreen', $event)"
    @theme-change="emit('themeChange', $event)"
  >
    <!-- 工具栏插槽透传（调用方自定义时接管，缺省由底层根据 mode='simple' 自动渲染 AtengSimpleToolbar） -->
    <template v-if="$slots.toolbar" #toolbar="slotProps">
      <slot name="toolbar" v-bind="slotProps" />
    </template>

    <!-- 状态栏插槽透传 -->
    <template v-if="$slots.statusbar" #statusbar="slotProps">
      <slot name="statusbar" v-bind="slotProps" />
    </template>

    <!-- 表格菜单插槽透传 -->
    <template v-if="$slots['table-menu']" #table-menu="slotProps">
      <slot name="table-menu" v-bind="slotProps" />
    </template>

    <!-- 链接菜单插槽透传 -->
    <template v-if="$slots['link-menu']" #link-menu="slotProps">
      <slot name="link-menu" v-bind="slotProps" />
    </template>

    <!-- 图片菜单插槽透传 -->
    <template v-if="$slots['image-menu']" #image-menu="slotProps">
      <slot name="image-menu" v-bind="slotProps" />
    </template>
  </AtengEditor>
</template>

<style scoped>
.at-simple-editor {
  display: flex;
  flex-direction: column;
}

.at-simple-editor.is-dense :deep(.at-editor__content) {
  padding: 10px 14px;
}
</style>
