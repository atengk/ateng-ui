/**
 * 快捷自然时间跨度预置计算工具集。
 *
 * 遵循常用业务惯例：
 * - 起始时间统一对齐至当天 00:00:00；
 * - 结束时间统一对齐至当天 23:59:59；
 * - 周粒度遵循 ISO/中式习惯（周一为第一天，周日为第七天）。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import type { DateRangeShortcut } from './types';

/**
 * 获取今天的时间跨度 [00:00:00, 23:59:59]。
 *
 * @param baseDate 基准时间（默认为当前实时时间）
 */
export function getTodayRange(baseDate: Date = new Date()): [Date, Date] {
  const start = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
    0,
    0,
    0,
    0,
  );
  const end = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
    23,
    59,
    59,
    0,
  );
  return [start, end];
}

/**
 * 获取昨天的时间跨度 [00:00:00, 23:59:59]。
 *
 * @param baseDate 基准时间（默认为当前实时时间）
 */
export function getYesterdayRange(baseDate: Date = new Date()): [Date, Date] {
  const d = new Date(baseDate);
  d.setDate(d.getDate() - 1);
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 0);
  return [start, end];
}

/**
 * 获取近 7 天的时间跨度（包含今天共 7 天，从 6 天前 00:00:00 至 今天 23:59:59）。
 *
 * @param baseDate 基准时间（默认为当前实时时间）
 */
export function getLast7DaysRange(baseDate: Date = new Date()): [Date, Date] {
  const d = new Date(baseDate);
  d.setDate(d.getDate() - 6);
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const end = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
    23,
    59,
    59,
    0,
  );
  return [start, end];
}

/**
 * 获取近 30 天的时间跨度（包含今天共 30 天，从 29 天前 00:00:00 至 今天 23:59:59）。
 *
 * @param baseDate 基准时间（默认为当前实时时间）
 */
export function getLast30DaysRange(baseDate: Date = new Date()): [Date, Date] {
  const d = new Date(baseDate);
  d.setDate(d.getDate() - 29);
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const end = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
    23,
    59,
    59,
    0,
  );
  return [start, end];
}

/**
 * 获取本周的时间跨度（本周一 00:00:00 至 本周日 23:59:59）。
 *
 * @param baseDate 基准时间（默认为当前实时时间）
 */
export function getThisWeekRange(baseDate: Date = new Date()): [Date, Date] {
  const day = baseDate.getDay();
  // 0 为周日，此时与周一差距为 -6；1~6 为周一至周六
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() + diffToMonday);

  const start = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate(), 0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const end = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate(), 23, 59, 59, 0);

  return [start, end];
}

/**
 * 获取上周的时间跨度（上周一 00:00:00 至 上周日 23:59:59）。
 *
 * @param baseDate 基准时间（默认为当前实时时间）
 */
export function getLastWeekRange(baseDate: Date = new Date()): [Date, Date] {
  const [thisWeekMonday] = getThisWeekRange(baseDate);
  const lastMonday = new Date(thisWeekMonday);
  lastMonday.setDate(thisWeekMonday.getDate() - 7);

  const start = new Date(
    lastMonday.getFullYear(),
    lastMonday.getMonth(),
    lastMonday.getDate(),
    0,
    0,
    0,
    0,
  );
  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastMonday.getDate() + 6);
  const end = new Date(
    lastSunday.getFullYear(),
    lastSunday.getMonth(),
    lastSunday.getDate(),
    23,
    59,
    59,
    0,
  );

  return [start, end];
}

/**
 * 获取本月的时间跨度（当月 1 日 00:00:00 至 当月最后一天 23:59:59）。
 *
 * @param baseDate 基准时间（默认为当前实时时间）
 */
export function getThisMonthRange(baseDate: Date = new Date()): [Date, Date] {
  const start = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1, 0, 0, 0, 0);
  // 当月最后一天即下个月第 0 天
  const end = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0, 23, 59, 59, 0);
  return [start, end];
}

/**
 * 生成默认的高频快捷时间跨度配置项列表。
 */
export function getDefaultDateRangeShortcuts(): DateRangeShortcut[] {
  return [
    { text: '今天', value: () => getTodayRange() },
    { text: '昨天', value: () => getYesterdayRange() },
    { text: '近7天', value: () => getLast7DaysRange() },
    { text: '近30天', value: () => getLast30DaysRange() },
    { text: '本周', value: () => getThisWeekRange() },
    { text: '上周', value: () => getLastWeekRange() },
    { text: '本月', value: () => getThisMonthRange() },
  ];
}
