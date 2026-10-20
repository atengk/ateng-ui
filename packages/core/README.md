# @atengk/core

面向现代企业级中后台、AI 协同系统与微服务架构的纯 TypeScript 强类型网络契约与工业级客户端基础设施。

---

## 维度零：特性与公共 API 全景速查矩阵

| 特性分类             | 特性名称            | 核心门面 / 方法 / 类型                                                                                               | 关键参数 / 返回类型                              | 核心行为说明                                                     | 锚定验证源头 (*Test / Sample)                   |
| :------------------- | :------------------ | :------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------- | :--------------------------------------------------------------- | :---------------------------------------------- |
| **基础导出**         | 基线版本标识        | `VERSION`                                                                                                            | `string`                                         | 导出当前模块编译版本基线                                         | [index.test.ts](./test/index.test.ts)           |
| **统一响应契约**     | 统一 API 响应载荷   | `Result<T>`                                                                                                          | `code, data, msg, traceId`                       | 统一泛型响应数据信封与链路追踪                                   | [contracts.test.ts](./test/contracts.test.ts)   |
| **统一响应契约**     | 分页查询与响应      | `PageResult<T>`, `PageQuery`                                                                                         | `list, total`, `pageNum, pageSize`               | 标准分页入参与出参实体契约                                       | [contracts.test.ts](./test/contracts.test.ts)   |
| **统一响应契约**     | 统一因果业务异常    | `BusinessException`                                                                                                  | `code, msg, traceId, cause`                      | 保留原始底层调用堆栈的业务异常类                                 | [contracts.test.ts](./test/contracts.test.ts)   |
| **网络数据转换**     | 雪花 ID 大数防截断  | `parseSnowflakeJson`, `transformSnowflakeResponse`                                                                   | `json: string => unknown`                        | 纳秒级正则匹配 16 位以上无引号数字加引号固化                     | [snowflake.test.ts](./test/snowflake.test.ts)   |
| **网关多路由引擎**   | 路由调度引擎与工厂  | `GatewayRouter`, `createGatewayRouter`                                                                               | `routes, defaultTarget => ResolvedRoute`         | 多微服务网关前缀最长匹配与路径重写分发                           | [routing.test.ts](./test/routing.test.ts)       |
| **网关多路由引擎**   | 路由纯函数门面      | `resolveGatewayRoute`                                                                                                | `url, routes, defaultTarget => ResolvedRoute`    | 开箱即用单次路由与服务覆盖解析                                   | [routing.test.ts](./test/routing.test.ts)       |
| **内存真明文脱敏**   | 通用文本掩码        | `formatMask`                                                                                                         | `(val, start, end, char?) => string`             | 底层通用前后保留文本掩码展示计算                                 | [mask.test.ts](./test/mask.test.ts)             |
| **内存真明文脱敏**   | 手机号脱敏          | `formatMaskPhone`                                                                                                    | `(phone, char?) => string`                       | 3-4-4 手机号掩码脱敏与分隔符容错                                 | [mask.test.ts](./test/mask.test.ts)             |
| **内存真明文脱敏**   | 身份证号脱敏        | `formatMaskIdCard`                                                                                                   | `(idCard, start?, end?, char?) => string`        | 18位/15位二代与一代身份证出生日期脱敏                            | [mask.test.ts](./test/mask.test.ts)             |
| **内存真明文脱敏**   | 邮箱地址脱敏        | `formatMaskEmail`                                                                                                    | `(email, char?) => string`                       | 用户名动态掩码并完整保留域名后缀                                 | [mask.test.ts](./test/mask.test.ts)             |
| **内存真明文脱敏**   | 中文姓名脱敏        | `formatMaskName`                                                                                                     | `(name, char?) => string`                        | 2字末尾/3字居中/多字中间自适应脱敏                               | [mask.test.ts](./test/mask.test.ts)             |
| **鉴权凭据门面**     | 鉴权凭据操作门面    | `AuthManager`, `createAuthManager`, `authManager`, `AuthManagerOptions`                                              | `getToken, setToken, clearToken, getHeaders`     | 双轨请求头注入 (`token` + `Bearer`) 与 401 自动清理广播          | [auth.test.ts](./test/auth.test.ts)             |
| **鉴权凭据门面**     | 跨宿主存储适配器    | `AuthStorage`, `MemoryAuthStorage`, `LocalStorageAuthStorage`, `createDefaultAuthStorage`, `isLocalStorageAvailable` | `getItem, setItem, removeItem, clear?`           | 浏览器 LocalStorage 与 Node/SSR 内存环境自适应探测存储契约       | [auth.test.ts](./test/auth.test.ts)             |
| **请求取消与防竞态** | 请求取消协调器      | `AbortCoordinator`, `createAbortCoordinator`, `RegisterAbortOptions`, `AbortRegistration`                            | `register, cancel, cancelAll, remove, isPending` | 未决请求生命周期托管、`cancelDuplicate` 防竞态中断与外部信号级联 | [abort.test.ts](./test/abort.test.ts)           |
| **请求取消与防竞态** | 指纹生成与错误判定  | `generateRequestKey`, `isAbortError`, `RequestKeyTarget`                                                             | `target => string`, `error => boolean`           | 基于 Method+URL+Params+Data 的确定性请求键生成与受控中断判定     | [abort.test.ts](./test/abort.test.ts)           |
| **文件与Blob处理**   | 文件名解析          | `parseContentDispositionFilename`                                                                                    | `disposition: string => string`                  | 优先解析 RFC 5987/6266 filename* 与常规 filename，支持容错清理   | [file.test.ts](./test/file.test.ts)             |
| **文件与Blob处理**   | Blob双态异常识别    | `checkBlobForJsonError`                                                                                              | `(data, contentType?, status?) => Promise<void>` | 探测 Blob 载荷是否为 JSON 业务错误并反序列化转译为业务异常       | [file.test.ts](./test/file.test.ts)             |
| **文件与Blob处理**   | 安全文件下载        | `saveBlobAsFile`, `SaveBlobOptions`                                                                                  | `(blob, filename, options?) => boolean`          | 平台环境守卫（Node/SSR降级）、内存确定性回收与安全触发浏览器下载 | [file.test.ts](./test/file.test.ts)             |
| **HTTP 客户端**      | 全局默认客户端      | `http`                                                                                                               | `HttpClient`                                     | 开箱即用的工业级单例，默认自动解包 `Promise<T>` 与统一拦截管道   | [http.test.ts](./test/http.test.ts)             |
| **HTTP 客户端**      | 客户端工厂与门面    | `createHttpClient`, `DefaultHttpClient`, `HttpClient`, `HttpClientOptions`, `HttpRequestConfig`                      | `options => HttpClient`                          | 创建具备独立路由表、鉴权域与取消协调器的客户端实例               | [http.test.ts](./test/http.test.ts)             |
| **HTTP 客户端**      | 拦截器管道挂载      | `setupInterceptors`, `InterceptorContext`                                                                            | `(instance, context) => void`                    | 为自定义 Axios 实例挂载全套工业级请求与响应拦截器                | [http.test.ts](./test/http.test.ts)             |
| **高可用韧性防线**   | 幂等安全重试策略    | `RetryPolicy`, `isIdempotentMethod`, `isRetriableError`, `calculateBackoffDelay`                                     | `(method) => boolean, (error) => boolean`        | 安全重试不变量（GET/HEAD指数退避，POST/PUT/DELETE严禁重试）      | [retry.test.ts](./test/retry.test.ts)           |
| **高可用韧性防线**   | 飞行中请求合并去重  | `RequestDeduplicator`, `createRequestDeduplicator`, `requestDeduplicator`, `generateDedupeKey`, `DedupeTarget`       | `(key, task) => Promise<T>`                      | 基于 Method+URL+Params 指纹合并未决 Promise，N 次调用降为 1 次   | [dedupe.test.ts](./test/dedupe.test.ts)         |
| **金融级金额计算**   | 原生金额换算与格式  | `toCents`, `toYuan`, `formatCurrency`, `Currency`                                                                    | `(yuan) => number, (cents) => number`            | 纯原生位移补齐，彻底杜绝浮点数精度失真（元分互转、标准千分位）   | [currency.test.ts](./test/currency.test.ts)     |
| **强类型条件断言**   | 业务断言与类型收窄  | `assert`, `assertNonNull`, `isEmpty`, `isNotEmpty`, `Assertions`                                                     | `(condition, msg) => asserts condition`          | 卫语句校验失败抛出 BusinessException，并在编译期实现类型安全收窄 | [assertions.test.ts](./test/assertions.test.ts) |
| **多租户隔离门面**   | 多租户上下文操作    | `TenantManager`, `createTenantManager`, `tenantManager`, `TenantStorage`                                             | `getTenantId, setTenantId, clearTenantId`        | 自动化 `X-Tenant-Id` 请求头注入与多租户跨宿主隔离存储            | [tenant.test.ts](./test/tenant.test.ts)         |
| **时效命名空间缓存** | 带TTL本地键值缓存   | `CacheStorage`, `createCacheStorage`, `cacheStorage`, `CacheStorageOptions`                                          | `get, set(key, val, ttl?), remove, clear`        | 命名空间前缀隔离、毫秒级存活时间（TTL）与自动惰性垃圾清理        | [cache.test.ts](./test/cache.test.ts)           |
| **请求防重放与签名** | WebCrypto 签名门面  | `RequestSigner`, `DefaultRequestSigner`, `createRequestSigner`, `RequestSignerOptions`, `SignTarget`, `SignResult`   | `(target) => Promise<SignResult>`                | 基于原生 WebCrypto 计算 SHA-256 签名，注入时间戳与 Nonce 防重放  | [security.test.ts](./test/security.test.ts)     |
| **请求防重放与签名** | 签名原语与字符串化  | `sha256Hex`, `generateNonce`, `defaultBuildCanonicalString`                                                          | `(msg) => Promise<string>, () => string`         | 原生哈希摘要、唯一排重随机数与键字典序规范化序列化               | [security.test.ts](./test/security.test.ts)     |
| **Web 原生流式响应** | 流式通信门面        | `StreamClient`, `DefaultStreamClient`, `createStreamClient`, `streamClient`, `StreamClientOptions`                   | `subscribe(url, opt), stream(url, opt)`          | 原生 fetch 与 ReadableStream 封装，支持打字机与指数退避重连      | [stream.test.ts](./test/stream.test.ts)         |
| **Web 原生流式响应** | SSE 协议增量解析器  | `SseParser`, `SseEvent`, `StreamRequestOptions`                                                                      | `feed(chunk), flush(), reset() => SseEvent[]`    | W3C 标准 SSE 事件解析、换行合并、心跳过滤与抗网络撕裂分包        | [stream.test.ts](./test/stream.test.ts)         |
| **大文件切片上传**   | 纯原生文件切片      | `createFileChunks`, `DEFAULT_CHUNK_SIZE`, `FileChunk`                                                                | `(file, chunkSize?) => FileChunk[]`              | 原生 Blob.slice 安全字节区间切分与起始偏移计算                   | [upload.test.ts](./test/upload.test.ts)         |
| **大文件切片上传**   | 受控并发上传协调器  | `UploadCoordinator`, `createUploadCoordinator`, `IUploadCoordinator`, `UploadCoordinatorOptions`                     | `upload(chunks, signal?), uploadFile(...)`       | 最大并发连接数限制、单调加权进度、分片局部重试与级联中断         | [upload.test.ts](./test/upload.test.ts)         |
| **全双工长连接**     | WebSocket客户端门面 | `WebSocketClient`, `createWebSocketClient`, `WebSocketClientOptions`, `WebSocketStatus`                              | `options => WebSocketClient`                     | 纯原生全双工长连接客户端，集成四态状态机、编解码与凭据自动透传   | [websocket.test.ts](./test/websocket.test.ts)   |
| **全双工长连接**     | 双向心跳保活探针    | `WebSocketHeartbeatOptions`                                                                                          | `interval, timeout, pingMessage, pongMessage`    | 定时应用层 Ping 发送、Pong 超时假死切断与确定性定时器回收        | [websocket.test.ts](./test/websocket.test.ts)   |
| **全双工长连接**     | 指数退避自动重连    | `WebSocketReconnectOptions`, `WebSocketEventMap`                                                                     | `baseDelay, maxDelay, factor, maxRetries`        | 异常断开与假死超时指数退避重连，支持主动 close 永久阻断          | [websocket.test.ts](./test/websocket.test.ts)   |
| **全双工长连接**     | 离线发送缓冲队列    | `bufferWhileConnecting`, `maxBufferSize`, `getBufferSize()`, `clearBuffer()`                                         | `send(data) => boolean`                          | 未连接排队暂存并在就绪后按序 Flush，容量溢出丢弃防内存泄露       | [websocket.test.ts](./test/websocket.test.ts)   |
| **全双工长连接**     | 主题订阅精准分发    | `subscribe<T>`                                                                                                       | `(type, handler) => unbind`                      | 按照业务载荷 `{ type, data: T }` 模式精准分发与安全注销          | [websocket.test.ts](./test/websocket.test.ts)   |

