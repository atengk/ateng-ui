/**
 * 分页查询参数与分页响应数据实体契约。
 *
 * @author Ateng
 * @since 2026-10-19
 */

/**
 * 排序方向枚举。
 */
export type SortDirection = 'ASC' | 'DESC';

/**
 * 统一多字段排序项契约（对齐 ateng-boot-core SortItem）。
 */
export interface SortItem {
  /**
   * 排序字段属性名。
   */
  property: string;

  /**
   * 排序方向（ASC 升序，DESC 降序）。
   */
  direction: SortDirection;
}

/**
 * 统一分页查询入参契约对象（对齐 ateng-boot-core PageQuery）。
 */
export interface PageQuery {
  /**
   * 当前页码（从 1 开始）。
   */
  current?: number;

  /**
   * 每页记录数限制。
   */
  size?: number;

  /**
   * 多字段排序规则列表。
   */
  sorts?: SortItem[];
}

/**
 * 统一分页响应实体契约（对齐 ateng-boot-core PageResult）。
 */
export interface PageResult<T = unknown> {
  /**
   * 数据列表集合（严格保证为数组，绝不为 null 或 undefined）。
   */
  records: T[];

  /**
   * 满足查询条件的总记录数。
   */
  total: number;

  /**
   * 每页记录数限制。
   */
  size?: number;

  /**
   * 当前页码（从 1 开始）。
   */
  current?: number;

  /**
   * 总页数。
   */
  pages?: number;
}

/**
 * 创建分页响应可选元数据。
 */
export interface PageResultMeta {
  /**
   * 当前页码（从 1 开始）。
   */
  current?: number;

  /**
   * 每页记录数限制。
   */
  size?: number;

  /**
   * 总页数。
   */
  pages?: number;
}

/**
 * 构建符合空安全保底契约的分页响应实体。
 *
 * 无论后端或外部数据传入 null 还是 undefined，内部统一保底返回空数组 []，
 * 彻底杜绝调用方访问 records 属性时发生空指针异常。
 *
 * @param records 数据列表集合，若传入空值自动保底为 []
 * @param total 总记录数，默认保底为 0
 * @param meta 可选分页元数据（current / size / pages）
 * @returns 具备空安全防线的分页响应实体
 */
export function createPageResult<T>(
  records?: T[] | null,
  total: number = 0,
  meta?: PageResultMeta,
): PageResult<T> {
  const safeRecords = Array.isArray(records) ? records : [];
  const safeTotal =
    typeof total === 'number' && !Number.isNaN(total) && total >= 0 ? total : safeRecords.length;

  const result: PageResult<T> = {
    records: safeRecords,
    total: safeTotal,
  };

  if (meta?.current !== undefined) {
    result.current = meta.current;
  }
  if (meta?.size !== undefined) {
    result.size = meta.size;
  }
  if (meta?.pages !== undefined) {
    result.pages = meta.pages;
  }

  return result;
}
