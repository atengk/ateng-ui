<script setup lang="ts">
/**
 * @atengk/ai-chat-vue 输入框与多模态附件发送控制组件。
 *
 * 集成 IME 中文合成保护 (CompositionGuard)、自适应伸缩高 (1~6行)、
 * 斜杠快捷指令菜单 (/ 指令)、文件拖拽、剪贴板图片直粘与 SPI 异步上传。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import type {
  AtengChatInputProps,
  AtengChatInputEmits,
  ChatAttachment,
  SlashCommand,
} from '../types';
import { IconSend, IconStop, IconPaperclip, IconX, IconLoading } from './icons';

const props = withDefaults(defineProps<AtengChatInputProps>(), {
  modelValue: '',
  placeholder: '请输入您的问题，Enter 发送，Shift+Enter 换行，输入 / 呼出快捷指令...',
  disabled: false,
  isStreaming: false,
  acceptedFileTypes: 'image/*,text/*,application/pdf',
  maxFileSize: 20 * 1024 * 1024, // 20MB
  attachments: () => [],
  minRows: 1,
  maxRows: 6,
  slashCommands: () => [],
});

const emit = defineEmits<AtengChatInputEmits>();

defineSlots<{
  prefix?: () => unknown;
  suffix?: () => unknown;
  actions?: () => unknown;
  attachments?: (props: { attachments: ChatAttachment[]; remove: (id: string) => void }) => unknown;
  'slash-menu'?: (props: {
    commands: SlashCommand[];
    activeIndex: number;
    select: (command: SlashCommand) => void;
  }) => unknown;
}>();

// 1. 输入文本与自适应高
const text = ref<string>(props.modelValue);
const textareaRef = ref<HTMLTextAreaElement | null>(null);

const adjustHeight = (): void => {
  const el = textareaRef.value;
  if (!el) return;

  el.style.height = 'auto';
  const lineHeight = 22; // 默认基准行高
  const minH = (props.minRows ?? 1) * lineHeight;
  const maxH = (props.maxRows ?? 6) * lineHeight;
  const targetH = Math.max(minH, Math.min(el.scrollHeight, maxH));

  el.style.height = `${targetH}px`;
  el.style.overflowY = el.scrollHeight > maxH ? 'auto' : 'hidden';
};

watch(
  () => props.modelValue,
  val => {
    if (val !== text.value) {
      text.value = val;
      nextTick(adjustHeight);
    }
  },
);

const onInput = (e: Event): void => {
  const target = e.target as HTMLTextAreaElement;
  text.value = target.value;
  emit('update:modelValue', target.value);
  adjustHeight();
};

// 2. CompositionGuard：IME 中文拼音合成守卫
const isComposing = ref(false);

const onCompositionStart = (): void => {
  isComposing.value = true;
};

const onCompositionEnd = (e: CompositionEvent): void => {
  isComposing.value = false;
  const target = e.target as HTMLTextAreaElement;
  text.value = target.value;
  emit('update:modelValue', target.value);
  adjustHeight();
};

// 3. 斜杠快捷指令面板
const defaultSlashCommands: SlashCommand[] = [
  { name: '/clear', description: '清空当前会话历史消息', icon: '🗑️' },
  { name: '/help', description: '查看快捷指令与提示说明', icon: '❓' },
  {
    name: '/prompt',
    description: '插入系统架构设计分析提示模板',
    icon: '💡',
    snippet: '作为资深系统架构师，请帮我分析：',
  },
];

const allCommands = computed<SlashCommand[]>(() => {
  return props.slashCommands && props.slashCommands.length > 0
    ? props.slashCommands
    : defaultSlashCommands;
});

const isSlashTriggered = computed(() => {
  return text.value.startsWith('/') && !text.value.includes('\n');
});

const slashQuery = computed(() => {
  if (!isSlashTriggered.value) return '';
  return text.value.slice(1).trim().toLowerCase();
});

const filteredCommands = computed<SlashCommand[]>(() => {
  if (!isSlashTriggered.value) return [];
  const q = slashQuery.value;
  if (!q) return allCommands.value;
  return allCommands.value.filter(
    cmd => cmd.name.toLowerCase().includes(q) || cmd.description.toLowerCase().includes(q),
  );
});

const activeCommandIndex = ref(0);
const showSlashMenu = ref(false);

watch(
  isSlashTriggered,
  triggered => {
    showSlashMenu.value = triggered && filteredCommands.value.length > 0;
    activeCommandIndex.value = 0;
  },
  { immediate: true },
);

watch(filteredCommands, list => {
  if (activeCommandIndex.value >= list.length) {
    activeCommandIndex.value = 0;
  }
});

const selectCommand = (command: SlashCommand): void => {
  emit('selectSlashCommand', command);

  if (command.snippet) {
    text.value = command.snippet;
    emit('update:modelValue', command.snippet);
    nextTick(adjustHeight);
  } else if (command.action) {
    command.action({
      setText: val => {
        text.value = val;
        emit('update:modelValue', val);
        nextTick(adjustHeight);
      },
      submit: () => onSubmit(),
      close: () => {
        showSlashMenu.value = false;
      },
    });
  } else {
    text.value = '';
    emit('update:modelValue', '');
    nextTick(adjustHeight);
  }

  showSlashMenu.value = false;
};

// 4. 附件状态管理与 Object URL 销毁防线
const innerAttachments = ref<ChatAttachment[]>([...props.attachments]);
const createdObjectUrls = new Set<string>();
const fileInputRef = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);

watch(
  () => props.attachments,
  val => {
    innerAttachments.value = [...val];
  },
  { deep: true },
);

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const revokeUrlIfLocal = (url: string): void => {
  if (createdObjectUrls.has(url)) {
    if (typeof window !== 'undefined' && window.URL && window.URL.revokeObjectURL) {
      window.URL.revokeObjectURL(url);
    }
    createdObjectUrls.delete(url);
  }
};

const removeAttachment = (id: string): void => {
  const idx = innerAttachments.value.findIndex(a => a.id === id);
  if (idx !== -1) {
    const item = innerAttachments.value[idx];
    if (item) {
      revokeUrlIfLocal(item.url);
      if (item.thumbnailUrl) {
        revokeUrlIfLocal(item.thumbnailUrl);
      }
    }
    innerAttachments.value.splice(idx, 1);
    emit('update:attachments', [...innerAttachments.value]);
  }
};

const handleFiles = async (files: FileList | File[]): Promise<void> => {
  const fileArray = Array.from(files);
  for (const file of fileArray) {
    if (file.size > props.maxFileSize) {
      emit(
        'fileError',
        `文件 "${file.name}" 大小超过限制 (${formatFileSize(props.maxFileSize)})`,
        file,
      );
      continue;
    }

    const tempId = `att_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    let previewUrl = '';
    if (typeof window !== 'undefined' && window.URL && window.URL.createObjectURL) {
      previewUrl = window.URL.createObjectURL(file);
      createdObjectUrls.add(previewUrl);
    }

    const isImage = file.type.startsWith('image/');
    const isAudio = file.type.startsWith('audio/');
    const attType: 'image' | 'file' | 'audio' = isImage ? 'image' : isAudio ? 'audio' : 'file';

    const attachment: ChatAttachment = {
      id: tempId,
      name: file.name,
      size: file.size,
      type: attType,
      url: previewUrl,
      thumbnailUrl: isImage ? previewUrl : undefined,
      status: props.uploadHandler ? 'uploading' : 'success',
      rawFile: file,
    };

    innerAttachments.value.push(attachment);
    emit('update:attachments', [...innerAttachments.value]);

    if (props.uploadHandler) {
      try {
        const uploaded = await props.uploadHandler(file);
        const idx = innerAttachments.value.findIndex(a => a.id === tempId);
        if (idx !== -1) {
          innerAttachments.value[idx] = {
            ...uploaded,
            id: tempId,
            status: 'success',
          };
          emit('update:attachments', [...innerAttachments.value]);
        }
      } catch {
        const idx = innerAttachments.value.findIndex(a => a.id === tempId);
        if (idx !== -1) {
          const item = innerAttachments.value[idx];
          if (item) {
            item.status = 'error';
          }
          emit('update:attachments', [...innerAttachments.value]);
        }
      }
    }
  }
};

const triggerFileInput = (): void => {
  if (props.disabled) return;
  fileInputRef.value?.click();
};

const onFileInputChange = async (e: Event): Promise<void> => {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    await handleFiles(target.files);
    target.value = '';
  }
};

// 拖拽
const onDragOver = (e: DragEvent): void => {
  if (props.disabled) return;
  e.preventDefault();
  isDragging.value = true;
};

const onDragLeave = (e: DragEvent): void => {
  e.preventDefault();
  isDragging.value = false;
};

const onDrop = async (e: DragEvent): Promise<void> => {
  if (props.disabled) return;
  e.preventDefault();
  isDragging.value = false;
  if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
    await handleFiles(e.dataTransfer.files);
  }
};

// 剪贴板直粘
const onPaste = async (e: ClipboardEvent): Promise<void> => {
  if (props.disabled) return;
  const clipboardData = e.clipboardData;
  if (!clipboardData) return;

  const pastedFiles: File[] = [];
  if (clipboardData.files && clipboardData.files.length > 0) {
    for (let i = 0; i < clipboardData.files.length; i++) {
      const file = clipboardData.files[i];
      if (file) {
        pastedFiles.push(file);
      }
    }
  } else if (clipboardData.items && clipboardData.items.length > 0) {
    for (let i = 0; i < clipboardData.items.length; i++) {
      const item = clipboardData.items[i];
      if (item && item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          pastedFiles.push(file);
        }
      }
    }
  }

  if (pastedFiles.length > 0) {
    await handleFiles(pastedFiles);
  }
};

// 提交发送
const onSubmit = (): void => {
  if (props.disabled || props.isStreaming) return;
  const trimmed = text.value.trim();
  const currentAtts = [...innerAttachments.value];
  if (!trimmed && currentAtts.length === 0) return;

  emit('submit', trimmed, currentAtts);
  text.value = '';
  innerAttachments.value = [];
  emit('update:modelValue', '');
  emit('update:attachments', []);
  nextTick(adjustHeight);
};

const onStop = (): void => {
  emit('stop');
};

const onKeydown = (e: KeyboardEvent): void => {
  // 斜杠指令菜单键盘导航
  if (showSlashMenu.value && filteredCommands.value.length > 0) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeCommandIndex.value = (activeCommandIndex.value + 1) % filteredCommands.value.length;
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeCommandIndex.value =
        (activeCommandIndex.value - 1 + filteredCommands.value.length) %
        filteredCommands.value.length;
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && !isComposing.value) {
      e.preventDefault();
      const activeCmd = filteredCommands.value[activeCommandIndex.value];
      if (activeCmd) {
        selectCommand(activeCmd);
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      showSlashMenu.value = false;
      return;
    }
  }

  // 常规 Enter 发送：IME 中文拼音状态硬拦截防线！
  if (e.key === 'Enter' && !e.shiftKey) {
    if (isComposing.value || e.isComposing) {
      return;
    }
    e.preventDefault();
    onSubmit();
  }
};

onMounted(() => {
  adjustHeight();
});

onUnmounted(() => {
  if (typeof window !== 'undefined' && window.URL && window.URL.revokeObjectURL) {
    for (const url of createdObjectUrls) {
      window.URL.revokeObjectURL(url);
    }
  }
  createdObjectUrls.clear();
});
</script>

<template>
  <div
    class="at-ai-chat__input-area"
    :class="{ 'is-dragging': isDragging }"
    @dragenter="onDragOver"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <!-- 隐藏的文件选择输入框 -->
    <input
      ref="fileInputRef"
      type="file"
      :accept="props.acceptedFileTypes"
      multiple
      class="at-ai-chat__file-hidden-input"
      @change="onFileInputChange"
    />

    <!-- 斜杠快捷指令弹出菜单浮层 -->
    <slot
      v-if="showSlashMenu && filteredCommands.length > 0"
      name="slash-menu"
      :commands="filteredCommands"
      :active-index="activeCommandIndex"
      :select="selectCommand"
    >
      <div class="at-ai-chat__slash-menu">
        <div class="at-ai-chat__slash-header">快捷指令</div>
        <div class="at-ai-chat__slash-list">
          <button
            v-for="(cmd, idx) in filteredCommands"
            :key="cmd.name"
            type="button"
            class="at-ai-chat__slash-item"
            :class="{ 'is-active': idx === activeCommandIndex }"
            @click="selectCommand(cmd)"
            @mouseenter="activeCommandIndex = idx"
          >
            <span v-if="cmd.icon" class="at-ai-chat__slash-icon">{{ cmd.icon }}</span>
            <div class="at-ai-chat__slash-info">
              <span class="at-ai-chat__slash-name">{{ cmd.name }}</span>
              <span class="at-ai-chat__slash-desc">{{ cmd.description }}</span>
            </div>
          </button>
        </div>
      </div>
    </slot>

    <!-- 待发送附件胶囊列表 -->
    <slot name="attachments" :attachments="innerAttachments" :remove="removeAttachment">
      <div v-if="innerAttachments.length > 0" class="at-ai-chat__attachment-list">
        <div
          v-for="att in innerAttachments"
          :key="att.id"
          class="at-ai-chat__attachment-capsule"
          :class="{
            'is-uploading': att.status === 'uploading',
            'is-error': att.status === 'error',
          }"
        >
          <img
            v-if="att.type === 'image' && att.thumbnailUrl"
            :src="att.thumbnailUrl"
            class="at-ai-chat__attachment-thumb"
            alt="缩略图"
          />
          <span v-else class="at-ai-chat__attachment-icon">📎</span>

          <div class="at-ai-chat__attachment-info">
            <span class="at-ai-chat__attachment-name" :title="att.name">{{ att.name }}</span>
            <span class="at-ai-chat__attachment-size">{{ formatFileSize(att.size) }}</span>
          </div>

          <IconLoading v-if="att.status === 'uploading'" class="at-ai-chat__attachment-loading" />
          <button
            v-else
            type="button"
            class="at-ai-chat__attachment-remove"
            title="移除附件"
            @click.stop="removeAttachment(att.id)"
          >
            <IconX />
          </button>
        </div>
      </div>
    </slot>

    <!-- 拖拽高亮浮层提示 -->
    <div v-if="isDragging" class="at-ai-chat__drag-overlay">
      <span>松开鼠标添加附件</span>
    </div>

    <div class="at-ai-chat__input-box">
      <!-- 前置插槽 -->
      <slot name="prefix" />

      <!-- 附件触发按钮 -->
      <button
        type="button"
        class="at-ai-chat__btn at-ai-chat__btn--attachment"
        :disabled="props.disabled"
        title="上传附件（支持拖拽与截图粘贴）"
        @click="triggerFileInput"
      >
        <IconPaperclip />
      </button>

      <!-- 自适应文本域 -->
      <textarea
        ref="textareaRef"
        :value="text"
        :placeholder="props.placeholder"
        :disabled="props.disabled"
        rows="1"
        class="at-ai-chat__textarea"
        @input="onInput"
        @keydown="onKeydown"
        @paste="onPaste"
        @compositionstart="onCompositionStart"
        @compositionend="onCompositionEnd"
      />

      <!-- 后置操作插槽或默认按钮 -->
      <slot name="actions">
        <!-- 停止按钮 -->
        <button
          v-if="props.isStreaming"
          type="button"
          class="at-ai-chat__btn at-ai-chat__btn--stop"
          title="停止生成"
          @click="onStop"
        >
          <IconStop />
        </button>

        <!-- 发送按钮 -->
        <button
          v-else
          type="button"
          class="at-ai-chat__btn at-ai-chat__btn--send"
          :disabled="props.disabled || (!text.trim() && innerAttachments.length === 0)"
          title="发送消息"
          @click="onSubmit"
        >
          <IconSend />
        </button>
      </slot>

      <!-- 后置插槽 -->
      <slot name="suffix" />
    </div>
  </div>
</template>
