<script setup lang="ts">
/**
 * 场景二：双模 Diff 差异比对与双轨回写沙箱。
 *
 * 验证：
 * 1. 双栏并排 (split) 与单栏行内 (inline) 双模平滑切换；
 * 2. 双轨数据绑定 (v-model:original 与 v-model:modified)；
 * 3. 差异跳转导航（上一处 ⬆️ / 下一处 ⬇️）与增删行数实时统计；
 * 4. 0x0 视口几何自愈与暗黑模式热跟随；
 * 5. 修改侧只读与双向编辑动态接管。
 *
 * @author Ateng
 * @since 2026-10-30
 */

import { ref } from 'vue';
import {
  AtengCodeDiffEditor,
  type CodeLanguage,
  type DiffMode,
  type DiffStats,
  type AtengCodeDiffEditorInstance,
} from '@atengk/code-editor-vue';

const diffEditorRef = ref<AtengCodeDiffEditorInstance | null>(null);

const currentDiffMode = ref<DiffMode>('split');
const currentLang = ref<CodeLanguage>('typescript');
const isModifiedReadOnly = ref<boolean>(false);
const isOriginalReadOnly = ref<boolean>(true);
const diffStats = ref<DiffStats>({ additions: 0, deletions: 0, changesCount: 0 });

const initialOriginal = `// 生产环境微服务配置 v1.2.0 (当前线上稳定版)
export const systemConfig = {
  env: 'production',
  clusterId: 'k8s-cluster-cn-north-01',
  maxConnections: 1000,
  timeoutMs: 3000,
  enableExperimentalFeatures: false,
  retryPolicy: {
    maxRetries: 3,
    backoff: 'fixed',
  },
  // 遗留鉴权模式
  legacyAuthV1: true,
};

export async function processRequest(req: Request): Promise<Response> {
  if (!req.headers.has('token')) {
    throw new Error('未授权');
  }
  return fetch('https://api.v1.internal/dispatch', { method: 'POST' });
}
`;

const initialModified = `// 生产环境微服务配置 v1.3.0 (待发布候选版本)
export const systemConfig = {
  env: 'production',
  clusterId: 'k8s-cluster-cn-north-02',
  maxConnections: 5000,
  timeoutMs: 5000,
  enableExperimentalFeatures: true,
  retryPolicy: {
    maxRetries: 5,
    backoff: 'exponential',
    jitter: true,
  },
  // 升级为双轨鉴权并支持雪花 Long ID
  dualTokenAuthV2: true,
  snowflakeIdSupport: true,
};

export async function processRequest(req: Request): Promise<Response> {
  const token = req.headers.get('token') || req.headers.get('Authorization');
  if (!token) {
    throw new Error('401: 凭据缺失或已过期');
  }
  const traceId = req.headers.get('X-Trace-Id') || crypto.randomUUID();
  return fetch('https://api.v2.internal/gateway/dispatch', {
    method: 'POST',
    headers: { 'X-Trace-Id': traceId },
  });
}
`;

const originalCode = ref<string>(initialOriginal);
const modifiedCode = ref<string>(initialModified);

// 模式切换
const toggleMode = (mode: DiffMode): void => {
  currentDiffMode.value = mode;
};

// 差异导航
const handleGoPrev = (): void => {
  diffEditorRef.value?.goToPreviousDiff();
};

const handleGoNext = (): void => {
  diffEditorRef.value?.goToNextDiff();
};

// 重置代码
const resetCode = (): void => {
  originalCode.value = initialOriginal;
  modifiedCode.value = initialModified;
};

// 监听 Diff 统计变化
const handleDiffUpdated = (stats: DiffStats): void => {
  diffStats.value = stats;
};
</script>

<template>
  <div class="diff-scenario">
    <el-card shadow="never" class="control-card">
      <template #header>
        <div class="card-header">
          <span class="card-title">⚖️ 双模代码 Diff 差异比对与双轨导航沙箱</span>
          <div class="actions">
            <el-radio-group v-model="currentDiffMode" size="small" @change="toggleMode">
              <el-radio-button value="split">双栏并排 (Split)</el-radio-button>
              <el-radio-button value="inline">单栏行内 (Inline)</el-radio-button>
            </el-radio-group>
            <el-button-group size="small">
              <el-button @click="handleGoPrev"> ⬆️ 上一处差异 </el-button>
              <el-button @click="handleGoNext"> ⬇️ 下一处差异 </el-button>
              <el-button type="info" plain @click="resetCode"> 重置代码 </el-button>
            </el-button-group>
          </div>
        </div>
      </template>

      <div class="control-panel">
        <div class="panel-left">
          <el-tag type="success" effect="light">新增行：+{{ diffStats.additions }}</el-tag>
          <el-tag type="danger" effect="light">删除行：-{{ diffStats.deletions }}</el-tag>
          <el-tag type="info" effect="plain">变更块：{{ diffStats.changesCount }} 处</el-tag>
          <el-divider direction="vertical" />
          <el-checkbox v-model="isModifiedReadOnly" label="锁定修改侧只读" />
          <el-checkbox v-model="isOriginalReadOnly" label="锁定原始侧只读" />
        </div>
        <div class="panel-right">
          <el-select v-model="currentLang" size="small" style="width: 140px">
            <el-option label="TypeScript" value="typescript" />
            <el-option label="JavaScript" value="javascript" />
            <el-option label="JSON" value="json" />
            <el-option label="SQL" value="sql" />
          </el-select>
        </div>
      </div>
    </el-card>

    <div class="editor-container">
      <AtengCodeDiffEditor
        ref="diffEditorRef"
        v-model:original="originalCode"
        v-model:modified="modifiedCode"
        :diff-mode="currentDiffMode"
        :language="currentLang"
        theme="auto"
        :read-only="isModifiedReadOnly"
        :original-read-only="isOriginalReadOnly"
        height="540px"
        @diff-updated="handleDiffUpdated"
      />
    </div>
  </div>
</template>

<style scoped>
.diff-scenario {
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
  color: #1e293b;
}

:global(html.dark) .card-title {
  color: #f8fafc;
}

.actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.control-panel {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.panel-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.editor-container {
  border-radius: 6px;
  overflow: hidden;
}
</style>
