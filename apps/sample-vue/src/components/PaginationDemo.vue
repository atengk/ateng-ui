<script setup lang="ts">
/**
 * sample-vue 契约分页联动与空安全保底自验卡片组件。
 *
 * 演示双向绑定 PageQuery、四维原子动作 (changePage/changePageSize/search/reset) 以及空安全保底不变量。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import { ref } from 'vue';
import { usePagination } from '@atengk/vue';
import type { PageQuery, PageResult } from '@atengk/core';

interface MemberItem {
  id: number;
  name: string;
  department: string;
  role: string;
  status: 'ACTIVE' | 'LOCKED';
}

interface MemberQuery extends PageQuery {
  keyword?: string;
  role?: string;
}

// 模拟后端全部数据集（25 条）
const mockDatabase: MemberItem[] = Array.from({ length: 25 }, (_, i) => {
  const id = i + 1;
  const roles = ['DEVELOPER', 'DESIGNER', 'PRODUCT_MANAGER', 'TESTER'];
  const depts = ['研发中心', '体验设计部', '产品创新部', '质量保障部'];
  return {
    id,
    name: `员工_${String(id).padStart(3, '0')}`,
    department: depts[i % depts.length]!,
    role: roles[i % roles.length]!,
    status: id % 5 === 0 ? 'LOCKED' : 'ACTIVE',
  };
});

// 模拟场景控制标志
const simulateEmpty = ref(false);
const simulateError = ref(false);

// 模拟异步 API 服务
const fetchMembers = async (params: MemberQuery): Promise<PageResult<MemberItem>> => {
  await new Promise(resolve => setTimeout(resolve, 300));

  if (simulateError.value) {
    throw new Error('模拟后端网关异常 (502 Bad Gateway)');
  }

  if (simulateEmpty.value) {
    return {
      list: [],
      total: 0,
    };
  }

  let filtered = [...mockDatabase];

  if (params.keyword?.trim()) {
    const kw = params.keyword.trim().toLowerCase();
    filtered = filtered.filter(item => item.name.toLowerCase().includes(kw));
  }

  if (params.role) {
    filtered = filtered.filter(item => item.role === params.role);
  }

  const pageNum = params.pageNum ?? 1;
  const pageSize = params.pageSize ?? 5;
  const start = (pageNum - 1) * pageSize;
  const pagedList = filtered.slice(start, start + pageSize);

  return {
    list: pagedList,
    total: filtered.length,
  };
};

// 搜索栏本地表单响应式状态
const searchForm = ref<{ keyword: string; role: string }>({
  keyword: '',
  role: '',
});

// 初始化 usePagination 状态机
const pagination = usePagination<MemberItem, MemberQuery>(fetchMembers, {
  defaultPageNum: 1,
  defaultPageSize: 5,
  defaultParams: {
    keyword: '',
    role: '',
  },
});

// 动作触发方法
const handleSearch = () => {
  simulateEmpty.value = false;
  simulateError.value = false;
  pagination.search({
    keyword: searchForm.value.keyword,
    role: searchForm.value.role || undefined,
  });
};

const handleReset = () => {
  searchForm.value = { keyword: '', role: '' };
  simulateEmpty.value = false;
  simulateError.value = false;
  pagination.reset();
};

const handlePageSizeChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  pagination.changePageSize(Number(target.value));
};

const triggerSimulateEmpty = () => {
  simulateEmpty.value = true;
  simulateError.value = false;
  pagination.refresh();
};

const triggerSimulateError = () => {
  simulateError.value = true;
  pagination.refresh();
};

const restoreNormal = () => {
  simulateEmpty.value = false;
  simulateError.value = false;
  pagination.refresh();
};
</script>

<template>
  <section class="card">
    <h2>4. 契约分页状态机自验 (usePagination)</h2>
    <p class="desc">
      双向绑定标准
      <code>PageQuery</code>
      入参与
      <code>PageResult</code>
      响应实体。支持四维原子动作（翻页、切条数、搜索、重置），且搜索与切条数自动归 1
      页；空数据与异常时
      <code>list</code> 100% 保底空数组 <code>[]</code>。
    </p>

    <!-- 搜索表单 -->
    <div class="search-bar">
      <div class="form-item">
        <label>员工姓名关键字:</label>
        <input
          v-model="searchForm.keyword"
          type="text"
          placeholder="输入员工关键字..."
          class="input-sm"
          @keyup.enter="handleSearch"
        />
      </div>
      <div class="form-item">
        <label>岗位角色:</label>
        <select v-model="searchForm.role" class="select-sm">
          <option value="">全部角色</option>
          <option value="DEVELOPER">DEVELOPER (研发)</option>
          <option value="DESIGNER">DESIGNER (设计)</option>
          <option value="PRODUCT_MANAGER">PRODUCT_MANAGER (产品)</option>
          <option value="TESTER">TESTER (测试)</option>
        </select>
      </div>
      <div class="form-actions">
        <button class="btn btn-sm" :disabled="pagination.loading.value" @click="handleSearch">
          搜索 (search 归1页)
        </button>
        <button
          class="btn btn-secondary btn-sm"
          :disabled="pagination.loading.value"
          @click="handleReset"
        >
          重置 (reset 归1页)
        </button>
      </div>
    </div>

    <!-- 异常与空安全对抗性测试触发器 -->
    <div class="adversarial-bar">
      <span class="bar-title">空安全与异常对抗自测:</span>
      <button class="btn btn-outline btn-xs" @click="triggerSimulateEmpty">
        模拟空数据返回 (list: [])
      </button>
      <button class="btn btn-outline btn-xs btn-danger" @click="triggerSimulateError">
        模拟接口报错 (502 异常)
      </button>
      <button
        v-if="simulateEmpty || simulateError"
        class="btn btn-outline btn-xs btn-success"
        @click="restoreNormal"
      >
        恢复正常查询
      </button>
    </div>

    <!-- 状态指示条 -->
    <div class="meta-bar">
      <div class="meta-item">
        状态机:
        <span :class="['status-tag', pagination.loading.value ? 'status-active' : 'status-idle']">
          {{ pagination.loading.value ? 'Loading (查询中...)' : 'Idle (就绪)' }}
        </span>
      </div>
      <div class="meta-item">
        异常状态:
        <span :class="['status-tag', pagination.error.value ? 'status-error' : 'status-idle']">
          {{ pagination.error.value ? String(pagination.error.value) : '无异常' }}
        </span>
      </div>
      <div class="meta-item">
        当前页码 (只读): <strong>{{ pagination.pageNum.value }}</strong>
      </div>
      <div class="meta-item">
        每页条数 (只读): <strong>{{ pagination.pageSize.value }}</strong>
      </div>
      <div class="meta-item">
        匹配总数 (只读): <strong>{{ pagination.total.value }}</strong>
      </div>
    </div>

    <!-- 数据表格 -->
    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>姓名</th>
            <th>部门</th>
            <th>岗位角色</th>
            <th>账号状态</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in pagination.list.value" :key="item.id">
            <td>#{{ item.id }}</td>
            <td class="cell-strong">{{ item.name }}</td>
            <td>{{ item.department }}</td>
            <td>
              <span class="role-badge">{{ item.role }}</span>
            </td>
            <td>
              <span :class="['status-dot', item.status === 'ACTIVE' ? 'dot-active' : 'dot-locked']">
                {{ item.status === 'ACTIVE' ? '正常' : '锁定' }}
              </span>
            </td>
          </tr>
          <tr v-if="pagination.list.value.length === 0">
            <td colspan="5" class="empty-cell">
              {{
                pagination.loading.value
                  ? '数据加载中...'
                  : '暂无数据（空安全保证：list 为空数组 []）'
              }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 分页器操作栏 -->
    <div class="pagination-footer">
      <div class="page-size-selector">
        每页显示:
        <select :value="pagination.pageSize.value" class="select-sm" @change="handlePageSizeChange">
          <option :value="5">5 条/页</option>
          <option :value="10">10 条/页</option>
          <option :value="20">20 条/页</option>
        </select>
      </div>

      <div class="page-controls">
        <button
          class="btn btn-secondary btn-sm"
          :disabled="pagination.pageNum.value <= 1 || pagination.loading.value"
          @click="pagination.changePage(pagination.pageNum.value - 1)"
        >
          上一页 (changePage)
        </button>
        <span class="page-indicator">第 {{ pagination.pageNum.value }} 页</span>
        <button
          class="btn btn-secondary btn-sm"
          :disabled="
            pagination.pageNum.value * pagination.pageSize.value >= pagination.total.value ||
            pagination.loading.value
          "
          @click="pagination.changePage(pagination.pageNum.value + 1)"
        >
          下一页 (changePage)
        </button>
        <button
          class="btn btn-secondary btn-sm"
          :disabled="pagination.loading.value"
          @click="pagination.refresh()"
        >
          刷新 (refresh)
        </button>
      </div>
    </div>

    <!-- 最近一次请求参数诊断代码块 -->
    <div class="debug-panel">
      <span class="label">最近一次实际请求 PageQuery 实参 (只读 params):</span>
      <pre class="json-code-sm">{{
        JSON.stringify(pagination.params.value[0] || {}, null, 2)
      }}</pre>
    </div>
  </section>
</template>

<style scoped src="./pagination-demo.css"></style>
