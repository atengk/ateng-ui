/**
 * @atengk/form-designer-vue 设计态画板与拖拽守卫工具集。
 *
 * 遵循 ADR-0044 与容器二分法规范，提供节点寻址、深层克隆与多层拖拽类型守卫。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import type { ContainerType, DropValidationResult, FormWidget } from '../types';
import { safeClone } from './path';

/**
 * 生成控件全局唯一标识 ID。
 *
 * @param type 控件类型标识
 */
export function generateWidgetId(type: string): string {
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `${type}_${randomStr}`;
}

/**
 * 依据类型创建具备标准初始结构的 FormWidget 实体。
 *
 * @param type 控件类型
 * @param overrides 覆盖配置
 */
export function createDefaultWidget(type: string, overrides: Partial<FormWidget> = {}): FormWidget {
  const id = overrides.id || generateWidgetId(type);
  const modelKey = overrides.modelKey || (overrides.isContainer ? undefined : id);

  const baseWidget: FormWidget = {
    id,
    type,
    modelKey,
    label: overrides.label || getDefaultLabel(type),
    placeholder: overrides.placeholder || `请输入${overrides.label || getDefaultLabel(type)}`,
    props: {},
    rules: [],
    ...overrides,
  };

  // 根据类型配置容器及预设属性
  if (type === 'grid') {
    baseWidget.isContainer = true;
    baseWidget.containerType = 'layout';
    baseWidget.modelKey = undefined;
    baseWidget.props = {
      cols: 2,
      gutter: 16,
      ...overrides.props,
    };
    baseWidget.children = overrides.children ? [...overrides.children] : [];
  } else if (type === 'card') {
    baseWidget.isContainer = true;
    baseWidget.containerType = 'layout';
    baseWidget.modelKey = undefined;
    baseWidget.props = {
      title: '卡片分组',
      bordered: true,
      ...overrides.props,
    };
    baseWidget.children = overrides.children ? [...overrides.children] : [];
  } else if (type === 'subform') {
    baseWidget.isCollection = true;
    baseWidget.containerType = 'data';
    baseWidget.modelKey = overrides.modelKey || `items_${id.slice(-4)}`;
    baseWidget.props = {
      displayMode: 'table',
      allowAdd: true,
      allowDelete: true,
      addButtonText: '添加明细行',
      emptyText: '暂无明细数据',
      ...overrides.props,
    };
    baseWidget.children = overrides.children ? [...overrides.children] : [];
  } else if (type === 'select' || type === 'radio' || type === 'checkbox') {
    if (!baseWidget.options) {
      baseWidget.options = [
        { label: '选项一', value: '1' },
        { label: '选项二', value: '2' },
      ];
    }
  }

  return baseWidget;
}

/**
 * 获取控件类型的默认展示标签。
 */
function getDefaultLabel(type: string): string {
  switch (type) {
    case 'input':
      return '单行文本';
    case 'textarea':
      return '多行文本';
    case 'select':
      return '下拉选择';
    case 'checkbox':
      return '复选框';
    case 'radio':
      return '单选框';
    case 'grid':
      return '栅格排版';
    case 'card':
      return '卡片分组';
    case 'subform':
      return '明细子表单';
    default:
      return type.toUpperCase();
  }
}

/**
 * 递归克隆节点树并赋予全新的唯一 ID 与唯一的 modelKey。
 *
 * @param widget 原始节点
 */
export function cloneWidgetWithNewIds(widget: FormWidget): FormWidget {
  const cloned = safeClone(widget);

  const regenerate = (node: FormWidget): void => {
    node.id = generateWidgetId(node.type);

    // 非容器控件若有 modelKey，同步更新后缀防止数据绑定冲突
    if (node.modelKey && !node.isContainer) {
      node.modelKey = `${node.modelKey.replace(/_\w{6}$/, '')}_${node.id.split('_')[1] || 'copy'}`;
    }

    if (Array.isArray(node.children)) {
      node.children.forEach(regenerate);
    }
  };

  regenerate(cloned);
  return cloned;
}

/**
 * 递归在节点树中寻址目标控件，返回节点本身、其直接父容器及索引。
 *
 * @param widgets 根节点列表
 * @param id 目标节点 ID
 * @param parent 当前父节点
 */
