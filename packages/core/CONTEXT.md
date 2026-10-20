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
