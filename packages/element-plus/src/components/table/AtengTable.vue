<script setup lang="ts">
/**
 * 企业级分页表格核心容器组件。
 *
 * 核心特性：
 * 1. 渐进混合列架构：原生 <el-table-column> 插槽优先，挂载时动态递归解析 VNode 提取列元数据；
 * 2. 兼容 :columns="TableColumnConfig[]" 属性列动态渲染；
 * 3. 企业级工具栏套件：支持刷新、三级密度切换、斑马纹开关、全屏沉浸放大与列配置浮层；
 * 4. 列配置 Popover 与持久化：支持列显隐管理、全选/半选、重置以及基于 storageKey 的本地持久化；
 * 5. 深度双轨绑定 @atengk/vue 的 usePagination 状态机；
 * 6. 统一集成 AtengEmpty 缺省态与网络异常重试机制，保留用户 #empty 插槽逃生门；
 * 7. $attrs 与 $slots 100% 透明透传至底层 ElTable；
 * 8. 建立与 AtengQueryForm 的 Provide/Inject 上下文联动。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import {
  computed,
  ref,
  shallowRef,
  watch,
  onMounted,
  onUnmounted,
  useSlots,
  provide,
  type ComputedRef,
  type ShallowRef,
} from 'vue';
import {
  ElTable,
  ElTableColumn,
  ElPagination,
  ElButton,
  ElDropdown,
  ElDropdownMenu,
  ElDropdownItem,
  ElTooltip,
  ElPopover,
  ElCheckbox,
  vLoading,
  type TableInstance,
} from 'element-plus';
import { AtengEmpty } from '../empty';
import {
  IconRefresh,
  IconDensity,
  IconStripe,
  IconFullscreen,
  IconFullscreenExit,
  IconColumnSetting,
} from './icons';
import { ATENG_TABLE_CONTEXT_KEY, type AtengTableContext } from '../shared/context';
import type {
  AtengTableProps,
  AtengTableEmits,
  AtengTableSlots,
  AtengTableExpose,
  TableColumnConfig,
  TableDensity,
  TableToolItem,
} from './types';
import { parseColumnVNodes, filterColumnVNodes } from './utils/vnode';

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
const slots = useSlots();
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

// 4. 工具栏状态管理（密度、斑马纹、全屏）
const internalDensity = ref<TableDensity>(props.density);
watch(
  () => props.density,
  val => {
    internalDensity.value = val;
  },
);
const currentDensity = computed<TableDensity>(() => internalDensity.value);

const handleDensityCommand = (command: string | number | object) => {
  const densityVal = command as TableDensity;
  internalDensity.value = densityVal;
  emit('update:density', densityVal);
};

const internalStripe = ref<boolean>(props.stripe);
watch(
  () => props.stripe,
  val => {
    internalStripe.value = val;
  },
);
const currentStripe = computed<boolean>(() => internalStripe.value);

const toggleStripe = () => {
  const nextVal = !currentStripe.value;
  internalStripe.value = nextVal;
  emit('update:stripe', nextVal);
};

const isFullscreen = ref<boolean>(false);
const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value;
  emit('fullscreen-change', isFullscreen.value);
};

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && isFullscreen.value) {
    toggleFullscreen();
  }
};

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeydown);
  }
});

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleKeydown);
  }
});

// 原子工具项判断
const isToolEnabled = (tool: TableToolItem): boolean => {
  if (props.tools === false) return false;
  if (props.tools === true) return true;
  if (Array.isArray(props.tools)) return props.tools.includes(tool);
  return true;
};

const hasEnabledTools = computed<boolean>(() => {
  if (props.tools === false) return false;
  if (props.tools === true) return true;
  if (Array.isArray(props.tools)) return props.tools.length > 0;
  return false;
});

const shouldShowToolbar = computed<boolean>(() => {
  if (props.tools === false && !slots['toolbar-left'] && !slots['toolbar-right']) {
    return false;
  }
  return hasEnabledTools.value || Boolean(slots['toolbar-left']) || Boolean(slots['toolbar-right']);
});

// 5. 列配置元数据解析与持久化
const getColumnKey = (col: TableColumnConfig): string => {
  return col.prop || col.label || (col.type ? String(col.type) : '');
};

const parsedSlotColumns = computed<TableColumnConfig[]>(() => {
  const defaultSlot = slots.default ? slots.default() : [];
  return parseColumnVNodes(defaultSlot);
});

const rawColumns = computed<TableColumnConfig[]>(() => {
  return [...(props.columns ?? []), ...parsedSlotColumns.value];
});

const columnSettings = ref<TableColumnConfig[]>([]);

const loadPersistedColumns = (): Record<string, boolean> | null => {
  if (!props.storageKey || typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(props.storageKey);
    if (!raw) return null;
    return JSON.parse(raw) as Record<string, boolean>;
  } catch {
    return null;
  }
};

const savePersistedColumns = () => {
  if (!props.storageKey || typeof window === 'undefined') return;
  try {
    const map: Record<string, boolean> = {};
    for (const col of columnSettings.value) {
      const key = getColumnKey(col);
      if (key) {
        map[key] = col.visible !== false;
      }
    }
    localStorage.setItem(props.storageKey, JSON.stringify(map));
  } catch {
    // 弹性防御
  }
};

const initColumnSettings = () => {
  const persisted = loadPersistedColumns();
  columnSettings.value = rawColumns.value.map(col => {
    const key = getColumnKey(col);
    const visible = persisted && key in persisted ? persisted[key] : col.visible !== false;
    return { ...col, visible };
  });
};

watch(
  rawColumns,
  () => {
    initColumnSettings();
  },
  { immediate: true },
);

const handleColumnVisibilityChange = () => {
  savePersistedColumns();
  emit('columns-change', columnSettings.value);
};

const handleResetColumns = () => {
  if (props.storageKey && typeof window !== 'undefined') {
    try {
      localStorage.removeItem(props.storageKey);
    } catch {
      // 弹性防御
    }
  }
  columnSettings.value = rawColumns.value.map(col => ({
    ...col,
    visible: col.visible !== false,
  }));
  emit('columns-change', columnSettings.value);
};

const totalColumnCount = computed(() => columnSettings.value.length);
const visibleColumnCount = computed(
  () => columnSettings.value.filter(col => col.visible !== false).length,
);
const isAllColumnsVisible = computed(
  () => totalColumnCount.value > 0 && visibleColumnCount.value === totalColumnCount.value,
);
const isColumnIndeterminate = computed(
  () => visibleColumnCount.value > 0 && visibleColumnCount.value < totalColumnCount.value,
);

const handleToggleAllColumns = (val: string | number | boolean) => {
  const isVisible = Boolean(val);
  columnSettings.value = columnSettings.value.map(col => ({
    ...col,
    visible: isVisible,
  }));
  savePersistedColumns();
  emit('columns-change', columnSettings.value);
};

// 动态过滤可见属性列
const activeAttributeColumns = computed<TableColumnConfig[]>(() => {
  const stateMap = new Map<string, boolean>();
  for (const item of columnSettings.value) {
    const k = getColumnKey(item);
    if (k) stateMap.set(k, item.visible !== false);
  }
  return (props.columns ?? []).filter(col => {
    const k = getColumnKey(col);
    return !k || stateMap.get(k) !== false;
  });
});

// 动态过滤插槽列
const renderFilteredSlotColumns = () => {
  if (!slots.default) return [];
  const defaultNodes = slots.default();
  const stateMap = new Map<string, boolean>();
  for (const item of columnSettings.value) {
    const k = getColumnKey(item);
    if (k) stateMap.set(k, item.visible !== false);
  }
  return filterColumnVNodes(defaultNodes, stateMap);
};

// 6. 表格实例与核心门面
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

// 7. 上下文 Provide 注入（支持 AtengQueryForm 嵌套自动调度）
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

// 8. 显式暴露实例能力
defineExpose<AtengTableExpose>({
  tableRef,
  columns: columnSettings as ComputedRef<TableColumnConfig[]>,
  clearSelection,
  toggleRowSelection: toggleRowSelection as (row: unknown, selected?: boolean) => void,
  getSelectionRows: getSelectionRows as () => unknown[],
  refresh: handleRefresh,
});
</script>

<template>
  <div
    :class="[
      'at-table',
      `at-table--${currentDensity}`,
      isFullscreen && 'at-table--fullscreen',
      customClass,
    ]"
  >
    <!-- 顶部高级搜索表单插槽 -->
    <div v-if="$slots.query" class="at-table__query">
      <slot name="query" />
    </div>

    <!-- 企业级工具栏区域 -->
    <div v-if="shouldShowToolbar" class="at-table__toolbar">
      <!-- 左侧操作插槽 -->
      <div class="at-table__toolbar-left">
        <slot name="toolbar-left" />
      </div>

      <!-- 右侧自定义与原子工具区 -->
      <div class="at-table__toolbar-right">
        <slot name="toolbar-right" />

        <div v-if="hasEnabledTools" class="at-table__tools">
          <!-- 1. 刷新 -->
          <el-tooltip v-if="isToolEnabled('refresh')" content="刷新" placement="top">
            <button
              type="button"
              class="at-table__tool-btn"
              :class="{ 'is-loading': isLoading }"
              :disabled="isLoading"
              aria-label="刷新"
              @click="handleRefresh"
            >
              <IconRefresh />
            </button>
          </el-tooltip>

          <!-- 2. 密度 -->
          <el-dropdown
            v-if="isToolEnabled('density')"
            trigger="click"
            @command="handleDensityCommand"
          >
            <div>
              <el-tooltip content="密度" placement="top">
                <button type="button" class="at-table__tool-btn" aria-label="密度">
                  <IconDensity />
                </button>
              </el-tooltip>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item
                  command="large"
                  :class="{ 'is-active': currentDensity === 'large' }"
                >
                  宽松
                </el-dropdown-item>
                <el-dropdown-item
                  command="default"
                  :class="{ 'is-active': currentDensity === 'default' }"
                >
                  默认
                </el-dropdown-item>
                <el-dropdown-item
                  command="small"
                  :class="{ 'is-active': currentDensity === 'small' }"
                >
                  紧凑
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>

          <!-- 3. 斑马纹 -->
          <el-tooltip v-if="isToolEnabled('stripe')" content="斑马纹" placement="top">
            <button
              type="button"
              class="at-table__tool-btn"
              :class="{ 'is-active': currentStripe }"
              aria-label="斑马纹"
              @click="toggleStripe"
            >
              <IconStripe />
            </button>
          </el-tooltip>

          <!-- 4. 全屏 -->
          <el-tooltip
            v-if="isToolEnabled('fullscreen')"
            :content="isFullscreen ? '还原' : '全屏'"
            placement="top"
          >
            <button
              type="button"
              class="at-table__tool-btn"
              :class="{ 'is-active': isFullscreen }"
              :aria-label="isFullscreen ? '还原' : '全屏'"
              @click="toggleFullscreen"
            >
              <IconFullscreenExit v-if="isFullscreen" />
              <IconFullscreen v-else />
            </button>
          </el-tooltip>

          <!-- 5. 列设置 Popover -->
          <el-popover
            v-if="isToolEnabled('column-setting')"
            trigger="click"
            placement="bottom-end"
            :width="220"
          >
            <template #reference>
              <div>
                <el-tooltip content="列设置" placement="top">
                  <button type="button" class="at-table__tool-btn" aria-label="列设置">
                    <IconColumnSetting />
                  </button>
                </el-tooltip>
              </div>
            </template>

            <div class="at-table-column-setting">
              <div class="at-table-column-setting__header">
                <el-checkbox
                  :model-value="isAllColumnsVisible"
                  :indeterminate="isColumnIndeterminate"
                  @change="handleToggleAllColumns"
                >
                  列展示 ({{ visibleColumnCount }}/{{ totalColumnCount }})
                </el-checkbox>
                <el-button link type="primary" size="small" @click="handleResetColumns">
                  重置
                </el-button>
              </div>
              <div class="at-table-column-setting__divider" />
              <div class="at-table-column-setting__list">
                <div
                  v-for="item in columnSettings"
                  :key="item.prop || item.label || item.type"
                  class="at-table-column-setting__item"
                >
                  <el-checkbox
                    v-model="item.visible"
                    :label="item.label || item.prop || item.type"
                    @change="handleColumnVisibilityChange"
                  />
                </div>
              </div>
            </div>
          </el-popover>
        </div>
      </div>
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
        :stripe="currentStripe"
        class="at-table__inner"
        @selection-change="
          (selection: unknown[]) => emit('selection-change', selection as Record<string, unknown>[])
        "
        @sort-change="handleSortChange"
      >
        <!-- 属性列合并渲染 -->
        <template v-for="col in activeAttributeColumns" :key="col.prop || col.label">
          <el-table-column v-bind="col" />
        </template>

        <!-- 原生默认插槽列渲染 -->
        <component :is="renderFilteredSlotColumns" />

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

  &__toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    box-sizing: border-box;

    &-left {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    &-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }
  }

  &__tools {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__tool-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: 1px solid var(--el-border-color);
    background-color: var(--el-bg-color);
    color: var(--el-text-color-regular);
    border-radius: var(--el-border-radius-base);
    cursor: pointer;
    outline: none;
    transition: all 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);

    &:hover {
      color: var(--el-color-primary);
      border-color: var(--el-color-primary-light-7);
      background-color: var(--el-color-primary-light-9);
    }

    &.is-active {
      color: var(--el-color-primary);
      border-color: var(--el-color-primary);
      background-color: var(--el-color-primary-light-9);
    }

    &.is-disabled,
    &:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }

    svg {
      width: 16px;
      height: 16px;
      fill: currentColor;
    }
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

  // 全屏变体
  &--fullscreen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 2000;
    background-color: var(--el-bg-color);
    padding: 16px;
    overflow: auto;
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

// 列设置面板样式
.at-table-column-setting {
  padding: 4px 0;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 4px 8px 4px;
  }

  &__divider {
    height: 1px;
    background-color: var(--el-border-color-lighter);
    margin-bottom: 8px;
  }

  &__list {
    max-height: 240px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__item {
    display: flex;
    align-items: center;
    padding: 2px 4px;
    border-radius: var(--el-border-radius-small);

    &:hover {
      background-color: var(--el-fill-color-light);
    }
  }
}
</style>