export function findWidgetNode(
  widgets: FormWidget[],
  id: string,
  parent: FormWidget | null = null,
): { widget: FormWidget; parent: FormWidget | null; index: number } | null {
  for (let i = 0; i < widgets.length; i++) {
    const item = widgets[i];
    if (!item) {
      continue;
    }
    if (item.id === id) {
      return { widget: item, parent, index: i };
    }
    if (Array.isArray(item.children) && item.children.length > 0) {
      const found = findWidgetNode(item.children, id, item);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

/**
 * 判定 targetId 是否为 sourceId 的后代节点。
 *
 * @param sourceId 源节点 ID
 * @param targetId 目标节点 ID
 * @param allWidgets 节点总列表
 */
export function isDescendantOf(
  sourceId: string,
  targetId: string,
  allWidgets: FormWidget[],
): boolean {
  if (sourceId === targetId) {
    return true;
  }
  const sourceNode = findWidgetNode(allWidgets, sourceId);
  if (!sourceNode || !Array.isArray(sourceNode.widget.children)) {
    return false;
  }

  const check = (list: FormWidget[]): boolean => {
    for (const child of list) {
      if (child.id === targetId) {
        return true;
      }
      if (Array.isArray(child.children) && check(child.children)) {
        return true;
      }
    }
    return false;
  };

  return check(sourceNode.widget.children);
}

/**
 * 拖拽类型守卫核心判定函数（validateDropTarget）。
 *
 * 遵循 ADR-0044 第 6 条规则：
 * 1. 禁止将容器放置入自身内部；
 * 2. 禁止将容器放置入自身的子孙节点内部（避免 DOM 结构撕裂与自引循环）；
 * 3. 普通非容器控件禁止作为 drop target 接收子节点；
 * 4. 明细子表单 (DataContainer) 内部禁止再次嵌套 DataContainer (SubForm)，亦禁止嵌套 Tabs/Wizard 等高阶容器。
 *
 * @param source 拖拽的源图元或节点信息
 * @param targetParent 目标父级容器实体（为 null 时代表根画布列表）
 * @param allWidgets 完整控件树（用于深度寻址父子血缘关系）
 */
export function validateDropTarget(
  source: {
    id?: string;
    type: string;
    isContainer?: boolean;
    isCollection?: boolean;
    containerType?: ContainerType;
  },
  targetParent: FormWidget | null,
  allWidgets: FormWidget[] = [],
): DropValidationResult {
  // 1. 拖入根画布：允许任意合法节点
  if (targetParent === null) {
    return { allowed: true };
  }

  // 2. 禁止将自身拖入自身内部
  if (source.id && targetParent.id === source.id) {
    return {
      allowed: false,
      reason: '不能将容器拖入其自身内部',
    };
  }

  // 3. 禁止将节点拖入其自身的子孙节点树内
  if (source.id && allWidgets.length > 0) {
    if (isDescendantOf(source.id, targetParent.id, allWidgets)) {
      return {
        allowed: false,
        reason: '不能将容器拖入其子孙节点内部',
      };
    }
  }

  // 4. 目标节点必须是容器或集合
  const isTargetContainer = Boolean(
    targetParent.isContainer ||
    targetParent.isCollection ||
    targetParent.type === 'grid' ||
    targetParent.type === 'card' ||
    targetParent.type === 'subform',
  );

  if (!isTargetContainer) {
    return {
      allowed: false,
      reason: `目标节点 [${targetParent.label || targetParent.type}] 不是容器，无法容纳子控件`,
    };
  }

  // 5. 针对明细数据容器 (DataContainer: SubForm) 的严格隔离守卫
  const isTargetDataContainer = Boolean(
    targetParent.isCollection ||
    targetParent.containerType === 'data' ||
    targetParent.type === 'subform',
  );

  if (isTargetDataContainer) {
    // 5.1 严禁在 SubForm 内嵌套 SubForm
    const isSourceDataContainer = Boolean(
      source.isCollection || source.containerType === 'data' || source.type === 'subform',
    );
    if (isSourceDataContainer) {
      return {
        allowed: false,
        reason: '明细子表单内部禁止再次嵌套明细子表单容器',
      };
    }

    // 5.2 严禁在 SubForm 内嵌套 Tabs 或 Wizard 高阶容器
    if (source.type === 'tabs' || source.type === 'wizard') {
      return {
        allowed: false,
        reason: '明细子表单内部禁止嵌套标签页或分步向导高阶容器',
      };
    }
  }

  return { allowed: true };
}