---

## 维度一：最小起步体验 (Happy Path)

### 安装依赖

```bash
pnpm add @atengk/core axios
```

### 1. 开箱即用请求与自动解包

```ts
import { http, authManager } from '@atengk/core';

// 1. 设置鉴权凭据（自动注入 token 与 Authorization 双轨请求头）
authManager.setToken('YOUR_TOKEN_STRING');

// 2. 发起 GET 请求（自动校验 code === 200 并解包返回实体 User）
interface User {
  id: string; // 64位雪花 ID 自动保留为字符串防截断
  name: string;
}

const user = await http.get<User>('/api/user/info');
console.log(`当前用户: ${user.name}`);

// 3. 逃生门：通过 { unwrap: false } 获取完整的 Result<T> 信封
const envelope = await http.get<User>('/api/user/info', { unwrap: false });
console.log(`业务状态码: ${envelope.code}, TraceId: ${envelope.traceId}`);
```

### 2. AI 大模型流式输出与打字机消费

```ts
import { streamClient } from '@atengk/core';

// 方式一：面向回调打字机输出
await streamClient.subscribe('/api/llm/chat', {
  method: 'POST',
  body: { prompt: '讲一个关于前端架构的故事' },
  onMessage: (chunkText, event) => {
    process.stdout.write(chunkText);
  },
  onDone: () => {
    console.log('\n[流式完成]');
  },
});

// 方式二：面向异步迭代器 (AsyncIterable)
for await (const event of streamClient.stream('/api/llm/chat')) {
  console.log(`接收到事件 [${event.event}]: ${event.data}`);
}
```

