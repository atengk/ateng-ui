<script setup lang="ts">
/**
 * 现代轻量加载基础设施与防闪烁时序架构体验展厅。
 *
 * 呈现：
 * 1. 2px 顶栏纳米科技流光线 (AtengLoadingBar) 与全自动路由接管；
 * 2. 局部零遮罩 (Zero-Overlay) 顶沿极光流光线 (AtengLoading mode="shimmer")；
 * 3. 极简三点微波浪 (AtengLoading mode="dots") 与骨架屏 (mode="skeleton")；
 * 4. 150ms 静默防御 + 300ms 最小展示期防闪烁时序状态机实测沙箱。
 *
 * @author Ateng
 * @since 2026-10-23
 */

import { ref } from 'vue';
import { ElButton, ElSlider, ElTag } from 'element-plus';
import { AtengLoading, AtengLoadingBar, AtengCard, AtengPageContainer } from '@atengk/element-plus';
import { useAntiFlicker } from '@atengk/vue';

// 1. 局部 Loading 模式控制
const shimmerLoading = ref(true);
const dotsLoading = ref(true);
const skeletonLoading = ref(true);

// 2. 全局纳米条调度
const triggerSimulation = () => {
  AtengLoadingBar.start();
  const steps = [35, 60, 82, 92];
  let i = 0;
  const interval = setInterval(() => {
    if (i < steps.length) {
      AtengLoadingBar.inc(steps[i] - 25);
      i++;
    } else {
      clearInterval(interval);
      AtengLoadingBar.finish();
    }
  }, 180);
};

// 3. 防闪烁模拟沙箱
const simDelay = ref(80);
const rawLoading = ref(false);
const safeSource = ref(false);
const rawStatus = ref('就绪 (等待发起请求)');
const safeStatus = ref('就绪 (等待发起请求)');

// 使用防闪烁状态机包装 safeSource
const safePending = useAntiFlicker(safeSource, { delay: 150, minDuration: 300 });

const runFlickerSimulation = () => {
  // A. 普通未受管请求
  rawLoading.value = true;
  rawStatus.value = `请求已发起，遮罩瞬间挂载...`;
  const startT = performance.now();

  setTimeout(() => {
    rawLoading.value = false;
    const elapsed = (performance.now() - startT).toFixed(0);
    rawStatus.value = `⚠️ 耗时仅 ${elapsed}ms，Loading 瞬闪了 1~2 帧，造成强烈眼球震颤！`;
  }, simDelay.value);

  // B. 受管防闪烁请求
  safeSource.value = true;
  safeStatus.value = `请求已发起，正在 150ms 静默保护期内防御...`;

  setTimeout(() => {
    safeSource.value = false;
    if (!safePending.value) {
      safeStatus.value = `🎉 耗时 ${simDelay.value}ms (< 150ms)，触发静默防御，Loading 0ms 打扰！`;
    } else {
      safeStatus.value = `✅ 耗时 ${simDelay.value}ms (> 150ms)，触发 300ms 最短保护期，平滑淡出。`;
    }
  }, simDelay.value);
};
</script>

