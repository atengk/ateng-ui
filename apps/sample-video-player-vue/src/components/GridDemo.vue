<script setup lang="ts">
/**
 * GridDemo: 多路分屏协同监控矩阵与自动轮巡沙箱。
 *
 * 验证：1~16 路分屏布局 (1x1, 2x2, 3x3, 4x4, 1+5, 1+7)、
 * 选路聚焦高亮、双击单路独占放大、ESC 键平滑恢复、
 * 主次码流动态自适应切换（主流 vs 次码流节约带宽）、
 * 多路音频互斥保护（仅选中路出声，杜绝混音噪声）、
 * 以及自动轮巡调度器 (Touring Scheduler)。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import { computed, onBeforeUnmount, ref } from 'vue';
import {
  AtengVideoGrid,
  type AtengVideoGridInstance,
  type VideoGridChannel,
  type VideoGridLayout,
} from '@atengk/video-player-vue';

const gridRef = ref<AtengVideoGridInstance | null>(null);

// 辅助生成视觉鲜明的模拟监控机位 SVG 封面
const createCameraPoster = (id: string, name: string, bg: string, tag: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
    <rect width="640" height="360" fill="${bg}"/>
    <rect x="24" y="24" width="8" height="24" fill="#38bdf8"/>
    <text x="42" y="42" font-family="system-ui,sans-serif" font-size="16" font-weight="700" fill="#ffffff">${id}</text>
    <rect x="490" y="24" width="126" height="26" rx="4" fill="rgba(34,197,94,0.2)"/>
    <circle cx="506" cy="37" r="4" fill="#22c55e"/>
    <text x="518" y="42" font-family="system-ui,sans-serif" font-size="12" font-weight="600" fill="#4ade80">● 实时监控</text>
    <text x="320" y="170" dominant-baseline="middle" text-anchor="middle" font-family="system-ui,sans-serif" font-size="26" font-weight="800" fill="#f8fafc">${name}</text>
    <rect x="220" y="210" width="200" height="30" rx="6" fill="rgba(255,255,255,0.08)"/>
    <text x="320" y="230" dominant-baseline="middle" text-anchor="middle" font-family="monospace" font-size="13" fill="#cbd5e1">${tag}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

// 实测国内极速秒开高可用 CDN 视频矩阵 (Video.js 海洋、W3C 科幻 Sintel、MDN 花卉、W3Schools 熊抓鱼、W3Schools 兔子、Artplayer 官方源，100% 免翻墙秒开)
const verifiedVideoSources = [
  'https://vjs.zencdn.net/v/oceans.mp4',
  'https://media.w3.org/2010/05/sintel/trailer.mp4',
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  'https://www.w3schools.com/html/movie.mp4',
  'https://www.w3schools.com/html/mov_bbb.mp4',
  'https://artplayer.org/assets/sample/video.mp4',
];

// 16 路各具特色的模拟监控通道数据（具备鲜明辨识度、不同封面与国内高可用极速测试源）
const mockChannels: VideoGridChannel[] = [
  {
    id: 'cam-01',
    title: '01# 园区东门全景高清球机',
    url: verifiedVideoSources[0],
    subUrl: verifiedVideoSources[0],
    poster: createCameraPoster('CAM-01', '园区东门全景球机', '#0f172a', '东门主卡口 1080P'),
  },
  {
    id: 'cam-02',
    title: '02# 园区西门车道卡口',
    url: verifiedVideoSources[1],
    subUrl: verifiedVideoSources[1],
    poster: createCameraPoster('CAM-02', '西门人车道卡口', '#1e1b4b', '西门人车抓拍 1080P'),
  },
  {
    id: 'cam-03',
    title: '03# 行政大楼 A 座大堂',
    url: verifiedVideoSources[2],
    subUrl: verifiedVideoSources[2],
    poster: createCameraPoster('CAM-03', '行政楼大堂门禁', '#1e293b', '大堂全景 1080P'),
  },
  {
    id: 'cam-04',
    title: '04# 核心机房防静电通道',
    url: verifiedVideoSources[3],
    subUrl: verifiedVideoSources[3],
    poster: createCameraPoster('CAM-04', '核心数据中心机房', '#064e3b', '机房重点防护 1080P'),
  },
  {
    id: 'cam-05',
    title: '05# 地下车库负一层 B 区',
    url: verifiedVideoSources[4],
    subUrl: verifiedVideoSources[4],
    poster: createCameraPoster('CAM-05', '地下车库负一层B区', '#3b0764', 'B区车牌识别 1080P'),
  },
  {
    id: 'cam-06',
    title: '06# 研发中心连廊周界',
    url: verifiedVideoSources[5],
    subUrl: verifiedVideoSources[5],
    poster: createCameraPoster('CAM-06', '研发中心连廊周界', '#172554', '周界红外入侵 1080P'),
  },
  {
    id: 'cam-07',
    title: '07# 职工餐厅中央取餐区',
    url: verifiedVideoSources[0],
    subUrl: verifiedVideoSources[0],
    poster: createCameraPoster('CAM-07', '职工餐厅取餐区', '#2e1065', '食品卫生监控 1080P'),
  },
  {
    id: 'cam-08',
    title: '08# 动力机房强电配电室',
    url: verifiedVideoSources[1],
    subUrl: verifiedVideoSources[1],
    poster: createCameraPoster('CAM-08', '强电配电动力室', '#450a0a', '电力高温巡检 1080P'),
  },
  {
    id: 'cam-09',
    title: '09# 屋顶直升机停机坪',
    url: verifiedVideoSources[2],
    subUrl: verifiedVideoSources[2],
    poster: createCameraPoster('CAM-09', '屋顶直升机停机坪', '#083344', '高空全景视野 1080P'),
  },
  {
    id: 'cam-10',
    title: '10# 物流装卸货平台西',
    url: verifiedVideoSources[3],
    subUrl: verifiedVideoSources[3],
    poster: createCameraPoster('CAM-10', '物流装卸平台西', '#14532d', '货运出入口 1080P'),
  },
  {
    id: 'cam-11',
    title: '11# 园区南门景观步道',
    url: verifiedVideoSources[4],
    subUrl: verifiedVideoSources[4],
    poster: createCameraPoster('CAM-11', '南门景观休闲步道', '#1f2937', '南门全景球机 1080P'),
  },
  {
    id: 'cam-12',
    title: '12# 贵宾接待室走廊',
    url: verifiedVideoSources[5],
    subUrl: verifiedVideoSources[5],
    poster: createCameraPoster('CAM-12', '贵宾接待室走廊', '#312e81', '内部安全通道 1080P'),
  },
  {
    id: 'cam-13',
    title: '13# 消防水泵房与喷淋监测',
    url: verifiedVideoSources[0],
    subUrl: verifiedVideoSources[0],
    poster: createCameraPoster('CAM-13', '消防水泵房喷淋', '#701a75', '水压自动遥测 1080P'),
  },
  {
    id: 'cam-14',
    title: '14# 外部市政道路衔接处',
    url: verifiedVideoSources[1],
    subUrl: verifiedVideoSources[1],
    poster: createCameraPoster('CAM-14', '市政外围衔接道路', '#365314', '周边交通卡口 1080P'),
  },
  {
    id: 'cam-15',
    title: '15# 太阳能微电网监控塔',
    url: verifiedVideoSources[2],
    subUrl: verifiedVideoSources[2],
    poster: createCameraPoster('CAM-15', '光伏微电网监控塔', '#713f12', '清洁能源巡检 1080P'),
  },
  {
    id: 'cam-16',
    title: '16# 监控总指挥中心大屏',
    url: verifiedVideoSources[3],
    subUrl: verifiedVideoSources[3],
    poster: createCameraPoster('CAM-16', '指挥中心总控台', '#09090b', '总控中枢全局 1080P'),
  },
];

const channels = ref<VideoGridChannel[]>(mockChannels);
const currentLayout = ref<VideoGridLayout>('2x2');
const activeChannelId = ref<string | number | null>('cam-01');
const autoSubStream = ref(true);
const audioExclusive = ref(true);
const gridGap = ref(6);
const themeColor = ref('#0ea5e9');

// 轮巡参数
const tourInterval = ref(6000);
const tourLog = ref<string[]>([]);

const addTourLog = (msg: string) => {
  const time = new Date().toLocaleTimeString();
  tourLog.value.unshift(`[${time}] ${msg}`);
  if (tourLog.value.length > 20) {
    tourLog.value.pop();
  }
};

const layoutOptions: { id: VideoGridLayout; name: string; desc: string }[] = [
  { id: '1x1', name: '1x1 单画面', desc: '单路全屏监控，默认加载 1080P 高清主流' },
  { id: '2x2', name: '2x2 四分屏', desc: '4路对称宫格，安防监控经典布局' },
  { id: '3x3', name: '3x3 九分屏', desc: '9路对称宫格，中型安防大屏常用' },
  { id: '4x4', name: '4x4 十六分屏', desc: '16路矩阵宫格，全景巡更总览' },
  { id: '1+5', name: '1+5 广播级主从', desc: '1大主窗 + 5小副窗，聚焦核心机位' },
  { id: '1+7', name: '1+7 广播级主从', desc: '1大主窗 + 7小副窗，大屏旗舰布局' },
];

const currentActiveTitle = computed(() => {
  const target = channels.value.find(c => c.id === activeChannelId.value);
  return target ? target.title : '未选中通道';
});

const isTouringActive = computed(() => {
  return (
    gridRef.value?.gridState?.isTouring?.value ?? gridRef.value?.state?.isTouring?.value ?? false
  );
});

const currentTourPage = computed(() => {
  const p =
    gridRef.value?.gridState?.tourPageIndex?.value ??
    gridRef.value?.state?.tourPageIndex?.value ??
    0;
  return p + 1;
});

const totalTourPages = computed(() => {
  const cap =
    currentLayout.value === '1x1'
      ? 1
      : currentLayout.value === '2x2'
        ? 4
        : currentLayout.value === '3x3'
          ? 9
          : currentLayout.value === '4x4'
            ? 16
            : currentLayout.value === '1+5'
              ? 6
              : 8;
  return Math.ceil(channels.value.length / cap);
});

const tourRemainingSeconds = ref(6);
let countdownTimer: ReturnType<typeof setInterval> | null = null;

const startCountdown = () => {
  tourRemainingSeconds.value = Math.round(tourInterval.value / 1000);
  if (countdownTimer) clearInterval(countdownTimer);
  countdownTimer = setInterval(() => {
    if (tourRemainingSeconds.value <= 1) {
      tourRemainingSeconds.value = Math.round(tourInterval.value / 1000);
    } else {
      tourRemainingSeconds.value -= 1;
    }
  }, 1000);
};

const stopCountdown = () => {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
  tourRemainingSeconds.value = Math.round(tourInterval.value / 1000);
};

onBeforeUnmount(() => {
  stopCountdown();
});

// 事件处理
const handleSelect = (channel: VideoGridChannel) => {
  activeChannelId.value = channel.id;
  addTourLog(`👉 选中聚焦通道: [${channel.title}] (ID: ${channel.id})`);
};

const handleDoubleClick = (channel: VideoGridChannel) => {
  addTourLog(`🔍 双击切换独占放大: [${channel.title}]`);
};

const handleRestore = () => {
  addTourLog('↩️ 退出独占放大，已平滑恢复宫格视图');
};

const handleStartTour = () => {
  if (!gridRef.value) return;
  gridRef.value.startTour({
    interval: tourInterval.value,
    pool: channels.value,
    onStep: (page, items) => {
      tourRemainingSeconds.value = Math.round(tourInterval.value / 1000);
      addTourLog(
        `🔄 自动轮巡触发: 第 ${page + 1} 批，展示通道: ${items.map(i => i.title.slice(0, 3)).join(', ')}`,
      );
    },
  });
  startCountdown();
  addTourLog(`🚀 自动轮巡已启动，间隔: ${tourInterval.value / 1000} 秒`);
};

const handleStopTour = () => {
  if (!gridRef.value) return;
  gridRef.value.stopTour();
  stopCountdown();
  addTourLog('⏹️ 自动轮巡已停止');
};

const handleNextTour = () => {
  if (!gridRef.value) return;
  gridRef.value.nextTourPage();
  tourRemainingSeconds.value = Math.round(tourInterval.value / 1000);
};

const handlePrevTour = () => {
  if (!gridRef.value) return;
  gridRef.value.prevTourPage();
  tourRemainingSeconds.value = Math.round(tourInterval.value / 1000);
};

const handleToggleMaximizeCurrent = () => {
  if (!gridRef.value || !activeChannelId.value) return;
  gridRef.value.toggleMaximize(activeChannelId.value);
};
</script>

<template>
  <div class="grid-demo">
    <div class="grid-demo__main">
      <!-- 顶部功能说明栏 -->
      <div class="grid-demo__header-panel">
        <div class="panel-left">
          <span class="panel-title">📺 多路分屏协同监控矩阵沙箱</span>
          <span class="panel-sub">
            当前聚焦: <strong>{{ currentActiveTitle }}</strong>
          </span>
        </div>
        <div class="panel-badges">
          <span class="badge badge--tech">CSS Grid 原生高性能</span>
          <span class="badge badge--adaptive" :class="{ 'badge--active': autoSubStream }">
            {{ autoSubStream ? '⚡ 主次码流自适应: 开启' : '高清主流直拉' }}
          </span>
          <span class="badge badge--audio" :class="{ 'badge--active': audioExclusive }">
            {{ audioExclusive ? '🔇 多路音频互斥: 开启' : '多路混音' }}
          </span>
          <span v-if="isTouringActive" class="badge badge--touring">
            🔄 自动轮巡中: {{ tourRemainingSeconds }}s 后翻页 (第 {{ currentTourPage }} /
            {{ totalTourPages }} 批)
          </span>
        </div>
      </div>

      <!-- 视频分屏网格核心容器 -->
      <div class="grid-demo__viewport">
        <AtengVideoGrid
          ref="gridRef"
          :channels="channels"
          :layout="currentLayout"
          :active-id="activeChannelId"
          :auto-sub-stream="autoSubStream"
          :audio-exclusive="audioExclusive"
          :gap="gridGap"
          :theme-color="themeColor"
          :autoplay="true"
          @select="handleSelect"
          @channel-dblclick="handleDoubleClick"
          @restore="handleRestore"
        >
          <!-- 自定义通道顶部标头插槽 -->
          <template #channel-header="{ channel, isActive, isMaximized }">
            <div class="custom-header">
              <span class="cam-status-dot" />
              <span class="cam-name">{{ channel.title }}</span>
              <span class="cam-badge cam-badge--batch"
                >第 {{ currentTourPage }}/{{ totalTourPages }} 批</span
              >
              <span v-if="isMaximized" class="cam-badge cam-badge--max">独占全屏</span>
              <span v-else-if="isActive" class="cam-badge cam-badge--focus">当前聚焦</span>
              <span class="cam-stream-type">
                {{ autoSubStream && currentLayout !== '1x1' ? '次码流 (360P)' : '主流 (1080P)' }}
              </span>
            </div>
          </template>
        </AtengVideoGrid>
      </div>

      <!-- 底部操作提示 -->
      <div class="grid-demo__footer-tips">
        <span
          >💡
          交互技巧：单击任意视频可聚焦选路并高亮外框；<strong>双击任一机位</strong>可平滑独占放大为单画面，再次双击或按
          <strong>ESC 键</strong>可退出放大恢复宫格。</span
        >
      </div>
    </div>

    <!-- 右侧参数调控与轮巡控制台 -->
    <aside class="grid-demo__sidebar">
      <!-- 1. 网格布局与分屏切换 -->
      <section class="console-card">
        <h4>📐 分屏布局矩阵切换</h4>
        <div class="layout-btn-grid">
          <button
            v-for="item in layoutOptions"
            :key="item.id"
            type="button"
            class="layout-btn"
            :class="{ 'layout-btn--active': currentLayout === item.id }"
            @click="currentLayout = item.id"
          >
            <span class="layout-name">{{ item.name }}</span>
            <span class="layout-desc">{{ item.desc }}</span>
          </button>
        </div>
      </section>

      <!-- 2. 选路与视图操作 -->
      <section class="console-card">
        <h4>🎯 选路聚焦与独占放大</h4>
        <div class="control-row">
          <button
            type="button"
            class="action-btn action-btn--primary"
            @click="handleToggleMaximizeCurrent"
          >
            🔍 独占放大/还原当前路
          </button>
          <button type="button" class="action-btn" @click="gridRef?.restoreGrid()">
            ↩️ 强制恢复宫格
          </button>
        </div>
        <div class="setting-item">
          <label>网格单元间距 (Gap): {{ gridGap }}px</label>
          <input
            v-model.number="gridGap"
            type="range"
            min="0"
            max="16"
            step="2"
            class="range-slider"
          />
        </div>
        <div class="setting-switches">
          <label class="switch-label">
            <input v-model="autoSubStream" type="checkbox" />
            <span>主次码流自适应 (多路拉次码流，放大拉高清)</span>
          </label>
          <label class="switch-label">
            <input v-model="audioExclusive" type="checkbox" />
            <span>多路音频互斥 (仅聚焦路出声，背景路静音)</span>
          </label>
        </div>
      </section>

      <!-- 3. 自动轮巡调度器 -->
      <section class="console-card console-card--tour">
        <h4>🔄 自动轮巡调度器 (Touring)</h4>
        <p class="card-desc">
          针对 16 路大通道池，按设定的时间间隔和当前布局容量，自动逐批翻页轮巡巡更。
        </p>
        <div class="setting-item">
          <label>轮巡切换步长间隔: {{ tourInterval / 1000 }} 秒</label>
          <input
            v-model.number="tourInterval"
            type="range"
            min="2000"
            max="15000"
            step="1000"
            class="range-slider"
          />
        </div>
        <div class="tour-actions">
          <button
            v-if="!isTouringActive"
            type="button"
            class="action-btn action-btn--success"
            @click="handleStartTour"
          >
            ▶️ 启动自动轮巡
          </button>
          <button
            v-else
            type="button"
            class="action-btn action-btn--danger"
            @click="handleStopTour"
          >
            ⏹️ 停止自动轮巡 ({{ tourRemainingSeconds }}s)
          </button>
          <button type="button" class="action-btn" @click="handlePrevTour">
            ⏮️ 上一批 (手动翻页)
          </button>
          <button type="button" class="action-btn" @click="handleNextTour">
            ⏭️ 下一批 (手动翻页)
          </button>
        </div>
      </section>

      <!-- 4. 轮巡调度与事件日志 -->
      <section class="console-card console-card--log">
        <div class="card-header">
          <h4>📋 监控矩阵事件日志</h4>
          <button type="button" class="clear-btn" @click="tourLog = []">清空</button>
        </div>
        <div class="log-container">
          <div v-for="(entry, idx) in tourLog" :key="idx" class="log-entry">
            {{ entry }}
          </div>
          <div v-if="tourLog.length === 0" class="log-empty">
            暂无事件触发，请点击分屏通道或启动轮巡...
          </div>
        </div>
      </section>
    </aside>
  </div>
</template>

<style scoped>
.grid-demo {
  display: flex;
  gap: 20px;
  width: 100%;
  min-height: 720px;
}

.grid-demo__main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #0f172a;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
  border: 1px solid #1e293b;
}

.grid-demo__header-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #1e293b;
}

.panel-title {
  font-size: 16px;
  font-weight: 600;
  color: #f8fafc;
  display: block;
}

.panel-sub {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 2px;
  display: block;
}

.panel-badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.badge {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 4px;
  background: #1e293b;
  color: #94a3b8;
  border: 1px solid #334155;
}

.badge--tech {
  color: #38bdf8;
  border-color: #0284c7;
}

.badge--active {
  background: rgba(14, 165, 233, 0.15);
  color: #38bdf8;
  border-color: #0ea5e9;
}

.badge--touring {
  background: rgba(34, 197, 94, 0.2);
  color: #4ade80;
  border-color: #22c55e;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.grid-demo__viewport {
  width: 100%;
  height: 580px;
  background: #020617;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #1e293b;
}

.custom-header {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
}

.cam-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 6px #22c55e;
}

.cam-name {
  font-size: 12px;
  font-weight: 500;
  color: #f1f5f9;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.cam-badge {
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 3px;
  background: rgba(56, 189, 248, 0.2);
  color: #38bdf8;
}

.cam-badge--max {
  background: rgba(239, 68, 68, 0.25);
  color: #f87171;
}

.cam-badge--batch {
  background: rgba(168, 85, 247, 0.25);
  color: #c084fc;
}

.cam-stream-type {
  font-size: 10px;
  color: #94a3b8;
  background: #0f172a;
  padding: 1px 4px;
  border-radius: 3px;
}

.grid-demo__footer-tips {
  margin-top: 12px;
  font-size: 12px;
  color: #64748b;
  line-height: 1.5;
}

.grid-demo__sidebar {
  width: 360px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.console-card {
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 8px;
  padding: 14px;
}

.console-card h4 {
  margin: 0 0 10px 0;
  font-size: 14px;
  font-weight: 600;
  color: #e2e8f0;
}

.card-desc {
  font-size: 12px;
  color: #94a3b8;
  margin: 0 0 10px 0;
  line-height: 1.4;
}

.layout-btn-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.layout-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 8px 10px;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.layout-btn:hover {
  background: #334155;
  border-color: #64748b;
}

.layout-btn--active {
  background: rgba(14, 165, 233, 0.15);
  border-color: #0ea5e9;
}

.layout-name {
  font-size: 12px;
  font-weight: 600;
  color: #f1f5f9;
}

.layout-btn--active .layout-name {
  color: #38bdf8;
}

.layout-desc {
  font-size: 10px;
  color: #64748b;
  margin-top: 2px;
  line-height: 1.2;
}

.control-row {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.action-btn {
  flex: 1;
  padding: 7px 10px;
  font-size: 12px;
  border-radius: 6px;
  border: 1px solid #334155;
  background: #1e293b;
  color: #f1f5f9;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #334155;
}

.action-btn--primary {
  background: #0284c7;
  border-color: #0369a1;
}

.action-btn--primary:hover {
  background: #0369a1;
}

.action-btn--success {
  background: #15803d;
  border-color: #166534;
}

.action-btn--success:hover {
  background: #166534;
}

.action-btn--danger {
  background: #b91c1c;
  border-color: #991b1b;
}

.action-btn--danger:hover {
  background: #991b1b;
}

.setting-item {
  margin-top: 10px;
}

.setting-item label {
  display: block;
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 4px;
}

.range-slider {
  width: 100%;
  accent-color: #0ea5e9;
}

.setting-switches {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 10px;
}

.switch-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: #cbd5e1;
  cursor: pointer;
}

.tour-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 10px;
}

.console-card--log {
  flex: 1;
  min-height: 180px;
  display: flex;
  flex-direction: column;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.clear-btn {
  background: none;
  border: none;
  color: #64748b;
  font-size: 11px;
  cursor: pointer;
}

.clear-btn:hover {
  color: #94a3b8;
}

.log-container {
  flex: 1;
  background: #020617;
  border-radius: 4px;
  padding: 8px;
  overflow-y: auto;
  max-height: 160px;
  font-family: monospace;
  font-size: 11px;
  border: 1px solid #1e293b;
}

.log-entry {
  color: #38bdf8;
  line-height: 1.4;
  margin-bottom: 4px;
}

.log-empty {
  color: #475569;
  text-align: center;
  padding-top: 40px;
}
</style>