### 3. WebSocket 全双工长连接与主题订阅

```ts
import { createWebSocketClient } from '@atengk/core';

// 1. 初始化客户端（开启默认 30s 心跳、指数退避重连与离线缓冲）
const client = createWebSocketClient({
  url: 'ws://localhost:8080/ws',
  heartbeat: true,
  reconnect: true,
  bufferWhileConnecting: true,
});

// 2. 订阅业务主题（自动解包 { type, data: T } 格式）
const unbind = client.subscribe<{ user: string; text: string }>('chat', msg => {
  console.log(`[接收聊天] ${msg.user}: ${msg.text}`);
});

// 3. 建立连接并在连接前后安全发送
await client.connect();
client.send({ type: 'chat', data: { user: 'Ateng', text: '你好！' } });

// 4. 不需要时随时注销主题或断开连接
unbind();
client.close();
```

---

## 维度二：生产扩展接管 (Customization & Extensibility)

### 1. 微服务网关路由、请求防重放签名与租户注入

```ts
import {
  createHttpClient,
  createAuthManager,
  createRequestSigner,
  tenantManager,
  MemoryAuthStorage,
} from '@atengk/core';

// 设置当前多租户标识
tenantManager.setTenantId('tenant-finance-001');

// 创建拥有独立网关、请求防重放签名与鉴权域的微服务客户端
const signedClient = createHttpClient({
  baseURL: 'https://gateway.example.com',
  timeout: 15000,
  cancelDuplicate: true, // 开启防竞态自动中断
  routes: [
    { prefix: '/order', target: 'https://order-service.internal', rewritePrefix: '/api/v1' },
    { prefix: '/pay', target: 'https://pay-service.internal' },
  ],
  // 注入请求签名器：自动在写操作计算并注入 X-Timestamp, X-Nonce, X-Signature
  signer: createRequestSigner({
    secret: 'YOUR_APP_SECRET',
  }),
  authManager: createAuthManager({ storage: new MemoryAuthStorage() }),
  onUnauthorized: () => {
    console.warn('登录凭据已失效，通知系统重定向');
  },
});

// 发起 POST 写操作，拦截器自动完成租户透传与防重放签名
const result = await signedClient.post('/pay/order', { orderId: '1001', amount: 8800 });
```

