<script setup lang="ts" generic="T extends Record<string, unknown> = Record<string, unknown>">
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
 * 8. 建立与 AtengQueryForm 的 Provide/Inject 上下文联动；
 * 9. Vue 3.5 SFC 原生泛型 <T> 强类型打通。
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
  nextTick,
  useSlots,
  provide,
  toValue,
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
import { useSelection, type UseSelectionResult } from '@atengk/vue';
import type {
  AtengTableProps,
  AtengTableEmits,
  AtengTableSlots,
  AtengTableExpose,
  TableColumnConfig,
  TableDensity,
  TableToolItem,
} from './types';
import { parseColumnVNodes, filterAndSortColumnVNodes } from './utils/vnode';

defineOptions({
  name: 'AtengTable',
  inheritAttrs: false,
});

const props = withDefaults(defineProps<AtengTableProps<T>>(), {
  data: () => [] as T[],
  pagination: undefined,
  columns: () => [],
  rowKey: 'id',
  border: true,
  stripe: false,
  density: 'default',
  tools: true,
  storageKey: undefined,
  enableColumnResize: true,
  minResizeWidth: 40,
  autoHeight: false,
  loading: false,
  total: undefined,
  pageNum: undefined,
  pageSize: undefined,
  pageSizes: () => [10, 20, 50, 100],
  paginationLayout: 'total, sizes, prev, pager, next, jumper',
  showPagination: undefined,
  showBatchBar: true,
  reserveSelection: false,
  selection: undefined,
  selectedKeys: undefined,
  selectedRows: undefined,
  error: undefined,
  emptyDescription: undefined,
  searchEmptyDescription: undefined,
  errorDescription: undefined,
  customClass: '',
});

const emit = defineEmits<AtengTableEmits<T>>();
const slots = useSlots();
defineSlots<AtengTableSlots<T>>();

// 1. 数据源、Loading 与异常状态解析
const tableData = computed<T[]>(() => {
  if (props.pagination) {
    return (props.pagination.list.value ?? []) as T[];
  }
  return (props.data ?? []) as T[];
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
  if (props.autoHeight) {
    attachAutoHeightObserver();
  }
});

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleKeydown);
  }
  detachAutoHeightObserver();
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

interface PersistedColumnConfig {
  order?: string[];
  visible?: Record<string, boolean>;
  widths?: Record<string, number>;
}

const loadPersistedColumns = (): PersistedColumnConfig | null => {
  if (!props.storageKey || typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(props.storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      if ('visible' in parsed || 'widths' in parsed || 'order' in parsed) {
        return parsed as PersistedColumnConfig;
      }
      return { visible: parsed as Record<string, boolean> };
    }
    return null;
  } catch {
    return null;
  }
};

const customWidths = ref<Record<string, number>>({});

const savePersistedColumns = () => {
  if (!props.storageKey || typeof window === 'undefined') return;
  try {
    const visibleMap: Record<string, boolean> = {};
    const orderList: string[] = [];
    for (const col of columnSettings.value) {
      const key = getColumnKey(col);
      if (key) {
        orderList.push(key);
        visibleMap[key] = col.visible !== false;
      }
    }
    localStorage.setItem(
      props.storageKey,
      JSON.stringify({ order: orderList, visible: visibleMap, widths: customWidths.value }),
    );
  } catch {
    // 弹性防御
  }
};

const resolveColumnProps = (
  col: TableColumnConfig,
  persisted: PersistedColumnConfig | null,
): { visible: boolean; width: string | number | undefined } => {
  const key = getColumnKey(col);
  const visible =
    persisted?.visible && key && key in persisted.visible
      ? persisted.visible[key]
      : col.visible !== false;
  const width =
    persisted?.widths && key && key in persisted.widths ? persisted.widths[key] : col.width;
  return { visible, width };
};

