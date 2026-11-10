<script setup lang="ts">
/**
 * 紧凑批量填报与双轨数据绑定场景看板。
 *
 * 对应 ADR-0049 批量填报模式，演示 v-model:data 双向行对象绑定、隐藏字段保全与实时回显。
 *
 * @author Ateng
 * @since 2026-11-10
 */

import { ref } from 'vue';
import {
  AtengSpreadsheet,
  type SpreadsheetColumn,
  type SpreadsheetRecord,
} from '@atengk/spreadsheet-vue';

// 模拟带有内部私有隐藏属性的企业员工花名册
const employeeList = ref<SpreadsheetRecord[]>([
  {
    _id: 'snowflake_98765432101',
    employeeNo: 'EMP-1001',
    name: '赵六',
    department: '架构设计中心',
    baseSalary: 28000,
    performanceScore: 98,
    entryDate: '2023-04-15',
    secretToken: 'sec_auth_token_001',
  },
  {
    _id: 'snowflake_98765432102',
    employeeNo: 'EMP-1002',
    name: '钱七',
    department: '基础设施运维部',
    baseSalary: 22000,
    performanceScore: 92,
    entryDate: '2023-08-01',
    secretToken: 'sec_auth_token_002',
  },
  {
    _id: 'snowflake_98765432103',
    employeeNo: 'EMP-1003',
    name: '孙八',
    department: '质量工程测试组',
    baseSalary: 19500,
    performanceScore: 89,
    entryDate: '2024-02-18',
    secretToken: 'sec_auth_token_003',
  },
]);

// 显式配置呈现的列（故意隐藏 _id 与 secretToken 内部审计字段）
const tableColumns: SpreadsheetColumn[] = [
  { key: 'employeeNo', title: '工号', width: 110, required: true },
  { key: 'name', title: '姓名', width: 120, required: true },
  { key: 'department', title: '所属部门', width: 160 },
  { key: 'baseSalary', title: '基本薪资(元)', width: 130 },
  { key: 'performanceScore', title: '绩效评分', width: 110 },
  { key: 'entryDate', title: '入职日期', width: 130 },
];

const spreadsheetRef = ref<InstanceType<typeof AtengSpreadsheet> | null>(null);

/**
 * 追加一行新员工。
 */
const handleAddEmployee = (): void => {
  const newEmp: SpreadsheetRecord = {
    _id: `snowflake_${Date.now()}`,
    employeeNo: `EMP-${1000 + employeeList.value.length + 1}`,
    name: `新员工_${employeeList.value.length + 1}`,
    department: '前端研发组',
    baseSalary: 20000,
    performanceScore: 90,
    entryDate: new Date().toISOString().slice(0, 10),
    secretToken: `sec_token_${Date.now()}`,
  };

  employeeList.value.push(newEmp);
  spreadsheetRef.value?.setData(employeeList.value, tableColumns);
};

/**
 * 导出当前填报列表 CSV。
 */
const handleExportCsv = (): void => {
  spreadsheetRef.value?.exportCsv('employee-payroll.csv');
};
</script>

<template>
  <div class="compact-grid-view">
    <div class="dashboard-toolbar">
      <div class="toolbar-title">
        <h3>紧凑业务填报看板 (v-model:data 双向绑定)</h3>
        <p>
          隐藏 Ribbon 工具栏，仅保留公式栏与网格，编辑失焦后 200ms 防抖同步且未展示内部字段 100%
          完好保全
        </p>
      </div>

      <div class="toolbar-actions">
        <button class="at-demo-btn at-demo-btn--primary" type="button" @click="handleAddEmployee">
          + 追加新记录
        </button>
        <button class="at-demo-btn" type="button" @click="handleExportCsv">导出当前 CSV</button>
      </div>
    </div>

    <!-- 紧凑表格区域 -->
    <div class="spreadsheet-wrapper">
      <AtengSpreadsheet
        ref="spreadsheetRef"
        v-model:data="employeeList"
        :columns="tableColumns"
        mode="compact"
        height="420px"
      />
    </div>

    <!-- 数据源实时双向同步监控面板 -->
    <div class="sync-monitor-card">
      <div class="monitor-header">
        <h4>v-model:data 响应式数据源当前实时状态 (已验证内部字段未丢失)</h4>
        <span class="record-counter">共 {{ employeeList.length }} 条记录</span>
      </div>

      <div class="table-preview">
        <table class="native-table">
          <thead>
            <tr>
              <th>隐藏内部 _id</th>
              <th>工号</th>
              <th>姓名</th>
              <th>部门</th>
              <th>基本薪资</th>
              <th>绩效</th>
              <th>隐藏凭据 Token</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="emp in employeeList" :key="String(emp._id)">
              <td class="text-mono">{{ emp._id }}</td>
              <td>{{ emp.employeeNo }}</td>
              <td>
                <strong>{{ emp.name }}</strong>
              </td>
              <td>{{ emp.department }}</td>
              <td>¥{{ emp.baseSalary }}</td>
              <td>{{ emp.performanceScore }}</td>
              <td class="text-mono text-muted">{{ emp.secretToken }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.compact-grid-view {
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
  gap: 10px;
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

.at-demo-btn:hover {
  border-color: #409eff;
  color: #409eff;
}

.at-demo-btn--primary {
  background-color: #409eff;
  border-color: #409eff;
  color: #ffffff;
}

.sync-monitor-card {
  padding: 16px;
  background-color: #ffffff;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
}

.monitor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.monitor-header h4 {
  margin: 0;
  font-size: 14px;
  color: #303133;
}

.record-counter {
  font-size: 12px;
  color: #909399;
}

.table-preview {
  overflow-x: auto;
}

.native-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.native-table th,
.native-table td {
  padding: 8px 12px;
  border: 1px solid #ebeef5;
  text-align: left;
}

.native-table th {
  background-color: #fafafa;
  color: #606266;
}

.text-mono {
  font-family: monospace;
}

.text-muted {
  color: #909399;
}
</style>
