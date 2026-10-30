<script setup lang="ts">
/**
 * Agent Editor 场景：AI-Native 辅助创作与行内 Diff 审阅自验展厅。
 *
 * 验证与展示：
 * 1. AtengAgentEditor 独立预设与 AtengEditor mode="agent" 多态门面；
 * 2. 双通道 AI 唤起机制（划选气泡菜单 AtengAiBubbleMenu 与空白行输入条 AtengAiPromptBar）；
 * 3. 行内原位增删对比审阅卡片 (AtengAiDiffCard) 与三态状态机；
 * 4. 纯前端离线仿真器与模型配置抽屉（支持真实网关联调）。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import {
  AtengAgentEditor,
  type AtengAgentEditorInstance,
  type AiStreamHandler,
  type AiStreamPayload,
  createMockAiStreamHandler,
} from '@atengk/editor-vue';

const editorRef = ref<AtengAgentEditorInstance | null>(null);

const defaultAgentHtml = `<h1>🤖 AI-Native 智能辅助创作研报</h1>
<p>在现代企业级内容生产场景中，创作者无需离开编辑画布即可就地唤起 AI，协同完成文案润色、内容扩写、多语言转译与提炼总结。</p>

<blockquote>
  <p>💡 <strong>设计不变量</strong>：通信协议 100% 纯前端 SPI 驱动，零硬编码后端模型提供商凭据与端点，完美支持企业私有网关与离线仿真。</p>
</blockquote>

<h3>一、待优化业务背景陈述</h3>
<p>我们的前端组件库面临着样式隔离与性能优化的双重挑战，目前仍需更现代的架构治理手段。</p>

<h3>二、已采纳的核心演进方案</h3>
<ul>
  <li><strong>洋葱拓扑架构</strong>：L0 纯 TS 原生底座 ➔ L1 无头响应式 ➔ L2 专用能力扩展 ➔ L3 UI 表现套件；</li>
  <li><strong>插槽倒置纪律</strong>：所有弹出菜单与浮层 100% 允许业务视图层无缝接管；</li>
  <li><strong>多态门面体系</strong>：统一通过 <code>&lt;AtengEditor mode="agent" /&gt;</code> 或 <code>&lt;AtengAgentEditor /&gt;</code> 自适应分发四大高阶场景预设。</li>
</ul>`;

const agentContent = ref<string>(defaultAgentHtml);

// 真实模型联调配置抽屉
const isConfigDrawerVisible = ref<boolean>(false);
const useRealModel = ref<boolean>(false);
const realConfig = ref({
  apiUrl: 'https://api.openai.com/v1/chat/completions',
  apiKey: '',
  modelName: 'gpt-4o-mini',
});

// 离线仿真器
const mockHandler = createMockAiStreamHandler({
  delayMs: 25,
});

/**
 * 动态根据配置切换离线仿真或真实模型网络 SPI
 */
const dynamicStreamHandler: AiStreamHandler = async (payload: AiStreamPayload) => {
  if (!useRealModel.value || !realConfig.value.apiKey) {
    return mockHandler(payload);
  }

  // 现场接入真实大模型 SSE 流式网关
  const response = await fetch(realConfig.value.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${realConfig.value.apiKey}`,
    },
    body: JSON.stringify({
      model: realConfig.value.modelName,
      stream: true,
      messages: [
        {
          role: 'system',
          content:
            '你是一位精通中文企业级内容撰写与架构设计的高级编辑助手，请直接输出优化后的正文文本。',
        },
        {
          role: 'user',
          content: `${payload.prompt}\n参考上下文：${payload.context || '无'}\n待处理文本：${payload.selection || '无'}`,
        },
      ],
    }),
    signal: payload.signal,
  });

  if (!response.ok) {
    throw new Error(`模型请求异常：HTTP ${response.status} ${response.statusText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('无法读取模型响应流');

  const decoder = new TextDecoder();

  return {
    [Symbol.asyncIterator]: async function* () {
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ') && trimmed !== 'data: [DONE]') {
            try {
              const json = JSON.parse(trimmed.slice(6));
              const delta = json.choices?.[0]?.delta?.content;
              if (delta) yield delta;
            } catch {
              // 容错处理
            }
          }
        }
      }
    },
  };
};

