<script setup lang="ts">
/**
 * 场景一：基础代码编辑与语言切换交互展厅。
 *
 * 验证：
 * 1. 多语言语法高亮（TS/JS/JSON/SQL/HTML/CSS/Markdown/Python/Java/Shell）；
 * 2. 双向响应式 v-model 绑定与外部更新；
 * 3. 只读模式与微工具栏交互；
 * 4. 字号与主题动态切换；
 * 5. Ref 实例方法调用（format, focus, getValue, setValue）。
 *
 * @author Ateng
 * @since 2026-10-29
 */

import { ref } from 'vue';
import {
  AtengCodeEditor,
  type CodeLanguage,
  type EditorTheme,
  type AtengCodeEditorInstance,
} from '@atengk/code-editor-vue';

const editorRef = ref<AtengCodeEditorInstance | null>(null);

const currentLang = ref<CodeLanguage>('typescript');
const currentTheme = ref<EditorTheme>('auto');
const isReadOnly = ref<boolean>(false);
const fontSize = ref<number>(14);

const languageSnippets: Record<string, string> = {
  typescript: `/**
 * 企业级用户数据实体定义
 */
export interface UserEntity {
  id: string;
  username: string;
  email: string;
  roles: string[];
  createdAt: Date;
}

export function formatGreeting(user: UserEntity): string {
  const roleList = user.roles.join(', ');
  return \`Welcome, \${user.username}! Your roles: [\${roleList}]\`;
}
`,
  javascript: `// 标准 JavaScript 函数
function calculateTax(subtotal, rate = 0.08) {
  const tax = subtotal * rate;
  return {
    subtotal,
    tax,
    total: subtotal + tax
  };
}

console.log(calculateTax(100));
`,
  json: `{
  "projectName": "ateng-ui",
  "version": "0.1.0",
  "private": true,
  "features": [
    "Monaco Code Editor",
    "Diff Compare",
    "SQL Beautifier",
    "JSON Schema Validation"
  ],
  "author": {
    "name": "Ateng",
    "role": "Frontend Infrastructure Architect"
  }
}
`,
  sql: `-- 查询活跃用户及其订单总金额
SELECT 
    u.id AS user_id,
    u.username,
    COUNT(o.id) AS total_orders,
    SUM(o.amount) AS total_spent
FROM sys_user u
LEFT JOIN biz_order o ON u.id = o.user_id
WHERE u.status = 1 AND o.created_at >= '2026-01-01'
GROUP BY u.id, u.username
HAVING total_spent > 1000
ORDER BY total_spent DESC
LIMIT 50;
`,
  html: `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>Ateng UI Code Editor</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div id="container">
    <h1>工业级 Monaco 代码编辑器</h1>
  </div>
</body>
</html>
`,
  css: `/* 现代冷钛质感风格 */
.at-code-editor-container {
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  background-color: var(--el-bg-color, #ffffff);
  border: 1px solid var(--el-border-color-light, #e2e8f0);
}
`,
  markdown: `# ateng-ui 代码编辑器

面向现代企业级应用的 **Monaco Editor** 响应式基础设施扩展套件。

### 特性矩阵
- [x] 多语言高亮与语法校验
- [x] 双向 v-model 增量光标防丢失
- [x] 三级弹性 Worker 寻址与离线降级
- [x] 暗黑模式 0ms 无损热跟随
`,
  python: `# Python 3 列表推导与类型注解
from typing import List, Dict

def filter_active_records(records: List[Dict[str, any]]) -> List[Dict[str, any]]:
    """筛选所有状态为 active 的业务记录"""
    return [r for r in records if r.get("status") == "active"]

data = [{"id": 1, "status": "active"}, {"id": 2, "status": "pending"}]
print(filter_active_records(data))
`,
  java: `package com.ateng.core.domain;

import java.time.LocalDateTime;

public class AuditRecord {
    private Long id;
    private String operator;
    private String action;
    private LocalDateTime timestamp;

    public AuditRecord(Long id, String operator, String action) {
        this.id = id;
        this.operator = operator;
        this.action = action;
        this.timestamp = LocalDateTime.now();
    }
}
`,
  shell: `#!/usr/bin/env bash
set -euo pipefail

echo "==> 执行 ateng-ui 质量构建门禁..."
pnpm --filter @atengk/code-editor-vue typecheck
pnpm --filter @atengk/code-editor-vue lint
pnpm --filter @atengk/code-editor-vue test
echo "==> 门禁全部通过！"
`,
};

const code = ref<string>(languageSnippets.typescript ?? '');

// 切换语言时自动加载对应示例
const handleLanguageChange = (lang: CodeLanguage): void => {
  currentLang.value = lang;
  if (languageSnippets[lang]) {
    code.value = languageSnippets[lang];
  }
};

