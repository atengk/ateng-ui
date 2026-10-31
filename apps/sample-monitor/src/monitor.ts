/**
 * sample-monitor 监控内核初始化与插件编排。
 *
 * @author Ateng
 * @since 2026-10-31
 */

import {
  initMonitor,
  createErrorPlugin,
  createWhiteScreenPlugin,
  createPerformancePlugin,
  createBreadcrumbPlugin,
  createNetworkPlugin,
  type MonitorKernelInstance,
  type MonitorEvent,
} from '@atengk/monitor';
import { pushMonitorEvents } from './state';

let monitorInstance: MonitorKernelInstance | undefined;

/**
 * 启动并获取展厅专属全局监控实例。
 *
 * @returns MonitorKernelInstance
 */
export function setupSampleMonitor(): MonitorKernelInstance {
  if (monitorInstance) {
    return monitorInstance;
  }

  monitorInstance = initMonitor({
    appVersion: '0.1.0-sample',
    environment: 'demo',
    batchSize: 1, // 展厅即时展示，设为 1
    flushInterval: 500,
    maxErrorsPerSession: 10, // 展厅设置阈值为 10，方便演示会话熔断
    reporter: (events: MonitorEvent[]) => {
      pushMonitorEvents(events);
    },
    plugins: [
      createBreadcrumbPlugin({ maxBreadcrumbs: 30 }),
      createErrorPlugin({
        enableJsError: true,
        enablePromiseError: true,
        enableResourceError: true,
        enableConsoleError: true,
      }),
      createWhiteScreenPlugin({
        rootSelectors: ['html', 'body', '#app'],
        whitelistSelectors: ['.skeleton-box', '.loading-mask'],
        initialDelay: 50,
      }),
      createPerformancePlugin({
        vitals: true,
        navigation: true,
        longtask: true,
        jankThreshold: 200,
      }),
      createNetworkPlugin({
        enableFetch: true,
        enableXhr: true,
        recordHttpError: true,
      }),
    ],
  });

  return monitorInstance;
}

/**
 * 销毁当前演示监控实例。
 */
export async function destroySampleMonitor(): Promise<void> {
  if (monitorInstance) {
    await monitorInstance.destroy();
    monitorInstance = undefined;
  }
}
