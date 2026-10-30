<script setup lang="ts">
/**
 * 场景四：选区气泡浮层与键盘流斜杠命令自验展厅 (Slash & Bubble Scenario)。
 *
 * 验证：
 * 1. 划选文本时跟随呼出 <AtengBubbleMenu />，提供粗体、斜体、下划线、删除线、行内代码、高亮与超链接设置；
 * 2. 空行或键入 '/' 时呼出纯中文块级 <AtengSlashCommand /> 面板，支持键盘 ArrowUp/ArrowDown 切换、Enter 插入与 Esc 关闭；
 * 3. 关键字搜索过滤（输入 '/表' 即时筛选表格物料）；
 * 4. 具名插槽反转定制（#bubble-menu 与 #slash-command 插槽接管）。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import {
  AtengEditor,
  type AtengEditorInstance,
  defaultSlashCommandItems,
} from '@atengk/editor-vue';

const editorRef = ref<AtengEditorInstance | null>(null);

// 预设内容，包含引导用户划词与尝试斜杠的测试文案
const initialContent = `
<h2>✨ 沉浸式键盘流排版体验 (Notion-Like)</h2>
<p>欢迎体验现代富文本创作套件！本展厅支持全键盘流创作与划词格式微浮层：</p>
<p>👉 <strong>划词体验：</strong>请尝试用鼠标划选本段中的文字，光标上方将平滑浮现 <code>AtengBubbleMenu</code>，可一键设置粗体、斜体、下划线、高亮或超链接。</p>
<p>👉 <strong>斜杠体验：</strong>请移至下方空行，或直接在正文中键入 <code>/</code>，即可唤起全中文块级物料选择器：</p>
<p></p>
<blockquote>
  <p>💡 提示：在斜杠物料面板中，支持键盘 ↑ / ↓ 方向键选择物料，回车键立即插入，Esc 键随时关闭浮层。键入 <code>/表</code> 可极速过滤表格！</p>
</blockquote>
`;

const htmlContent = ref<string>(initialContent);
const markdownContent = ref<string>('');
const isCustomSlotMode = ref<boolean>(false);
const showBubble = ref<boolean>(true);
const showSlash = ref<boolean>(true);

// 快捷插入指令
const insertSlashAtCursor = (): void => {
  editorRef.value?.editor?.value?.chain().focus().insertContent('/').run();
  ElMessage.success("已在当前光标处输入 '/'，请体验斜杠命令面板");
};

const selectAllAndFocus = (): void => {
  editorRef.value?.editor?.value?.chain().focus().selectAll().run();
  ElMessage.info('已选中文档全部内容，请查看光标上方的划选气泡浮层');
};

const resetContent = (): void => {
  htmlContent.value = initialContent;
  ElMessage.success('已恢复展厅初始演示内容');
};
</script>

<template>
  <div class="slash-bubble-scenario">
    <div class="scenario-panel">
      <!-- 操控栏 -->
      <div class="scenario-controls">
        <div class="controls-left">
          <el-button type="primary" size="small" @click="insertSlashAtCursor">
            ⚡ 键入 '/' 触发斜杠面板
          </el-button>
          <el-button type="info" size="small" @click="selectAllAndFocus">
            🔍 全选文本触发气泡菜单
          </el-button>
          <el-button size="small" @click="resetContent"> 🔄 重置演示内容 </el-button>
        </div>
        <div class="controls-right">
          <el-switch v-model="showBubble" active-text="启用选区气泡" inline-prompt />
          <el-switch v-model="showSlash" active-text="启用斜杠命令" inline-prompt />
          <el-switch v-model="isCustomSlotMode" active-text="插槽反转演示 (#slot)" inline-prompt />
        </div>
      </div>

      <!-- 编辑器核心展示区 -->
      <div class="editor-wrapper">
        <!-- 标准模式 -->
        <AtengEditor
          v-if="!isCustomSlotMode"
          ref="editorRef"
          v-model="htmlContent"
          v-model:markdown="markdownContent"
          :show-bubble-menu="showBubble"
          :show-slash-command="showSlash"
          placeholder="键入 '/' 快速插入标题、列表、表格或代码块..."
          min-height="380px"
        />

        <!-- 业务插槽反转定制模式 -->
        <AtengEditor
          v-else
          ref="editorRef"
          v-model="htmlContent"
          v-model:markdown="markdownContent"
          :show-bubble-menu="showBubble"
          :show-slash-command="showSlash"
          placeholder="业务自定义插槽反转模式中..."
          min-height="380px"
        >
          <!-- 自定义划选气泡插槽 -->
          <template #bubble-menu="{ editor }">
            <div v-if="editor" class="custom-bubble-badge">
              <el-tag type="warning" effect="dark" size="small">
                ✨ 自定义 #bubble-menu 插槽反转接管
              </el-tag>
              <el-button-group size="small">
                <el-button
                  type="primary"
                  :plain="!editor.isActive('bold')"
                  @click="editor.chain().focus().toggleBold().run()"
                >
                  粗体
                </el-button>
                <el-button
                  type="success"
                  :plain="!editor.isActive('highlight')"
                  @click="editor.chain().focus().toggleHighlight().run()"
                >
                  高亮
                </el-button>
              </el-button-group>
            </div>
          </template>

          <!-- 自定义斜杠命令插槽 -->
          <template #slash-command="{ editor }">
            <div v-if="editor" class="custom-slash-badge">
              <el-alert
                title="✨ 自定义 #slash-command 插槽已接管斜杠面板呈现"
                type="info"
                :closable="false"
                show-icon
              />
            </div>
          </template>
        </AtengEditor>
      </div>

      <!-- 特性说明与实时同步产物 -->
      <div class="scenario-inspection">
        <el-collapse>
          <el-collapse-item title="📝 查看实时 Markdown 同步数据" name="1">
            <pre
              class="code-preview"
            ><code>{{ markdownContent || '（暂无 Markdown 数据）' }}</code></pre>
          </el-collapse-item>
          <el-collapse-item title="🌐 查看实时 HTML 产物" name="2">
            <pre class="code-preview"><code>{{ htmlContent }}</code></pre>
          </el-collapse-item>
          <el-collapse-item title="📋 内置标准物料清单 (11 种)" name="3">
            <div class="materials-tags">
              <el-tag
                v-for="item in defaultSlashCommandItems"
                :key="item.id"
                effect="plain"
                class="material-tag"
              >
                {{ item.title }} ({{ item.group }}) - {{ item.description }}
              </el-tag>
            </div>
          </el-collapse-item>
        </el-collapse>
      </div>
    </div>
  </div>
</template>

<style scoped>
.slash-bubble-scenario {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.scenario-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.scenario-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px 16px;
  background-color: var(--el-fill-color-light, #f5f7fa);
  border-radius: 6px;
  border: 1px solid var(--el-border-color-lighter, #e4e7ed);
}

.controls-left,
.controls-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.editor-wrapper {
  background-color: var(--el-bg-color, #ffffff);
  border-radius: 6px;
}

.custom-bubble-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  background-color: var(--el-bg-color-overlay, #ffffff);
  border: 1px solid var(--el-border-color, #dcdfe6);
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.custom-slash-badge {
  width: 320px;
  background-color: var(--el-bg-color-overlay, #ffffff);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.scenario-inspection {
  border-radius: 6px;
  overflow: hidden;
}

.code-preview {
  margin: 0;
  padding: 12px;
  background-color: var(--el-fill-color-darker, #1e1e1e);
  color: #abb2bf;
  border-radius: 4px;
  font-size: 12px;
  font-family: 'Fira Code', Consolas, Monaco, monospace;
  max-height: 200px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

.materials-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.material-tag {
  font-size: 12px;
}
</style>
