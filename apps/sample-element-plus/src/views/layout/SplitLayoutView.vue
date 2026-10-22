<script setup lang="ts">
/**
 * 企业级弹性分栏布局 AtengSplitLayout 自验页面。
 *
 * @author Ateng
 * @since 2026-10-22
 */

import { ref } from 'vue';
import {
  ElCard,
  ElTree,
  ElTable,
  ElTableColumn,
  ElButton,
  ElRadioGroup,
  ElRadioButton,
  ElAlert,
  ElTag,
  ElInput,
} from 'element-plus';
import { AtengSplitLayout } from '@atengk/element-plus';

const splitDirection = ref<'horizontal' | 'vertical'>('horizontal');
const splitSize = ref<string | number>('280px');
const isCollapsed = ref(false);
const isSecondCollapsed = ref(false);
const collapseTarget = ref<'first' | 'second' | 'both'>('both');

const deptTreeData = [
  {
    id: 1,
    label: '某大型企业总部',
    children: [
      {
        id: 11,
        label: '数字研发中心',
        children: [
          { id: 111, label: '架构与中台组' },
          { id: 112, label: '前端基础设施组' },
          { id: 113, label: 'AI与大模型组' },
        ],
      },
      {
        id: 12,
        label: '产品与体验中心',
        children: [
          { id: 121, label: '交互设计组' },
          { id: 122, label: '用户研究组' },
        ],
      },
      { id: 13, label: '云安全与合规部' },
    ],
  },
];

const selectedDept = ref('数字研发中心');

const handleNodeClick = (data: { label: string }) => {
  selectedDept.value = data.label;
};

const mockUsers = ref([
  { id: 'U001', name: 'Ateng', email: 'ateng@example.com', dept: '前端基础设施组', role: '架构师' },
  { id: 'U002', name: 'Bob', email: 'bob@example.com', dept: '前端基础设施组', role: '工程师' },
  {
    id: 'U003',
    name: 'Charlie',
    email: 'charlie@example.com',
    dept: 'AI与大模型组',
    role: '算法专家',
  },
  { id: 'U004', name: 'David', email: 'david@example.com', dept: '架构与中台组', role: '技术专家' },
]);
</script>

<template>
  <div class="split-view">
    <ElCard header="企业级弹性分栏容器 AtengSplitLayout">
      <ElAlert
        title="左树右表与双向分栏场景"
        type="info"
        description="现代 W3C Pointer Events 原生拖拽调宽，完美支持鼠标、触屏平板与 iPad 手势；支持 collapseTarget（首栏、次栏或双向把手）；提供 storageKey 本地持久化（刷新自动还原尺寸与首尾双折叠状态）；支持水平与垂直双向切换。"
        show-icon
        :closable="false"
        style="margin-bottom: 16px"
      />

      <div class="ctrl-bar">
        <span class="ctrl-label">分栏方向：</span>
        <ElRadioGroup v-model="splitDirection" size="small">
          <ElRadioButton value="horizontal">左右分栏 (Horizontal)</ElRadioButton>
          <ElRadioButton value="vertical">上下分栏 (Vertical)</ElRadioButton>
        </ElRadioGroup>

        <span class="ctrl-label" style="margin-left: 20px">折叠把手面向：</span>
        <ElRadioGroup v-model="collapseTarget" size="small">
          <ElRadioButton value="first">收起左/首栏</ElRadioButton>
          <ElRadioButton value="second">收起右/次栏</ElRadioButton>
          <ElRadioButton value="both">双向把手</ElRadioButton>
        </ElRadioGroup>

        <span class="ctrl-label" style="margin-left: 20px">当前尺寸：{{ splitSize }}</span>
        <span class="ctrl-label" style="margin-left: 20px"
          >首栏状态：{{ isCollapsed ? '已收起' : '展开' }}</span
        >
        <span class="ctrl-label" style="margin-left: 20px"
          >次栏状态：{{ isSecondCollapsed ? '已收起' : '展开' }}</span
        >
      </div>

      <div class="split-box">
        <AtengSplitLayout
          v-model="splitSize"
          v-model:collapsed="isCollapsed"
          v-model:second-collapsed="isSecondCollapsed"
          :collapse-target="collapseTarget"
          :direction="splitDirection"
          default-size="280px"
          min="160px"
          max="500px"
          storage-key="sample_dept_tree"
        >
          <!-- 首栏：组织机构树 -->
          <template #first>
            <div class="tree-panel">
              <div class="panel-header">
                <span class="panel-title">组织架构树</span>
                <ElTag size="small" type="primary">拖拽分割线调宽</ElTag>
              </div>
              <ElInput placeholder="输入部门搜索..." size="small" style="margin-bottom: 12px" />
              <ElTree
                :data="deptTreeData"
                default-expand-all
                highlight-current
                @node-click="handleNodeClick"
              />
            </div>
          </template>

          <!-- 次栏：员工表格 -->
          <template #second>
            <div class="table-panel">
              <div class="panel-header">
                <span class="panel-title">成员列表：{{ selectedDept }}</span>
                <div class="panel-actions">
                  <ElButton size="small">批量分配</ElButton>
                  <ElButton size="small" type="primary">新增员工</ElButton>
                </div>
              </div>

              <ElTable :data="mockUsers" border stripe style="width: 100%">
                <ElTableColumn prop="id" label="工号" width="100" />
                <ElTableColumn prop="name" label="姓名" width="120" />
                <ElTableColumn prop="dept" label="部门" width="180" />
                <ElTableColumn prop="role" label="岗位" width="140" />
                <ElTableColumn prop="email" label="邮箱" />
              </ElTable>
            </div>
          </template>
        </AtengSplitLayout>
      </div>
    </ElCard>
  </div>
</template>

<style scoped>
.split-view {
  width: 100%;
}

.ctrl-bar {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  font-size: 14px;
}

.split-box {
  height: 520px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: var(--el-border-radius-base);
  overflow: hidden;
}

.tree-panel {
  padding: 16px;
  height: 100%;
  box-sizing: border-box;
  background-color: var(--el-bg-color-page);
}

.table-panel {
  padding: 16px;
  height: 100%;
  box-sizing: border-box;
  background-color: var(--el-bg-color);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.panel-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}
</style>
