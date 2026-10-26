# @atengk/video-player-vue

面向现代 Web 应用、企业级物联网与安防监控的工业级流媒体视频播放基础设施与无头状态机。

遵循 Monorepo 四层洋葱拓扑律（L2 专用能力扩展层），严格保持对表现层 UI 库（如 Element Plus）的零依赖，纯原生基于 TypeScript 5.6 + Vue 3.5 构建，兼顾点播、直播、多路分屏、防录屏水印与安防云台控制。

---

## 0. 特性与公共 API 全景速查矩阵

| 特性分类         | 特性名称                        | 核心门面 / 组件 / Hook                                                                                                                  | 关键参数 / Props / Emits                                                                       | 核心行为说明                                                                               | 锚定验证源头 (*Test / Sample)                                         |
| :--------------- | :------------------------------ | :-------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------- | :-------------------------------------------------------------------- |
| **基础渲染**     | 单路视频播放容器                | `<AtengVideoPlayer />`                                                                                                                  | `url`, `type`, `isLive`, `reconnect`, `liveBufferLatencyChasing`                               | 开箱即用视频播放器，内置六步销毁、错误退化与插槽浮层                                       | `AtengVideoPlayer.test.ts` / `sample-video-player-vue/VodDemo.vue`    |
| **无头状态机**   | 响应式播放状态机                | `useVideoPlayer(options)`                                                                                                               | `url`, `autoplay`, `volume`, `loop`                                                            | 纯无头播放状态编排，抗竞态且具备响应式生命周期回收                                         | `AtengVideoPlayer.test.ts`                                            |
| **断流重连**     | 指数退避重连状态机              | `useStreamReconnect(options)`                                                                                                           | `maxRetries`, `baseDelay`, `maxDelay`, `jitter`, `triggerReconnect`                            | 工业级指数退避重连算法与 ±20% 抖动抗惊群，硬失败转接与定时器确定性清理                     | `stream.test.ts` / `sample-video-player-vue/LiveDemo.vue`             |
| **记忆续播**     | 本地历史与续播状态机            | `useVideoPlaybackHistory()`                                                                                                             | `url`, `autoResume`, `autoPlayResume`, `clearHistory`, `saveProgress`                          | 基于 localStorage 记忆播放进度，支持弹窗提示、恢复后自动播放、防抖写入与一键重放           | `deepVOD.test.ts` / `sample-video-player-vue/DeepVodDemo.vue`         |
| **热键与步进**   | 键盘热键与逐帧微调              | `engine.step()`, `engine.stepFrame()`                                                                                                   | `hotkey: boolean`, `step(seconds)`, `stepFrame(frames, fps)`                                   | 支持空格播放暂停、方向键快进快退音量、F全屏、M静音、[,]/[,]逐帧微调，输入框安全防穿透      | `deepVOD.test.ts` / `sample-video-player-vue/DeepVodDemo.vue`         |
| **时间轴打点**   | 关键帧标注与点击跳帧            | `<AtengVideoPlayer />`                                                                                                                  | `markers: VideoMarkerItem[]`, `@marker-click`                                                  | 时间轴高亮打点、悬浮卡片提示、颜色定制，点击打点实现精准快速跳帧                           | `deepVOD.test.ts` / `sample-video-player-vue/DeepVodDemo.vue`         |
| **缩略图预览**   | 进度条 Hover 预览               | `<AtengVideoPlayer />`                                                                                                                  | `thumbnails: VideoThumbnailOptions`                                                            | 支持传入雪碧图切片配置或 WebVTT 格式，鼠标悬浮进度条展示动态帧预览卡片                     | `deepVOD.test.ts` / `sample-video-player-vue/DeepVodDemo.vue`         |
| **多路分屏矩阵** | `<AtengVideoGrid />`            | `channels`, `layout`, `activeId`, `autoSubStream`, `audioExclusive`, `gap`, `themeColor`, `@select`, `@channel-dblclick`, `@restore`    | 原生 CSS Grid 驱动，支持 1/4/9/16 对称宫格及 1+5/1+7 广播级主从分屏，自适应窗口缩放            | `grid.test.ts` / `sample-video-player-vue/GridDemo.vue`                                    |
| **分屏状态机**   | `useVideoGrid(options)`         | `channels`, `layout`, `autoSubStream`, `audioExclusive`, `activeId`                                                                     | 纯无头分屏编排状态机，内置通道容量推导、选路聚焦、双击独占放大、主次码流自适应与自动轮巡调度器 | `grid.test.ts` / `sample-video-player-vue/GridDemo.vue`                                    |
| **分屏容量推导** | `getLayoutCapacity(layout)`     | `layout: VideoGridLayout`                                                                                                               | 纯函数计算布局最大容纳通道数（1x1->1, 2x2->4, 3x3->9, 4x4->16, 1+5->6, 1+7->8）                | `grid.test.ts`                                                                             |
| **云台控制盘**   | `<AtengPtzControl />`           | `speed`, `presets`, `disabled`, `showOptical`, `showSpeed`, `showPresets`, `@command`, `@speed-change`, `@preset-add`, `@preset-delete` | 八方向罗盘、光学变焦/变倍/光圈调控、预置位管理，纯语义化指令派发与具体协议 100% 解耦           | `ptz.test.ts` / `sample-video-player-vue/PtzDemo.vue`                                      |
| **电子放大**     | `useDigitalZoom(options)`       | `initialScale`, `minScale`, `maxScale`, `step`, `containerRef`, `onZoomChange`                                                          | 纯前端 CSS Transform 硬件加速实现 1.0x~5.0x 滚轮无级缩放与平移拖拽，具备防脱框边界阻尼         | `ptz.test.ts` / `sample-video-player-vue/PtzDemo.vue`                                      |
| **手势联动**     | `usePtzGesture(options)`        | `threshold`, `speed`, `onCommand`                                                                                                       | 捕获画面拖拽向量并基于角度数学模型推导 8 方位云台指令，滚轮变焦，松手自动发送 stop 脉冲        | `ptz.test.ts` / `sample-video-player-vue/PtzDemo.vue`                                      |
| **方位向量推导** | `calculatePtzDirection(dx, dy)` | `dx: number`, `dy: number`                                                                                                              | 纯数学函数，将屏幕位移向量精准映射到 8 个 45° 象限扇区（up/down/left/right 及四对角）          | `ptz.test.ts`                                                                              |
| **安全水印**     | 防录屏安全水印容器              | `<AtengVideoWatermark />`                                                                                                               | `content`, `opacity`, `rotate`, `floating`, `tamperProof`, `@watermark-tampered`               | Canvas/SVG 矢量平铺，动态微位移随机浮动破坏录屏反算法，MutationObserver 审查防篡改毫秒自愈 | `watermark.test.ts` / `sample-video-player-vue/WatermarkDemo.vue`     |
| **底层引擎 SPI** | Artplayer 适配引擎              | `ArtplayerEngine`                                                                                                                       | `container`, `options`, `handlers`                                                             | 适配 Artplayer 内核，固化确定性销毁六步防线与 GPU 缓冲回收                                 | `invariants.test.ts` / `ArtplayerEngine.ts`                           |
| **流媒体驱动**   | HLS 播放驱动                    | `HlsDriver`                                                                                                                             | `video`, `url`, `options`                                                                      | 基于 hls.js 驱动，支持 ABR 码率自适应、Safari 降级与 xhrSetup 鉴权拦截                     | `stream.test.ts` / `sample-video-player-vue/LiveDemo.vue`             |
| **流媒体驱动**   | HTTP-FLV 播放驱动               | `MpegtsDriver`                                                                                                                          | `video`, `url`, `options`                                                                      | 基于 mpegts.js 驱动，支持低延迟直播、智能毫秒追帧与 autoCleanupSourceBuffer 防内存泄漏     | `stream.test.ts` / `sample-video-player-vue/LiveDemo.vue`             |
| **安全鉴权**     | 企业凭据双轨注入器              | `TokenInjector`                                                                                                                         | `injectHeaders()`, `injectXhr()`, `injectFetch()`, `injectUrl()`                               | 全链路对接 `@atengk/core` 的 `AuthManager`，双轨注入 `token` 与 `Authorization`            | `invariants.test.ts` / `sample-video-player-vue/AuthSecurityDemo.vue` |
| **白屏守卫**     | ADR-0004 双态探测               | `BlobJsonGuard`                                                                                                                         | `probeMediaStream()`, `parseJsonError()`, `toBusinessException()`                              | 嗅探 401/403/500 JSON 异常并转译为强类型 `BusinessException`，避免解复用白屏死锁           | `invariants.test.ts` / `sample-video-player-vue/AuthSecurityDemo.vue` |
| **类型契约**     | 核心强类型全量定义              | `IVideoPlayerEngine`, `VideoPlayerProps`, `VideoPlayerOptions`                                                                          | 详见 `types/index.ts`                                                                          | 100% 强类型覆盖，零裸 `any`                                                                | `types/index.ts`                                                      |

