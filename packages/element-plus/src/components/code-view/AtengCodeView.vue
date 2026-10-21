<script setup lang="ts">
/**
 * AtengCodeView 源码与数据高亮查看器组件。
 *
 * 采用纯原生正则分词与成对括号折叠算法（零外部重型依赖），
 * 支持 JSON/SQL/JS/HTML 语法着色、行号侧边栏、代码块树形折叠、一键复制与明暗主题双模。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { ref, computed, onBeforeUnmount } from 'vue';
import { ElTooltip, ElMessage } from 'element-plus';
import { highlightLine } from './highlight';
import { useCodeFolding } from './useCodeFolding';
import { writeClipboard } from '../../directives/copy';
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
  collapsible: true,
  defaultCollapsed: false,
  customClass: '',
});

const emit = defineEmits<AtengCodeViewEmits>();
defineSlots<AtengCodeViewSlots>();

// 1. 复制状态与定时器
const isCopied = ref<boolean>(false);
let copiedTimer: ReturnType<typeof setTimeout> | null = null;

onBeforeUnmount(() => {
  if (copiedTimer) {
    clearTimeout(copiedTimer);
    copiedTimer = null;
  }
});

// 2. 格式化代码文本
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

// 3. 切分行
const lines = computed<string[]>(() => {
  if (!rawCode.value) {
    return [];
  }
  return rawCode.value.split('\n');
});

const lineCount = computed<number>(() => lines.value.length);

// 4. 每行语法高亮
const highlightedLines = computed<string[]>(() => {
  return lines.value.map(line => highlightLine(line, props.language));
});

// 5. 折叠逻辑外抽状态机
const {
  foldRanges,
  collapsedLines,
  visibleLines,
  isAllFolded,
  toggleFold,
  foldAll,
  unfoldAll,
  toggleAllFolds,
} = useCodeFolding(lines, highlightedLines, props, emit);

// 6. 复制逻辑
async function copy(): Promise<boolean> {
  const text = rawCode.value;
  try {
    await writeClipboard(text);
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

// 7. 容器高度行内样式
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
  foldAll,
  unfoldAll,
  toggleFold,
  getCollapsedLines: () => Array.from(collapsedLines.value),
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
        <slot
          name="actions"
          :copy="copy"
          :fold-all="foldAll"
          :unfold-all="unfoldAll"
          :is-all-folded="isAllFolded"
        >
          <button
            v-if="collapsible && foldRanges.length > 0"
            type="button"
            class="at-code-view__btn"
            :title="isAllFolded ? '展开全部代码块' : '折叠全部代码块'"
            @click="toggleAllFolds"
          >
            {{ isAllFolded ? '展开全部' : '折叠全部' }}
          </button>

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
        <div v-for="item in visibleLines" :key="item.lineIndex" class="at-code-view__line-no">
          <span class="line-number">{{ item.lineNo }}</span>
          <button
            v-if="collapsible && item.isFoldable"
            type="button"
            class="fold-btn"
            :title="item.isFolded ? '点击展开' : '点击折叠'"
            @click="toggleFold(item.lineIndex)"
          >
            {{ item.isFolded ? '▶' : '▼' }}
          </button>
          <span v-else-if="collapsible" class="fold-spacer" />
        </div>
      </div>

      <!-- 代码内容 -->
      <div class="at-code-view__content">
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div v-for="item in visibleLines" :key="item.lineIndex" class="at-code-view__line">
          <span v-html="item.html" />
          <span
            v-if="item.isFolded && item.placeholder"
            class="at-code-view__fold-marker"
            title="点击展开代码块"
            @click="toggleFold(item.lineIndex)"
          >
            {{ item.placeholder }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss" src="./style.scss"></style>
