# sample-core 核心契约与网络层自验展厅

> 专注于演示与自验 `@atengk/core` 核心契约、HTTP 客户端调度、长连接、流式响应与大文件切片并发上传在真实原生 TypeScript 环境下的开箱使用与交互自验。

---

## 1. 快速启动与服务端口

- **默认固定端口**：`3001` (严格遵守 ADR-0001 / ADR-0009 端口契约)
- **启动方式**：
  ```bash
  pnpm --filter sample-core dev
  ```
- 启动后浏览器访问：`http://localhost:3001`

---

## 2. 运行环境与 Mock 双模切换

- **默认/CI 模式**：内置离线自洽 Mock 数据（涵盖响应解包、雪花大数 64 位截断防线、微服务路由、401 凭据失效、SSE 流式打字机与 WebSocket 心跳模拟），无需启动任何外部后端服务即可直接体验完整交互与跑通自动化测试；
- **Local 真实网关模式**：在页面中或通过配置切换为真实物理网络地址（例如在 WebSocket 场景直接输入 `ws://localhost:8080/ws` 或 `wss://echo.websocket.events`），系统自动无缝切换为真实网络传输。

---

## 3. 核心场景看板与交互索引表

应用启动后，可通过以下原生协议场景看板与 DOM 交互卡片进行直观体验：

| 场景分类                 | 场景看板模块 / DOM 锚点                                                                                       | 核心可视化交互操作                                                                                                                                  | 验证重点                                                                                                                                                         |
| :----------------------- | :------------------------------------------------------------------------------------------------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **统一契约与雪花防截断** | `scenarios/contracts.ts`<br/>(`#card-contracts-unwrap`, `#card-contracts-snowflake`)                          | 点击“发送常规请求”与“逃生门”按钮；点击“测试雪花大数请求管道”                                                                                        | 验证 `unwrap: true` 自动解包与 `{ unwrap: false }` 保留完整信封；验证 64 位雪花大数正则加引号固化防失真                                                          |
| **网关路由与调度防线**   | `scenarios/http.ts`<br/>(`#card-http-routing`, `#card-http-race`, `#card-http-resilience`, `#card-http-sign`) | 触发网关前缀与 service 显式覆盖；连续点击慢速搜索触发竞态；触发 GET 幂等重试、POST 写操作重试与并发 5 请求去重合并；发起 POST 请求计算 SHA-256 签名 | 验证网关路由最长前缀重写与分发；验证 `cancelDuplicate: true` 自动中断旧请求；验证安全重试不变量与飞行中 Promise 复用；验证 WebCrypto 原生防重放签名              |
| **凭据门面与多租户隔离** | `scenarios/auth.ts`<br/>(`#card-auth-token`, `#card-auth-tenant-cache`)                                       | 登录注入 Token、手动清空、模拟 401 过期广播；切换租户 ID 并写入/读取带 TTL 缓存                                                                     | 验证双轨请求头注入 (`token` / `Bearer`) 与 401 自动清理回调；验证 `X-Tenant-Id` 请求头透传与 5000ms TTL 惰性过期清理                                             |
| **流式打字机与长连接**   | `scenarios/stream-ws.ts`<br/>(`#card-stream`, `#card-websocket`)                                              | 点击启动/中断 AI 大模型 SSE 打字机；连接 WebSocket、模拟网络闪断 (1006)、模拟假死停回 Pong、发送 chat/quote 主题消息与离线缓冲                      | 验证原生 ReadableStream 增量流消费与 `AbortSignal` 级联中断；验证 WebSocket 四态状态机、双向心跳假死切断、指数退避自动重连、受控 FIFO 离线缓冲与主题订阅精准分发 |
| **二进制安全与并发切片** | `scenarios/upload.ts`<br/>(`#card-upload-blob`, `#card-upload-chunks`)                                        | 下载正常 CSV 清单与异常文件 (模拟服务端 500 JSON)；切片 15MB 虚拟大文件并受控并发上传                                                               | 验证 RFC 5987 中文文件名解析与 Blob-JSON 双态异常阻断；验证原生文件切片、最大并发数限制 (concurrency: 2)、单调递增加权进度与外部级联中断                         |
| **真明文脱敏与金融计算** | `scenarios/security.ts`<br/>(`#card-security-mask`, `#card-security-currency`)                                | 查看手机号/身份证/邮箱/姓名脱敏表格；点击执行元分互转与千分位格式化；触发 `assertNonNull` 异常拦截                                                  | 验证“内存真明文”纯函数脱敏；验证纯原生位移金额换算与标准千分位；验证业务卫语句快速失败与 TS 编译期类型安全收窄                                                   |

---

## 4. 全真自动化回归命令

```bash
pnpm --filter @atengk/core --filter sample-core typecheck && \
pnpm --filter @atengk/core --filter sample-core lint && \
pnpm --filter @atengk/core test && \
pnpm --filter sample-core build
```

> 详细原理机制、配置项强类型清单与生产边界，请参阅核心子包文档：[@atengk/core README](../../packages/core/README.md)。
