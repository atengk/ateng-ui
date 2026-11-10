<script setup lang="ts">
/**
 * 只读审计与报表审阅场景看板。
 *
 * 对应 ADR-0049 只读审阅模式，演示禁用编辑、原子开关隐藏、选区高亮与 UTF-8 BOM CSV 导出。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { ref } from 'vue';
import {
  AtengSpreadsheet,
  type SpreadsheetSnapshot,
  type SpreadsheetRange,
} from '@atengk/spreadsheet-vue';

const spreadsheetRef = ref<InstanceType<typeof AtengSpreadsheet> | null>(null);
const currentRange = ref<SpreadsheetRange | null>(null);

const auditReportSnapshot: SpreadsheetSnapshot = {
  id: 'wb-audit-2026',
  name: '2026年度企业合规与安全审计核查报表 (只读防篡改)',
  locale: 'zh-CN',
  sheetOrder: ['sheet-audit-01'],
  sheets: {
    'sheet-audit-01': {
      id: 'sheet-audit-01',
      name: '审计检查项明细',
      rowCount: 25,
      columnCount: 8,
      cellData: {
        0: {
          0: { v: '检查项编号', s: { bold: true, backgroundColor: '#f0f2f5' } },
          1: { v: '安全领域', s: { bold: true, backgroundColor: '#f0f2f5' } },
          2: { v: '控制要求', s: { bold: true, backgroundColor: '#f0f2f5' } },
          3: { v: '合规状态', s: { bold: true, backgroundColor: '#f0f2f5' } },
          4: { v: '审计评分', s: { bold: true, backgroundColor: '#f0f2f5' } },
        },
        1: {
          0: { v: 'SEC-CHK-01' },
          1: { v: '身份鉴权与访问控制' },
          2: { v: '双 Token 并发续期与雪花 ID 精度保全' },
          3: { v: '合规 PASS' },
          4: { v: 100 },
        },
        2: {
          0: { v: 'SEC-CHK-02' },
          1: { v: '前端内存安全与脱敏' },
          2: { v: '内存真明文与渲染态动态脱敏' },
          3: { v: '合规 PASS' },
          4: { v: 98 },
        },
        3: {
          0: { v: 'SEC-CHK-03' },
          1: { v: '流式网络与异常识别' },
          2: { v: 'Blob 双态识别与 JSON 错误帧转译' },
          3: { v: '合规 PASS' },
          4: { v: 99 },
        },
      },
    },
  },
};

/**
 * 选区变动监听。
 */
const handleSelectionChange = (range: SpreadsheetRange | null): void => {
  currentRange.value = range;
};

/**
 * 导出审计报表 CSV。
 */
const handleExportCsv = (): void => {
  spreadsheetRef.value?.exportCsv('compliance-audit-report.csv');
};
</script>

<template>
  <div class="readonly-audit-view">
    <div class="dashboard-toolbar">
      <div class="toolbar-title">
        <h3>只读审计报表看板 (mode="readonly")</h3>
        <p>彻底禁用键盘编辑与操作指令，保留选区高亮与复制能力，支持原生带 BOM CSV 文本导出</p>
      </div>

      <div class="toolbar-actions">
        <button class="at-demo-btn at-demo-btn--primary" type="button" @click="handleExportCsv">
          导出审计 CSV (UTF-8 BOM)
        </button>
      </div>
    </div>

    <!-- 只读电子表格容器 -->
    <div class="spreadsheet-wrapper">
      <AtengSpreadsheet
        ref="spreadsheetRef"
        :snapshot="auditReportSnapshot"
        mode="readonly"
        :show-toolbar="false"
        :show-formula-bar="false"
        height="450px"
        @selection-change="handleSelectionChange"
      >
        <template #footer="{ activeSheetId, isDirty }">
          <div class="audit-footer">
            <span>当前报表 ID: {{ activeSheetId }}</span>
            <span class="badge-audit">只读保护生效中</span>
            <span v-if="currentRange" class="selection-indicator">
              选区: 行 [{{ currentRange.startRow }}, {{ currentRange.endRow }}] 列 [{{
                currentRange.startColumn
              }}, {{ currentRange.endColumn }}]
            </span>
            <span>脏数据标记: {{ isDirty ? '异常突变' : '干净无篡改' }}</span>
          </div>
        </template>
      </AtengSpreadsheet>
    </div>
  </div>
</template>

<style scoped>
.readonly-audit-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.dashboard-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background-color: var(--at-spreadsheet-bg, #ffffff);
  border: 1px solid var(--at-spreadsheet-border-color, #e4e7ed);
  border-radius: 6px;
}

.toolbar-title h3 {
  margin: 0 0 4px;
  font-size: 16px;
}

.toolbar-title p {
  margin: 0;
  font-size: 12px;
  color: #909399;
}

.spreadsheet-wrapper {
  background-color: #ffffff;
  border-radius: 6px;
  overflow: hidden;
}

.at-demo-btn {
  padding: 6px 14px;
  font-size: 13px;
  border-radius: 4px;
  border: 1px solid #dcdfe6;
  background-color: #ffffff;
  cursor: pointer;
  transition: all 0.2s;
}

.at-demo-btn--primary {
  background-color: #409eff;
  border-color: #409eff;
  color: #ffffff;
}

.audit-footer {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 12px;
}

.badge-audit {
  padding: 2px 8px;
  border-radius: 4px;
  background-color: #fdf6ec;
  color: #e6a23c;
  font-weight: 500;
}

.selection-indicator {
  color: #409eff;
  font-family: monospace;
}
</style>
