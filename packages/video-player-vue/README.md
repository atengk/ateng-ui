# @atengk/video-player-vue

面向现代 Web 应用、企业级物联网与安防监控的工业级流媒体视频播放基础设施与无头状态机。

遵循 Monorepo 四层洋葱拓扑律（L2 专用能力扩展层），严格保持对表现层 UI 库（如 Element Plus）的零依赖，纯原生基于 TypeScript 5.6 + Vue 3.5 构建，兼顾点播、直播、多路分屏、防录屏水印、安防云台控制、外挂字幕与 Canvas 高性能弹幕。

---

## 0. 特性与公共 API 全景速查矩阵

依据《五维生产就绪交付模型》，下表 100% 收录本子模块对外暴露的所有公共组件、Composables、方法、插件与核心类型契约：

| 特性分类         | 特性名称               | 核心门面 / 组件 / Hook                           | 关键参数 / Props / Emits                                                                                   | 核心行为说明                                                                                | 锚定验证源头 (*Test / Sample)                                           |
| :--------------- | :--------------------- | :----------------------------------------------- | :--------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------ | :---------------------------------------------------------------------- |
| **基础渲染**     | 单路视频播放容器       | `<AtengVideoPlayer />`                           | `url`, `type`, `poster`, `title`, `isLive`, `subtitles`, `plugins`, `reconnect`, `markers`                 | 开箱即用工业级播放器容器，内置六步销毁、错误退化与插槽浮层                                  | `AtengVideoPlayer.test.ts` / `sample-video-player-vue/VodDemo.vue`      |
| **无头状态机**   | 响应式播放状态机       | `useVideoPlayer(options)`                        | `url`, `autoplay`, `volume`, `loop`, `engine`, `playing`, `currentTime`, `duration`                        | 纯无头播放状态编排，抗竞态且具备响应式生命周期确定性回收                                    | `AtengVideoPlayer.test.ts`                                              |
| **断流重连**     | 指数退避重连状态机     | `useStreamReconnect(options)`                    | `maxRetries`, `baseDelay`, `maxDelay`, `jitter`, `triggerReconnect`, `manualRetry`                         | 工业级指数退避重连算法与 ±20% 抖动抗惊群，硬失败转接与定时器确定性清理                      | `stream.test.ts` / `sample-video-player-vue/LiveDemo.vue`               |
| **记忆续播**     | 本地历史与续播状态机   | `useVideoPlaybackHistory()`                      | `url`, `autoResume`, `autoPlayResume`, `clearHistory`, `saveProgress`                                      | 基于 localStorage 记忆播放进度，支持弹窗提示、恢复后自动播放与防抖写入                      | `deepVOD.test.ts` / `sample-video-player-vue/DeepVodDemo.vue`           |
| **热键与步进**   | 键盘热键与逐帧微调     | `engine.step()`, `engine.stepFrame()`            | `hotkey: boolean`, `step(seconds)`, `stepFrame(frames, fps)`                                               | 支持空格、方向键、F全屏、M静音、[,]/[,]逐帧微调，输入框防穿透                               | `deepVOD.test.ts` / `sample-video-player-vue/DeepVodDemo.vue`           |
| **时间格式化**   | 媒体时间戳格式化       | `formatVideoTime(seconds)`                       | `seconds: number`                                                                                          | 格式化时间为 `mm:ss` 或 `hh:mm:ss` 字符串，支持负数防穿透保底                               | `deepVOD.test.ts`                                                       |
| **时间轴打点**   | 关键帧标注与点击跳帧   | `<AtengVideoPlayer />`                           | `markers: VideoMarkerItem[]`, `@marker-click`, `@markerClick`                                              | 时间轴高亮打点、悬浮卡片提示、颜色定制，点击打点实现精准快速跳帧                            | `deepVOD.test.ts` / `sample-video-player-vue/DeepVodDemo.vue`           |
| **缩略图预览**   | 进度条 Hover 预览      | `<AtengVideoPlayer />`                           | `thumbnails: VideoThumbnailOptions`                                                                        | 支持雪碧图切片配置或 WebVTT 格式，鼠标悬浮进度条展示动态帧预览卡片                          | `deepVOD.test.ts` / `sample-video-player-vue/DeepVodDemo.vue`           |
| **多路分屏矩阵** | 分屏协同监控容器       | `<AtengVideoGrid />`                             | `channels`, `layout`, `activeId`, `autoSubStream`, `audioExclusive`, `gap`, `@select`, `@channel-dblclick` | 原生 CSS Grid 驱动，支持 1/4/9/16 宫格及 1+5/1+7 广播级主从分屏，自适应缩放                 | `grid.test.ts` / `sample-video-player-vue/GridDemo.vue`                 |
| **分屏状态机**   | 多路编排与协同状态机   | `useVideoGrid(options)`                          | `channels`, `layout`, `autoSubStream`, `audioExclusive`, `activeId`, `startTour`, `stopTour`               | 纯无头分屏编排，内置通道容量推导、选路聚焦、双击独占放大、主次码流自适应与自动轮巡          | `grid.test.ts` / `sample-video-player-vue/GridDemo.vue`                 |
| **分屏容量推导** | 布局容量纯函数         | `getLayoutCapacity(layout)`                      | `layout: VideoGridLayout`                                                                                  | 计算布局最大容纳通道数（1x1->1, 2x2->4, 3x3->9, 4x4->16, 1+5->6, 1+7->8）                   | `grid.test.ts`                                                          |
| **云台控制盘**   | 八方向安防调谐盘       | `<AtengPtzControl />`                            | `speed`, `presets`, `disabled`, `showOptical`, `showSpeed`, `@command`, `@preset-add`                      | 八方向罗盘、变焦/聚焦/光圈调控、预置位管理，纯语义化指令与协议彻底解耦                      | `ptz.test.ts` / `sample-video-player-vue/PtzDemo.vue`                   |
| **电子放大**     | 硬件加速电子放大漫游   | `useDigitalZoom(options)`                        | `minScale`, `maxScale`, `step`, `containerRef`, `startDrag`, `handleWheel`, `resetZoom`                    | 纯前端 CSS Transform 硬件加速实现 1.0x~5.0x 滚轮无级缩放与平移拖拽，边界阻尼防脱框          | `ptz.test.ts` / `sample-video-player-vue/PtzDemo.vue`                   |
| **画面手势**     | 视频手势联动云台       | `usePtzGesture(options)`                         | `threshold`, `speed`, `onCommand`, `handleMouseDown`, `handleWheel`                                        | 捕获画面拖拽向量并基于角度数学模型推导 8 方位云台指令，滚轮变焦，松手自动发送 stop          | `ptz.test.ts` / `sample-video-player-vue/PtzDemo.vue`                   |
| **方位向量映射** | 手势象限数学推导       | `calculatePtzDirection(dx, dy)`                  | `dx: number`, `dy: number`                                                                                 | 将拖拽向量精准映射至 8 个 45° 扇区（up/down/left/right 及四对角）                           | `ptz.test.ts`                                                           |
| **安全水印**     | 防录屏安全水印容器     | `<AtengVideoWatermark />`                        | `content`, `opacity`, `rotate`, `floating`, `tamperProof`, `@watermark-tampered`                           | Canvas/SVG 矢量平铺，动态微位移随机浮动破坏录屏反算法，MutationObserver 审查防篡改          | `watermark.test.ts` / `sample-video-player-vue/WatermarkDemo.vue`       |
| **外挂多轨字幕** | WebVTT/SRT 解析与同步  | `useVideoSubtitles(subtitles, defaultId)`        | `subtitles`, `activeSubtitle`, `cues`, `currentText`, `switchSubtitle`, `updateCurrentTime`                | 无头多轨字幕状态机，支持 WebVTT/SRT 双格式、毫秒时间片元匹配与多语言切换                    | `subtitles.test.ts` / `sample-video-player-vue/DanmakuSubtitleDemo.vue` |
| **字幕解析核心** | 字幕文本双协议解析器   | `parseSubtitle()`, `parseWebVtt()`, `parseSrt()` | `content: string`, `type?: 'vtt' \| 'srt'`                                                                 | 纯原生 TS 实现 WebVTT 与 SRT 文本解析，容错提取时间片元列表                                 | `subtitles.test.ts`                                                     |
| **字幕片元检索** | 当前时间片元定位       | `findCurrentCue(cues, currentTime)`              | `cues: VideoSubtitleCue[]`, `currentTime: number`                                                          | 高效检索当前播放时刻命中的字幕片元，无匹配时防御性保底返回 null                             | `subtitles.test.ts`                                                     |
| **弹幕插件系统** | Canvas 高性能弹幕插件  | `createDanmakuPlugin(options)`                   | `@atengk/video-player-vue/plugins/danmaku` 独立导出；`speed`, `opacity`, `area`, `filterKeywords`          | 标准 Artplayer 插件工厂，独立 Subpath 导出，Tree-Shaking 0 字节体积残留                     | `danmaku.test.ts` / `sample-video-player-vue/DanmakuSubtitleDemo.vue`   |
| **弹幕渲染引擎** | Canvas 2D 硬件加速引擎 | `DanmakuEngine(container, options)`              | `emit()`, `show()`, `hide()`, `toggle()`, `config()`, `clear()`, `syncVideoTime()`, `destroy()`            | 纯 Canvas 渲染循环、双重黑白描边、DPI 视网膜高清自适应、多重屏蔽规则与 RAF 清理             | `danmaku.test.ts`                                                       |
| **弹幕轨道通道** | 通道防重叠防追尾调度池 | `DanmakuTrackPool(options)`                      | `allocateTrack()`, `allocateTopTrack()`, `allocateBottomTrack()`, `registerItem()`, `reset()`              | 动态推导轨道高度，尾部进屏防碰撞与相对速度追尾预测，负载均衡分配空闲通道                    | `danmaku.test.ts`                                                       |
| **底层引擎 SPI** | Artplayer 适配引擎     | `ArtplayerEngine`                                | `container`, `options`, `handlers`                                                                         | 适配 Artplayer 内核，固化确定性销毁六步防线与 GPU 缓冲回收                                  | `invariants.test.ts` / `ArtplayerEngine.ts`                             |
| **流媒体驱动**   | HLS 播放驱动           | `HlsDriver`                                      | `video`, `url`, `options`                                                                                  | 基于 hls.js 驱动，支持 ABR 码率自适应、Safari 降级与 xhrSetup 鉴权拦截                      | `stream.test.ts` / `sample-video-player-vue/LiveDemo.vue`               |
| **流媒体驱动**   | HTTP-FLV 播放驱动      | `MpegtsDriver`                                   | `video`, `url`, `options`                                                                                  | 基于 mpegts.js 驱动，支持低延迟直播、智能毫秒追帧与 autoCleanupSourceBuffer 防内存泄漏      | `stream.test.ts` / `sample-video-player-vue/LiveDemo.vue`               |
| **安全鉴权**     | 企业凭据双轨注入器     | `TokenInjector`                                  | `injectHeaders()`, `injectXhr()`, `injectFetch()`, `injectUrl()`                                           | 全链路对接 `@atengk/core` 的 `AuthManager`，双轨注入 `token` 与 `Authorization`             | `invariants.test.ts` / `sample-video-player-vue/AuthSecurityDemo.vue`   |
| **白屏守卫**     | ADR-0004 双态探测      | `BlobJsonGuard`                                  | `probeMediaStream()`, `parseJsonError()`, `toBusinessException()`                                          | 嗅探 401/403/500 JSON 异常并转译为强类型 `BusinessException`，避免解复用白屏死锁            | `invariants.test.ts` / `sample-video-player-vue/AuthSecurityDemo.vue`   |
| **插件安装器**   | Vue 插件全局注册       | `install(app)`                                   | `app: App`                                                                                                 | 显式受控注册 `AtengVideoPlayer`, `AtengVideoGrid`, `AtengPtzControl`, `AtengVideoWatermark` | `index.ts`                                                              |
| **类型契约**     | 核心强类型全量定义     | `types/index.ts`                                 | `IVideoPlayerEngine`, `VideoPlayerProps`, `DanmakuItem`, `VideoSubtitleItem` 等                            | 100% 强类型覆盖，严格恪守零裸 `any` 防线                                                    | `types/index.ts`                                                        |

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
import '@atengk/video-player-vue/style.css';
</script>