---

## 1. 最小起步体验 (Happy Path)

### 1.1 安装依赖

```bash
pnpm add @atengk/video-player-vue @atengk/core @atengk/vue
```

### 1.2 极简点播接入

```vue
<script setup lang="ts">
import { AtengVideoPlayer } from '@atengk/video-player-vue';
import '@atengk/video-player-vue/dist/index.css';
</script>

<template>
  <div style="width: 800px; aspect-ratio: 16 / 9;">
    <AtengVideoPlayer
      url="https://artplayer.org/assets/sample/video.mp4"
      poster="https://artplayer.org/assets/sample/poster.jpg"
      title="示例高清视频"
    />
  </div>
</template>
```

---

## 2. 生产扩展接管 (Customization & Extensibility)

### 2.1 企业级鉴权双轨凭据注入

播放器默认与 `@atengk/core` 的 `authManager` 打通。当全局登录后，所有视频请求与防盗链 URL 会自动附带凭据：

```ts
import { authManager } from '@atengk/core';
import { TokenInjector } from '@atengk/video-player-vue';

// 登录时设置 Token
authManager.setToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');

// 手动为 XHR / Fetch 请求注入双轨头
const headers = TokenInjector.injectHeaders();
// 输出: { token: '...', Authorization: 'Bearer ...' }

// 手动拼接防盗链直链
const signedUrl = TokenInjector.injectUrl('https://stream.example.com/live.m3u8');
```

