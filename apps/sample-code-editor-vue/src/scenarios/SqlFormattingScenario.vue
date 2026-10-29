<script setup lang="ts">
/**
 * 场景三：SQL 智能补全与原生美化格式化展厅。
 *
 * 验证：
 * 1. 原生轻量 SQL 格式化排版算法（formatSql）；
 * 2. formatSqlProvider SPI 自定义扩展机制；
 * 3. 受管生命周期智能补全提供者（数据库表名与字段补全）；
 * 4. 快捷格式化工具栏按钮与实例方法调用。
 *
 * @author Ateng
 * @since 2026-10-29
 */

import { ref } from 'vue';
import {
  AtengCodeEditor,
  type AtengCodeEditorInstance,
  type SqlFormatProvider,
  type CompletionProviderFn,
} from '@atengk/code-editor-vue';

const editorRef = ref<AtengCodeEditorInstance | null>(null);
const useCustomFormatter = ref<boolean>(false);

const initialSql = `select u.id,u.username,u.email,count(o.id) as order_count,sum(o.total_amount) as total_spent from sys_user u left join biz_order o on u.id = o.user_id where u.status = 1 and u.created_at >= '2026-01-01' group by u.id, u.username having total_spent > 500 order by total_spent desc limit 20;`;

const sqlCode = ref<string>(initialSql);

// 自定义 SPI 格式化器（模拟企业级定制，添加统一头部注释与分号规则）
const customSqlFormatter: SqlFormatProvider = async (rawSql: string): Promise<string> => {
  return [
    `-- ===================================================`,
    `-- [企业级数据分析中心 · 受管只读查询计划]`,
    `-- 生成时间: ${new Date().toLocaleString()}`,
    `-- ===================================================`,
    rawSql.toUpperCase(),
  ].join('\n');
};

// 业务元数据智能补全提供者 (表名与列名)
const sqlCompletionProvider: CompletionProviderFn = () => {
  return [
    {
      label: 'sys_user',
      kind: 7, // Class
      insertText: 'sys_user',
      detail: '系统用户主表 (sys_user)',
      documentation: '包含核心用户账号、手机、邮箱与状态字段',
    },
    {
      label: 'biz_order',
      kind: 7,
      insertText: 'biz_order',
      detail: '业务订单交易流水表 (biz_order)',
      documentation: '包含订单号、实付金额与支付时间',
    },
    {
      label: 'total_amount',
      kind: 5, // Field
      insertText: 'total_amount',
      detail: 'DECIMAL(12, 2)',
      documentation: '订单实付金额字段',
    },
    {
      label: 'user_id',
      kind: 5,
      insertText: 'user_id',
      detail: 'BIGINT (Snowflake)',
      documentation: '全局用户分布式关联主键',
    },
  ];
};

const handleFormat = (): void => {
  editorRef.value?.format();
};

const handleReset = (): void => {
  sqlCode.value = initialSql;
};
</script>

<template>
  <div class="sql-scenario">
    <el-card shadow="never" class="control-card">
      <template #header>
        <div class="card-header">
          <span class="card-title">🗄️ SQL 智能补全与美化排版配置</span>
          <div class="actions">
            <el-button type="primary" size="small" @click="handleFormat">
              ⚡ 立即格式化排版 (format)
            </el-button>
            <el-button size="small" @click="handleReset"> 重置凌乱 SQL </el-button>
          </div>
        </div>
      </template>

      <el-form :inline="true" size="default">
        <el-form-item label="格式化引擎：">
          <el-radio-group v-model="useCustomFormatter">
            <el-radio-button :value="false">内置原生纳秒级引擎 (formatSql)</el-radio-button>
            <el-radio-button :value="true">自定义 SPI 提供者 (formatSqlProvider)</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item>
          <el-tag type="info"
            >💡 提示：在编辑器中输入 <code>sys_</code> 或 <code>biz_</code> 体验表名智能补全</el-tag
          >
        </el-form-item>
      </el-form>
    </el-card>

    <div class="editor-container">
      <AtengCodeEditor
        ref="editorRef"
        v-model="sqlCode"
        language="sql"
        theme="auto"
        height="480px"
        :format-sql-provider="useCustomFormatter ? customSqlFormatter : undefined"
        :completion-provider="sqlCompletionProvider"
      />
    </div>
  </div>
</template>

<style scoped>
.sql-scenario {
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

.editor-container {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
}
</style>
