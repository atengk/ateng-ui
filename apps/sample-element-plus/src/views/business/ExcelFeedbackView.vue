<script setup lang="ts">
/**
 * Excel 导入错误反馈弹窗与流式导出双态防御自验展厅。
 *
 * 核心演示特性：
 * 1. AtengExcelFeedback 后端批注回写模式：异步流式下载标红批注 Excel；
 * 2. AtengExcelFeedback 前端本地降级模式：无后端批注文件时，生成带 UTF-8 BOM (\uFEFF) 的 CSV 错误清单，彻底解决 Windows Excel 中文乱码；
 * 3. AtengExcelExport ADR-0004 双态异常防御：后端返回 application/json 错误体时，自动熔断拦截并告警，坚决不下载损坏伪文件；
 * 4. AtengExcelExport 正常流式导出对照组。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { ref } from 'vue';
import { ElCard, ElAlert, ElButton, ElMessage, ElTag } from 'element-plus';
import { AtengExcelFeedback, AtengExcelExport, type ExcelFeedbackItem } from '@atengk/element-plus';

// 弹窗可见性：模式一（带批注）与模式二（无批注降级 CSV）
const feedbackVisible = ref(false);
const feedbackNoAnnotateVisible = ref(false);

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
  await new Promise(resolve => setTimeout(resolve, 800));

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

// 模拟 AtengExcelExport 正常流式导出
const handleMockNormalExport = async (): Promise<Blob> => {
  await new Promise(resolve => setTimeout(resolve, 600));
  const dummyContent = 'ID,姓名,部门,状态\n1,张三,研发部,正常\n2,李四,市场部,正常';
  return new Blob(['\uFEFF' + dummyContent], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
};

// 模拟 AtengExcelExport ADR-0004 双态异常：后端发生业务拦截，返回了装在 Blob 里的 application/json 错误体
const handleMockDualStateErrorExport = async (): Promise<Blob> => {
  await new Promise(resolve => setTimeout(resolve, 600));
  const errorJson = JSON.stringify({
    code: 40301,
    msg: '数据安全合规熔断：您无权限全量导出包含薪资与身份证的核心员工档案',
    traceId: 'trace-demo-dual-state-8888',
  });
  return new Blob([errorJson], { type: 'application/json;charset=utf-8' });
};

// 操作反馈日志
const feedbackLogs = ref<string[]>([]);

const addLog = (message: string) => {
  feedbackLogs.value.unshift(`[${new Date().toLocaleTimeString()}] ${message}`);
};

const handleCopySuccess = (text: string) => {
  addLog(`成功复制错误明细至剪贴板（前 50 字）：${text.slice(0, 50)}...`);
  ElMessage.success('已复制全部错误明细至系统剪贴板！');
};

const handleDownloadSuccess = (filename: string) => {
  addLog(`文件下载成功：${filename}`);
  ElMessage.success(`文件下载成功：${filename}`);
};

const handleDownloadError = (err: unknown) => {
  addLog(`下载发生异常：${String(err)}`);
  ElMessage.error(`下载异常：${String(err)}`);
};

const handleExportError = (err: unknown) => {
  addLog(`导出被 ADR-0004 双态防线成功拦截：${err instanceof Error ? err.message : String(err)}`);
};

const handleExportSuccess = () => {
  addLog('正常导出任务完成并已触发浏览器下载');
};
</script>

<template>
  <div class="excel-feedback-view">
    <!-- 1. Excel 导入错误反馈弹窗演示 (AtengExcelFeedback) -->
    <ElCard header="1. Excel 导入错误反馈弹窗 (AtengExcelFeedback)">
      <ElAlert
        title="双轨纠错与防乱码机制"
        type="info"
        description="专为企业级 Excel 导入失败场景打造：在线表格结构化呈现错误行号、列名、原始值与校验失败原因；内置分页控制器防撑破；支持一键复制全部错误文本；当后端提供批注时可流式下载标红批注 Excel；当后端未提供批注文件时，前端本地无缝降级生成带 UTF-8 BOM (\uFEFF) 的 CSV 错误清单，彻底解决 Windows Excel 双击打开乱码顽疾。"
        show-icon
        :closable="false"
        style="margin-bottom: 20px"
      />

      <div class="demo-section">
        <div class="action-panel">
          <ElButton type="danger" @click="feedbackVisible = true">
            场景 A：模拟导入失败（含后端标红批注 Excel 回写）
          </ElButton>
          <ElButton type="warning" @click="feedbackNoAnnotateVisible = true">
            场景 B：模拟导入失败（无批注文件，本地降级 UTF-8 BOM CSV）
          </ElButton>
        </div>

        <div class="stats-panel" style="margin-top: 16px">
          <span class="stats-label">当前待检错误集：</span>
          <ElTag type="danger" size="small"> 错误记录：{{ mockErrors.length }} 条 </ElTag>
          <ElTag type="success" size="small" style="margin-left: 8px">
            场景 A：后端标红批注回写
          </ElTag>
          <ElTag type="warning" size="small" style="margin-left: 8px">
            场景 B：本地 UTF-8 BOM CSV 降级
          </ElTag>
        </div>
      </div>
    </ElCard>

    <!-- 2. Excel 流式导出与 ADR-0004 双态异常防御演示 (AtengExcelExport) -->
    <ElCard
      header="2. Excel 流式导出与 ADR-0004 双态异常识别防御 (AtengExcelExport)"
      style="margin-top: 20px"
    >
      <ElAlert
        title="ADR-0004 Blob-JSON 双态异常识别防线"
        type="warning"
        description="当前端以 responseType: 'blob' 导出文件时，若后端发生权限拦截或业务报错，返回 application/json 会被封装为 Blob。若前端直接触发下载，会导致用户下载损坏的伪 xlsx 文件。AtengExcelExport 集成 checkBlobForJsonError 防线，自动嗅探解包并转译为业务异常拦截，绝不触发假下载。"
        show-icon
        :closable="false"
        style="margin-bottom: 20px"
      />

      <div class="demo-section">
        <div class="action-panel">
          <div class="export-demo-item">
            <span class="demo-label">A. 模拟触发业务异常拦截：</span>
            <AtengExcelExport
              :action="handleMockDualStateErrorExport"
              filename="全量员工敏感资产.xlsx"
              text="触发敏感数据导出 (触发双态拦截)"
              type="danger"
              @export-error="handleExportError"
            />
          </div>

          <div class="export-demo-item">
            <span class="demo-label">B. 正常流式导出：</span>
            <AtengExcelExport
              :action="handleMockNormalExport"
              filename="员工导出名单.xlsx"
              text="导出普通员工名单"
              type="primary"
              @export-success="handleExportSuccess"
            />
          </div>
        </div>
      </div>
    </ElCard>

    <!-- 3. 操作流水与诊断日志 -->
    <ElCard header="3. 交互操作流水与防御诊断日志" style="margin-top: 20px">
      <div v-if="feedbackLogs.length > 0" class="log-box">
        <div class="log-title">操作流水跟踪（最新居前）：</div>
        <div v-for="(log, idx) in feedbackLogs" :key="idx" class="log-line">
          {{ log }}
        </div>
      </div>
      <div v-else class="empty-log">
        点击上方任意按钮体验导入错误回写、本地 CSV 防乱码降级或 ADR-0004 双态异常拦截。
      </div>
    </ElCard>

    <!-- 弹窗 A：有后端批注文件回写 -->
    <AtengExcelFeedback
      v-model="feedbackVisible"
      title="场景 A：员工名单导入失败明细 (含批注回写)"
      :errors="mockErrors"
      :download-action="handleMockDownloadAction"
      file-name="员工导入校验失败批注清单.xlsx"
      :page-size="5"
      @copy="handleCopySuccess"
      @download-success="handleDownloadSuccess"
      @download-error="handleDownloadError"
    />

    <!-- 弹窗 B：无后端批注文件，前端本地降级 UTF-8 BOM CSV -->
    <AtengExcelFeedback
      v-model="feedbackNoAnnotateVisible"
      title="场景 B：员工名单导入失败明细 (本地 CSV 降级)"
      :errors="mockErrors"
      csv-file-name="员工导入错误明细清单(本地导出).csv"
      download-csv-text="导出错误清单 (CSV)"
      :page-size="5"
      @copy="handleCopySuccess"
      @download-success="handleDownloadSuccess"
      @download-error="handleDownloadError"
    />
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
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
}

.export-demo-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.demo-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-regular);
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

.empty-log {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  font-style: italic;
  padding: 8px 0;
}
</style>
