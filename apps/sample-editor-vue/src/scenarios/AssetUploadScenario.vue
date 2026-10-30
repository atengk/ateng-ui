<script setup lang="ts">
/**
 * 媒体资产上传拦截 SPI、骨架占位与优雅降级自验场景 (Asset Upload Scenario)。
 *
 * 验证 TipTap 媒体上传与上下文微浮层交互：
 * 1. 声明式 uploadHandler 属性拦截剪贴板粘贴、外部拖拽与工具栏上传；
 * 2. 异步未决期间显示骨架加载占位块，完成后平滑置换为真实图片；
 * 3. 未配置 uploadHandler 时自动 Base64 降级；
 * 4. 选中图片唤起居左/居中/居右/删除微浮层；
 * 5. 选中超链接唤起打开/编辑/取消微浮层。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { ref } from 'vue';
import {
  AtengEditor,
  type AtengEditorInstance,
  type UploadHandler,
  type UploadSuccessPayload,
} from '@atengk/editor-vue';
import { ElMessage } from 'element-plus';

// 初始富文本内容（预置图文混排与超链接）
const initialContent = `
<h2>🖼️ 媒体资产上传与上下文微浮层演示</h2>
<p>本场景演示媒体资产上传生命周期与富文本媒体操控人体工学：</p>
<p>
  访问官方代码仓库：<a href="https://github.com/atengk/ateng-ui" target="_blank" rel="noopener noreferrer">ateng-ui GitHub 仓库</a>。点击该超链接可激活链接上下文微浮层。
</p>
<p>点击下方图片可激活图片对齐与删除微浮层：</p>
<p style="text-align: center;">
  <img src="https://picsum.photos/400/200?random=1" alt="演示随机图片" />
</p>
<p>💡 <b>测试方式</b>：</p>
<ul>
  <li><b>剪贴板粘贴</b>：使用微信/微信截图工具截图后，直接在正文中按 <code>Ctrl + V</code> 粘贴；</li>
  <li><b>本地文件拖拽</b>：从文件管理器中拖动任意 <code>.png / .jpg / .webp</code> 图片文件释放至编辑器内；</li>
  <li><b>工具栏图片按钮</b>：点击上方工具栏的图片图标，在弹出的文件对话框中选取图片；</li>
  <li><b>外部按钮触发</b>：点击右侧操作面板的“通过 Expose 手动触发图片上传”按钮。</li>
</ul>
`;

const content = ref<string>(initialContent);
const fallbackContent = ref<string>(
  '<h3>📦 无 uploadHandler 自动 Base64 降级测试区</h3><p>在此粘贴或拖拽图片，验证开箱即用的 Base64 降级：</p>',
);

const editorRef = ref<AtengEditorInstance | null>(null);
const fallbackEditorRef = ref<AtengEditorInstance | null>(null);

// 控制模拟上传是否故意失败
const simulateUploadFailure = ref<boolean>(false);
// 模拟上传延迟时间 (毫秒)
const uploadDelay = ref<number>(1200);

// 上传事件日志
interface UploadLog {
  id: number;
  time: string;
  type: 'success' | 'error' | 'start';
  message: string;
}
const logs = ref<UploadLog[]>([]);

const addLog = (type: 'success' | 'error' | 'start', message: string) => {
  logs.value.unshift({
    id: Date.now() + Math.random(),
    time: new Date().toLocaleTimeString(),
    type,
    message,
  });
  if (logs.value.length > 20) {
    logs.value.pop();
  }
};

/**
 * 真实模拟后端文件直传 SPI。
 */
