# @atengk/video-player-vue

面向现代 Web 应用、企业级物联网与安防监控的工业级流媒体视频播放基础设施与无头状态机。

遵循 Monorepo 四层洋葱拓扑律（L2 专用能力扩展层），严格保持对表现层 UI 库（如 Element Plus）的零依赖，纯原生基于 TypeScript 5.6 + Vue 3.5 构建，兼顾点播、直播、多路分屏、防录屏水印与安防云台控制。

---

## 0. 特性与公共 API 全景速查矩阵

| 特性分类         | 特性名称             | 核心门面 / 组件 / Hook                                         | 关键参数 / Props / Emits                                              | 核心行为说明                                                                           | 锚定验证源头 (*Test / Sample)                                         |
| :--------------- | :------------------- | :------------------------------------------------------------- | :-------------------------------------------------------------------- | :------------------------------------------------------------------------------------- | :-------------------------------------------------------------------- |
| **基础渲染**     | 单路视频播放容器     | `<AtengVideoPlayer />`                                         | `url`, `type`, `isLive`, `reconnect`, `liveBufferLatencyChasing`      | 开箱即用视频播放器，内置六步销毁、错误退化与插槽浮层                                   | `AtengVideoPlayer.test.ts` / `sample-video-player-vue/VodDemo.vue`    |
| **无头状态机**   | 响应式播放状态机     | `useVideoPlayer(options)`                                      | `url`, `autoplay`, `volume`, `loop`                                   | 纯无头播放状态编排，抗竞态且具备响应式生命周期回收                                     | `AtengVideoPlayer.test.ts`                                            |
| **断流重连**     | 指数退避重连状态机   | `useStreamReconnect(options)`                                  | `maxRetries`, `baseDelay`, `maxDelay`, `jitter`, `triggerReconnect`   | 工业级指数退避重连算法与 ±20% 抖动抗惊群，硬失败转接与定时器确定性清理                 | `stream.test.ts` / `sample-video-player-vue/LiveDemo.vue`             |
| **记忆续播**     | 本地历史与续播状态机 | `useVideoPlaybackHistory()`                                    | `url`, `autoResume`, `autoPlayResume`, `clearHistory`, `saveProgress` | 基于 localStorage 记忆播放进度，支持弹窗提示、恢复后自动播放、防抖写入与一键重放       | `deepVOD.test.ts` / `sample-video-player-vue/DeepVodDemo.vue`         |
| **热键与步进**   | 键盘热键与逐帧微调   | `engine.step()`, `engine.stepFrame()`                          | `hotkey: boolean`, `step(seconds)`, `stepFrame(frames, fps)`          | 支持空格播放暂停、方向键快进快退音量、F全屏、M静音、[,]/[,]逐帧微调，输入框安全防穿透  | `deepVOD.test.ts` / `sample-video-player-vue/DeepVodDemo.vue`         |
| **时间轴打点**   | 关键帧标注与点击跳帧 | `<AtengVideoPlayer />`                                         | `markers: VideoMarkerItem[]`, `@marker-click`                         | 时间轴高亮打点、悬浮卡片提示、颜色定制，点击打点实现精准快速跳帧                       | `deepVOD.test.ts` / `sample-video-player-vue/DeepVodDemo.vue`         |
| **缩略图预览**   | 进度条 Hover 预览    | `<AtengVideoPlayer />`                                         | `thumbnails: VideoThumbnailOptions`                                   | 支持传入雪碧图切片配置或 WebVTT 格式，鼠标悬浮进度条展示动态帧预览卡片                 | `deepVOD.test.ts` / `sample-video-player-vue/DeepVodDemo.vue`         |
| **底层引擎 SPI** | Artplayer 适配引擎   | `ArtplayerEngine`                                              | `container`, `options`, `handlers`                                    | 适配 Artplayer 内核，固化确定性销毁六步防线与 GPU 缓冲回收                             | `invariants.test.ts` / `ArtplayerEngine.ts`                           |
| **流媒体驱动**   | HLS 播放驱动         | `HlsDriver`                                                    | `video`, `url`, `options`                                             | 基于 hls.js 驱动，支持 ABR 码率自适应、Safari 降级与 xhrSetup 鉴权拦截                 | `stream.test.ts` / `sample-video-player-vue/LiveDemo.vue`             |
| **流媒体驱动**   | HTTP-FLV 播放驱动    | `MpegtsDriver`                                                 | `video`, `url`, `options`                                             | 基于 mpegts.js 驱动，支持低延迟直播、智能毫秒追帧与 autoCleanupSourceBuffer 防内存泄漏 | `stream.test.ts` / `sample-video-player-vue/LiveDemo.vue`             |
| **安全鉴权**     | 企业凭据双轨注入器   | `TokenInjector`                                                | `injectHeaders()`, `injectXhr()`, `injectFetch()`, `injectUrl()`      | 全链路对接 `@atengk/core` 的 `AuthManager`，双轨注入 `token` 与 `Authorization`        | `invariants.test.ts` / `sample-video-player-vue/AuthSecurityDemo.vue` |
| **白屏守卫**     | ADR-0004 双态探测    | `BlobJsonGuard`                                                | `probeMediaStream()`, `parseJsonError()`, `toBusinessException()`     | 嗅探 401/403/500 JSON 异常并转译为强类型 `BusinessException`，避免解复用白屏死锁       | `invariants.test.ts` / `sample-video-player-vue/AuthSecurityDemo.vue` |
| **类型契约**     | 核心强类型全量定义   | `IVideoPlayerEngine`, `VideoPlayerProps`, `VideoPlayerOptions` | 详见 `types/index.ts`                                                 | 100% 强类型覆盖，零裸 `any`                                                            | `types/index.ts`                                                      |

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

### 3.2 ADR-0004 Blob-JSON 双态异常识别防线

当音视频文件直链接口鉴权失效或资源下架时，服务端通常返回 `Content-Type: application/json` 的报错文本而非标准媒体二进制流。若将其直接交由二进制解封装器解析，会发生无声黑屏或解码锁死。本模块在探测流（`probeStream: true`）中前置执行双态嗅探，精准拦截 401/403/500 JSON 错误并转译为业务异常抛出。

---

## 4. 物理排版与代码全真验证

本仓库所有特性在 `apps/sample-video-player-vue` 1:1 自验展厅中均提供可交互验证用例：

- `sample-video-player-vue/VodDemo.vue`：标准点播实机体验；
- `sample-video-player-vue/AuthSecurityDemo.vue`：鉴权注入、401/403 故障注入与六步销毁显存追踪实测。
