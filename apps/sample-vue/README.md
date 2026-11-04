# sample-vue 响应式通用 Composables 自验展厅

> 专注于演示与自验 `@atengk/vue` 核心响应式状态机、无头通用 Composables、生命周期确定性清理与纯原生裸 DOM 数据绑定在真实前端业务场景下的开箱使用与交互自验。

---

## 1. 快速启动与服务端口

- **默认固定端口**：`3002` (严格遵守 ADR-0001 / ADR-0009 端口契约)
- **启动方式**：
  ```bash
  pnpm --filter sample-vue dev
  ```
- 启动后浏览器访问：`http://localhost:3002`

---

## 2. 运行环境与 Mock 双模切换

- **默认/CI 模式**：内置 100% 离线自洽 Mock 逻辑（涵盖全局配置注入、微工具防抖节流、异步请求状态机、五维契约分页、跨页多选记忆、异步抗时序倒挂、防刷防重互斥锁、鉴权凭据与租户切片、Fesod 流式 Excel、大文件原生切片并发上传、SSE 打字机流式问答、WebSocket 心跳重连状态机、150ms/300ms 加载防闪烁与多标签页 KeepAlive 调度），无需连接外部物理后端即可跑通完整交互与自动化检查；
- **Local 真实网关模式**：若需直连真实微服务网关或后端服务，可配置本地环境变量并通过工程统一网络适配层进行真实网络通信（该环境配置受 Git 忽略，CI 零风险）。

---

## 3. 核心场景看板与交互索引表

应用启动后，可通过顶部粘性导航 Bar（点击平滑滚动）或直接滚动浏览以下 8 大领域、14 个自洽场景看板进行直观交互体验：

| 领域分类                  | 场景看板组件 / 锚点                                             | 核心可视化交互操作                                                              | 验证重点                                                                                                     |
| :------------------------ | :-------------------------------------------------------------- | :------------------------------------------------------------------------------ | :----------------------------------------------------------------------------------------------------------- |
| **1. 全局配置与微工具**   | `src/components/ConfigDemo.vue`<br/>(`#domain-context`)         | 查看当前全局注入的默认分页大小、HTTP 客户端及长连自动挂载状态                   | 验证 `createAtengVue` 插件全局注入与 `useAtengConfig` 上下文安全回退机制                                     |
| **1. 全局配置与微工具**   | `src/components/UtilsDemo.vue`<br/>(`#domain-context`)          | 快速连续输入测试 300ms 防抖；狂点按钮测试 1000ms 节流；点击页面监视全局事件解绑 | 验证原生微工具 `useDebounceFn`、`useThrottleFn` 与 `useEventListener` 在 `onScopeDispose` 时 100% 确定性注销 |
| **2. 异步请求状态机**     | `src/components/RequestDemo.vue`<br/>(`#domain-request`)        | 点击“刷新”、“切换用户 (ID: 1/2)”与“本地乐观更新 (mutate)”按钮                   | 验证 `useRequest` 的 loading/data/error 只读状态流转、响应式参数驱动与本地乐观变更 `mutate` 范式             |
| **3. 契约分页与多选**     | `src/components/PaginationDemo.vue`<br/>(`#domain-pagination`)  | 点击上下页、切换条数下拉、条件搜索、列排序、全量重置以及模拟空数据查询          | 验证 `usePagination` 五维原子动作调度、空数组保底防御与响应式依赖自动刷新 (`refreshDeps`)                    |
| **3. 契约分页与多选**     | `src/components/SelectionDemo.vue`<br/>(`#domain-pagination`)   | 单选商品、全选/反选当前页、清空已选，切换到第 2 页验证跨页选择记忆              | 验证 `useSelection` 对 64 位雪花 Long ID 大数字符串安全归一化与跨页勾选集合记忆状态机                        |
| **4. 时序竞态与防刷锁**   | `src/components/LatestDemo.vue`<br/>(`#domain-anti-race`)       | 高频交替点击“慢速请求 (1500ms)”与“极速请求 (200ms)”按钮                         | 验证 `useLatest` 在途请求“物理中断 (`AbortController`) + 逻辑过期丢弃”双重协同防御，彻底杜绝时序倒挂         |
| **4. 时序竞态与防刷锁**   | `src/components/IdempotentDemo.vue`<br/>(`#domain-anti-race`)   | 连续疯狂点击“模拟下单”按钮；测试超时防死锁机制                                  | 验证 `useIdempotent` 提交互斥加锁、快速连打拦截与 3000ms 超时强制防死锁释放保护                              |
| **5. 响应式鉴权与多租户** | `src/components/AuthTenantDemo.vue`<br/>(`#domain-auth-tenant`) | 登录注入 Token、手动注销、切换租户切片（研发/生产/租户B）与模拟 401 凭据失效    | 验证 `useAuth` 双轨 Token 存取/细粒度权限通配与 `useTenant` 动态租户切换及响应式联动                         |
| **6. 二进制与流式导出**   | `src/components/ExcelDemo.vue`<br/>(`#domain-binary`)           | 点击触发流式 Excel 导出下载；触发带有服务端 500 JSON 错误的异常下载             | 验证 `useExcel` 基于 Apache Fesod 协议的 RFC 5987 文件名提取、Blob-JSON 双态拦截与内存确定性回收             |
| **6. 二进制与流式导出**   | `src/components/UploadDemo.vue`<br/>(`#domain-binary`)          | 选择虚拟大文件 (10MB/50MB)、点击切片并发上传、暂停与断点恢复                    | 验证 `useUpload` 纯原生切片计算、受控并发上传 (默认 3)、单调递增加权进度与状态机流转                         |
| **7. 实时长连与 SSE**     | `src/components/StreamDemo.vue`<br/>(`#domain-realtime`)        | 发起 AI 大模型 SSE 问答流，实时查看增量打字机流式文本展示与手动断开             | 验证 `useStream` 原生 ReadableStream 增量流消费、自动解析与作用域销毁时自动级联中断                          |
| **7. 实时长连与 SSE**     | `src/components/WebSocketDemo.vue`<br/>(`#domain-realtime`)     | 建立全双工长连，模拟双向心跳保活、模拟网络异常闪断 (1006) 与离线缓冲队列        | 验证 `useWebSocket` 四态状态机、双向心跳假死超时判定、指数退避重连与受控离线队列 Flush                       |
| **8. 视觉防抖与标签导航** | `src/components/AntiFlickerDemo.vue`<br/>(`#domain-visual-nav`) | 对比触发 50ms 极速接口（0ms 露头）与 180ms/600ms 请求（≥300ms 平滑展示）        | 验证 `useAntiFlicker` 150ms 静默延迟保护与 300ms 最小展示期，彻底消除 1 帧闪现“鬼影”                         |
| **8. 视觉防抖与标签导航** | `src/components/TabsNavDemo.vue`<br/>(`#domain-visual-nav`)     | 打开候选页面、关闭当前/其他/全部标签、局部刷新、测试超过 5 个标签时的淘汰       | 验证 `useTabsNav` 多标签增删查改、Affix 固钉保护、FIFO 自动淘汰与 KeepAlive `cachedViews` 白名单同步         |

---

## 4. 全真自动化回归命令

```bash
pnpm --filter @atengk/vue --filter sample-vue typecheck && \
pnpm --filter @atengk/vue --filter sample-vue lint && \
pnpm --filter @atengk/vue test && \
pnpm --filter sample-vue build
```

> 详细原理机制、Props/Options 接口清单与生产边界，请参阅核心子包文档：[@atengk/vue README](../../packages/vue/README.md)。
