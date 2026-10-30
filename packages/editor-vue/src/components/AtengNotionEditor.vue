<script setup lang="ts">
/**
 * @atengk/editor-vue 企业级沉浸式 Notion-like Editor 预设组件。
 *
 * 专为知识库、产品需求文档 (PRD)、团队 Wiki 与现代在线协作创作场景打造。
 * 纯净无顶栏无界白板流式布局，由左侧六点悬浮手柄 (AtengDragHandle)、斜杠命令 (/) 与微选区气泡驱动。
 * 内置重点高亮卡片 (CalloutBlock) 与交互式折叠列表 (ToggleList) 物料支持。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { ref } from 'vue';
import AtengEditor from './AtengEditor.vue';
import { createEditorExpose } from '../utils/expose';
import type { NotionEditorProps, AtengEditorEmits, AtengEditorExpose } from '../types';

defineOptions({
  name: 'AtengNotionEditor',
});

const props = withDefaults(defineProps<NotionEditorProps>(), {
  modelValue: undefined,
  markdown: undefined,
  json: undefined,
  outputFormat: 'html',
  placeholder: '输入正文内容，或键入 "/" 快速插入块...',
  editable: true,
  disabled: false,
  readOnly: false,
  autofocus: false,
  extensions: () => [],
  dragHandle: true,
  slashCommand: true,
  callout: true,
  toggle: true,
  bubbleMenu: true,
  tableMenu: true,
  showStatusBar: false,
  maxWidth: '860px',
  height: undefined,
  minHeight: '400px',
  maxHeight: undefined,
  maxLength: undefined,
  uploadHandler: undefined,
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
    mode="notion"
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
    :show-toolbar="false"
    :show-drag-handle="props.dragHandle"
    :show-slash-command="props.slashCommand"
    :callout="props.callout"
    :toggle="props.toggle"
    :show-bubble-menu="props.bubbleMenu"
    :show-table-menu="props.tableMenu"
    :show-status-bar="props.showStatusBar"
    :max-length="props.maxLength"
    :upload-handler="props.uploadHandler"
    :max-width="props.maxWidth"
    :height="props.height"
    :min-height="props.minHeight"
    :max-height="props.maxHeight"
    class="at-notion-editor"
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
    <!-- 手柄按钮插槽透传 -->
    <template v-if="$slots['drag-handle']" #drag-handle="slotProps">
      <slot name="drag-handle" v-bind="slotProps" />
    </template>

    <!-- 手柄容器插槽透传 -->
    <template v-if="$slots['drag-handle-container']" #drag-handle-container="slotProps">
      <slot name="drag-handle-container" v-bind="slotProps" />
    </template>

    <!-- 块级菜单插槽透传 -->
    <template v-if="$slots['block-menu']" #block-menu="slotProps">
      <slot name="block-menu" v-bind="slotProps" />
    </template>

    <!-- 划词气泡插槽透传 -->
    <template v-if="$slots['bubble-menu']" #bubble-menu="slotProps">
      <slot name="bubble-menu" v-bind="slotProps" />
    </template>

    <!-- 斜杠命令插槽透传 -->
    <template v-if="$slots['slash-command']" #slash-command="slotProps">
      <slot name="slash-command" v-bind="slotProps" />
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
.at-notion-editor {
  display: flex;
  flex-direction: column;
}
</style>
