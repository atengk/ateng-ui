<script setup lang="ts">
/**
 * AtengCodeView 源码与数据高亮查看器组件。
 *
 * 采用纯原生正则分词与 AST 解析（零外部重型依赖），
 * 支持 JSON/SQL/JS/HTML 语法着色、行号侧边栏、一键复制与明暗主题双模。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { ref, computed } from 'vue';
import { ElTooltip, ElMessage } from 'element-plus';
import { highlightLine } from './highlight';
import type {
  AtengCodeViewProps,
  AtengCodeViewEmits,
  AtengCodeViewSlots,
  AtengCodeViewExpose,
} from './types';

defineOptions({
  name: 'AtengCodeView',
});

const props = withDefaults(defineProps<AtengCodeViewProps>(), {
  language: 'json',
  theme: 'dark',
  lineNumbers: true,
  copyable: true,
  wordWrap: true,
  height: undefined,
  maxHeight: undefined,
  title: '',
  showHeader: true,
  indent: 2,
  customClass: '',
});

const emit = defineEmits<AtengCodeViewEmits>();
defineSlots<AtengCodeViewSlots>();

// 复制状态与反馈微标
const isCopied = ref<boolean>(false);
let copiedTimer: ReturnType<typeof setTimeout> | null = null;

// 格式化为标准原始文本字符串
const rawCode = computed<string>(() => {
  if (props.code === null || props.code === undefined) {
    return '';
  }
  if (typeof props.code === 'object') {
    try {
      return JSON.stringify(props.code, null, props.indent);
    } catch {
      return String(props.code);
    }
  }
  const str = String(props.code);
  // 如果语言是 JSON 且传入的是单行压缩 JSON 字符串，尝试自动美化
  if (props.language === 'json') {
    try {
      const parsed = JSON.parse(str);
      return JSON.stringify(parsed, null, props.indent);
    } catch {
      return str;
    }
  }
  return str;
});

// 切分每行
const lines = computed<string[]>(() => {
  if (!rawCode.value) {
    return [''];
  }
  return rawCode.value.split('\n');
});

// 行数
const lineCount = computed<number>(() => lines.value.length);

// 每行的高亮 HTML 缓存
const highlightedLines = computed<string[]>(() => {
  return lines.value.map(line => highlightLine(line, props.language));
});

// 复制到剪贴板
async function copy(): Promise<boolean> {
  const text = rawCode.value;
  try {
    if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      // 降级 textarea 复制
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }

    isCopied.value = true;
    if (copiedTimer) clearTimeout(copiedTimer);
    copiedTimer = setTimeout(() => {
      isCopied.value = false;
    }, 2000);

    emit('copy', text);
    return true;
  } catch (_err) {
    ElMessage.error('复制失败');
    return false;
  }
}

// 容器高度样式
const containerStyle = computed(() => {
  const style: Record<string, string> = {};
  if (props.height) {
    style.height = typeof props.height === 'number' ? `${props.height}px` : props.height;
  }
  if (props.maxHeight) {
    style.maxHeight =
      typeof props.maxHeight === 'number' ? `${props.maxHeight}px` : props.maxHeight;
  }
  return style;
});

defineExpose<AtengCodeViewExpose>({
  copy,
  getRawCode: () => rawCode.value,
  lineCount: lineCount.value,
});
</script>

<template>
  <div
    :class="['at-code-view', `at-code-view--${theme}`, wordWrap && 'is-word-wrap', customClass]"
    :style="containerStyle"
  >
    <!-- 顶部 Header 标题栏 -->
    <div v-if="showHeader" class="at-code-view__header">
      <slot name="header" :language="language" :line-count="lineCount">
        <div class="at-code-view__info">
          <!-- macOS 装饰圆点 -->
          <div class="at-code-view__dots">
            <span class="dot dot--red" />
            <span class="dot dot--yellow" />
            <span class="dot dot--green" />
          </div>
          <span class="at-code-view__title">{{ title || language.toUpperCase() }}</span>
          <span class="at-code-view__badge">{{ lineCount }} lines</span>
        </div>
      </slot>

      <!-- 右侧操作区 -->
      <div class="at-code-view__actions">
        <slot name="actions" :copy="copy">
          <ElTooltip :content="isCopied ? '已复制！' : '复制代码'" placement="top">
            <button
              v-if="copyable"
              type="button"
              class="at-code-view__btn"
              :class="{ 'is-copied': isCopied }"
              @click="copy"
            >
              <span v-if="isCopied" class="icon-copied">✓ 已复制</span>
              <span v-else class="icon-copy">📋 复制</span>
            </button>
          </ElTooltip>
        </slot>
      </div>
    </div>

    <!-- 源码滚动渲染主体 -->
    <div class="at-code-view__body">
      <!-- 行号栏 -->
      <div v-if="lineNumbers" class="at-code-view__gutter">
        <div v-for="idx in lineCount" :key="idx" class="at-code-view__line-no">
          {{ idx }}
        </div>
      </div>

      <!-- 代码内容 -->
      <div class="at-code-view__content">
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div
          v-for="(html, idx) in highlightedLines"
          :key="idx"
          class="at-code-view__line"
          v-html="html"
        />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.at-code-view {
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  overflow: hidden;
  box-sizing: border-box;
  font-family:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
    monospace;
  font-size: 13px;
  line-height: 1.6;

  // 暗黑主题 (Dark)
  &--dark {
    background-color: #1e1e24;
    color: #e2e8f0;
    border: 1px solid #2d3748;

    .at-code-view__header {
      background-color: #16161a;
      border-bottom: 1px solid #2d3748;
      color: #94a3b8;
    }

    .at-code-view__gutter {
      background-color: #18181c;
      color: #4b5563;
      border-right: 1px solid #2d3748;
    }

    .at-code-view__btn {
      color: #94a3b8;
      background: #27272a;
      border: 1px solid #3f3f46;

      &:hover {
        background: #3f3f46;
        color: #f1f5f9;
      }
    }

    // 暗色高亮配色
    :deep(.tok-key) {
      color: #38bdf8;
      font-weight: 500;
    }
    :deep(.tok-string) {
      color: #4ade80;
    }
    :deep(.tok-number) {
      color: #f59e0b;
    }
    :deep(.tok-boolean) {
      color: #ec4899;
      font-weight: 600;
    }
    :deep(.tok-punct) {
      color: #94a3b8;
    }
    :deep(.tok-keyword) {
      color: #c084fc;
      font-weight: 600;
    }
    :deep(.tok-comment) {
      color: #64748b;
      font-style: italic;
    }
    :deep(.tok-tag) {
      color: #f43f5e;
      font-weight: 600;
    }
    :deep(.tok-attr) {
      color: #fbbf24;
    }
    :deep(.tok-word) {
      color: #e2e8f0;
    }
  }

  // 浅色主题 (Light)
  &--light {
    background-color: #ffffff;
    color: #1f2937;
    border: 1px solid #e5e7eb;

    .at-code-view__header {
      background-color: #f8fafc;
      border-bottom: 1px solid #e5e7eb;
      color: #64748b;
    }

    .at-code-view__gutter {
      background-color: #f9fafb;
      color: #9ca3af;
      border-right: 1px solid #e5e7eb;
    }

    .at-code-view__btn {
      color: #4b5563;
      background: #ffffff;
      border: 1px solid #d1d5db;

      &:hover {
        background: #f3f4f6;
        color: #111827;
      }
    }

    // 浅色高亮配色
    :deep(.tok-key) {
      color: #0284c7;
      font-weight: 500;
    }
    :deep(.tok-string) {
      color: #16a34a;
    }
    :deep(.tok-number) {
      color: #d97706;
    }
    :deep(.tok-boolean) {
      color: #db2777;
      font-weight: 600;
    }
    :deep(.tok-punct) {
      color: #6b7280;
    }
    :deep(.tok-keyword) {
      color: #7c3aed;
      font-weight: 600;
    }
    :deep(.tok-comment) {
      color: #9ca3af;
      font-style: italic;
    }
    :deep(.tok-tag) {
      color: #e11d48;
      font-weight: 600;
    }
    :deep(.tok-attr) {
      color: #b45309;
    }
    :deep(.tok-word) {
      color: #1f2937;
    }
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 14px;
    font-size: 12px;
    user-select: none;
  }

  &__info {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__dots {
    display: flex;
    gap: 5px;

    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;

      &--red {
        background: #ef4444;
      }
      &--yellow {
        background: #f59e0b;
      }
      &--green {
        background: #10b981;
      }
    }
  }

  &__title {
    font-weight: 600;
    letter-spacing: 0.5px;
  }

  &__badge {
    font-size: 11px;
    opacity: 0.7;
    background: rgba(125, 125, 125, 0.15);
    padding: 1px 6px;
    border-radius: 4px;
  }

  &__btn {
    border: none;
    border-radius: 4px;
    padding: 3px 8px;
    font-size: 11px;
    cursor: pointer;
    transition: all 0.15s ease;

    &.is-copied {
      color: #10b981;
      border-color: #10b981;
    }
  }

  &__body {
    display: flex;
    flex: 1;
    overflow: auto;
    position: relative;
  }

  &__gutter {
    flex-shrink: 0;
    padding: 10px 10px 10px 12px;
    text-align: right;
    user-select: none;
    font-size: 12px;
  }

  &__line-no {
    height: 21px;
    line-height: 21px;
  }

  &__content {
    flex: 1;
    padding: 10px 14px;
    overflow-x: auto;
    white-space: pre;
  }

  &.is-word-wrap &__content {
    white-space: pre-wrap;
    word-break: break-all;
  }

  &__line {
    height: 21px;
    line-height: 21px;
  }
}
</style>
