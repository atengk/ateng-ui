<script setup lang="ts">
/**
 * DanmakuSubtitleDemo: Canvas 高性能弹幕系统插件与多轨外挂字幕全真交互展厅。
 *
 * 验证独立按需分包 @atengk/video-player-vue/plugins/danmaku 插件集成、
 * 弹幕通道防碰撞、动态实时发射、屏蔽过滤机制，以及 WebVTT/SRT 多语言字幕动态切换。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import { ref } from 'vue';
import type {
  AtengVideoPlayerInstance,
  IVideoPlayerEngine,
  VideoSubtitleItem,
} from '@atengk/video-player-vue';
import { createDanmakuPlugin } from '@atengk/video-player-vue/plugins/danmaku';
import type { DanmakuMode, DanmakuPluginInstance } from '@atengk/video-player-vue/plugins/danmaku';

const playerRef = ref<AtengVideoPlayerInstance | null>(null);
const currentUrl = ref('https://artplayer.org/assets/sample/video.mp4');
const posterUrl = ref('https://artplayer.org/assets/sample/poster.jpg');

const currentTime = ref(0);
const isPlaying = ref(false);

// 预载丰富弹幕数据库
const initialDanmakus = [
  {
    id: '1',
    text: '🎬 欢迎来到 @atengk/video-player-vue 弹幕系统实测！',
    time: 0.5,
    color: '#409EFF',
    mode: 'top' as const,
  },
  { id: '2', text: '芜湖起飞！🚀', time: 1.0, color: '#67C23A', mode: 'scroll' as const },
  {
    id: '3',
    text: '前方高能预警！！！⚡⚡⚡',
    time: 1.5,
    color: '#F56C6C',
    mode: 'scroll' as const,
  },
  {
    id: '4',
    text: 'Canvas 硬件加速渲染，帧率超稳',
    time: 2.0,
    color: '#E6A23C',
    mode: 'scroll' as const,
  },
  {
    id: '5',
    text: '广播级防重叠算法生效中，不重合不追尾',
    time: 2.5,
    color: '#ffffff',
    mode: 'scroll' as const,
  },
  {
    id: '6',
    text: '【系统提示】支持顶部居中锁定弹幕',
    time: 3.0,
    color: '#E6A23C',
    mode: 'top' as const,
  },
  {
    id: '7',
    text: '【字幕君】底部静止弹幕测试中',
    time: 3.5,
    color: '#909399',
    mode: 'bottom' as const,
  },
  { id: '8', text: '第一行弹幕飘过', time: 4.0, color: '#38bdf8', mode: 'scroll' as const },
  { id: '9', text: '第二行弹幕紧随其后', time: 4.2, color: '#a855f7', mode: 'scroll' as const },
  { id: '10', text: '第三行测试防追尾', time: 4.5, color: '#ec4899', mode: 'scroll' as const },
  {
    id: '11',
    text: '广告退散：买茶叶加微信（将被过滤屏蔽）',
    time: 5.0,
    color: '#ffffff',
    mode: 'scroll' as const,
  },
  { id: '12', text: '点赞投币走一波 👍', time: 6.0, color: '#f59e0b', mode: 'scroll' as const },
];

// 多轨外挂字幕列表
const subtitleList: VideoSubtitleItem[] = [
  {
    id: 'bilingual',
    label: '中英双语',
    lang: 'zh-en',
    default: true,
    content: `WEBVTT

1
00:00:00.500 --> 00:00:03.500
欢迎来到 Ateng UI 视频基础设施套件
Welcome to Ateng UI Video Infrastructure Suite

2
00:00:04.000 --> 00:00:07.500
纯前端工业级流媒体播放、多路协同与安全防护
Industrial streaming, grid sync and security defense

3
00:00:08.000 --> 00:00:12.000
零臃肿依赖，强类型契约，深模块解耦设计
Zero bloat, strict typing and deeply decoupled architecture
`,
  },
  {
    id: 'zh',
    label: '简体中文',
    lang: 'zh-CN',
    content: `WEBVTT

1
00:00:00.500 --> 00:00:03.500
欢迎来到 Ateng UI 视频基础设施套件

2
00:00:04.000 --> 00:00:07.500
纯前端工业级流媒体播放、多路协同与安全防护

3
00:00:08.000 --> 00:00:12.000
零臃肿依赖，强类型契约，深模块解耦设计
`,
  },
  {
    id: 'en',
    label: 'English',
    lang: 'en-US',
    content: `1
00:00:00,500 --> 00:00:03,500
Welcome to Ateng UI Video Infrastructure Suite

2
00:00:04,000 --> 00:00:07,500
Industrial streaming, grid sync and security defense

3
00:00:08,000 --> 00:00:12,000
Zero bloat, strict typing and deeply decoupled architecture
`,
  },
];

// 弹幕插件实例句柄
let danmakuHandle: DanmakuPluginInstance | null = null;

// 插件工厂注入（极致 Tree-Shaking 独立 Subpath 模块引入）
const danmakuPlugin = createDanmakuPlugin({
  items: initialDanmakus,
  speed: 1.0,
  opacity: 1.0,
  fontSize: 22,
  area: 0.75,
  filterKeywords: ['买茶叶', '微信'],
});

// 弹幕交互面板状态
const sendText = ref('');
const sendMode = ref<DanmakuMode>('scroll');
const sendColor = ref('#ffffff');
const danmakuVisible = ref(true);
const danmakuOpacity = ref(1.0);
const danmakuSpeed = ref(1.0);
const danmakuArea = ref(0.75);
const blockTop = ref(false);
const blockBottom = ref(false);
const blockColorDanmaku = ref(false);

// 字幕状态
const currentSubtitleId = ref<string | null>('bilingual');
const subtitleFontSize = ref(20);

const colorOptions = [
  { label: '纯白', value: '#ffffff' },
  { label: '科技蓝', value: '#409EFF' },
  { label: '高能红', value: '#F56C6C' },
  { label: '活力绿', value: '#67C23A' },
  { label: '警示橙', value: '#E6A23C' },
  { label: '魅惑紫', value: '#a855f7' },
];

const onReady = (engine: IVideoPlayerEngine) => {
  // 获取 Artplayer 实例上挂载的 danmaku 插件门面
  const rawArt = engine.rawInstance as {
    plugins?: { danmaku?: DanmakuPluginInstance };
    danmaku?: DanmakuPluginInstance;
  };
  danmakuHandle = rawArt?.plugins?.danmaku || rawArt?.danmaku || null;
};

const onTimeUpdate = (time: number) => {
  currentTime.value = Math.floor(time);
};

// 发射单条新弹幕
const handleSend = () => {
  if (!sendText.value.trim()) {
    return;
  }

  const newDanmu = {
    text: sendText.value.trim(),
    mode: sendMode.value,
    color: sendColor.value,
    fontSize: 22,
    isMe: true, // 自身发射带有高亮外框
    border: '#409EFF',
  };

  if (danmakuHandle) {
    danmakuHandle.emit(newDanmu);
  }

  sendText.value = '';
};

// 切换弹幕显隐
const toggleDanmaku = () => {
  danmakuVisible.value = !danmakuVisible.value;
  if (danmakuHandle) {
    if (danmakuVisible.value) {
      danmakuHandle.show();
    } else {
      danmakuHandle.hide();
    }
  }
};

// 更新弹幕运行配置
const updateDanmakuConfig = () => {
  if (!danmakuHandle) {
    return;
  }

  const filterTypes: DanmakuMode[] = [];
  if (blockTop.value) {
    filterTypes.push('top');
  }
  if (blockBottom.value) {
    filterTypes.push('bottom');
  }

  danmakuHandle.config({
    opacity: Number(danmakuOpacity.value),
    speed: Number(danmakuSpeed.value),
    area: Number(danmakuArea.value),
    filterTypes,
    blockColor: blockColorDanmaku.value,
  });
};

// 清屏
const handleClearDanmaku = () => {
  danmakuHandle?.clear();
};

// 切换字幕
const handleSwitchSubtitle = (subId: string | null) => {
  currentSubtitleId.value = subId;
  void playerRef.value?.switchSubtitle(subId);
};

// 切换字幕字号
const handleSubtitleFontSize = (size: number) => {
  subtitleFontSize.value = size;
  playerRef.value?.setSubtitleStyle({
    fontSize: `${size}px`,
  });
};
</script>

<template>
  <div class="danmaku-demo">
    <div class="danmaku-demo__header">
      <div class="danmaku-demo__badge">L2 专属扩展特性</div>
      <h2>Canvas 高性能弹幕系统插件与多轨外挂字幕 (Danmaku & Subtitles)</h2>
      <p class="danmaku-demo__desc">
        基于独立按需分包
        <code>@atengk/video-player-vue/plugins/danmaku</code> 导出，实现广播级防重叠防追尾排布调度、
        DPI 视网膜高清自适应、多重关键词/彩色屏蔽与 WebVTT/SRT 规范多轨双语字幕。
      </p>
    </div>

    <div class="danmaku-demo__grid">
      <!-- 播放器视口 -->
      <div class="danmaku-demo__player-box">
        <AtengVideoPlayer
          ref="playerRef"
          :url="currentUrl"
          :poster="posterUrl"
          title="弹幕系统与双语外挂字幕演示视频"
          :subtitles="subtitleList"
          default-subtitle="bilingual"
          :plugins="[danmakuPlugin]"
          theme="#409EFF"
          @ready="onReady"
          @play="isPlaying = true"
          @pause="isPlaying = false"
          @timeupdate="onTimeUpdate"
        />

        <!-- 弹幕即时发射栏 -->
        <div class="danmaku-sender-bar">
          <div class="sender-types">
            <button
              type="button"
              class="sender-type-btn"
              :class="{ 'sender-type-btn--active': sendMode === 'scroll' }"
              @click="sendMode = 'scroll'"
            >
              滚动
            </button>
            <button
              type="button"
              class="sender-type-btn"
              :class="{ 'sender-type-btn--active': sendMode === 'top' }"
              @click="sendMode = 'top'"
            >
              顶部
            </button>
            <button
              type="button"
              class="sender-type-btn"
              :class="{ 'sender-type-btn--active': sendMode === 'bottom' }"
              @click="sendMode = 'bottom'"
            >
              底部
            </button>
          </div>

          <div class="sender-color-picker">
            <span
              v-for="c in colorOptions"
              :key="c.value"
              class="color-dot"
              :style="{ backgroundColor: c.value }"
              :class="{ 'color-dot--active': sendColor === c.value }"
              :title="c.label"
              @click="sendColor = c.value"
            ></span>
          </div>

          <input
            v-model="sendText"
            type="text"
            class="sender-input"
            placeholder="发条弹幕互动一下吧（按 Enter 发射）..."
            maxlength="40"
            @keydown.enter="handleSend"
          />

          <button type="button" class="sender-submit-btn" @click="handleSend">发射 🚀</button>
        </div>
      </div>

      <!-- 控制台面板 -->
      <div class="danmaku-demo__controls">
        <!-- 弹幕图层调控 -->
        <div class="control-card">
          <div class="card-title">
            <span>🎯 弹幕图层与参数配置</span>
            <button
              type="button"
              class="toggle-btn"
              :class="{ 'toggle-btn--off': !danmakuVisible }"
              @click="toggleDanmaku"
            >
              {{ danmakuVisible ? '弹幕开启 🟢' : '弹幕已关 🔴' }}
            </button>
          </div>

          <div class="slider-row">
            <span class="label">透明度: {{ Math.round(danmakuOpacity * 100) }}%</span>
            <input
              v-model.number="danmakuOpacity"
              type="range"
              min="0.2"
              max="1.0"
              step="0.05"
              @input="updateDanmakuConfig"
            />
          </div>

          <div class="slider-row">
            <span class="label">滚动速度: {{ danmakuSpeed }}x</span>
            <div class="btn-group">
              <button
                v-for="s in [0.75, 1.0, 1.25, 1.5, 2.0]"
                :key="s"
                class="mini-btn"
                :class="{ 'mini-btn--active': danmakuSpeed === s }"
                @click="
                  danmakuSpeed = s;
                  updateDanmakuConfig();
                "
              >
                {{ s }}x
              </button>
            </div>
          </div>

          <div class="slider-row">
            <span class="label">屏占比: {{ Math.round(danmakuArea * 100) }}% 屏幕</span>
            <div class="btn-group">
              <button
                v-for="a in [0.25, 0.5, 0.75, 1.0]"
                :key="a"
                class="mini-btn"
                :class="{ 'mini-btn--active': danmakuArea === a }"
                @click="
                  danmakuArea = a;
                  updateDanmakuConfig();
                "
              >
                {{ a === 1.0 ? '全屏' : `${a * 100}%` }}
              </button>
            </div>
          </div>

          <div class="filter-section">
            <span class="sub-label">屏蔽过滤规则：</span>
            <div class="checkbox-row">
              <label class="check-item">
                <input v-model="blockTop" type="checkbox" @change="updateDanmakuConfig" />
                屏蔽顶部弹幕
              </label>
              <label class="check-item">
                <input v-model="blockBottom" type="checkbox" @change="updateDanmakuConfig" />
                屏蔽底部弹幕
              </label>
              <label class="check-item">
                <input v-model="blockColorDanmaku" type="checkbox" @change="updateDanmakuConfig" />
                屏蔽彩色（白字同色）
              </label>
            </div>
            <p class="filter-tip">已内置屏蔽关键词：<code>买茶叶</code>、<code>/微信/</code></p>
          </div>

          <div class="action-footer">
            <button class="btn btn--outline" @click="handleClearDanmaku">清空活跃弹幕</button>
          </div>
        </div>

        <!-- 多轨外挂字幕 -->
        <div class="control-card">
          <div class="card-title">
            <span>💬 多轨外挂字幕 (WebVTT / SRT)</span>
          </div>

          <div class="subtitle-selector">
            <span class="sub-label">字幕选择：</span>
            <div class="btn-group">
              <button
                class="mini-btn"
                :class="{ 'mini-btn--active': currentSubtitleId === null }"
                @click="handleSwitchSubtitle(null)"
              >
                关闭字幕
              </button>
              <button
                v-for="sub in subtitleList"
                :key="sub.id"
                class="mini-btn"
                :class="{ 'mini-btn--active': currentSubtitleId === sub.id }"
                @click="handleSwitchSubtitle(sub.id)"
              >
                {{ sub.label }}
              </button>
            </div>
          </div>

          <div class="subtitle-style-row">
            <span class="sub-label">字幕字号微调：</span>
            <div class="btn-group">
              <button
                v-for="sz in [16, 20, 24, 28]"
                :key="sz"
                class="mini-btn"
                :class="{ 'mini-btn--active': subtitleFontSize === sz }"
                @click="handleSubtitleFontSize(sz)"
              >
                {{ sz }}px
              </button>
            </div>
          </div>

          <div class="current-cue-preview">
            <span class="sub-label">当前时刻字幕片元预览：</span>
            <div class="cue-box">
              {{ playerRef?.currentSubtitleText || '（当前时刻无字幕）' }}
            </div>
          </div>
        </div>

        <!-- 架构不变量守卫提示 -->
        <div class="info-card">
          <h4>🛡️ 工业级成熟度防线声明</h4>
          <ul>
            <li><strong>极致 Tree-Shaking</strong>：未引用弹幕插件的项目 0 字节体积打包残留；</li>
            <li>
              <strong>防重叠追尾算法</strong>：自动根据进屏位置与穿屏速度预测，规避同轨字迹叠字；
            </li>
            <li>
              <strong>DPI 视网膜抗模糊</strong>：Canvas 基于 window.devicePixelRatio 高清重采样；
            </li>
            <li>
              <strong>生命周期确定性</strong>：组件销毁时 100% 回收 RAF 渲染循环与 ResizeObserver。
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.danmaku-demo {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.danmaku-demo__header {
  background: #ffffff;
  padding: 20px 24px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.danmaku-demo__badge {
  display: inline-block;
  font-size: 12px;
  font-weight: 600;
  color: #3b82f6;
  background: #eff6ff;
  padding: 4px 10px;
  border-radius: 12px;
  margin-bottom: 8px;
}

.danmaku-demo__header h2 {
  margin: 0 0 8px 0;
  font-size: 20px;
  color: #0f172a;
}

.danmaku-demo__desc {
  margin: 0;
  font-size: 14px;
  color: #475569;
  line-height: 1.6;
}

.danmaku-demo__desc code {
  background-color: #f1f5f9;
  color: #0284c7;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
}

.danmaku-demo__grid {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 20px;
  align-items: start;
}

@media (max-width: 1024px) {
  .danmaku-demo__grid {
    grid-template-columns: 1fr;
  }
}

.danmaku-demo__player-box {
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
}

.danmaku-sender-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  background-color: #1e293b;
  padding: 10px 14px;
  border-top: 1px solid #334155;
  flex-wrap: wrap;
}

.sender-types {
  display: flex;
  background: #0f172a;
  border-radius: 4px;
  padding: 2px;
}

.sender-type-btn {
  background: none;
  border: none;
  color: #94a3b8;
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
  border-radius: 3px;
  transition: all 0.2s;
}

.sender-type-btn--active {
  background: #2563eb;
  color: #ffffff;
  font-weight: 600;
}

.sender-color-picker {
  display: flex;
  align-items: center;
  gap: 6px;
}

.color-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid transparent;
  transition: transform 0.15s;
}

.color-dot:hover {
  transform: scale(1.2);
}

.color-dot--active {
  border-color: #ffffff;
  transform: scale(1.15);
}

.sender-input {
  flex: 1;
  min-width: 180px;
  background: #0f172a;
  border: 1px solid #334155;
  color: #f1f5f9;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 13px;
  outline: none;
}

.sender-input:focus {
  border-color: #3b82f6;
}

.sender-submit-btn {
  background: #2563eb;
  color: #ffffff;
  border: none;
  padding: 6px 16px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.sender-submit-btn:hover {
  background: #1d4ed8;
}

.danmaku-demo__controls {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.control-card {
  background: #ffffff;
  border-radius: 8px;
  padding: 18px 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.card-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  font-size: 15px;
  color: #0f172a;
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 10px;
}

.toggle-btn {
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  color: #059669;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.toggle-btn--off {
  background: #fef2f2;
  border-color: #fecaca;
  color: #dc2626;
}

.slider-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.slider-row .label,
.sub-label {
  font-size: 13px;
  color: #475569;
  font-weight: 500;
}

.slider-row input[type='range'] {
  width: 100%;
}

.btn-group {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.mini-btn {
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  color: #475569;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.mini-btn:hover {
  background: #e2e8f0;
}

.mini-btn--active {
  background: #2563eb;
  border-color: #2563eb;
  color: #ffffff;
  font-weight: 600;
}

.filter-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #f8fafc;
  padding: 10px 12px;
  border-radius: 6px;
}

.checkbox-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.check-item {
  font-size: 13px;
  color: #334155;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.filter-tip {
  margin: 4px 0 0 0;
  font-size: 12px;
  color: #94a3b8;
}

.filter-tip code {
  color: #ef4444;
  background: #fee2e2;
  padding: 1px 4px;
  border-radius: 3px;
}

.action-footer {
  display: flex;
  justify-content: flex-end;
}

.btn--outline {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  color: #475569;
  padding: 6px 14px;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
}

.btn--outline:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
}

.subtitle-selector,
.subtitle-style-row,
.current-cue-preview {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cue-box {
  background: #0f172a;
  color: #38bdf8;
  padding: 10px 14px;
  border-radius: 6px;
  font-size: 13px;
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  white-space: pre-wrap;
}

.info-card {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  padding: 16px;
  border-radius: 8px;
  color: #1e3a8a;
}

.info-card h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
}

.info-card ul {
  margin: 0;
  padding-left: 18px;
  font-size: 12px;
  line-height: 1.6;
}
</style>
