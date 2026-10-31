# @atengk/monitor

面向现代 Web 应用与企业级系统的高可用纯 TypeScript 全链路前端可观测性与异常监控基础设施。

---

## 维度零：特性与公共 API 全景速查矩阵

| 特性分类         | 特性名称               | 核心门面 / 函数 / 类型                                  | 关键参数 / Props / 返回类型                                                | 核心行为说明                                                                    | 锚定验证源头 (*Test / Sample)                     |
| :--------------- | :--------------------- | :------------------------------------------------------ | :------------------------------------------------------------------------- | :------------------------------------------------------------------------------ | :------------------------------------------------ |
| **内核门面**     | 全局监控初始化         | `initMonitor`                                           | `options?: MonitorOptions => MonitorKernelInstance`                        | 创建并初始化监控微内核单例，挂载核心插件流水线                                  | [kernel.test.ts](./test/kernel.test.ts)           |
| **内核门面**     | 活跃内核实例获取       | `getActiveMonitor`                                      | `() => MonitorKernelInstance \| undefined`                                 | 获取当前全局唯一活跃的微内核单例句柄                                            | [kernel.test.ts](./test/kernel.test.ts)           |
| **内核门面**     | 全局活跃内核销毁       | `destroyActiveMonitor`                                  | `() => Promise<void>`                                                      | 逆序注销全部插件，清空上下文与队列，重置全局单例句柄                            | [kernel.test.ts](./test/kernel.test.ts)           |
| **内核门面**     | 监控内核类实现         | `MonitorKernel`                                         | `new MonitorKernel(options?: MonitorOptions)`                              | 微内核调度中心，管理插件拓扑、上下文、熔断器与传输队列                          | [kernel.test.ts](./test/kernel.test.ts)           |
| **上下文管理**   | 独立上下文状态存储     | `createContextStore`                                    | `(options?: MonitorOptions) => ContextStoreInstance`                       | 维护用户、租户、Tags 与系统环境快照，提供防御性克隆与快照提取                   | [context.test.ts](./test/context.test.ts)         |
| **异常捕获插件** | 运行时异常收集插件     | `createErrorPlugin`, `ErrorPluginOptions`               | `(options?: ErrorPluginOptions) => MonitorPlugin`                          | 捕获全局 JS 运行时异常、Promise 拒付、静态资源 404 与 console.error 代理        | [error.test.ts](./test/error.test.ts)             |
| **异常捕获插件** | Vue 错误捕获辅助       | `captureVueError`                                       | `(kernel, err, instance?, info?) => void`                                  | 纯 TS 无损提取 Vue 组件名与生命周期阶段信息，零 Vue 物理运行时依赖              | [error.test.ts](./test/error.test.ts)             |
| **异常捕获插件** | Vue 错误处理器工厂     | `createVueErrorHandler`                                 | `(kernel) => (err, instance, info) => void`                                | 便捷导出符合 Vue `app.config.errorHandler` 签名的错误处理适配器                 | [error.test.ts](./test/error.test.ts)             |
| **DOM 与组件**   | 选择器与组件名解析     | `getElementSelector`, `getVueComponentName`             | `(el: Element) => string`, `(inst?: unknown) => string`                    | 提取格式化选择器路径与防御性提取 Vue 内部组件名称                               | [error.test.ts](./test/error.test.ts)             |
| **白屏感知插件** | 视口点阵白屏检测插件   | `createWhiteScreenPlugin`, `WhiteScreenPluginOptions`   | `(options?: WhiteScreenPluginOptions) => WhiteScreenPluginInstance`        | 3×3 视口点阵采样、T1/T2 两阶段防抖复验与白名单祖先追溯判定                      | [whiteScreen.test.ts](./test/whiteScreen.test.ts) |
| **白屏感知插件** | 视口点阵单次采样       | `sampleViewport`                                        | `(roots?, whitelists?, threshold?) => { isSuspected, points, viewport }`   | 纯几何 3×3 网格九点采样，输出各采样点根容器与白名单命中诊断                     | [whiteScreen.test.ts](./test/whiteScreen.test.ts) |
| **白屏感知插件** | 选择器匹配辅助         | `isDirectRootElement`, `matchesAnySelector`             | `(element, selectors) => boolean`                                          | 根挂载容器直接匹配判定与向上追溯整条祖先链的白名单匹配判定                      | [whiteScreen.test.ts](./test/whiteScreen.test.ts) |
| **性能感知插件** | 性能与体验指标采集插件 | `createPerformancePlugin`, `PerformancePluginOptions`   | `(options?: PerformancePluginOptions) => MonitorPlugin`                    | 采集 W3C Web Vitals、Navigation 关键阶段耗时与 >50ms 长任务卡顿告警             | [performance.test.ts](./test/performance.test.ts) |
| **性能感知插件** | Web Vitals 官方评级    | `calculateRating`                                       | `(name: string, value: number) => 'good' \| 'needs-improvement' \| 'poor'` | 依据 Google 官方阈值对 FCP/LCP/CLS/INP/TTFB/Jank 输出三态评级                   | [performance.test.ts](./test/performance.test.ts) |
| **性能感知插件** | 导航阶段耗时解析       | `extractNavigationMetrics`                              | `(entry: PerformanceNavigationTiming) => NavigationMetrics`                | 从 NavigationTiming 中解析 DNS、TCP、SSL、TTFB、Download、DOMReady 等           | [performance.test.ts](./test/performance.test.ts) |
| **行为轨迹插件** | 面包屑与虚拟路由插件   | `createBreadcrumbPlugin`, `BreadcrumbPluginOptions`     | `(options?: BreadcrumbPluginOptions) => BreadcrumbPluginInstance`          | 维护定长环形缓冲区 (FIFO)，采集 UI 点击、SPA 虚拟路由流转与控制台输出           | [breadcrumb.test.ts](./test/breadcrumb.test.ts)   |
| **网络嗅探插件** | 原生网络嗅探采集插件   | `createNetworkPlugin`, `NetworkPluginOptions`           | `(options?: NetworkPluginOptions) => MonitorPlugin`                        | 非侵入式包装原生 Fetch 与 XHR，嗅探请求耗时、状态码与 HTTP_ERROR                | [network.test.ts](./test/network.test.ts)         |
| **Axios 协同**   | 全链路 TraceId 拦截器  | `createCoreAxiosMonitorInterceptor`                     | `(kernel) => CoreAxiosMonitorInterceptor`                                  | 自动从 `@atengk/core` Axios 响应体 `Result` 或 Header 提取 traceId 绑定至上下文 | [network.test.ts](./test/network.test.ts)         |
| **敏感数据脱敏** | URL Query 参数清洗     | `sanitizeUrl`                                           | `(url: string, sensitiveKeys?) => string`                                  | 过滤清洗 URL 中的 token、secret、password 等敏感参数为 `******`                 | [sanitizer.test.ts](./test/sanitizer.test.ts)     |
| **敏感数据脱敏** | HTTP 请求头清洗        | `sanitizeHeaders`                                       | `(headers, sensitiveHeaders?) => Record<string, string>`                   | 对 Authorization、Cookie、X-Token 等关键敏感头进行 `******` 掩码脱敏            | [sanitizer.test.ts](./test/sanitizer.test.ts)     |
| **敏感数据脱敏** | DOM 文本与输入框脱敏   | `sanitizeDomText`, `isElementMasked`                    | `(element, customMasks?) => { text, value, isMasked }`                     | 对密码输入框及带有 `[data-monitor-mask]` 或祖先脱敏容器实施掩码                 | [sanitizer.test.ts](./test/sanitizer.test.ts)     |
| **高可用防线**   | 错误特征指纹生成       | `generateErrorFingerprint`, `fnv1a`                     | `(payload: ErrorPayload) => string`                                        | 基于 FNV-1a 纳秒级哈希算法提取 name+message+file+line 唯一指纹                  | [resilience.test.ts](./test/resilience.test.ts)   |
| **高可用防线**   | 5秒窗口去重聚合器      | `ErrorDeduplicator`                                     | `new ErrorDeduplicator(options?: { windowMs?: number })`                   | 在时间窗口内过滤重复异常，计算聚合 `repeatCount` 阻断风暴上报                   | [resilience.test.ts](./test/resilience.test.ts)   |
| **高可用防线**   | 单会话熔断断路器       | `CircuitBreaker`                                        | `new CircuitBreaker(options?: { maxErrors?: number })`                     | 会话累计异常达到阈值 (默认 50) 时自动触发熔断休眠，阻断主线程阻塞               | [resilience.test.ts](./test/resilience.test.ts)   |
| **传输通道**     | 防死循环检测协议       | `isMonitorReportRequest`, `MONITOR_SKIP_HEADER`         | `(url?, headers?, reportUrl?) => boolean`                                  | 识别 `X-Ateng-Monitor-Skip: true` 或监控自身上报端点，杜绝自死循环              | [transport.test.ts](./test/transport.test.ts)     |
| **传输通道**     | 穿透式 Beacon 上报     | `sendBeaconTransport`                                   | `(url: string, events: MonitorEvent[]) => boolean`                         | 基于 `navigator.sendBeacon` 与 application/json Blob 异步穿透卸载上报           | [transport.test.ts](./test/transport.test.ts)     |
| **传输通道**     | Fetch KeepAlive 传输   | `fetchTransport`                                        | `(url: string, events: MonitorEvent[]) => Promise<boolean>`                | 基于原生 fetch 与 `keepalive: true` 的次级兜底上报通道                          | [transport.test.ts](./test/transport.test.ts)     |
| **传输通道**     | 原生 XHR 同步紧急传输  | `xhrTransport`                                          | `(url: string, events: MonitorEvent[]) => Promise<boolean>`                | 基于 XMLHttpRequest 的终极同步/异步兼容传输通道                                 | [transport.test.ts](./test/transport.test.ts)     |
| **传输通道**     | 批处理防丢缓冲队列     | `TransportQueue`                                        | `new TransportQueue(options: TransportQueueOptions)`                       | 内存队列满批次 (10) 或防抖延迟 (3s) 自动冲刷，页面卸载前紧急冲刷                | [transport.test.ts](./test/transport.test.ts)     |
| **工具套件**     | 全局唯一 UUID 生成器   | `generateId`                                            | `() => string`                                                             | 基于 `crypto.randomUUID` 或高性能位移原语生成的 UUID v4 算法                    | [kernel.test.ts](./test/kernel.test.ts)           |
| **工具套件**     | 宿主设备环境探测       | `getDeviceContext`, `getCurrentUrl`, `getDocumentTitle` | `() => DeviceContext`, `() => string`                                      | 平台中立探测浏览器屏幕分辨率、视口尺寸、UA 及当前安全 URL                       | [context.test.ts](./test/context.test.ts)         |

