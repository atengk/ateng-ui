<script setup lang="ts">
/**
 * AtengCodeEditor 高保真代码/SQL/JSON 编辑器高阶表现容器。
 *
 * 依据 ADR-0035 与成熟度防线：
 * 1. 强制使用 shallowRef 与 markRaw 封装 Monaco 实例与 TextModel，杜绝响应式 Proxy 劫持；
 * 2. 具备 theme: 'auto' 暗黑模式热感知与尺寸感应；
 * 3. 顶部提供原生 HTML/CSS 微工具栏，对外 100% 暴露插槽反转；
 * 4. 显式收敛暴露实例方法，导出专属 Ref 实例类型。
 *
 * @author Ateng
 * @since 2026-10-29
 */

import { ref, computed, watch, onMounted, onUnmounted, nextTick, type CSSProperties } from 'vue';
import * as monaco from 'monaco-editor';
import type { CodeEditorProps, CodeEditorEmits, CodeEditorExpose } from '../types';
import { useCodeEditor } from '../composables/useCodeEditor';

const props = withDefaults(defineProps<CodeEditorProps>(), {
  modelValue: '',
  language: 'typescript',
  theme: 'auto',
  readOnly: false,
  height: '400px',
  width: '100%',
  fontSize: 14,
  tabSize: 2,
  wordWrap: 'on',
  lineNumbers: 'on',
  minimap: true,
  showToolbar: true,
  showStatusbar: true,
  bordered: true,
  largeFileThreshold: 50000,
  autoLayoutHealing: true,
  highlightLines: () => [],
  options: () => ({}),
  workerOptions: () => ({}),
});

const emit = defineEmits<CodeEditorEmits>();

defineSlots<{
  /** 完整自定义顶部工具栏 */
  toolbar?: () => unknown;
  /** 自定义工具栏左侧内容 */
  'toolbar-left'?: () => unknown;
  /** 自定义工具栏右侧内容 */
  'toolbar-right'?: () => unknown;
  /** 额外操作按钮插槽 */
  extra?: () => unknown;
  /** 自定义底部状态栏 */
  statusbar?: () => unknown;
}>();

const rootRef = ref<HTMLElement | null>(null);
const canvasRef = ref<HTMLElement | null>(null);
const isFullscreen = ref<boolean>(false);
const copySuccess = ref<boolean>(false);
const isDark = ref<boolean>(false);
let copyTimer: ReturnType<typeof setTimeout> | null = null;

// 光标位置
const cursorPosition = ref({ line: 1, column: 1 });

// 计算容器样式尺寸
const containerStyle = computed<CSSProperties>(() => {
  if (isFullscreen.value) {
    return {};
  }
  const h = typeof props.height === 'number' ? `${props.height}px` : props.height;
  const w = typeof props.width === 'number' ? `${props.width}px` : props.width;
  return {
    height: h,
    width: w,
  };
});

// 计算字符数与行数
const charCount = computed(() => props.modelValue?.length ?? 0);
const lineCount = computed(() => {
  if (!props.modelValue) return 1;
  return props.modelValue.split('\n').length;
});

// 主题热跟随监听
const checkDarkMode = (): boolean => {
  if (typeof document === 'undefined') return false;
  if (props.theme === 'vs-dark' || props.theme === 'hc-black') return true;
  if (props.theme === 'vs') return false;
  // auto 模式下探测 html 类名与媒体查询
  return (
    document.documentElement.classList.contains('dark') ||
    (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches)
  );
};

let themeObserver: MutationObserver | null = null;
let mediaQuery: MediaQueryList | null = null;
let mediaQueryListener: (() => void) | null = null;

const syncTheme = (): void => {
  const dark = checkDarkMode();
  isDark.value = dark;
  const resolvedTheme = props.theme === 'auto' ? (dark ? 'vs-dark' : 'vs') : props.theme;
  monaco.editor.setTheme(resolvedTheme);
};

