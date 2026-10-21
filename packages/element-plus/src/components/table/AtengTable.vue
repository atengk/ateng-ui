<script setup lang="ts">
/**
 * 企业级分页表格核心容器组件。
 *
 * 核心特性：
 * 1. 渐进混合列架构：原生 <el-table-column> 插槽优先，挂载时动态递归解析 VNode 提取列元数据；
 * 2. 兼容 :columns="TableColumnConfig[]" 属性列动态渲染；
 * 3. 深度双轨绑定 @atengk/vue 的 usePagination 状态机（双向同步数据、加载态、分页器与列排序联动）；
 * 4. 统一集成 AtengEmpty 缺省态与网络异常重试机制，保留用户 #empty 插槽逃生门；
 * 5. $attrs 与 $slots 100% 透明透传至底层 ElTable；
 * 6. 建立与 AtengQueryForm 的 Provide/Inject 上下文联动。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { computed, shallowRef, useSlots, provide, type ComputedRef, type ShallowRef } from 'vue';
import {
  ElTable,
  ElTableColumn,
  ElPagination,
  ElButton,
  vLoading,
  type TableInstance,
} from 'element-plus';
import { AtengEmpty } from '../empty';
import { ATENG_TABLE_CONTEXT_KEY, type AtengTableContext } from '../shared/context';
import type {
  AtengTableProps,
  AtengTableEmits,
  AtengTableSlots,
  AtengTableExpose,
  TableColumnConfig,
} from './types';
import { parseColumnVNodes } from './utils/vnode';

defineOptions({
  name: 'AtengTable',
  inheritAttrs: false,
});

const props = withDefaults(defineProps<AtengTableProps>(), {
  data: () => [],
  pagination: undefined,
  columns: () => [],
  rowKey: 'id',
  border: true,
  stripe: false,
  density: 'default',
  tools: true,
  storageKey: undefined,
  loading: false,
  total: undefined,
  pageNum: undefined,
  pageSize: undefined,
  pageSizes: () => [10, 20, 50, 100],
  paginationLayout: 'total, sizes, prev, pager, next, jumper',
  showPagination: undefined,
  error: undefined,
  emptyDescription: undefined,
  errorDescription: undefined,
  customClass: '',
});

const emit = defineEmits<AtengTableEmits>();
defineSlots<AtengTableSlots>();

// 1. 数据源、Loading 与异常状态解析
const tableData = computed<Record<string, unknown>[]>(() => {
  if (props.pagination) {
    return (props.pagination.list.value ?? []) as Record<string, unknown>[];
  }
  return (props.data ?? []) as Record<string, unknown>[];
});

const isLoading = computed<boolean>(() => {
  if (props.pagination) {
    return Boolean(props.pagination.loading.value);
  }
  return Boolean(props.loading);
});

const hasError = computed<boolean>(() => {
  if (props.pagination) {
    return Boolean(props.pagination.error.value);
  }
  return Boolean(props.error);
});

// 2. 底部分页状态与联动
const currentPage = computed<number>(() => {
  if (props.pagination) {
    return props.pagination.pageNum.value;
  }
  return props.pageNum ?? 1;
});

const currentPageSize = computed<number>(() => {
  if (props.pagination) {
    return props.pagination.pageSize.value;
  }
  return props.pageSize ?? 10;
});

const currentTotal = computed<number>(() => {
  if (props.pagination) {
    return props.pagination.total.value ?? 0;
  }
  return props.total ?? 0;
});

const shouldShowPagination = computed<boolean>(() => {
  if (props.showPagination !== undefined) {
    return props.showPagination;
  }
  return props.pagination !== undefined || props.total !== undefined;
});

const handleCurrentChange = async (val: number) => {
  emit('update:pageNum', val);
  emit('page-change', val);
  emit('pagination-change', { pageNum: val, pageSize: currentPageSize.value });
  if (props.pagination) {
    await props.pagination.changePage(val);
  }
};

const handleSizeChange = async (val: number) => {
  emit('update:pageSize', val);
  emit('size-change', val);
  emit('pagination-change', { pageNum: currentPage.value, pageSize: val });
  if (props.pagination) {
    await props.pagination.changePageSize(val);
  }
};

// 3. 服务端排序联动解析
const handleSortChange = async (data: { column: unknown; prop: string; order: string | null }) => {
  emit('sort-change', data);

  if (props.pagination) {
    let asc: boolean | undefined = undefined;
    let field: string | undefined = undefined;

    if (data.order === 'ascending') {
      asc = true;
      field = data.prop;
    } else if (data.order === 'descending') {
      asc = false;
      field = data.prop;
    } else {
      asc = undefined;
      field = undefined;
    }

    await props.pagination.changeSort(field, asc);
  }
};

// 4. 渐进混合列元数据解析
const slots = useSlots();

const parsedSlotColumns = computed<TableColumnConfig[]>(() => {
  const defaultSlot = slots.default ? slots.default() : [];
  return parseColumnVNodes(defaultSlot);
});

const allColumns = computed<TableColumnConfig[]>(() => {
  return [...(props.columns ?? []), ...parsedSlotColumns.value];
});

// 5. 表格实例与核心门面
const tableRef = shallowRef<TableInstance>() as ShallowRef<TableInstance | undefined>;

const clearSelection = () => {
  tableRef.value?.clearSelection();
};

const toggleRowSelection = (row: Record<string, unknown>, selected?: boolean) => {
  tableRef.value?.toggleRowSelection(row, selected);
};

const getSelectionRows = (): Record<string, unknown>[] => {
  return (tableRef.value?.getSelectionRows() ?? []) as Record<string, unknown>[];
};

const handleRefresh = async () => {
  emit('refresh');
  if (props.pagination) {
    await props.pagination.refresh();
  }
};

// 6. 上下文 Provide 注入（支持 AtengQueryForm 嵌套自动调度）
const tableContext: AtengTableContext = {
  search: async params => {
    if (props.pagination) {
      await props.pagination.search(params);
    }
  },
  reset: async () => {
    if (props.pagination) {
      await props.pagination.reset();
    }
  },
  loading: isLoading,
};

provide(ATENG_TABLE_CONTEXT_KEY, tableContext);

// 7. 显式暴露实例能力
defineExpose<AtengTableExpose>({
  tableRef,
  columns: allColumns as ComputedRef<TableColumnConfig[]>,
  clearSelection,
  toggleRowSelection: toggleRowSelection as (row: unknown, selected?: boolean) => void,
  getSelectionRows: getSelectionRows as () => unknown[],
  refresh: handleRefresh,
});
</script>

<template>
  <div :class="['at-table', `at-table--${density}`, customClass]">
    <!-- 顶部高级搜索表单插槽 -->
    <div v-if="$slots.query" class="at-table__query">
      <slot name="query" />
    </div>

    <!-- 表格主体容器 -->
    <div class="at-table__main">
      <el-table
        ref="tableRef"
        v-loading="isLoading"
        v-bind="$attrs"
        :data="tableData"
        :row-key="rowKey"
        :border="border"
        :stripe="stripe"
        class="at-table__inner"
        @selection-change="
          (selection: unknown[]) => emit('selection-change', selection as Record<string, unknown>[])
        "
        @sort-change="handleSortChange"
      >
        <!-- 属性列合并渲染 -->
        <template v-for="col in columns" :key="col.prop || col.label">
          <el-table-column v-if="col.visible !== false" v-bind="col" />
        </template>

        <!-- 原生默认插槽列渲染 -->
        <slot />

        <!-- 底部追加插槽透传 -->
        <template v-if="$slots.append" #append>
          <slot name="append" />
        </template>

        <!-- 空数据与异常状态插槽透传 -->
        <template #empty>
          <slot v-if="$slots.empty" name="empty" />
          <template v-else-if="!isLoading && tableData.length === 0">
            <AtengEmpty v-if="hasError" status="network-error" :description="errorDescription">
              <el-button type="primary" :loading="isLoading" @click="handleRefresh">
                点击重试
              </el-button>
            </AtengEmpty>
            <AtengEmpty v-else status="empty" :description="emptyDescription" />
          </template>
        </template>
      </el-table>
    </div>

    <!-- 表格底部分页区域 -->
    <div v-if="shouldShowPagination" class="at-table__pagination">
      <slot name="pagination">
        <el-pagination
          :current-page="currentPage"
          :page-size="currentPageSize"
          :total="currentTotal"
          :page-sizes="pageSizes"
          :layout="paginationLayout"
          :disabled="isLoading"
          background
          @current-change="handleCurrentChange"
          @size-change="handleSizeChange"
        />
      </slot>
    </div>
  </div>
</template>

<style scoped lang="scss">
.at-table {
  width: 100%;
  background-color: var(--el-bg-color);
  box-sizing: border-box;

  &__query {
    margin-bottom: 0;
  }

  &__main {
    width: 100%;
    position: relative;
  }

  &__inner {
    width: 100%;
  }

  &__pagination {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    padding: 12px 0 0 0;
    box-sizing: border-box;
  }

  // 密度变体
  &--large {
    :deep(.el-table__cell) {
      padding: 12px 0;
    }
  }

  &--default {
    :deep(.el-table__cell) {
      padding: 8px 0;
    }
  }

  &--small {
    :deep(.el-table__cell) {
      padding: 4px 0;
    }
  }
}
</style>