<template>
  <div style="width: 800px; aspect-ratio: 16 / 9;">
    <AtengVideoPlayer
      url="https://artplayer.org/assets/sample/video.mp4"
      poster="https://artplayer.org/assets/sample/poster.jpg"
      title="示例高清点播视频"
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

// 登录成功时写入 Token
authManager.setToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');

// 手动为 XHR / Fetch 请求注入双轨请求头
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
    <!-- 自定义错误呈现插槽 -->
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

### 2.3 低延迟 HLS/FLV 直播流与指数退避重连

```vue
<template>
  <AtengVideoPlayer
    url="https://stream.example.com/live/cctv.flv"
    type="flv"
    :is-live="true"
    :live-buffer-latency-chasing="true"
    :chase-threshold="3"
    :reconnect="{
      maxRetries: 5,
      baseDelay: 1000,
      maxDelay: 15000,
      jitter: true,
    }"
  />
</template>
```

### 2.4 点播深水区特性：精准 Seek、逐帧微调、时间轴打点与记忆续播

```vue
<script setup lang="ts">
import { ref } from 'vue';
import {
  AtengVideoPlayer,
  type AtengVideoPlayerInstance,
  type VideoMarkerItem,
} from '@atengk/video-player-vue';

const playerRef = ref<AtengVideoPlayerInstance | null>(null);

// 时间轴事件打点清单
const markers: VideoMarkerItem[] = [
  { time: 10, text: '片头结束', color: '#67C23A' },
  { time: 65, text: '高能反转事件', color: '#F56C6C' },
  { time: 120, text: '精彩打斗瞬间', color: '#E6A23C' },
];

// 逐帧微调步进（+1 帧）
const stepNextFrame = () => {
  playerRef.value?.stepFrame(1, 30);
};
</script>

<template>
  <AtengVideoPlayer
    ref="playerRef"
    url="https://artplayer.org/assets/sample/video.mp4"
    :markers="markers"
    :auto-resume="true"
    :auto-play-resume="false"
    :thumbnails="{
      url: 'https://artplayer.org/assets/sample/thumbnails.png',
      number: 60,
      column: 10,
    }"
    @marker-click="m => console.log('点击打点:', m.text)"
  />
</template>
```

