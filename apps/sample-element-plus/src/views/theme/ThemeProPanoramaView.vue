<script setup lang="ts">
/**
 * @atengk/element-plus 现代多主题引擎 (Pro Theme Engine) - 旗舰级全景自验展厅。
 *
 * 聚合展示：
 * 1. 顶部动态物理微光 (Ambient Radial Glow) 随主题色呼吸自适应；
 * 2. 5 套经典极客科技风预设实时秒切 (Indigo / Emerald / Violet / Ocean / Rose)；
 * 3. 三轨现代按钮工艺 (Linear 纯白高反差、天鹅绒沉稳主题色、冷钛金次级与 scale(0.975) 阻尼动效)；
 * 4. 双层激光 Focus-Ring 柔光环与表单 .is-error 联动；
 * 5. 黑曜石暗晶体底 + 呼吸发光 LED 状态核标签；
 * 6. 数控滑动仪器质感开关；
 * 7. 流体无框工整表格与 tabular-nums 高频防抖实测；
 * 8. 结构化卡片顶部 Specular Hairline 微光发丝线；
 * 9. 沉浸景深 blur(8px) 遮罩弹窗与 9999px 药丸浮岛 Toast；
 * 10. 运行时 setThemeColor 任意企业租户品牌色演算与局部容器隔离；
 * 11. 零 !important 逃生门实测。
 *
 * @author Ateng
 * @since 2026-10-22
 */

import { ref, reactive, onMounted, onUnmounted } from 'vue';
import {
  ElButton,
  ElInput,
  ElSelect,
  ElOption,
  ElTag,
  ElSwitch,
  ElDialog,
  ElTable,
  ElTableColumn,
  ElRadioGroup,
  ElRadioButton,
  ElMessage,
  ElNotification,
} from 'element-plus';
import { AtengCard, setThemeColor } from '@atengk/element-plus';

// 1. 暗黑模式监听与主动感知
const isDark = ref(false);
let darkObserver: MutationObserver | null = null;

// 2. 预设主题控制
type PresetType = 'indigo' | 'emerald' | 'violet' | 'ocean' | 'rose';
const activePreset = ref<PresetType>('indigo');

const presetConfigs: Record<PresetType, { title: string; desc: string }> = {
  indigo: {
    title: 'Indigo 极客靛蓝 (Linear 质感)',
    desc: '深邃高智感冷调蓝紫，现代顶奢开发工具标配。',
  },
  emerald: {
    title: 'Emerald 极客翠绿 (Supabase / Vue)',
    desc: '清新极客翠玉绿，生命力与精密仪器感并存。',
  },
  violet: {
    title: 'Violet 赛博幻紫 (AI / Cloud)',
    desc: '未来主义霓虹幻紫，前沿 AI 交互与云原生场景。',
  },
  ocean: {
    title: 'Ocean 商务深海 (Docker / Tailwind)',
    desc: '沉稳严谨商务深海蓝，企业级核心系统的可靠支柱。',
  },
  rose: {
    title: 'Rose 极光绯红 (Vite / Deno)',
    desc: '热烈敏捷极光绯红，高能创新与年轻化前沿产品。',
  },
};

const switchPreset = (preset: PresetType) => {
  activePreset.value = preset;
  document.documentElement.setAttribute('data-theme', preset);
  // 清理可能存在的 inline style 覆盖，让预设变量生效
  document.documentElement.removeAttribute('style');
  ElMessage.success({
    message: `已切换至 ${preset.toUpperCase()} 科技主题`,
    grouping: true,
  });
};

