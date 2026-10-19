# @atengk/core

面向现代企业级中后台与微服务架构的纯 TypeScript 强类型网络契约与工业级客户端基础设施。

---

## 维度零：特性与公共 API 全景速查矩阵

| 特性分类             | 特性名称           | 核心门面 / 方法 / 类型                                                                                               | 关键参数 / 返回类型                              | 核心行为说明                                                     | 锚定验证源头 (*Test / Sample)                 |
| :------------------- | :----------------- | :------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------- | :--------------------------------------------------------------- | :-------------------------------------------- |
| **基础导出**         | 基线版本标识       | `VERSION`                                                                                                            | `string`                                         | 导出当前模块编译版本基线                                         | [index.test.ts](./test/index.test.ts)         |
| **统一响应契约**     | 统一 API 响应载荷  | `Result<T>`                                                                                                          | `code, data, msg, traceId`                       | 统一泛型响应数据信封与链路追踪                                   | [contracts.test.ts](./test/contracts.test.ts) |
| **统一响应契约**     | 分页查询与响应     | `PageResult<T>`, `PageQuery`                                                                                         | `list, total`, `pageNum, pageSize`               | 标准分页入参与出参实体契约                                       | [contracts.test.ts](./test/contracts.test.ts) |
| **统一响应契约**     | 统一因果业务异常   | `BusinessException`                                                                                                  | `code, msg, traceId, cause`                      | 保留原始底层调用堆栈的业务异常类                                 | [contracts.test.ts](./test/contracts.test.ts) |
| **网络数据转换**     | 雪花 ID 大数防截断 | `parseSnowflakeJson`, `transformSnowflakeResponse`                                                                   | `json: string => unknown`                        | 纳秒级正则匹配 16 位以上无引号数字加引号固化                     | [snowflake.test.ts](./test/snowflake.test.ts) |
| **网关多路由引擎**   | 路由调度引擎与工厂 | `GatewayRouter`, `createGatewayRouter`                                                                               | `routes, defaultTarget => ResolvedRoute`         | 多微服务网关前缀最长匹配与路径重写分发                           | [routing.test.ts](./test/routing.test.ts)     |
| **网关多路由引擎**   | 路由纯函数门面     | `resolveGatewayRoute`                                                                                                | `url, routes, defaultTarget => ResolvedRoute`    | 开箱即用单次路由与服务覆盖解析                                   | [routing.test.ts](./test/routing.test.ts)     |
| **内存真明文脱敏**   | 通用文本掩码       | `formatMask`                                                                                                         | `(val, start, end, char?) => string`             | 底层通用前后保留文本掩码展示计算                                 | [mask.test.ts](./test/mask.test.ts)           |
| **内存真明文脱敏**   | 手机号脱敏         | `formatMaskPhone`                                                                                                    | `(phone, char?) => string`                       | 3-4-4 手机号掩码脱敏与分隔符容错                                 | [mask.test.ts](./test/mask.test.ts)           |
| **内存真明文脱敏**   | 身份证号脱敏       | `formatMaskIdCard`                                                                                                   | `(idCard, start?, end?, char?) => string`        | 18位/15位二代与一代身份证出生日期脱敏                            | [mask.test.ts](./test/mask.test.ts)           |
| **内存真明文脱敏**   | 邮箱地址脱敏       | `formatMaskEmail`                                                                                                    | `(email, char?) => string`                       | 用户名动态掩码并完整保留域名后缀                                 | [mask.test.ts](./test/mask.test.ts)           |
| **内存真明文脱敏**   | 中文姓名脱敏       | `formatMaskName`                                                                                                     | `(name, char?) => string`                        | 2字末尾/3字居中/多字中间自适应脱敏                               | [mask.test.ts](./test/mask.test.ts)           |
| **Sa-Token凭据门面** | 鉴权凭据操作门面   | `AuthManager`, `createAuthManager`, `authManager`, `AuthManagerOptions`                                              | `getToken, setToken, clearToken, getHeaders`     | 双轨请求头注入 (`satoken` + `Bearer`) 与 401 自动清理广播        | [auth.test.ts](./test/auth.test.ts)           |
| **Sa-Token凭据门面** | 跨宿主存储适配器   | `AuthStorage`, `MemoryAuthStorage`, `LocalStorageAuthStorage`, `createDefaultAuthStorage`, `isLocalStorageAvailable` | `getItem, setItem, removeItem, clear?`           | 浏览器 LocalStorage 与 Node/SSR 内存环境自适应探测存储契约       | [auth.test.ts](./test/auth.test.ts)           |
| **请求取消与防竞态** | 请求取消协调器     | `AbortCoordinator`, `createAbortCoordinator`, `RegisterAbortOptions`, `AbortRegistration`                            | `register, cancel, cancelAll, remove, isPending` | 未决请求生命周期托管、`cancelDuplicate` 防竞态中断与外部信号级联 | [abort.test.ts](./test/abort.test.ts)         |
| **请求取消与防竞态** | 指纹生成与错误判定 | `generateRequestKey`, `isAbortError`, `RequestKeyTarget`                                                             | `target => string`, `error => boolean`           | 基于 Method+URL+Params+Data 的确定性请求键生成与受控中断判定     | [abort.test.ts](./test/abort.test.ts)         |
| **文件与Blob处理**   | 文件名解析         | `parseContentDispositionFilename`                                                                                    | `disposition: string => string`                  | 优先解析 RFC 5987/6266 filename* 与常规 filename，支持容错清理   | [file.test.ts](./test/file.test.ts)           |
| **文件与Blob处理**   | Blob双态异常识别   | `checkBlobForJsonError`                                                                                              | `(data, contentType?, status?) => Promise<void>` | 探测 Blob 载荷是否为 JSON 业务错误并反序列化转译为业务异常       | [file.test.ts](./test/file.test.ts)           |
| **文件与Blob处理**   | 安全文件下载       | `saveBlobAsFile`, `SaveBlobOptions`                                                                                  | `(blob, filename, options?) => boolean`          | 平台环境守卫（Node/SSR降级）、内存确定性回收与安全触发浏览器下载 | [file.test.ts](./test/file.test.ts)           |
| **HTTP 客户端**      | 全局默认客户端     | `http`                                                                                                               | `HttpClient`                                     | 开箱即用的工业级单例，默认自动解包 `Promise<T>` 与统一拦截管道   | [http.test.ts](./test/http.test.ts)           |
| **HTTP 客户端**      | 客户端工厂与门面   | `createHttpClient`, `DefaultHttpClient`, `HttpClient`, `HttpClientOptions`, `HttpRequestConfig`                      | `options => HttpClient`                          | 创建具备独立路由表、鉴权域与取消协调器的客户端实例               | [http.test.ts](./test/http.test.ts)           |
| **HTTP 客户端**      | 拦截器管道挂载     | `setupInterceptors`, `InterceptorContext`                                                                            | `(instance, context) => void`                    | 为自定义 Axios 实例挂载全套工业级请求与响应拦截器                | [http.test.ts](./test/http.test.ts)           |