### 2.2 自定义业务异常呈现与一键重试 (#error 插槽)

遵循系统级 **ADR-0004** 规范，当接口遇到 401（未授权）或 403（越权）并返回 JSON 报错体时，播放器会自动拦截并转译为 `BusinessException`：

```vue
<template>
  <AtengVideoPlayer url="https://video.example.com/protected.mp4" :probe-stream="true">
    <!-- 自定义错误呈现 -->
    <template #error="{ error, retry }">
      <div class="custom-error-box">
        <h4>播放中断 [{{ error.code }}]</h4>
        <p>{{ error.msg }}</p>
        <small v-if="error.traceId">全链路追踪 ID: {{ error.traceId }}</small>
        <button @click="retry">重试连接</button>
      </div>
    </template>
  </AtengVideoPlayer>
</template>
```

### 2.3 低延迟流媒体直播与断流指数退避重连

```vue
<template>
  <AtengVideoPlayer
    url="https://live.example.com/cctv.flv"
    type="flv"
    :is-live="true"
    :live-buffer-latency-chasing="true"
    :chase-threshold="3"
    :reconnect="{
      maxRetries: 5,
      baseDelay: 1000,
      maxDelay: 8000,
      jitter: true,
    }"
  >
    <!-- 自定义断流重连彻底硬失败插槽 -->
    <template #reconnect-failed="{ error, retry }">
      <div class="stream-fail-card">
        <p>直播信号源中断，重试多次失败</p>
        <button @click="retry">手动重新拉流</button>
      </div>
    </template>
  </AtengVideoPlayer>
</template>
```

### 2.4 点播深水区：精准 Seek、逐帧微调、记忆续播与时间轴打点