// 3. 快速平滑滚动定位锚点
const scrollToSection = (id: string) => {
  const target = document.getElementById(id);
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

// 4. 按钮 Loading
const isBtnLoading = ref(false);
const triggerBtnLoading = () => {
  isBtnLoading.value = true;
  setTimeout(() => {
    isBtnLoading.value = false;
  }, 1200);
};

// 5. 表单状态与错误联动
const formModel = reactive({
  clusterName: 'us-east-production-01',
  region: 'us-east-1',
  apiKey: 'ateng_live_sk_948209384029',
});
const hasFormError = ref(false);

// 6. 表格与高频数字防抖实测
interface ServerItem {
  id: string;
  name: string;
  qps: number;
  latency: number;
  status: 'healthy' | 'warning' | 'critical';
}

const tableData = ref<ServerItem[]>([
  {
    id: '1850000000000000001',
    name: 'api-gateway-edge-01',
    qps: 24810,
    latency: 1.15,
    status: 'healthy',
  },
  {
    id: '1850000000000000002',
    name: 'auth-jwt-service-04',
    qps: 12450,
    latency: 2.38,
    status: 'healthy',
  },
  {
    id: '1850000000000000003',
    name: 'order-settle-consumer-02',
    qps: 89040,
    latency: 12.45,
    status: 'warning',
  },
]);

const isPulsing = ref(false);
let pulseTimer: ReturnType<typeof setInterval> | null = null;
const togglePulsing = (enabled: boolean) => {
  isPulsing.value = enabled;
  if (enabled) {
    pulseTimer = setInterval(() => {
      tableData.value = tableData.value.map(item => ({
        ...item,
        qps: Math.max(100, item.qps + Math.floor(Math.random() * 600) - 300),
        latency: Number(Math.max(0.1, item.latency + (Math.random() * 0.4 - 0.2)).toFixed(2)),
      }));
    }, 150);
  } else if (pulseTimer) {
    clearInterval(pulseTimer);
    pulseTimer = null;
  }
};

onMounted(() => {
  // 初始化探测暗黑模式与动态监听
  isDark.value = document.documentElement.classList.contains('dark');
  darkObserver = new MutationObserver(() => {
    isDark.value = document.documentElement.classList.contains('dark');
  });
  darkObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });

  // 默认激活 indigo 预设
  if (!document.documentElement.getAttribute('data-theme')) {
    document.documentElement.setAttribute('data-theme', 'indigo');
  }
});

onUnmounted(() => {
  if (pulseTimer) {
    clearInterval(pulseTimer);
    pulseTimer = null;
  }
  if (darkObserver) {
    darkObserver.disconnect();
    darkObserver = null;
  }
});

// 5. 开关状态
const switchAudit = ref(true);
const switchDebug = ref(false);

// 6. 弹窗控制
const dialogVisible = ref(false);

// 7. Toast 反馈
const triggerToast = (type: 'success' | 'warning' | 'error' | 'info') => {
  const map = {
    success: '集群发布成功，全节点健康状态已达 100%。',
    warning: '节点 CPU 使用率突破 85% 预警基线。',
    error: '网关熔断保护触发，已自动执行灰度降级。',
    info: '系统每日定时快照已归档至分布式对象存储。',
  };
  ElMessage[type]({
    message: map[type],
    grouping: true,
  });
};

const triggerNotify = () => {
  ElNotification({
    title: '分布式事务调度中心',
    message: '全链路事务协调器已完成全球 Region 原子对齐。',
    type: 'success',
  });
};

// 8. 运行时租户换肤
const customBrandHex = ref('#0d9488');
const applyCustomBrand = () => {
  const success = setThemeColor(customBrandHex.value);
  if (success) {
    ElMessage.success(`已全自动演算并注入租户品牌色: ${customBrandHex.value}`);
  } else {
    ElMessage.error(`非法颜色值: ${customBrandHex.value}`);
  }
};
</script>