const handleSaveModelConfig = (): void => {
  isConfigDrawerVisible.value = false;
  if (useRealModel.value && realConfig.value.apiKey) {
    ElMessage.success('✅ 已切换为真实大模型网关联调模式（瞬态内存沙箱，未持久化）');
  } else {
    ElMessage.info('ℹ️ 已恢复为纯前端 100% 离线打字机仿真器模式');
  }
};
</script>

<template>
  <div class="agent-scenario">
    <div class="scenario-intro">
      <div class="intro-title">
        <span class="badge">Phase 2 完备就绪</span>
        <h2>🤖 Agent Editor：AI-Native 辅助创作与行内 Diff 审阅</h2>
      </div>
      <p class="intro-desc">
        专为企业级智能化创作者、公文润色助手与研报自动生成打造。摆脱传统割裂的“右侧聊天对话框”，实现光标原位行内呼起
        AI、原位打字机流式生成与行内 Diff 卡片审阅。既可通过
        <code>&lt;AtengAgentEditor /&gt;</code> 独立使用，也可通过
        <code>&lt;AtengEditor mode="agent" /&gt;</code> 门面接入。
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
            生成过程中利用 ProseMirror 装饰层实时渲染跳动光标与流式字符，不破坏撤销/重做历史栈。
          </div>
        </div>
        <div class="card-item">
          <div class="card-title">🔍 行内 AiDiffCard 对比状态机</div>
          <div class="card-text">
            双轨颜色比对（绿色高亮追加、红色划线删除），提供【替换选区】、【插入下方】与【放弃】三态决策。
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

    <!-- 操控面板 -->
    <el-card shadow="never" class="control-panel">
      <div class="controls-row">
        <div class="left-tips">
          <span class="tip-tag">交互方式</span>
          <span class="tip-text">
            👉 在下方正文中<strong>划选一段文字</strong>即可自动呼出 AI
            气泡菜单（润色/扩写/精简/翻译）；也可在空行处敲击空格或调用 AI 工具！
          </span>
        </div>

        <div class="right-actions">
          <el-button size="small" @click="isConfigDrawerVisible = true">
            ⚙️ 配置大模型网关
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- Agent Editor 预设组件主体 -->
    <div class="editor-wrapper">
      <AtengAgentEditor
        ref="editorRef"
        v-model="agentContent"
        :ai-stream-handler="dynamicStreamHandler"
        placeholder="在空白行键入空格唤起 AI 写作，或划选正文文字调起 AI 快捷动作..."
        min-height="450px"
      />
    </div>

    <!-- 真实大模型联调配置抽屉 -->
    <el-drawer
      v-model="isConfigDrawerVisible"
      title="⚙️ 大模型通信网关配置 (瞬态内存沙箱)"
      size="480px"
      direction="rtl"
    >
      <el-form label-position="top">
        <el-form-item label="联调模式开关">
          <el-switch
            v-model="useRealModel"
            active-text="启用真实大模型网关"
            inactive-text="纯前端离线仿真器 (Mock)"
          />
        </el-form-item>

        <template v-if="useRealModel">
          <el-form-item label="网关 API 端点 (Chat Completions URL)">
            <el-input
              v-model="realConfig.apiUrl"
              placeholder="https://api.openai.com/v1/chat/completions"
            />
          </el-form-item>

          <el-form-item label="模型名称 (Model)">
            <el-input v-model="realConfig.modelName" placeholder="gpt-4o-mini / deepseek-chat" />
          </el-form-item>

          <el-form-item label="API Key 访问凭据 (瞬态内存沙箱，零持久化)">
            <el-input
              v-model="realConfig.apiKey"
              type="password"
              show-password
              placeholder="sk-..."
            />
          </el-form-item>

          <el-alert
            title="安全说明：API Key 仅保存在当前会话易失内存中，组件库绝对严禁持久化保存至 LocalStorage 或提交至代码库！"
            type="warning"
            :closable="false"
            show-icon
          />
        </template>
      </el-form>

      <template #footer>
        <el-button type="primary" @click="handleSaveModelConfig">保存并生效</el-button>
        <el-button @click="isConfigDrawerVisible = false">取消</el-button>
      </template>
    </el-drawer>
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

.left-tips {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.tip-tag {
  font-size: 11px;
  background-color: var(--el-color-primary-light-9, #ecf5ff);
  color: var(--el-color-primary, #409eff);
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
}

.tip-text {
  font-size: 12px;
  color: var(--el-text-color-regular, #606266);
}

.editor-wrapper {
  background: var(--el-bg-color, #ffffff);
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}
</style>
