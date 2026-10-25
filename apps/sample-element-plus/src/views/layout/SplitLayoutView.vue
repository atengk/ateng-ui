<script setup lang="ts">
/**
 * 企业级弹性分栏布局 AtengSplitLayout 自验页面。
 *
 * 核心演示：
 * 1. 经典双栏分栏：左右与上下双向切换、双向折叠把手与 Pointer Events 原生拖拽；
 * 2. 官方标准三栏组装范式：基于嵌套 AtengSplitLayout 实现“左树 + 中列表 + 右详情”三栏排版，
 *    各层级独立 storageKey 持久化记忆与折叠状态，零状态机复杂度膨胀。
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
  ElTabs,
  ElTabPane,
  ElDescriptions,
  ElDescriptionsItem,
} from 'element-plus';
import { AtengSplitLayout } from '@atengk/element-plus';

const activeTab = ref<'standard' | 'threeColumn'>('threeColumn');

// 1. 双栏状态
const splitDirection = ref<'horizontal' | 'vertical'>('horizontal');
const splitSize = ref<string | number>('280px');
const isCollapsed = ref(false);
const isSecondCollapsed = ref(false);
const collapseTarget = ref<'first' | 'second' | 'both'>('both');
const snapThreshold = ref<number>(30);

// 2. 三栏状态
const outerSplitSize = ref<string | number>('240px');
const innerSplitSize = ref<string | number>('60%');
const isTreeCollapsed = ref(false);
const isDetailCollapsed = ref(false);

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

interface UserItem {
  id: string;
  name: string;
  email: string;
  dept: string;
  role: string;
  status: string;
  joinDate: string;
}

const mockUsers = ref<UserItem[]>([
  {
    id: 'U001',
    name: 'Ateng',
    email: 'ateng@example.com',
    dept: '前端基础设施组',
    role: '架构师',
    status: '在职',
    joinDate: '2023-03-15',
  },
  {
    id: 'U002',
    name: 'Bob',
    email: 'bob@example.com',
    dept: '前端基础设施组',
    role: '工程师',
    status: '在职',
    joinDate: '2024-06-01',
  },
  {
    id: 'U003',
    name: 'Charlie',
    email: 'charlie@example.com',
    dept: 'AI与大模型组',
    role: '算法专家',
    status: '出差',
    joinDate: '2022-11-20',
  },
  {
    id: 'U004',
    name: 'David',
    email: 'david@example.com',
    dept: '架构与中台组',
    role: '技术专家',
    status: '在职',
    joinDate: '2021-08-10',
  },
]);

const currentUser = ref<UserItem>(mockUsers.value[0]);

const handleUserSelect = (row: UserItem) => {
  currentUser.value = row;
};
</script>

<template>
  <div class="split-view">
    <ElCard header="企业级弹性分栏容器 AtengSplitLayout">
      <ElTabs v-model="activeTab" style="margin-bottom: 16px">
        <ElTabPane label="官方标准三栏组装范式 (左树 + 中表 + 右详情)" name="threeColumn" />
        <ElTabPane label="经典双向分栏与触屏拖拽" name="standard" />
      </ElTabs>

      <!-- 视图 1：三栏组装范式 -->
      <div v-if="activeTab === 'threeColumn'">
        <ElAlert
          title="官方标准嵌套三栏布局范式 (Three-Column Layout Pattern)"
          type="success"
          description="架构遵循 ADR-0023 极简设计：坚守双栏单向状态机，三栏场景通过在第二栏内嵌套子 AtengSplitLayout 实现。外层控制【左侧树 ➔ 主体】，内层控制【列表 ➔ 右详情】，两层各自持有独立的 storage-key 记忆与折叠把手，零状态机复杂度膨胀！"
          show-icon
          :closable="false"
          style="margin-bottom: 16px"
        />

        <div class="ctrl-bar">
          <span class="ctrl-label">左树宽度：{{ outerSplitSize }}</span>
          <span class="ctrl-label" style="margin-left: 16px">
            左树折叠：{{ isTreeCollapsed ? '已收起' : '展开' }}
          </span>
          <span class="ctrl-label" style="margin-left: 24px"
            >中间表格占比：{{ innerSplitSize }}</span
          >
          <span class="ctrl-label" style="margin-left: 16px">
            右详情折叠：{{ isDetailCollapsed ? '已收起' : '展开' }}
          </span>
        </div>

        <div class="split-box three-column-box">
          <!-- 外层分栏：左树 + 内部主体 -->
          <AtengSplitLayout
            v-model="outerSplitSize"
            v-model:collapsed="isTreeCollapsed"
            collapse-target="first"
            default-size="240px"
            min="160px"
            max="360px"
            storage-key="sample_three_col_outer"
          >
            <!-- 栏 1：左侧组织导航树 -->
            <template #first>
              <div class="tree-panel">
                <div class="panel-header">
                  <span class="panel-title">组织架构树</span>
                  <ElTag size="small" type="primary">可向左收起</ElTag>
                </div>
                <ElInput placeholder="搜索部门..." size="small" style="margin-bottom: 12px" />
                <ElTree
                  :data="deptTreeData"
                  default-expand-all
                  highlight-current
                  @node-click="handleNodeClick"
                />
              </div>
            </template>

            <!-- 栏 2：嵌套子分栏（中列表 + 右详情） -->
            <template #second>
              <AtengSplitLayout
                v-model="innerSplitSize"
                v-model:second-collapsed="isDetailCollapsed"
                collapse-target="second"
                default-size="60%"
                min="35%"
                max="75%"
                storage-key="sample_three_col_inner"
              >
                <!-- 栏 2.1：中间核心列表 -->
                <template #first>
                  <div class="table-panel">
                    <div class="panel-header">
                      <span class="panel-title">成员列表：{{ selectedDept }}</span>
                      <ElTag size="small">点击行切换右侧详情</ElTag>
                    </div>

                    <ElTable
                      :data="mockUsers"
                      border
                      stripe
                      highlight-current-row
                      style="width: 100%"
                      @row-click="handleUserSelect"
                    >
                      <ElTableColumn prop="id" label="工号" width="90" />
                      <ElTableColumn prop="name" label="姓名" width="100" />
                      <ElTableColumn prop="dept" label="部门" />
                      <ElTableColumn prop="role" label="岗位" width="100" />
                    </ElTable>
                  </div>
                </template>

                <!-- 栏 2.2：右侧档案详情 -->
                <template #second>
                  <div class="detail-panel">
                    <div class="panel-header">
                      <span class="panel-title">成员档案详情</span>
                      <ElTag size="small" type="success">可向右收起</ElTag>
                    </div>

                    <ElDescriptions :column="1" border size="small" class="detail-desc">
                      <ElDescriptionsItem label="工号">
                        {{ currentUser.id }}
                      </ElDescriptionsItem>
                      <ElDescriptionsItem label="姓名">
                        {{ currentUser.name }}
                      </ElDescriptionsItem>
                      <ElDescriptionsItem label="归属部门">
                        {{ currentUser.dept }}
                      </ElDescriptionsItem>
                      <ElDescriptionsItem label="岗位角色">
                        {{ currentUser.role }}
                      </ElDescriptionsItem>
                      <ElDescriptionsItem label="工作邮箱">
                        {{ currentUser.email }}
                      </ElDescriptionsItem>
                      <ElDescriptionsItem label="入职日期">
                        {{ currentUser.joinDate }}
                      </ElDescriptionsItem>
                      <ElDescriptionsItem label="在职状态">
                        <ElTag size="small" type="success">{{ currentUser.status }}</ElTag>
                      </ElDescriptionsItem>
                    </ElDescriptions>
                  </div>
                </template>
              </AtengSplitLayout>
            </template>
          </AtengSplitLayout>
        </div>
      </div>

      <!-- 视图 2：经典双栏分栏 -->
      <div v-else>
        <ElAlert
          title="经典左右/上下双栏拖拽场景（边缘磁吸附与键盘 A11y 增强）"
          type="info"
          description="现代 W3C Pointer Events 原生拖拽调宽；支持 snapThreshold 边缘阻尼磁吸附（逼近临界值吸附折叠，向外拉出平滑恢复）；支持双击分割线快速折叠/复位；支持键盘聚焦后左右/上下方向键 8px 微调（按住 Shift 32px 快速步进）。"
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

          <span class="ctrl-label" style="margin-left: 20px">磁吸附阈值 (snapThreshold)：</span>
          <ElRadioGroup v-model="snapThreshold" size="small">
            <ElRadioButton :value="0">0 (禁用)</ElRadioButton>
            <ElRadioButton :value="30">30px (默认)</ElRadioButton>
            <ElRadioButton :value="60">60px (强吸附)</ElRadioButton>
          </ElRadioGroup>

          <span class="ctrl-label" style="margin-left: 20px">当前尺寸：{{ splitSize }}</span>
        </div>

        <div class="split-box">
          <AtengSplitLayout
            v-model="splitSize"
            v-model:collapsed="isCollapsed"
            v-model:second-collapsed="isSecondCollapsed"
            :collapse-target="collapseTarget"
            :direction="splitDirection"
            :snap-threshold="snapThreshold"
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
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
  font-size: 14px;
}

.split-box {
  height: 520px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: var(--el-border-radius-base);
  overflow: hidden;
}

.three-column-box {
  height: 560px;
}

.tree-panel {
  padding: 16px;
  height: 100%;
  box-sizing: border-box;
  background-color: var(--el-bg-color-page);
  overflow: auto;
}

.table-panel {
  padding: 16px;
  height: 100%;
  box-sizing: border-box;
  background-color: var(--el-bg-color);
  overflow: auto;
}

.detail-panel {
  padding: 16px;
  height: 100%;
  box-sizing: border-box;
  background-color: var(--el-bg-color);
  overflow: auto;
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

.detail-desc {
  margin-top: 12px;
}
</style>
