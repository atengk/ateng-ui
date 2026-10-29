<script setup lang="ts">
/**
 * 场景六：弹窗、抽屉与多标签几何自愈与生命周期治理展厅。
 *
 * 验证：
 * 1. 在 <el-dialog> 模态窗中 0x0 视口几何挂起，打开后自动自愈布局；
 * 2. 在 <el-drawer> 滑动抽屉中自适应尺寸自愈；
 * 3. 在 <el-tabs> 隐藏/激活标签切换下杜绝黑屏与光标错位；
 * 4. 暗黑模式无感热跟随（theme: 'auto'）；
 * 5. 确定性销毁清理（无内存泄漏）。
 *
 * @author Ateng
 * @since 2026-10-29
 */

import { ref } from 'vue';
import { AtengCodeEditor, type AtengCodeEditorInstance } from '@atengk/code-editor-vue';

// 弹窗状态
const dialogVisible = ref<boolean>(false);
const dialogEditorRef = ref<AtengCodeEditorInstance | null>(null);
const dialogCode = ref<string>(`// === 弹窗内代码编辑场景 ===
function handleDialogConfirm() {
  console.log("提交弹窗中的业务逻辑配置");
  return { success: true };
}
`);

// 抽屉状态
const drawerVisible = ref<boolean>(false);
const drawerEditorRef = ref<AtengCodeEditorInstance | null>(null);
const drawerCode = ref<string>(`// === 侧边抽屉内代码编辑场景 ===
export interface DrawerConfig {
  drawerWidth: '50%';
  animationDuration: '300ms';
  autoLayoutHealing: true;
}
`);

// 多标签状态
const activeSubTab = ref<string>('tab1');
const tab1Code = ref<string>(`// === 标签一：数据管道转换脚本 ===
export function transformPayload(raw: Record<string, unknown>) {
  return {
    ...raw,
    processedAt: Date.now(),
    version: '2.0.0'
  };
}
`);
const tab2Code = ref<string>(`-- === 标签二：离线批处理 SQL 任务 ===
SELECT 
    dept_id,
    COUNT(emp_id) AS staff_count,
    AVG(salary) AS avg_salary
FROM hr_employee
WHERE is_deleted = 0
GROUP BY dept_id
ORDER BY staff_count DESC;
`);
const tab3Code = ref<string>(`{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "ConfigProfile",
  "type": "object",
  "properties": {
    "clusterName": { "type": "string" },
    "replicas": { "type": "integer", "minimum": 1 }
  },
  "required": ["clusterName", "replicas"]
}
`);

const openDialog = (): void => {
  dialogVisible.value = true;
};

const openDrawer = (): void => {
  drawerVisible.value = true;
};
</script>

<template>
  <div class="lifecycle-scenario">
    <el-card shadow="never" class="scenario-intro">
      <template #header>
        <span class="intro-title">🛡️ 0x0 视口几何自愈与生命周期治理沙箱</span>
      </template>
      <p class="intro-desc">
        在传统 Monaco 接入中，当编辑器被置于未打开的
        <code>&lt;el-dialog&gt;</code>、侧滑抽屉或隐藏的
        <code>&lt;el-tab-pane&gt;</code> 中时，初始渲染尺寸为 <strong>0x0</strong>，会导致 Canvas
        测量错位、代码重叠甚至黑屏崩溃。 <code>@atengk/code-editor-vue</code> 内置
        <strong>0x0 挂起与 ResizeObserver 自愈状态机</strong>，
        当容器从隐藏恢复可见时自动安全重算布局，杜绝错位。
      </p>

      <div class="intro-actions">
        <el-button type="primary" @click="openDialog">
          打开弹窗编辑器 (&lt;el-dialog&gt;)
        </el-button>
        <el-button type="success" @click="openDrawer"> 打开侧滑抽屉 (&lt;el-drawer&gt;) </el-button>
      </div>
    </el-card>

    <!-- 多标签隐藏/激活几何自愈演示 -->
    <el-card shadow="never" class="tabs-card">
      <template #header>
        <div class="tabs-header">
          <span class="tabs-title">📑 动态 Tabs 切换测试（验证未激活 Tab 首帧 0x0 切换自愈）</span>
        </div>
      </template>

      <el-tabs v-model="activeSubTab" type="card">
        <el-tab-pane label="TypeScript 管道 (Tab 1)" name="tab1">
          <div class="tab-editor-container">
            <AtengCodeEditor
              v-model="tab1Code"
              language="typescript"
              theme="auto"
              height="350px"
              :auto-layout-healing="true"
            />
          </div>
        </el-tab-pane>

        <el-tab-pane label="SQL 分析任务 (Tab 2)" name="tab2">
          <div class="tab-editor-container">
            <AtengCodeEditor
              v-model="tab2Code"
              language="sql"
              theme="auto"
              height="350px"
              :auto-layout-healing="true"
            />
          </div>
        </el-tab-pane>

        <el-tab-pane label="JSON Schema 配置 (Tab 3)" name="tab3">
          <div class="tab-editor-container">
            <AtengCodeEditor
              v-model="tab3Code"
              language="json"
              theme="auto"
              height="350px"
              :auto-layout-healing="true"
            />
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 弹窗编辑器 -->
    <el-dialog
      v-model="dialogVisible"
      title="模态弹窗代码编辑器 (0x0 -> 可见自愈验证)"
      width="60%"
      destroy-on-close
    >
      <div class="dialog-editor-container">
        <AtengCodeEditor
          ref="dialogEditorRef"
          v-model="dialogCode"
          language="typescript"
          theme="auto"
          height="380px"
          :auto-layout-healing="true"
        />
      </div>
      <template #footer>
        <el-button @click="dialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="dialogVisible = false">确认并保存</el-button>
      </template>
    </el-dialog>

    <!-- 抽屉编辑器 -->
    <el-drawer
      v-model="drawerVisible"
      title="侧滑抽屉代码编辑器 (滑动动画自愈验证)"
      size="50%"
      destroy-on-close
    >
      <div class="drawer-editor-container">
        <AtengCodeEditor
          ref="drawerEditorRef"
          v-model="drawerCode"
          language="typescript"
          theme="auto"
          height="100%"
          :auto-layout-healing="true"
        />
      </div>
    </el-drawer>
  </div>
</template>

<style scoped>
.lifecycle-scenario {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.scenario-intro {
  background-color: var(--el-bg-color-overlay, #ffffff);
}

.intro-title {
  font-weight: 600;
  font-size: 15px;
}

.intro-desc {
  font-size: 13px;
  line-height: 1.6;
  color: #64748b;
  margin: 0 0 16px 0;
}

.intro-actions {
  display: flex;
  gap: 12px;
}

.tabs-card {
  margin-top: 8px;
}

.tabs-title {
  font-weight: 600;
  font-size: 14px;
}

.tab-editor-container {
  padding-top: 12px;
}

.dialog-editor-container {
  border-radius: 6px;
  overflow: hidden;
}

.drawer-editor-container {
  height: calc(100vh - 120px);
}
</style>
