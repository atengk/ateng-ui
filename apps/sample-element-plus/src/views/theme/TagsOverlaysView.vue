<script setup lang="ts">
/**
 * @atengk/element-plus 现代主题引擎 - 标签、开关与毛玻璃浮层自验展厅。
 *
 * 验证维度：
 * 1. 软质高透 Soft Pill 标签与黑曜石暗晶体底 (Obsidian)；
 * 2. 呼吸微发光 LED 状态核标签 (.is-dot / .el-tag--dot)；
 * 3. 精密数控滑动开关 (ElSwitch: 冷钛底、立体内凹微影滑块、阻尼过渡、开启态柔光)；
 * 4. 沉浸式景深毛玻璃遮罩 (ElOverlay: blur(8px)) 与 16px 大圆角弹窗 (ElDialog)；
 * 5. 浮动药丸卡片 Toast 提示 (ElMessage: 9999px 圆角 + blur(16px))；
 * 6. 5 款科技主题预设实时秒切与暗黑模式深度自适应；
 * 7. 零 !important 逃生门：业务局部 class 天然自由覆写。
 *
 * @author Ateng
 * @since 2026-10-22
 */

import { ref } from 'vue';
import {
  ElButton,
  ElTag,
  ElSwitch,
  ElDialog,
  ElRadioGroup,
  ElRadioButton,
  ElMessage,
  ElNotification,
} from 'element-plus';
import { AtengCard } from '@atengk/element-plus';

// 1. 主题预设控制
const currentPreset = ref<'indigo' | 'emerald' | 'violet' | 'ocean' | 'rose'>('indigo');

const switchPreset = (preset: 'indigo' | 'emerald' | 'violet' | 'ocean' | 'rose') => {
  currentPreset.value = preset;
  document.documentElement.setAttribute('data-theme', preset);
  ElMessage.success({
    message: `已切换至 ${preset.toUpperCase()} 科技主题`,
    grouping: true,
  });
};

// 2. 开关状态
const switchValues = ref({
  systemAudit: true,
  debugMode: false,
  autoScaling: true,
  maintenance: false,
});

// 3. 弹窗控制
const dialogVisible = ref(false);

// 4. Message / Notification 演示
const triggerMessage = (type: 'success' | 'warning' | 'error' | 'info') => {
  const messages = {
    success: '集群策略配置已全量热生效，零流量丢失。',
    warning: '当前网关连接池已达到 85% 预警阈值。',
    error: '鉴权中台 503 熔断触发，已自动切换备用链路。',
    info: '系统每日自动审计快照将在 02:00 生成。',
  };
  ElMessage[type]({
    message: messages[type],
    grouping: true,
  });
};

const triggerNotification = () => {
  ElNotification({
    title: '分布式事务调度中心',
    message: '全链路事务协调器已完成全球 4 个 Region 的原子对齐，耗时 12.4ms。',
    type: 'success',
  });
};
</script>

