<script setup lang="ts">
/**
 * AtengFilePreview 多格式文件在线预览门户组件。
 *
 * 采用原生 HTML5 与轻量容器（零重型 pdfjs 等依赖），
 * 支持图片灯箱、原生 PDF 内嵌、音视频播放、代码文本联动（复用 AtengCodeView）与未知格式降级下载。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { ref, computed, watch, onUnmounted } from 'vue';
import { ElDialog, ElImage, ElButton, ElEmpty } from 'element-plus';
import { AtengCodeView, type CodeViewLanguage } from '../code-view';
import { detectFileType, extractExtension } from './utils';
import type {
  AtengFilePreviewProps,
  AtengFilePreviewEmits,
  AtengFilePreviewSlots,
  AtengFilePreviewExpose,
  PreviewFileType,
} from './types';

defineOptions({
  name: 'AtengFilePreview',
});

const props = withDefaults(defineProps<AtengFilePreviewProps>(), {
  url: '',
  file: undefined,
  content: '',
  name: '',
  fileType: 'auto',
  mode: 'inline',
  visible: false,
  title: '',
  dialogWidth: '80%',
  height: '520px',
  downloadable: true,
  customClass: '',
});

const emit = defineEmits<AtengFilePreviewEmits>();
defineSlots<AtengFilePreviewSlots>();

// 本地 Blob URL 缓存
const objectUrl = ref<string>('');
const isLocalBlob = ref<boolean>(false);

// 生成或解析资源访问 URL
function resolveResourceUrl(): void {
  // 释放前序 ObjectURL 防内存泄漏
  if (objectUrl.value && isLocalBlob.value) {
    URL.revokeObjectURL(objectUrl.value);
    objectUrl.value = '';
    isLocalBlob.value = false;
  }

  if (props.file instanceof Blob) {
    objectUrl.value = URL.createObjectURL(props.file);
    isLocalBlob.value = true;
  } else if (props.url) {
    objectUrl.value = props.url;
    isLocalBlob.value = false;
  }
}

watch(
  () => [props.url, props.file],
  () => {
    resolveResourceUrl();
  },
  { immediate: true },
);

onUnmounted(() => {
  if (objectUrl.value && isLocalBlob.value) {
    URL.revokeObjectURL(objectUrl.value);
  }
});

// 计算最终目标 URL
const currentUrl = computed<string>(() => objectUrl.value);

// 计算有效文件名
const computedFileName = computed<string>(() => {
  if (props.name) return props.name;
  if (props.file instanceof File) return props.file.name;
  if (props.url) {
    const clean = props.url.split('?')[0].split('#')[0];
    const slashIdx = clean.lastIndexOf('/');
    if (slashIdx >= 0) return clean.slice(slashIdx + 1);
  }
  return 'unknown_file';
});

// 计算探测出的文件类型
const detectedType = computed<PreviewFileType>(() => {
  if (props.fileType !== 'auto') {
    return props.fileType;
  }
  const mime = props.file instanceof Blob ? props.file.type : undefined;
  return detectFileType(computedFileName.value || props.url, mime);
});

// 计算文本代码语言类型
const codeLanguage = computed<CodeViewLanguage>(() => {
  const ext = extractExtension(computedFileName.value);
  if (ext === 'json') return 'json';
  if (ext === 'sql') return 'sql';
  if (ext === 'js' || ext === 'jsx') return 'javascript';
  if (ext === 'ts' || ext === 'tsx') return 'typescript';
  if (ext === 'html' || ext === 'xml') return 'html';
  return 'text';
});

// 文本内容
const textContent = computed<string>(() => {
  return props.content || '';
});

// 触发下载
function download(): void {
  const url = currentUrl.value;
  const filename = computedFileName.value || 'download';
  if (!url) return;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  emit('download', filename);
}

// 弹窗关闭
function handleDialogClose(): void {
  emit('update:visible', false);
  emit('close');
}

defineExpose<AtengFilePreviewExpose>({
  download,
  detectedType: detectedType.value,
});
</script>

<template>
  <div :class="['at-file-preview', customClass]">
    <!-- 内嵌模式 -->
    <template v-if="mode === 'inline'">
      <div
        class="at-file-preview__container"
        :style="{ height: typeof height === 'number' ? `${height}px` : height }"
      >
        <!-- 1. 图片预览 -->
        <template v-if="detectedType === 'image'">
          <div class="at-file-preview__image-wrapper">
            <ElImage
              :src="currentUrl"
              fit="contain"
              :preview-src-list="[currentUrl]"
              preview-teleported
              class="at-file-preview__image"
            />
          </div>
        </template>

        <!-- 2. 原生 PDF 预览 -->
        <template v-else-if="detectedType === 'pdf'">
          <iframe :src="currentUrl" class="at-file-preview__pdf-frame" title="PDF Preview" />
        </template>

        <!-- 3. 原生视频播放 -->
        <template v-else-if="detectedType === 'video'">
          <div class="at-file-preview__media-wrapper">
            <video :src="currentUrl" controls class="at-file-preview__video" />
          </div>
        </template>

        <!-- 4. 原生音频播放 -->
        <template v-else-if="detectedType === 'audio'">
          <div class="at-file-preview__audio-wrapper">
            <div class="audio-disc">🎵</div>
            <div class="audio-title">{{ computedFileName }}</div>
            <audio :src="currentUrl" controls class="at-file-preview__audio" />
          </div>
        </template>

        <!-- 5. 源码与文本数据高亮预览 (复用 AtengCodeView) -->
        <template v-else-if="detectedType === 'code' || detectedType === 'text'">
          <AtengCodeView :code="textContent || currentUrl" :language="codeLanguage" height="100%" />
        </template>

        <!-- 6. 未知类型降级处理 -->
        <template v-else>
          <slot
            name="unsupported"
            :filename="computedFileName"
            :url="currentUrl"
            :download="download"
          >
            <div class="at-file-preview__unsupported">
              <ElEmpty description="该文件格式暂不支持在线直接渲染">
                <div class="unsupported-box">
                  <p class="file-name">文件名：{{ computedFileName }}</p>
                  <ElButton v-if="downloadable && currentUrl" type="primary" @click="download">
                    下载文件到本地
                  </ElButton>
                </div>
              </ElEmpty>
            </div>
          </slot>
        </template>
      </div>
    </template>

    <!-- 弹窗模式 -->
    <template v-else>
      <ElDialog
        :model-value="visible"
        :title="title || computedFileName || '文件在线预览'"
        :width="dialogWidth"
        append-to-body
        class="at-file-preview__dialog"
        @close="handleDialogClose"
      >
        <div
          class="at-file-preview__container is-dialog"
          :style="{ height: typeof height === 'number' ? `${height}px` : height }"
        >
          <!-- 递归复用自身内嵌视图 -->
          <AtengFilePreview
            mode="inline"
            :url="url"
            :file="file"
            :content="content"
            :name="name"
            :file-type="fileType"
            :downloadable="false"
            height="100%"
          />
        </div>

        <template #footer>
          <div class="at-file-preview__dialog-footer">
            <ElButton @click="handleDialogClose">关闭</ElButton>
            <ElButton v-if="downloadable && currentUrl" type="primary" @click="download">
              下载文件
            </ElButton>
          </div>
        </template>
      </ElDialog>
    </template>
  </div>
</template>

<style scoped lang="scss">
.at-file-preview {
  display: block;
  width: 100%;
  box-sizing: border-box;

  &__container {
    width: 100%;
    border-radius: 8px;
    overflow: hidden;
    background: var(--el-fill-color-light);
    border: 1px solid var(--el-border-color-lighter);
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__image-wrapper {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    box-sizing: border-box;
  }

  &__image {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }

  &__pdf-frame {
    width: 100%;
    height: 100%;
    border: none;
  }

  &__media-wrapper {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #000;
  }

  &__video {
    max-width: 100%;
    max-height: 100%;
  }

  &__audio-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding: 30px;

    .audio-disc {
      font-size: 48px;
      animation: spin 6s linear infinite;
    }

    .audio-title {
      font-size: 14px;
      font-weight: 500;
      color: var(--el-text-color-primary);
    }
  }

  &__unsupported {
    padding: 30px;

    .unsupported-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;

      .file-name {
        font-size: 13px;
        color: var(--el-text-color-secondary);
        margin: 0;
      }
    }
  }

  &__dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