```vue
<template>
  <AtengVideoPlayer
    url="https://artplayer.org/assets/sample/video.mp4"
    :auto-resume="true"
    :auto-play-resume="false"
    :hotkey="true"
    :markers="[
      { time: 10, text: '精彩进球', color: '#f59e0b' },
      { time: 35, text: '战术复盘关键帧', color: '#10b981' },
    ]"
    :thumbnails="{
      url: 'https://artplayer.org/assets/sample/thumbnails.png',
      number: 60,
      column: 10,
      width: 160,
      height: 90,
    }"
    @resume="time => console.log('已恢复上次播放进度:', time)"
    @marker-click="marker => console.log('点击打点:', marker.text)"
  />
</template>
```

### 2.5 涉密视频安全水印与 F12 审查防篡改自愈

```vue
<template>
  <AtengVideoPlayer url="https://video.example.com/confidential.mp4">
    <!-- 安全水印浮层 -->
    <template #watermark>
      <AtengVideoWatermark
        :content="['内部涉密 截屏追责', '工号: SEC-9527', 'IP: 192.168.1.108']"
        :opacity="0.18"
        :rotate="-22"
        :floating="true"
        :tamper-proof="true"
        @watermark-tampered="detail => console.warn('捕获恶意篡改告警:', detail)"
      />
    </template>
  </AtengVideoPlayer>
</template>
```

### 2.6 多路分屏协同矩阵与自动轮巡调度 (AtengVideoGrid)

面向监控指挥大屏与安防巡检场景，支持 1/4/9/16 对称宫格及 1+5/1+7 广播级主从分屏，自适应加载主次码流并实现音频防混音互斥：

```vue
<script setup lang="ts">
import { ref } from 'vue';
import {
  AtengVideoGrid,
  type VideoGridChannel,
  type AtengVideoGridInstance,
} from '@atengk/video-player-vue';

const gridRef = ref<AtengVideoGridInstance | null>(null);

const channels: VideoGridChannel[] = [
  {
    id: 'cam-01',
    title: '园区东门全景球机',
    url: 'https://stream.example.com/cam-01-main.mp4', // 高清主流 1080P
    subUrl: 'https://stream.example.com/cam-01-sub.mp4', // 低码率次码流 360P
  },
  {
    id: 'cam-02',
    title: '园区西门车道卡口',
    url: 'https://stream.example.com/cam-02-main.mp4',
    subUrl: 'https://stream.example.com/cam-02-sub.mp4',
  },
  // ... 更多路机位
];

// 启动自动轮巡
const handleTour = () => {
  gridRef.value?.startTour({
    interval: 8000,
    pool: channels,
    onStep: (page, items) => {
      console.log(`第 ${page + 1} 批巡更:`, items);
    },
  });
};
</script>

<template>
  <div style="width: 100%; height: 600px;">
    <AtengVideoGrid
      ref="gridRef"
      :channels="channels"
      layout="2x2"
      :auto-sub-stream="true"
      :audio-exclusive="true"
      @select="c => console.log('聚焦路:', c.title)"
      @channel-dblclick="c => console.log('独占放大机位:', c.title)"
    />
  </div>
</template>
```

### 2.7 安防云台八方向控制盘、画面手势联动与硬件加速电子放大

提供纯语义化解耦的云台调控套件 `<AtengPtzControl />`、画面手势联动 `usePtzGesture` 以及纯前端 1.0x~5.0x 滚轮硬件加速电子放大 `useDigitalZoom`：