### 2.5 广播级多路分屏协同矩阵与自动轮巡调度

```vue
<script setup lang="ts">
import { ref } from 'vue';
import {
  AtengVideoGrid,
  type AtengVideoGridInstance,
  type VideoChannelItem,
} from '@atengk/video-player-vue';

const gridRef = ref<AtengVideoGridInstance | null>(null);

const channels: VideoChannelItem[] = [
  {
    id: 'cam-01',
    title: '园区东门大厅',
    url: 'https://stream.example.com/cam-01-main.mp4', // 高清主流 1080P
    subUrl: 'https://stream.example.com/cam-01-sub.mp4', // 低码率次码流 360P
  },
  {
    id: 'cam-02',
    title: '园区西门车道卡口',
    url: 'https://stream.example.com/cam-02-main.mp4',
    subUrl: 'https://stream.example.com/cam-02-sub.mp4',
  },
];

// 启动自动巡更轮巡
const handleTour = () => {
  gridRef.value?.startTour({
    interval: 8000,
    pool: channels,
    onStep: (page, items) => {
      console.log(`第 ${page + 1} 批巡更通道:`, items);
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

### 2.6 安防云台控制盘、画面手势联动与硬件加速电子放大

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

// 1. 纯前端硬件加速电子放大 (1.0x ~ 5.0x 无级缩放与平移漫游)
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

// 3. 业务层统一处理语义化指令 (可无缝对接 GB28181、ONVIF 或 WebSocket 网关)
const handlePtzCommand = (cmd: PtzCommand) => {
  console.log('派发云台指令:', cmd.action, '速度档位:', cmd.speed);
};
</script>

<template>
  <div style="display: flex; gap: 20px;">
    <!-- 视频视口 (支持电子放大与手势驱动) -->
    <div
      ref="videoContainerRef"
      style="width: 640px; height: 360px; overflow: hidden; position: relative;"
      @mousedown="zoom.startDrag"
      @wheel.prevent="zoom.handleWheel"
      @dblclick="zoom.resetZoom"
    >
      <div :style="zoom.transformStyle.value">
        <AtengVideoPlayer url="https://stream.example.com/live.m3u8" />
      </div>
    </div>

    <!-- 八方向云台调控罗盘 -->
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

### 2.7 Canvas 高性能弹幕系统插件按需加载 (Tree-Shaking 0 字节体积残留)

弹幕插件采用独立 Subpath 分包导出（`@atengk/video-player-vue/plugins/danmaku`）。未引用该特性的业务应用打包时 **0 字节打入**：

```vue
<script setup lang="ts">
import { AtengVideoPlayer } from '@atengk/video-player-vue';
import { createDanmakuPlugin } from '@atengk/video-player-vue/plugins/danmaku';

