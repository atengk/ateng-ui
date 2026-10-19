# 0010. HTTP 客户端分层架构、响应解包与因果异常转译契约

## 状态

Accepted (已接受)

## 背景与决策上下文

在企业级中后台开发中，前端网络请求面临以下痛点：

1. **样板代码严重**：传统 Axios 封装返回裸 `AxiosResponse<Result<T>>` 或 `Result<T>`，业务调用方在 95% 以上的场景中都需要重复书写 `if (res.code === 200) { const data = res.data; }`；
2. **多租户与微服务扩展受限**：若仅采用全局单例客户端，在微前端、多网关路由或不同鉴权域场景下，无法做到请求管道与拦截器的相互隔离；
3. **异常处理碎片化**：业务错误（`code !== 200`）、HTTP 状态错误（如 404/500）与网络断连异常类型混杂，调用方难以统一捕获，且往往丢失底层 `AxiosError` 原始因果链。

## 架构决策

1. **工厂模式与开箱单例双轨并存 (`createHttpClient` + `http`)**：
   - 核心层暴露 `createHttpClient(options)` 工厂函数，支持创建拥有独立拦截器管道与网关配置的 `HttpClient` 实例；
   - 同时导出默认的 `http` 全局单例，满足单体应用与主网关直连的开箱即用需求。
2. **默认自动解包载荷与配置逃生门 (`unwrap` 契约)**：
   - `http.get<T>()`、`http.post<T>()` 等请求门面默认返回 `Promise<T>`，内部自动校验 `code === 200` 并解包提取 `Result<T>.data`；
   - 若业务或特殊场景需要访问完整信封（如读取 `msg`、`code`、`traceId`），可通过请求配置项 `{ unwrap: false }` 获取原始 `Promise<Result<T>>`。
3. **因果异常统一转译 (`BusinessException`)**：
   - 当 `code !== 200` 或发生 HTTP 4xx/5xx/超时/网络断连时，拦截器统一转译并抛出 `BusinessException`；
   - 异常对象完整挂载 `code`、`msg`、`traceId`，并通过 `cause` 属性保留原始的底层异常因果链，严禁异常吞咽与空 catch。
4. **401 未授权自动化安全闭环与事件通知**：
   - 遇到 HTTP 401 或业务 `code === 401` 时，客户端自动调用 `authManager.clearToken()` 销毁脏凭据，并触发可选的 `onUnauthorized` 钩子通知上层。

## 效果与权衡

- **收益**：
  - 极大减少调用方的解包模板代码，类型推导直达业务模型实体；
  - 统一了整个 Monorepo 的异常处理范式（只需处理 `BusinessException`）；
  - 支持多网关与微前端多实例隔离。
- **代价**：
  - 当调用方需要显式处理非 200 业务错误时，必须通过 `try-catch` 或配置 `{ unwrap: false }`，改变了传统的 `if (res.code !== 200)` 代码习惯。
