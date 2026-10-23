<script setup lang="ts" generic="T extends Record<string, unknown> = Record<string, unknown>">
/**
 * 企业级响应式高级搜索表单容器组件。
 *
 * 核心特性：
 * 1. 24 栅格响应式断点自适应（1~4 列），接入原生 ResizeObserver 容器感知断点；
 * 2. 平滑折叠展开交互，支持 collapsedRows 配置常驻展示前 N 行；
 * 3. 查询与重置按钮内置 v-idempotent 防抖防刷，支持 autoSearchOnReset 重置自触发；
 * 4. 支持独立事件驱动与 AtengTable 嵌套上下文自动联动双模；
 * 5. Vue 3.5 SFC 原生泛型 <T> 强类型支持。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import {
  ref,
  computed,
  toValue,
  onMounted,
  onUnmounted,
  useSlots,
  inject,
  Comment,
  Fragment,
  type VNode,
} from 'vue';
import { ElForm, ElButton, ElIcon, type FormInstance } from 'element-plus';
import { vIdempotent } from '../../directives/idempotent/vIdempotent';
import { ATENG_TABLE_CONTEXT_KEY, type AtengTableContext } from '../shared/context';
import type {
  AtengQueryFormProps,
  AtengQueryFormEmits,
  AtengQueryFormSlots,
  AtengQueryFormExpose,
} from './types';

defineOptions({
  name: 'AtengQueryForm',
});

const props = withDefaults(defineProps<AtengQueryFormProps<T>>(), {
  model: undefined,
  pagination: undefined,
  enterSearch: true,
  cols: undefined,
  collapsed: undefined,
  defaultCollapsed: true,
  collapsedRows: 1,
  showCollapse: true,
  labelWidth: '',
  labelPosition: 'right',
  searchText: '查询',
  resetText: '重置',
  collapseText: '收起',
  expandText: '展开',
  showSearch: true,
  showReset: true,
  autoSearchOnReset: true,
  searchLoading: false,
  disabled: false,
  gutter: 16,
  customClass: '',
});

const emit = defineEmits<AtengQueryFormEmits<T>>();
defineSlots<AtengQueryFormSlots<T>>();

// 1. 容器宽度监听与响应式列数计算 (ResizeObserver 容器感知断点)
const formRef = ref<FormInstance>();
const containerWidth = ref<number>(typeof window !== 'undefined' ? window.innerWidth : 1280);
let resizeObserver: ResizeObserver | null = null;

const handleWindowResize = () => {
  if (typeof window !== 'undefined') {
    containerWidth.value = window.innerWidth;
  }
};

onMounted(() => {
  if (typeof window !== 'undefined') {
    const rootEl = formRef.value?.$el as HTMLElement | undefined;
    if (typeof ResizeObserver !== 'undefined' && rootEl) {
      const initialWidth = rootEl.clientWidth || window.innerWidth || 1280;
      if (initialWidth > 0) {
        containerWidth.value = initialWidth;
      }
      resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
          const width = entry.contentRect?.width || (entry.target as HTMLElement).clientWidth;
          if (typeof width === 'number' && width > 0) {
            containerWidth.value = width;
          }
        }
      });
      resizeObserver.observe(rootEl);
    } else {
      containerWidth.value = window.innerWidth || 1280;
      window.addEventListener('resize', handleWindowResize);
    }
  }
});

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', handleWindowResize);
  }
});

const currentCols = computed<number>(() => {
  if (typeof props.cols === 'number') {
    return Math.max(1, Math.min(props.cols, 24));
  }
  const w = containerWidth.value;
  if (typeof props.cols === 'object' && props.cols !== null) {
    if (w < 768 && props.cols.xs !== undefined) return props.cols.xs;
    if (w >= 768 && w < 992 && props.cols.sm !== undefined) return props.cols.sm;
    if (w >= 992 && w < 1200 && props.cols.md !== undefined) return props.cols.md;
    if (w >= 1200 && w < 1920 && props.cols.lg !== undefined) return props.cols.lg;
    if (w >= 1920 && props.cols.xl !== undefined) return props.cols.xl;
  }
  // 默认断点策略（容器宽度）
  if (w < 768) return 1;
  if (w < 1200) return 2;
  if (w < 1920) return 3;
  return 4;
});

// 2. 插槽 VNode 扁平化递归解析
const slots = useSlots();

function flattenVNodes(vnodes: VNode[]): VNode[] {
  const result: VNode[] = [];
  for (const node of vnodes) {
    if (node.type === Comment) {
      continue;
    }
    if (node.type === Fragment && Array.isArray(node.children)) {
      result.push(...flattenVNodes(node.children as VNode[]));
    } else {
      result.push(node);
    }
  }
  return result;
}

const flattenedVNodes = computed<VNode[]>(() => {
  const raw = slots.default ? slots.default() : [];
  return flattenVNodes(raw);
});

const totalItems = computed<number>(() => flattenedVNodes.value.length);

// 3. 折叠/展开状态编排
const internalCollapsed = ref(props.defaultCollapsed);

const isCollapsed = computed<boolean>(() => {
  return props.collapsed !== undefined ? props.collapsed : internalCollapsed.value;
});

const maxVisibleCount = computed<number>(() => {
  const cols = currentCols.value;
  const rows = Math.max(1, props.collapsedRows ?? 1);
  if (cols <= 1) return rows;
  return rows * cols - 1;
});

const canCollapse = computed<boolean>(() => {
  return totalItems.value > maxVisibleCount.value;
});

const toggleCollapse = () => {
  const next = !isCollapsed.value;
  internalCollapsed.value = next;
  emit('update:collapsed', next);
  emit('collapse', next);
};

// 4. 栅格与操作区布局样式计算
const gridStyle = computed(() => {
  return {
    display: 'grid',
    gridTemplateColumns: `repeat(${currentCols.value}, minmax(0, 1fr))`,
    gap: `${props.gutter}px`,
  };
});

const actionGridStyle = computed(() => {
  const cols = currentCols.value;
  if (isCollapsed.value) {
    return {
      gridColumn: 'span 1',
    };
  }
  const remainder = totalItems.value % cols;
  const span = remainder === 0 ? cols : cols - remainder;
  return {
    gridColumn: `span ${span}`,
  };
});

// 5. 模型解析与加载态计算（支持 usePagination 零胶水直连）
const effectiveModel = computed<T>(() => {
  if (props.model !== undefined) {
    return props.model as T;
  }
  if (props.pagination?.query) {
    return props.pagination.query as unknown as T;
  }
  return {} as T;
});

const effectiveSearchLoading = computed<boolean>(() => {
  if (props.searchLoading) return true;
  if (props.pagination?.loading) {
    return Boolean(toValue(props.pagination.loading));
  }
  return false;
});

// 6. 查询与重置交互调度
const tableContext = inject<AtengTableContext | null>(ATENG_TABLE_CONTEXT_KEY, null);
let unregisterResetHandler: (() => void) | undefined;
let unregisterQueryGetter: (() => void) | undefined;

onMounted(() => {
  if (tableContext?.registerResetHandler) {
    unregisterResetHandler = tableContext.registerResetHandler(() => {
      formRef.value?.resetFields();
      emit('reset');
    });
  }
  if (tableContext?.registerQueryGetter) {
    unregisterQueryGetter = tableContext.registerQueryGetter(() => {
      return (effectiveModel.value as Record<string, unknown>) || {};
    });
  }
});

onUnmounted(() => {
  if (unregisterResetHandler) {
    unregisterResetHandler();
    unregisterResetHandler = undefined;
  }
  if (unregisterQueryGetter) {
    unregisterQueryGetter();
    unregisterQueryGetter = undefined;
  }
});

const handleSearch = (overrideModel?: T) => {
  const targetModel = overrideModel || effectiveModel.value;
  emit('search', targetModel);
  if (props.pagination) {
    props.pagination.search(targetModel as unknown as Record<string, unknown>);
  }
  if (tableContext) {
    tableContext.search(targetModel);
  }
};

const onSearchClick = () => {
  handleSearch();
};

const handleReset = () => {
  formRef.value?.resetFields();
  emit('reset');
  if (props.pagination) {
    props.pagination.reset();
  }
  if (props.autoSearchOnReset !== false) {
    emit('search', effectiveModel.value);
    if (tableContext) {
      tableContext.reset();
    }
  }
};

const onResetClick = () => {
  handleReset();
};

const handleFormKeyDown = (event: KeyboardEvent) => {
  if (props.enterSearch === false) return;
  // 防御中文输入法 IME 组合态 (event.isComposing 为 true 或 keyCode 为 229)
  if (event.isComposing || event.keyCode === 229) return;

  if (event.key === 'Enter') {
    event.preventDefault();
    handleSearch();
  }
};

// 7. 实例能力显式暴露
defineExpose<AtengQueryFormExpose<T>>({
  formRef,
  validate: callback => {
    if (formRef.value) {
      return formRef.value.validate(callback);
    }
    if (callback) callback(true);
    return Promise.resolve(true);
  },
  clearValidate: propsToClear => formRef.value?.clearValidate(propsToClear),
  resetFields: () => formRef.value?.resetFields(),
  search: handleSearch,
  reset: handleReset,
  toggleCollapse,
  collapsed: isCollapsed,
});
</script>

<template>
  <el-form
    ref="formRef"
    :model="effectiveModel"
    :label-width="labelWidth"
    :label-position="labelPosition"
    :disabled="disabled"
    :class="['at-query-form', customClass]"
    @keydown="handleFormKeyDown"
  >
    <div class="at-query-form__grid" :style="gridStyle">
      <!-- 渲染扁平化表单项，通过 v-show 保留表单控件 DOM 状态与校验信息 -->
      <div
        v-for="(vnode, index) in flattenedVNodes"
        v-show="!isCollapsed || index < maxVisibleCount"
        :key="index"
        class="at-query-form__item"
      >
        <component :is="vnode" />
      </div>

      <!-- 操作按钮区域 -->
      <div class="at-query-form__actions" :style="actionGridStyle">
        <slot
          name="action"
          :collapsed="isCollapsed"
          :toggle="toggleCollapse"
          :search="handleSearch"
          :reset="handleReset"
          :model="effectiveModel"
        >
          <!-- 默认查询按钮 -->
          <el-button
            v-if="showSearch"
            v-idempotent="onSearchClick"
            type="primary"
            :loading="effectiveSearchLoading"
            class="at-query-form__search-btn"
          >
            <el-icon class="at-query-form__btn-icon">
              <svg viewBox="0 0 1024 1024" width="1em" height="1em" fill="currentColor">
                <path
                  d="m795.904 750.72 42.88-42.88L1010.56 879.616a30.272 30.272 0 1 1-42.88 42.88L795.904 750.72zM480 832a352 352 0 1 1 0-704 352 352 0 0 1 0 704zm0-64a288 288 0 1 0 0-576 288 288 0 0 0 0 576z"
                />
              </svg>
            </el-icon>
            {{ searchText }}
          </el-button>

          <!-- 默认重置按钮 -->
          <el-button v-if="showReset" v-idempotent="onResetClick" class="at-query-form__reset-btn">
            <el-icon class="at-query-form__btn-icon">
              <svg viewBox="0 0 1024 1024" width="1em" height="1em" fill="currentColor">
                <path
                  d="M512 128c-211.712 0-384 172.288-384 384s172.288 384 384 384 384-172.288 384-384c0-42.56-6.976-83.52-19.84-121.92a32 32 0 1 0-60.8 19.84A318.528 318.528 0 0 1 832 512c0 176.448-143.552 320-320 320S192 688.448 192 512 335.552 192 512 192c99.712 0 188.8 45.888 247.36 117.888L672 320a32 32 0 1 0 0 64h192a32 32 0 0 0 32-32V160a32 32 0 1 0-64 0l-0.384 66.88C753.984 148.928 640.192 128 512 128z"
                />
              </svg>
            </el-icon>
            {{ resetText }}
          </el-button>

          <!-- 额外扩展插槽 -->
          <slot name="extra" />

          <!-- 展开/收起切换按钮 -->
          <el-button
            v-if="showCollapse && canCollapse"
            link
            type="primary"
            class="at-query-form__collapse-btn"
            @click="toggleCollapse"
          >
            <span>{{ isCollapsed ? expandText : collapseText }}</span>
            <el-icon class="at-query-form__collapse-icon" :class="{ 'is-expanded': !isCollapsed }">
              <svg viewBox="0 0 1024 1024" width="1em" height="1em" fill="currentColor">
                <path
                  d="M831.872 340.777a32 32 0 0 1 45.312 45.248l-341.333 341.333a32 32 0 0 1-45.312 0L149.205 386.025a32 32 0 0 1 45.312-45.248L512 658.281l319.872-317.504z"
                />
              </svg>
            </el-icon>
          </el-button>
        </slot>
      </div>
    </div>
  </el-form>
</template>

<style scoped lang="scss">
.at-query-form {
  padding: 18px 18px 2px;
  background-color: var(--el-bg-color);
  border-radius: var(--el-border-radius-base);
  margin-bottom: 16px;
  box-sizing: border-box;

  &__grid {
    width: 100%;
    align-items: flex-start;
  }

  &__item {
    min-width: 0;

    :deep(.el-form-item) {
      margin-bottom: 16px;
      width: 100%;
    }

    :deep(.el-form-item__content) {
      min-width: 0;
      > * {
        width: 100%;
      }
    }
  }

  &__actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 16px;
  }

  &__btn-icon {
    margin-right: 4px;
    font-size: 14px;
  }

  &__collapse-btn {
    display: inline-flex;
    align-items: center;
    cursor: pointer;
    user-select: none;
    font-size: 13px;
    margin-left: 4px;
  }

  &__collapse-icon {
    margin-left: 4px;
    transition: transform 0.2s ease-in-out;

    &.is-expanded {
      transform: rotate(180deg);
    }
  }
}
</style>
