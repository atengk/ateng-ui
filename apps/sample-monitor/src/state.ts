/**
 * sample-monitor 演示状态与本地 Mock APM 接收存储。
 *
 * @author Ateng
 * @since 2026-10-31
 */

import { reactive } from 'vue';
import type { MonitorEvent } from '@atengk/monitor';

export interface SampleMonitorState {
  events: MonitorEvent[];
  maxEvents: number;
  activeTraceId: string;
}

export const sampleState = reactive<SampleMonitorState>({
  events: [],
  maxEvents: 50,
  activeTraceId: 'trace-demo-init',
});

/**
 * 本地 Mock APM 事件接收分发器。
 *
 * @param event 接收到的监控遥测事件
 */
export function pushMonitorEvent(event: MonitorEvent): void {
  sampleState.events.unshift(event);
  if (sampleState.events.length > sampleState.maxEvents) {
    sampleState.events.pop();
  }
}

/**
 * 批量注入监控事件。
 *
 * @param incomingEvents 事件列表
 */
export function pushMonitorEvents(incomingEvents: MonitorEvent[]): void {
  for (const e of incomingEvents) {
    pushMonitorEvent(e);
  }
}

/**
 * 清空已收集的事件列表。
 */
export function clearMonitorEvents(): void {
  sampleState.events.length = 0;
}