const initColumnSettings = () => {
  const persisted = loadPersistedColumns();
  customWidths.value = persisted?.widths ? { ...persisted.widths } : {};
  const rawList = rawColumns.value;

  if (persisted?.order && Array.isArray(persisted.order)) {
    const sorted: TableColumnConfig[] = [];
    const rawMap = new Map<string, TableColumnConfig>();
    for (const col of rawList) {
      rawMap.set(getColumnKey(col), col);
    }
    for (const key of persisted.order) {
      const col = rawMap.get(key);
      if (col) {
        const { visible, width } = resolveColumnProps(col, persisted);
        sorted.push({ ...col, visible, width });
        rawMap.delete(key);
      }
    }
    for (const col of rawMap.values()) {
      const { visible, width } = resolveColumnProps(col, persisted);
      sorted.push({ ...col, visible, width });
    }
    columnSettings.value = sorted;
  } else {
    columnSettings.value = rawList.map(col => {
      const { visible, width } = resolveColumnProps(col, persisted);
      return { ...col, visible, width };
    });
  }
};

// 列配置纯原生 HTML5 拖拽排序
let draggedColumnIndex: number | null = null;

const onColumnDragStart = (e: DragEvent, index: number) => {
  draggedColumnIndex = index;
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  }
};

const onColumnDragOver = (e: DragEvent, _index: number) => {
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move';
  }
};

const onColumnDrop = (_e: DragEvent, targetIndex: number) => {
  if (draggedColumnIndex === null || draggedColumnIndex === targetIndex) {
    draggedColumnIndex = null;
    return;
  }
  const itemToMove = columnSettings.value.splice(draggedColumnIndex, 1)[0];
  columnSettings.value.splice(targetIndex, 0, itemToMove);
  draggedColumnIndex = null;
  savePersistedColumns();
  emit('columns-change', columnSettings.value);
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
  customWidths.value = {};
  columnSettings.value = rawColumns.value.map(col => ({
    ...col,
    visible: col.visible !== false,
    width: col.width,
  }));
  emit('columns-change', columnSettings.value);
};

const onHeaderDragend = (
  newWidth: number,
  oldWidth: number,
  column: {
    property?: string;
    label?: string;
    type?: string;
    width?: number;
    [key: string]: unknown;
  },
  event: MouseEvent,
) => {
  if (props.enableColumnResize === false) return;
  const key = column?.property || column?.label || column?.type;
  if (!key) return;

  const minWidth = props.minResizeWidth ?? 40;
  const safeWidth = Math.max(minWidth, Math.round(newWidth));

  // 1. 同步修正 ElTable 内部 column 实例的 width，防止 DOM/内部状态塌陷
  if (column && typeof column === 'object') {
    column.width = safeWidth;
  }

  // 2. 记录自定义列宽并更新本地列配置
  customWidths.value[key] = safeWidth;
  const targetCol = columnSettings.value.find(col => getColumnKey(col) === key);
  if (targetCol) {
    targetCol.width = safeWidth;
  }

  // 3. 本地存储持久化并触发专有 header-dragend 事件
  savePersistedColumns();

  emit('header-dragend', safeWidth, oldWidth, column, event);
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
  const orderMap = new Map<string, number>();
  const widthMap = new Map<string, string | number>();
  columnSettings.value.forEach((item, idx) => {
    const k = getColumnKey(item);
    if (k) {
      stateMap.set(k, item.visible !== false);
      orderMap.set(k, idx);
      if (item.width !== undefined) {
        widthMap.set(k, item.width);
      }
    }
  });
  return (props.columns ?? [])
    .filter(col => {
      const k = getColumnKey(col);
      return !k || stateMap.get(k) !== false;
    })
    .map(col => {
      const k = getColumnKey(col);
      const width = k && widthMap.has(k) ? widthMap.get(k) : col.width;
      const resizable = col.resizable ?? props.enableColumnResize;
      const reserveSelection =
        col.type === 'selection'
          ? (col.reserveSelection ?? col['reserve-selection'] ?? Boolean(props.reserveSelection))
          : undefined;
      return {
        ...col,
        width,
        resizable,
        ...(reserveSelection !== undefined
          ? { reserveSelection, 'reserve-selection': reserveSelection }
          : {}),
      };
    })
    .sort((a, b) => {
      const kA = getColumnKey(a);
      const kB = getColumnKey(b);
      const idxA = kA && orderMap.has(kA) ? (orderMap.get(kA) ?? 9999) : 9999;
      const idxB = kB && orderMap.has(kB) ? (orderMap.get(kB) ?? 9999) : 9999;
      return idxA - idxB;
    });
});

