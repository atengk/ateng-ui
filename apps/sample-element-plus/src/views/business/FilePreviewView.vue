<script setup lang="ts">
/**
 * AtengFilePreview 多格式文件预览展厅。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { ref } from 'vue';
import {
  ElCard,
  ElRadioGroup,
  ElRadioButton,
  ElButton,
  ElSpace,
  ElDivider,
  ElUpload,
  ElMessage,
} from 'element-plus';
import {
  AtengFilePreview,
  type PreviewDisplayMode,
  type PreviewFileType,
} from '@atengk/element-plus';

const displayMode = ref<PreviewDisplayMode>('inline');
const isDialogVisible = ref<boolean>(false);

// 预设预览选项
interface FileSample {
  label: string;
  name: string;
  url?: string;
  content?: string;
  fileType?: PreviewFileType;
}

const samples: FileSample[] = [
  {
    label: '🖼️ 图片 (PNG/SVG)',
    name: 'architecture_diagram.svg',
    url: 'https://vitejs.dev/logo.svg',
  },
  {
    label: '📄 原生 PDF',
    name: 'enterprise_whitepaper.pdf',
    url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
  },
  {
    label: '🎥 视频 (MP4)',
    name: 'product_intro.mp4',
    url: 'https://www.w3schools.com/html/mov_bbb.mp4',
  },
  {
    label: '🎵 音频 (MP3)',
    name: 'notification_sound.mp3',
    url: 'https://www.w3schools.com/html/horse.mp3',
  },
  {
    label: '💻 源码/数据 (JSON)',
    name: 'app_config.json',
    content: JSON.stringify(
      {
        projectName: 'ateng-ui',
        version: '0.1.0',
        architecture: '4-layer onion topology',
        features: ['zero-bloat', 'headless-first', 'snowflake-id-safe'],
      },
      null,
      2,
    ),
  },
  {
    label: '📦 未知格式 (ZIP 降级)',
    name: 'deployment_package_v1.zip',
    url: 'https://example.com/assets/deployment_package_v1.zip',
  },
];

const selectedSample = ref<FileSample>(samples[0]);
const localBlobFile = ref<File | null>(null);

const handleSelectSample = (sample: FileSample) => {
  localBlobFile.value = null;
  selectedSample.value = sample;
  if (displayMode.value === 'dialog') {
    isDialogVisible.value = true;
  }
};

const handleOpenDialog = () => {
  isDialogVisible.value = true;
};

const handleDownload = (filename: string) => {
  ElMessage.success(`正在下载：${filename}`);
};

// 本地选择文件即时预览
const handleLocalFileChange = (uploadFile: { raw?: File }) => {
  if (uploadFile.raw) {
    localBlobFile.value = uploadFile.raw;
    selectedSample.value = {
      label: '📂 本地选择文件',
      name: uploadFile.raw.name,
      fileType: 'auto',
    };
    if (displayMode.value === 'dialog') {
      isDialogVisible.value = true;
    }
    ElMessage.info(`已载入本地文件：${uploadFile.raw.name}`);
  }
};
</script>

<template>
  <div class="file-preview-view">
    <ElCard shadow="never" class="demo-card">
      <template #header>
        <div class="card-header">
          <span class="title">AtengFilePreview 多格式文件在线预览门户</span>
          <span class="subtitle">
            纯原生 HTML5 高性能内嵌（零第三方 pdfjs
            等重型体积），支持图片灯箱、PDF、音视频、代码高亮联动与未知格式降级下载
          </span>
        </div>
      </template>

      <!-- 控制器 -->
      <div class="toolbar">
        <ElSpace wrap :size="16">
          <div class="ctrl-group">
            <span class="label">展现交互模式：</span>
            <ElRadioGroup v-model="displayMode" size="small">
              <ElRadioButton value="inline">内联内嵌 (Inline)</ElRadioButton>
              <ElRadioButton value="dialog">模态弹窗 (Dialog)</ElRadioButton>
            </ElRadioGroup>
          </div>

          <ElButton
            v-if="displayMode === 'dialog'"
            type="primary"
            size="small"
            @click="handleOpenDialog"
          >
            打开弹窗预览
          </ElButton>

          <ElUpload :auto-upload="false" :show-file-list="false" :on-change="handleLocalFileChange">
            <ElButton size="small"> 📂 选取本地任意文件预览 </ElButton>
          </ElUpload>
        </ElSpace>
      </div>

      <!-- 快速切换样例 -->
      <div class="samples-bar">
        <span class="label">切换格式样例：</span>
        <ElSpace wrap>
          <ElButton
            v-for="s in samples"
            :key="s.name"
            size="small"
            :type="selectedSample.name === s.name && !localBlobFile ? 'primary' : 'default'"
            @click="handleSelectSample(s)"
          >
            {{ s.label }}
          </ElButton>
        </ElSpace>
      </div>

      <ElDivider />

      <!-- 内联视图 -->
      <div v-if="displayMode === 'inline'" class="preview-container">
        <AtengFilePreview
          :url="selectedSample.url"
          :file="localBlobFile || undefined"
          :content="selectedSample.content"
          :name="selectedSample.name"
          :file-type="selectedSample.fileType || 'auto'"
          height="520px"
          @download="handleDownload"
        />
      </div>

      <!-- 弹窗视图 -->
      <AtengFilePreview
        v-else
        v-model:visible="isDialogVisible"
        mode="dialog"
        :url="selectedSample.url"
        :file="localBlobFile || undefined"
        :content="selectedSample.content"
        :name="selectedSample.name"
        :file-type="selectedSample.fileType || 'auto'"
        height="560px"
        @download="handleDownload"
      />
    </ElCard>
  </div>
</template>

<style scoped lang="scss">
.file-preview-view {
  padding: 20px;

  .demo-card {
    border-radius: 8px;
  }

  .card-header {
    display: flex;
    flex-direction: column;
    gap: 4px;

    .title {
      font-size: 18px;
      font-weight: 600;
      color: var(--el-text-color-primary);
    }

    .subtitle {
      font-size: 13px;
      color: var(--el-text-color-secondary);
    }
  }

  .toolbar {
    margin-bottom: 12px;

    .ctrl-group {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: var(--el-text-color-regular);
    }
  }

  .samples-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--el-text-color-regular);
    margin-top: 8px;
  }

  .preview-container {
    margin-top: 12px;
  }
}
</style>