<template>
  <AtengPageContainer
    title="现代轻量加载基础设施 (AtengLoading / LoadingBar)"
    subtitle="彻底剥离全屏模态遮罩与高斯模糊滤镜：2px 顶栏纳米流光线、局部零遮罩顶沿流光与 150ms 防闪烁状态机"
  >
    <!-- 1. 全局 2px 顶栏纳米流光线 -->
    <AtengCard
      title="🌐 1. 全局加载唯一纯粹形态：2px 顶栏科技流光线 (AtengLoadingBar)"
      class="mb-4"
    >
      <template #extra>
        <ElTag type="success" size="small">0 遮罩 · 0 模态 · 120fps</ElTag>
      </template>
      <p class="section-desc mb-3">
        现代企业级中后台绝不在空中悬浮大黑卡片或生硬药丸胶囊。<strong
          >全局仅在视口最顶沿滑过一道 2px 极细科技流线</strong
        >， GPU 硬件合成层加速，单帧耗时 &lt; 0.01ms。支持
        <code>installLoadingBar(router)</code> 全自动接管路由。
      </p>
      <div class="btn-cluster">
        <ElButton type="primary" @click="triggerSimulation">
          ▶️ 模拟全流程路由切换 (点击观察屏幕最顶沿)
        </ElButton>
        <ElButton @click="AtengLoadingBar.start()">Start (启动 25%)</ElButton>
        <ElButton @click="AtengLoadingBar.inc(15)">+15% 递增</ElButton>
        <ElButton @click="AtengLoadingBar.finish()">Finish 平滑完成</ElButton>
        <ElButton type="danger" @click="AtengLoadingBar.error()">Error (接口异常红光)</ElButton>
      </div>
    </AtengCard>

    <!-- 2. 局部轻量化多态矩阵 -->
    <div class="grid-three-col mb-4">
      <!-- 形态 A：顶沿 2px 极光流线 (零遮罩首选) -->
      <AtengCard title="🌊 推荐 A：顶沿极光流光线 (Zero-Overlay)">
        <template #extra>
          <ElButton size="small" @click="shimmerLoading = !shimmerLoading">
            {{ shimmerLoading ? '关闭加载' : '开启加载' }}
          </ElButton>
        </template>
        <p class="section-desc mb-3">
          <strong>完全没有遮罩层！</strong>仅卡片顶沿流动 2px
          极细流线，底层文字清晰可见，彻底摆脱遮挡阻隔感。
        </p>

        <AtengLoading :loading="shimmerLoading" mode="shimmer">
          <div class="demo-box">
            <div class="demo-title">集群多租户网格节点</div>
            <div class="demo-row w-80" />
            <div class="demo-row w-60" />
            <div class="demo-row w-90" />
            <p class="demo-text">
              状态：已连接 12 个微服务实例，当前主路由链路吞吐保持在 42,000 QPS。
            </p>
          </div>
        </AtengLoading>
      </AtengCard>

      <!-- 形态 B：三点微波浪 (Wave Dots) -->
      <AtengCard title="✨ 推荐 B：三点微波浪 (Wave Dots)">
        <template #extra>
          <ElButton size="small" @click="dotsLoading = !dotsLoading">
            {{ dotsLoading ? '关闭加载' : '开启加载' }}
          </ElButton>
        </template>
        <p class="section-desc mb-3">
          纯单色半透明背景，<strong>彻底剥离 backdrop-filter 高斯模糊滤镜</strong>，动画仅操作 3
          个小点的 GPU 位移。
        </p>

        <AtengLoading :loading="dotsLoading" mode="dots" text="正在同步指标数据...">
          <div class="demo-box">
            <div class="demo-title">实时分析流水线</div>
            <div class="demo-row w-90" />
            <div class="demo-row w-40" />
            <div class="demo-row w-80" />
            <p class="demo-text">
              存储指标：时序数据库写入延时 2.4ms，实时消费位点健康，无背压报警。
            </p>
          </div>
        </AtengLoading>
      </AtengCard>

      <!-- 形态 C：骨架屏内容占位 -->
      <AtengCard title="💀 推荐 C：骨架屏占位 (Skeleton)">
        <template #extra>
          <ElButton size="small" @click="skeletonLoading = !skeletonLoading">
            {{ skeletonLoading ? '关闭占位' : '开启占位' }}
          </ElButton>
        </template>
        <p class="section-desc mb-3">
          首次加载或卡片冷启动最佳首选，预先占位版式结构，视觉过渡平滑无缝。
        </p>

        <AtengLoading :loading="skeletonLoading" mode="skeleton">
          <div class="demo-box">
            <div class="demo-title">业务账单概览</div>
            <div class="demo-row w-80" />
            <div class="demo-row w-60" />
            <div class="demo-row w-90" />
            <p class="demo-text">账单结算：本周期实付金额已锁定，下月初自动派发纳税抵扣凭证。</p>
          </div>
        </AtengLoading>
      </AtengCard>
    </div>

    <!-- 3. 工业级防闪烁时序状态机实测沙箱 -->
    <AtengCard title="🛡️ 3. 工业级防闪烁 (Anti-Flicker) 时序状态机实测沙箱">
      <div class="flicker-header mb-3">
        <div>
          <span class="font-semibold text-sm">模拟快速接口响应：</span>
          <span class="text-xs text-muted">拖动滑块测试 150ms 静默窗口拦截效果</span>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-xs">模拟接口耗时：</span>
          <ElSlider v-model="simDelay" :min="30" :max="500" style="width: 140px" />
          <strong class="font-mono text-sm" style="width: 50px">{{ simDelay }} ms</strong>
          <ElButton type="primary" size="small" @click="runFlickerSimulation">
            ⚡ 发起对比测试
          </ElButton>
        </div>
      </div>

      <div class="grid-two-col gap-4">
        <!-- 未开启防闪烁 -->
        <div class="flicker-card">
          <div class="flicker-card-header">
            <span class="font-semibold text-danger">⚠️ 普通未受管模式 (无防闪烁)</span>
          </div>
          <p class="text-xs text-muted mb-2">
            点击立即挂载遮罩。极速（如 80ms）返回时瞬间闪现 1~2 帧，造成强烈的画面震颤。
          </p>
          <div class="flicker-status-box" :class="{ 'is-active': rawLoading }">
            {{ rawStatus }}
          </div>
        </div>

        <!-- 开启防闪烁状态机 -->
        <div class="flicker-card">
          <div class="flicker-card-header">
            <span class="font-semibold text-success">✅ @atengk 防闪烁状态机 (useAntiFlicker)</span>
          </div>
          <p class="text-xs text-muted mb-2">
            150ms 静默阈值保护：极速返回 0ms 打扰；超过 150ms 触发 300ms 最小展示期优雅淡出。
          </p>
          <div class="flicker-status-box is-safe" :class="{ 'is-active': safePending }">
            {{ safeStatus }}
          </div>
        </div>
      </div>
    </AtengCard>
  </AtengPageContainer>