// 动态过滤与排序列插槽
const renderFilteredSlotColumns = () => {
  if (!slots.default) return [];
  const defaultNodes = slots.default();
  const stateMap = new Map<string, boolean>();
  const orderList: string[] = [];
  const widthMap = new Map<string, string | number>();
  for (const item of columnSettings.value) {
    const k = getColumnKey(item);
    if (k) {
      stateMap.set(k, item.visible !== false);
      orderList.push(k);
      if (item.width !== undefined) {
        widthMap.set(k, item.width);
      }
    }
  }
  return filterAndSortColumnVNodes(defaultNodes, {
    visibilityMap: stateMap,
    orderList,
    widthMap,
    resizable: props.enableColumnResize,
  });
};

// 视口高度自适应状态与监听器
const tableRootRef = ref<HTMLElement | null>(null);
const calculatedHeight = ref<number | undefined>(undefined);
let resizeObserver: ResizeObserver | null = null;

function updateAutoHeight(): void {
  if (!props.autoHeight || typeof window === 'undefined' || !tableRootRef.value) {
    return;
  }
  const rect = tableRootRef.value.getBoundingClientRect();
  const bottomOffset = typeof props.autoHeight === 'number' ? props.autoHeight : 32;
  const availableHeight = Math.max(150, Math.floor(window.innerHeight - rect.top - bottomOffset));
  calculatedHeight.value = availableHeight;
}

function detachAutoHeightObserver(): void {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateAutoHeight);
  }
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  calculatedHeight.value = undefined;
}

function attachAutoHeightObserver(): void {
  if (typeof window === 'undefined') return;
  detachAutoHeightObserver();
  if (!props.autoHeight) return;

  nextTick(() => {
    updateAutoHeight();
    if ('ResizeObserver' in window && tableRootRef.value) {
      resizeObserver = new ResizeObserver(() => {
        updateAutoHeight();
      });
      resizeObserver.observe(tableRootRef.value);
    }
    window.addEventListener('resize', updateAutoHeight);
  });
}

watch(
  () => props.autoHeight,
  newVal => {
    if (newVal) {
      attachAutoHeightObserver();
    } else {
      detachAutoHeightObserver();
    }
  },
);

const effectiveTableHeight = computed(() => {
  if (props.autoHeight && calculatedHeight.value) {
    return calculatedHeight.value;
  }
  return undefined;
});

// 6. 表格实例、跨页多选状态机与核心门面
const tableRef = shallowRef<TableInstance>() as ShallowRef<TableInstance | undefined>;

const fallbackSelectedRows = ref<T[]>([]);

// 跨页多选状态机编排
const internalSelection =
  props.reserveSelection && !props.selection
    ? useSelection<T>({
        rowKey: props.rowKey as string | ((item: T) => string | number | bigint),
        initialSelected: props.selectedRows,
      })
    : undefined;

const effectiveSelection = computed<UseSelectionResult<T> | undefined>(() => {
  return props.selection ?? internalSelection;
});

// 数据刷新时同步更新跨页缓存中的最新实体属性
watch(
  () => tableData.value,
  newData => {
    if (effectiveSelection.value && Array.isArray(newData)) {
      effectiveSelection.value.syncWithData(newData);
    }
  },
  { deep: true },
);

const selectedRows = computed<T[]>(() => {
  if (effectiveSelection.value) {
    return effectiveSelection.value.selectedRows.value;
  }
  return fallbackSelectedRows.value;
});

const selectedKeys = computed<string[]>(() => {
  if (effectiveSelection.value) {
    return effectiveSelection.value.selectedKeys.value;
  }
  return fallbackSelectedRows.value
    .map(row => {
      if (typeof props.rowKey === 'function') {
        return String(props.rowKey(row));
      }
      const k = (row as Record<string, unknown>)[props.rowKey || 'id'];
      return k !== undefined && k !== null ? String(k) : '';
    })
    .filter(Boolean);
});

