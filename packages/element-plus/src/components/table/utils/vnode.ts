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
 * 根据列显隐状态字典，递归过滤插槽 VNodes 中的不可见列节点。
 *
 * @param vnodes 原始插槽 VNode 列表
 * @param visibilityMap 列 Key 对应显隐状态映射
 * @returns 过滤后的有效 VNode 列表
 */
export function filterColumnVNodes(vnodes: VNode[], visibilityMap: Map<string, boolean>): VNode[] {
  const result: VNode[] = [];

  for (const node of vnodes) {
    if (!node || node.type === Comment) {
      continue;
    }
    if (node.type === Fragment && Array.isArray(node.children)) {
      const filteredChildren = filterColumnVNodes(node.children as VNode[], visibilityMap);
      result.push({ ...node, children: filteredChildren });
      continue;
    }
    const props = (node.props ?? {}) as Record<string, unknown>;
    const key = (props.prop as string) || (props.label as string) || (props.type as string) || '';
    if (key && visibilityMap.get(key) === false) {
      continue;
    }
    result.push(node);
  }

  return result;
}