const customUploadHandler: UploadHandler = async (file: File) => {
  addLog('start', `开始上传图片: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);

  // 模拟网络请求延迟
  await new Promise(resolve => setTimeout(resolve, uploadDelay.value));

  if (simulateUploadFailure.value) {
    throw new Error(`模拟服务器 500 错误：上传图片 [${file.name}] 失败`);
  }

  // 模拟成功返回服务器 CDN 地址或高保真图片地址
  const randomId = Math.floor(Math.random() * 1000);
  const cdnUrl = `https://picsum.photos/600/300?random=${randomId}`;

  return {
    url: cdnUrl,
    alt: file.name.replace(/\.[^/.]+$/, ''),
  };
};

const handleUploadSuccess = (payload: UploadSuccessPayload) => {
  addLog('success', `图片上传成功: ${payload.file.name} -> ${payload.url}`);
  ElMessage.success(`图片 [${payload.file.name}] 上传成功！`);
};

const handleUploadError = (error: Error, file: File) => {
  addLog('error', `图片上传失败: ${file.name} (${error.message})`);
  ElMessage.error(`图片上传失败: ${error.message}`);
};

/**
 * 模拟外部程序化调用 uploadImage expose。
 */
const triggerProgrammaticUpload = () => {
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" viewBox="0 0 200 100">
    <rect width="200" height="100" fill="#409eff"/>
    <text x="100" y="55" font-size="16" fill="#fff" text-anchor="middle" dominant-baseline="middle">Programmatic</text>
  </svg>`;
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const mockFile = new File([blob], 'programmatic-sample.svg', { type: 'image/svg+xml' });

  editorRef.value?.uploadImage(mockFile);
};

const clearLogs = () => {
  logs.value = [];
};
</script>

<template>
  <div class="asset-upload-scenario">
    <div class="scenario-intro">
      <h2>媒体资产上传拦截 SPI、骨架占位与优雅降级</h2>
      <p>
        验证 <code>uploadHandler</code> 对剪贴板、拖拽放置与工具栏点击的统一拦截，异步未决期间由
        <code>ProseMirror Decoration</code>
        就地渲染骨架占位，未配置时自动 Base64 降级，以及图片与链接上下文微浮层交互。
      </p>
    </div>

    <div class="scenario-layout">
      <!-- 左侧：主编辑器与 Base64 降级区 -->
      <div class="layout-main">
        <el-card shadow="never" class="editor-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">🚀 异步上传拦截与骨架占位测试 (配备 uploadHandler)</span>
              <el-tag type="primary" size="small">完整 SPI 模式</el-tag>
            </div>
          </template>

          <AtengEditor
            ref="editorRef"
            v-model="content"
            :upload-handler="customUploadHandler"
            placeholder="请在此输入文字，或粘贴 / 拖拽图片测试上传..."
            min-height="240px"
            @upload-success="handleUploadSuccess"
            @upload-error="handleUploadError"
          />
        </el-card>

        <el-card shadow="never" class="editor-card fallback-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">⚡ 开箱即用优雅降级测试 (未提供 uploadHandler)</span>
              <el-tag type="warning" size="small">自动 Base64 Data URL 嵌入</el-tag>
            </div>
          </template>

          <AtengEditor
            ref="fallbackEditorRef"
            v-model="fallbackContent"
            placeholder="粘贴或拖拽图片体验零后端快速原型降级..."
            min-height="160px"
          />
        </el-card>
      </div>

      <!-- 右侧：交互控制台与上传事件监控 -->
      <div class="layout-side">
        <el-card shadow="never" class="control-card">
          <template #header>
            <span class="card-title">🎛️ 模拟网络与上传控制台</span>
          </template>

          <div class="control-item">
            <span class="control-label">模拟网络延迟 (ms):</span>
            <el-slider v-model="uploadDelay" :min="300" :max="4000" :step="100" show-input />
          </div>

          <div class="control-item">
            <el-switch
              v-model="simulateUploadFailure"
              active-text="模拟上传异常 (Reject 报错)"
              inactive-text="正常模拟成功"
            />
          </div>

          <el-divider />

          <div class="action-buttons">
            <el-button type="primary" plain @click="triggerProgrammaticUpload">
              通过 Expose 手动触发图片上传
            </el-button>
          </div>
        </el-card>

        <el-card shadow="never" class="log-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">📋 媒体上传生命周期日志</span>
              <el-button link type="primary" size="small" @click="clearLogs">清空日志</el-button>
            </div>
          </template>

          <div v-if="logs.length === 0" class="log-empty">
            暂无上传操作日志，请尝试粘贴或拖入图片
          </div>
          <div v-else class="log-list">
            <div v-for="log in logs" :key="log.id" class="log-item" :class="`is-${log.type}`">
              <span class="log-time">{{ log.time }}</span>
              <el-tag
                size="small"
                :type="
                  log.type === 'success' ? 'success' : log.type === 'error' ? 'danger' : 'info'
                "
              >
                {{ log.type === 'success' ? '成功' : log.type === 'error' ? '失败' : '发起' }}
              </el-tag>
              <span class="log-message">{{ log.message }}</span>
            </div>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<style scoped>
.asset-upload-scenario {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.scenario-intro h2 {
  font-size: 18px;
  margin: 0 0 6px;
}

.scenario-intro p {
  color: var(--el-text-color-secondary, #606266);
  font-size: 14px;
  margin: 0;
}

.scenario-layout {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 16px;
  align-items: start;
}

.layout-main {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.layout-side {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.editor-card,
.control-card,
.log-card {
  border-radius: 6px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-title {
  font-weight: 600;
  font-size: 14px;
}

.control-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 14px;
}

.control-label {
  font-size: 13px;
  color: var(--el-text-color-regular, #606266);
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.log-empty {
  color: var(--el-text-color-secondary, #909399);
  font-size: 13px;
  text-align: center;
  padding: 24px 0;
}

.log-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 280px;
  overflow-y: auto;
}

.log-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  padding: 6px 8px;
  border-radius: 4px;
  background-color: var(--el-fill-color-light, #f5f7fa);
}

.log-item.is-success {
  background-color: var(--el-color-success-light-9, #f0f9eb);
}

.log-item.is-error {
  background-color: var(--el-color-danger-light-9, #fef0f0);
}

.log-time {
  color: var(--el-text-color-secondary, #909399);
  flex-shrink: 0;
}

.log-message {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1 1 auto;
}
</style>