### 2. 大文件切片与受控并发上传

```ts
import { createUploadCoordinator } from '@atengk/core';

const coordinator = createUploadCoordinator({
  concurrency: 3, // 严格限制同时最多 3 个切片网络连接
  maxRetries: 2, // 单片失败自动局部重试 2 次
  onProgress: (percent, loaded, total) => {
    console.log(`上传总进度: ${percent}% (${loaded}/${total} 字节)`);
  },
  uploadChunk: async (chunk, signal) => {
    const formData = new FormData();
    formData.append('file', chunk.chunk);
    formData.append('index', String(chunk.index));
    formData.append('totalChunks', String(chunk.totalChunks));

    const res = await fetch('/api/upload/chunk', {
      method: 'POST',
      body: formData,
      signal,
    });
    return res.json();
  },
});

// 一站式切片并执行受控并发上传
const file = new File(['...'], 'video.mp4');
const results = await coordinator.uploadFile(file, 5 * 1024 * 1024); // 5MB / 片
```

### 3. WebSocket 动态鉴权透传、自定义心跳与退避策略定制

```ts
import { createWebSocketClient, authManager, tenantManager } from '@atengk/core';

// 登录并注入租户与凭据
authManager.setToken('YOUR_BEARER_TOKEN');
tenantManager.setTenantId('tenant-prod-888');

const client = createWebSocketClient({
  // 动态地址生成器，连接时自动追加 token 与 tenantId 至 Query 参数
  url: () => `wss://gateway.example.com/ws`,
  authManager,
  tenantManager,
  // 深度定制心跳探针
  heartbeat: {
    interval: 10000, // 10秒周期
    timeout: 3000, // 3秒假死判定
    pingMessage: { type: 'ping' },
    pongMessage: data => typeof data === 'object' && data !== null && (data as any).type === 'pong',
  },
  // 深度定制指数退避重连
  reconnect: {
    maxRetries: 10,
    baseDelay: 500,
    maxDelay: 10000,
    factor: 2,
  },
  bufferWhileConnecting: true,
  maxBufferSize: 200, // 暂存最多 200 条，超出丢弃最旧帧
});