// 注入高性能 Canvas 弹幕插件
const danmakuPlugin = createDanmakuPlugin({
  items: [
    { id: '1', text: '🎬 欢迎体验高性能弹幕！', time: 1.0, color: '#409EFF', mode: 'top' },
    { id: '2', text: '前方高能预警！⚡', time: 2.0, color: '#F56C6C', mode: 'scroll' },
  ],
  speed: 1.0,
  opacity: 0.9,
  area: 0.75, // 占屏幕 75% 高度
  filterKeywords: ['敏感词', /广告/],
});
</script>

<template>
  <AtengVideoPlayer
    url="https://artplayer.org/assets/sample/video.mp4"
    :plugins="[danmakuPlugin]"
  />
</template>
```

### 2.8 WebVTT 与 SRT 多轨双语外挂字幕挂载与样式定制

内置毫秒级片元解析引擎，支持内联文本或 URL 远程拉取，控制栏或业务层自由切换多语言字幕：

```vue
<script setup lang="ts">
import { AtengVideoPlayer, type VideoSubtitleItem } from '@atengk/video-player-vue';

const subtitles: VideoSubtitleItem[] = [
  {
    id: 'zh',
    label: '中文字幕',
    lang: 'zh-CN',
    default: true,
    content: `WEBVTT

1
00:00:01.000 --> 00:00:04.000
欢迎来到 Ateng UI 视频基础设施套件
`,
  },
  {
    id: 'en',
    label: 'English',
    lang: 'en-US',
    content: `1
00:00:01,000 --> 00:00:04,000
Welcome to Ateng UI Video Infrastructure Suite
`,
  },
];
</script>

