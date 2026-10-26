<script setup lang="ts">
/**
 * WatermarkDemo: 防录屏安全水印与 F12 攻防演示沙箱。
 *
 * 验证：Canvas 动态平铺水印、动态微位移随机浮动防录屏反算法、
 * MutationObserver DOM 审查防篡改自愈、以及容器级全屏穿越覆盖。
 *
 * @author Ateng
 * @since 2026-10-26
 */

import { ref } from 'vue';
import {
  AtengVideoPlayer,
  AtengVideoWatermark,
  type AtengVideoPlayerInstance,
  type WatermarkTamperDetail,
} from '@atengk/video-player-vue';

const playerRef = ref<AtengVideoPlayerInstance | null>(null);
const videoUrl = ref('https://artplayer.org/assets/sample/video.mp4');
const posterUrl = ref('https://artplayer.org/assets/sample/poster.jpg');

// 水印参数配置
const userName = ref('张三 (工号: SEC-9527)');
const userIp = ref('192.168.1.108');
const watermarkOpacity = ref(0.18);
const watermarkRotate = ref(-22);
const isFloating = ref(true);
const isTamperProof = ref(true);

const attackLogs = ref<string[]>([]);
const healCount = ref(0);

const log = (msg: string) => {
  const time = new Date().toLocaleTimeString();
  attackLogs.value.unshift(`[${time}] ${msg}`);
  if (attackLogs.value.length > 25) {
    attackLogs.value.pop();
  }
};

const onTamperAlert = (detail: WatermarkTamperDetail) => {
  healCount.value++;
  log(
    `🚨 捕获恶意篡改告警！类型: [${detail.type === 'style' ? 'CSS 样式篡改' : 'DOM 节点强行删除'}] -> 已就地毫秒级自愈复活！`,
  );
};

// 模拟攻防动作
const handleAttackStyleNone = () => {
  const el = document.querySelector<HTMLElement>('.at-video-watermark');
  if (el) {
    log('⚠️ 模拟 F12 控制台攻击：注入 style.display = "none"');
    el.style.display = 'none';
  } else {
    log('❌ 未找到水印 DOM 节点');
  }
};

const handleAttackOpacityZero = () => {
  const el = document.querySelector<HTMLElement>('.at-video-watermark');
  if (el) {
    log('⚠️ 模拟 F12 控制台攻击：注入 style.opacity = "0"');
    el.style.opacity = '0';
  } else {
    log('❌ 未找到水印 DOM 节点');
  }
};

const handleAttackRemoveNode = () => {
  const el = document.querySelector<HTMLElement>('.at-video-watermark');
  if (el) {
    log('⚠️ 模拟 F12 控制台攻击：执行 el.remove() 强行移除 DOM 节点');
    el.remove();
  } else {
    log('❌ 未找到水印 DOM 节点');
  }
};

const handleFullscreen = () => {
  playerRef.value?.enterFullscreen();
  log('🖥️ 触发容器级全屏（测试全屏下水印浮层是否 100% 牢固覆盖）');
};
</script>