---

## 维度一：最小起步体验 (Happy Path)

### 安装依赖

```bash
pnpm add @atengk/core axios
```

### 开箱即用请求与自动解包

```ts
import { http, authManager } from '@atengk/core';

// 1. 设置鉴权凭据（自动注入 satoken 与 Authorization 双轨请求头）
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

---

## 维度二：生产扩展接管 (Customization & Extensibility)

在微前端、多服务网关与独立鉴权域场景下，可通过工厂函数创建独立客户端实例：

```ts
import { createHttpClient, createAuthManager, MemoryAuthStorage } from '@atengk/core';

// 创建拥有独立网关与独立鉴权域的微服务客户端
const orderClient = createHttpClient({
  baseURL: 'https://gateway.example.com',
  timeout: 15000,
  cancelDuplicate: true, // 开启防竞态/重复请求自动中断
  routes: [
    { prefix: '/order', target: 'https://order-service.internal', rewritePrefix: '/api/v1' },
    { prefix: '/pay', target: 'https://pay-service.internal' },
  ],
  authManager: createAuthManager({ storage: new MemoryAuthStorage() }),
  onUnauthorized: () => {
    console.warn('登录已过期，重定向至登录页');
  },
});

// 发起请求，自动将 /order 路径重写分发至 order-service
const order = await orderClient.get('/order/detail/1001');
```

---

## 维度三：核心生产边界与非功能语义 (Production Boundary)

- **雪花 ID 防精度截断**：网络响应反序列化前必须在 `transformResponse` 阶段通过纳秒级正则匹配将 16 位以上无引号大数转换为字符串，严禁数字截断；
- **平台中立防御**：底层纯 TS 架构保持宿主环境弹性中立，严禁硬编码裸浏览器全局对象；
- **双态异常阻断**：二进制文件下载遇到业务异常 JSON 时，自动逆向转译为 `BusinessException`。

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
   自验工程 `apps/sample-core/src/main.ts` 构建了可视化协议交互看板，100% 覆盖上述全景矩阵中的所有核心 API、请求解包、雪花防截断对比、网关路由重写、防竞态中断与 Blob 双态下载。
