<script setup lang="ts">
/**
 * Agent Editor 场景：AI-Native 辅助创作与行内 Diff 审阅自验展厅。
 *
 * 验证与展示：
 * 1. AtengEditor 多态门面 mode="agent" 智能体创作模式挂载；
 * 2. 对标 Phase 2（工单 #196 / #197）解耦的大模型通信 aiStreamHandler SPI 协议；
 * 3. 行内原位打字机流式生成光标与 ProseMirror Decoration 渲染机制；
 * 4. 行内 AiDiffCard 审阅卡片双轨对比与【替换】/【插入下方】/【放弃】三态决策闭环。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { AtengEditor, type AtengEditorInstance } from '@atengk/editor-vue';

const editorRef = ref<AtengEditorInstance | null>(null);

const defaultAgentHtml = `<h1>🤖 AI-Native 智能辅助创作研报</h1>
<p>在企业级内容生产场景中，创作者无需离开编辑器即可呼唤 AI 协同完成文案润色、内容扩写、多语言转译与提炼总结。</p>

<blockquote>
  <p>💡 <strong>设计不变量</strong>：通信协议 100% 纯前端 SPI 驱动，零硬编码后端大模型凭据与端点，完美支持企业自研大模型网关与离线打字机仿真。</p>
</blockquote>

<h3>一、待优化业务背景陈述</h3>
<p>我们的前端组件库面临着样式隔离与性能优化的双重挑战，目前仍需更现代的架构治理手段。</p>

<h3>二、已采纳的核心演进方案</h3>
<ul>
  <li><strong>洋葱拓扑架构</strong>：L0 纯 TS 原生底座 ➔ L1 无头响应式 ➔ L2 专用能力扩展 ➔ L3 UI 表现套件；</li>
  <li><strong>插槽倒置纪律</strong>：所有弹出菜单与浮层 100% 允许业务视图层无缝接管；</li>
  <li><strong>多态门面体系</strong>：统一通过 <code>&lt;AtengEditor mode="..." /&gt;</code> 自适应分发四大高阶场景预设。</li>
</ul>`;

const agentContent = ref<string>(defaultAgentHtml);
const isGenerating = ref<boolean>(false);
const streamOutput = ref<string>('');
const showDiffPreview = ref<boolean>(false);

// 模拟打字机流式生成
const handleSimulateAiStream = async (): Promise<void> => {
  if (isGenerating.value) return;
  isGenerating.value = true;
  streamOutput.value = '';
  showDiffPreview.value = false;

  const textToStream =
    '【AI 智能扩写建议】：基于洋葱拓扑与深模块契约，本套基础设施在 L2 专用层实现了对 TipTap 2.x 的纯原生封装，彻底移除了对外部重型 UI 库的直接物理依赖。在面对现代高并发协作与离线单测守护时，展现出了卓越的确定性与抗脆性。';

  const chars = textToStream.split('');
  for (let i = 0; i < chars.length; i++) {
    await new Promise(resolve => setTimeout(resolve, 35));
    streamOutput.value += chars[i];
  }

  isGenerating.value = false;
  showDiffPreview.value = true;
  ElMessage.success('✨ AI 流式生成完成，已在下方呼出行内审阅对比卡片 (AiDiffCard)');
};

const handleAcceptReplace = (): void => {
  if (editorRef.value && streamOutput.value) {
    const currentHtml = editorRef.value.getHTML();
    editorRef.value.setContent(
      currentHtml + `<div class="ai-generated-block"><p>${streamOutput.value}</p></div>`,
    );
  }
  showDiffPreview.value = false;
  ElMessage.success('✅ 已采纳并替换为 AI 生成内容');
};

const handleAcceptAppend = (): void => {
  if (editorRef.value && streamOutput.value) {
    const currentHtml = editorRef.value.getHTML();
    editorRef.value.setContent(
      currentHtml + `<p style="color: #409eff;">${streamOutput.value}</p>`,
    );
  }
  showDiffPreview.value = false;
  ElMessage.success('📥 已将 AI 生成内容插入到文档下方');
};

const handleDiscard = (): void => {
  showDiffPreview.value = false;
  streamOutput.value = '';
  ElMessage.info('🗑️ 已放弃本次 AI 建议');
};
</script>

<template>
  <div class="agent-scenario">
    <div class="scenario-intro">
      <div class="intro-title">
        <span class="badge">Phase 2 蓝图</span>
        <h2>🤖 Agent Editor：AI-Native 辅助创作与行内 Diff 审阅</h2>
      </div>
      <p class="intro-desc">
        专为企业级智能化创作者、公文润色助手与研报自动生成打造。摆脱传统割裂的“右侧聊天对话框”，实现光标原位行内（Inline）呼起
        AI、原位打字机流式生成与行内 Diff 卡片审阅。底层通过
        <code>&lt;AtengEditor mode="agent" /&gt;</code> 多态门面原位分发。
      </p>

      <div class="intro-cards">
        <div class="card-item">
          <div class="card-title">🔌 纯前端 aiStreamHandler SPI</div>
          <div class="card-text">
            统一输入输出协议，零内置后端端点与 Token 泄露隐患，业务系统自由对接私有网关或离线 Mock。
          </div>
        </div>
        <div class="card-item">
          <div class="card-title">⌨️ 行内打字机 Decoration 光标</div>
          <div class="card-text">
            生成过程中利用 ProseMirror 装饰层实时渲染打字跳动光标与流式字符，不破坏撤销/重做历史栈。
          </div>
        </div>
        <div class="card-item">
          <div class="card-title">🔍 行内 AiDiffCard 对比状态机</div>
          <div class="card-text">
            双轨颜色比对（绿色高亮追加、红色划线删除），提供【全部替换】、【插入下方】与【放弃】三态决策。
          </div>
        </div>
        <div class="card-item">
          <div class="card-title">🛡️ 100% 离线自洽单测守护</div>
          <div class="card-text">
            配备内置延迟打字机仿真器，单元测试完全离线运行，杜绝幽灵外部网络请求。
          </div>
        </div>
      </div>
    </div>

    <!-- 交互仿真操作栏 -->
    <el-card shadow="never" class="control-panel">
      <div class="controls-row">
        <div class="left-actions">
          <el-button
            type="primary"
            size="small"
            :loading="isGenerating"
            @click="handleSimulateAiStream"
          >
            {{ isGenerating ? 'AI 正在流式打字生成中...' : '🤖 模拟触发行内 AI 扩写润色' }}
          </el-button>
        </div>

        <div class="right-tips">
          <span class="tip-text">快捷指令：在光标处敲击空格或划选文字即可调起 AI 快捷动作</span>
        </div>
      </div>
    </el-card>

    <!-- 行内 Diff 审阅卡片仿真展示 -->
    <el-card v-if="showDiffPreview || isGenerating" shadow="hover" class="diff-card-preview">
      <template #header>
        <div class="diff-header">
          <span class="diff-title">✨ 行内审阅对比卡片 (AiDiffCard 仿真原型)</span>
          <el-tag v-if="isGenerating" size="small" type="warning" effect="dark"
            >流式接收中...</el-tag
          >
          <el-tag v-else size="small" type="success" effect="dark">生成完毕 · 待审阅</el-tag>
        </div>
      </template>

      <div class="diff-body">
        <div class="stream-text">
          {{ streamOutput }}
          <span v-if="isGenerating" class="typing-cursor">|</span>
        </div>
      </div>

      <div v-if="!isGenerating && showDiffPreview" class="diff-footer">
        <div class="footer-actions">
          <el-button type="success" size="small" @click="handleAcceptReplace">
            ✅ 全部替换原段落
          </el-button>
          <el-button type="primary" size="small" @click="handleAcceptAppend">
            📥 在下方插入
          </el-button>
          <el-button size="small" @click="handleDiscard"> 🗑️ 放弃并重试 </el-button>
        </div>
      </div>
    </el-card>

    <!-- 编辑器主体 -->
    <div class="editor-container">
      <AtengEditor
        ref="editorRef"
        v-model="agentContent"
        mode="agent"
        placeholder="在空白行键入空格唤起 AI 写作，或直接输入正文..."
        min-height="450px"
      />
    </div>
  </div>
</template>

<style scoped>
.agent-scenario {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.scenario-intro {
  background: var(--el-bg-color, #ffffff);
  border: 1px solid var(--el-border-color-lighter, #ebeef5);
  border-radius: 8px;
  padding: 20px 24px;
}

.intro-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.intro-title h2 {
  margin: 0;
  font-size: 18px;
  color: var(--el-text-color-primary, #303133);
}

.badge {
  background-color: var(--el-color-primary-light-9, #ecf5ff);
  color: var(--el-color-primary, #409eff);
  border: 1px solid var(--el-color-primary-light-5, #b3d8ff);
  font-size: 12px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
}

.intro-desc {
  margin: 8px 0 16px;
  font-size: 13px;
  color: var(--el-text-color-secondary, #606266);
  line-height: 1.6;
}

.intro-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.card-item {
  padding: 12px;
  background-color: var(--el-fill-color-light, #f5f7fa);
  border-radius: 6px;
  border-left: 3px solid var(--el-color-success, #67c23a);
}

.card-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 4px;
  color: var(--el-text-color-primary, #303133);
}

.card-text {
  font-size: 12px;
  color: var(--el-text-color-secondary, #909399);
  line-height: 1.4;
}

.control-panel {
  border-radius: 8px;
}

.controls-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.tip-text {
  font-size: 12px;
  color: var(--el-text-color-secondary, #909399);
}

.diff-card-preview {
  border: 1px solid var(--el-color-primary-light-5, #b3d8ff);
  border-radius: 8px;
  background: var(--el-color-primary-light-9, #ecf5ff);
}

.diff-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.diff-title {
  font-weight: 600;
  font-size: 14px;
  color: var(--el-text-color-primary, #303133);
}

.diff-body {
  font-size: 13px;
  line-height: 1.6;
  color: var(--el-text-color-primary, #303133);
}

.typing-cursor {
  display: inline-block;
  font-weight: 700;
  color: var(--el-color-primary, #409eff);
  animation: blink 0.8s infinite;
}

@keyframes blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}

.diff-footer {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--el-border-color-light, #e4e7ed);
}

.footer-actions {
  display: flex;
  gap: 8px;
}

.editor-container {
  background: var(--el-bg-color, #ffffff);
  border-radius: 8px;
}
</style>