```vue
<script setup lang="ts">
import { ref } from 'vue';
import {
  AtengPtzControl,
  AtengVideoPlayer,
  useDigitalZoom,
  usePtzGesture,
  type PtzCommand,
} from '@atengk/video-player-vue';

const videoContainerRef = ref<HTMLElement | null>(null);

// 1. 纯前端硬件加速电子放大 (1.0x ~ 5.0x 无级缩放与平移拖拽)
const zoom = useDigitalZoom({
  minScale: 1.0,
  maxScale: 5.0,
  containerRef: videoContainerRef,
});

// 2. 视频画面手势联动 (按住拖拽八方向、滚轮变焦)
const gesture = usePtzGesture({
  threshold: 15,
  speed: 5,
  onCommand: cmd => handlePtzCommand(cmd),
});

// 3. 业务层统一处理语义化指令 (可无缝对接 GB28181、ONVIF 或 WebSocket)
const handlePtzCommand = (cmd: PtzCommand) => {
  console.log('派发云台指令:', cmd.action, '档位:', cmd.speed);
};
</script>

<template>
  <div style="display: flex; gap: 20px;">
    <!-- 视频视口 (支持电子放大与手势驱动) -->
    <div
      ref="videoContainerRef"
      style="width: 640px; height: 360px; overflow: hidden; position: relative;"
      @mousedown="zoom.startDrag"
      @wheel.passive="zoom.handleWheel"
      @dblclick="zoom.resetZoom"
    >
      <div :style="zoom.transformStyle.value">
        <AtengVideoPlayer url="https://stream.example.com/live.m3u8" />
      </div>
    </div>

    <!-- 八方向云台调谐盘 -->
    <AtengPtzControl
      :speed="5"
      :presets="[
        { index: 1, name: '园区东门' },
        { index: 2, name: '车辆卡口' },
      ]"
      @command="handlePtzCommand"
    />
  </div>
</template>
```

---

## 3. 核心生产边界与非功能语义 (Production Boundary)

### 3.1 FLV 内存泄露防爆防线与智能毫秒追帧

针对企业级安防监控 HTTP-FLV / WebSocket-FLV 持续拉流场景：

- **SourceBuffer 内存防爆**：底层通过 `mpegts.js` 强制激活 `autoCleanupSourceBuffer: true`，严格将后向保留缓冲控制在 30~60 秒的滑动窗口内，彻底杜绝长时间连续推流导致的浏览器标签页爆内存崩溃；
- **智能毫秒追帧**：当网络波动或页面切入后台导致客户端缓冲滞后超过门限（默认 3 秒）时，状态机自动启动追赶算法（轻度滞后 1.25x 加速追赶，严重滞后 >6s 瞬移至最新关键帧），确保音视频时延保持在毫秒级水准。

### 3.2 断流指数退避重连与 Jitter 防惊群

- 针对弱网环境下的推流中断或分片 404，`useStreamReconnect` 采用指数退避算法：$delay = \min(baseDelay \times 2^{attempt}, maxDelay)$；
- 引入 $\pm 20\%$ 随机抖动因子，彻底规避机房交换机重启或网络割接时全量终端同一时刻并发重连引发的雷暴雪崩。

### 3.3 确定性销毁六步防线 (Deterministic Lifecycle)

在大型 SPA 与安防监控多路分屏场景中，浏览器频繁创建与销毁视频解码器极易导致 GPU 显存泄漏与页面卡顿崩溃。本套件在 `ArtplayerEngine.destroy()` 中严格固化六步销毁防线：

1. **中断连接**：执行内部 `AbortController.abort()`，即刻切断一切未决的网络流与分片请求；
2. **注销钩子**：顺序同步触发已注册的底层解封装器（hls.js / mpegts.js）销毁回调；
3. **解绑元素**：执行 `video.pause()` 并将 `video.removeAttribute('src')` 与 `video.src = ''`；
4. **强制回收**：执行 `video.load()`，强制浏览器垃圾回收器释放底层解码器上下文与 GPU 显存缓冲；
5. **清理定时器**：彻底清空组件与引擎挂载的所有物理定时器；
6. **销毁内核**：调用 Artplayer 原生 `destroy(true)` 彻底卸载 DOM 节点与事件代理。

### 3.4 ADR-0004 Blob-JSON 双态异常识别防线

当音视频文件直链接口鉴权失效或资源下架时，服务端通常返回 `Content-Type: application/json` 的报错文本而非标准媒体二进制流。若将其直接交由二进制解封装器解析，会发生无声黑屏或解码锁死。本模块在探测流（`probeStream: true`）中前置执行双态嗅探，精准拦截 401/403/500 JSON 错误并转译为业务异常抛出。

### 3.5 容器级全屏穿越不变量与 MutationObserver 审查防篡改

