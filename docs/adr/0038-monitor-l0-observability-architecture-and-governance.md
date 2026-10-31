# 0038. Monitor L0 纯原生全链路可观测性底座架构与治理规范

- **状态**: accepted
- **日期**: 2026-10-31
- **作者**: Ateng

## 背景与上下文

根据 [ateng-ui 模块化生态扩展全景蓝图](../../../doc/ateng-ui/module-expansion-blueprint.md) 第三阶段规划，随着企业级中后台系统与复杂前台交互向深度演进，前端系统面临严峻的生产可用性与可观测性（Observability）挑战：

1. **静默运行时崩溃与白屏风险**：未捕获的 JavaScript 同步/异步异常、Promise 拒付、静态资源（脚本/样式/图片）404 导致单页应用直接挂死；传统的页面错误捕获无法有效识别 SPA 渲染崩溃引发的真白屏，而简单粗暴的 DOM 探测又极易在骨架屏与异步加载时产生假阳性误报；
2. **性能体验盲区与主线程卡顿**：Core Web Vitals（FCP、LCP、CLS、INP、TTFB）与长达数百毫秒阻塞 UI 渲染的主线程长任务（Long Tasks，造成严重 Jank 掉帧）缺乏系统化打点与归因诊断；
3. **前后端追踪割裂**：前端网络异常与性能数据无法与后端微服务链路的 MDC `traceId` 串联，导致排查问题时前后端日志处于孤岛状态；
4. **日志风暴与客户端可用性风险**：在 `requestAnimationFrame`、`window.onscroll` 或高频 Watcher 循环抛错时，若无客户端限流与断路器机制，监控 SDK 本身会成为拖垮浏览器与后端日志服务器的二次凶手；
5. **数据隐私合规红线**：捕获点击轨迹（Breadcrumbs）与异常 Payload 时，若缺乏自动化敏感凭据脱敏（密码、Token、手机号），将严重违反安全合规与系统《零明文不变量》。

为此，在经过 `/grill-with-docs` 严格审定后，正式确立 `@atengk/monitor` 作为 Monorepo 中面向企业级前端的 L0 纯 TS 原生全链路可观测性底座。

---

## 架构决策矩阵 (Architecture Decisions)

```mermaid
flowchart TD
    subgraph Host["宿主环境 (Vue 3 / React / 纯 TS / 微前端 / SSR)"]
        APP["业务应用视图 / 组件"]
        AXIOS["@atengk/core Axios 客户端"]
    end

    subgraph L0["@atengk/monitor (L0 纯 TS 原生底座 · 零外部框架依赖)"]
        subgraph Collectors["微内核插件收集器 (Collector Plugins)"]
            ERR["ErrorPlugin<br/>(JS/Promise/Resource/Console)"]
            PERF["PerformancePlugin<br/>(Web Vitals/Navigation/LongTask)"]
            WS["WhiteScreenPlugin<br/>(3x3点阵/白名单/双阶段复验)"]
            BC["BreadcrumbPlugin<br/>(Click/Route/Console/Network)"]
            NET["NetworkPlugin<br/>(Fetch/XHR 耗时 & 状态码)"]
        end

        subgraph CoreEngine["监控核心引擎 (Monitor Kernel)"]
            CTX["Context Store<br/>(appVersion, env, tenantId, userId, tags)"]
            PII["三级安全脱敏管道<br/>(DOM 掩码 / URL脱敏 / beforeSend 过滤)"]
            BREAKER["熔断防风暴引擎<br/>(指纹聚合去重 / 频次窗口 / 会话熔断断路器)"]
            QUEUE["事件批处理队列<br/>(内存批缓冲 / 防抖定时刷新)"]
        end

        subgraph Transport["高可用传输管道 (Transport Pipeline)"]
            BEACON["navigator.sendBeacon (优先)"]
            FETCH_KA["fetch { keepalive: true } (降级)"]
            XHR["XMLHttpRequest (兜底)"]
            FLUSH["Emergency Flush<br/>(visibilitychange / pagehide 强制冲刷)"]
        end
    end

    subgraph APM["企业级 APM / 可观测性服务端"]
        GATEWAY["日志收集网关 / APM Collector"]
    end

    APP -->|交互与异常| Collectors
    AXIOS -.->|createCoreAxiosMonitorInterceptor(monitor)<br/>透传 TraceId 与接口耗时| NET
    Collectors --> CoreEngine
    CTX -.->|自动富化上下文| CoreEngine
    PII --> BREAKER --> QUEUE
    QUEUE --> Transport
    FLUSH -.->|紧急冲刷| QUEUE
    Transport -->|异步无阻塞传输| GATEWAY
```

### 1. 严格四层洋葱拓扑 L0 定位与跨框架中立性