<template>
  <div class="theme-tags-overlays-view">
    <!-- 顶部主题快速切换操作条 -->
    <AtengCard title="🎨 5 款极客科技主题预设实时切换" class="mb-4">
      <div class="preset-bar">
        <span class="label">当前主题:</span>
        <ElRadioGroup
          :model-value="currentPreset"
          @update:model-value="val => switchPreset(val as any)"
        >
          <ElRadioButton value="indigo">🌌 Indigo 极客靛蓝</ElRadioButton>
          <ElRadioButton value="emerald">🌲 Emerald 极客翠绿</ElRadioButton>
          <ElRadioButton value="violet">🔮 Violet 赛博幻紫</ElRadioButton>
          <ElRadioButton value="ocean">🌊 Ocean 商务深海</ElRadioButton>
          <ElRadioButton value="rose">🌹 Rose 极光绯红</ElRadioButton>
        </ElRadioGroup>
      </div>
      <p class="preset-tip">
        💡 提示：在上方切换主题，观察下方标签、开关激活色与弹窗/消息微光的实时秒级响应！
      </p>
    </AtengCard>

    <!-- 1. 黑曜石暗晶体 LED 标签体系 -->
    <AtengCard title="🏷️ 现代标签体系 (黑曜石暗晶体底 + 呼吸微发光 LED 状态核)" class="mb-4">
      <div class="showcase-block mb-4">
        <div class="block-title">1.1 呼吸发光 LED 状态核标签 (.is-dot)</div>
        <div class="tag-row">
          <ElTag class="is-dot" type="primary">Primary 主题色</ElTag>
          <ElTag class="is-dot" type="success">Active 正常运行</ElTag>
          <ElTag class="is-dot" type="warning">Degraded 性能降级</ElTag>
          <ElTag class="is-dot" type="danger">Critical 熔断告警</ElTag>
          <ElTag class="is-dot" type="info">Standby 冷备节点</ElTag>
        </div>
      </div>

      <div class="showcase-block mb-4">
        <div class="block-title">1.2 软质高透 Soft Pill 默认变体 (告别刺眼实线塑料感)</div>
        <div class="tag-row">
          <ElTag type="primary" closable>动态换肤</ElTag>
          <ElTag type="success" closable>集群健康</ElTag>
          <ElTag type="warning" closable>轻度高负载</ElTag>
          <ElTag type="danger" closable>证书过期</ElTag>
          <ElTag type="info" closable>中性标签</ElTag>
          <ElTag round type="primary">胶囊圆角</ElTag>
          <ElTag size="small" type="success">Small 紧凑</ElTag>
          <ElTag size="large" type="primary">Large 突出</ElTag>
        </div>
      </div>

      <div class="showcase-block">
        <div class="block-title">1.3 Dark 与 Plain 质感变体</div>
        <div class="tag-row">
          <ElTag effect="dark" type="primary">Dark Primary</ElTag>
          <ElTag effect="dark" type="success">Dark Success</ElTag>
          <ElTag effect="dark" type="warning">Dark Warning</ElTag>
          <ElTag effect="dark" type="danger">Dark Danger</ElTag>
          <ElTag effect="plain" type="primary">Plain 微描边</ElTag>
          <ElTag effect="plain" type="success">Plain 翠绿</ElTag>
          <ElTag effect="plain" type="danger">Plain 绯红</ElTag>
        </div>
      </div>
    </AtengCard>

    <!-- 2. 精密数控滑动开关体系 -->
    <AtengCard title="🎛️ 精密数控滑动开关 (ElSwitch: 冷钛底、立体内凹滑块、柔光微晕)" class="mb-4">
      <div class="switch-grid">
        <div class="switch-card">
          <div class="switch-info">
            <span class="switch-name">系统全局审计跟踪</span>
            <span class="switch-desc">记录每秒千万级分布式 RPC 调用链日志</span>
          </div>
          <ElSwitch v-model="switchValues.systemAudit" />
        </div>

        <div class="switch-card">
          <div class="switch-info">
            <span class="switch-name">生产实时 Debug 探针</span>
            <span class="switch-desc">开启 V8 堆内存纳秒级采样 (冷钛关闭态)</span>
          </div>
          <ElSwitch v-model="switchValues.debugMode" />
        </div>

        <div class="switch-card">
          <div class="switch-info">
            <span class="switch-name">Kubernetes 弹性伸缩联动</span>
            <span class="switch-desc">自动根据实时 QPS 动态扩展 Pod 节点</span>
          </div>
          <ElSwitch v-model="switchValues.autoScaling" />
        </div>

        <div class="switch-card">
          <div class="switch-info">
            <span class="switch-name">只读维护隔离锁 (已禁用)</span>
            <span class="switch-desc">禁用状态下的平滑降级与半透明质感</span>
          </div>
          <ElSwitch v-model="switchValues.maintenance" disabled />
        </div>
      </div>
    </AtengCard>

    <!-- 3. 沉浸式景深毛玻璃弹窗与药丸浮岛 -->
    <AtengCard
      title="🪟 浮层与反馈系统 (blur(8px) 景深遮罩 + 16px 弹窗 + 9999px 药丸 Message)"
      class="mb-4"
    >
      <div class="btn-row mb-4">
        <ElButton type="primary" @click="dialogVisible = true">
          打开现代毛玻璃弹窗 (ElDialog)
        </ElButton>
        <ElButton @click="triggerMessage('success')">触发 Success 药丸 Toast</ElButton>
        <ElButton @click="triggerMessage('warning')">触发 Warning 药丸 Toast</ElButton>
        <ElButton @click="triggerMessage('error')">触发 Error 药丸 Toast</ElButton>
        <ElButton @click="triggerMessage('info')">触发 Info 药丸 Toast</ElButton>
        <ElButton @click="triggerNotification">弹出右侧通知 (ElNotification)</ElButton>
      </div>

      <!-- 弹窗组件 -->
      <ElDialog v-model="dialogVisible" title="🛡️ 生产集群发布灰度策略确认" width="540px">
        <div class="dialog-content">
          <p class="mb-2">
            你正在向 <strong>Production (US-East)</strong> 提交多主题引擎全量镜像更新：
          </p>
          <ul class="dialog-list">
            <li>包含 5 款科技预设色阶及 Slate 深空冷灰暗黑基底；</li>
            <li>全面启用 <code>tabular-nums</code> 数值防抖与双层激光光晕输入控件；</li>
            <li>底座已通过 32 个测试套件、273 项全绿自动化测试；</li>
            <li>系统遮罩当前呈现 <code>backdrop-filter: blur(8px)</code> 沉浸式景深。</li>
          </ul>
        </div>
        <template #footer>
          <span class="dialog-footer">
            <ElButton @click="dialogVisible = false">取消放弃</ElButton>
            <ElButton type="primary" class="is-contrast" @click="dialogVisible = false">
              确认并同步推送
            </ElButton>
          </span>
        </template>
      </ElDialog>
    </AtengCard>

    <!-- 4. 零 !important 逃生门实测 -->
    <AtengCard title="🛡️ 零 !important 逃生门实测">
      <p class="mb-3 text-sm text-muted">
        通过局部 class 覆盖标签与开关的背景，验证无 <code>!important</code> 绑架。
      </p>
      <div class="custom-override-row">
        <ElTag class="my-purple-tag">自定义紫水晶标签</ElTag>
        <ElSwitch :model-value="true" class="my-emerald-switch" />
      </div>
    </AtengCard>
  </div>
</template>

<style scoped>
.theme-tags-overlays-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.preset-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.label {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-regular);
}

.preset-tip {
  margin-top: 10px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.showcase-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.block-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-regular);
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.switch-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.switch-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background-color: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color);
  border-radius: var(--el-border-radius-base);
}

.switch-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.switch-name {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.switch-desc {
  font-size: 11.5px;
  color: var(--el-text-color-secondary);
}

.btn-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.dialog-content {
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.dialog-list {
  padding-left: 20px;
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dialog-list code {
  font-family: var(--at-font-mono, monospace);
  background-color: var(--el-fill-color);
  padding: 2px 6px;
  border-radius: 4px;
}

.text-muted {
  color: var(--el-text-color-secondary);
}

.text-sm {
  font-size: 13px;
}

.custom-override-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

/* 局部覆写验证 */
.my-purple-tag {
  background-color: #f3e8ff;
  border-color: #d8b4fe;
  color: #7e22ce;
}

.my-emerald-switch :deep(.el-switch__core) {
  background-color: #059669;
}
</style>
