<script setup lang="ts">
/**
 * Excel 导入错误反馈弹窗 AtengExcelFeedback 自验页面。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { ref } from 'vue';
import { ElCard, ElAlert, ElButton, ElDivider, ElMessage, ElTag } from 'element-plus';
import { AtengExcelFeedback, type ExcelFeedbackItem } from '@atengk/element-plus';

// 弹窗可见性
const feedbackVisible = ref(false);

// 模拟导入失败的错误明细数据（12 条，涵盖多行、多列与不同失败场景）
const mockErrors = ref<ExcelFeedbackItem[]>([
  {
    rowNum: 2,
    columnName: '用户手机号',
    errorMessage: '手机号格式不合法，必须为 11 位有效大陆手机号',
    rawValue: '138123456',
  },
  {
    rowNum: 2,
    columnName: '身份证号',
    errorMessage: '身份证校验位计算失败，非有效校验码',
    rawValue: '11010119900307234X',
  },
  {
    rowNum: 4,
    columnName: '所属部门',
    errorMessage: '部门「量子计算事业部」在系统组织树中不存在',
    rawValue: '量子计算事业部',
  },
  {
    rowNum: 5,
    columnName: '登录账号',
    errorMessage: '账号已存在，系统禁止重复创建',
    rawValue: 'admin_root',
  },
  {
    rowNum: 7,
    columnName: '月薪待遇',
    errorMessage: '金额必须为正数且不可大于 1,000,000',
    rawValue: '-5000',
  },
  {
    rowNum: 8,
    columnName: '电子邮箱',
    errorMessage: '邮箱域名格式缺失 @ 符号',
    rawValue: 'invalid_email.com',
  },
  {
    rowNum: 10,
    columnName: '出生日期',
    errorMessage: '出生日期不可晚于当前系统时间',
    rawValue: '2099-01-01',
  },
  {
    rowNum: 11,
    columnName: '岗位职级',
    errorMessage: '职级必须介于 P1 ~ P10 之间',
    rawValue: 'P99',
  },
  {
    rowNum: 12,
    columnName: '入职日期',
    errorMessage: '日期格式错误，期望标准 YYYY-MM-DD',
    rawValue: '2026/10/35',
  },
  {
    rowNum: 15,
    columnName: '用户性别',
    errorMessage: '未匹配到有效字典枚举值（1=男，2=女）',
    rawValue: '保密',
  },
  {
    rowNum: 18,
    columnName: '银行账号',
    errorMessage: '银行卡号位数不合法（应为 16~19 位）',
    rawValue: '622202',
  },
  {
    rowNum: 20,
    columnName: '紧急联系人',
    errorMessage: '联系人姓名长度必须介于 2~20 个字符',
    rawValue: 'A',
  },
]);

// 模拟异步下载标红批注 Excel 文件
const handleMockDownloadAction = async (): Promise<Blob> => {
  // 模拟服务端导出耗时 1200ms
  await new Promise(resolve => setTimeout(resolve, 1200));

  // 构造模拟 Excel 文本 Blob
  const csvContent =
    '行号,列名,输入值,错误原因\n' +
    mockErrors.value
      .map(
        e =>
          `"${e.rowNum}","${e.columnName || ''}","${String(e.rawValue || '')}","${e.errorMessage}"`,
      )
      .join('\n');

  return new Blob(['\uFEFF' + csvContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
};

// 操作反馈日志
const feedbackLogs = ref<string[]>([]);

const handleCopySuccess = (text: string) => {
  feedbackLogs.value.unshift(
    `[${new Date().toLocaleTimeString()}] 成功复制错误明细至剪贴板（前 50 字）：${text.slice(0, 50)}...`,
  );
  ElMessage.success('已复制全部错误明细至系统剪贴板！');
};

const handleDownloadSuccess = (filename: string) => {
  feedbackLogs.value.unshift(
    `[${new Date().toLocaleTimeString()}] 标红批注 Excel 文件下载成功：${filename}`,
  );
  ElMessage.success(`标红批注 Excel 文件下载成功：${filename}`);
};

const handleDownloadError = (err: unknown) => {
  ElMessage.error(`下载异常：${String(err)}`);
};
</script>

<template>
  <div class="excel-feedback-view">
    <ElCard header="Excel 导入错误明细反馈 AtengExcelFeedback">
      <ElAlert
        title="组件核心能力"
        type="info"
        description="专为企业级 Excel 导入失败场景打造：集成 AtengDialog 弹窗容器；在线表格结构化呈现错误行号、列名、原始值与校验失败原因；内置分页控制器防撑破；支持一键格式化复制全部错误文本；完美打通 Fesod 标红批注 Excel 下载协议（支持静态 URL 与异步 Blob 流下载双模）。"
        show-icon
        :closable="false"
        style="margin-bottom: 20px"
      />

      <div class="demo-section">
        <div class="action-panel">
          <ElButton type="danger" @click="feedbackVisible = true">
            模拟 Excel 批量导入失败 (打开错误弹窗，共 12 条错误)
          </ElButton>
          <span class="panel-hint">点击后即可唤起结构化错误明细分析与批注下载弹窗</span>
        </div>

        <div class="stats-panel" style="margin-top: 16px">
          <span class="stats-label">当前待检错误集：</span>
          <ElTag type="danger" size="small"> 错误记录：{{ mockErrors.length }} 条 </ElTag>
          <ElTag type="info" size="small" style="margin-left: 8px"> 下载模式：异步 Blob 流 </ElTag>
        </div>

        <div v-if="feedbackLogs.length > 0" class="log-box" style="margin-top: 16px">
          <div class="log-title">用户交互操作流水：</div>
          <div v-for="(log, idx) in feedbackLogs" :key="idx" class="log-line">
            {{ log }}
          </div>
        </div>
      </div>

      <ElDivider />

      <!-- 核心 AtengExcelFeedback 弹窗 -->
      <AtengExcelFeedback
        v-model="feedbackVisible"
        title="员工名单 Excel 批量导入失败明细"
        :errors="mockErrors"
        :download-action="handleMockDownloadAction"
        file-name="员工导入校验失败批注清单.xlsx"
        :page-size="5"
        @copy="handleCopySuccess"
        @download-success="handleDownloadSuccess"
        @download-error="handleDownloadError"
      />
    </ElCard>
  </div>
</template>

<style scoped>
.excel-feedback-view {
  max-width: 1100px;
}

.demo-section {
  padding: 8px 0;
}

.action-panel {
  display: flex;
  align-items: center;
  gap: 16px;
}

.panel-hint {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.stats-panel {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stats-label {
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.log-box {
  background-color: var(--el-fill-color-darker);
  font-family: monospace;
  font-size: 12px;
  padding: 12px 16px;
  border-radius: 4px;
}

.log-title {
  font-weight: 600;
  margin-bottom: 6px;
  color: var(--el-text-color-primary);
}

.log-line {
  color: var(--el-text-color-regular);
  line-height: 1.6;
}
</style>