- `@atengk/monitor` 严格定位于 **L0 纯 TS 原生核心底座**，仅依赖浏览器 Web 标准 API，绝对严禁引入 Vue 或 React 运行时与响应式类型（`Ref`/`State`）；
- 跨框架错误捕获（如 Vue 的 `app.config.errorHandler`）通过结构化无依赖的通用辅助函数（如 `captureVueError`）暴露，保持底层跨环境可移植性。

### 2. 微内核与可插拔采集流水线 (Micro-Kernel & Plugin Pipeline)

- **微内核 (`MonitorKernel`)**：统一管理插件注册、事件派发、上下文富化、批处理队列与传输网关；
- **五大开箱即用采集器插件**：
  1. `ErrorPlugin`：全局捕获未捕获 JS 异常（`window.onerror`）、Promise 异步未决拒付（`unhandledrejection`）、事件捕获阶段监听静态资源 404（`<script>`、`<link>`、`<img>`），并代理 `console.error`；
  2. `PerformancePlugin`：通过 W3C `PerformanceObserver` 采集 Google Core Web Vitals（FCP、LCP、CLS、INP、TTFB）、Navigation Timing 以及主线程长任务卡顿（Long Tasks >50ms Jank）；
  3. `WhiteScreenPlugin`：3×3 视口点阵采样算法 + 骨架屏/Loading 容器选择器白名单豁免 + 延迟两阶段复验，彻底解决 SPA 路由异步白屏误报；
  4. `BreadcrumbPlugin`：环形缓冲区管理用户行为轨迹（DOM 点击掩码、控制台打印、网络通信），自动感知 SPA 虚拟路由（`pushState`/`popstate`/`hashchange`）并派发 `PAGE_VIEW` 事件与路由耗时；
  5. `NetworkPlugin`：无侵入劫持原生 `fetch` 与 `XMLHttpRequest`，记录 API 耗时与 $\ge 400$ 异常状态码。

### 3. 三阶防丢传输通道与防死循环协议

- **通道自适应降级**：优先使用非阻塞 `navigator.sendBeacon`（穿透页面卸载），降级使用 `fetch({ keepalive: true })`，兜底 `XMLHttpRequest`；
- **紧急卸载冲刷**：监听 `visibilitychange`（`hidden`）与 `pagehide` 事件，立即强制同步冲刷（`flush()`）内存队列，保障页面关闭时打点零丢失；
- **防套娃死循环契约**：所有监控上报请求统一注入 `X-Ateng-Monitor-Skip: true` 请求头，同时网络拦截器自动过滤 `reportUrl` 端点，杜绝监控上报异常再次触发网络上报的无限递归死循环。

### 4. 敏感数据三级脱敏与客户端熔断断路器

- **合规脱敏**：强制掩码 `type="password"` 输入框与 `[data-monitor-mask]` 容器的值；正则清洗 URL 与 Header 中的敏感字段（`token`, `secret`, `password` 等）；标配 `beforeSend(event)` 终极过滤钩子；
- **指纹聚合去重**：基于 `hash(name + message + stack)` 提取错误指纹，5 秒时间窗口内聚合重复异常并累加 `repeatCount`；
- **会话级熔断断路器 (`CircuitBreaker`)**：单个页面会话累计错误达到上限（默认 50 条）时自动进入休眠态，停止事件派发并上报一次性 `CIRCUIT_BREAKER_TRIGGERED` 告警。

### 5. 分布式全链路 TraceId 串联与自验沙箱

- **协同适配器**：导出 `createCoreAxiosMonitorInterceptor(monitor)` 适配器工厂，直接挂载至 `@atengk/core` Axios 拦截器，自动绑定后端 MDC `traceId`；
- **1:1 自验工程**：在 `apps/sample-monitor`（接续端口 **3010**）落地 5 大交互式自验控制台，全量走通离线自洽单测。

---

## 效果与权衡 (Consequences & Trade-offs)

### 收益 (Benefits)

1. **全链路端到端诊断闭环**：通过 `traceId` 与行为面包屑，前后端全链路无缝贯通，生产级故障定位时间缩短 80% 以上；
2. **极高可用性与零二次伤害**：内置指纹去重、客户端熔断断路器与防套娃死循环协议，确保极端场景下监控自身绝不拖垮主线程与网络通道；
3. **架构纯净与极致轻量**：纯 TS 零依赖，微内核插件按需引入，Tree-Shaking 零冗余代码；
4. **高信噪比白屏检测**：双阶段复验与骨架屏白名单设计消除了单页应用的假阳性报警困扰。

### 代价 (Trade-offs)

1. **需显式集成框架钩子**：为了保持 L0 纯粹中立，Vue 特定的 `errorHandler` 需要通过一行胶水代码（`app.config.errorHandler = createVueErrorHandler(monitor)`）接入，无法做到在 import 时隐式全局强占。
