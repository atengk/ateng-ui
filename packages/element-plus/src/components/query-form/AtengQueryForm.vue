<script setup lang="ts">
/**
 * 企业级响应式高级搜索表单容器组件。
 *
 * 核心特性：
 * 1. 24 栅格响应式断点自适应（1~4 列）；
 * 2. 平滑折叠展开交互，折叠态保留首行前 N-1 项与末尾固定操作区；
 * 3. 查询与重置按钮内置 v-idempotent 防抖防刷；
 * 4. 支持独立事件驱动与 AtengTable 嵌套上下文自动联动双模。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import {
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
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

const props = withDefaults(defineProps<AtengQueryFormProps>(), {
  model: () => ({}),
  cols: undefined,
  collapsed: undefined,
  defaultCollapsed: true,
  showCollapse: true,
  labelWidth: '',
  labelPosition: 'right',
  searchText: '查询',
  resetText: '重置',
  collapseText: '收起',
  expandText: '展开',
  showSearch: true,
  showReset: true,
  searchLoading: false,
  disabled: false,
  gutter: 16,
  customClass: '',
});

const emit = defineEmits<AtengQueryFormEmits>();
defineSlots<AtengQueryFormSlots>();

// 1. 视口宽度监听与响应式列数计算
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1280);

const handleResize = () => {
  if (typeof window !== 'undefined') {
    windowWidth.value = window.innerWidth;
  }
};

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', handleResize);
  }
});

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', handleResize);
  }
});

const currentCols = computed<number>(() => {
  if (typeof props.cols === 'number') {
    return Math.max(1, Math.min(props.cols, 24));
  }
  const w = windowWidth.value;
  if (typeof props.cols === 'object' && props.cols !== null) {
    if (w < 768 && props.cols.xs !== undefined) return props.cols.xs;
    if (w >= 768 && w < 992 && props.cols.sm !== undefined) return props.cols.sm;
    if (w >= 992 && w < 1200 && props.cols.md !== undefined) return props.cols.md;
    if (w >= 1200 && w < 1920 && props.cols.lg !== undefined) return props.cols.lg;
    if (w >= 1920 && props.cols.xl !== undefined) return props.cols.xl;
  }
  // 默认断点策略
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
  if (cols <= 1) return 1;
  return cols - 1;
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

// 5. 查询与重置交互调度
const tableContext = inject<AtengTableContext | null>(ATENG_TABLE_CONTEXT_KEY, null);
const formRef = ref<FormInstance>();

const handleSearch = () => {
  emit('search', props.model);
  if (tableContext) {
    tableContext.search(props.model);
  }
};

const handleReset = () => {
  formRef.value?.resetFields();
  emit('reset');
  if (tableContext) {
    tableContext.reset();
  }
};

// 6. 实例能力显式暴露
defineExpose<AtengQueryFormExpose>({
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
    :model="model"
    :label-width="labelWidth"
    :label-position="labelPosition"
    :disabled="disabled"
    :class="['at-query-form', customClass]"
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
        >
          <!-- 默认查询按钮 -->
          <el-button
            v-if="showSearch"
            v-idempotent="handleSearch"
            type="primary"
            :loading="searchLoading"
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
          <el-button v-if="showReset" v-idempotent="handleReset" class="at-query-form__reset-btn">
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
