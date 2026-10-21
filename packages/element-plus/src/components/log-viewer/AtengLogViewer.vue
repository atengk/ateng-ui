<script setup lang="ts">
/**
 * AtengLogViewer 实时运维日志滚屏终端组件。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { ElInput, ElButton, ElTooltip, ElTag } from 'element-plus';
import { IconClear, IconDownload, IconScrollPause, IconScrollPlay } from './icons';
import type {
  AtengLogViewerProps,
  AtengLogViewerEmits,
  AtengLogViewerSlots,
  AtengLogViewerExpose,
  LogViewerTheme,
} from './types';

defineOptions({
  name: 'AtengLogViewer',
});

const props = withDefaults(defineProps<AtengLogViewerProps>(), {
  logs: () => [],
  webSocket: undefined,
  maxLines: 2000,
  theme: 'dark',
  autoScroll: true,
  height: '420px',
  title: '实时运行终端',
  showControls: true,
  customClass: '',
});

const emit = defineEmits<AtengLogViewerEmits>();
defineSlots<AtengLogViewerSlots>();

// 内部响应式状态
const logList = ref<string[]>([]);
const searchKeyword = ref<string>('');
const isAutoScroll = ref<boolean>(props.autoScroll);
const currentTheme = ref<LogViewerTheme>(props.theme);
const scrollBodyRef = ref<HTMLElement | null>(null);

// 格式化固定高度
const containerHeight = computed<string>(() => {
  return typeof props.height === 'number' ? `${props.height}px` : props.height;
});

// 过滤后的日志
const filteredLines = computed<string[]>(() => {
  const kw = searchKeyword.value.trim().toLowerCase();
  if (!kw) {
    return logList.value;
  }
  return logList.value.filter(line => line.toLowerCase().includes(kw));
});

const totalLines = computed<number>(() => logList.value.length);

// 限制最大行数
function trimBuffer(): void {
  if (logList.value.length > props.maxLines) {
    logList.value.splice(0, logList.value.length - props.maxLines);
  }
}

// 平滑滚动到底部
function scrollToBottom(): void {
  nextTick(() => {
    if (scrollBodyRef.value) {
      scrollBodyRef.value.scrollTop = scrollBodyRef.value.scrollHeight;
    }
  });
}

// 追加单条日志
function appendLog(line: string): void {
  logList.value.push(line);
  trimBuffer();
  if (isAutoScroll.value) {
    scrollToBottom();
  }
}

// 清空日志
function clear(): void {
  logList.value = [];
  emit('clear');
}

// 切换自动滚屏
function toggleAutoScroll(): void {
  isAutoScroll.value = !isAutoScroll.value;
  emit('scroll-change', isAutoScroll.value);
  if (isAutoScroll.value) {
    scrollToBottom();
  }
}

// 切换主题风格
function toggleTheme(): void {
  currentTheme.value = currentTheme.value === 'dark' ? 'light' : 'dark';
}

// 下载日志文件
function download(filename?: string): void {
  const content = logList.value.join('\n');
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `terminal_log_${Date.now()}.log`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  emit('download', logList.value);
}

// 监听用户手动滚动
function handleScroll(): void {
  if (!scrollBodyRef.value) return;
  const { scrollTop, scrollHeight, clientHeight } = scrollBodyRef.value;
  // 离底端超过 40px 则暂停自动滚屏
  const isNearBottom = scrollHeight - (scrollTop + clientHeight) < 40;
  if (!isNearBottom && isAutoScroll.value) {
    isAutoScroll.value = false;
    emit('scroll-change', false);
  } else if (isNearBottom && !isAutoScroll.value) {
    isAutoScroll.value = true;
    emit('scroll-change', true);
  }
}

// 高亮关键词
function highlightKeyword(text: string): string {
  const kw = searchKeyword.value.trim();
  if (!kw) return text;
  // 简易安全替换转义
  const escaped = kw.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
  return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark class="at-log-kw">$1</mark>');
}

// 监听静态 logs 属性变动
watch(
  () => props.logs,
  newLogs => {
    if (Array.isArray(newLogs)) {
      logList.value = [...newLogs];
      trimBuffer();
      if (isAutoScroll.value) {
        scrollToBottom();
      }
    }
  },
  { immediate: true },
);

// 监听 WebSocket 实时流
watch(
  () => props.webSocket?.latestMessage?.value,
  msg => {
    if (msg !== undefined && msg !== null) {
      const text = typeof msg === 'object' ? JSON.stringify(msg) : String(msg);
      appendLog(text);
    }
  },
);

onMounted(() => {
  if (isAutoScroll.value) {
    scrollToBottom();
  }
});

defineExpose<AtengLogViewerExpose>({
  clear,
  download,
  scrollToBottom,
  appendLog,
  totalLines,
  filteredLines,
});
</script>

<template>
  <div
    :class="['at-log-viewer', `at-log-viewer--${currentTheme}`, customClass]"
    :style="{ height: containerHeight }"
  >
    <!-- 终端 Header 栏 -->
    <div v-if="showControls" class="at-log-viewer__header">
      <slot name="header" :total="totalLines" :auto-scroll="isAutoScroll">
        <div class="at-log-viewer__title-group">
          <!-- macOS 风格红黄绿装饰圆点 -->
          <div class="at-log-viewer__dots">
            <span class="dot dot--red" />
            <span class="dot dot--yellow" />
            <span class="dot dot--green" />
          </div>
          <span class="at-log-viewer__title">{{ title }}</span>
          <ElTag size="small" type="info" effect="plain" class="at-log-viewer__line-tag">
            {{ filteredLines.length }}/{{ totalLines }} 行
          </ElTag>

          <!-- WebSocket 连接状态指示灯 -->
          <span
            v-if="webSocket"
            :class="[
              'at-log-viewer__status-dot',
              webSocket.status?.value === 'OPEN' && 'status--open',
              webSocket.status?.value === 'CONNECTING' && 'status--connecting',
              webSocket.status?.value === 'CLOSED' && 'status--closed',
            ]"
            :title="`WS 状态: ${webSocket.status?.value || 'UNKNOWN'}`"
          />
        </div>

        <!-- 控件区域 -->
        <div class="at-log-viewer__controls">
          <!-- 检索输入框 -->
          <ElInput
            v-model="searchKeyword"
            placeholder="过滤日志..."
            clearable
            size="small"
            class="at-log-viewer__search-input"
          />

          <!-- 自动滚屏切换 -->
          <ElTooltip :content="isAutoScroll ? '暂停自动滚屏' : '开启自动滚屏'" placement="top">
            <button
              type="button"
              class="at-log-viewer__ctrl-btn"
              :class="{ 'is-active': isAutoScroll }"
              @click="toggleAutoScroll"
            >
              <IconScrollPause v-if="isAutoScroll" />
              <IconScrollPlay v-else />
            </button>
          </ElTooltip>

          <!-- 清空 -->
          <ElTooltip content="清空终端" placement="top">
            <button type="button" class="at-log-viewer__ctrl-btn" @click="clear">
              <IconClear />
            </button>
          </ElTooltip>

          <!-- 导出下载 -->
          <ElTooltip content="下载日志" placement="top">
            <button type="button" class="at-log-viewer__ctrl-btn" @click="() => download()">
              <IconDownload />
            </button>
          </ElTooltip>

          <!-- 主题切换 -->
          <button
            type="button"
            class="at-log-viewer__ctrl-btn theme-toggle-btn"
            title="切换主题"
            @click="toggleTheme"
          >
            {{ currentTheme === 'dark' ? '☀️' : '🌙' }}
          </button>
        </div>
      </slot>
    </div>

    <!-- 终端日志内容滚动区 -->
    <div ref="scrollBodyRef" class="at-log-viewer__body" @scroll="handleScroll">
      <template v-if="filteredLines.length > 0">
        <div v-for="(line, idx) in filteredLines" :key="idx" class="at-log-viewer__line">
          <slot name="line" :text="line" :index="idx" :highlighted="highlightKeyword(line)">
            <span class="at-log-viewer__line-no">{{ idx + 1 }}</span>
            <span class="at-log-viewer__line-content" v-html="highlightKeyword(line)" />
          </slot>
        </div>
      </template>

      <!-- 空日志占位 -->
      <template v-else>
        <div class="at-log-viewer__empty">
          <slot name="empty">
            <span>{{ searchKeyword ? '无匹配日志' : '~ 暂无日志输出 ~' }}</span>
          </slot>
        </div>
      </template>
    </div>

    <!-- 恢复贴底滚屏悬浮微标 -->
    <div
      v-if="!isAutoScroll && totalLines > 0"
      class="at-log-viewer__resume-scroll"
      @click="toggleAutoScroll"
    >
      <span>⬇ 恢复自动滚屏</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
.at-log-viewer {
  display: flex;
  flex-direction: column;
  position: relative;
  width: 100%;
  border-radius: var(--el-border-radius-base, 8px);
  overflow: hidden;
  font-family: 'Consolas', 'Menlo', 'Monaco', 'Courier New', monospace;
  box-sizing: border-box;
  border: 1px solid var(--el-border-color-light);
  transition: all 0.2s ease;

  // 暗色黑客终端风格
  &--dark {
    background-color: #141414;
    color: #e6e6e6;

    .at-log-viewer__header {
      background-color: #1f1f1f;
      border-bottom: 1px solid #2d2d2d;
    }

    .at-log-viewer__ctrl-btn {
      color: #999;
      background: #2a2a2a;
      border: 1px solid #3a3a3a;

      &:hover {
        color: #fff;
        background: #333;
      }

      &.is-active {
        color: var(--el-color-primary, #409eff);
        border-color: var(--el-color-primary, #409eff);
      }
    }

    .at-log-viewer__line-no {
      color: #555;
    }

    .at-log-viewer__line:hover {
      background-color: rgba(255, 255, 255, 0.04);
    }

    :deep(.at-log-kw) {
      background-color: #d48800;
      color: #fff;
      border-radius: 2px;
      padding: 0 2px;
    }
  }

  // 亮色纸质终端风格
  &--light {
    background-color: #fafafa;
    color: #262626;

    .at-log-viewer__header {
      background-color: #f0f0f0;
      border-bottom: 1px solid #e0e0e0;
    }

    .at-log-viewer__ctrl-btn {
      color: #666;
      background: #fff;
      border: 1px solid #d9d9d9;

      &:hover {
        color: #000;
        background: #f5f5f5;
      }

      &.is-active {
        color: var(--el-color-primary, #409eff);
        border-color: var(--el-color-primary, #409eff);
      }
    }

    .at-log-viewer__line-no {
      color: #bfbfbf;
    }

    .at-log-viewer__line:hover {
      background-color: rgba(0, 0, 0, 0.03);
    }

    :deep(.at-log-kw) {
      background-color: #ffe58f;
      color: #000;
      border-radius: 2px;
      padding: 0 2px;
    }
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    user-select: none;
    flex-shrink: 0;
  }

  &__title-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__dots {
    display: flex;
    gap: 6px;

    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;

      &--red {
        background-color: #ff5f56;
      }
      &--yellow {
        background-color: #ffbd2e;
      }
      &--green {
        background-color: #27c93f;
      }
    }
  }

  &__title {
    font-size: 13px;
    font-weight: 600;
  }

  &__line-tag {
    font-size: 11px;
    padding: 0 4px;
    height: 18px;
    line-height: 16px;
  }

  &__status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
    background-color: #8c8c8c;

    &.status--open {
      background-color: #52c41a;
      box-shadow: 0 0 6px #52c41a;
    }
    &.status--connecting {
      background-color: #faad14;
      box-shadow: 0 0 6px #faad14;
    }
    &.status--closed {
      background-color: #ff4d4f;
    }
  }

  &__controls {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  &__search-input {
    width: 120px;
  }

  &__ctrl-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    padding: 0;
    transition: all 0.15s ease;
  }

  &__body {
    flex: 1;
    overflow-y: auto;
    padding: 8px 12px;
    font-size: 12px;
    line-height: 1.6;
    word-break: break-all;
    white-space: pre-wrap;
  }

  &__line {
    display: flex;
    align-items: flex-start;
    padding: 1px 0;
  }

  &__line-no {
    width: 36px;
    text-align: right;
    margin-right: 12px;
    user-select: none;
    font-size: 11px;
    flex-shrink: 0;
  }

  &__line-content {
    flex: 1;
  }

  &__empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #8c8c8c;
    font-style: italic;
  }

  &__resume-scroll {
    position: absolute;
    bottom: 12px;
    right: 16px;
    background-color: var(--el-color-primary, #409eff);
    color: #fff;
    padding: 4px 10px;
    font-size: 12px;
    border-radius: 12px;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    user-select: none;
    animation: at-float 1.5s infinite ease-in-out;

    &:hover {
      opacity: 0.9;
    }
  }
}

@keyframes at-float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-3px);
  }
}
</style>