</template>

<style scoped>
.mb-3 {
  margin-bottom: 12px;
}

.mb-4 {
  margin-bottom: 18px;
}

.section-desc {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
}

.btn-cluster {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.grid-three-col {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 16px;
}

.grid-two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.demo-box {
  padding: 16px;
  background-color: var(--el-fill-color-light);
  border: 1px dashed var(--el-border-color);
  border-radius: var(--el-border-radius-base);
  min-height: 140px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.demo-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin-bottom: 10px;
}

.demo-row {
  height: 9px;
  background-color: var(--el-border-color-light);
  border-radius: 4px;
  margin-bottom: 8px;
}

.demo-row.w-80 {
  width: 80%;
}
.demo-row.w-60 {
  width: 60%;
}
.demo-row.w-90 {
  width: 90%;
}
.demo-row.w-40 {
  width: 40%;
}

.demo-text {
  font-size: 12.5px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
  line-height: 1.5;
}

.flicker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.flicker-card {
  padding: 14px;
  background-color: var(--el-fill-color-blank);
  border: 1px solid var(--el-border-color-light);
  border-radius: var(--el-border-radius-base);
}

.flicker-card-header {
  margin-bottom: 6px;
}

.flicker-status-box {
  padding: 14px;
  background-color: var(--el-fill-color-light);
  border-radius: var(--el-border-radius-base);
  font-size: 12.5px;
  color: var(--el-text-color-regular);
  min-height: 60px;
  display: flex;
  align-items: center;
  transition: all 0.2s ease;
}

.flicker-status-box.is-active {
  background-color: rgba(var(--el-color-danger-rgb), 0.12);
  color: var(--el-color-danger);
  font-weight: 600;
}

.flicker-status-box.is-safe.is-active {
  background-color: rgba(var(--el-color-primary-rgb), 0.12);
  color: var(--el-color-primary);
  font-weight: 600;
}

.font-semibold {
  font-weight: 600;
}

.font-mono {
  font-family: var(--at-font-mono, monospace);
}

.text-xs {
  font-size: 12px;
}

.text-sm {
  font-size: 13.5px;
}

.text-muted {
  color: var(--el-text-color-secondary);
}

.text-success {
  color: var(--el-color-success);
}

.text-danger {
  color: var(--el-color-danger);
}

.flex {
  display: flex;
}

.items-center {
  align-items: center;
}

.gap-3 {
  gap: 12px;
}
</style>
