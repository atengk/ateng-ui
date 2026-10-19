# @atengk/core

面向现代企业级中后台与微服务架构的纯 TypeScript 强类型网络契约与工业级客户端基础设施。

---

## 维度零：特性与公共 API 全景速查矩阵

| 特性分类             | 特性名称           | 核心门面 / 方法 / 类型                                                                                               | 关键参数 / 返回类型                           | 核心行为说明                                               | 锚定验证源头 (*Test / Sample)                 |
| :------------------- | :----------------- | :------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------- | :--------------------------------------------------------- | :-------------------------------------------- |
| **基础导出**         | 基线版本标识       | `VERSION`                                                                                                            | `string`                                      | 导出当前模块编译版本基线                                   | [index.test.ts](./test/index.test.ts)         |
| **统一响应契约**     | 统一 API 响应载荷  | `Result<T>`                                                                                                          | `code, data, msg, traceId`                    | 统一泛型响应数据信封与链路追踪                             | [contracts.test.ts](./test/contracts.test.ts) |
| **统一响应契约**     | 分页查询与响应     | `PageResult<T>`, `PageQuery`                                                                                         | `list, total`, `pageNum, pageSize`            | 标准分页入参与出参实体契约                                 | [contracts.test.ts](./test/contracts.test.ts) |
| **统一响应契约**     | 统一因果业务异常   | `BusinessException`                                                                                                  | `code, msg, traceId, cause`                   | 保留原始底层调用堆栈的业务异常类                           | [contracts.test.ts](./test/contracts.test.ts) |
| **网络数据转换**     | 雪花 ID 大数防截断 | `parseSnowflakeJson`, `transformSnowflakeResponse`                                                                   | `json: string => unknown`                     | 纳秒级正则匹配 16 位以上无引号数字加引号固化               | [snowflake.test.ts](./test/snowflake.test.ts) |
| **网关多路由引擎**   | 路由调度引擎与工厂 | `GatewayRouter`, `createGatewayRouter`                                                                               | `routes, defaultTarget => ResolvedRoute`      | 多微服务网关前缀最长匹配与路径重写分发                     | [routing.test.ts](./test/routing.test.ts)     |
| **网关多路由引擎**   | 路由纯函数门面     | `resolveGatewayRoute`                                                                                                | `url, routes, defaultTarget => ResolvedRoute` | 开箱即用单次路由与服务覆盖解析                             | [routing.test.ts](./test/routing.test.ts)     |
| **内存真明文脱敏**   | 通用文本掩码       | `formatMask`                                                                                                         | `(val, start, end, char?) => string`          | 底层通用前后保留文本掩码展示计算                           | [mask.test.ts](./test/mask.test.ts)           |
| **内存真明文脱敏**   | 手机号脱敏         | `formatMaskPhone`                                                                                                    | `(phone, char?) => string`                    | 3-4-4 手机号掩码脱敏与分隔符容错                           | [mask.test.ts](./test/mask.test.ts)           |
| **内存真明文脱敏**   | 身份证号脱敏       | `formatMaskIdCard`                                                                                                   | `(idCard, start?, end?, char?) => string`     | 18位/15位二代与一代身份证出生日期脱敏                      | [mask.test.ts](./test/mask.test.ts)           |
| **内存真明文脱敏**   | 邮箱地址脱敏       | `formatMaskEmail`                                                                                                    | `(email, char?) => string`                    | 用户名动态掩码并完整保留域名后缀                           | [mask.test.ts](./test/mask.test.ts)           |
| **内存真明文脱敏**   | 中文姓名脱敏       | `formatMaskName`                                                                                                     | `(name, char?) => string`                     | 2字末尾/3字居中/多字中间自适应脱敏                         | [mask.test.ts](./test/mask.test.ts)           |
| **Sa-Token凭据门面** | 鉴权凭据操作门面   | `AuthManager`, `createAuthManager`, `authManager`, `AuthManagerOptions`                                              | `getToken, setToken, clearToken, getHeaders`  | 双轨请求头注入 (`satoken` + `Bearer`) 与 401 自动清理广播  | [auth.test.ts](./test/auth.test.ts)           |
| **Sa-Token凭据门面** | 跨宿主存储适配器   | `AuthStorage`, `MemoryAuthStorage`, `LocalStorageAuthStorage`, `createDefaultAuthStorage`, `isLocalStorageAvailable` | `getItem, setItem, removeItem, clear?`        | 浏览器 LocalStorage 与 Node/SSR 内存环境自适应探测存储契约 | [auth.test.ts](./test/auth.test.ts)           |

---

## 维度一：最小起步体验 (Happy Path)

### 安装依赖

```bash
pnpm add @atengk/core axios
```

### 快速接入

```ts
import { VERSION } from '@atengk/core';

console.log(`@atengk/core 当前版本: ${VERSION}`);
```

---

## 维度二：生产扩展接管 (Customization & Extensibility)

待具体业务特性（如 Axios 实例工厂、双轨 AuthStorage 适配器等）落地后，1:1 逆向提取自对应 Sample 工程。

---

## 维度三：核心生产边界与非功能语义 (Production Boundary)

- **雪花 ID 防精度截断**：网络响应反序列化前必须在 `transformResponse` 阶段通过纳秒级正则匹配将 16 位以上无引号大数转换为字符串，严禁数字截断；
- **平台中立防御**：底层纯 TS 架构保持宿主环境弹性中立，严禁硬编码裸浏览器全局对象；
- **双态异常阻断**：二进制文件下载遇到业务异常 JSON 时，自动逆向转译为 `BusinessException`。

---

## 维度四：物理排版与代码全真验证

所有示例均经过内部单元测试与 `apps/sample-core` 1:1 真实运行验证。