const selectedCount = computed<number>(() => {
  if (effectiveSelection.value) {
    return effectiveSelection.value.selectedCount.value;
  }
  return fallbackSelectedRows.value.length;
});

const shouldShowBatchBar = computed<boolean>(() => {
  return props.showBatchBar !== false;
});

const handleSelectionChange = (selection: unknown[]) => {
  const currentSelection = (selection ?? []) as T[];
  if (effectiveSelection.value) {
    // 提取当前可见页的数据行的 Key 集合
    const currentTableKeys = new Set(
      tableData.value
        .map(row => {
          if (typeof props.rowKey === 'function') {
            return String(props.rowKey(row));
          }
          const k = (row as Record<string, unknown>)[props.rowKey || 'id'];
          return k !== undefined && k !== null ? String(k) : '';
        })
        .filter(Boolean),
    );

    // 当前选中的行中，属于当前可见页的 Key 集合
    const selectedCurrentKeys = new Set(
      currentSelection
        .map(row => {
          if (typeof props.rowKey === 'function') {
            return String(props.rowKey(row));
          }
          const k = (row as Record<string, unknown>)[props.rowKey || 'id'];
          return k !== undefined && k !== null ? String(k) : '';
        })
        .filter(Boolean),
    );

    // 1. 将本次选中的所有数据加入多选集合
    effectiveSelection.value.select(currentSelection);

    // 2. 当前页被用户手动取消勾选的项从状态机中移除
    const toDeselect: T[] = [];
    for (const item of tableData.value) {
      const k =
        typeof props.rowKey === 'function'
          ? String(props.rowKey(item))
          : String((item as Record<string, unknown>)[props.rowKey || 'id'] ?? '');
      if (
        k &&
        currentTableKeys.has(k) &&
        !selectedCurrentKeys.has(k) &&
        effectiveSelection.value.isKeySelected(k)
      ) {
        toDeselect.push(item);
      }
    }
    if (toDeselect.length > 0) {
      effectiveSelection.value.deselect(toDeselect);
    }

    emit('selection-change', effectiveSelection.value.selectedRows.value);
    emit('update:selectedRows', effectiveSelection.value.selectedRows.value);
    emit('update:selectedKeys', effectiveSelection.value.selectedKeys.value);
  } else {
    fallbackSelectedRows.value = currentSelection;
    emit('selection-change', fallbackSelectedRows.value);
    emit('update:selectedRows', fallbackSelectedRows.value);
    emit('update:selectedKeys', selectedKeys.value);
  }
};

const clearSelection = () => {
  tableRef.value?.clearSelection();
  if (effectiveSelection.value) {
    effectiveSelection.value.clear();
  }
  fallbackSelectedRows.value = [];
  emit('selection-change', []);
  emit('update:selectedRows', []);
  emit('update:selectedKeys', []);
};

const toggleRowSelection = (row: T, selected?: boolean) => {
  tableRef.value?.toggleRowSelection(row, selected);
  if (effectiveSelection.value) {
    if (selected === undefined) {
      effectiveSelection.value.toggle(row);
    } else if (selected) {
      effectiveSelection.value.select(row);
    } else {
      effectiveSelection.value.deselect(row);
    }
    emit('selection-change', effectiveSelection.value.selectedRows.value);
    emit('update:selectedRows', effectiveSelection.value.selectedRows.value);
    emit('update:selectedKeys', effectiveSelection.value.selectedKeys.value);
  }
};

const getSelectionRows = (): T[] => {
  if (effectiveSelection.value) {
    return effectiveSelection.value.selectedRows.value;
  }
  const elRows = tableRef.value?.getSelectionRows();
  if (Array.isArray(elRows) && elRows.length > 0) {
    return elRows as T[];
  }
  return fallbackSelectedRows.value;
};

const handleRefresh = async () => {
  emit('refresh');
  if (props.pagination) {
    await props.pagination.refresh();
  }
};