- **容器级全屏穿越**：原生 HTML5 `video.requestFullscreen()` 会将媒体元素提升到独立的合成层，导致外层所有的 DOM 浮层（水印、自定义控制栏、弹幕）在原生全屏下被浏览器底层无情丢弃。本套件统一通过播放器最外层根容器发起 `container.requestFullscreen()`，确保在原生全屏与网页全屏下水印 100% 牢固覆盖不脱落；
- **防审查自愈状态机**：挂载 `MutationObserver` 双重监听，一旦黑客在浏览器 F12 中注入 `display: none`、`opacity: 0` 或通过 `remove()` 强行物理删除水印节点，状态机在毫秒级自动就地自愈重建，并向外派发 `@watermark-tampered` 安全告警事件以供安全审计留痕。

### 3.6 多路分屏主次码流自适应防爆与音频互斥不变量

- **主次码流自适应 (Sub-Stream Adaptive)**：在 4/9/16 路等对称分屏大矩阵下，若各通道盲目全量拉取 1080P/4K 主码流，极易瞬时耗尽下行带宽并造成浏览器 GPU/CPU 硬件解码器过载崩溃。状态机在容量 $>1$ 且非独占放大时，默认自动选用低码率 `subUrl`（通常为 360P/D1 码流），节约超过 70% 带宽与算力；双击独占放大时瞬间无缝切换回高清 `url`；
- **多路音频互斥不变量 (Audio Exclusive)**：多路监控同时放音会引发严重的杂音干扰与声学混响。状态机默认开启音频互斥，保证在整个视口中**仅有当前被用户选中的聚焦激活路（`activeChannelId`）允许发声**，其余所有背景路强制 `isMuted: true`。

### 3.7 纯前端硬件加速电子放大与 PTZ 协议彻底解耦架构

- **纯前端 CSS Transform 硬件加速 (Digital Zoom)**：安防场景中，前端操作者经常需要对画面特定区域（如车牌、人脸、仪表盘）进行局部微距观察。传统方案往往重新向云台请求光学变焦拉近，耗时且改变了主监控视角。`useDigitalZoom` 采用纯前端 GPU 合成层硬件加速（`translate3d` + `scale`），不仅支持 1.0x~5.0x 滚轮无级缩放与拖拽漫游，而且内置精确的边界阻尼约束算法（限制偏移量在 $(scale - 1) \times dimension / 2$ 范围），彻底杜绝画面被拖出黑边视口脱框；
- **语义化事件与网络协议 100% 彻底解耦**：`<AtengPtzControl />` 与 `usePtzGesture` 恪守工业级分层原则，组件内部绝不耦合任何 GB28181 (XML/SIP)、ONVIF (SOAP) 或特定后端 API。所有转动、变倍、聚焦、光圈与预置位操作均统一收敛为标准 `PtzCommand` 载荷派发，业务层可直接将其映射为任意私有 WebSocket 或 HTTP 网关请求。

---

## 4. 物理排版与代码全真验证

本仓库所有特性在 `apps/sample-video-player-vue` 1:1 自验展厅中均提供可交互验证用例：

- `sample-video-player-vue/VodDemo.vue`：标准点播实机体验；
- `sample-video-player-vue/DeepVodDemo.vue`：精准 Seek、逐帧微调、记忆续播与时间轴打点实测；
- `sample-video-player-vue/LiveDemo.vue`：低延迟 HLS/FLV 直播、断流指数退避重连与毫秒追帧实测；
- `sample-video-player-vue/AuthSecurityDemo.vue`：鉴权注入、401/403 故障注入与六步销毁显存追踪实测；
- `sample-video-player-vue/WatermarkDemo.vue`：防录屏水印动态浮动、F12 攻防自愈沙箱与容器级全屏实测；
- `sample-video-player-vue/GridDemo.vue`：1~16 路多通道分屏矩阵、选路聚焦、双击独占放大、主次码流自适应与自动轮巡调度实测；
- `sample-video-player-vue/PtzDemo.vue`：八方向云台罗盘、光学变焦/聚焦/光圈、预置位管理、画面手势联动与 1.0x~5.0x 硬件加速电子放大实测。