<template>
  <AtengVideoPlayer
    url="https://artplayer.org/assets/sample/video.mp4"
    :subtitles="subtitles"
    default-subtitle="zh"
    :subtitle-style="{
      fontSize: '22px',
      color: '#ffffff',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      bottom: '45px',
    }"
  >
    <!-- 亦可通过作用域插槽 100% 自由定制字幕渲染视图 -->
    <template #subtitle="{ currentText, isVisible }">
      <div v-if="isVisible && currentText" class="my-custom-subtitle">
        {{ currentText }}
      </div>
    </template>
  </AtengVideoPlayer>
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

### 3.8 弹幕通道防碰撞与相对速度追尾预测算法

- **轨道通道高度计算**：`trackHeight = fontSize * 1.4`，可用总轨道数 `totalTracks = floor((canvasHeight * area) / trackHeight)`；
- **进屏防碰撞 (Head-Collision Prevention)**：检查轨道内前一条弹幕的尾部坐标，必须满足 `prev.x + prev.width < canvasWidth`（即前一条弹幕尾部已完全进入屏幕视口）时，新弹幕方可允许进入该轨道；
- **相对速度防追尾 (Catch-up Collision Prevention)**：若新弹幕的移动速度大于前一条弹幕（`v_new > v_prev`），根据两者的距离差与速度差推导在屏幕内的相撞时间 $t_{catch}$；若 $t_{catch}$ 小于前一条弹幕出屏所需剩余时间 $t_{exit}$，判定为追尾风险轨道并自动调度顺延至下一个空闲轨道；
- **广播级负载均衡**：在所有无碰撞可用轨道中，优先调度至与前一条弹幕距离间隙最大（`margin` 最大）的通道，实现全屏弹幕均匀排布。

