<script setup lang="ts">
/**
 * @atengk/element-plus 现代多主题引擎 (Pro Theme Engine) - 旗舰级全景自验展厅。
 *
 * 聚合展示：
 * 1. 顶部动态物理微光 (Ambient Radial Glow) 随主题色呼吸自适应；
 * 2. 5 套经典极客科技风预设实时秒切 (Indigo / Emerald / Violet / Ocean / Rose)；
 * 3. 5-Tab 容器切片系统覆盖 18+ 核心组件域：
 *    - Tab 1: 【基础与交互】（三轨主按钮、双层激光表单、黑曜石晶体标签、数控滑动开关）；
 *    - Tab 2: 【高级表单与拾取】（日期时间全家桶、级联选择、组织树与树选择、穿梭框、滑块与评分、颜色拾取）；
 *    - Tab 3: 【状态反馈与步骤】（警告卡片四态、动态发光进度条、步骤条动态推演、时间线、徽标气泡、结果页）；
 *    - Tab 4: 【数据展示与排版】（分段控制器、折叠面板、分割线、描述列表、网格日历、走马灯、分栏器）；
 *    - Tab 5: 【表格与弹层】（流体无框表格高频 tabular-nums 防抖、毛玻璃弹窗、浮岛 Toast、租户品牌色演算）；
 * 4. 全局恪守零 !important 铁律与 Slate 深空暗黑基底自适应。
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
  ElTable,
  ElTableColumn,
  ElRadioGroup,
  ElRadioButton,
  ElMessage,
  ElNotification,
  ElTabs,
  ElTabPane,
  ElDatePicker,
  ElTimePicker,
  ElCascader,
  ElTree,
  ElTreeSelect,
  ElTransfer,
  ElSlider,
  ElRate,
  ElColorPicker,
  ElAlert,
  ElProgress,
  ElSteps,
  ElStep,
  ElTimeline,
  ElTimelineItem,
  ElBadge,
  ElResult,
  ElSegmented,
  ElCollapse,
  ElCollapseItem,
  ElDivider,
  ElDescriptions,
  ElDescriptionsItem,
  ElCalendar,
  ElCarousel,
  ElCarouselItem,
  ElSplitter,
  ElSplitterPanel,
  ElScrollbar,
  ElLink,
  ElText,
  ElSpace,
  ElUpload,
} from 'element-plus';
import { AtengCard, AtengDialog, setThemeColor } from '@atengk/element-plus';

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
  document.documentElement.removeAttribute('style');
  ElMessage.success({
    message: `已切换至 ${preset.toUpperCase()} 科技主题`,
    grouping: true,
  });
};

// 3. Tab 分类切片控制
const activeTab = ref('base');

// 4. Tab 1: 基础按钮与表单状态
const isBtnLoading = ref(false);
const triggerBtnLoading = () => {
  isBtnLoading.value = true;
  setTimeout(() => {
    isBtnLoading.value = false;
  }, 1200);
};

const formModel = reactive({
  clusterName: 'us-east-production-01',
  region: 'us-east-1',
  apiKey: 'ateng_live_sk_948209384029',
});
const hasFormError = ref(false);
const switchAudit = ref(true);
const switchDebug = ref(false);

// 5. Tab 2: 高级拾取器状态
const dateSingle = ref('2026-10-22');
const dateRange = ref<[string, string]>(['2026-10-01', '2026-10-22']);
const timePoint = ref('14:30:00');
const dateShortcuts = [
  {
    text: '今天',
    value: new Date(),
  },
  {
    text: '昨天',
    value: () => {
      const date = new Date();
      date.setTime(date.getTime() - 3600 * 1000 * 24);
      return date;
    },
  },
  {
    text: '一周前',
    value: () => {
      const date = new Date();
      date.setTime(date.getTime() - 3600 * 1000 * 24 * 7);
      return date;
    },
  },
];

const cascaderValue = ref(['apac', 'hk', 'cluster-01']);
const cascaderOptions = [
  {
    value: 'apac',
    label: '亚太 Region (APAC)',
    children: [
      {
        value: 'hk',
        label: '中国香港可用区',
        children: [
          { value: 'cluster-01', label: 'k8s-prod-edge-01' },
          { value: 'cluster-02', label: 'k8s-prod-edge-02' },
        ],
      },
      {
        value: 'sg',
        label: '新加坡可用区',
        children: [{ value: 'cluster-03', label: 'k8s-sg-master-01' }],
      },
    ],
  },
  {
    value: 'na',
    label: '北美 Region (NA)',
    children: [
      {
        value: 'us-east',
        label: '美东可用区 (Virginia)',
        children: [{ value: 'cluster-04', label: 'k8s-us-vault-01' }],
      },
    ],
  },
];

const treeData = [
  {
    id: 'root-1',
    label: '分布式微服务拓扑网格',
    children: [
      {
        id: 'svc-auth',
        label: 'auth-jwt-service (鉴权认证集群)',
        children: [
          { id: 'pod-auth-1', label: 'pod-auth-01 (Healthy)' },
          { id: 'pod-auth-2', label: 'pod-auth-02 (Healthy)' },
        ],
      },
      {
        id: 'svc-order',
        label: 'order-settle-service (订单结算网格)',
        children: [
          { id: 'pod-order-1', label: 'pod-order-01 (High Load)' },
          { id: 'pod-order-2', label: 'pod-order-02 (Healthy)' },
        ],
      },
      {
        id: 'svc-gateway',
        label: 'api-gateway-edge (边缘安全网关)',
      },
    ],
  },
];
const treeSelectValue = ref('svc-auth');

// 穿梭框数据
interface TransferItem {
  key: number;
  label: string;
  disabled: boolean;
}
const generateTransferData = (): TransferItem[] => {
  const data: TransferItem[] = [];
  const items = [
    'redis-sentinel-01',
    'mysql-primary-cluster',
    'kafka-broker-node-03',
    'clickhouse-olap-02',
    'elasticsearch-search-01',
    'rabbitmq-delay-queue',
    'minio-s3-storage-01',
    'nacos-config-registry',
  ];
  items.forEach((item, index) => {
    data.push({
      key: index + 1,
      label: item,
      disabled: index === 3,
    });
  });
  return data;
};
const transferData = ref(generateTransferData());
const transferTarget = ref([1, 3]);

// 滑块与评分
const sliderVal = ref(54);
const sliderRangeVal = ref([20, 80]);
const rateVal = ref(4.5);
const colorPickerHex = ref('#4f46e5');

// 文件上传全家桶状态
const uploadFileList = ref([
  {
    name: 'cluster-audit-report-2026.pdf',
    percentage: 100,
    status: 'success',
  },
  {
    name: 'distributed-trace-metrics.parquet',
    percentage: 68,
    status: 'uploading',
  },
]);

const pictureCardList = ref([
  {
    name: 'preview-thumb-1.png',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
  },
]);

// 6. Tab 3: 反馈与步骤状态
const progressPercent = ref(76);
const activeStep = ref(1);
const nextStep = () => {
  if (activeStep.value++ > 2) activeStep.value = 0;
};
const prevStep = () => {
  if (activeStep.value-- <= 0) activeStep.value = 3;
};

// 7. Tab 4: 展示与排版状态
const segmentedOption = ref('实时监控流');
const collapseActiveNames = ref(['1']);
const calendarValue = ref(new Date('2026-10-22'));

// 8. Tab 5: 表格与弹层
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

const dialogVisible = ref(false);
const handlePublishConfirm = async () => {
  await new Promise(resolve => setTimeout(resolve, 1500));
  ElMessage.success('生产集群灰度发布成功，事务已全局对齐！');
};

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

// 租户品牌色
const customBrandHex = ref('#0d9488');
const applyCustomBrand = () => {
  const success = setThemeColor(customBrandHex.value);
  if (success) {
    ElMessage.success(`已全自动演算并注入租户品牌色: ${customBrandHex.value}`);
  } else {
    ElMessage.error(`非法颜色值: ${customBrandHex.value}`);
  }
};

onMounted(() => {
  isDark.value = document.documentElement.classList.contains('dark');
  darkObserver = new MutationObserver(() => {
    isDark.value = document.documentElement.classList.contains('dark');
  });
  darkObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });

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
    </div>

    <!-- 2. 全景多 Tab 容器切片系统 -->
    <ElTabs v-model="activeTab" class="panorama-tabs mb-3">
      <!-- ==================================================== -->
      <!-- Tab 1: 【基础与交互】 -->
      <!-- ==================================================== -->
      <ElTabPane label="🏆 基础与交互" name="base">
        <div class="grid-two-col mb-3">
          <!-- 按钮工艺 -->
          <AtengCard title="🏆 三轨主按钮体系 (彻底消除拟物果冻反光线与文字阴影)">
            <div class="section-desc mb-3">
              支持 Linear 签名级高反差主按钮
              (.is-contrast)、天鹅绒沉稳主色按钮与冷钛金次级按钮，标配 scale(0.975) 阻尼微动效。
            </div>
            <div class="btn-cluster mb-3">
              <ElButton type="primary" class="is-contrast">
                Linear 高反差 ({{ isDark ? '纯白底黑字' : '纯黑底白字' }})
              </ElButton>
              <ElButton type="primary">天鹅绒沉稳主色</ElButton>
              <ElButton type="primary" class="at-btn-gradient">极客渐变光晕</ElButton>
              <ElButton>Secondary 冷钛金</ElButton>
              <ElButton dashed>Ghost 虚线</ElButton>
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
          <AtengCard title="⚡ 双层激光 Focus-Ring 表单控件">
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

        <div class="grid-two-col mb-3">
          <!-- 晶体标签 -->
          <AtengCard title="🏷️ 现代多态晶体标签 (浅色柔和软质 + 暗黑黑曜石暗晶体)">
            <div class="section-desc mb-3">
              浅色模式呈现高透轻柔软质底色，暗黑模式自动激活黑曜石暗晶体底并内置呼吸发光 LED
              状态核。
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

          <!-- 数控滑动开关 -->
          <AtengCard title="🎛️ 精密数控滑动开关 (ElSwitch)">
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
      </ElTabPane>

      <!-- ==================================================== -->
      <!-- Tab 2: 【高级表单与拾取】 -->
      <!-- ==================================================== -->
      <ElTabPane label="📅 高级表单与拾取" name="pickers">
        <div class="grid-two-col mb-3">
          <!-- 日期时间选择器全家桶 -->
          <AtengCard title="📅 日期时间拾取器全家桶 (DatePicker / TimePicker)">
            <div class="section-desc mb-3">
              集成毛玻璃景深下拉面板、激光
              Focus-Ring、快捷侧栏、日期单元格微圆角与范围选取连贯平滑波段。
            </div>
            <div class="form-vertical-cluster">
              <div class="form-row">
                <span class="field-label">单日期拾取:</span>
                <ElDatePicker
                  v-model="dateSingle"
                  type="date"
                  placeholder="选择单个日期"
                  style="width: 100%"
                />
              </div>
              <div class="form-row">
                <span class="field-label">日期快捷区间:</span>
                <ElDatePicker
                  v-model="dateRange"
                  type="daterange"
                  range-separator="至"
                  start-placeholder="开始日期"
                  end-placeholder="结束日期"
                  :shortcuts="dateShortcuts"
                  style="width: 100%"
                />
              </div>
              <div class="form-row">
                <span class="field-label">时间刻度选择:</span>
                <ElTimePicker v-model="timePoint" placeholder="选择精确时刻" style="width: 100%" />
              </div>
            </div>
          </AtengCard>

          <!-- 级联选择器与颜色拾取 -->
          <AtengCard title="🌐 级联选择 (Cascader) & 颜色拾取 (ColorPicker)">
            <div class="section-desc mb-3">
              多层级弹窗毛玻璃微透，节点悬浮与激活态主色高反差；颜色选择器支持透明度与高光双层环。
            </div>
            <div class="form-vertical-cluster">
              <div class="form-row">
                <span class="field-label">多级 Region 拓扑:</span>
                <ElCascader
                  v-model="cascaderValue"
                  :options="cascaderOptions"
                  style="width: 100%"
                  placeholder="选择多级拓扑"
                />
              </div>
              <div class="form-row">
                <span class="field-label">租户调色板拾取:</span>
                <div class="flex items-center gap-3">
                  <ElColorPicker v-model="colorPickerHex" show-alpha />
                  <span class="font-mono text-xs">{{ colorPickerHex }}</span>
                </div>
              </div>
            </div>
          </AtengCard>
        </div>

        <div class="grid-two-col mb-3">
          <!-- 树形结构与树选择 -->
          <AtengCard title="🌲 树形网格 (ElTree & TreeSelect)">
            <div class="section-desc mb-3">
              树节点微圆角亚像素悬浮、激活态 is-current 主色边线与高光底色；展开图标 0.2s
              阻尼平滑旋转。
            </div>
            <div class="form-vertical-cluster">
              <div class="form-row">
                <span class="field-label">下拉树选择:</span>
                <ElTreeSelect
                  v-model="treeSelectValue"
                  :data="treeData"
                  check-strictly
                  style="width: 100%"
                />
              </div>
              <div class="p-2 border rounded" style="border-color: var(--el-border-color-light)">
                <ElTree :data="treeData" node-key="id" default-expand-all highlight-current />
              </div>
            </div>
          </AtengCard>

          <!-- 滑块与评分微动 -->
          <AtengCard title="🎚️ 滑块 (Slider) & 评分微动 (Rate)">
            <div class="section-desc mb-3">
              滑块手柄双层外环悬浮微放大与阻尼抓取、主色渐变发光进度条；评分星星悬浮呼吸缩放。
            </div>
            <div class="form-vertical-cluster">
              <div class="form-row">
                <span class="field-label">单值滑块 ({{ sliderVal }}%):</span>
                <div class="flex-1">
                  <ElSlider v-model="sliderVal" />
                </div>
              </div>
              <div class="form-row">
                <span class="field-label">区间双向范围:</span>
                <div class="flex-1">
                  <ElSlider v-model="sliderRangeVal" range />
                </div>
              </div>
              <div class="form-row">
                <span class="field-label">服务质量评分:</span>
                <ElRate v-model="rateVal" allow-half show-text />
              </div>
            </div>
          </AtengCard>
        </div>

        <!-- 穿梭框 -->
        <AtengCard title="⇄ 穿梭框组件 (Transfer 双栏卡片化与穿梭微动)" class="mb-3">
          <div class="section-desc mb-3">
            穿梭框左右面板圆角卡片化，Header 冷灰分层，列表项悬浮与勾选无缝适配 5 套预设主题。
          </div>
          <div class="flex justify-center">
            <ElTransfer
              v-model="transferTarget"
              :data="transferData"
              :titles="['可用基础设施实例', '已挂载生产网格']"
              filterable
            />
          </div>
        </AtengCard>

        <!-- 文件上传全家桶 -->
        <AtengCard title="📤 文件上传全家桶 (Upload / Tactile Dragger & Picture Card)" class="mb-3">
          <div class="section-desc mb-3">
            触感拖拽上传框（亚像素虚线描边 + 悬浮微浮动 -2px +
            激光光晕联动）、照片墙卡片立体微阴影与 3px 极简主色微光进度条。
          </div>
          <div class="grid-two-col gap-4">
            <!-- 触感拖拽上传与普通列表 -->
            <div class="form-vertical-cluster">
              <span class="text-xs text-muted mb-2 block"
                >触感拖拽上传 (Tactile Dragger & 极简 3px 进度条)：</span
              >
              <ElUpload drag action="#" :auto-upload="false" :file-list="uploadFileList">
                <div class="py-2 text-center">
                  <div class="el-icon--upload text-3xl mb-1">☁️</div>
                  <div class="el-upload__text text-xs">将文件拖至此处，或 <em>点击上传</em></div>
                </div>
              </ElUpload>
            </div>

            <!-- 照片墙与缩略图卡片 -->
            <div class="form-vertical-cluster">
              <span class="text-xs text-muted mb-2 block"
                >照片墙与微缩胶囊操作卡片 (Picture Card)：</span
              >
              <ElUpload
                action="#"
                list-type="picture-card"
                :auto-upload="false"
                :file-list="pictureCardList"
              >
                <div class="text-center">
                  <span class="text-xl leading-none">＋</span>
                  <div class="text-xs text-muted mt-1">添加图片</div>
                </div>
              </ElUpload>
            </div>
          </div>
        </AtengCard>
      </ElTabPane>

      <!-- ==================================================== -->
      <!-- Tab 3: 【状态反馈与步骤】 -->
      <!-- ==================================================== -->
      <ElTabPane label="⚡ 状态反馈与步骤" name="feedbacks">
        <div class="grid-two-col mb-3">
          <!-- 警告提示 -->
          <AtengCard title="⚠️ 警告提示卡片 (Alert Specular 微光色条)">
            <div class="section-desc mb-3">
              轻量微透高阶背景，左侧 3px Specular 垂直高光线，图文微距紧凑对齐，支持深浅双模与关闭。
            </div>
            <div class="flex flex-col gap-3">
              <ElAlert
                title="系统提示: 核心多主题引擎已成功装载"
                type="primary"
                description="已接入 5 款科技预设，支持在当前视窗实时切换感受色彩演进。"
                show-icon
                closable
              />
              <ElAlert title="健康运行: 32 个微服务容器均处于就绪态" type="success" show-icon />
              <ElAlert
                title="负载警告: 集群网络吞吐正在接近 85% 预设水位线"
                type="warning"
                description="建议适度扩容只读副本以应对晚高峰业务浪涌。"
                show-icon
              />
              <ElAlert
                title="熔断告警: 3 号数据库主从同步心跳发生毫秒级漂移"
                type="error"
                show-icon
              />
            </div>
          </AtengCard>

          <!-- 发光进度条与徽标 -->
          <AtengCard title="📊 动态发光进度条 (Progress) & 胶囊徽标 (Badge)">
            <div class="section-desc mb-3">
              外槽平滑胶囊圆角，主色发光渐变条槽位，百分比等宽数字 tabular-nums 动效防抖。
            </div>
            <div class="form-vertical-cluster">
              <div>
                <div class="flex justify-between text-xs mb-1">
                  <span>分布式计算任务完成度</span>
                  <span class="font-mono font-semibold">{{ progressPercent }}%</span>
                </div>
                <ElProgress :percentage="progressPercent" :stroke-width="10" striped animated />
              </div>
              <div class="flex items-center gap-4">
                <ElProgress type="circle" :percentage="progressPercent" :width="90" />
                <ElProgress type="dashboard" :percentage="progressPercent" :width="90" />
                <div class="flex-1">
                  <span class="text-xs text-muted mb-1 block">实时拖拽联动调整：</span>
                  <ElSlider v-model="progressPercent" :min="0" :max="100" />
                </div>
              </div>
              <div
                class="pt-3 border-t flex items-center gap-6"
                style="border-color: var(--el-border-color-light)"
              >
                <ElBadge :value="12" class="item">
                  <ElButton size="small">未读审计日志</ElButton>
                </ElBadge>
                <ElBadge value="NEW" type="primary" class="item">
                  <ElButton size="small">灰度功能</ElButton>
                </ElBadge>
                <ElBadge is-dot type="danger" class="item">
                  <ElButton size="small">告警红点</ElButton>
                </ElBadge>
              </div>
            </div>
          </AtengCard>
        </div>

        <div class="grid-two-col mb-3">
          <!-- 步骤条动态推进 -->
          <AtengCard title="🚶 流程步骤条动态驱动 (Steps 脉冲光晕与轨道光效)">
            <template #extra>
              <div class="flex gap-2">
                <ElButton size="small" @click="prevStep">上一步</ElButton>
                <ElButton size="small" type="primary" @click="nextStep">下一步推进</ElButton>
              </div>
            </template>
            <div class="section-desc mb-3">
              进行态步骤环绕 4px 激光柔光脉冲，完成态主色实心填色，步骤连接轨道主色平滑伸展。
            </div>
            <div class="mb-4">
              <ElSteps :active="activeStep" finish-status="success">
                <ElStep title="拓扑校验" description="校验集群可用区与凭据" />
                <ElStep title="镜像拉取" description="从安全仓库拉取 v2.4.0 镜像" />
                <ElStep title="滚动更新" description="分批替换 Pod 实例并探活" />
                <ElStep title="流量切入" description="网关全量切入生产路由" />
              </ElSteps>
            </div>
            <ElSteps :active="activeStep" simple finish-status="success">
              <ElStep title="环境准备" />
              <ElStep title="容器部署" />
              <ElStep title="线上验证" />
            </ElSteps>
          </AtengCard>

          <!-- 时间线与结果展示 -->
          <AtengCard title="⏱️ 时间流 (Timeline) & 结果状态 (Result)">
            <div class="section-desc mb-3">
              节点外发光微阴影与高反差冷色过渡，时间戳等宽对齐；Result 沉浸式图文排版。
            </div>
            <div class="grid-two-col">
              <ElTimeline>
                <ElTimelineItem timestamp="2026-10-22 16:30" type="primary" size="large">
                  <span class="font-semibold">发布成功:</span> v2.4.0 全局就绪
                </ElTimelineItem>
                <ElTimelineItem timestamp="2026-10-22 16:15" type="success">
                  探针探活全部通过 (32/32)
                </ElTimelineItem>
                <ElTimelineItem timestamp="2026-10-22 16:00" type="warning">
                  开始灰度放量 (10% ➔ 50%)
                </ElTimelineItem>
              </ElTimeline>
              <div
                class="p-2 border rounded flex items-center justify-center"
                style="border-color: var(--el-border-color-light)"
              >
                <ElResult icon="success" title="全链路对齐" sub-title="微服务网格已同步">
                  <template #extra>
                    <ElButton size="small" type="primary">查看拓扑</ElButton>
                  </template>
                </ElResult>
              </div>
            </div>
          </AtengCard>
        </div>
      </ElTabPane>

      <!-- ==================================================== -->
      <!-- Tab 4: 【数据展示与排版】 -->
      <!-- ==================================================== -->
      <ElTabPane label="📑 数据展示与排版" name="displays">
        <div class="grid-two-col mb-3">
          <!-- 分段控制器与折叠面板 -->
          <AtengCard title="🎛️ 分段控制器 (Segmented) & 折叠面板 (Collapse)">
            <div class="section-desc mb-3">
              数控立体微滑块背景与亚像素轻拟物平滑滑动；折叠面板卡片化无缝衔接。
            </div>
            <div class="form-vertical-cluster">
              <div>
                <span class="text-xs text-muted mb-2 block">视图粒度模式切换：</span>
                <ElSegmented
                  v-model="segmentedOption"
                  :options="['每日快照', '实时监控流', '审计回溯', '异常归档']"
                />
              </div>
              <div class="pt-2">
                <ElCollapse v-model="collapseActiveNames">
                  <ElCollapseItem title="🛡️ 工业级网络弹性架构与熔断规范" name="1">
                    <div>
                      网络通信层原生内置基于 AbortSignal
                      的连接取消与毫秒级幂等重试，杜绝网络颠簸引起的并发脏写。
                    </div>
                  </ElCollapseItem>
                  <ElCollapseItem title="❄️ 64 位雪花大数防精度截断不变量" name="2">
                    <div>
                      在 Axios 转换管道中于反序列化前加引号，彻底保护后端 19 位 Snowflake ID 精度。
                    </div>
                  </ElCollapseItem>
                </ElCollapse>
              </div>
            </div>
          </AtengCard>

          <!-- 描述列表与分割线 -->
          <AtengCard title="📋 原生结构化描述列表 (Descriptions)">
            <div class="section-desc mb-3">
              独立冷灰表头分层、等宽数据排版，与 AtengDescriptions 共享设计基线。
            </div>
            <ElDescriptions title="当前边缘实例规格信息" :column="2" border>
              <ElDescriptionsItem label="集群节点主机名"
                >edge-worker-09.atengk.internal</ElDescriptionsItem
              >
              <ElDescriptionsItem label="操作系统基线"
                >Alpine Linux 3.20 (x86_64)</ElDescriptionsItem
              >
              <ElDescriptionsItem label="内存已分配">16.384 GB / 32.000 GB</ElDescriptionsItem>
              <ElDescriptionsItem label="V8 堆使用率">
                <span class="text-danger font-semibold">68.4% (Healthy)</span>
              </ElDescriptionsItem>
              <ElDescriptionsItem label="底层驱动协议"
                >HTTP/2 + gRPC + WebSocket</ElDescriptionsItem
              >
              <ElDescriptionsItem label="网络延迟 (P99)">
                <span class="metric-val">1.24 ms</span>
              </ElDescriptionsItem>
            </ElDescriptions>
            <ElDivider content-position="center">系统拓扑边界分界线</ElDivider>
          </AtengCard>
        </div>

        <div class="grid-two-col mb-3">
          <!-- 走马灯与日历 -->
          <AtengCard title="🎠 走马灯 (Carousel) & 分栏手柄 (Splitter)">
            <div class="section-desc mb-3">
              走马灯毛玻璃悬浮圆角按钮与胶囊指示器；Splitter 拖拽把手主色微光。
            </div>
            <ElCarousel height="140px" class="mb-3">
              <ElCarouselItem v-for="item in 3" :key="item">
                <div class="carousel-demo-slide">
                  <span class="text-base font-semibold">科技轮播视窗 #{{ item }}</span>
                  <span class="text-xs text-muted mt-1">展示现代极客多主题微光与流线视觉体验</span>
                </div>
              </ElCarouselItem>
            </ElCarousel>

            <div
              class="h-20 border rounded overflow-hidden"
              style="border-color: var(--el-border-color-light)"
            >
              <ElSplitter style="height: 100%">
                <ElSplitterPanel :size="40" class="p-2 text-xs flex items-center justify-center">
                  左侧面板 (40%)
                </ElSplitterPanel>
                <ElSplitterPanel :size="60" class="p-2 text-xs flex items-center justify-center">
                  右侧弹性面板 (60%)
                </ElSplitterPanel>
              </ElSplitter>
            </div>
          </AtengCard>

          <!-- 网格日历小组件 -->
          <AtengCard title="🗓️ 网格日历 (Calendar)">
            <div class="section-desc mb-3">
              单元格微圆角悬浮、选中态品牌色微光，等宽日期数字排版。
            </div>
            <div class="calendar-wrapper">
              <ElCalendar v-model="calendarValue" />
            </div>
          </AtengCard>

          <!-- 极窄冷钛滚动条与文本排版 -->
          <AtengCard title="🪟 极窄冷钛滚动条 (Scrollbar) & 文本与链接 (Link / Text / Space)">
            <div class="section-desc mb-3">
              6px 极窄冷钛轨距、9999px 全圆角、平滑半透与悬浮加深高亮；排版文本与高对比度文字链接。
            </div>
            <div class="form-vertical-cluster">
              <!-- 滚动条容器 -->
              <div
                class="scroll-demo-box p-2 border rounded"
                style="background: var(--el-fill-color-light); border-color: var(--el-border-color)"
              >
                <span class="text-xs text-muted mb-2 block"
                  >ElScrollbar 容器内纵向/横向滚动自适应：</span
                >
                <ElScrollbar height="100px">
                  <div style="width: 600px; padding: 4px">
                    <p
                      v-for="i in 6"
                      :key="i"
                      class="text-xs mb-1"
                      style="color: var(--el-text-color-regular)"
                    >
                      [Trace-Stream-{{ i }}] 集群日志滚动行数据探测模拟 - 极窄冷钛 6px
                      滚动条滑块阻尼顺滑滚动，支持横向视口平移。
                    </p>
                  </div>
                </ElScrollbar>
              </div>

              <!-- 链接体系 -->
              <div>
                <span class="text-xs text-muted mb-2 block">多类型排版链接 (ElLink)：</span>
                <ElSpace wrap>
                  <ElLink type="primary">主色链接</ElLink>
                  <ElLink type="success">成功链接</ElLink>
                  <ElLink type="warning">警告链接</ElLink>
                  <ElLink type="danger">危险链接</ElLink>
                  <ElLink type="info">信息链接</ElLink>
                  <ElLink :underline="false">无下划线</ElLink>
                  <ElLink disabled>禁用链接</ElLink>
                </ElSpace>
              </div>

              <!-- 语义文本 -->
              <div>
                <span class="text-xs text-muted mb-2 block">语义排版文本 (ElText)：</span>
                <ElSpace wrap>
                  <ElText type="primary">Primary 文本</ElText>
                  <ElText type="success">Success 文本</ElText>
                  <ElText type="warning">Warning 文本</ElText>
                  <ElText type="danger">Danger 文本</ElText>
                  <ElText type="info">Info 文本</ElText>
                  <ElText truncated style="max-width: 120px"
                    >这是一段会被自动省略的超长单行文本展示</ElText
                  >
                </ElSpace>
              </div>
            </div>
          </AtengCard>
        </div>
      </ElTabPane>

      <!-- ==================================================== -->
      <!-- Tab 5: 【表格与弹层】 -->
      <!-- ==================================================== -->
      <ElTabPane label="📊 表格与弹层" name="tables">
        <!-- 流体表格与 tabular-nums 防抖 -->
        <AtengCard
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
                <ElTag
                  v-else-if="row.status === 'warning'"
                  class="is-dot"
                  type="warning"
                  size="small"
                >
                  预警
                </ElTag>
                <ElTag v-else class="is-dot" type="danger" size="small">熔断</ElTag>
              </template>
            </ElTableColumn>
          </ElTable>
        </AtengCard>

        <!-- 沉浸景深毛玻璃浮层与药丸浮岛 Toast -->
        <AtengCard
          title="🪟 浮层与反馈系统 (blur(8px) 景深遮罩 + 16px 弹窗 + 9999px 药丸 Message)"
          class="mb-3"
        >
          <div class="feedback-btn-cluster mb-4">
            <ElButton type="primary" @click="dialogVisible = true">
              打开企业级毛玻璃弹窗 (AtengDialog)
            </ElButton>
            <ElButton @click="triggerToast('success')">触发 Success 药丸 Toast</ElButton>
            <ElButton @click="triggerToast('warning')">触发 Warning 药丸 Toast</ElButton>
            <ElButton @click="triggerToast('error')">触发 Error 药丸 Toast</ElButton>
            <ElButton @click="triggerToast('info')">触发 Info 药丸 Toast</ElButton>
            <ElButton @click="triggerNotify">弹出右侧通知 (ElNotification)</ElButton>
          </div>

          <!-- 企业级弹窗 AtengDialog -->
          <AtengDialog
            v-model="dialogVisible"
            title="🛡️ 生产集群全景灰度发布确认"
            width="560px"
            :before-confirm="handlePublishConfirm"
          >
            <div class="dialog-body-text">
              <p class="mb-2">
                你正在预览
                <strong>@atengk/element-plus Pro Theme Engine</strong> 旗舰级多主题全景实装沙箱：
              </p>
              <ul class="dialog-points">
                <li>包含 5 款经典科技风预设，暗黑模式采用 Slate 深空冷灰基底；</li>
                <li>
                  覆盖 18+
                  组件域，包含日期拾取、步骤条、警告卡片、树形、穿梭框、进度条、折叠面板等；
                </li>
                <li>弹窗背景与遮罩层支持 <code>backdrop-filter: blur(8px)</code> 景深雾化；</li>
                <li>表单、按钮、表格、卡片、开关、标签全生命周期微交互增强；</li>
                <li>原生支持双击标题栏全屏放大/还原、拖拽与 ESC 物理快捷键；</li>
                <li>全局零 <code>!important</code>，业务代码享有 100% 自由覆盖逃生门。</li>
              </ul>
            </div>
            <template #footer="{ confirm, cancel, loading }">
              <div class="dialog-footer-split">
                <span class="dialog-footer-hint">
                  💡 支持双击全屏 · 确认后触发 1.5s 异步发布防重锁
                </span>
                <div class="dialog-footer-btns">
                  <ElButton :disabled="loading" @click="cancel">取消放弃</ElButton>
                  <ElButton type="primary" :loading="loading" @click="confirm">
                    确认并同步发布
                  </ElButton>
                </div>
              </div>
            </template>
          </AtengDialog>
        </AtengCard>

        <!-- 运行时 setThemeColor 任意企业品牌色动态演算 -->
        <AtengCard title="💼 运行时任意企业品牌色动态演算 (setThemeColor)">
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
      </ElTabPane>
    </ElTabs>
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

/* 导航 Tabs 微调 */
:deep(.panorama-tabs .el-tabs__header) {
  margin-bottom: 16px;
}

:deep(.panorama-tabs .el-tabs__item) {
  font-weight: 600;
  font-size: 14px;
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

.dialog-footer-split {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  gap: 12px;
}

.dialog-footer-hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  display: flex;
  align-items: center;
  gap: 4px;
  user-select: none;
}

.dialog-footer-btns {
  display: flex;
  align-items: center;
  gap: 10px;
}

.carousel-demo-slide {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: var(--el-fill-color-light);
  border-radius: var(--at-radius-card, 10px);
}

.calendar-wrapper :deep(.el-calendar__body) {
  padding: 10px;
}

.calendar-wrapper :deep(.el-calendar-table .el-calendar-day) {
  height: 48px;
}
</style>
