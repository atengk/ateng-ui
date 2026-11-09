/**
 * @atengk/form-designer-vue 响应式设计态无头状态机 (useFormDesigner)。
 *
 * 遵循 ADR-0044、ADR-0002 与 ADR-0013 响应式契约：
 * 1. 负责管理 FormSchema 响应式树状实体与活动选中控件（activeWidgetId）；
 * 2. 委托 FormHistoryStack 实现不可变快照历史栈与 300ms 连续属性输入防抖合并；
 * 3. 对称暴露控件添加、删除、位移、克隆、更新与清空能力；
 * 4. 内置 validateDrop 类型守卫判定，确保画布结构的绝对健壮性与单向数据流。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { ref, computed } from 'vue';
import type { Ref, ComputedRef } from 'vue';
import type {
  FormSchema,
  FormWidget,
  ViewportType,
  DropValidationResult,
  UseFormDesignerOptions,
  UseFormDesignerReturn,
  ContainerType,
} from '../types';
import { safeClone } from '../utils/path';
import { findWidgetNode, cloneWidgetWithNewIds, validateDropTarget } from '../utils/designer';
import { FormHistoryStack } from '../history/FormHistoryStack';

/**
 * 默认空 FormSchema 骨架。
 */
export function createEmptySchema(): FormSchema {
  return {
    version: '1.0',
    formConfig: {
      layout: 'horizontal',
      labelWidth: 100,
      labelPosition: 'right',
      size: 'default',
      colon: true,
      scrollToError: true,
    },
    widgetList: [],
  };
}

/**
 * 表单设计态响应式状态机 Hook。
 *
 * @param options 配置选项
 */
