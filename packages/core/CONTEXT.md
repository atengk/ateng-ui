# Core (核心契约与网络底座)

无框架纯 TypeScript 底座，定义全局统一强类型响应契约、Axios 请求管道、通用 Token 凭据注入与雪花大数防截断。

## 统一响应契约

**Result**:
统一 API 响应契约载荷，严格包含业务状态码、泛型业务数据、提示信息与链路追踪标识。
_Avoid_: Response, ApiResponse, BaseResponse, AjaxResult

**PageResult**:
统一分页查询响应实体，封装强类型数据列表集合与总记录数。
_Avoid_: Page, TableData, PageVO, PageData, IPage

**PageQuery**:
统一分页查询入参对象，标准化页码、每页容量、排序字段及升降序标记。
_Avoid_: PageParam, PageDTO, QueryParam, PageRequest

**BusinessException**:
统一业务与网络异常类，完整封装业务状态码、错误信息、链路追踪标识与原始异常因果链。
_Avoid_: CustomError, ApiError, ServiceException, HttpError

## 网络与诊断原语

**SnowflakeId**:
后端 64 位分布式整型主键，在前端原始 JSON 文本反序列化阶段强制加引号固化为 JavaScript 字符串。
_Avoid_: LongId, BigIntId, NumericId

**TraceId**:
全链路诊断唯一追踪标识符，从后端 MDC 响应自动提取并挂载于前端诊断异常对象。
_Avoid_: RequestId, SpanId, CorrelationId, LogId

**AuthManager**:
通用鉴权凭据操作门面，负责 Token 提取、持久化、请求头双轨注入与会话注销。
_Avoid_: TokenUtil, AuthService, SessionManager, UserHelper

**AuthStorage**:
通用凭据持久化存储抽象接口，提供浏览器 LocalStorage 与服务端内存跨宿主适配契约。
_Avoid_: TokenCache, SessionStore, StorageDriver

**GatewayRoute**:
微服务网关前缀与单体服务直连模式的多服务动态映射配置契约。
_Avoid_: ServiceUrl, ApiBase, ServerMap, BaseUrl

**AbortCoordinator**:
异步请求取消协调器，用于管理未决请求的生命周期与重复请求防抖阻断。
_Avoid_: RequestCanceler, CancelManager, AbortHelper

**StreamClient**:
Web 原生流式响应与 SSE 事件流客户端门面，支持逐块解析、自动重连与链路中断。
_Avoid_: SseHelper, StreamRequest, AiClient, EventSourceWrapper

**RetryPolicy**:
网络请求瞬态故障自动重试契约，严格限定幂等方法与指数退避延迟。
_Avoid_: RetryConfig, HttpRetryStrategy, ReattemptOptions

**TenantManager**:
统一多租户上下文隔离操作门面，负责租户标识读取、持久化与请求头注入。
_Avoid_: TenantService, TenantContext, TenantHolder

**RequestDeduplicator**:
并发飞行中未决请求合并调度器，避免同一只读接口多处并发调用时的网络雪崩。
_Avoid_: requestCache, promiseShare, swrMerge

**RequestSigner**:
API 请求防重放与防篡改签名门面，自动注入时间戳、Nonce 与原生 WebCrypto 签名摘要。
_Avoid_: SecurityHelper, SignManager, AntiReplay, CryptoUtil

## 存储与数据原语

**CacheStorage**:
具备命名空间隔离、存活时间（TTL）与自动过期清理的通用本地缓存门面。
_Avoid_: LocalCache, TimedStorage, StorageHelper

**Currency**:
金融级纯原生高精度金额换算与标准千分位规整工具箱。
_Avoid_: MoneyUtil, PriceFormatter, Fen2Yuan, CentsToYuan

**Assertions**:
强类型业务前置条件卫语句断言与防御性判空工具箱，不满足时自动抛出 BusinessException。
_Avoid_: check, validate, verify, ensure

## 文件传输原语

**UploadCoordinator**:
大文件分片受控并发上传协调器，支持切片切分、并发度限制、总进度汇报与单片重试。
_Avoid_: Uploader, UploadManager, SliceHelper, BigFileWorker
