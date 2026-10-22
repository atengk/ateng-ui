<script setup lang="ts">
/**
 * @atengk/element-plus 现代主题引擎 - 卡片、导航与选择分页自验展厅。
 *
 * 验证维度：
 * 1. 结构化卡片 (ElCard / AtengCard): 顶部 Specular Hairline 微发丝高光、10px 弹性圆角与环境微影；
 * 2. 选项卡体系 (ElTabs): 2.5px 平滑微圆角指示条、卡片式与边框卡片式无缝衔接；
 * 3. 菜单与下拉 (ElMenu / ElDropdown): 胶囊激活项、微亮指示标与毛玻璃浮岛；
 * 4. 选择控件 (ElCheckbox / ElRadio): 4px 微圆角与弹性阻尼动效；
 * 5. 分页器体系 (ElPagination): 6px 微圆角等宽页码与沉稳激活态；
 * 6. 5 款科技主题预设实时秒切与暗黑模式深度自适应；
 * 7. 零 !important 逃生门实测。
 *
 * @author Ateng
 * @since 2026-10-22
 */

import { ref } from 'vue';
import {
  ElCard,
  ElTabs,
  ElTabPane,
  ElMenu,
  ElMenuItem,
  ElDropdown,
  ElDropdownMenu,
  ElDropdownItem,
  ElCheckbox,
  ElCheckboxGroup,
  ElRadio,
  ElRadioGroup,
  ElRadioButton,
  ElPagination,
  ElButton,
  ElMessage,
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

// 2. 选项卡状态
const activeTab = ref('overview');
const activeCardTab = ref('tab1');

// 3. 菜单状态
const activeMenu = ref('dashboard');

// 4. 选择控件状态
const checkedFeatures = ref(['metrics', 'tracing']);
const selectedEnv = ref('prod');

// 5. 分页状态
const currentPage = ref(2);
const pageSize = ref(10);
</script>

<template>
  <div class="theme-cards-navigations-view">
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
        💡
        提示：在上方切换主题，观察卡片微发丝亮线、选项卡指示条、侧边胶囊菜单与页码按钮的自洽联动！
      </p>
    </AtengCard>

    <!-- 1. 卡片体系与顶部微发丝高光 -->
    <AtengCard
      title="🏛️ 现代结构化卡片 (顶部 Specular Hairline 微光线 + 10px 弹性圆角)"
      class="mb-4"
    >
      <div class="cards-grid">
        <ElCard shadow="hover" class="demo-card">
          <template #header>
            <div class="card-header-flex">
              <span>ElCard 悬浮浮动卡片</span>
              <ElButton link type="primary">查看详情</ElButton>
            </div>
          </template>
          <p class="text-sm text-muted">
            顶部注入 1px Specular Hairline 亚像素微亮线，模拟定向受光物理模型。
          </p>
        </ElCard>

        <AtengCard title="AtengCard 增强卡片" sub-title="企业级标题区" class="demo-card">
          <p class="text-sm text-muted">
            边框采用亚像素微透冷钛灰（暗黑下 rgba(255,255,255,0.07)），扎实质感。
          </p>
        </AtengCard>
      </div>
    </AtengCard>

    <!-- 2. 选项卡与菜单导航体系 -->
    <AtengCard title="🧭 选项卡与导航 (平滑微圆角指示条 + 侧边胶囊激活项)" class="mb-4">
      <!-- 2.1 原生下划线选项卡 -->
      <div class="showcase-section mb-4">
        <div class="section-title">2.1 现代平滑指示条选项卡 (2.5px 微圆角外发光)</div>
        <ElTabs v-model="activeTab">
          <ElTabPane label="全局监控指标" name="overview">
            <p class="tab-content-text">
              全系统 50+ 服务集群实时 QPS、P99 延迟与纳秒级分布式追踪看板。
            </p>
          </ElTabPane>
          <ElTabPane label="流量治理与路由" name="routing">
            <p class="tab-content-text">金丝雀灰度分流与基于 Header 的多版本智能路由编排。</p>
          </ElTabPane>
          <ElTabPane label="服务网格拓扑" name="mesh">
            <p class="tab-content-text">Istio Sidecar 自动注入与分布式安全 mTLS 双向认证状态。</p>
          </ElTabPane>
        </ElTabs>
      </div>

      <!-- 2.2 卡片型选项卡 -->
      <div class="showcase-section mb-4">
        <div class="section-title">2.2 卡片型选项卡 (type="card")</div>
        <ElTabs v-model="activeCardTab" type="card">
          <ElTabPane label="实时拓扑 (Node 01)" name="tab1"
            >集群实时负载处于绿色安全区间。</ElTabPane
          >
          <ElTabPane label="故障演练 (Chaos)" name="tab2"
            >混沌工程注入断网与丢包仿真探针。</ElTabPane
          >
          <ElTabPane label="容灾审计 (Snapshot)" name="tab3">跨云双活数据冷热同步状态。</ElTabPane>
        </ElTabs>
      </div>

      <!-- 2.3 菜单与下拉 -->
      <div class="showcase-section">
        <div class="section-title">2.3 侧边胶囊菜单项与下拉菜单</div>
        <div class="menu-dropdown-row">
          <div class="menu-preview-box">
            <ElMenu :default-active="activeMenu" class="demo-menu">
              <ElMenuItem index="dashboard">📊 实时智能大盘</ElMenuItem>
              <ElMenuItem index="clusters">☸️ Kubernetes 集群治理</ElMenuItem>
              <ElMenuItem index="settings">⚙️ 平台安全与策略</ElMenuItem>
            </ElMenu>
          </div>

          <div class="dropdown-preview-box">
            <ElDropdown>
              <ElButton type="primary"> 操作菜单 <span class="ml-1">▼</span> </ElButton>
              <template #dropdown>
                <ElDropdownMenu>
                  <ElDropdownItem>配置热重载</ElDropdownItem>
                  <ElDropdownItem>导出诊断日志</ElDropdownItem>
                  <ElDropdownItem divided>重启服务实例</ElDropdownItem>
                </ElDropdownMenu>
              </template>
            </ElDropdown>
          </div>
        </div>
      </div>
    </AtengCard>

    <!-- 3. 选择与分页控件体系 -->
    <AtengCard title="🎯 选择控件与分页 (Checkbox, Radio & Pagination)" class="mb-4">
      <div class="controls-row mb-4">
        <div class="control-col">
          <div class="col-title">复选框 (4px 弹性微圆角与阻尼动效)：</div>
          <ElCheckboxGroup v-model="checkedFeatures">
            <ElCheckbox value="metrics" label="性能指标" />
            <ElCheckbox value="tracing" label="链路追踪" />
            <ElCheckbox value="logs" label="审计日志" />
          </ElCheckboxGroup>
        </div>

        <div class="control-col">
          <div class="col-title">单选框 (平滑柔光内芯)：</div>
          <ElRadioGroup v-model="selectedEnv">
            <ElRadio value="dev" label="开发环境" />
            <ElRadio value="staging" label="灰度预发" />
            <ElRadio value="prod" label="生产集群" />
          </ElRadioGroup>
        </div>
      </div>

      <div class="pagination-showcase">
        <div class="col-title mb-2">等宽分页器 (6px 胶囊页码 + 激活态微发光柔晕)：</div>
        <ElPagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="128"
          layout="total, prev, pager, next, jumper"
        />
      </div>
    </AtengCard>

    <!-- 4. 零 !important 逃生门实测 -->
    <AtengCard title="🛡️ 零 !important 逃生门实测">
      <p class="mb-3 text-sm text-muted">
        通过局部 class 随意覆写卡片圆角或选项卡指示条颜色，验证无强制 <code>!important</code> 绑架。
      </p>
      <ElCard class="my-custom-card">
        <span>局部重载：圆角覆写为 24px 大胶囊，边框覆写为橙色微描边</span>
      </ElCard>
    </AtengCard>
  </div>
</template>

<style scoped>
.theme-cards-navigations-view {
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

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.card-header-flex {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.showcase-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section-title,
.col-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-regular);
}

.tab-content-text {
  padding: 12px 0;
  font-size: 13.5px;
  color: var(--el-text-color-secondary);
}

.menu-dropdown-row {
  display: flex;
  align-items: flex-start;
  gap: 24px;
  flex-wrap: wrap;
}

.menu-preview-box {
  width: 260px;
  border: 1px solid var(--el-border-color);
  border-radius: var(--at-radius-card, 10px);
  padding: 8px 0;
  background-color: var(--el-bg-color);
}

.dropdown-preview-box {
  padding-top: 8px;
}

.controls-row {
  display: flex;
  flex-wrap: wrap;
  gap: 32px;
}

.control-col {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ml-1 {
  margin-left: 4px;
}

.text-muted {
  color: var(--el-text-color-secondary);
}

.text-sm {
  font-size: 13px;
}

/* 局部逃生门样式验证 */
.my-custom-card {
  border-radius: 24px;
  border-color: #ea580c;
  background-color: rgba(234, 88, 12, 0.04);
}
</style>
