<script setup lang="ts">
/**
 * @atengk/ai-chat-vue 输入框与多模态附件发送控制组件。
 *
 * 支持文本输入、快捷键发送、文件拖拽、剪贴板图片直粘、
 * 附件胶囊列表与预览，以及 SPI 异步上传机制。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { ref, watch, onUnmounted } from 'vue';
import type { AtengChatInputProps, AtengChatInputEmits, ChatAttachment } from '../types';
import { IconSend, IconStop, IconPaperclip, IconX, IconLoading } from './icons';

const props = withDefaults(defineProps<AtengChatInputProps>(), {
  modelValue: '',
  placeholder: '请输入您的问题，Enter 发送，Shift+Enter 换行...',
  disabled: false,
  isStreaming: false,
  acceptedFileTypes: 'image/*,text/*,application/pdf',
  maxFileSize: 20 * 1024 * 1024, // 20MB
  attachments: () => [],
});

const emit = defineEmits<AtengChatInputEmits>();

defineSlots<{
  prefix?: () => unknown;
  suffix?: () => unknown;
  actions?: () => unknown;
  attachments?: (props: { attachments: ChatAttachment[]; remove: (id: string) => void }) => unknown;
}>();

// 1. 输入文本双向状态
const text = ref<string>(props.modelValue);

watch(
  () => props.modelValue,
  val => {
    if (val !== text.value) {
      text.value = val;
    }
  },
);

const onInput = (e: Event): void => {
  const target = e.target as HTMLTextAreaElement;
  text.value = target.value;
  emit('update:modelValue', target.value);
};

// 2. 附件状态管理与 Object URL 销毁防线
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
    // 校验文件大小
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

    // 若有自定义 uploadHandler SPI
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

// 触发隐藏文件输入
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

// 3. 拖拽上传
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

// 4. 剪贴板直粘图片
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

// 5. 提交发送与停止
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
};

const onStop = (): void => {
  emit('stop');
};

const onKeydown = (e: KeyboardEvent): void => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    onSubmit();
  }
};

// 确定性销毁所有本地 Object URL
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
          <!-- 缩略图或图标 -->
          <img
            v-if="att.type === 'image' && att.thumbnailUrl"
            :src="att.thumbnailUrl"
            class="at-ai-chat__attachment-thumb"
            alt="缩略图"
          />
          <span v-else class="at-ai-chat__attachment-icon">📎</span>

          <!-- 文件名与大小 -->
          <div class="at-ai-chat__attachment-info">
            <span class="at-ai-chat__attachment-name" :title="att.name">{{ att.name }}</span>
            <span class="at-ai-chat__attachment-size">{{ formatFileSize(att.size) }}</span>
          </div>

          <!-- 加载中或删除按钮 -->
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
        :value="text"
        :placeholder="props.placeholder"
        :disabled="props.disabled"
        rows="1"
        class="at-ai-chat__textarea"
        @input="onInput"
        @keydown="onKeydown"
        @paste="onPaste"
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
