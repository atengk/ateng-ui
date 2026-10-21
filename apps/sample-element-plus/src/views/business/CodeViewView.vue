<script setup lang="ts">
/**
 * AtengCodeView 源码高亮查看器展厅。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { ref } from 'vue';
import {
  ElCard,
  ElRadioGroup,
  ElRadioButton,
  ElSwitch,
  ElSpace,
  ElDivider,
  ElButton,
  ElTag,
  ElMessage,
} from 'element-plus';
import {
  AtengCodeView,
  type CodeViewLanguage,
  type CodeViewTheme,
  type AtengCodeViewInstance,
} from '@atengk/element-plus';

const codeViewRef = ref<AtengCodeViewInstance>();

const currentLang = ref<CodeViewLanguage>('json');
const currentTheme = ref<CodeViewTheme>('dark');
const showLineNo = ref<boolean>(true);
const wordWrap = ref<boolean>(true);
const collapsible = ref<boolean>(true);
const collapsedCount = ref<number>(0);

const handleFoldAll = () => {
  codeViewRef.value?.foldAll();
};

const handleUnfoldAll = () => {
  codeViewRef.value?.unfoldAll();
};

const handleFoldChange = (lines: number[]) => {
  collapsedCount.value = lines.length;
};

// 示例代码字典
const sampleCodes: Record<CodeViewLanguage, string | Record<string, unknown>> = {
  json: {
    code: 200,
    msg: '操作成功',
    traceId: 'trace-8899221100293847',
    data: {
      userId: '900213012938102',
      username: 'ateng_admin',
      roles: ['super_admin', 'devops_engineer'],
      profile: {
        email: 'ateng@example.com',
        phone: '138****8888',
        loginCount: 42,
        isVerified: true,
      },
    },
  },
  sql: `-- 查询近 30 天订单统计与用户维度分析报表
SELECT
  u.id AS user_id,
  u.username,
  COUNT(o.id) AS total_orders,
  SUM(o.amount) AS total_amount,
  AVG(o.amount) AS avg_amount
FROM sys_user u
INNER JOIN bus_order o ON u.id = o.user_id
WHERE o.status = 1
  AND o.create_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY u.id, u.username
HAVING total_amount > 10000
ORDER BY total_amount DESC
LIMIT 100;`,
  typescript: `/**
 * 企业级 Snowflake ID 防失真网络转换管道。
 */
import type { AxiosResponseTransformer } from 'axios';

export function createSnowflakeTransformer(): AxiosResponseTransformer {
  return function transform(data: unknown): unknown {
    if (typeof data !== 'string') return data;
    // 匹配 16 位及以上连续整数并转换为字符串
    const sanitized = data.replace(/:\\s*(-?\\d{16,})/g, ':"$1"');
    return JSON.parse(sanitized);
  };
}`,
  javascript: `// 原生 Web API 复制剪贴板
async function copyToClipboard(text) {
  if (navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  return false;
}`,
  html: `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>Ateng UI Production Suite</title>
  </head>
  <body>
    <div id="app" class="at-container">
      <h1>Hello Ateng UI!</h1>
    </div>
  </body>
</html>`,
  xml: `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
  <groupId>com.ateng</groupId>
  <artifactId>ateng-framework</artifactId>
  <version>1.0.0-RELEASE</version>
</project>`,
  text: `[2026-10-21 21:00:00] INFO - System ready for incoming requests.
[2026-10-21 21:00:05] WARN - Client connection reset by peer.
[2026-10-21 21:00:10] ERROR - Failed to resolve host: cluster.internal.lan`,
};

const handleCopy = (text: string) => {
  ElMessage.success(`代码已成功复制 (${text.length} 字符)`);
};
</script>

<template>
  <div class="code-view-view">
    <ElCard shadow="never" class="demo-card">
      <template #header>
        <div class="card-header">
          <span class="title">AtengCodeView 轻量源码与结构化数据查看器</span>
          <span class="subtitle">
            零重型高亮库依赖，纯原生分词着色、行号侧边栏、防 XSS 转义与明暗主题双模
          </span>
        </div>
      </template>

      <!-- 选项控制器 -->
      <div class="toolbar">
        <ElSpace wrap :size="16">
          <div class="ctrl-group">
            <span class="label">语言类型：</span>
            <ElRadioGroup v-model="currentLang" size="small">
              <ElRadioButton value="json">JSON</ElRadioButton>
              <ElRadioButton value="sql">SQL</ElRadioButton>
              <ElRadioButton value="typescript">TypeScript</ElRadioButton>
              <ElRadioButton value="html">HTML</ElRadioButton>
              <ElRadioButton value="xml">XML</ElRadioButton>
              <ElRadioButton value="text">TEXT</ElRadioButton>
            </ElRadioGroup>
          </div>

          <div class="ctrl-group">
            <span class="label">视觉主题：</span>
            <ElRadioGroup v-model="currentTheme" size="small">
              <ElRadioButton value="dark">Dark (暗黑)</ElRadioButton>
              <ElRadioButton value="light">Light (浅白)</ElRadioButton>
            </ElRadioGroup>
          </div>

          <div class="ctrl-group">
            <span class="label">显示行号：</span>
            <ElSwitch v-model="showLineNo" />
          </div>

          <div class="ctrl-group">
            <span class="label">自动折行：</span>
            <ElSwitch v-model="wordWrap" />
          </div>

          <div class="ctrl-group">
            <span class="label">代码折叠：</span>
            <ElSwitch v-model="collapsible" />
          </div>

          <div v-if="collapsible" class="ctrl-group">
            <ElButton size="small" @click="handleFoldAll">全部折叠</ElButton>
            <ElButton size="small" @click="handleUnfoldAll">全部展开</ElButton>
            <ElTag v-if="collapsedCount > 0" size="small" type="warning">
              已折叠 {{ collapsedCount }} 块
            </ElTag>
          </div>
        </ElSpace>
      </div>

      <ElDivider />

      <!-- 代码呈现视口 -->
      <div class="code-wrapper">
        <AtengCodeView
          ref="codeViewRef"
          :code="sampleCodes[currentLang]"
          :language="currentLang"
          :theme="currentTheme"
          :line-numbers="showLineNo"
          :word-wrap="wordWrap"
          :collapsible="collapsible"
          max-height="450px"
          @copy="handleCopy"
          @fold-change="handleFoldChange"
        />
      </div>
    </ElCard>
  </div>
</template>

<style scoped lang="scss">
.code-view-view {
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
    margin-bottom: 8px;

    .ctrl-group {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: var(--el-text-color-regular);
    }
  }

  .code-wrapper {
    margin-top: 12px;
  }
}
</style>
