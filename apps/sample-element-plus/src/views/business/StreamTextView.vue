<script setup lang="ts">
/**
 * AtengStreamText 流式打字机自验展厅。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { ref } from 'vue';
import {
  ElCard,
  ElButton,
  ElInput,
  ElSlider,
  ElSwitch,
  ElSpace,
  ElDivider,
  ElMessage,
} from 'element-plus';
import { AtengStreamText, type AtengStreamTextInstance } from '@atengk/element-plus';

const streamRef = ref<AtengStreamTextInstance>();
const rawText = ref<string>(
  '你好！我是 Ateng UI 工业级基础设施套件内置的 AI 打字机组件 AtengStreamText。\n我支持纯原生逐字切片、平滑闪烁光标自适应淡出，以及双轨对接 @atengk/vue 的 useStream 响应式状态机。',
);

const currentSpeed = ref<number>(30);
const showCursor = ref<boolean>(true);
const showCopy = ref<boolean>(true);
const cursorChar = ref<string>('|');

const finishedCount = ref<number>(0);
const onFinished = (val: string) => {
  finishedCount.value += 1;
  ElMessage.info(`打字完成！当前长度：${val.length}`);
};

const onCopy = (val: string) => {
  ElMessage.success(`复制成功 (${val.length} 字符)`);
};

const handleFlush = () => {
  streamRef.value?.flush();
};

const handleRestart = () => {
  streamRef.value?.restart();
};
</script>

<template>
  <div class="stream-text-view">
    <ElCard shadow="never" class="demo-card">
      <template #header>
        <div class="card-header">
          <span class="title">AtengStreamText AI 流式打字机</span>
          <span class="subtitle">面向大语言模型与 SSE 流式响应的轻量级纯文本呈现组件</span>
        </div>
      </template>

      <!-- 控制面板 -->
      <div class="controls-bar">
        <ElSpace wrap size="large">
          <div class="control-item">
            <span class="label">打字速率 (ms/字)：</span>
            <ElSlider v-model="currentSpeed" :min="0" :max="100" style="width: 150px" />
          </div>
          <div class="control-item">
            <span class="label">开启光标：</span>
            <ElSwitch v-model="showCursor" />
          </div>
          <div class="control-item">
            <span class="label">开启一键复制：</span>
            <ElSwitch v-model="showCopy" />
          </div>
          <div class="control-item">
            <span class="label">光标字符：</span>
            <ElInput v-model="cursorChar" style="width: 60px" size="small" />
          </div>
        </ElSpace>

        <div class="action-buttons">
          <ElButton type="primary" size="small" @click="handleRestart">重新打字</ElButton>
          <ElButton size="small" @click="handleFlush">立即跳过 (Flush)</ElButton>
        </div>
      </div>

      <ElDivider />

      <!-- 打字机容器展示 -->
      <div class="preview-area">
        <div class="chat-bubble">
          <div class="bubble-header">
            <span class="avatar">🤖</span>
            <span class="name">AI 助手</span>
            <span v-if="streamRef?.isFinished.value" class="tag finished">输出完成</span>
            <span v-else class="tag typing">正在思考生成中...</span>
          </div>
          <div class="bubble-body">
            <AtengStreamText
              ref="streamRef"
              :text="rawText"
              :speed="currentSpeed"
              :cursor="showCursor"
              :cursor-char="cursorChar"
              :show-copy="showCopy"
              @finished="onFinished"
              @copy="onCopy"
            />
          </div>
        </div>
      </div>

      <!-- 动态编辑内容测试 -->
      <ElDivider />
      <div class="custom-input-area">
        <span class="section-title">动态文本测试：</span>
        <ElInput
          v-model="rawText"
          type="textarea"
          :rows="3"
          placeholder="修改文本将自动触发增量打字..."
        />
      </div>
    </ElCard>
  </div>
</template>

<style scoped lang="scss">
.stream-text-view {
  .demo-card {
    border-radius: 8px;
  }

  .card-header {
    display: flex;
    flex-direction: column;
    gap: 4px;

    .title {
      font-size: 16px;
      font-weight: 600;
      color: var(--el-text-color-primary);
    }

    .subtitle {
      font-size: 13px;
      color: var(--el-text-color-secondary);
    }
  }

  .controls-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 16px;
  }

  .control-item {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--el-text-color-regular);
  }

  .preview-area {
    padding: 16px;
    background-color: var(--el-fill-color-light);
    border-radius: 6px;
  }

  .chat-bubble {
    max-width: 680px;
    background-color: var(--el-bg-color);
    border: 1px solid var(--el-border-color-light);
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);

    .bubble-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;

      .avatar {
        font-size: 20px;
      }

      .name {
        font-weight: 600;
        font-size: 14px;
      }

      .tag {
        font-size: 12px;
        padding: 2px 6px;
        border-radius: 4px;

        &.typing {
          background-color: var(--el-color-primary-light-9);
          color: var(--el-color-primary);
        }

        &.finished {
          background-color: var(--el-color-success-light-9);
          color: var(--el-color-success);
        }
      }
    }

    .bubble-body {
      font-size: 14px;
      line-height: 1.7;
    }
  }

  .custom-input-area {
    display: flex;
    flex-direction: column;
    gap: 8px;

    .section-title {
      font-size: 13px;
      font-weight: 600;
    }
  }
}
</style>