<template>
  <div class="theme-pro-panorama-view">
    <!-- 顶部微弱环境微光 (Ambient Radial Glow) -->
    <div class="ambient-radial-glow" />

    <!-- 1. 英雄区 Banner -->
    <div class="hero-banner-card mb-3">
      <div class="hero-header-flex">
        <div class="hero-brand">
          <div class="hero-icon">P</div>
          <div class="hero-text-group">
            <div class="hero-title">
              @atengk/element-plus 工业级现代多主题引擎
              <span class="status-badge">{{ activePreset.toUpperCase() }} PRO</span>
            </div>
            <div class="hero-subtitle">
              {{ presetConfigs[activePreset].title }} — {{ presetConfigs[activePreset].desc }}
            </div>
          </div>
        </div>

        <!-- 5 款科技主题预设切换器 -->
        <div class="preset-switch-container">
          <ElRadioGroup
            :model-value="activePreset"
            size="small"
            @update:model-value="val => switchPreset(val as PresetType)"
          >
            <ElRadioButton value="indigo">🌌 Indigo 极客靛蓝</ElRadioButton>
            <ElRadioButton value="emerald">🌲 Emerald 极客翠绿</ElRadioButton>
            <ElRadioButton value="violet">🔮 Violet 赛博幻紫</ElRadioButton>
            <ElRadioButton value="ocean">🌊 Ocean 商务深海</ElRadioButton>
            <ElRadioButton value="rose">🌹 Rose 极光绯红</ElRadioButton>
          </ElRadioGroup>
        </div>
      </div>

      <!-- 快速锚点导航 -->
      <div class="hero-quick-nav">
        <span class="nav-label">快速直达：</span>
        <a class="nav-pill" @click="scrollToSection('section-buttons')">🏆 三轨按钮</a>
        <a class="nav-pill" @click="scrollToSection('section-forms')">⚡ 激光表单</a>
        <a class="nav-pill" @click="scrollToSection('section-tags')">🏷️ 晶体标签</a>
        <a class="nav-pill" @click="scrollToSection('section-switches')">🎛️ 数控开关</a>
        <a class="nav-pill" @click="scrollToSection('section-tables')">📊 流体表格</a>
        <a class="nav-pill" @click="scrollToSection('section-overlays')">🪟 浮层反馈</a>
        <a class="nav-pill" @click="scrollToSection('section-tenant')">💼 租户换肤</a>
      </div>
    </div>

    <!-- 2. 三轨现代按钮工艺与激光 Focus-Ring 表单 -->
    <div class="grid-two-col mb-3">
      <!-- 按钮工艺 -->
      <AtengCard id="section-buttons" title="🏆 三轨主按钮体系 (彻底消除拟物果冻反光线与文字阴影)">
        <div class="section-desc mb-3">
          支持 Linear 签名级高反差主按钮 (.is-contrast)、天鹅绒沉稳主色按钮与冷钛金次级按钮，标配
          scale(0.975) 阻尼微动效。
        </div>
        <div class="btn-cluster mb-3">
          <ElButton type="primary" class="is-contrast">
            Linear 高反差主按钮 ({{ isDark ? '纯白底黑字' : '纯黑底白字' }})
          </ElButton>
          <ElButton type="primary">天鹅绒沉稳主色</ElButton>
          <ElButton type="primary" class="at-btn-gradient">极客渐变光晕</ElButton>
          <ElButton>Secondary 冷钛金</ElButton>
          <ElButton dashed>Ghost 虚线幽灵</ElButton>
        </div>
        <div class="btn-cluster mb-3">
          <ElButton type="primary" :loading="isBtnLoading" @click="triggerBtnLoading">
            {{ isBtnLoading ? '提交中...' : '点击触发 Loading' }}
          </ElButton>
          <ElButton type="primary" class="at-btn-glow">脉冲微光发光 (.at-btn-glow)</ElButton>
        </div>
        <div class="btn-cluster">
          <ElButton type="success">Success 翠绿</ElButton>
          <ElButton type="warning">Warning 琥珀</ElButton>
          <ElButton type="danger">Danger 绯红</ElButton>
          <ElButton type="info">Info 冷灰</ElButton>
        </div>
      </AtengCard>

      <!-- 双层激光 Focus-Ring 表单 -->
      <AtengCard id="section-forms" title="⚡ 双层激光 Focus-Ring 表单控件">
        <template #extra>
          <ElButton
            size="small"
            :type="hasFormError ? 'danger' : 'default'"
            @click="hasFormError = !hasFormError"
          >
            {{ hasFormError ? '恢复正常' : '模拟 .is-error 错误' }}
          </ElButton>
        </template>
        <div class="section-desc mb-3">
          聚焦激活 4px 激光柔光扩散环，实时联动当前多主题预设；支持表单错误态 (.is-error)
          绯红光晕警报。
        </div>
        <div class="form-vertical-cluster">
          <div class="form-row">
            <span class="field-label">集群节点标识:</span>
            <ElInput v-model="formModel.clusterName" placeholder="请输入集群名称" />
          </div>
          <div class="form-row">
            <span class="field-label">部署目标 Region:</span>
            <ElSelect v-model="formModel.region" placeholder="请选择" style="width: 100%">
              <ElOption label="US-East (Virginia)" value="us-east-1" />
              <ElOption label="AP-East (Hong Kong)" value="ap-east-1" />
              <ElOption label="EU-Central (Frankfurt)" value="eu-central-1" />
            </ElSelect>
          </div>
          <div class="form-row">
            <span class="field-label">集群密钥 Token:</span>
            <ElInput
              v-model="formModel.apiKey"
              :class="{ 'is-error': hasFormError }"
              placeholder="请输入密钥"
            />
          </div>
        </div>
      </AtengCard>
    </div>

    <!-- 3. 现代多态晶体标签与数控滑动开关 -->
    <div class="grid-two-col mb-3">
      <AtengCard id="section-tags" title="🏷️ 现代多态晶体标签 (浅色柔和软质 + 暗黑黑曜石暗晶体)">
        <template #extra>
          <span class="text-xs text-muted">💡 可点击右上角暗黑模式查看黑曜石暗晶</span>
        </template>
        <div class="section-desc mb-3">
          彻底告别刺眼生硬的交通灯实线塑料感大药丸；浅色模式呈现高透轻柔软质底色，暗黑模式自动激活黑曜石暗晶体底并内置呼吸发光
          LED 状态核。
        </div>
        <div class="tag-cluster mb-3">
          <ElTag class="is-dot" type="primary">Primary 动态主色</ElTag>
          <ElTag class="is-dot" type="success">Active 正常运行</ElTag>
          <ElTag class="is-dot" type="warning">Degraded 负载预警</ElTag>
          <ElTag class="is-dot" type="danger">Critical 熔断报警</ElTag>
          <ElTag class="is-dot" type="info">Standby 离线冷备</ElTag>
        </div>
        <div class="tag-cluster">
          <ElTag type="primary" closable>动态换肤</ElTag>
          <ElTag type="success" closable>健康状态</ElTag>
          <ElTag type="danger" round>胶囊圆角</ElTag>
          <ElTag effect="dark" type="primary">Dark 沉稳</ElTag>
          <ElTag effect="plain" type="primary">Plain 微描边</ElTag>
        </div>
      </AtengCard>

      <AtengCard id="section-switches" title="🎛️ 精密数控滑动开关 (ElSwitch)">
        <div class="section-desc mb-3">
          关闭态冷钛底色，开启态天鹅绒主色伴随 12px 柔光扩散，滑块内置立体微内凹阴影与 0.25s
          阻尼弹性过渡。
        </div>
        <div class="switch-row-cluster">
          <div class="switch-inline-item">
            <span class="switch-title">系统分布式审计追踪</span>
            <ElSwitch v-model="switchAudit" />
          </div>
          <div class="switch-inline-item">
            <span class="switch-title">实时 V8 堆内存探针</span>
            <ElSwitch v-model="switchDebug" />
          </div>
          <div class="switch-inline-item">
            <span class="switch-title">只读维护隔离锁 (Disabled)</span>
            <ElSwitch :model-value="false" disabled />
          </div>
        </div>
      </AtengCard>
    </div>

    <!-- 4. 流体无框表格与 tabular-nums 防抖 -->
    <AtengCard
      id="section-tables"
      title="📊 流体无框工整表格 (规整冷灰独立表头分层 + tabular-nums 防抖)"
      class="mb-3"
    >
      <div class="table-control-bar mb-3">
        <div class="control-left">
          <span class="control-label">高频数值波动防抖实测：</span>
          <ElSwitch
            :model-value="isPulsing"
            active-text="高频跳动 (150ms)"
            inactive-text="静态"
            @change="val => togglePulsing(val as boolean)"
          />
        </div>
        <div class="control-right text-xs text-muted">
          所有数值密集列强制等宽排版，数据跳动时绝对零水平晃动。
        </div>
      </div>

      <ElTable :data="tableData" row-key="id" class="panorama-table">
        <ElTableColumn prop="id" label="分布式雪花 ID" width="220">
          <template #default="{ row }">
            <span class="font-mono text-xs">{{ row.id }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="name" label="集群微服务实例" min-width="190">
          <template #default="{ row }">
            <span class="font-semibold">{{ row.name }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="qps" label="实时 QPS" width="130" sortable align="right">
          <template #default="{ row }">
            <span class="metric-val">{{ row.qps.toLocaleString() }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="latency" label="P99 延迟 (ms)" width="140" sortable align="right">
          <template #default="{ row }">
            <span class="metric-val" :class="{ 'text-danger': row.latency > 10 }">
              {{ row.latency.toFixed(2) }}
            </span>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="status" label="健康指示" width="130" align="center">
          <template #default="{ row }">
            <ElTag v-if="row.status === 'healthy'" class="is-dot" type="success" size="small">
              健康
            </ElTag>
            <ElTag v-else-if="row.status === 'warning'" class="is-dot" type="warning" size="small">
              预警
            </ElTag>
            <ElTag v-else class="is-dot" type="danger" size="small">熔断</ElTag>
          </template>
        </ElTableColumn>
      </ElTable>
    </AtengCard>

    <!-- 5. 沉浸景深毛玻璃浮层与药丸浮岛 Toast -->
    <AtengCard
      id="section-overlays"
      title="🪟 浮层与反馈系统 (blur(8px) 景深遮罩 + 16px 弹窗 + 9999px 药丸 Message)"
      class="mb-3"
    >
      <div class="feedback-btn-cluster mb-4">
        <ElButton type="primary" @click="dialogVisible = true">
          打开现代毛玻璃弹窗 (ElDialog)
        </ElButton>
        <ElButton @click="triggerToast('success')">触发 Success 药丸 Toast</ElButton>
        <ElButton @click="triggerToast('warning')">触发 Warning 药丸 Toast</ElButton>
        <ElButton @click="triggerToast('error')">触发 Error 药丸 Toast</ElButton>
        <ElButton @click="triggerToast('info')">触发 Info 药丸 Toast</ElButton>
        <ElButton @click="triggerNotify">弹出右侧通知 (ElNotification)</ElButton>
      </div>

      <!-- 弹窗 -->
      <ElDialog v-model="dialogVisible" title="🛡️ 生产集群全景灰度发布确认" width="520px">
        <div class="dialog-body-text">
          <p class="mb-2">
            你正在预览
            <strong>@atengk/element-plus Pro Theme Engine</strong> 旗舰级多主题全景实装沙箱：
          </p>
          <ul class="dialog-points">
            <li>包含 5 款经典科技风预设，暗黑模式采用 Slate 深空冷灰基底；</li>
            <li>弹窗背景与遮罩层支持 <code>backdrop-filter: blur(8px)</code> 景深雾化；</li>
            <li>表单、按钮、表格、卡片、开关、标签全生命周期微交互增强；</li>
            <li>全局零 <code>!important</code>，业务代码享有 100% 自由覆盖逃生门。</li>
          </ul>
        </div>
        <template #footer>
          <span class="dialog-footer-actions">
            <ElButton @click="dialogVisible = false">取消放弃</ElButton>
            <ElButton type="primary" class="is-contrast" @click="dialogVisible = false">
              确认并同步发布
            </ElButton>
          </span>
        </template>
      </ElDialog>
    </AtengCard>

    <!-- 6. 运行时 setThemeColor 任意企业品牌色动态演算 -->
    <AtengCard id="section-tenant" title="💼 运行时任意企业品牌色动态演算 (setThemeColor)">
      <div class="section-desc mb-3">
        调用 <code>setThemeColor(hex)</code>，采用与 Element Plus 官方 Sass
        完全一致的线性插值算法，实时演算 1~9 级轻量色阶与 RGB 通道。
      </div>
      <div class="tenant-action-row">
        <span class="control-label">输入任意十六进制品牌色：</span>
        <ElInput
          v-model="customBrandHex"
          placeholder="如 #0d9488 或 #ea580c"
          style="width: 200px"
        />
        <ElButton type="primary" @click="applyCustomBrand">实时演算并应用至当前页面</ElButton>
      </div>
    </AtengCard>
  </div>
</template>

<style scoped>
.theme-pro-panorama-view {
  position: relative;
  display: flex;
  flex-direction: column;
}

/* 顶部微妙物理微光 (Ambient Radial Glow) */
.ambient-radial-glow {
  position: absolute;
  top: -160px;
  left: 50%;
  transform: translateX(-50%);
  width: 900px;
  height: 380px;
  background: radial-gradient(
    ellipse at center,
    var(--at-ambient-glow, rgba(79, 70, 229, 0.16)) 0%,
    rgba(0, 0, 0, 0) 70%
  );
  pointer-events: none;
  z-index: 0;
  transition: background 0.4s ease;
}

/* 英雄区 Banner */
.hero-banner-card {
  position: relative;
  z-index: 1;
  padding: 20px 24px;
  background-color: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-radius: var(--at-radius-card, 10px);
  box-shadow: var(--el-box-shadow);
}

.hero-header-flex {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.hero-brand {
  display: flex;
  align-items: center;
  gap: 14px;
}

.hero-icon {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  background-color: var(--el-color-primary);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 16px;
  box-shadow: 0 0 16px rgba(var(--el-color-primary-rgb), 0.45);
  transition:
    background-color 0.3s,
    box-shadow 0.3s;
}

.hero-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--el-text-color-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-badge {
  font-size: 11px;
  font-family: var(--at-font-mono, monospace);
  padding: 2px 8px;
  border-radius: 4px;
  background-color: rgba(var(--el-color-primary-rgb), 0.1);
  border: 1px solid rgba(var(--el-color-primary-rgb), 0.3);
  color: var(--el-color-primary);
  font-weight: 600;
}

.hero-subtitle {
  font-size: 12.5px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}

/* 快速锚点导航条 */
.hero-quick-nav {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px dashed var(--el-border-color-lighter);
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.nav-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
}

.nav-pill {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 9999px;
  background-color: var(--el-fill-color);
  color: var(--el-text-color-regular);
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  border: 1px solid var(--el-border-color-light);

  &:hover {
    color: var(--el-color-primary);
    background-color: rgba(var(--el-color-primary-rgb), 0.08);
    border-color: rgba(var(--el-color-primary-rgb), 0.3);
    transform: translateY(-1px);
  }
}

/* 双列栅格 */
.grid-two-col {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
  gap: 14px;
}

.section-desc {
  font-size: 12.5px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

.btn-cluster,
.tag-cluster,
.feedback-btn-cluster {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.form-vertical-cluster {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.field-label {
  width: 110px;
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-regular);
}

.switch-row-cluster {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.switch-inline-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background-color: var(--el-fill-color-light);
  border-radius: var(--el-border-radius-base);
  border: 1px solid var(--el-border-color-light);
}

.switch-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.table-control-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.control-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-regular);
}

.font-mono {
  font-family: var(--at-font-mono, monospace);
}

.font-semibold {
  font-weight: 600;
}

.text-xs {
  font-size: 11.5px;
}

.text-muted {
  color: var(--el-text-color-secondary);
}

.text-danger {
  color: var(--el-color-danger);
  font-weight: 600;
}

.metric-val {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.dialog-body-text {
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.dialog-points {
  padding-left: 20px;
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dialog-points code {
  font-family: var(--at-font-mono, monospace);
  background-color: var(--el-fill-color);
  padding: 2px 6px;
  border-radius: 4px;
}

.tenant-action-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
</style>