// 初始化无头编辑器状态机
const {
  editor,
  model,
  isLargeFile,
  isSuspended,
  format,
  layout,
  healLayout,
  focus,
  undo,
  redo,
  getValue,
  setValue,
  applyIncrementalEdit,
} = useCodeEditor(canvasRef, {
  value: props.modelValue,
  language: props.language,
  theme: props.theme === 'auto' ? (checkDarkMode() ? 'vs-dark' : 'vs') : props.theme,
  readOnly: props.readOnly,
  fontSize: props.fontSize,
  tabSize: props.tabSize,
  wordWrap: props.wordWrap,
  lineNumbers: props.lineNumbers,
  minimap: props.minimap,
  options: props.options,
  workerOptions: props.workerOptions,
  largeFileThreshold: props.largeFileThreshold,
  autoLayoutHealing: props.autoLayoutHealing,
  formatSqlProvider: props.formatSqlProvider,
  completionProvider: props.completionProvider,
  jsonSchema: props.jsonSchema,
  onChange: (val, event) => {
    emit('update:modelValue', val);
    emit('change', val, event);
  },
});

let decorationsCollection: monaco.editor.IEditorDecorationsCollection | null = null;

const applyHighlightLines = (): void => {
  if (!editor.value) return;
  const lines = props.highlightLines ?? [];
  const decorations: monaco.editor.IModelDeltaDecoration[] = lines.map(line => ({
    range: new monaco.Range(line, 1, line, 1),
    options: {
      isWholeLine: true,
      className: 'at-code-editor__highlight-line',
      linesDecorationsClassName: 'at-code-editor__highlight-gutter',
    },
  }));

  if (decorationsCollection) {
    decorationsCollection.set(decorations);
  } else {
    decorationsCollection = editor.value.createDecorationsCollection(decorations);
  }
};

// 监听光标与挂载
watch(
  () => editor.value,
  ed => {
    if (!ed) return;

    ed.onDidChangeCursorPosition(e => {
      cursorPosition.value = {
        line: e.position.lineNumber,
        column: e.position.column,
      };
    });

    ed.onDidFocusEditorText(() => {
      emit('focus');
    });

    ed.onDidBlurEditorText(() => {
      emit('blur');
    });

    emit('mount', ed, monaco);
    syncTheme();
    applyHighlightLines();
  },
  { immediate: true },
);

// 监听高亮行变更
watch(
  () => props.highlightLines,
  () => {
    applyHighlightLines();
  },
  { deep: true },
);

// 监听外部 modelValue 变更（单向防回环增量同步，光标防丢与 Undo 栈保持）
watch(
  () => props.modelValue,
  newVal => {
    if (!editor.value || newVal === getValue()) return;
    applyIncrementalEdit(newVal ?? '', { preserveCursor: true, recordUndo: true });
  },
);

// 监听语言切换
watch(
  () => props.language,
  newLang => {
    if (!model.value || !newLang) return;
    monaco.editor.setModelLanguage(model.value, newLang);
  },
);

// 监听只读状态变更
watch(
  () => props.readOnly,
  ro => {
    if (!editor.value) return;
    editor.value.updateOptions({ readOnly: ro });
  },
);

// 监听字体大小
watch(
  () => props.fontSize,
  size => {
    if (!editor.value || !size) return;
    editor.value.updateOptions({ fontSize: size });
  },
);

// 监听自动换行
watch(
  () => props.wordWrap,
  wrap => {
    if (!editor.value || !wrap) return;
    editor.value.updateOptions({ wordWrap: wrap });
  },
);

// 监听主题属性
watch(
  () => props.theme,
  () => {
    syncTheme();
  },
);

// 格式化处理
const handleFormat = async (): Promise<void> => {
  if (props.readOnly) return;
  await format();
};

// 复制处理
const handleCopy = async (): Promise<void> => {
  const text = getValue();
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      copySuccess.value = true;
      if (copyTimer) clearTimeout(copyTimer);
      copyTimer = setTimeout(() => {
        copySuccess.value = false;
      }, 2000);
    }
  } catch {
    // 忽略剪贴板写入异常
  }
};