// 7. 搜索感知多态缺省态与上下文 Provide 注入（支持 AtengQueryForm 嵌套自动调度）
const internalQueryParams = ref<Record<string, unknown> | undefined>(undefined);
const registeredResetHandlers = new Set<() => void>();
const registeredQueryGetters = new Set<() => Record<string, unknown>>();
const queryGetterVersion = ref(0);

const PAGINATION_RESERVED_KEYS = ['pageNum', 'pageSize', 'sortField', 'sortAsc'] as const;

/**
 * 从参数字典中剔除分页保留键，提取纯净的业务检索筛选参数。
 */
function extractPureQueryParams(raw?: Record<string, unknown>): Record<string, unknown> {
  if (!raw || typeof raw !== 'object') return {};
  const pure: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!(PAGINATION_RESERVED_KEYS as readonly string[]).includes(k)) {
      pure[k] = v;
    }
  }
  return pure;
}

/**
 * 校验是否存在非空筛选条件。
 * 排除 undefined、null、空字符串 '' 以及空数组 []，并排除标准分页/排序保留键。
 */
function hasActiveFilterParams(params?: Record<string, unknown>): boolean {
  if (!params || typeof params !== 'object') {
    return false;
  }
  return Object.entries(params).some(([key, value]) => {
    if ((PAGINATION_RESERVED_KEYS as readonly string[]).includes(key)) {
      return false;
    }
    if (value === undefined || value === null || value === '') {
      return false;
    }
    if (Array.isArray(value) && value.length === 0) {
      return false;
    }
    return true;
  });
}

const currentQueryParams = computed<Record<string, unknown>>(() => {
  // 建立表单注册钩子变更的响应式依赖追踪
  void queryGetterVersion.value;

  // 1. 若外部 pagination 显式挂载了 query（无论是 Ref、Getter 还是普通对象）且含有非空筛选条件
  const paginationQuery = (props.pagination as Record<string, unknown> | undefined)?.query;
  const rawQuery = toValue(paginationQuery);
  if (rawQuery && typeof rawQuery === 'object') {
    const pure = extractPureQueryParams(rawQuery as Record<string, unknown>);
    if (hasActiveFilterParams(pure)) {
      return pure;
    }
  }
  // 2. 若内部记录了 search 调度的 params
  if (internalQueryParams.value && typeof internalQueryParams.value === 'object') {
    const pure = extractPureQueryParams(internalQueryParams.value);
    if (hasActiveFilterParams(pure)) {
      return pure;
    }
  }
  // 3. 若有已注册的表单 queryGetter
  for (const getter of registeredQueryGetters) {
    try {
      const formModel = getter();
      if (formModel && typeof formModel === 'object') {
        const pure = extractPureQueryParams(formModel);
        if (hasActiveFilterParams(pure)) {
          return pure;
        }
      }
    } catch {
      // 弹性防御
    }
  }
  // 4. 若绑定的 pagination.params.value 包含额外参数（排除标准分页/排序保留键）
  const rawParams = props.pagination?.params?.value?.[0];
  if (rawParams && typeof rawParams === 'object') {
    return extractPureQueryParams(rawParams as Record<string, unknown>);
  }
  return {};
});

const isSearchEmpty = computed<boolean>(() => {
  if (hasError.value || isLoading.value || tableData.value.length > 0) {
    return false;
  }
  return hasActiveFilterParams(currentQueryParams.value);
});

const handleResetFromEmpty = async () => {
  await tableContext.reset();
};

const tableContext: AtengTableContext = {
  search: async params => {
    internalQueryParams.value = params ? { ...params } : undefined;
    if (props.pagination) {
      await props.pagination.search(params);
    }
  },
  reset: async () => {
    internalQueryParams.value = undefined;
    for (const handler of registeredResetHandlers) {
      try {
        handler();
      } catch {
        // 弹性防御
      }
    }
    if (props.pagination) {
      await props.pagination.reset();
    } else {
      emit('refresh');
    }
  },
  loading: isLoading,
  getSelectedRows: () => selectedRows.value as Record<string, unknown>[],
  getQueryParams: () => currentQueryParams.value,
  registerResetHandler: (handler: () => void) => {
    registeredResetHandlers.add(handler);
    return () => {
      registeredResetHandlers.delete(handler);
    };
  },
  registerQueryGetter: (getter: () => Record<string, unknown>) => {
    registeredQueryGetters.add(getter);
    queryGetterVersion.value++;
    return () => {
      registeredQueryGetters.delete(getter);
      queryGetterVersion.value++;
    };
  },
};

