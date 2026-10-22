/**
 * 表格列 VNode 静态与动态分析提取工具。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { Comment, Fragment, type VNode } from 'vue';
import type { TableColumnConfig } from '../types';

/**
 * 递归扁平化解析插槽中的列 VNodes，提取列元数据清单。
 *
 * @param vnodes 原始 VNode 列表
 * @returns 提取出的列配置数组
 */
export function parseColumnVNodes(vnodes: VNode[]): TableColumnConfig[] {
  const result: TableColumnConfig[] = [];

  function traverse(nodes: VNode[]) {
    for (const node of nodes) {
      if (!node || node.type === Comment) {
        continue;
      }
      if (node.type === Fragment && Array.isArray(node.children)) {
        traverse(node.children as VNode[]);
        continue;
      }
      const props = (node.props ?? {}) as Record<string, unknown>;
      // 判断是否包含列的核心特征属性（prop / label / type）
      if (props.prop !== undefined || props.label !== undefined || props.type !== undefined) {
        result.push({
          prop: typeof props.prop === 'string' ? props.prop : undefined,
          label: typeof props.label === 'string' ? props.label : undefined,
          width: props.width as string | number | undefined,
          minWidth: (props['min-width'] ?? props.minWidth) as string | number | undefined,
          fixed: props.fixed as boolean | 'left' | 'right' | undefined,
          sortable: props.sortable as boolean | 'custom' | undefined,
          align: props.align as 'left' | 'center' | 'right' | undefined,
          type: props.type as 'default' | 'selection' | 'index' | 'expand' | undefined,
          visible: props.visible !== false,
        });
      }
    }
  }

  traverse(vnodes);
  return result;
}

/**
 * 插槽列过滤、排序与属性注入选项。
 *
 * @author Ateng
 * @since 2026-10-22
 */
export interface ColumnTransformOptions {
  /**
   * 列 Key 对应显隐状态映射字典。
   */
  visibilityMap: Map<string, boolean>;
  /**
   * 列 Key 期望的渲染顺序数组。
   */
  orderList?: string[];
  /**
   * 列 Key 对应动态宽度映射字典。
   */
  widthMap?: Map<string, string | number>;
  /**
   * 是否启用列宽拖拽（未在列节点上显式设置 resizable 时生效）。
   */
  resizable?: boolean;
}

/**
 * 根据列显隐状态字典，递归过滤插槽 VNodes 中的不可见列节点。
 *
 * @param vnodes 原始插槽 VNode 列表
 * @param optionsOrVisibilityMap 列转换选项或列 Key 对应显隐状态映射
 * @param legacyWidthMap 可选的列 Key 对应动态宽度映射
 * @returns 过滤后的有效 VNode 列表
 */
export function filterColumnVNodes(
  vnodes: VNode[],
  optionsOrVisibilityMap: Map<string, boolean> | ColumnTransformOptions,
  legacyWidthMap?: Map<string, string | number>,
): VNode[] {
  const options: ColumnTransformOptions =
    optionsOrVisibilityMap instanceof Map
      ? { visibilityMap: optionsOrVisibilityMap, widthMap: legacyWidthMap }
      : optionsOrVisibilityMap;

  const { visibilityMap, widthMap, resizable } = options;
  const result: VNode[] = [];

  for (const node of vnodes) {
    if (!node || node.type === Comment) {
      continue;
    }
    if (node.type === Fragment && Array.isArray(node.children)) {
      const filteredChildren = filterColumnVNodes(node.children as VNode[], options);
      result.push({ ...node, children: filteredChildren });
      continue;
    }
    const props = (node.props ?? {}) as Record<string, unknown>;
    const key = (props.prop as string) || (props.label as string) || (props.type as string) || '';
    if (key && visibilityMap.get(key) === false) {
      continue;
    }

    let finalProps = props;

    // 跨页多选保持增强：如果为 selection 列且未显式指定 reserve-selection，则默认开启
    if (
      props.type === 'selection' &&
      props.reserveSelection === undefined &&
      props['reserve-selection'] === undefined
    ) {
      finalProps = {
        ...finalProps,
        reserveSelection: true,
      };
    }

    // 列宽自定义记忆覆盖：如果 widthMap 中存在该列的自定义宽度，则动态覆盖
    if (key && widthMap && widthMap.has(key)) {
      finalProps = {
        ...finalProps,
        width: widthMap.get(key),
      };
    }

    // 列宽拖拽可调性：如果指定了全局 resizable 且节点未显式设置 resizable，则注入
    if (resizable !== undefined && props.resizable === undefined) {
      finalProps = {
        ...finalProps,
        resizable,
      };
    }

    result.push(finalProps !== props ? { ...node, props: finalProps } : node);
  }

  return result;
}

/**
 * 根据列显隐状态字典与排序顺序，过滤并排序插槽 VNodes 中的列节点。
 *
 * @param vnodes 原始插槽 VNode 列表
 * @param optionsOrVisibilityMap 列转换选项或列 Key 对应显隐状态映射
 * @param orderList 列 Key 期望的渲染顺序数组
 * @param widthMap 可选的列 Key 对应动态宽度映射
 * @returns 过滤与排重后的有效 VNode 列表
 */
export function filterAndSortColumnVNodes(
  vnodes: VNode[],
  optionsOrVisibilityMap: Map<string, boolean> | ColumnTransformOptions,
  orderList?: string[],
  widthMap?: Map<string, string | number>,
): VNode[] {
  const options: ColumnTransformOptions =
    optionsOrVisibilityMap instanceof Map
      ? { visibilityMap: optionsOrVisibilityMap, orderList, widthMap }
      : optionsOrVisibilityMap;

  const filtered = filterColumnVNodes(vnodes, options);
  const activeOrderList = options.orderList;
  if (!activeOrderList || activeOrderList.length === 0) {
    return filtered;
  }
  const orderMap = new Map<string, number>();
  activeOrderList.forEach((key, idx) => orderMap.set(key, idx));

  return [...filtered].sort((a, b) => {
    const propsA = (a.props ?? {}) as Record<string, unknown>;
    const keyA =
      (propsA.prop as string) || (propsA.label as string) || (propsA.type as string) || '';
    const propsB = (b.props ?? {}) as Record<string, unknown>;
    const keyB =
      (propsB.prop as string) || (propsB.label as string) || (propsB.type as string) || '';

    const indexA = orderMap.has(keyA) ? orderMap.get(keyA)! : 9999;
    const indexB = orderMap.has(keyB) ? orderMap.get(keyB)! : 9999;
    return indexA - indexB;
  });
}
