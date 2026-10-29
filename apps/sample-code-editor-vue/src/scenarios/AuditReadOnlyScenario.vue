<script setup lang="ts">
/**
 * 场景五：只读审计与高危行高亮展厅。
 *
 * 验证：
 * 1. 只读审计模式（readOnly）；
 * 2. highlightLines 指定行背景与 Gutter 标记；
 * 3. 动态增减高亮告警行号；
 * 4. 敏感代码安全防线。
 *
 * @author Ateng
 * @since 2026-10-29
 */

import { ref } from 'vue';
import { AtengCodeEditor } from '@atengk/code-editor-vue';

const highlightedLines = ref<number[]>([4, 11, 16]);

const auditCode = ref<string>(`// === 生产环境运维审计日志 ===
function executeProductionScript(user, payload) {
  // 1. 权限前置校验
  if (!user.hasRole('SUPER_ADMIN')) {
    throw new Error('403: 越权敏感操作'); // [高危告警行 4]
  }

  // 2. 数据库清空敏感指令
  const table = payload.targetTable;
  console.log("准备执行清除动作: " + table);
  db.execute("DROP TABLE " + table); // [高危 SQL 注入/删库行 11]

  // 3. 绕过审计日志写入
  if (payload.skipAuditLog) {
    return false; // [审计绕过告警行 16]
  }

  return true;
}
`);

const setCriticalAlerts = (): void => {
  highlightedLines.value = [4, 11, 16];
};

const setOnlySqlDropAlert = (): void => {
  highlightedLines.value = [11];
};

const clearAlerts = (): void => {
  highlightedLines.value = [];
};
</script>

<template>
  <div class="audit-scenario">
    <el-card shadow="never" class="control-card">
      <template #header>
        <div class="card-header">
          <span class="card-title">🔍 只读安全审计与高危代码行高亮沙箱</span>
          <div class="actions">
            <el-button-group size="small">
              <el-button type="danger" @click="setCriticalAlerts">
                标记所有高危行 (行 4, 11, 16)
              </el-button>
              <el-button type="warning" @click="setOnlySqlDropAlert">
                仅标记删库行 (行 11)
              </el-button>
              <el-button @click="clearAlerts"> 清除所有高亮 </el-button>
            </el-button-group>
          </div>
        </div>
      </template>

      <div class="audit-info">
        <el-tag type="danger">只读审计模式已锁定 (readOnly: true)</el-tag>
        <el-tag type="warning">当前高亮行号：{{ highlightedLines.join(', ') || '无' }}</el-tag>
      </div>
    </el-card>

    <div class="editor-container">
      <AtengCodeEditor
        v-model="auditCode"
        language="javascript"
        theme="auto"
        :read-only="true"
        height="480px"
        :highlight-lines="highlightedLines"
      />
    </div>
  </div>
</template>

<style scoped>
.audit-scenario {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  font-weight: 600;
  font-size: 15px;
}

.audit-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.editor-container {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
}
</style>
