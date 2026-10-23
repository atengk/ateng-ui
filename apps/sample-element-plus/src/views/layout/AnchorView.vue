<script setup lang="ts">
/**
 * 企业级电梯楼层导航锚点容器 AtengAnchor 自验页面。
 *
 * @author Ateng
 * @since 2026-10-23
 */

import { ref } from 'vue';
import {
  ElAlert,
  ElSwitch,
  ElRadioGroup,
  ElRadioButton,
  ElInputNumber,
  ElTag,
  ElMessage,
} from 'element-plus';
import { AtengAnchor, AtengCard, type AtengAnchorItem } from '@atengk/element-plus';

const currentAnchor = ref('#basic-info');
const direction = ref<'vertical' | 'horizontal'>('vertical');
const showInkBar = ref(true);
const targetOffset = ref(16);

const anchorItems: AtengAnchorItem[] = [
  {
    href: '#basic-info',
    title: '1. 系统基础概况',
    children: [
      { href: '#env-spec', title: '1.1 运行环境规格' },
      { href: '#cluster-nodes', title: '1.2 集群节点拓扑' },
    ],
  },
  {
    href: '#core-architecture',
    title: '2. 核心架构与协议',
    children: [
      { href: '#gateway-routing', title: '2.1 网关路由中心' },
      { href: '#snowflake-rule', title: '2.2 雪花大数契约' },
    ],
  },
  {
    href: '#storage-cache',
    title: '3. 存储与高可用缓存',
  },
  {
    href: '#security-governance',
    title: '4. 安全合规与防篡改',
  },
];

const handleAnchorClick = (_e: MouseEvent, item: AtengAnchorItem) => {
  ElMessage.info(`导航至小节：${item.title}`);
};

const handleAnchorChange = (_href: string) => {
  // 响应激活锚点变更
};
</script>