provide(ATENG_TABLE_CONTEXT_KEY, tableContext);

// 8. 显式暴露实例能力
defineExpose<AtengTableExpose<T>>({
  tableRef,
  columns: columnSettings as ComputedRef<TableColumnConfig[]>,
  selectedKeys,
  selection: effectiveSelection.value,
  selectedRows,
  selectedCount,
  clearSelection,
  toggleRowSelection,
  getSelectionRows,
  resetColumns: handleResetColumns,
  refresh: handleRefresh,
});
</script>

<template>
  <div
    ref="tableRootRef"
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
                  v-for="(item, index) in columnSettings"
                  :key="item.prop || item.label || item.type"
                  class="at-table-column-setting__item"
                  draggable="true"
                  @dragstart="onColumnDragStart($event, index)"
                  @dragover.prevent="onColumnDragOver($event, index)"
                  @drop="onColumnDrop($event, index)"
                >
                  <span class="at-table-column-setting__handle" title="按住拖拽排序">⋮⋮</span>
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
        :height="effectiveTableHeight"
        class="at-table__inner"
        @selection-change="handleSelectionChange"
        @sort-change="handleSortChange"
        @header-dragend="onHeaderDragend"
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
            <AtengEmpty
              v-else-if="isSearchEmpty"
              status="search"
              :description="
                searchEmptyDescription || emptyDescription || '未找到符合条件的检索结果'
              "
            >
              <el-button
                type="primary"
                :loading="isLoading"
                class="at-table__empty-reset-btn"
                @click="handleResetFromEmpty"
              >
                清空筛选条件
              </el-button>
            </AtengEmpty>
            <AtengEmpty v-else status="empty" :description="emptyDescription" />
          </template>
        </template>
      </el-table>

      <!-- 底部粘滞批量操作悬浮条 -->
      <transition name="at-fade-slide">
        <div v-if="shouldShowBatchBar && selectedCount > 0" class="at-table__batch-bar">
          <div class="at-table__batch-bar-left">
            <span class="at-table__batch-bar-text">
              已选择 <strong class="at-table__batch-bar-count">{{ selectedCount }}</strong> 项
            </span>
            <el-button
              link
              type="primary"
              size="small"
              class="at-table__batch-bar-clear"
              @click="clearSelection"
            >
              清空
            </el-button>
          </div>
          <div class="at-table__batch-bar-right">
            <slot
              name="batch-actions"
              :selected-rows="selectedRows"
              :clear-selection="clearSelection"
            />
          </div>
        </div>
      </transition>
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

  &__batch-bar {
    position: sticky;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 10;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 8px;
    padding: 8px 16px;
    background-color: var(--el-color-primary-light-9);
    border: 1px solid var(--el-color-primary-light-7);
    border-radius: var(--el-border-radius-base);
    box-shadow: var(--el-box-shadow-light);
    box-sizing: border-box;

    &-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    &-text {
      font-size: 14px;
      color: var(--el-text-color-regular);
    }

    &-count {
      color: var(--el-color-primary);
      font-weight: 600;
    }

    &-clear {
      padding: 0;
      font-size: 13px;
    }

    &-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }
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

  &__handle {
    cursor: grab;
    user-select: none;
    font-size: 14px;
    letter-spacing: -2px;
    margin-right: 6px;
    color: var(--el-text-color-placeholder);

    &:active {
      cursor: grabbing;
    }
  }
}

// 批量操作栏滑出淡入过渡动画
.at-fade-slide-enter-active,
.at-fade-slide-leave-active {
  transition: all 0.25s cubic-bezier(0.25, 0.8, 0.5, 1);
}

.at-fade-slide-enter-from,
.at-fade-slide-leave-to {
  opacity: 0;
  transform: translateY(100%);
}
</style>