client.on('reconnect', (attempt, delay) => {
  console.warn(`第 ${attempt} 次重连中，延迟: ${delay}ms`);
});
```

---

## 维度三：核心生产边界与非功能语义 (Production Boundary)

- **雪花 ID 防精度截断**：网络响应反序列化前必须在 `transformResponse` 阶段通过纳秒级正则匹配将 16 位以上无引号大数转换为字符串，严禁数字截断；
- **平台中立防御**：底层纯 TS 架构保持宿主环境弹性中立，严禁硬编码裸浏览器全局对象；
- **双态异常阻断**：二进制文件下载遇到业务异常 JSON 时，自动逆向转译为 `BusinessException`，彻底杜绝损坏伪文件落地；
- **幂等安全重试不变量**：默认且仅针对 GET、HEAD 等幂等只读方法与 5xx、超时或网络中断实施指数退避（$baseDelay \times 2^{attempt}$）重试；写操作（POST/PUT/DELETE）默认严禁自动重试，杜绝资金重复扣款与脏写；
- **飞行中请求合并与内存零泄漏**：基于 Method+URL+Params 指纹合并未决 Promise，无论成功或失败均通过 `.finally` 确定性清理在途记录，防止内存堆积；
- **流式确定性资源释放**：`StreamClient` 原生绑定 `AbortSignal`，外部调用取消时确定性释放 `ReadableStreamDefaultReader` 锁与连接资源；支持断线携带 `Last-Event-ID` 自动指数退避重连；
- **切片局部重试与级联中断**：`UploadCoordinator` 发生网络抖动时仅对出错的切片实施局部指数退避重试，不影响其他正常并发传输的分片；外部 `AbortSignal` 触发时能立即中断所有飞行的网络连接并清空调度队列；
- **WebSocket 全双工假死切断与确定性资源清理**：原生 W3C WebSocket 缺少 JS 可感知的心跳探针，`WebSocketClient` 通过应用层定时 Ping 与 Pong 超时计时器判定长连接假死，超时主动切断底层物理连接触发重连；在主动 `close()` 或连接销毁时 100% 确定性注销所有心跳与重连定时器，防范内存泄露；
- **受控容量 FIFO 离线缓冲**：在握手阶段或重连抖动期间调用 `send()` 自动安全暂存并在就绪后按原序清空冲刷；超出 `maxBufferSize` 上限时安全剔除最旧数据并告警，杜绝无限堆积导致内存溢出；
- **重连幂等与手动阻断**：自动重连严格遵循指数退避曲线且受 `maxRetries` 上限保护；一旦调用方主动调用 `close()`，立即设置永久阻断标记，绝不发生非预期的幽灵重试。

---

## 维度四：物理排版与代码全真验证

所有示例代码 100% 逆向提取自单元测试与 `apps/sample-core` 1:1 真实运行展厅：

1. **白盒单测与边界守护**：
   ```bash
   pnpm --filter @atengk/core test
   ```
2. **1:1 镜像自验展厅交互看板**：
   ```bash
   # 启动协议与网络请求看板 (访问 http://localhost:3001)
   pnpm --filter sample-core dev
   ```
   自验工程 `apps/sample-core/src/main.ts` 构建了可视化协议交互看板，100% 覆盖上述全景矩阵中的所有核心 API、请求解包、雪花防截断对比、网关路由重写、防竞态中断、Blob 双态下载、AI 流式打字机、时效缓存、金额计算与分片上传。
