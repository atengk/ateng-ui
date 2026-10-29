<script setup lang="ts">
/**
 * 场景四：JSON Schema 语法校验与悬停提示展厅。
 *
 * 验证：
 * 1. 声明式 jsonSchema Prop 校验；
 * 2. 字段类型错误与缺失必填字段自动红浪线诊断；
 * 3. 字段悬停文档与类型提示。
 *
 * @author Ateng
 * @since 2026-10-29
 */

import { ref } from 'vue';
import { AtengCodeEditor } from '@atengk/code-editor-vue';

// 模拟微服务发布配置契约 Schema
const deployConfigSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'ServiceDeploymentConfig',
  type: 'object',
  required: ['serviceName', 'version', 'replicas', 'port', 'environment'],
  properties: {
    serviceName: {
      type: 'string',
      description: '微服务唯一服务标识（如 user-service）',
    },
    version: {
      type: 'string',
      description: '符合语义化版本规范的镜像 Tag（如 1.0.0）',
    },
    replicas: {
      type: 'integer',
      minimum: 1,
      maximum: 32,
      description: '集群 Pod 副本数，范围必须在 1 ~ 32 之间',
    },
    port: {
      type: 'integer',
      minimum: 1024,
      maximum: 65535,
      description: '服务监听端口（1024 ~ 65535）',
    },
    environment: {
      type: 'string',
      enum: ['development', 'testing', 'staging', 'production'],
      description: '部署目标运行环境',
    },
    enableTracing: {
      type: 'boolean',
      description: '是否开启分布式链路追踪（SkyWalking / OpenTelemetry）',
    },
  },
};

// 初始带有一项类型错误与必填项缺失的数据，直观呈现校验红浪线
const initialJson = `{
  "serviceName": "auth-gateway-service",
  "version": "2.4.0",
  "replicas": 0,
  "port": 8080,
  "environment": "production",
  "enableTracing": true
}
`;

const jsonCode = ref<string>(initialJson);

const handleFixReplicas = (): void => {
  jsonCode.value = `{
  "serviceName": "auth-gateway-service",
  "version": "2.4.0",
  "replicas": 3,
  "port": 8080,
  "environment": "production",
  "enableTracing": true
}
`;
};

const handleBreakJson = (): void => {
  jsonCode.value = `{
  "serviceName": "auth-gateway-service",
  "version": "2.4.0",
  "replicas": 999,
  "port": 80,
  "environment": "unknown_env",
  "enableTracing": "not_boolean"
}
`;
};
</script>

<template>
  <div class="json-scenario">
    <el-card shadow="never" class="control-card">
      <template #header>
        <div class="card-header">
          <span class="card-title">📋 声明式 JSON Schema 校验沙箱</span>
          <div class="actions">
            <el-button type="success" size="small" @click="handleFixReplicas">
              修复副本数为合法值 (replicas: 3)
            </el-button>
            <el-button type="danger" size="small" @click="handleBreakJson">
              注入多处违规字段 (触发红浪线)
            </el-button>
          </div>
        </div>
      </template>

      <div class="schema-info">
        <el-tag type="info"
          >已生效 Schema 规范：必填 [serviceName, version, replicas, port, environment] · replicas ∈
          [1, 32]</el-tag
        >
        <p class="schema-tip">
          💡 提示：将鼠标悬停在 JSON 属性键或值上，可查看类型契约与违规红浪线诊断说明。
        </p>
      </div>
    </el-card>

    <div class="editor-container">
      <AtengCodeEditor
        v-model="jsonCode"
        language="json"
        theme="auto"
        height="480px"
        :json-schema="deployConfigSchema"
      />
    </div>
  </div>
</template>

<style scoped>
.json-scenario {
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

.schema-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.schema-tip {
  margin: 0;
  font-size: 13px;
  color: #64748b;
}

.editor-container {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
}
</style>
