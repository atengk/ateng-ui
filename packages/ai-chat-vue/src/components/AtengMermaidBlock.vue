<script setup lang="ts">
/**
 * @atengk/ai-chat-vue Mermaid 架构流程图按需渲染组件。
 *
 * 采用原生 import('mermaid') 异步动态按需加载，未启用图表场景核心代码 0 字节打入产物。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { ref, watch } from 'vue';

interface Props {
  /** Mermaid 图表定义代码 */
  code: string;
}

const props = defineProps<Props>();

const svgContent = ref('');
const isLoading = ref(true);
const error = ref<string | null>(null);

let instanceSeq = 0;

function generateDiagramId(): string {
  return `at-mermaid-${Date.now().toString(36)}-${++instanceSeq}`;
}

async function renderDiagram() {
  const source = props.code ? props.code.trim() : '';
  if (!source) {
    svgContent.value = '';
    isLoading.value = false;
    error.value = null;
    return;
  }

  isLoading.value = true;
  error.value = null;

  try {
    // 动态按需加载 mermaid，未启用场景 0 字节打入主包
    const mermaidModule = await import('mermaid');
    const mermaid = (mermaidModule.default || mermaidModule) as unknown as {
      initialize: (config: Record<string, unknown>) => void;
      render: (id: string, text: string) => Promise<{ svg: string }>;
    };

    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
    });

    const id = generateDiagramId();
    const result = await mermaid.render(id, source);
    svgContent.value = result.svg;
    error.value = null;
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : String(err);
    svgContent.value = '';
  } finally {
    isLoading.value = false;
  }
}

watch(() => props.code, renderDiagram, { immediate: true });
</script>

<template>
  <!-- eslint-disable vue/no-v-html -->
  <div class="at-ai-chat__mermaid-block">
    <div v-if="isLoading" class="at-ai-chat__mermaid-loading">
      <span class="at-ai-chat__mermaid-spinner" aria-hidden="true" />
      <span>正在渲染架构图...</span>
    </div>
    <div v-else-if="error" class="at-ai-chat__mermaid-error">
      <div class="at-ai-chat__mermaid-error-title">Mermaid 图表解析失败</div>
      <div class="at-ai-chat__mermaid-error-detail">{{ error }}</div>
      <pre class="at-ai-chat__code-pre"><code>{{ props.code }}</code></pre>
    </div>
    <div v-else class="at-ai-chat__mermaid-svg" v-html="svgContent" />
  </div>
</template>
