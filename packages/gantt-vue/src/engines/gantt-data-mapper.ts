/**
 * 双模任务数据映射适配引擎 (GanttDataMapper)。
 *
 * 遵循 ADR-0050 规约，自适应兼容“带 parentId 的扁平一维数组”与“嵌套 children 的树形对象数组”，
 * 并在双向转换与增量回写过程中 100% 保全任意未在列定义的业务自定义扩展属性。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import type { GanttTaskRecord } from '../types';

export interface GanttDataMapperOptions {
  /** 任务主键唯一标识字段名，默认 'id' */
  keyField?: string;
  /** 父任务外键引用字段名，默认 'parentId' */
  parentField?: string;
  /** 嵌套子任务列表字段名，默认 'children' */
  childrenField?: string;
}

export class GanttDataMapper {
  private readonly keyField: string;
  private readonly parentField: string;
  private readonly childrenField: string;

  constructor(options: GanttDataMapperOptions = {}) {
    this.keyField = options.keyField ?? 'id';
    this.parentField = options.parentField ?? 'parentId';
    this.childrenField = options.childrenField ?? 'children';
  }

  /**
   * 嗅探输入数组是否为扁平一维结构。
   * 当数组为空、包含 parentId 字段或无任何节点的 children 为非空数组时，判定为扁平结构。
   *
   * @param tasks 待检测的任务数组
   * @returns 是否为扁平结构
   */
  static isFlatStructure(tasks: unknown[]): boolean {
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return true;
    }

    let hasChildren = false;
    let hasParentId = false;

    for (const item of tasks) {
      if (item && typeof item === 'object') {
        const record = item as Record<string, unknown>;
        if (Array.isArray(record.children) && record.children.length > 0) {
          hasChildren = true;
        }
        if (record.parentId !== undefined && record.parentId !== null && record.parentId !== '') {
          hasParentId = true;
        }
      }
    }

    if (hasChildren) {
      return false;
    }

