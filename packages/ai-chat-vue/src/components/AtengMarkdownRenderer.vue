<script setup lang="ts">
/**
 * @atengk/ai-chat-vue 高保真 Markdown 渲染核心组件。
 *
 * 结合 MarkdownPipeline 解析流式分块、KaTeX 数学公式、
 * 语法高亮代码块与动态懒加载 Mermaid 架构图，提供 #code-block 插槽反转。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { computed } from 'vue';
import { MarkdownPipeline } from '../pipeline/MarkdownPipeline';
import AtengCodeBlock from './AtengCodeBlock.vue';
import AtengMermaidBlock from './AtengMermaidBlock.vue';

interface Props {
  /** 待解析渲染的 Markdown 内容 */
  content: string;
  /** 是否处于流式生成状态 */
  isStreaming?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isStreaming: false,
});

defineSlots<{
  'code-block'?: (props: { language: string; code: string; isStreaming?: boolean }) => unknown;
}>();

const pipeline = new MarkdownPipeline();

const chunks = computed(() => pipeline.parseChunks(props.content));
</script>

<template>
  <!-- eslint-disable vue/no-v-html -->
  <div class="at-ai-chat__markdown">
    <template v-for="chunk in chunks" :key="chunk.id">
      <div v-if="chunk.type === 'html'" class="at-ai-chat__markdown-html" v-html="chunk.html" />
      <AtengMermaidBlock v-else-if="chunk.type === 'mermaid'" :code="chunk.code || ''" />
      <AtengCodeBlock
        v-else-if="chunk.type === 'code'"
        :language="chunk.language || 'text'"
        :code="chunk.code || ''"
        :is-streaming="props.isStreaming"
      >
        <template #default="slotProps">
          <slot name="code-block" v-bind="slotProps" />
        </template>
      </AtengCodeBlock>
    </template>
  </div>
</template>