// 格式化当前文档
const handleFormatDoc = (): void => {
  editorRef.value?.format();
};

// 撤销 (Undo)
const handleUndo = (): void => {
  editorRef.value?.undo();
};

// 重做 (Redo)
const handleRedo = (): void => {
  editorRef.value?.redo();
};

// 外部向底部追加代码片段（增量保持光标与 Undo 栈）
const handleAppendCode = (): void => {
  const appendSnippet = `\n// [外部异步追加记录: ${new Date().toLocaleTimeString()}]\nexport const timestamp = ${Date.now()};\n`;
  code.value += appendSnippet;
};

// 生成 60,000 行业务大文本（大文件自适应保护降级模式）
const handleGenerateLargeFile = (): void => {
  const lines: string[] = ['// === 60,000 行业务大文本性能治理测试数据集 ==='];
  for (let i = 1; i <= 60000; i++) {
    lines.push(`const record_${i} = { id: ${i}, status: 'active', code: 'CODE_${i}' };`);
  }
  code.value = lines.join('\n');
};

// 重置代码
const handleReset = (): void => {
  code.value = languageSnippets[currentLang.value] ?? '';
};
</script>

<template>
  <div class="basic-scenario">
    <!-- 控制面板 -->
    <el-card shadow="never" class="control-panel">
      <template #header>
        <div class="panel-header">
          <span class="panel-title">⚙️ 编辑器运行时配置与控制台</span>
          <div class="actions">
            <el-button-group size="small">
              <el-button title="撤销操作 (Ctrl+Z)" @click="handleUndo"> 撤销 (Undo) </el-button>
              <el-button title="重做操作 (Ctrl+Y)" @click="handleRedo"> 重做 (Redo) </el-button>
            </el-button-group>
            <el-button type="primary" size="small" @click="handleFormatDoc">
              格式化文档 (format)
            </el-button>
            <el-button type="success" size="small" @click="handleAppendCode">
              外部异步追加代码 (保持光标/Undo)
            </el-button>
            <el-button type="warning" size="small" @click="handleGenerateLargeFile">
              ⚡ 模拟 60,000 行业务大文本
            </el-button>
            <el-button size="small" @click="handleReset"> 重置预设 </el-button>
          </div>
        </div>
      </template>

      <el-form :inline="true" size="default">
        <el-form-item label="代码语言：">
          <el-select v-model="currentLang" style="width: 150px" @change="handleLanguageChange">
            <el-option label="TypeScript" value="typescript" />
            <el-option label="JavaScript" value="javascript" />
            <el-option label="JSON" value="json" />
            <el-option label="SQL" value="sql" />
            <el-option label="HTML" value="html" />
            <el-option label="CSS" value="css" />
            <el-option label="Markdown" value="markdown" />
            <el-option label="Python" value="python" />
            <el-option label="Java" value="java" />
            <el-option label="Shell" value="shell" />
          </el-select>
        </el-form-item>

        <el-form-item label="主题模式：">
          <el-radio-group v-model="currentTheme">
            <el-radio-button value="auto">自动跟随 (Auto)</el-radio-button>
            <el-radio-button value="vs">浅色明亮 (vs)</el-radio-button>
            <el-radio-button value="vs-dark">深色暗黑 (vs-dark)</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="字体大小：">
          <el-radio-group v-model="fontSize">
            <el-radio-button :value="12">12px</el-radio-button>
            <el-radio-button :value="14">14px</el-radio-button>
            <el-radio-button :value="16">16px</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="只读保护：">
          <el-switch v-model="isReadOnly" active-text="开启" inactive-text="关闭" />
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 编辑器展示区 -->
    <div class="editor-wrapper">
      <AtengCodeEditor
        ref="editorRef"
        v-model="code"
        :language="currentLang"
        :theme="currentTheme"
        :read-only="isReadOnly"
        :font-size="fontSize"
        height="500px"
      />
    </div>

    <!-- 响应式数据观察窗 -->
    <el-card shadow="never" class="preview-panel">
      <template #header>
        <span class="preview-title"
          >📡 响应式 v-model 双向绑定观察面板 (实时字符数: {{ code.length }})</span
        >
      </template>
      <pre class="code-preview">{{ code }}</pre>
    </el-card>
  </div>
</template>

<style scoped>
.basic-scenario {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-title {
  font-weight: 600;
  font-size: 15px;
}

.editor-wrapper {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
}

.preview-panel {
  margin-top: 8px;
}

.preview-title {
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
}

.code-preview {
  margin: 0;
  padding: 12px;
  background-color: #f8fafc;
  border-radius: 6px;
  font-family: Consolas, Monaco, 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.5;
  color: #334155;
  max-height: 160px;
  overflow-y: auto;
}
</style>
