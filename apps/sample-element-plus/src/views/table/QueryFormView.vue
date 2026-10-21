<script setup lang="ts">
/**
 * AtengQueryForm 响应式栅格高级搜索表单自验视图。
 *
 * 验证特性：
 * 1. 24 栅格自适应与动态指定列数（cols: 1~4 / 响应式断点）；
 * 2. 展开与收起平滑折叠过渡；
 * 3. 独立受控模式：双向数据绑定、查询与重置防抖及事件回调；
 * 4. 操作按钮插槽与额外操作扩展。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { reactive, ref } from 'vue';
import {
  ElCard,
  ElFormItem,
  ElInput,
  ElSelect,
  ElOption,
  ElDatePicker,
  ElRadioGroup,
  ElRadioButton,
  ElMessage,
  ElTag,
} from 'element-plus';
import { AtengQueryForm } from '@atengk/element-plus';

// 1. 查询表单响应式状态
const queryModel = reactive({
  username: '',
  phone: '',
  role: '',
  status: '',
  dateRange: [] as string[],
  remark: '',
});

// 2. 栅格列数受控切换
const selectedCols = ref<number | undefined>(undefined);

// 3. 提交与重置日志记录
const submitLogs = ref<string[]>([]);

const handleSearch = (params: Record<string, unknown>) => {
  const log = `[${new Date().toLocaleTimeString()}] 触发查询：${JSON.stringify(params)}`;
  submitLogs.value.unshift(log);
  ElMessage.success('查询参数已提交');
};

const handleReset = () => {
  const log = `[${new Date().toLocaleTimeString()}] 触发重置：表单数据已恢复默认`;
  submitLogs.value.unshift(log);
  ElMessage.info('表单已重置');
};
</script>

<template>
  <div class="query-form-sample">
    <ElCard shadow="hover" class="demo-card">
      <template #header>
        <div class="card-header">
          <span>🔍 AtengQueryForm 企业级响应式高级搜索表单</span>
          <div class="controls">
            <span class="ctrl-tip">指定栅格列数：</span>
            <ElRadioGroup v-model="selectedCols" size="small">
              <ElRadioButton :value="undefined">自适应断点</ElRadioButton>
              <ElRadioButton :value="1">单列 (1)</ElRadioButton>
              <ElRadioButton :value="2">双列 (2)</ElRadioButton>
              <ElRadioButton :value="3">三列 (3)</ElRadioButton>
              <ElRadioButton :value="4">四列 (4)</ElRadioButton>
            </ElRadioGroup>
          </div>
        </div>
      </template>

      <!-- 搜索表单容器 -->
      <AtengQueryForm
        :model="queryModel"
        :cols="selectedCols"
        :default-collapsed="true"
        label-width="90px"
        @search="handleSearch"
        @reset="handleReset"
      >
        <ElFormItem label="用户姓名" prop="username">
          <ElInput v-model="queryModel.username" placeholder="请输入姓名" clearable />
        </ElFormItem>

        <ElFormItem label="联系电话" prop="phone">
          <ElInput v-model="queryModel.phone" placeholder="请输入手机号" clearable />
        </ElFormItem>

        <ElFormItem label="所属角色" prop="role">
          <ElSelect v-model="queryModel.role" placeholder="请选择角色" clearable>
            <ElOption label="管理员" value="admin" />
            <ElOption label="普通用户" value="user" />
            <ElOption label="访客" value="guest" />
          </ElSelect>
        </ElFormItem>

        <ElFormItem label="账号状态" prop="status">
          <ElSelect v-model="queryModel.status" placeholder="请选择状态" clearable>
            <ElOption label="正常" value="active" />
            <ElOption label="锁定" value="locked" />
            <ElOption label="禁用" value="disabled" />
          </ElSelect>
        </ElFormItem>

        <ElFormItem label="注册时间" prop="dateRange">
          <ElDatePicker
            v-model="queryModel.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
          />
        </ElFormItem>

        <ElFormItem label="备注文档" prop="remark">
          <ElInput v-model="queryModel.remark" placeholder="输入搜索备注" clearable />
        </ElFormItem>
      </AtengQueryForm>
    </ElCard>

    <!-- 实时数据预览面板 -->
    <ElCard shadow="hover" class="preview-card">
      <template #header>
        <div class="card-header">
          <span>📋 实时双向状态与提交日志</span>
          <ElTag size="small" type="success">响应式同步</ElTag>
        </div>
      </template>

      <div class="preview-content">
        <div class="model-preview">
          <h4>当前表单 Model 结构：</h4>
          <pre>{{ JSON.stringify(queryModel, null, 2) }}</pre>
        </div>
        <div class="log-preview">
          <h4>最近操作日志：</h4>
          <div v-if="submitLogs.length === 0" class="empty-log">
            暂无操作日志，点击查询或重置按钮体验防抖调度
          </div>
          <ul v-else class="log-list">
            <li v-for="(log, idx) in submitLogs" :key="idx">{{ log }}</li>
          </ul>
        </div>
      </div>
    </ElCard>
  </div>
</template>

<style scoped>
.query-form-sample {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.demo-card {
  border-radius: 8px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}

.controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ctrl-tip {
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.preview-card {
  border-radius: 8px;
}

.preview-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

pre {
  background-color: var(--el-fill-color-light);
  padding: 12px;
  border-radius: 6px;
  font-size: 13px;
  overflow-x: auto;
  margin: 0;
}

.log-list {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 180px;
  overflow-y: auto;
  font-size: 13px;
}

.log-list li {
  padding: 4px 8px;
  margin-bottom: 4px;
  background-color: var(--el-fill-color-light);
  border-radius: 4px;
  font-family: monospace;
}

.empty-log {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

@media (max-width: 768px) {
  .preview-content {
    grid-template-columns: 1fr;
  }
}
</style>
