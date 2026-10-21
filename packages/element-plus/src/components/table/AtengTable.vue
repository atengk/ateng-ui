<script setup lang="ts">
/**
 * 企业级分页表格核心容器组件。
 *
 * 核心特性：
 * 1. 渐进混合列架构：原生 <el-table-column> 插槽优先，挂载时动态递归解析 VNode 提取列元数据；
 * 2. 兼容 :columns="TableColumnConfig[]" 属性列动态渲染；
 * 3. $attrs 与 $slots 100% 透明透传至底层 ElTable；
 * 4. 建立与 AtengQueryForm 的 Provide/Inject 上下文联动。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { computed, shallowRef, useSlots, provide, type ComputedRef, type ShallowRef } from 'vue';
import { ElTable, ElTableColumn, vLoading, type TableInstance } from 'element-plus';
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
  customClass: '',
});

const emit = defineEmits<AtengTableEmits>();
defineSlots<AtengTableSlots>();

// 1. 数据源与 Loading 状态解析
const tableData = computed<Record<string, unknown>[]>(() => {
  if (props.pagination) {
    return (props.pagination.list.value ?? []) as Record<string, unknown>[];
  }
  return (props.data ?? []) as Record<string, unknown>[];
});

const isLoading = computed<boolean>(() => {
  if (props.pagination) {
    return props.pagination.loading.value ?? false;
  }
  return props.loading ?? false;
});

// 2. 渐进混合列元数据解析
const slots = useSlots();

const parsedSlotColumns = computed<TableColumnConfig[]>(() => {
  const defaultSlot = slots.default ? slots.default() : [];
  return parseColumnVNodes(defaultSlot);
});

const allColumns = computed<TableColumnConfig[]>(() => {
  return [...(props.columns ?? []), ...parsedSlotColumns.value];
});

// 3. 表格实例与核心门面
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

// 4. 上下文 Provide 注入（支持 AtengQueryForm 嵌套自动调度）
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

// 5. 显式暴露实例能力
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
        @sort-change="
          (data: { column: unknown; prop: string; order: string | null }) =>
            emit('sort-change', data)
        "
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

        <!-- 空数据插槽透传 -->
        <template v-if="$slots.empty" #empty>
          <slot name="empty" />
        </template>
      </el-table>
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
