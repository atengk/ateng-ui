<script setup lang="ts">
/**
 * @atengk/ai-chat-vue 独立产物工作台侧边栏组件。
 *
 * 遵循 L2 零 Element Plus 依赖纯净律，采用纯原生 CSS 变量驱动，
 * 支持版本不可变演进回溯、三模（Preview/Code/Diff）切换、拖拽调节宽度、
 * 窄屏抽屉自适应、文件下载与 Monaco Diff 插槽反转装配。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { ref, computed, onMounted, onUnmounted } from 'vue';
import type {
  AtengArtifactSidebarProps,
  AtengArtifactSidebarEmits,
  ArtifactMode,
  ArtifactVersion,
} from '../types';
import AtengCodeBlock from './AtengCodeBlock.vue';
import {
  IconFileCode,
  IconEye,
  IconGitDiff,
  IconCopy,
  IconCheck,
  IconDownload,
  IconMaximize,
  IconMinimize,
  IconX,
} from './icons';

const props = withDefaults(defineProps<AtengArtifactSidebarProps>(), {
  visible: true,
  initialMode: 'code',
  width: 560,
  minWidth: 360,
  maxWidth: 960,
  breakpoint: 768,
});

const emit = defineEmits<AtengArtifactSidebarEmits>();

defineSlots<{
  header?: (props: {
    artifact: AtengArtifactSidebarProps['artifact'];
    activeVersion: number;
    mode: ArtifactMode;
  }) => unknown;
  preview?: (props: { code: string; language: string }) => unknown;
  code?: (props: { code: string; language: string }) => unknown;
  diff?: (props: {
    originalCode: string;
    modifiedCode: string;
    language: string;
    originalVersion: number;
    modifiedVersion: number;
  }) => unknown;
}>();

const currentMode = ref<ArtifactMode>(props.initialMode);
const isMaximized = ref(false);
const sidebarWidth = ref(props.width);
const isCopied = ref(false);
const isMobile = ref(false);

// 视口与响应式监听
const checkMobile = (): void => {
  if (typeof window !== 'undefined') {
    isMobile.value = window.innerWidth < (props.breakpoint || 768);
  }
};

onMounted(() => {
  checkMobile();
  window.addEventListener('resize', checkMobile);
});

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', checkMobile);
    cleanupDragListeners();
  }
});

// 当前激活选中的版本序号（1-indexed）
const selectedVersion = computed<number>({
  get: () => {
    if (props.activeVersion !== undefined) {
      return props.activeVersion;
    }
    if (props.artifact && props.artifact.versions.length > 0) {
      const last = props.artifact.versions[props.artifact.versions.length - 1];
      return last ? last.version : 1;
    }
    return 1;
  },
  set: val => {
    emit('update:activeVersion', val);
    emit('versionChange', val);
  },
});

// 当前版本实体
const currentVersionItem = computed<ArtifactVersion | null>(() => {
  if (!props.artifact || props.artifact.versions.length === 0) {
    return null;
  }
  const found = props.artifact.versions.find(v => v.version === selectedVersion.value);
  if (found) {
    return found;
  }
  const last = props.artifact.versions[props.artifact.versions.length - 1];
  return last ?? null;
});

// 上一版本实体（用于 Diff 对比）
const previousVersionItem = computed<ArtifactVersion | null>(() => {
  if (!props.artifact || props.artifact.versions.length === 0) {
    return null;
  }
  const currentIndex = props.artifact.versions.findIndex(v => v.version === selectedVersion.value);
  if (currentIndex > 0) {
    return props.artifact.versions[currentIndex - 1] ?? null;
  }
  return null;
});

const originalCode = computed<string>(() => {
  return previousVersionItem.value?.code ?? '';
});

const modifiedCode = computed<string>(() => {
  return currentVersionItem.value?.code ?? '';
});

const originalVersionNum = computed<number>(() => {
  return previousVersionItem.value?.version ?? 0;
});

const setMode = (mode: ArtifactMode): void => {
  currentMode.value = mode;
  emit('modeChange', mode);
};

const toggleMaximize = (): void => {
  isMaximized.value = !isMaximized.value;
};

const handleClose = (): void => {
  emit('update:visible', false);
  emit('close');
};

const copyCode = async (): Promise<void> => {
  const code = currentVersionItem.value?.code;
  if (!code) return;
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(code);
    }
    isCopied.value = true;
    setTimeout(() => {
      isCopied.value = false;
    }, 2000);
  } catch {
    // 忽略异常
  }
};

const downloadFile = (): void => {
  if (!props.artifact || !currentVersionItem.value) return;
  const code = currentVersionItem.value.code;
  const lang = props.artifact.language || 'txt';
  const ext =
    lang === 'vue'
      ? 'vue'
      : lang === 'typescript' || lang === 'ts'
        ? 'ts'
        : lang === 'javascript' || lang === 'js'
          ? 'js'
          : lang === 'html'
            ? 'html'
            : lang === 'svg'
              ? 'svg'
              : 'txt';
  const fileName = `${props.artifact.identifier || 'artifact'}_v${selectedVersion.value}.${ext}`;

  try {
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch {
    // 忽略异常
  }
};

// 拖拽宽度调节
let startX = 0;
let startWidth = 0;

const onMouseDownResizer = (e: MouseEvent): void => {
  if (isMobile.value || isMaximized.value) return;
  startX = e.clientX;
  startWidth = sidebarWidth.value;

  window.addEventListener('mousemove', onMouseMoveResizer);
  window.addEventListener('mouseup', onMouseUpResizer);
  document.body.style.userSelect = 'none';
  document.body.style.cursor = 'col-resize';
};

const onMouseMoveResizer = (e: MouseEvent): void => {
  const deltaX = startX - e.clientX;
  const newWidth = Math.max(
    props.minWidth ?? 360,
    Math.min(props.maxWidth ?? 960, startWidth + deltaX),
  );
  sidebarWidth.value = newWidth;
};

const onMouseUpResizer = (): void => {
  cleanupDragListeners();
};

const cleanupDragListeners = (): void => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('mousemove', onMouseMoveResizer);
    window.removeEventListener('mouseup', onMouseUpResizer);
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  }
};
</script>

<template>
  <div v-if="props.visible" class="at-artifact-sidebar-root">
    <!-- 移动端背景遮罩 -->
    <div
      v-if="isMobile"
      class="at-artifact-sidebar__overlay"
      aria-hidden="true"
      @click="handleClose"
    />

    <!-- 侧边栏主体容器 -->
    <aside
      class="at-artifact-sidebar"
      :class="{
        'at-artifact-sidebar--mobile': isMobile,
        'at-artifact-sidebar--maximized': isMaximized,
      }"
      :style="{ width: isMaximized || isMobile ? '100%' : `${sidebarWidth}px` }"
    >
      <!-- 拖拽把手 (仅在桌面端且非最大化时有效) -->
      <div
        v-if="!isMobile && !isMaximized"
        class="at-artifact-sidebar__resizer"
        title="按住拖拽调节宽度"
        @mousedown="onMouseDownResizer"
      />

      <!-- 顶栏工具区 -->
      <header class="at-artifact-sidebar__header">
        <slot
          name="header"
          :artifact="props.artifact"
          :active-version="selectedVersion"
          :mode="currentMode"
        >
          <!-- 产物元数据 -->
          <div class="at-artifact-sidebar__title-box">
            <span class="at-artifact-sidebar__icon-badge">
              <IconFileCode />
            </span>
            <div class="at-artifact-sidebar__title-text" :title="props.artifact?.title">
              {{ props.artifact?.title || '独立产物工作台' }}
            </div>
            <span v-if="props.artifact" class="at-artifact-sidebar__lang-pill">
              {{ (props.artifact.language || 'code').toUpperCase() }}
            </span>
          </div>

          <!-- 版本切换器 -->
          <div
            v-if="props.artifact && props.artifact.versions.length > 0"
            class="at-artifact-sidebar__version-box"
          >
            <select
              v-model.number="selectedVersion"
              class="at-artifact-sidebar__version-select"
              aria-label="选择产物版本"
            >
              <option v-for="v in props.artifact.versions" :key="v.version" :value="v.version">
                v{{ v.version }} {{ v.summary ? `(${v.summary})` : '' }}
              </option>
            </select>
          </div>

          <!-- 模式切换 Tab -->
          <div class="at-artifact-sidebar__mode-group">
            <button
              type="button"
              class="at-artifact-sidebar__tab-btn"
              :class="{ 'at-artifact-sidebar__tab-btn--active': currentMode === 'preview' }"
              data-mode="preview"
              @click="setMode('preview')"
            >
              <IconEye />
              <span>预览</span>
            </button>
            <button
              type="button"
              class="at-artifact-sidebar__tab-btn"
              :class="{ 'at-artifact-sidebar__tab-btn--active': currentMode === 'code' }"
              data-mode="code"
              @click="setMode('code')"
            >
              <IconFileCode />
              <span>源码</span>
            </button>
            <button
              type="button"
              class="at-artifact-sidebar__tab-btn"
              :class="{ 'at-artifact-sidebar__tab-btn--active': currentMode === 'diff' }"
              data-mode="diff"
              @click="setMode('diff')"
            >
              <IconGitDiff />
              <span>比对</span>
            </button>
          </div>

          <!-- 动作操作组 -->
          <div class="at-artifact-sidebar__actions">
            <button
              type="button"
              class="at-artifact-sidebar__action-btn"
              :title="isCopied ? '已复制！' : '复制代码'"
              @click="copyCode"
            >
              <IconCheck v-if="isCopied" class="at-artifact-sidebar__check-icon" />
              <IconCopy v-else />
            </button>
            <button
              type="button"
              class="at-artifact-sidebar__action-btn"
              title="下载文件"
              @click="downloadFile"
            >
              <IconDownload />
            </button>
            <button
              v-if="!isMobile"
              type="button"
              class="at-artifact-sidebar__action-btn"
              :title="isMaximized ? '还原窗口' : '全屏最大化'"
              @click="toggleMaximize"
            >
              <IconMinimize v-if="isMaximized" />
              <IconMaximize v-else />
            </button>
            <button
              type="button"
              class="at-artifact-sidebar__action-btn at-artifact-sidebar__close-btn"
              title="关闭侧边栏"
              @click="handleClose"
            >
              <IconX />
            </button>
          </div>
        </slot>
      </header>

      <!-- 视图内容区域 -->
      <main class="at-artifact-sidebar__body">
        <template v-if="props.artifact && currentVersionItem">
          <!-- 1. Preview 视图 -->
          <div v-show="currentMode === 'preview'" class="at-artifact-sidebar__preview-container">
            <slot
              name="preview"
              :code="currentVersionItem.code"
              :language="props.artifact.language"
            >
              <!-- HTML / SVG 原生独立安全预览沙箱 -->
              <iframe
                v-if="
                  props.artifact.language === 'html' ||
                  props.artifact.language === 'svg' ||
                  props.artifact.type === 'html' ||
                  props.artifact.type === 'svg'
                "
                class="at-artifact-sidebar__iframe"
                sandbox="allow-scripts"
                :srcdoc="currentVersionItem.code"
              />
              <div v-else class="at-artifact-sidebar__preview-fallback">
                <div class="at-artifact-sidebar__fallback-notice">
                  当前语言 ({{ props.artifact.language }})
                  暂不支持内联渲染沙箱，展示格式化源码预览：
                </div>
                <AtengCodeBlock
                  :code="currentVersionItem.code"
                  :language="props.artifact.language"
                />
              </div>
            </slot>
          </div>

          <!-- 2. Code 源码视图 -->
          <div v-show="currentMode === 'code'" class="at-artifact-sidebar__code-container">
            <slot name="code" :code="currentVersionItem.code" :language="props.artifact.language">
              <AtengCodeBlock :code="currentVersionItem.code" :language="props.artifact.language" />
            </slot>
          </div>

          <!-- 3. Diff 比对视图 -->
          <div v-show="currentMode === 'diff'" class="at-artifact-sidebar__diff-container">
            <slot
              name="diff"
              :original-code="originalCode"
              :modified-code="modifiedCode"
              :language="props.artifact.language"
              :original-version="originalVersionNum"
              :modified-version="selectedVersion"
            >
              <!-- 原生对称分栏 Fallback -->
              <div class="at-artifact-sidebar__diff-fallback">
                <div class="at-artifact-sidebar__diff-col">
                  <div class="at-artifact-sidebar__diff-tag">
                    原始版本 (v{{ originalVersionNum || 0 }})
                  </div>
                  <AtengCodeBlock
                    :code="originalCode || '// 无前置版本'"
                    :language="props.artifact.language"
                  />
                </div>
                <div class="at-artifact-sidebar__diff-col">
                  <div class="at-artifact-sidebar__diff-tag at-artifact-sidebar__diff-tag--mod">
                    当前版本 (v{{ selectedVersion }})
                  </div>
                  <AtengCodeBlock :code="modifiedCode" :language="props.artifact.language" />
                </div>
              </div>
            </slot>
          </div>
        </template>

        <!-- 空状态 -->
        <div v-else class="at-artifact-sidebar__empty">
          <IconFileCode class="at-artifact-sidebar__empty-icon" />
          <p>当前暂无可展示的产物内容</p>
        </div>
      </main>
    </aside>
  </div>
</template>

<style scoped>
.at-artifact-sidebar-root {
  display: flex;
  height: 100%;
}

.at-artifact-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--at-chat-bg, #ffffff);
  border-left: 1px solid var(--at-chat-border, #e2e8f0);
  box-sizing: border-box;
  position: relative;
  z-index: 20;
  transition: width 0.05s ease;
}

.at-artifact-sidebar--maximized {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  width: 100% !important;
  z-index: 100;
  border-left: none;
}

.at-artifact-sidebar--mobile {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 100% !important;
  max-width: 100vw;
  z-index: 1000;
  box-shadow: -4px 0 16px rgba(0, 0, 0, 0.15);
}

.at-artifact-sidebar__overlay {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background-color: rgba(0, 0, 0, 0.4);
  z-index: 999;
}

.at-artifact-sidebar__resizer {
  position: absolute;
  top: 0;
  left: -4px;
  width: 8px;
  height: 100%;
  cursor: col-resize;
  z-index: 25;
  transition: background-color 0.2s;
}

.at-artifact-sidebar__resizer:hover {
  background-color: #2563eb;
}

.at-artifact-sidebar__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid var(--at-chat-border, #e2e8f0);
  background-color: var(--at-chat-surface, #f8fafc);
  gap: 10px;
  flex-wrap: wrap;
}

.at-artifact-sidebar__title-box {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 120px;
}

.at-artifact-sidebar__icon-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #2563eb;
}

.at-artifact-sidebar__title-text {
  font-size: 13px;
  font-weight: 600;
  color: var(--at-chat-text-primary, #0f172a);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
}

.at-artifact-sidebar__lang-pill {
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 4px;
  background-color: var(--at-chat-border, #e2e8f0);
  color: var(--at-chat-text-secondary, #64748b);
  font-family: monospace;
}

.at-artifact-sidebar__version-box {
  display: flex;
  align-items: center;
}

.at-artifact-sidebar__version-select {
  padding: 4px 8px;
  font-size: 12px;
  border-radius: 4px;
  border: 1px solid var(--at-chat-border, #cbd5e1);
  background-color: var(--at-chat-bg, #ffffff);
  color: var(--at-chat-text-primary, #0f172a);
  cursor: pointer;
  outline: none;
}

.at-artifact-sidebar__mode-group {
  display: flex;
  background-color: var(--at-chat-border, #e2e8f0);
  padding: 2px;
  border-radius: 6px;
  gap: 2px;
}

.at-artifact-sidebar__tab-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  font-size: 12px;
  border: none;
  background: transparent;
  color: var(--at-chat-text-secondary, #64748b);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.at-artifact-sidebar__tab-btn--active {
  background-color: var(--at-chat-bg, #ffffff);
  color: #2563eb;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.at-artifact-sidebar__actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.at-artifact-sidebar__action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: var(--at-chat-text-secondary, #64748b);
  cursor: pointer;
  transition: all 0.15s ease;
}

.at-artifact-sidebar__action-btn:hover {
  background-color: rgba(0, 0, 0, 0.06);
  color: var(--at-chat-text-primary, #0f172a);
}

.at-artifact-sidebar__check-icon {
  color: #10b981;
}

.at-artifact-sidebar__close-btn:hover {
  background-color: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.at-artifact-sidebar__body {
  flex: 1;
  overflow: auto;
  position: relative;
  background-color: var(--at-chat-bg, #ffffff);
}

.at-artifact-sidebar__preview-container,
.at-artifact-sidebar__code-container,
.at-artifact-sidebar__diff-container {
  height: 100%;
  box-sizing: border-box;
}

.at-artifact-sidebar__iframe {
  width: 100%;
  height: 100%;
  border: none;
  background-color: #ffffff;
}

.at-artifact-sidebar__svg-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  height: 100%;
  box-sizing: border-box;
}

.at-artifact-sidebar__preview-fallback {
  padding: 12px;
}

.at-artifact-sidebar__fallback-notice {
  font-size: 12px;
  color: var(--at-chat-text-secondary, #64748b);
  margin-bottom: 8px;
}

.at-artifact-sidebar__diff-fallback {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 12px;
  height: 100%;
  box-sizing: border-box;
}

.at-artifact-sidebar__diff-col {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.at-artifact-sidebar__diff-tag {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 8px;
  background-color: var(--at-chat-surface, #f1f5f9);
  color: var(--at-chat-text-secondary, #64748b);
  border-radius: 4px 4px 0 0;
}

.at-artifact-sidebar__diff-tag--mod {
  background-color: rgba(16, 185, 129, 0.15);
  color: #059669;
}

.at-artifact-sidebar__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--at-chat-text-muted, #94a3b8);
  font-size: 13px;
  gap: 12px;
}

.at-artifact-sidebar__empty-icon {
  width: 40px;
  height: 40px;
  opacity: 0.5;
}
</style>
