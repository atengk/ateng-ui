# 0031. VideoPlayer L2 专用扩展层架构、流媒体解耦与安防矩阵治理策略

## 状态

Accepted (已接受)

## 背景与决策上下文

在企业级现代 Web 应用、工业物联网与园区安防系统中，视频播放具有极其广泛且关键的业务诉求：

1. **全场景跨度大**：既需要覆盖普通中后台的富媒体点播（MP4/WebM，控制栏、倍速、精准 Seek、清晰度切换、记忆续播、缩略图、逐帧步进、截图），又需要支撑低延迟直播（HLS/FLV，直播追帧、断流重连），更需要应对企业安防监控（1/4/9/16 路多视频分屏联动矩阵、选路聚焦、云台 PTZ 控制、电子放大）以及互动场景（弹幕、外挂字幕、时间轴打点）；
2. **轻量中立底线与重型引擎体积失控的矛盾**：若将音视频解码与播放器打包直接塞入 `@atengk/element-plus`，会导致基础 UI 库体积膨胀数百 KB，并强绑 Element Plus，破坏纯 Vue 3 宿主通用性；
3. **开源生态陷阱与合规红线**：市面上安防播放器（如 Jessibuca 开源版）普遍采用传染性极强的 **GPL-3.0** 开源协议，若直接作为依赖引入会导致整个商业系统代码库被强制传染开源；且部分引擎在浏览器端依赖 WASM 软解 H.265，在 4/9/16 路分屏场景下会瞬间导致 CPU 100% 满载卡死；
4. **企业级非功能韧性契约融合缺位**：开源播放器默认无法联动系统的安全鉴权机制（如 `AuthManager` 的双轨 Token 请求头注入、微服务多网关路由）；在视频鉴权失败时，后端返回 `application/json` 错误实体，直接交付播放器二进制解码会导致白屏死锁，违背了系统级 [ADR-0004](./0004-blob-error-dual-state-and-fesod-excel-protocol.md) 双态防御规范；同时缺乏多路分屏切换时的确定性内存清理与原生全屏下的防录屏防篡改水印保护。

为彻底解决音视频全场景需求与系统工业级防线之间的矛盾，确立本系统级架构决策。

## 架构决策

基于“**L2 领域扩展解耦、MIT 纯净协议基底、解复用器标准化挂载、GPU 硬件直通优先、安防协议解耦、四大非功能韧性防线**”原则，确立以下架构决策：

### 1. 四层洋葱拓扑定级与独立包坐标 (@atengk/video-player-vue)

- **分层归属**：正式归入 **L2 专用能力/领域扩展层 (Extension Layer)**；
- **npm 坐标与物理目录**：
  - 命名为 `@atengk/video-player-vue`，源码目录位于 `packages/video-player-vue`，配套自验展厅 `apps/sample-video-player-vue`；
  - 架构上完美对齐并预留未来 React 镜像包 `@atengk/video-player-react`（`packages/video-player-react`）；
- **单向拓扑与 UI 中立铁律**：
  - 仅依赖 L0 (`@atengk/core`)、L1 (`@atengk/vue`)、`artplayer`、`hls.js`、`mpegts.js`；
  - **严禁逆向物理依赖 L3 `@atengk/element-plus`**，保持纯 Vue 3 宿主通用性；
  - 严格纳入根目录 `CONTEXT-MAP.md` 拓扑登记与 Changesets 独立发版体系。

### 2. 底层驱动引擎与编解码硬直通选型

- **核心播放器底座**：
  - 采用 **Artplayer.js (`^5.1.0`)** 作为底层核心引擎。代码采用宽松商业友好的 **MIT 协议**（零开源传染风险），体积精炼（核心 Gzip 仅 ~25KB），全量原生 TS 强类型契约，分屏多实例内存开销低，具备完善的 layers、controls 与 destroy 清理机制。
- **协议解封装核心库**：
  - **HLS**：采用业界事实标准 **`hls.js` (`^1.5.0`)**，通过 `xhrSetup` 拦截清单与切片请求；
  - **FLV / TS**：采用 Bilibili 官方维护的活跃分支 **`mpegts.js` (`^1.7.0`)**（彻底淘汰停更归档的 `flv.js`），利用其内置的 `liveBufferLatencyChasing`（直播追帧）与 `autoCleanupSourceBuffer`（自动清理旧切片防泄露）。
