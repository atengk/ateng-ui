<script setup lang="ts">
/**
 * AtengTable 企业级综合 CRUD 表格自验展厅沙箱。
 *
 * 验证特性全景矩阵：
 * 1. 深度双向绑定 @atengk/vue 的 usePagination 异步状态机；
 * 2. 顶部 #query 插槽嵌入 AtengQueryForm 实现上下文自动联动；
 * 3. 渐进混合列与 Element Plus 原生透传；
 * 4. 服务端多字段排序联动（sort-change -> pagination.changeSort）；
 * 5. 跨页多选保持机制与底部粘滞批量悬浮操作条（#batch-actions 插槽）；
 * 6. 5 大内置原子工具栏与 storageKey 本地持久化；
 * 7. 异常降级态与 AtengEmpty 重试体验。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { ref, reactive } from 'vue';
import {
  ElCard,
  ElFormItem,
  ElInput,
  ElSelect,
  ElOption,
  ElTableColumn,
  ElTag,
  ElButton,
  ElSwitch,
  ElMessage,
  ElMessageBox,
} from 'element-plus';
import { usePagination } from '@atengk/vue';
import {
  AtengTable,
  AtengQueryForm,
  AtengExcelExport,
  type AtengTableInstance,
} from '@atengk/element-plus';
import type { PageQuery, PageResult } from '@atengk/core';

interface UserItem {
  id: string;
  username: string;
  age: number;
  gender: string;
  role: string;
  status: 'active' | 'locked' | 'disabled';
  createTime: string;
}

// 1. 生成 100 条真实测试数据集（Snowflake 字符串 ID 防截断）
const ALL_MOCK_USERS: UserItem[] = Array.from({ length: 100 }, (_, index) => {
  const idNum = 1850000000000000000n + BigInt(index + 1);
  const statusList: ('active' | 'locked' | 'disabled')[] = ['active', 'locked', 'disabled'];
  const roleList = ['架构师', '高级前端', '后端专家', '测试工程师', '产品经理'];
  return {
    id: idNum.toString(),
    username: `用户_${(index + 1).toString().padStart(3, '0')}`,
    age: 22 + (index % 18),
    gender: index % 2 === 0 ? '男' : '女',
    role: roleList[index % roleList.length],
    status: statusList[index % statusList.length],
    createTime: `2026-10-${((index % 20) + 1).toString().padStart(2, '0')} 10:30:00`,
  };
});

// 2. 模拟网络异常开关
const mockNetworkError = ref(false);

// 3. 模拟分页后端服务
const fetchUsersApi = async (
  params: PageQuery & { username?: string; status?: string },
): Promise<PageResult<UserItem>> => {
  // 模拟真实网络延迟 250ms
  await new Promise(resolve => setTimeout(resolve, 250));

  if (mockNetworkError.value) {
    throw new Error('模拟后端网关 502 Bad Gateway 异常');
  }

  let filtered = [...ALL_MOCK_USERS];

  // 模糊匹配姓名
  if (params.username) {
    filtered = filtered.filter(item => item.username.includes(params.username!));
  }
  // 筛选状态
  if (params.status) {
    filtered = filtered.filter(item => item.status === params.status);
  }

  // 排序
  if (params.sortField) {
    filtered.sort((a, b) => {
      const field = params.sortField as keyof UserItem;
      const valA = a[field];
      const valB = b[field];
      if (valA < valB) return params.sortAsc ? -1 : 1;
      if (valA > valB) return params.sortAsc ? 1 : -1;
      return 0;
    });
  }

  const pageNum = params.pageNum || 1;
  const pageSize = params.pageSize || 10;
  const total = filtered.length;
  const startIndex = (pageNum - 1) * pageSize;
  const list = filtered.slice(startIndex, startIndex + pageSize);

  return {
    list,
    total,
  };
};

// 4. 初始化 @atengk/vue 分页状态机
const pagination = usePagination(fetchUsersApi, {
  defaultPageSize: 10,
  defaultSortField: 'age',
  defaultSortAsc: true,
});

// 5. 表格 Ref 引用与表单状态
const tableRef = ref<AtengTableInstance>();
const selectedKeys = ref<string[]>([]);
const queryForm = reactive({
  username: '',
  status: '',
});

// 6. 操作回调
const handleAddUser = () => {
  ElMessage.success('触发新建用户');
};

const handleMockEmptySearch = () => {
  queryForm.username = '不存在的神秘用户XYZ';
  pagination.search({ username: '不存在的神秘用户XYZ' });
  ElMessage.warning('已模拟无匹配查询条件，表格展示搜索缺省态与自愈按钮');
};

const handleExportExcel = async (payload: Record<string, unknown>) => {
  await new Promise(r => setTimeout(r, 600));
  ElMessage.success(`模拟流式导出成功！入参：${JSON.stringify(payload)}`);
};

const handleEditRow = (row: UserItem) => {
  ElMessage.info(`编辑用户：${row.username} (ID: ${row.id})`);
};

const handleDeleteRow = (row: UserItem) => {
  ElMessageBox.confirm(`确定删除用户 ${row.username} 吗？`, '删除确认', {
    type: 'warning',
  }).then(() => {
    ElMessage.success(`删除成功：${row.id}`);
  });
};

const handleBatchDelete = (selectedRows: UserItem[], clearSelection: () => void) => {
  ElMessageBox.confirm(`确定批量删除选中的 ${selectedRows.length} 项用户数据吗？`, '批量删除确认', {
    type: 'warning',
  }).then(() => {
    ElMessage.success(`批量删除成功，已删除 ${selectedRows.length} 项数据`);
    clearSelection();
  });
};

// 7. 进阶特性演示状态
const enableAutoHeight = ref(false);
</script>

<template>
  <div class="table-crud-sample">
    <!-- 顶部状态与模拟控制面板 -->
    <ElCard shadow="hover" class="control-card">
      <div class="control-row">
        <div class="control-item">
          <span class="ctrl-title">模拟后端网络异常：</span>
          <ElSwitch
            v-model="mockNetworkError"
            active-text="开启异常（触发 AtengEmpty 重试）"
            inactive-text="正常响应"
            @change="pagination.refresh"
          />
        </div>
        <div class="control-item">
          <span class="ctrl-title">视口高度自适应 (autoHeight)：</span>
          <ElSwitch
            v-model="enableAutoHeight"
            active-text="开启自适应 (撑满视口防双滚动条)"
            inactive-text="固定高度/自适应行高"
          />
        </div>
        <div class="control-item">
          <ElButton size="small" @click="pagination.refresh"> 状态机刷新 (refresh) </ElButton>
          <ElButton size="small" type="warning" plain @click="handleMockEmptySearch">
            模拟无匹配搜索 (触发 search 缺省态)
          </ElButton>
          <ElButton size="small" type="danger" plain @click="tableRef?.clearSelection">
            清空多选 (clearSelection)
          </ElButton>
          <ElButton size="small" type="info" plain @click="tableRef?.resetColumns">
            重置列排版 (resetColumns)
          </ElButton>
        </div>
        <div v-if="selectedKeys.length > 0" class="control-item" style="margin-top: 8px">
          <span class="ctrl-title">跨页已选中 ({{ selectedKeys.length }} 项): </span>
          <ElTag
            v-for="id in selectedKeys.slice(0, 3)"
            :key="id"
            size="small"
            type="success"
            style="margin-right: 6px"
          >
            {{ id }}
          </ElTag>
          <span
            v-if="selectedKeys.length > 3"
            style="color: var(--el-text-color-secondary); font-size: 12px"
          >
            ...等共 {{ selectedKeys.length }} 项
          </span>
        </div>
      </div>
      <div class="control-tip">
        💡 提示 1：直接在表头拖拽列边缘（如<strong>「分布式雪花 ID」</strong
        >、<strong>「岗位角色」</strong>）可调整列宽（最小 40px
        防塌陷），刷新浏览器后列宽自动恢复记忆；点击右上角<strong>「列设置」</strong>弹层可拖拽列排序或一键<strong>「重置列宽」</strong>。<br />
        💡 提示 2：点击<strong>「模拟无匹配搜索」</strong>后，表格呈现
        <code>status="search"</code>
        多态缺省态与<strong>「清空筛选条件」</strong>按钮，点击后自动联动表单重置并恢复第一页数据。<br />
        💡 提示 3：已开启<strong>「跨页多选记忆 (reserve-selection)」</strong>，在第 1
        页勾选数据后切换至第 2 页，底部批量操作栏与 <code>v-model:selectedKeys</code> 始终保留已选的
        64 位分布式雪花 ID 字符串。
      </div>
    </ElCard>

    <!-- 主表格核心容器 -->
    <ElCard shadow="hover" class="main-card">
      <AtengTable
        ref="tableRef"
        v-model:selected-keys="selectedKeys"
        :pagination="pagination"
        :auto-height="enableAutoHeight ? 32 : false"
        reserve-selection
        row-key="id"
        storage-key="sample-crud-table-columns"
        border
      >
        <!-- 1. 顶部查询表单插槽（通过 Provide/Inject 与 Table 自动双向联动） -->
        <template #query>
          <AtengQueryForm :model="queryForm" label-width="80px">
            <ElFormItem label="用户姓名" prop="username">
              <ElInput v-model="queryForm.username" placeholder="请输入姓名检索" clearable />
            </ElFormItem>
            <ElFormItem label="用户状态" prop="status">
              <ElSelect v-model="queryForm.status" placeholder="选择状态" clearable>
                <ElOption label="正常" value="active" />
                <ElOption label="锁定" value="locked" />
                <ElOption label="禁用" value="disabled" />
              </ElSelect>
            </ElFormItem>
          </AtengQueryForm>
        </template>

        <!-- 2. 工具栏左侧自定义操作按钮 -->
        <template #toolbar-left>
          <ElButton type="primary" @click="handleAddUser"> + 新建用户 </ElButton>
          <AtengExcelExport :action="handleExportExcel" />
        </template>

        <!-- 3. 原生与混合列插槽 -->
        <ElTableColumn type="selection" width="55" fixed="left" />
        <ElTableColumn prop="id" label="分布式雪花 ID" width="200" />
        <ElTableColumn prop="username" label="用户姓名" width="130" />
        <ElTableColumn prop="age" label="年龄" sortable="custom" width="90" />
        <ElTableColumn prop="gender" label="性别" width="80" align="center" />
        <ElTableColumn prop="role" label="岗位角色" width="130" />

        <ElTableColumn prop="status" label="状态" width="100" align="center">
          <template #default="{ row }">
            <ElTag v-if="row.status === 'active'" type="success" size="small"> 正常 </ElTag>
            <ElTag v-else-if="row.status === 'locked'" type="warning" size="small"> 锁定 </ElTag>
            <ElTag v-else type="danger" size="small"> 禁用 </ElTag>
          </template>
        </ElTableColumn>

        <ElTableColumn prop="createTime" label="注册时间" sortable="custom" min-width="160" />

        <ElTableColumn label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <ElButton link type="primary" size="small" @click="handleEditRow(row)"> 编辑 </ElButton>
            <ElButton link type="danger" size="small" @click="handleDeleteRow(row)">
              删除
            </ElButton>
          </template>
        </ElTableColumn>

        <!-- 4. 底部粘滞批量操作悬浮条自定义业务插槽 -->
        <template #batch-actions="{ selectedRows, clearSelection }">
          <AtengExcelExport
            :action="handleExportExcel"
            text="导出选中数据"
            size="small"
            type="success"
            plain
          />
          <ElButton
            type="danger"
            size="small"
            @click="handleBatchDelete(selectedRows, clearSelection)"
          >
            批量删除 ({{ selectedRows.length }})
          </ElButton>
          <ElButton size="small" @click="clearSelection"> 取消选择 </ElButton>
        </template>
      </AtengTable>
    </ElCard>

    <!-- 独立导出功能演示卡片（无 AtengTable 上下文，纯属性直传与下拉菜单多模切换） -->
    <ElCard shadow="hover" class="export-demo-card" header="AtengExcelExport 独立页面导出演示">
      <div class="export-demo-row">
        <div class="demo-item">
          <span class="demo-label">1. 纯属性直传独立导出 (params 绑定)：</span>
          <AtengExcelExport
            :action="handleExportExcel"
            :params="{ category: 'finance', department: 'rd' }"
            text="独立参数导出"
          />
        </div>
        <div class="demo-item">
          <span class="demo-label">2. 多模下拉菜单模式 (mode="dropdown")：</span>
          <AtengExcelExport
            :action="handleExportExcel"
            :selected-ids="['1001', '1002']"
            mode="dropdown"
            type="success"
            text="多模导出菜单"
          />
        </div>
      </div>
    </ElCard>
  </div>
</template>

<style scoped>
.table-crud-sample {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.control-card {
  border-radius: 8px;
}

.control-tip {
  margin-top: 12px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
  background-color: var(--el-fill-color-light);
  padding: 8px 12px;
  border-radius: 6px;
}

.control-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.control-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ctrl-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.main-card {
  border-radius: 8px;
}

.export-demo-card {
  border-radius: 8px;
}

.export-demo-row {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  align-items: center;
}

.demo-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.demo-label {
  font-size: 14px;
  color: var(--el-text-color-regular);
}
</style>