    return hasParentId || true;
  }

  /**
   * 将扁平带 parentId 的一维任务列表转换为层级树形结构。
   * 100% 保全全部额外业务字段。
   *
   * @param flatList 扁平任务数组
   * @returns 具有嵌套 children 的根节点树形数组
   */
  toTree<T extends GanttTaskRecord = GanttTaskRecord>(flatList: T[]): T[] {
    if (!Array.isArray(flatList) || flatList.length === 0) {
      return [];
    }

    const keyField = this.keyField;
    const parentField = this.parentField;
    const childrenField = this.childrenField;

    const nodeMap = new Map<string | number, T>();
    const roots: T[] = [];

    // 1. 建立节点副本索引映射，保留所有原有字段
    for (const item of flatList) {
      const id = (item as Record<string, unknown>)[keyField] as string | number;
      if (id !== undefined && id !== null) {
        // 创建浅拷贝并初始化子节点容器
        const clone = { ...item };
        // 若原始节点无 children 则暂不污染，按需在追加时挂载
        nodeMap.set(id, clone);
      }
    }

    // 2. 组装父子树形拓扑结构
    for (const item of flatList) {
      const id = (item as Record<string, unknown>)[keyField] as string | number;
      const parentId = (item as Record<string, unknown>)[parentField] as
        string | number | undefined | null;

      const currentNode = nodeMap.get(id);
      if (!currentNode) continue;

      if (parentId !== undefined && parentId !== null && parentId !== '' && nodeMap.has(parentId)) {
        const parentNode = nodeMap.get(parentId)! as Record<string, unknown>;
        if (!Array.isArray(parentNode[childrenField])) {
          parentNode[childrenField] = [];
        }
        (parentNode[childrenField] as T[]).push(currentNode);
      } else {
        roots.push(currentNode);
      }
    }

    return roots;
  }

  /**
   * 将具有嵌套 children 的树形结构递归打平成带 parentId 的一维数组。
   * 100% 保全子节点原有的扩展属性，同时剥除内嵌 children 集合以避免环形结构。
   *
   * @param tree 树形任务数组
   * @returns 打平后的一维任务数组
   */
  toFlat<T extends GanttTaskRecord = GanttTaskRecord>(tree: T[]): T[] {
    if (!Array.isArray(tree) || tree.length === 0) {
      return [];
    }

    const keyField = this.keyField;
    const parentField = this.parentField;
    const childrenField = this.childrenField;

    const flatList: T[] = [];

    const traverse = (nodes: T[], currentParentId?: string | number) => {
      for (const node of nodes) {
        const id = (node as Record<string, unknown>)[keyField] as string | number;
        const children = (node as Record<string, unknown>)[childrenField] as T[] | undefined;

        // 浅拷贝节点属性
        const flatNode = { ...node } as Record<string, unknown>;

        // 设定父节点外键
        if (currentParentId !== undefined && currentParentId !== null) {
          flatNode[parentField] = currentParentId;
        }

        // 扁平列表中移除 children 引用
        delete flatNode[childrenField];

        flatList.push(flatNode as T);

        if (Array.isArray(children) && children.length > 0) {
          traverse(children, id);
        }
      }
    };

    traverse(tree);
    return flatList;
  }

  /**
   * 无论输入是扁平还是嵌套树，自适应归一化为标准的嵌套树形数组。
   *
   * @param tasks 原始任务数据集
   * @returns 标准化树形任务结构
   */
  normalize<T extends GanttTaskRecord = GanttTaskRecord>(tasks: T[]): T[] {
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return [];
    }

    if (GanttDataMapper.isFlatStructure(tasks)) {
      return this.toTree(tasks);
    }

    // 已是树形结构，进行不可变深度浅拷贝规范化
    return this.cloneTree(tasks);
  }

  /**
   * 在原始任务数据集中安全增量更新目标任务，自动适配并保持原始输入形态（扁平 vs 树形）。
   * 100% 保留未被修改的扩展业务属性。
   *
   * @param originalTasks 原始数据集
   * @param updatedTask 发生变动的任务对象
   * @returns 增量更新后的全新不可变数据集
   */
  updateTaskInList<T extends GanttTaskRecord = GanttTaskRecord>(
    originalTasks: T[],
    updatedTask: T,
  ): T[] {
    if (!Array.isArray(originalTasks) || originalTasks.length === 0) {
      return updatedTask ? [{ ...updatedTask }] : [];
    }

    const keyField = this.keyField;
    const targetId = (updatedTask as Record<string, unknown>)[keyField] as string | number;
    if (targetId === undefined || targetId === null) {
      return [...originalTasks];
    }

    const isFlat = GanttDataMapper.isFlatStructure(originalTasks);

    if (isFlat) {
      let matched = false;
      const updatedList = originalTasks.map(item => {
        const id = (item as Record<string, unknown>)[keyField] as string | number;
        if (id === targetId) {
          matched = true;
          return {
            ...item,
            ...updatedTask,
          };
        }
        return item;
      });

      if (!matched) {
        updatedList.push({ ...updatedTask });
      }

      return updatedList;
    }

    // 树形结构递归更新
    const updateInTree = (nodes: T[]): T[] => {
      return nodes.map(node => {
        const id = (node as Record<string, unknown>)[keyField] as string | number;
        const children = (node as Record<string, unknown>)[this.childrenField] as T[] | undefined;

        if (id === targetId) {
          const merged = {
            ...node,
            ...updatedTask,
          };
          // 确保子节点引用不被覆盖丢失
          if (Array.isArray(children)) {
            (merged as Record<string, unknown>)[this.childrenField] = updateInTree(children);
          }
          return merged;
        }

        if (Array.isArray(children) && children.length > 0) {
          return {
            ...node,
            [this.childrenField]: updateInTree(children),
          };
        }

        return node;
      });
    };

    return updateInTree(originalTasks);
  }

  /**
   * 递归克隆树形结构，确保不可变数据流。
   */
  private cloneTree<T extends GanttTaskRecord = GanttTaskRecord>(tree: T[]): T[] {
    return tree.map(node => {
      const clone = { ...node };
      const children = (clone as Record<string, unknown>)[this.childrenField] as T[] | undefined;
      if (Array.isArray(children) && children.length > 0) {
        (clone as Record<string, unknown>)[this.childrenField] = this.cloneTree(children);
      }
      return clone;
    });
  }
}