- **H.265 (HEVC) 编解码策略**：
  - 全面基于现代浏览器（Chrome 107+、Edge、Safari）原生开通的 **WebCodecs / MSE GPU 硬件直通解码**；在 16 路分屏下 CPU 占用仅 15%~25%；
  - **坚决不默认内置 WASM 软解**（避免 4 路分屏 CPU 100% 满载卡死）；极少数旧终端推行流媒体服务端转码 H.264。
- **安防专用引擎 (Jessibuca) 风险隔离**：
  - 鉴于其 GPL-3.0 协议核污染风险，严禁将其作为默认内置依赖；在架构层设计 `IVideoPlayerEngine` 适配器接口，供有商业授权的用户在业务层按需自行注入。

### 3. 多路分屏协同矩阵与云台协议解耦

- **多路分屏矩阵容器 (`<AtengVideoGrid />`)**：
  - 原生 CSS Grid 自适应布局，提供 `1x1`、`2x2`、`3x3`、`4x4` 对称宫格及 `1+5`、`1+7` 非对称主从布局；
  - 支持单路点击高亮选中聚焦、双击瞬间平滑独占全屏与按 ESC 恢复；
  - 无头状态机 `useVideoGrid()` 内置自动轮巡调度器 (Touring)。
- **多路音频互斥不变量 (Audio Muting Invariant)**：
  - 多路分屏中除当前激活的单路视口外，其余所有路数默认强制静音（`muted: true`），兼顾浏览器自动播放限制与系统性能。
- **云台控制组件 (`<AtengPtzControl />`)**：
  - 独立八方向罗盘与变焦面板，配合视频画面拖拽手势；
  - 纯通过 `@command="(cmd: PtzCommand) => ..."` 派发强类型语义动作事件，与 GB28181/ONVIF 后端网络协议 100% 解耦。

### 4. 弹幕隔离与时间轴打点机制

- **时间轴打点 (Markers) 原生内置**：
  - 高频用于安防回放标记、重点事件溯源与视频课程章节，直接由 `<AtengVideoPlayer />` 的 `markers` 属性驱动，进度条渲染标记并支持 Hover 卡片提示与快速跳转。
- **弹幕系统 (Danmaku) 独立插件化**：
  - 作为按需分包导出（`@atengk/video-player/plugins/danmaku`），利用 Canvas 高性能图层渲染，未使用的项目享受 **0 字节打包残留**，严守系统极致 Tree-Shaking 铁律。

### 5. 四大企业级非功能硬性防线

1. **Token 鉴权双轨注入**：
   - 封装 `TokenInjector`，全链路对接 `@atengk/core` 的 `AuthManager`，自动注入 `token` 与 `Authorization: Bearer`；
2. **Blob-JSON 双态异常防崩溃拦截 (ADR-0004 机制迁移)**：
   - 在流媒体探测与切片加载管道中实施拦截：若 HTTP 状态码为 401/403/500 或响应头为 `application/json`，解析 JSON 提取 `BusinessException` 并携带 `traceId` 抛出，阻断二进制投喂解复用器，杜绝白屏与黑屏假死；
3. **确定性彻底销毁六步防线 (Deterministic Teardown)**：
   - 在 `onScopeDispose` / `onUnmounted` 中执行：1. 取消网络请求 ➔ 2. 卸载解封装器 ➔ 3. 释放 MSE SourceBuffer ➔ 4. 解绑 video.src 触发 GC ➔ 5. 清理定时器 ➔ 6. 销毁 Artplayer 实例；
4. **防录屏与防篡改动态安全水印**：
   - 全屏提升为播放器顶层容器全屏（Container Fullscreen），破解原生全屏丢弃 DOM 水印的缺陷；
   - 搭载 `MutationObserver` 监听 DOM 树篡改，样式篡改或节点被删除时毫秒级自动就地自愈，并支持随机浮动微位移。

## 影响评估与收益

- **积极影响**：
  - 补齐了 `ateng-ui` 在高品质音视频、流媒体直播、企业监控与工业物联网场景的核心基础设施拼图；
  - 保持纯 Vue 3 中立性，不破坏 `@atengk/element-plus` 的轻量基线；
  - 零 GPL 开源协议传染风险，商业化绝对安全；
  - 100% 具备端到端企业鉴权、防白屏容错、确定性无泄漏销毁与涉密安全水印保护。
- **潜在代价与妥协**：
  - 对 H.265 依赖现代浏览器 GPU 硬解直通，对老旧未开启硬件加速的极端古董浏览器需配合服务端转码 H.264。
