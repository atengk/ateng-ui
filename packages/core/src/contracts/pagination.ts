/**
 * 分页查询参数与分页响应数据实体契约。
 *
 * @author Ateng
 * @since 2026-10-19
 */

/**
 * 统一分页查询入参契约对象。
 */
export interface PageQuery {
  /**
   * 当前页码（从 1 开始）。
   */
  pageNum?: number;

  /**
   * 每页记录数限制。
   */
  pageSize?: number;

  /**
   * 排序字段属性名。
   */
  sortField?: string;

  /**
   * 排序方向是否为升序（true 为升序 ASC，false 为降序 DESC）。
   */
  sortAsc?: boolean;
}

/**
 * 统一分页响应实体契约。
 */
export interface PageResult<T = unknown> {
  /**
   * 数据列表集合（严格保证为数组，绝不为 null 或 undefined）。
   */
  list: T[];

  /**
   * 满足查询条件的总记录数。
   */
  total: number;
}

/**
 * 构建符合空安全保底契约的分页响应实体。
 *
 * 无论后端或外部数据传入 null 还是 undefined，内部统一保底返回空数组 []，
 * 彻底杜绝调用方访问 list 属性时发生空指针异常。
 *
 * @param list 数据列表集合，若传入空值自动保底为 []
 * @param total 总记录数，默认保底为 0
 * @returns 具备空安全防线的分页响应实体
 */
export function createPageResult<T>(list?: T[] | null, total: number = 0): PageResult<T> {
  const safeList = Array.isArray(list) ? list : [];
  const safeTotal =
    typeof total === 'number' && !Number.isNaN(total) && total >= 0 ? total : safeList.length;

  return {
    list: safeList,
    total: safeTotal,
  };
}