// 全屏切换
const toggleFullscreen = (): void => {
  isFullscreen.value = !isFullscreen.value;
  nextTick(() => {
    layout();
  });
};

onMounted(() => {
  syncTheme();
  if (typeof document !== 'undefined' && typeof MutationObserver !== 'undefined') {
    themeObserver = new MutationObserver(() => {
      if (props.theme === 'auto') {
        syncTheme();
      }
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
  }
  if (typeof window !== 'undefined' && window.matchMedia) {
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQueryListener = () => {
      if (props.theme === 'auto') {
        syncTheme();
      }
    };
    mediaQuery.addEventListener('change', mediaQueryListener);
  }
});

onUnmounted(() => {
  if (decorationsCollection) {
    decorationsCollection.clear();
    decorationsCollection = null;
  }
  if (themeObserver) {
    themeObserver.disconnect();
    themeObserver = null;
  }
  if (mediaQuery && mediaQueryListener) {
    mediaQuery.removeEventListener('change', mediaQueryListener);
    mediaQuery = null;
    mediaQueryListener = null;
  }
  if (copyTimer) {
    clearTimeout(copyTimer);
    copyTimer = null;
  }
});

// 显式收敛向外暴露的方法
defineExpose<CodeEditorExpose>({
  getEditor: () => editor.value,
  getModel: () => model.value,
  focus,
  format,
  layout,
  healLayout,
  getValue,
  setValue,
  applyIncrementalEdit,
  undo,
  redo,
  isLargeFile: () => isLargeFile.value,
  isSuspended: () => isSuspended.value,
});
</script>

<template>
  <div
    ref="rootRef"
    class="at-code-editor"
    :class="{
      'at-code-editor--bordered': bordered,
      'at-code-editor--dark': isDark,
      'at-code-editor--fullscreen': isFullscreen,
    }"
    :style="containerStyle"
  >
    <!-- Micro Toolbar -->
    <div v-if="showToolbar" class="at-code-editor__toolbar">
      <slot name="toolbar">
        <div class="at-code-editor__toolbar-left">
          <slot name="toolbar-left">
            <span class="at-code-editor__badge">{{ language }}</span>
            <span v-if="readOnly" class="at-code-editor__badge at-code-editor__badge--readonly">
              只读
            </span>
            <button
              type="button"
              class="at-code-editor__btn"
              title="格式化文档"
              :disabled="readOnly"
              @click="handleFormat"
            >
              格式化
            </button>
          </slot>
        </div>
        <div class="at-code-editor__toolbar-right">
          <slot name="toolbar-right">
            <slot name="extra">
              <button
                type="button"
                class="at-code-editor__btn"
                title="复制全部代码"
                @click="handleCopy"
              >
                {{ copySuccess ? '已复制' : '复制' }}
              </button>
              <button
                type="button"
                class="at-code-editor__btn"
                :title="isFullscreen ? '退出全屏' : '全屏展示'"
                @click="toggleFullscreen"
              >
                {{ isFullscreen ? '还原' : '全屏' }}
              </button>
            </slot>
          </slot>
        </div>
      </slot>
    </div>

    <!-- Editor Canvas Host -->
    <div ref="canvasRef" class="at-code-editor__canvas" />

    <!-- Micro Statusbar -->
    <div v-if="showStatusbar" class="at-code-editor__statusbar">
      <slot name="statusbar">
        <div class="at-code-editor__statusbar-left">
          <span>行 {{ cursorPosition.line }}, 列 {{ cursorPosition.column }}</span>
          <span v-if="isLargeFile" class="at-code-editor__badge at-code-editor__badge--warning">
            ⚡ 大文件保护已启用
          </span>
        </div>
        <div class="at-code-editor__statusbar-right">
          <span>{{ charCount }} 字符</span>
          <span>{{ lineCount }} 行</span>
          <span>UTF-8</span>
        </div>
      </slot>
    </div>
  </div>
</template>

<style scoped>
@import '../styles/index.css';
</style>
