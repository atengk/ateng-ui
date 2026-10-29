<script setup lang="ts">
/**
 * AtengCodeDiffEditor 高保真代码 Diff 双栏/行内对比编辑器表现容器。
 *
 * 依据 ADR-0035 与工单 #182：
 * 1. 强制使用 shallowRef 与 markRaw 封装 Monaco DiffEditor 实例与双 TextModel；
 * 2. 支持双栏并排 (split) 与单栏行内 (inline) 双模无损切换；
 * 3. 内置差异导航器（上一处 ⬆️、下一处 ⬇️）与增删行数统计指示器 (+N / -M)；
 * 4. 支持双轨响应式绑定：v-model:original 与 v-model:modified；
 * 5. 继承 0x0 视口几何自愈、主题热跟随与确定性生命周期治理。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { ref, computed, watch, onMounted, onUnmounted, nextTick, type CSSProperties } from 'vue';
import * as monaco from 'monaco-editor';
import type {
  CodeDiffEditorProps,
  CodeDiffEditorEmits,
  CodeDiffEditorExpose,
  DiffMode,
} from '../types';
import { useCodeDiff } from '../composables/useCodeDiff';

const props = withDefaults(defineProps<CodeDiffEditorProps>(), {
  original: '',
  modified: '',
  modelValue: undefined,
  diffMode: 'split',
  language: 'typescript',
  theme: 'auto',
  readOnly: false,
  originalReadOnly: true,
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
  autoLayoutHealing: true,
  options: () => ({}),
  workerOptions: () => ({}),
});

const emit = defineEmits<CodeDiffEditorEmits>();

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

// 实际生效的 modified 初始值（优先使用 modified，其次回退至 modelValue）
const effectiveModified = computed(() => props.modified || props.modelValue || '');

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

// 暗黑模式热感知
const checkDarkMode = (): boolean => {
  if (typeof document === 'undefined') return false;
  if (props.theme === 'vs-dark' || props.theme === 'hc-black') return true;
  if (props.theme === 'vs') return false;
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

// 初始化无头 Diff 状态机
const {
  diffEditor,
  originalModel,
  modifiedModel,
  diffStats,
  diffMode: currentMode,
  isSuspended,
  layout,
  healLayout,
  focus,
  getOriginalValue,
  setOriginalValue,
  getModifiedValue,
  setModifiedValue,
  setDiffMode: internalSetDiffMode,
  goToPreviousDiff,
  goToNextDiff,
} = useCodeDiff(canvasRef, {
  original: props.original,
  modified: effectiveModified.value,
  diffMode: props.diffMode,
  language: props.language,
  theme: props.theme === 'auto' ? (checkDarkMode() ? 'vs-dark' : 'vs') : props.theme,
  readOnly: props.readOnly,
  originalReadOnly: props.originalReadOnly,
  fontSize: props.fontSize,
  tabSize: props.tabSize,
  wordWrap: props.wordWrap,
  lineNumbers: props.lineNumbers,
  minimap: props.minimap,
  options: props.options,
  workerOptions: props.workerOptions,
  autoLayoutHealing: props.autoLayoutHealing,
  onOriginalChange: val => {
    emit('update:original', val);
    emit('change', { original: val, modified: getModifiedValue() });
  },
  onModifiedChange: val => {
    emit('update:modified', val);
    emit('update:modelValue', val);
    emit('change', { original: getOriginalValue(), modified: val });
  },
  onDiffUpdated: stats => {
    emit('diffUpdated', stats);
  },
});

// 动态模式切换处理
const handleDiffModeChange = (mode: DiffMode): void => {
  if (currentMode.value === mode) return;
  internalSetDiffMode(mode);
  emit('update:diffMode', mode);
  emit('diffModeChange', mode);
};

// 复制修改侧代码
const handleCopyModified = async (): Promise<void> => {
  const text = getModifiedValue();
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

// 监听 diffEditor 挂载
watch(
  () => diffEditor.value,
  ed => {
    if (!ed) return;
    const modifiedEd = ed.getModifiedEditor();
    if (modifiedEd) {
      modifiedEd.onDidFocusEditorText(() => emit('focus'));
      modifiedEd.onDidBlurEditorText(() => emit('blur'));
    }
    emit('mount', ed, monaco);
    syncTheme();
  },
  { immediate: true },
);

// 监听外部 original 变更
watch(
  () => props.original,
  newVal => {
    if (!diffEditor.value || newVal === getOriginalValue()) return;
    setOriginalValue(newVal ?? '');
  },
);

// 监听外部 modified 变更
watch(
  () => props.modified,
  newVal => {
    if (!diffEditor.value || newVal === getModifiedValue()) return;
    setModifiedValue(newVal ?? '');
  },
);

// 监听外部 modelValue 变更（作为 modified 别名）
watch(
  () => props.modelValue,
  newVal => {
    if (newVal === undefined || !diffEditor.value || newVal === getModifiedValue()) return;
    setModifiedValue(newVal);
  },
);

// 监听外部 diffMode 属性
watch(
  () => props.diffMode,
  newMode => {
    if (newMode && newMode !== currentMode.value) {
      internalSetDiffMode(newMode);
    }
  },
);

// 监听语言属性
watch(
  () => props.language,
  newLang => {
    if (!newLang) return;
    if (originalModel.value) {
      monaco.editor.setModelLanguage(originalModel.value, newLang);
    }
    if (modifiedModel.value) {
      monaco.editor.setModelLanguage(modifiedModel.value, newLang);
    }
  },
);

// 监听只读状态变更
watch(
  () => props.readOnly,
  ro => {
    if (!diffEditor.value) return;
    diffEditor.value.updateOptions({ readOnly: ro });
  },
);

// 监听字体大小
watch(
  () => props.fontSize,
  size => {
    if (!diffEditor.value || !size) return;
    diffEditor.value.updateOptions({ fontSize: size });
  },
);

// 监听自动换行
watch(
  () => props.wordWrap,
  wrap => {
    if (!diffEditor.value || !wrap) return;
    diffEditor.value.updateOptions({ wordWrap: wrap });
  },
);

// 监听主题属性
watch(
  () => props.theme,
  () => {
    syncTheme();
  },
);

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

// 显式收敛向外暴露的接口
defineExpose<CodeDiffEditorExpose>({
  getDiffEditor: () => diffEditor.value,
  getOriginalEditor: () =>
    diffEditor.value
      ? (diffEditor.value.getOriginalEditor() as monaco.editor.IStandaloneCodeEditor)
      : null,
  getModifiedEditor: () =>
    diffEditor.value
      ? (diffEditor.value.getModifiedEditor() as monaco.editor.IStandaloneCodeEditor)
      : null,
  getOriginalModel: () => originalModel.value,
  getModifiedModel: () => modifiedModel.value,
  getOriginalValue,
  setOriginalValue,
  getModifiedValue,
  setModifiedValue,
  getDiffStats: () => diffStats.value,
  getDiffMode: () => currentMode.value,
  setDiffMode: handleDiffModeChange,
  goToPreviousDiff,
  goToNextDiff,
  layout,
  healLayout,
  isSuspended: () => isSuspended.value,
  focus,
});
</script>

<template>
  <div
    ref="rootRef"
    class="at-code-editor at-code-diff-editor"
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

            <!-- Split / Inline Mode Switcher -->
            <div class="at-code-diff-editor__actions">
              <button
                type="button"
                class="at-code-editor__btn"
                :class="{ 'at-code-editor__btn--active': currentMode === 'split' }"
                title="并排左右双栏比对模式"
                @click="handleDiffModeChange('split')"
              >
                并排
              </button>
              <button
                type="button"
                class="at-code-editor__btn"
                :class="{ 'at-code-editor__btn--active': currentMode === 'inline' }"
                title="单栏上下行内比对模式"
                @click="handleDiffModeChange('inline')"
              >
                行内
              </button>
            </div>

            <!-- Diff Stats Indicator -->
            <span class="at-code-diff-editor__stat" title="Diff 增删统计 (新增 / 删除)">
              <span class="at-code-diff-editor__stat-add">+{{ diffStats.additions }}</span>
              <span>/</span>
              <span class="at-code-diff-editor__stat-del">-{{ diffStats.deletions }}</span>
            </span>

            <!-- Diff Navigation Buttons -->
            <div class="at-code-diff-editor__actions">
              <button
                type="button"
                class="at-code-editor__btn"
                title="跳转至上一处差异"
                @click="goToPreviousDiff"
              >
                ⬆️ 上一处
              </button>
              <button
                type="button"
                class="at-code-editor__btn"
                title="跳转至下一处差异"
                @click="goToNextDiff"
              >
                ⬇️ 下一处
              </button>
            </div>
          </slot>
        </div>

        <div class="at-code-editor__toolbar-right">
          <slot name="toolbar-right">
            <slot name="extra">
              <button
                type="button"
                class="at-code-editor__btn"
                title="复制修改后代码"
                @click="handleCopyModified"
              >
                {{ copySuccess ? '已复制' : '复制新代码' }}
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

    <!-- Diff Editor Canvas Host -->
    <div ref="canvasRef" class="at-code-editor__canvas" />

    <!-- Micro Statusbar -->
    <div v-if="showStatusbar" class="at-code-editor__statusbar">
      <slot name="statusbar">
        <div class="at-code-editor__statusbar-left">
          <span>
            {{ currentMode === 'split' ? '双栏并排比对' : '单栏行内比对' }} · 共
            {{ diffStats.changesCount }} 处差异
          </span>
        </div>
        <div class="at-code-editor__statusbar-right">
          <span>+{{ diffStats.additions }} / -{{ diffStats.deletions }} 行</span>
          <span>UTF-8</span>
        </div>
      </slot>
    </div>
  </div>
</template>

<style scoped>
@import '../styles/index.css';
</style>
