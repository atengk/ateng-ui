<script setup lang="ts">
/**
 * @atengk/ai-chat-vue 代码块展示组件。
 *
 * 具备语言标牌、一键复制代码、Prism.js 语法高亮与插槽反转嵌入 Monaco Editor。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { computed, onUnmounted, ref } from 'vue';
import Prism from 'prismjs';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-go';
import { IconCheck, IconCopy } from './icons';

interface Props {
  /** 编程语言 */
  language?: string;
  /** 代码原始内容 */
  code: string;
  /** 是否处于流式生成状态 */
  isStreaming?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  language: 'text',
  isStreaming: false,
});

defineSlots<{
  default?: (props: { language: string; code: string; isStreaming?: boolean }) => unknown;
}>();

const isCopied = ref(false);
let copyTimer: ReturnType<typeof setTimeout> | null = null;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const normalizedLanguage = computed(() => {
  const raw = (props.language || '').toLowerCase().trim();
  if (raw === 'js' || raw === 'javascript') return 'javascript';
  if (raw === 'ts' || raw === 'typescript') return 'typescript';
  if (raw === 'py' || raw === 'python') return 'python';
  if (raw === 'sh' || raw === 'shell' || raw === 'bash') return 'bash';
  if (raw === 'md' || raw === 'markdown') return 'markdown';
  if (raw === 'yml' || raw === 'yaml') return 'yaml';
  return raw || 'text';
});

const highlightedCode = computed(() => {
  const lang = normalizedLanguage.value;
  if (Prism.languages[lang]) {
    try {
      return Prism.highlight(props.code, Prism.languages[lang], lang);
    } catch {
      return escapeHtml(props.code);
    }
  }
  return escapeHtml(props.code);
});

async function handleCopy() {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(props.code);
    } else if (typeof document !== 'undefined') {
      const textarea = document.createElement('textarea');
      textarea.value = props.code;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    isCopied.value = true;
    if (copyTimer) clearTimeout(copyTimer);
    copyTimer = setTimeout(() => {
      isCopied.value = false;
    }, 2000);
  } catch {
    // 忽略剪贴板写入异常
  }
}

onUnmounted(() => {
  if (copyTimer) {
    clearTimeout(copyTimer);
    copyTimer = null;
  }
});
</script>

<template>
  <!-- eslint-disable vue/no-v-html -->
  <div class="at-ai-chat__code-block">
    <div class="at-ai-chat__code-header">
      <span class="at-ai-chat__code-lang">{{ normalizedLanguage }}</span>
      <button
        type="button"
        class="at-ai-chat__code-copy"
        :aria-label="isCopied ? '已复制' : '复制代码'"
        @click="handleCopy"
      >
        <component :is="isCopied ? IconCheck : IconCopy" class="at-ai-chat__code-copy-icon" />
        <span class="at-ai-chat__code-copy-text">{{ isCopied ? '已复制' : '复制' }}</span>
      </button>
    </div>
    <div class="at-ai-chat__code-body">
      <slot :language="normalizedLanguage" :code="props.code" :is-streaming="props.isStreaming">
        <pre
          class="at-ai-chat__code-pre"
        ><code :class="`language-${normalizedLanguage}`" v-html="highlightedCode" /></pre>
      </slot>
    </div>
  </div>
</template>
