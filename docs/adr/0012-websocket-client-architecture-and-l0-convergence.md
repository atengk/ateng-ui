# 0012. WebSocket 全双工长连接客户端架构与 L0 最终收敛决策

## 状态

Accepted (已接受)

## 背景与决策上下文

在完成 HTTP 请求管道、SSE 流式打字机（`StreamClient`）、网络高可用重试/去重与数据安全增强套件后，`@atengk/core` (L0) 底座已高度完备。在组织全维推演过程中，团队深入审视了 L0 基础设施的最终收敛边界与剩余候选能力：

1. **协议矩阵缺失**：目前 L0 具备了 HTTP（请求-响应模型）与 SSE（服务端到客户端单向流模型），但在企业级协作看板、实时监控告警、IM 通讯及协同编辑场景中，缺乏纯原生双向全双工通信（WebSocket）支撑；
2. **候选特性冗余风险**：推演中梳理的其余候选能力（如 `EventBus` 事件总线、`NetworkDetector` 弱网探测器、`CryptoHelper` 通用加解密、`IndexedDB` 大容量存储），经严苛审查发现多存在“过度设计、破坏无状态流、或与现代前端开发理念相悖”的硬伤；
3. **原生规范边界**：原生浏览器 W3C `WebSocket` API 缺乏应用层心跳探针（底层 Ping/Pong 对 JS 不可见）、断线重连、握手自定义 Header（规范限制）及连接就绪前发送缓冲能力，直接在业务视图使用极易引发假死与时序异常。

## 架构决策

基于“**反过度设计、核心优先、纯原生零臃肿与确定性生命周期**”原则，确立以下架构决策：

1. **果断剔除 4 项非核心候选项**：
   - 彻底否决 `EventBus`：Vue 3 官方已废弃 `$on/$off`，提倡显式单向数据流与状态机，全局总线极易诱发幽灵回调与状态污染；
   - 彻底否决 `NetworkDetector`：原生 3 行事件监听即足，薄层封装无实质信息增量；
   - 彻底否决 `CryptoHelper`：加解密规范碎片化（如国密 SM2/3/4 或特化 Padding），已有 `RequestSigner`（SHA-256 原生哈希），通用加解密易高不成低不就；
   - 彻底否决 `IndexedDB`：企业中后台 99% 场景 `CacheStorage`（LocalStorage+TTL）已足够，IndexedDB 违背轻量底座初衷。
2. **纯原生 WebSocket 客户端门面 (`WebSocketClient`)**：
   - 仅依赖 W3C 标准 `WebSocket` API，零第三方通信协议依赖（不绑定 STOMP 或 Socket.io）；
   - **双向心跳保活探针 (Ping/Pong)**：开箱标配定时发送应用层 `ping` 消息，并在超时时间（`timeout`）内检测 `pong` 响应，一旦对端假死超时主动中断底层连接并触发重连；
   - **受控容量离线缓冲队列**：配置 `bufferWhileConnecting: true` 与 `maxBufferSize: 100`。在 `CONNECTING` 或断线重连期间调用 `send()` 自动安全暂存并在就绪后 Flush 冲刷发送；超出最大上限时丢弃最旧数据并打印告警；
   - **动态 URL 凭据透传**：支持入参 `url: string | (() => string | Promise<string>)`，内部提供自动参数拼装器，动态追加 `AuthManager.getToken()` 与 `TenantManager.getTenantId()` 至 URL Query 参数；
   - **双层对称生命周期与消息订阅**：底层标准暴露 `on('open' | 'close' | 'error' | 'message')`，高阶提供 `subscribe<T>(type, handler)` 主题分发；`close()` 时 100% 确定性注销定时器、断开连接并清空缓冲区；
   - **指数退避自动重连**：连接异常断开时按指数退避算法自动尝试重建连接，主动调用 `close()` 时永久停止。
3. **L0 核心底座最终收敛与封顶**：
   - `WebSocketClient` 作为 `@atengk/core` 的终极特性落地并跑通自验展厅后，L0 核心底座正式封顶闭环；
   - 后续研发重心全面切换至 L1 无头响应式层（`@atengk/vue`）与 L3 组件库（`@atengk/element-plus`）。

## 效果与权衡

- **收益**：
  - 达成现代前端网络协议“三位一体”大一统格局（HTTP 管道 + SSE 单向流 + WebSocket 双向长连接）；
  - 封死了无效边缘特性的无限蔓延，保持 L0 极致纯净与高内聚；
  - 工业级假死识别与优雅缓冲使上层业务调用体验达到极简。
- **代价**：
  - 相比极简裸封装，增加了应用层心跳状态机与缓冲队列代码（纯原生约 300 行），但单测矩阵能达到 100% 覆盖守护。
