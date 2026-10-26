# VideoPlayerVue (企业级流媒体与多路视频播放扩展 - Vue 3 版)

面向现代 Web 应用与企业级安防物联网的工业级音视频与多路监控播放基础设施，纯 Vue 3 驱动，基于轻量解耦内核构建，提供标准点播、HLS/FLV 低延迟直播、多路分屏协同矩阵、安防云台协议解耦控制、动态防篡改安全水印与全维企业级非功能韧性防线。

- **npm 坐标**：`@atengk/video-player-vue`
- **源码工程**：`packages/video-player-vue`
- **自验展厅**：`apps/sample-video-player-vue`
- **对称架构**：预留未来 React 镜像包 `@atengk/video-player-react`

## 表现容器与协同组件

**AtengVideoPlayer**:
单路音视频与流媒体播放核心容器组件。内置纯 CSS/SVG 现代控制栏、缓冲进度感知与状态反馈，支持插槽全量定制，专职处理 MP4/WebM 点播、HLS/FLV 低延迟直播及全屏安全水印渲染。
_Avoid_: VideoComponent, MediaPlayer, WebPlayer, StreamPlayer

**AtengVideoGrid**:
多路视频分屏协同矩阵容器组件。支持 1/4/9/16 对称宫格及 1+5/1+7 非对称主从布局，提供选路高亮聚焦、双击单路平滑全屏放大还原及多路音频互斥控制。
_Avoid_: AtengSplitPlayer, MultiPlayer, VideoMatrix, GridScreen

**AtengPtzControl**:
安防摄像头云台八方向控制盘与变焦面板组件。通过纯强类型语义事件对外派发控制指令，与具体的 GB28181/ONVIF 后端网络协议完全解耦。
_Avoid_: AtengVideoPtz, CameraJoystick, PtzPanel, GimbalControl

**AtengVideoWatermark**:
防篡改动态安全水印容器组件。支持工号、姓名、IP 与时间戳等元信息微位移浮动，搭载 MutationObserver 审查监听与毫秒级防删除自愈，原生全屏与网页全屏均 100% 完整覆盖。
_Avoid_: ScreenWatermark, VideoShield, SafeOverlay

## 无头控制与状态机

**useVideoPlayer**:
单路视频播放会话生命周期与底层引擎指令控制的无头组合式 Hook。导出 playing、currentTime、duration、volume、buffered、fullscreen、quality 等响应式状态，以及 play、pause、seek、setSpeed、switchQuality、screenshot、destroy 等操作指令。
_Avoid_: usePlayerSession, useMediaState, useVideoController

**useVideoGrid**:
多路分屏矩阵生命周期、通道分配、焦点选路与自动轮巡调度的无头组合式 Hook。导出 channels、activeChannelId、layout、touring 等响应式状态，以及 setLayout、selectChannel、maximizeChannel、startTour、stopTour 等编排指令。
_Avoid_: useSplitState, useMatrixController, useMultiPlayer

**usePtz**:
云台控制交互状态机。收敛八方向移动、步进速度、变倍聚焦、预置位切换与手势拖拽计算，对外派发统一的标准化云台控制载荷。
_Avoid_: useGimbal, useCameraControl

**useDigitalZoom**:
纯前端电子放大与画面平移拖拽状态机。基于 CSS Transform 硬件加速实现 1.0x~5.0x 滚轮视口无级缩放与阻尼边界约束。
_Avoid_: useVideoZoom, usePanZoom

**useStreamReconnect**:
流媒体断流与网络波动指数退避重连状态机。根据解码停滞、网络错误与超时信号，自动执行抖动重连并维护可重试次数。
_Avoid_: useRetry, useAutoConnect

## 解耦引擎与协议驱动

**IVideoPlayerEngine**:
底层播放驱动核心的抽象适配器接口 (SPI)。定义播放控制、流媒体加载、事件监听与销毁回收的标准生命周期契约，支持未来第三方引擎无缝替换。
_Avoid_: PlayerDriver, EngineBridge, MediaAdapter

**ArtplayerEngine**:
基于 Artplayer.js 封装的默认推荐工业级生产引擎适配器。实现纯解耦流媒体挂载、毫秒级事件响应与彻底资源回收。
_Avoid_: ArtDriver, DefaultEngine

**HlsDriver**:
基于 hls.js 构建的 HTTP Live Streaming (.m3u8) 协议流驱动器。支持 ABR 自适应码率切换、低延迟切片追帧及 Token Header 双轨拦截注入。
_Avoid_: M3u8Loader, HlsClient

**MpegtsDriver**:
基于 mpegts.js 构建的 HTTP-FLV / WebSocket-FLV 协议流驱动器。内置追帧状态机与 SourceBuffer 自动清理，杜绝长连接内存泄露。
_Avoid_: FlvDriver, TsLoader

## 扩展插件与非功能防线

**DanmakuPlugin**:
基于 Canvas 高性能渲染的弹幕系统插件。作为独立按需分包导出，未使用的业务项目享受 0 字节体积残留。
_Avoid_: BarrageModule, DanmuCore

**TimelineMarker**:
时间轴关键帧打点与事件标注项。原生内置于进度条，支持 Hover 悬浮预览与快速跳转。
_Avoid_: VideoTag, ProgressPoint, EventBookmark

**TokenInjector**:
对媒体流切片与清单请求实施鉴权凭据透传的拦截器。全链路对接 @atengk/core 的 AuthManager 注入双轨请求头。
_Avoid_: HeaderSetter, AuthInterceptor

**BlobJsonGuard**:
针对鉴权失败或资源不存在时后端返回 JSON 报错实体的双态拦截器。阻断二进制投喂解复用器，转译抛出类型安全的 BusinessException。
_Avoid_: ErrorSniffer, JsonDetector
