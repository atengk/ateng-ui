/**
 * useSelection 跨页多选状态机类型契约定义。
 *
 * @author Ateng
 * @since 2026-10-23
 */

import type { ComputedRef } from 'vue';

/**
 * useSelection 构造选项契约。
 *
 * @template T 数据行实体类型
 */
export interface UseSelectionOptions<T = Record<string, unknown>> {
  /**
   * 行数据的唯一标识字段名或 Getter 提取函数。
   * 默认读取 'id'。所有提取的键值将自动转换为字符串存储，确保 64 位雪花 Long ID 大数防截断。
   *
   * @default 'id'
   */
  rowKey?: string | ((item: T) => string | number | bigint);

  /**
   * 初始默认已选中的行数据列表。
   *
   * @default []
   */
  initialSelected?: T[];
}

/**
 * useSelection 状态机返回值契约。
 *
 * @template T 数据行实体类型
 */
export interface UseSelectionResult<T = Record<string, unknown>> {
  /**
   * 当前选中的唯一键集合列表（统一规范为 string 类型，防大数失真）。
   */
  selectedKeys: ComputedRef<string[]>;

  /**
   * 当前已选中的实体对象缓存列表。
   */
  selectedRows: ComputedRef<T[]>;

  /**
   * 当前已选中的总项数。
   */
  selectedCount: ComputedRef<number>;

  /**
   * 判断指定行是否已被选中。
   *
   * @param row 待判断的数据行实体
   */
  isSelected: (row: T) => boolean;

  /**
   * 判断指定键是否已被选中。
   *
   * @param key 待判断的行主键
   */
  isKeySelected: (key: string | number | bigint) => boolean;

  /**
   * 选中单行或批量选中多行。操作具备幂等性。
   *
   * @param rows 待选中的单行或多行数组
   */
  select: (rows: T | T[]) => void;

  /**
   * 取消选中单行或多行。
   *
   * @param rows 待取消选中的单行或多行数组
   */
  deselect: (rows: T | T[]) => void;

  /**
   * 切换单行选中状态。
   *
   * @param row 待切换的数据行实体
   */
  toggle: (row: T) => void;

  /**
   * 清空所有选中项与跨页缓存。
   */
  clear: () => void;

  /**
   * 批量全选指定数据集（通常传入当前页全部数据或待全选集合）。
   *
   * @param rows 待全选的数据行数组
   */
  selectAll: (rows: T[]) => void;

  /**
   * 结合最新获取的分页数据，同步刷新缓存中的实体对象属性（保留已选状态并更新引用）。
   *
   * @param currentData 当前页最新数据列表
   */
  syncWithData: (currentData: T[]) => void;
}