<template>
  <div class="anchor-view">
    <ElAlert
      title="AtengAnchor 电梯楼层导航锚点容器"
      type="info"
      description="双模智能探测：智能向上探测祖先局部滚动容器（如 AtengPageContainer 局部内容区）与全局 window 滚动；吸顶安全避让：配置 targetOffset 预留安全吸顶避让间距，防止被固定页头遮挡；声明式树形小节：支持 items 多级小节与树形层级缩进；流畅跟随：基于 requestAnimationFrame 节流监听滚动，高亮指示游标墨水条实时联动。"
      show-icon
      :closable="false"
      style="margin-bottom: 20px"
    />

    <!-- 控制面板 -->
    <div class="ctrl-bar">
      <span>排列方向 (direction)：</span>
      <ElRadioGroup v-model="direction" size="small">
        <ElRadioButton value="vertical">纵向 (vertical)</ElRadioButton>
        <ElRadioButton value="horizontal">横向 (horizontal)</ElRadioButton>
      </ElRadioGroup>

      <span style="margin-left: 20px">指示墨水条 (showInkBar)：</span>
      <ElSwitch v-model="showInkBar" />

      <span style="margin-left: 20px">吸顶避让偏移 (targetOffset)：</span>
      <ElInputNumber v-model="targetOffset" :min="0" :max="100" size="small" />

      <div class="current-tag">
        <span class="status-lbl">当前激活小节：</span>
        <ElTag size="small" type="primary">{{ currentAnchor }}</ElTag>
      </div>
    </div>

    <!-- 横向模式展示区（若处于 horizontal 模式） -->
    <div v-if="direction === 'horizontal'" class="horizontal-anchor-wrapper">
      <AtengAnchor
        v-model:current-anchor="currentAnchor"
        :items="anchorItems"
        :direction="direction"
        :show-ink-bar="showInkBar"
        :target-offset="targetOffset"
        @click="handleAnchorClick"
        @change="handleAnchorChange"
      />
    </div>

    <!-- 主体双栏联动体验区 -->
    <div class="content-layout">
      <!-- 左侧长内容楼层（由 AtengCard 组织） -->
      <div class="sections-column">
        <!-- 楼层 1 -->
        <AtengCard
          id="basic-info"
          title="1. 系统基础概况"
          sub-title="集群总体指标与基础设施规格"
          style="margin-bottom: 24px"
        >
          <p class="section-desc">
            展示企业级微服务分布式集群的核心运行概览，包含全球接入点、多活可用区容灾状态与各层基础设施指标。
          </p>

          <!-- 1.1 -->
          <div id="env-spec" class="sub-section">
            <h4 class="sub-title">1.1 运行环境规格</h4>
            <div class="info-card-box">
              <div class="info-item">CPU 核心总数：128 Cores (AMD EPYC)</div>
              <div class="info-item">内存池容量：512 GB DDR5 ECC</div>
              <div class="info-item">Kubernetes 版本：v1.30.4</div>
              <div class="info-item">节点调度状态：Ready (8/8)</div>
            </div>
          </div>

          <!-- 1.2 -->
          <div id="cluster-nodes" class="sub-section">
            <h4 class="sub-title">1.2 集群节点拓扑</h4>
            <div class="info-card-box">
              <div class="info-item">华东可用区 A (Primary): 4 实例运行中</div>
              <div class="info-item">华北可用区 B (Secondary): 4 实例热备</div>
              <div class="info-item">专线互联延时：1.8ms</div>
            </div>
          </div>
        </AtengCard>

        <!-- 楼层 2 -->
        <AtengCard
          id="core-architecture"
          title="2. 核心架构与协议"
          sub-title="分布式通信管道与序列化契约"
          style="margin-bottom: 24px"
        >
          <p class="section-desc">遵循 L0~L3 单向无环洋葱拓扑，传输层与展示状态严格解耦。</p>

          <!-- 2.1 -->
          <div id="gateway-routing" class="sub-section">
            <h4 class="sub-title">2.1 微服务网关路由中心</h4>
            <p>
              网关统一负责多路由分发，支持服务名映射与单体直连双轨模型，自动提取并注入 X-Trace-Id
              链路追踪令牌。
            </p>
          </div>

          <!-- 2.2 -->
          <div id="snowflake-rule" class="sub-section">
            <h4 class="sub-title">2.2 雪花大数精度防失真契约</h4>
            <p>
              针对 64 位分布式主键，在 Axios 响应前置管道中采用微秒级正则预处理，将超过 16
              位大整型转换为安全字符串，彻底杜绝 JS 精度截断。
            </p>
          </div>
        </AtengCard>

        <!-- 楼层 3 -->
        <AtengCard
          id="storage-cache"
          title="3. 存储与高可用缓存"
          sub-title="PostgreSQL 主从复制与 Redis Sentinel"
          style="margin-bottom: 24px"
        >
          <p class="section-desc">
            持久层严格规避循环 N+1 查询，批量采用 saveBatch 与流式切片批处理。
          </p>
          <div class="info-card-box">
            <div class="info-item">PostgreSQL 读写分离 Lag：0ms</div>
            <div class="info-item">Redis 缓存命中率：99.4%</div>
            <div class="info-item">连接池活跃连接数：24 / 200</div>
          </div>
        </AtengCard>

        <!-- 楼层 4 -->
        <AtengCard
          id="security-governance"
          title="4. 安全合规与防篡改"
          sub-title="安全水印、权限指令与防泄密自愈"
          style="margin-bottom: 24px"
        >
          <p class="section-desc">
            全链路贯彻安全防线，杜绝明文凭据残留，水印层配备 MutationObserver 攻防自愈机制。
          </p>
          <div class="info-card-box">
            <div class="info-item">防篡改水印状态：已启动主动防御</div>
            <div class="info-item">RBAC 细粒度指令：v-permission / v-role 激活</div>
            <div class="info-item">安全审计日志：保留 180 天</div>
          </div>
        </AtengCard>
      </div>

      <!-- 右侧垂直吸顶大纲电梯导航 -->
      <aside v-if="direction === 'vertical'" class="anchor-sidebar">
        <div class="sticky-box">
          <div class="anchor-header">
            <span class="anchor-title">📑 页面大纲导航</span>
          </div>
          <AtengAnchor
            v-model:current-anchor="currentAnchor"
            :items="anchorItems"
            :direction="direction"
            :show-ink-bar="showInkBar"
            :target-offset="targetOffset"
            @click="handleAnchorClick"
            @change="handleAnchorChange"
          />
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.anchor-view {
  width: 100%;
}

.ctrl-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 20px;
  padding: 12px 16px;
  background-color: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: var(--el-border-radius-base);
  font-size: 14px;
}

.current-tag {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.status-lbl {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.horizontal-anchor-wrapper {
  margin-bottom: 20px;
  padding: 12px 16px;
  background-color: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: var(--el-border-radius-base);
}

.content-layout {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}

.sections-column {
  flex: 1 1 auto;
  min-width: 0;
}

.anchor-sidebar {
  width: 240px;
  flex-shrink: 0;
}

.sticky-box {
  position: sticky;
  top: 20px;
  padding: 16px;
  background-color: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: var(--el-border-radius-base);
}

.anchor-header {
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.anchor-title {
  font-weight: 600;
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.section-desc {
  font-size: 14px;
  color: var(--el-text-color-regular);
  line-height: 22px;
  margin-bottom: 16px;
}

.sub-section {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px dashed var(--el-border-color-lighter);
}

.sub-title {
  margin: 0 0 10px 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.info-card-box {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding: 12px;
  background-color: var(--el-fill-color-light);
  border-radius: var(--el-border-radius-base);
}

.info-item {
  font-size: 13px;
  color: var(--el-text-color-regular);
}
</style>
