<script setup lang="ts">
/**
 * 全功能 Office 电子表格工作簿场景看板。
 *
 * 对应 ADR-0049 全功能交互模式，演示多 Sheet 切换、公式联动、快照保存与暗黑主题热跟随。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { ref } from 'vue';
import { AtengSpreadsheet, type SpreadsheetSnapshot } from '@atengk/spreadsheet-vue';

const spreadsheetRef = ref<InstanceType<typeof AtengSpreadsheet> | null>(null);
const currentTheme = ref<'auto' | 'light' | 'dark'>('auto');
const isDarkMode = ref(false);
const savedSnapshot = ref<string>('');

// 初始化多 Sheet 企业财务月度汇总快照
const initialSnapshot: SpreadsheetSnapshot = {
  id: 'wb-finance-q4',
  name: '2026年第四季度财务预算与执行总表',
  locale: 'zh-CN',
  sheetOrder: ['sheet-summary', 'sheet-dept'],
  sheets: {
    'sheet-summary': {
      id: 'sheet-summary',
      name: '预算汇总与执行率',
      rowCount: 30,
      columnCount: 15,
      cellData: {
        0: {
          0: { v: '预算科目', s: { bold: true, backgroundColor: '#f0f2f5' } },
          1: { v: '年初预算(万元)', s: { bold: true, backgroundColor: '#f0f2f5' } },
          2: { v: '实际执行(万元)', s: { bold: true, backgroundColor: '#f0f2f5' } },
          3: { v: '执行率', s: { bold: true, backgroundColor: '#f0f2f5' } },
        },
        1: {
          0: { v: '研发基础设施' },
          1: { v: 1200 },
          2: { v: 1150 },
          3: { f: '=C2/B2', v: 0.9583 },
        },
        2: {
          0: { v: '云原生算力集群' },
          1: { v: 800 },
          2: { v: 760 },
          3: { f: '=C3/B3', v: 0.95 },
        },
        3: {
          0: { v: '安全合规与审计' },
          1: { v: 350 },
          2: { v: 310 },
          3: { f: '=C4/B4', v: 0.8857 },
        },
      },
    },
    'sheet-dept': {
      id: 'sheet-dept',
      name: '各部门支出明细',
      rowCount: 20,
      columnCount: 10,
      cellData: {
        0: {
          0: { v: '部门代码', s: { bold: true } },
          1: { v: '部门名称', s: { bold: true } },
          2: { v: '负责人', s: { bold: true } },
        },
        1: {
          0: { v: 'DEP-001' },
          1: { v: '前端技术基础设施组' },
          2: { v: 'Ateng' },
        },
      },
    },
  },
};

/**
 * 切换宿主 HTML 暗黑模式。
 */
const toggleDarkMode = (): void => {
  isDarkMode.value = !isDarkMode.value;
  if (isDarkMode.value) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

/**
 * 保存当前工作簿快照。
 */
const handleSaveSnapshot = (): void => {
  const snapshot = spreadsheetRef.value?.getSnapshot();
  if (snapshot) {
    savedSnapshot.value = JSON.stringify(snapshot, null, 2);
  }
};

/**
 * 导出工作簿 JSON 快照。
 */
const handleExportJson = (): void => {
  spreadsheetRef.value?.exportJson('finance-q4-budget.json');
};

/**
 * 导出当前激活工作表 CSV。
 */
const handleExportCsv = (): void => {
  spreadsheetRef.value?.exportCsv('finance-q4-active-sheet.csv');
};
</script>

<template>
  <div class="full-workbook-view">
    <div class="dashboard-toolbar">
      <div class="toolbar-title">
        <h3>全功能工作簿场景看板</h3>
        <p>演示公式计算、多工作表无缝切换、暗黑模式无损热跟随与快照导出</p>
      </div>

      <div class="toolbar-actions">
        <button class="at-demo-btn" type="button" @click="toggleDarkMode">
          {{ isDarkMode ? '切换日间明亮' : '切换暗黑模式' }}
        </button>
        <button class="at-demo-btn" type="button" @click="handleSaveSnapshot">
          保存快照到内存
        </button>
        <button class="at-demo-btn" type="button" @click="handleExportCsv">导出当前 CSV</button>
        <button class="at-demo-btn at-demo-btn--primary" type="button" @click="handleExportJson">
          导出全量 JSON
        </button>
      </div>
    </div>

    <!-- 电子表格核心容器 -->
    <div class="spreadsheet-wrapper">
      <AtengSpreadsheet
        ref="spreadsheetRef"
        :snapshot="initialSnapshot"
        mode="full"
        :theme="currentTheme"
        height="560px"
      >
        <template #extra>
          <span class="custom-badge">实时协同已就绪</span>
        </template>
      </AtengSpreadsheet>
    </div>

    <!-- 快照回显控制台 -->
    <div v-if="savedSnapshot" class="snapshot-console">
      <div class="console-header">
        <span>内存快照 JSON 预览 (最新状态)</span>
        <button class="at-demo-btn-text" type="button" @click="savedSnapshot = ''">收起</button>
      </div>
      <pre class="console-body">{{ savedSnapshot }}</pre>
    </div>
  </div>
</template>

<style scoped>
.full-workbook-view {
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

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.spreadsheet-wrapper {
  background-color: #ffffff;
  border-radius: 6px;
  overflow: hidden;
}

.custom-badge {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
  background-color: #e1f3d8;
  color: #67c23a;
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

.at-demo-btn:hover {
  border-color: #409eff;
  color: #409eff;
}

.at-demo-btn--primary {
  background-color: #409eff;
  border-color: #409eff;
  color: #ffffff;
}

.at-demo-btn--primary:hover {
  opacity: 0.9;
  color: #ffffff;
}

.at-demo-btn-text {
  background: transparent;
  border: none;
  color: #409eff;
  cursor: pointer;
  font-size: 12px;
}

.snapshot-console {
  background-color: #1e1e1e;
  border-radius: 6px;
  padding: 12px;
  color: #d4d4d4;
  font-family: monospace;
  font-size: 12px;
}

.console-header {
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid #333;
  padding-bottom: 8px;
  margin-bottom: 8px;
}

.console-body {
  margin: 0;
  max-height: 200px;
  overflow: auto;
}
</style>