export function useFormDesigner(options: UseFormDesignerOptions = {}): UseFormDesignerReturn {
  // 1. 初始化响应式 Schema 实体
  const initial = options.initialSchema ? safeClone(options.initialSchema) : createEmptySchema();
  const schema: Ref<FormSchema> = ref(initial);

  // 2. 当前选中控件 ID 与视口状态
  const activeWidgetId: Ref<string | null> = ref(null);
  const viewport: Ref<ViewportType> = ref('pc');

  // 3. 不可变快照历史栈 (委托 FormHistoryStack，支持 300ms 防抖合并与最大 30 步上限截断)
  const canUndoState: Ref<boolean> = ref(false);
  const canRedoState: Ref<boolean> = ref(false);

  const historyStack = new FormHistoryStack(initial, {
    maxLimit: options.maxHistoryLimit ?? 30,
    debounceMs: options.debounceMs ?? 300,
    onChange: (snapshot, stack) => {
      canUndoState.value = stack.canUndo;
      canRedoState.value = stack.canRedo;
      options.onSchemaChange?.(snapshot);
    },
  });

  const syncHistoryState = (): void => {
    canUndoState.value = historyStack.canUndo;
    canRedoState.value = historyStack.canRedo;
  };

  // 4. 计算属性：当前选中节点及父级容器
  const activeNodeInfo = computed(() => {
    if (!activeWidgetId.value) {
      return null;
    }
    return findWidgetNode(schema.value.widgetList, activeWidgetId.value);
  });

  const activeWidget: ComputedRef<FormWidget | null> = computed(() => {
    return activeNodeInfo.value ? activeNodeInfo.value.widget : null;
  });

  const activeParentWidget: ComputedRef<FormWidget | null> = computed(() => {
    return activeNodeInfo.value ? activeNodeInfo.value.parent : null;
  });

  const canUndo: ComputedRef<boolean> = computed(() => canUndoState.value);
  const canRedo: ComputedRef<boolean> = computed(() => canRedoState.value);

  // 5. 核心状态机方法
  const selectWidget = (id: string | null): void => {
    activeWidgetId.value = id;
    options.onSelectWidget?.(activeWidget.value);
  };

  const selectParentWidget = (): void => {
    if (activeParentWidget.value) {
      selectWidget(activeParentWidget.value.id);
    }
  };

  const validateDrop = (
    source:
      | FormWidget
      | {
          id?: string;
          type: string;
          isContainer?: boolean;
          isCollection?: boolean;
          containerType?: ContainerType;
        },
    targetParentId: string | null,
  ): DropValidationResult => {
    if (!targetParentId) {
      return validateDropTarget(source, null, schema.value.widgetList);
    }
    const found = findWidgetNode(schema.value.widgetList, targetParentId);
    if (!found) {
      return { allowed: false, reason: '目标父级容器节点不存在' };
    }
    return validateDropTarget(source, found.widget, schema.value.widgetList);
  };

  const addWidget = (
    widget: FormWidget,
    targetParentId: string | null = null,
    targetIndex?: number,
  ): boolean => {
    const validation = validateDrop(widget, targetParentId);
    if (!validation.allowed) {
      console.warn(`[useFormDesigner] 拦截非法嵌套操作: ${validation.reason}`);
      return false;
    }

    const clonedWidget = safeClone(widget);

    if (targetParentId) {
      const parentNode = findWidgetNode(schema.value.widgetList, targetParentId);
      if (!parentNode) {
        return false;
      }
      if (!Array.isArray(parentNode.widget.children)) {
        parentNode.widget.children = [];
      }
      const children = parentNode.widget.children;
      if (typeof targetIndex === 'number' && targetIndex >= 0 && targetIndex <= children.length) {
        children.splice(targetIndex, 0, clonedWidget);
      } else {
        children.push(clonedWidget);
      }
    } else {
      const list = schema.value.widgetList;
      if (typeof targetIndex === 'number' && targetIndex >= 0 && targetIndex <= list.length) {
        list.splice(targetIndex, 0, clonedWidget);
      } else {
        list.push(clonedWidget);
      }
    }

    selectWidget(clonedWidget.id);
    historyStack.push(schema.value, true);
    syncHistoryState();
    return true;
  };

  const removeWidget = (id: string): boolean => {
    const found = findWidgetNode(schema.value.widgetList, id);
    if (!found) {
      return false;
    }

    if (found.parent) {
      if (Array.isArray(found.parent.children)) {
        found.parent.children.splice(found.index, 1);
      }
    } else {
      schema.value.widgetList.splice(found.index, 1);
    }

    if (activeWidgetId.value === id) {
      selectWidget(found.parent ? found.parent.id : null);
    }

    historyStack.push(schema.value, true);
    syncHistoryState();
    return true;
  };

  const moveWidget = (
    sourceId: string,
    targetParentId: string | null,
    targetIndex: number,
  ): boolean => {
    const sourceFound = findWidgetNode(schema.value.widgetList, sourceId);
    if (!sourceFound) {
      return false;
    }

    const validation = validateDrop(sourceFound.widget, targetParentId);
    if (!validation.allowed) {
      console.warn(`[useFormDesigner] 移动失败，触发类型守卫拦截: ${validation.reason}`);
      return false;
    }

    const currentParentId = sourceFound.parent ? sourceFound.parent.id : null;
    const sameParent = currentParentId === targetParentId;

    const [removed] = sourceFound.parent
      ? (sourceFound.parent.children ?? []).splice(sourceFound.index, 1)
      : schema.value.widgetList.splice(sourceFound.index, 1);

    if (!removed) {
      return false;
    }

    let adjustedIndex = targetIndex;
    if (sameParent && sourceFound.index < targetIndex) {
      adjustedIndex = Math.max(0, targetIndex - 1);
    }

    if (targetParentId) {
      const targetParentNode = findWidgetNode(schema.value.widgetList, targetParentId);
      if (!targetParentNode) {
        return false;
      }
      if (!Array.isArray(targetParentNode.widget.children)) {
        targetParentNode.widget.children = [];
      }
      const children = targetParentNode.widget.children;
      const finalIndex = Math.min(Math.max(0, adjustedIndex), children.length);
      children.splice(finalIndex, 0, removed);
    } else {
      const list = schema.value.widgetList;
      const finalIndex = Math.min(Math.max(0, adjustedIndex), list.length);
      list.splice(finalIndex, 0, removed);
    }

    selectWidget(removed.id);
    historyStack.push(schema.value, true);
    syncHistoryState();
    return true;
  };

  const updateWidget = (id: string, patch: Partial<FormWidget>, debounced = false): boolean => {
    const found = findWidgetNode(schema.value.widgetList, id);
    if (!found) {
      return false;
    }

    const { id: _, ...restPatch } = patch;
    Object.assign(found.widget, restPatch);

    // debounced 为 true 时走 300ms 防抖合并；为 false 时立即提交
    historyStack.push(schema.value, !debounced);
    syncHistoryState();
    return true;
  };

  const copyWidget = (id: string): FormWidget | null => {
    const found = findWidgetNode(schema.value.widgetList, id);
    if (!found) {
      return null;
    }

    const copied = cloneWidgetWithNewIds(found.widget);

    if (found.parent) {
      if (!Array.isArray(found.parent.children)) {
        found.parent.children = [];
      }
      found.parent.children.splice(found.index + 1, 0, copied);
    } else {
      schema.value.widgetList.splice(found.index + 1, 0, copied);
    }

    selectWidget(copied.id);
    historyStack.push(schema.value, true);
    syncHistoryState();
    return copied;
  };

  const clearWidgets = (): void => {
    schema.value.widgetList = [];
    selectWidget(null);
    historyStack.push(schema.value, true);
    syncHistoryState();
  };

  const undo = (): void => {
    const prev = historyStack.undo();
    if (prev) {
      schema.value = prev;
      syncHistoryState();
      if (activeWidgetId.value && !findWidgetNode(schema.value.widgetList, activeWidgetId.value)) {
        selectWidget(null);
      }
    }
  };

  const redo = (): void => {
    const next = historyStack.redo();
    if (next) {
      schema.value = next;
      syncHistoryState();
      if (activeWidgetId.value && !findWidgetNode(schema.value.widgetList, activeWidgetId.value)) {
        selectWidget(null);
      }
    }
  };

  const setViewport = (v: ViewportType): void => {
    viewport.value = v;
  };

  const exportSchema = (): FormSchema => {
    return safeClone(schema.value);
  };

  const setSchema = (newSchema: FormSchema): void => {
    schema.value = safeClone(newSchema);
    selectWidget(null);
    historyStack.clear(newSchema);
    syncHistoryState();
  };

  return {
    schema,
    activeWidgetId,
    activeWidget,
    activeParentWidget,
    viewport,
    canUndo,
    canRedo,
    selectWidget,
    selectParentWidget,
    addWidget,
    removeWidget,
    moveWidget,
    updateWidget,
    copyWidget,
    clearWidgets,
    undo,
    redo,
    setViewport,
    exportSchema,
    setSchema,
    validateDrop,
  };
}