### 3.9 WebVTT/SRT 双格式容错解析与离线自洽原则

- **双协议兼容**：智能识别 `WEBVTT` 首部标识与标准 SRT 逗号毫秒格式（如 `00:01:23,456` 与 `00:01:23.456`）；
- **容错与空安全保底**：当字幕源文件损坏、网络 404 或内容为空时，`parseSubtitle` 防御性保底返回空数组 `[]`，严格杜绝模板渲染空指针崩溃；
- **多行文本与样式清洗**：自动剔除 HTML 内联标签或保留换行格式，保证复杂双语字幕上下对齐展示。

### 3.10 极致 Tree-Shaking 独立 Subpath 模块隔离契约

- 针对弹幕系统这类具有特定业务诉求（互动娱乐/在线教育）的重型 Canvas 插件，通过 Vite 库模式多 Entry 配置为独立的 Subpath Entry：
  ```json
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./plugins/danmaku": {
      "types": "./dist/plugins/danmaku/index.d.ts",
      "import": "./dist/plugins/danmaku/index.js",
      "require": "./dist/plugins/danmaku/index.cjs"
    }
  }
  ```
- 纯安防监控或基础播放业务仅引入 `@atengk/video-player-vue` 时，弹幕引擎代码 **0 字节打包打入产物**，恪守零臃肿基线。

---

## 4. 物理排版与代码全真验证

本仓库所有特性在 `apps/sample-video-player-vue` 1:1 自验展厅中均提供可交互验证用例：

- `sample-video-player-vue/VodDemo.vue`：标准点播实机体验；
- `sample-video-player-vue/DeepVodDemo.vue`：精准 Seek、逐帧微调、记忆续播与时间轴打点实测；
- `sample-video-player-vue/LiveDemo.vue`：低延迟 HLS/FLV 直播、断流指数退避重连与毫秒追帧实测；
- `sample-video-player-vue/AuthSecurityDemo.vue`：鉴权注入、401/403 故障注入与六步销毁显存追踪实测；
- `sample-video-player-vue/WatermarkDemo.vue`：防录屏水印动态浮动、F12 攻防自愈沙箱与容器级全屏实测；
- `sample-video-player-vue/GridDemo.vue`：1~16 路多通道分屏矩阵、选路聚焦、双击独占放大、主次码流自适应与自动轮巡调度实测；
- `sample-video-player-vue/PtzDemo.vue`：八方向云台罗盘、光学变焦/聚焦/光圈、预置位管理、画面手势联动与 1.0x~5.0x 硬件加速电子放大实测；
- `sample-video-player-vue/DanmakuSubtitleDemo.vue`：Canvas 弹幕防重叠、实时发射、彩色/关键词过滤、多轨双语字幕切换实测。