---

## 维度一：最小起步体验 (Happy Path)

### 1. 安装依赖

```bash
pnpm add @atengk/monitor
```

### 2. 初始化监控微内核与 Vue 3 挂载

代码逆向提取自 [apps/sample-monitor/src/main.ts](file:///d:/My/dev/ateng-ui/apps/sample-monitor/src/main.ts)：

```ts
import { createApp } from 'vue';
import {
  initMonitor,
  createErrorPlugin,
  createWhiteScreenPlugin,
  createPerformancePlugin,
  createBreadcrumbPlugin,
  createNetworkPlugin,
  createVueErrorHandler,
} from '@atengk/monitor';
import App from './App.vue';

const app = createApp(App);

// 1. 一键初始化监控微内核与预装采集插件流水线
const monitor = initMonitor({
  appVersion: '1.0.0',
  environment: 'prod',
  reportUrl: 'https://apm-gateway.company.com/api/v1/report',
  batchSize: 10,
  flushInterval: 3000,
  maxErrorsPerSession: 50,
  plugins: [
    createBreadcrumbPlugin({ maxBreadcrumbs: 30 }),
    createErrorPlugin(),
    createWhiteScreenPlugin(),
    createPerformancePlugin(),
    createNetworkPlugin(),
  ],
});

// 2. 挂载 Vue 3 全局未捕获异常适配器 (纯 TS 无损桥接)
app.config.errorHandler = createVueErrorHandler(monitor);

app.mount('#app');
```

---

## 维度二：生产扩展接管 (Customization & Extensibility)

### 1. 自定义上报执行器 SPI (Custom Reporter) 与 终极审查钩子 (beforeSend)

当默认基于 `sendBeacon` / `fetch` 的 HTTP 网关无法满足私有鉴权签名或离线 Mock 调试诉求时，可通过 `reporter` 完整接管物理发送链路：

```ts
import { initMonitor, type MonitorEvent } from '@atengk/monitor';

const monitor = initMonitor({
  // 1. 接管物理上报通道 (支持同步或异步 Promise)
  reporter: async (events: MonitorEvent[]) => {
    await fetch('/my-custom-collector', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Custom-Sign': 'SECURE_SIGNATURE_TOKEN',
      },
      body: JSON.stringify(events),
    });
  },

  // 2. beforeSend 终极过滤与二次修改逃生门
  beforeSend: (event: MonitorEvent) => {
    // 丢弃本地 localhost 测试环境的无意义网络报错
    if (
      event.type === 'network' &&
      (event.payload as { url?: string })?.url?.includes('localhost')
    ) {
      return null; // 返回 null 或 false 显式丢弃
    }
    // 注入私有业务标记
    event.context.tags.region = 'ap-southeast-1';
    return event;
  },
});
```

### 2. 编写与注册自定义微内核插件 (Custom Plugin)

微内核支持实现标准对称生命周期契约：

```ts
import { initMonitor, type MonitorKernelInstance, type MonitorPlugin } from '@atengk/monitor';

export function createAuditLogPlugin(): MonitorPlugin {
  let timer: ReturnType<typeof setInterval> | null = null;

  return {
    name: 'audit-log',

    setup(kernel: MonitorKernelInstance): void {
      // 订阅或定期采集业务心跳
      timer = setInterval(() => {
        kernel.emit({
          type: 'custom',
          level: 'info',
          payload: {
            name: 'HEARTBEAT_TICK',
            onlineTime: performance.now(),
          },
        });
      }, 60000);
    },

    teardown(kernel: MonitorKernelInstance): void {
      // 100% 确定性清理资源，杜绝内存泄漏
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    },
  };
}

// 动态热注册
const monitor = initMonitor();
monitor.registerPlugin(createAuditLogPlugin());
```

### 3. 与 `@atengk/core` Axios 实例协同提取后端 MDC TraceId

代码逆向提取自 [apps/sample-monitor/src/components/ApmTerminal.vue](file:///d:/My/dev/ateng-ui/apps/sample-monitor/src/components/ApmTerminal.vue)：

```ts
import axios from 'axios';
import { createCoreAxiosMonitorInterceptor, getActiveMonitor } from '@atengk/monitor';

const monitor = getActiveMonitor()!;
const axiosInstance = axios.create({ baseURL: '/api' });

// 一键安装拦截器，自动从响应体 Result<T>.traceId 或响应头 x-trace-id 提取并注入 ContextStore
const uninstall = createCoreAxiosMonitorInterceptor(monitor).install(axiosInstance);

// 在模块卸载时支持对称移除拦截器
// uninstall();
```

---

## 维度三：核心生产边界与非功能语义 (Production Boundary & Invariants)

### 1. 三级敏感数据脱敏防线 (PII Sanitization)

- **URL Query 脱敏**：在内核事件生成前，自动正则清洗 URL 中包括 `token`、`secret`、`password`、`key`、`ticket` 等 13 种常见敏感参数为 `******`；
- **HTTP Header 脱敏**：统一脱敏清洗 `Authorization`、`Cookie`、`Set-Cookie`、`X-Token` 等关键请求头；
- **DOM 文本与输入框脱敏**：
  - 自动识别原生 `input[type="password"]` 并掩码为 `******`；
  - 深度扫描 `[data-monitor-mask]`、`.monitor-mask`、`.at-mask` 类名与属性；只要交互节点自身或向上追溯任意层级祖先节点命中脱敏规则，其文本与输入值全部被安全掩码，杜绝内存敏感数据外泄。

### 2. 错误指纹 FNV-1a 纳秒级聚合与 5 秒窗口防抖去重

- 当页面触发高频循环报错（如死循环触发的 `TypeError` 或高频 `ResizeObserver` 循环更新）时，`ErrorDeduplicator` 基于错误名称、消息主干、出错文件名与行列号计算出确定性的 32 位 FNV-1a 散列指纹；
- 在 5000ms 时间窗口内，相同指纹的错误仅在首次触发物理派发，后续高频重复异常仅累加 `repeatCount` 计数，并在窗口到期后重置，彻底杜绝主线程与网络带宽被错误风暴打满。

### 3. 会话级断路器防风暴熔断机制 (Circuit Breaker)

- 当单个用户会话内累计发生的各类未捕获异常达到阈值（默认 `50` 次，Sample 展厅演练设为 `10` 次）时，断路器自动触发熔断阻断；
- 触发熔断瞬间向外派发一条致命级别告警生命周期事件 `CIRCUIT_BREAKER_TRIGGERED`，随后整个监控体系进入静默休眠态，坚决杜绝异常风暴拖垮用户端宿主浏览器。

### 4. 3×3 点阵白屏感知算法与双阶段复验免报边界

- **九点几何坐标采样**：在视口宽度与高度的 $1/6$、$1/2$、$5/6$ 处交叉布置 9 个均分采样探测点，通过 `document.elementsFromPoint(x, y)` 提取穿透目标；
- **骨架屏与 Loading 白名单祖先追溯**：只要探测点下存在命中 `.skeleton`、`.el-loading-mask`、`[data-loading]` 等样式的骨架容器，立即判定为合法加载态，直接豁免告警；
- **两阶段防抖复验**：初检延迟 $T_1$ (默认 3000ms) 发现可疑白屏后，绝不草率上报，而是启动 $T_2$ (默认 1500ms) 二次防抖复验；若在此期间应用渲染完成，则自动静默消除误报。

### 5. 防死循环调用协议 (Anti-Infinite-Loop Protocol)

- 凡由监控系统自身发起的上报请求（无论是通过 `sendBeacon`、`fetch` 还是 `XMLHttpRequest`），均自动附带 `X-Ateng-Monitor-Skip: true` 请求头，或显式指向 `reportUrl`；
- 原生网络嗅探插件 `NetworkPlugin` 在拦截到底层请求时，严格执行前置卫语句检查：一旦识别到 Skip 标记或目标地址匹配 `reportUrl`，立即无损放行原生调用，严禁记录面包屑与派发事件，彻底阻断“上报报错 ➔ 嗅探到报错 ➔ 再次上报 ➔ 无限死循环”的致命网络风暴。

### 6. 三阶高可用防丢传输管道与页面卸载冲刷 (Transport Queue)

- **常态批处理**：内存队列采用容量批次（默认 10 条）与时间防抖（默认 3000ms）动态双向触发机制，兼顾上报时效性与网络请求频次最优化；
- **页面卸载紧急冲刷**：监听 `window.beforeunload` 与 `document.visibilitychange (hidden)` 事件，在用户关闭标签页或切换后台瞬间，自动将内存中积攒的事件通过异步无阻塞穿透通道 `navigator.sendBeacon`（或 `fetch keepalive: true`）实施紧急冲刷，确保异常现场 0 丢包。

---

## 维度四：物理排版与代码全真验证 (Evergreen & Zero-Glitch)

本模块所有特性与代码示例均已在工程中建立 1:1 对抗性单元测试与端到端实测展厅，100% 跑通并持续受 CI 工作流守护：

- **核心单元测试矩阵**：[packages/monitor/test/](./test/)（涵盖 10 套测试套件、109 项测试用例，100% 离线自洽通过）；
- **1:1 场景自验工程**：[apps/sample-monitor/](./../../apps/sample-monitor/)（固定端口 3010，集成故障注入、白屏感知、性能大盘、脱敏时间轴与实时 Mock APM 终端）。