<template>
  <div class="watermark-demo">
    <div class="watermark-demo__main">
      <!-- 视频播放器与水印集成视口 -->
      <div class="watermark-demo__player-box">
        <AtengVideoPlayer
          ref="playerRef"
          :url="videoUrl"
          :poster="posterUrl"
          title="涉密视频播放示例 (DLP 安全水印保护中)"
          theme="#38bdf8"
        >
          <!-- 安全防录屏水印专用插槽 -->
          <template #watermark>
            <AtengVideoWatermark
              :content="[userName, userIp, '内部涉密 截屏追责']"
              :opacity="watermarkOpacity"
              :rotate="watermarkRotate"
              :floating="isFloating"
              :tamper-proof="isTamperProof"
              @watermark-tampered="onTamperAlert"
            />
          </template>
        </AtengVideoPlayer>
      </div>

      <!-- 攻防演练控制与参数调整区 -->
      <div class="watermark-demo__controls">
        <!-- F12 攻防实测沙箱 -->
        <section class="control-card control-card--danger">
          <div class="card-header">
            <h4>⚔️ F12 审查攻防实测沙箱 (Tamper-Proof)</h4>
            <span class="heal-badge">自愈恢复计数: {{ healCount }} 次</span>
          </div>
          <p class="desc">
            模拟黑客或员工打开浏览器开发者工具 (F12)，试图通过删除 DOM 节点或注入 CSS 隐藏水印：
          </p>
          <div class="btn-group">
            <button
              type="button"
              class="action-btn action-btn--danger"
              @click="handleAttackStyleNone"
            >
              💉 攻击: 注入 display: none
            </button>
            <button
              type="button"
              class="action-btn action-btn--danger"
              @click="handleAttackOpacityZero"
            >
              💉 攻击: 注入 opacity: 0
            </button>
            <button
              type="button"
              class="action-btn action-btn--danger"
              @click="handleAttackRemoveNode"
            >
              💣 攻击: 直接删除水印节点
            </button>
            <button type="button" class="action-btn action-btn--primary" @click="handleFullscreen">
              🖥️ 测试容器级全屏穿越
            </button>
          </div>
        </section>

        <!-- 水印参数动态调节 -->
        <section class="control-card">
          <h4>🎨 水印渲染与防录屏算法配置</h4>
          <div class="form-grid">
            <div class="form-item">
              <label>水印人员/工号:</label>
              <input v-model="userName" type="text" class="input-text" />
            </div>
            <div class="form-item">
              <label>终端 IP / 地点:</label>
              <input v-model="userIp" type="text" class="input-text" />
            </div>
            <div class="form-item">
              <label>透明度 ({{ watermarkOpacity }}):</label>
              <input
                v-model.number="watermarkOpacity"
                type="range"
                min="0.05"
                max="0.6"
                step="0.01"
              />
            </div>
            <div class="form-item">
              <label>旋转倾角 ({{ watermarkRotate }}°):</label>
              <input v-model.number="watermarkRotate" type="range" min="-60" max="60" step="1" />
            </div>
          </div>
          <div class="checkbox-group">
            <label class="checkbox-label">
              <input v-model="isFloating" type="checkbox" />
              开启动态微位移随机浮动 (对抗录屏去水印算法)
            </label>
            <label class="checkbox-label">
              <input v-model="isTamperProof" type="checkbox" />
              开启 MutationObserver 防审查防删除自愈
            </label>
          </div>
        </section>
      </div>
    </div>

    <!-- 侧边实时攻击与自愈审计日志 -->
    <aside class="watermark-demo__sidebar">
      <div class="log-panel">
        <div class="log-panel__header">
          <h3>🛡️ DLP 安全告警与防御自愈日志</h3>
          <button type="button" class="clear-btn" @click="attackLogs = []">清空</button>
        </div>
        <div class="log-panel__body">
          <div v-for="(item, idx) in attackLogs" :key="idx" class="log-item">
            {{ item }}
          </div>
          <div v-if="attackLogs.length === 0" class="log-empty">
            暂无告警日志，请点击上方攻防按钮触发测试
          </div>
        </div>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.watermark-demo {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 20px;
}

.watermark-demo__main {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.watermark-demo__player-box {
  width: 100%;
  height: 480px;
  background-color: #000;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.watermark-demo__controls {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.control-card {
  background-color: #ffffff;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.control-card--danger {
  border-color: #fecaca;
  background-color: #fffaf0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.control-card h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.heal-badge {
  background-color: #10b981;
  color: #ffffff;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 12px;
}

.desc {
  margin: 0 0 12px 0;
  font-size: 12px;
  color: #64748b;
  line-height: 1.5;
}

.btn-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.action-btn {
  padding: 6px 14px;
  border: none;
  border-radius: 4px;
  color: #ffffff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn--primary {
  background-color: #3b82f6;
}

.action-btn--primary:hover {
  background-color: #2563eb;
}

.action-btn--danger {
  background-color: #ef4444;
}

.action-btn--danger:hover {
  background-color: #dc2626;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-top: 10px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  color: #475569;
}

.input-text {
  padding: 6px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  font-size: 13px;
  color: #1e293b;
}

.checkbox-group {
  display: flex;
  gap: 20px;
  margin-top: 14px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #334155;
  cursor: pointer;
}

.watermark-demo__sidebar {
  display: flex;
  flex-direction: column;
}

.log-panel {
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  height: 100%;
  min-height: 400px;
  display: flex;
  flex-direction: column;
}

.log-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #e2e8f0;
}

.log-panel__header h3 {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
}

.clear-btn {
  background: none;
  border: none;
  color: #64748b;
  font-size: 12px;
  cursor: pointer;
}

.clear-btn:hover {
  color: #0f172a;
}

.log-panel__body {
  padding: 12px;
  flex: 1;
  overflow-y: auto;
  font-family: monospace;
  font-size: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.log-item {
  padding: 4px 8px;
  background-color: #f8fafc;
  border-radius: 4px;
  color: #334155;
  line-height: 1.4;
  word-break: break-all;
}

.log-empty {
  color: #94a3b8;
  text-align: center;
  margin-top: 40px;
}
</style>
