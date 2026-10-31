# Monitor (全链路可观测性与异常监控底座)

无框架纯 TypeScript 底座，定义全局前端可观测性强类型契约、微内核采集流水线、三级数据脱敏、指纹去重熔断与高可用防丢传输网关。

## 核心微内核与生命周期

**MonitorKernel**:
监控微内核调度中心，负责管理采集插件的装载与卸载、统一上下文富化、脱敏过滤、熔断拦截与上报事件分发。
_Avoid_: MonitorManager, SdkCore, EventBus, LogTracker

**MonitorPlugin**:
标准化采集插件契约，具备显式名称、`setup(kernel)` 初始化与 `teardown()` 确定性生命周期清理。
_Avoid_: Collector, Middleware, Interceptor, Watcher

**MonitorContext**:
全局遥测元数据上下文，封装静态发版版本号、运行环境、动态租户与用户标识及自定义 Tag。
_Avoid_: GlobalState, MetaInfo, UserContext, SessionData

**ContextStore**:
响应式与动态上下文存储门面，提供线程安全与单向更新的 `setUser`、`setTenant`、`setTag` 与 `setExtra` 接口。
_Avoid_: ContextManager, StoreHelper, TagStorage

## 异常捕获与诊断

**ErrorEventPayload**:
标准化异常遥测数据契约，包含错误分类（JS/Promise/Resource/Console）、错误描述、文件名、行列号与结构化堆栈。
_Avoid_: ErrorData, ExceptionInfo, CrashPayload

**ErrorFingerprint**:
基于错误名称、信息与堆栈哈希计算出的确定性唯一特征指纹，用于高频重复异常聚合。
_Avoid_: ErrorHash, Signature, DedupeKey

**WhiteScreenSampling**:
基于 3×3 视口点阵采样与 DOM 命中分析的白屏感知机制，支持骨架屏白名单与两阶段防抖复验。
_Avoid_: BlankCheck, EmptyScreenDetector, DomProbe

**BreadcrumbTimeline**:
记录用户最近关键行为轨迹（DOM 点击、路由跳转、控制台调用、网络请求）的环形缓冲区时间轴快照。
_Avoid_: ActionHistory, UserTrail, ClickLog, OperationRecord

## 性能与长任务

**WebVitalsMetric**:
Google Core Web Vitals 核心体验指标实体（FCP、LCP、CLS、INP、TTFB），包含数值、评级与上报时刻。
_Avoid_: PerfRecord, WebVitalData, PerformanceEntry

**LongTaskJank**:
主线程持续执行超过 50ms 的长任务卡顿实体，记录耗时、发生时刻与页面归因。
_Avoid_: FreezeRecord, BlockedTask, LagEvent

## 数据安全与可靠传输

**PiiSanitizer**:
敏感数据脱敏过滤器，对密码输入、掩码选择器属性、URL Query 与请求头实施星号脱敏。
_Avoid_: MaskUtil, DataFilter, SecurityFilter, Redactor

**CircuitBreaker**:
客户端单会话错误熔断断路器，在累计异常突破阈值时自动休眠并派发熔断事件，避免拖垮宿主。
_Avoid_: RateLimiter, ErrorLimiter, CrashGuard, Fuse

**TransportQueue**:
内存事件缓冲聚合队列，支持批次大小聚合与防抖定时刷新。
_Avoid_: BufferQueue, LogQueue, SendQueue

**EmergencyFlush**:
在宿主页面触发 `visibilitychange`（`hidden`）或 `pagehide` 时强制立即同步冲刷未决队列的应急协议。
_Avoid_: ForceSend, UnloadSend, CleanUpFlush

**TraceSynergy**:
通过 Axios 拦截器适配器将后端 MDC `traceId` 自动提取并透传绑定至前端监控事件的全链路追踪协议。
_Avoid_: TraceBridge, SpanLink, TraceConnector
