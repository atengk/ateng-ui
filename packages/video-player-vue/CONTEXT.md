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

**usePtzGesture**:
视频画面手势联动云台状态机。将用户在视频视口上的拖拽向量通过 8 个 45° 象限扇区算法精准映射为标准化八方向云台控制动作，支持滚轮变倍缩放与松手自动发送 stop 指令，与底层网络协议彻底解耦。
_Avoid_: usePtz, useGimbal, useCameraControl, useVideoGesture

**useDigitalZoom**:
纯前端电子放大与画面平移拖拽状态机。基于 CSS Transform 硬件加速实现 1.0x~5.0x 滚轮视口无级缩放与阻尼边界约束。
_Avoid_: useVideoZoom, usePanZoom

**useStreamReconnect**:
流媒体断流与网络波动指数退避重连状态机。根据解码停滞、网络错误与超时信号，自动执行抖动重连并维护可重试次数。
_Avoid_: useRetry, useAutoConnect

**useVideoPlaybackHistory**:
本地播放历史与记忆续播响应式状态机。基于 localStorage 自动记录媒体播放进度时间戳，支持二次打开时自动恢复或交互式卡片提示恢复，提供防抖保存与历史进度清空。
_Avoid_: usePlayHistory, useResumeState, useProgressStorage

**useVideoSubtitles**:
外挂多轨双语字幕同步与语言切换状态机。基于 WebVTT/SRT 解析片元实现当前播放时刻的字幕检索、多语言活动音轨切换与作用域插槽解构。
_Avoid_: useCaptionState, useSubtitles, useVttSync

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

**DanmakuEngine**:
纯 Canvas 2D 硬件加速的弹幕渲染核心引擎。负责弹幕发射、双重黑白描边、视网膜高清自适应、多重屏蔽规则与每秒 60 帧动画循环。
_Avoid_: BarrageEngine, CanvasDanmu

**DanmakuTrackPool**:
弹幕轨道通道防重叠与相对速度追尾预测调度池。根据视口与字号推导可用轨道，执行进屏尾部碰撞检测与追尾预测计算，负载均衡分配空闲通道。
_Avoid_: DanmuTrackManager, BarragePool

**TimelineMarker**:
时间轴关键帧打点与事件标注项。原生内置于进度条，支持 Hover 悬浮预览与快速跳转。
_Avoid_: VideoTag, ProgressPoint, EventBookmark

**TokenInjector**:
对媒体流切片与清单请求实施鉴权凭据透传的拦截器。全链路对接 @atengk/core 的 AuthManager 注入双轨请求头。
_Avoid_: HeaderSetter, AuthInterceptor

**BlobJsonGuard**:
针对鉴权失败或资源不存在时后端返回 JSON 报错实体的双态拦截器。阻断二进制投喂解复用器，转译抛出类型安全的 BusinessException。
_Avoid_: ErrorSniffer, JsonDetector

## 异常兜底与领域中立术语

**视频信号源 (Signal Source)**:
实时流媒体传输通道（直播、安防摄像头、推流网关）的通用抽象中立称谓。当断流或网络不可达时，统一提示“视频信号源连接已中断 / 重新拉取信号”。
_Avoid_: 主播推流, 直播间, 频道信号

**媒体资源 (Media Resource)**:
点播（VOD）、静态音视频文件或录像回放的通用抽象称谓。当文件不存在或读取超时时，统一提示“媒体资源加载失败 / 重新加载”。
_Avoid_: 视频文件损坏, 电影失效
