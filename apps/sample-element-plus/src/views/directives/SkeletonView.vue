<script setup lang="ts">
/**
 * 细粒度微骨架指令 v-skeleton 自验展厅页面。
 *
 * @author Ateng
 * @since 2026-10-25
 */

import { ref } from 'vue';
import { ElCard, ElButton, ElSwitch, ElAlert, ElTag, ElAvatar } from 'element-plus';

const cardLoading = ref(true);
const userLoading = ref(true);
const animated = ref(true);
</script>

<template>
  <div class="skeleton-directive-view">
    <ElCard header="细粒度微骨架指令 v-skeleton">
      <ElAlert
        title="指令特性说明"
        type="info"
        description="基于原地 CSS 盒模型伪元素脉冲遮罩模型，将目标 DOM 内部文字与图标透明度降为 0，100% 保持原有物理宽高与排版尺寸，彻底消除数据加载前后的布局跳变（Zero-CLS），且不对 Vue 内部虚拟 DOM 树做任何解构破坏。"
        show-icon
        :closable="false"
        style="margin-bottom: 20px"
      />

      <!-- 演示 1: 卡片局部原地骨架化 -->
      <div class="demo-section">
        <div class="section-header">
          <h3>1. 卡片局部原地骨架化 (Zero-CLS)</h3>
          <div class="section-ctrl">
            <span class="ctrl-label">加载状态：</span>
            <ElSwitch v-model="cardLoading" active-text="Loading" inactive-text="Loaded" />
          </div>
        </div>
        <p class="desc">
          点击上方开关切换状态，观察卡片在加载与就绪之间切换时，盒模型高度与宽度始终保持严丝合缝，没有任何“挤压跳变”：
        </p>

        <div class="card-grid">
          <!-- 订单数据卡片 -->
          <div v-skeleton="cardLoading" class="sample-stat-card">
            <div class="card-top">
              <span class="label">本月结算总额</span>
              <ElTag size="small" type="success">实时同步</ElTag>
            </div>
            <div class="amount">¥ 128,950.00</div>
            <div class="footer-tip">
              <span>较上月环比增长 <strong>+18.4%</strong></span>
            </div>
          </div>

          <!-- 审批任务卡片 -->
          <div v-skeleton="cardLoading" class="sample-stat-card">
            <div class="card-top">
              <span class="label">待办审批流程</span>
              <ElTag size="small" type="warning">紧急待办</ElTag>
            </div>
            <div class="amount">14 笔待处理</div>
            <div class="footer-tip">
              <span>平均审批时效 <strong>1.8 小时</strong></span>
            </div>
          </div>
        </div>
      </div>

      <!-- 演示 2: 用户信息条与小组件细粒度骨架 -->
      <div class="demo-section">
        <div class="section-header">
          <h3>2. 用户信息条与细粒度控件骨架</h3>
          <div class="section-ctrl">
            <ElButton size="small" type="primary" @click="userLoading = !userLoading">
              {{ userLoading ? '完成数据加载' : '模拟数据重载' }}
            </ElButton>
          </div>
        </div>

        <div class="user-profile-box">
          <div v-skeleton="{ loading: userLoading, radius: '50%' }" class="avatar-wrap">
            <ElAvatar :size="48" src="https://avatars.githubusercontent.com/u/1089221?v=4" />
          </div>
          <div class="user-meta">
            <div v-skeleton="userLoading" class="user-name">
              <strong>Ateng (全栈架构师)</strong>
              <ElTag size="small" effect="plain" type="primary">核心贡献者</ElTag>
            </div>
            <div v-skeleton="userLoading" class="user-bio">
              致力于构建纯原生、强契约、零臃肿的现代前端基础设施与高阶套件。
            </div>
          </div>
        </div>
      </div>

      <!-- 演示 3: 配置对象：动画开关与自定义圆角 -->
      <div class="demo-section">
        <div class="section-header">
          <h3>3. 配置对象：动画开关 (animated) 与自定义圆角 (radius)</h3>
          <div class="section-ctrl">
            <span class="ctrl-label">脉冲波纹动画：</span>
            <ElSwitch v-model="animated" active-text="开" inactive-text="关" />
          </div>
        </div>

        <div class="option-grid">
          <div
            v-skeleton="{ loading: true, animated: animated, radius: 12 }"
            class="config-sample-box"
          >
            <h4>自定义圆角 12px 骨架容器</h4>
            <p>支持显式指定 radius 参数自定义骨架外沿圆角。</p>
          </div>

          <div
            v-skeleton="{ loading: true, animated: animated, radius: 24 }"
            class="config-sample-box pill-style"
          >
            <h4>胶囊形态 24px 骨架容器</h4>
            <p>支持配置任意合法 CSS 尺寸字符串或数字像素。</p>
          </div>
        </div>
      </div>
    </ElCard>
  </div>
</template>

<style scoped>
.skeleton-directive-view {
  padding: 20px;
  max-width: 1000px;
  margin: 0 auto;
}

.demo-section {
  margin-top: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.demo-section:last-child {
  border-bottom: none;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 12px;
}

.section-header h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  color: var(--el-text-color-primary);
}

.section-ctrl {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ctrl-label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.desc {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  margin: 0 0 16px 0;
  line-height: 1.5;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.sample-stat-card {
  padding: 16px 20px;
  border-radius: var(--el-border-radius-base);
  background-color: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  box-sizing: border-box;
}

.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.card-top .label {
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.amount {
  font-size: 24px;
  font-weight: 700;
  color: var(--el-text-color-primary);
  margin-bottom: 8px;
}

.footer-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.footer-tip strong {
  color: var(--el-color-success);
}

.user-profile-box {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border-radius: var(--el-border-radius-base);
  background-color: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-lighter);
}

.avatar-wrap {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  flex-shrink: 0;
}

.user-meta {
  flex: 1;
  min-width: 0;
}

.user-name {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 15px;
  color: var(--el-text-color-primary);
}

.user-bio {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.4;
}

.option-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}

.config-sample-box {
  padding: 20px;
  background-color: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-radius: 12px;
}

.config-sample-box.pill-style {
  border-radius: 24px;
}

.config-sample-box h4 {
  margin: 0 0 8px 0;
  font-size: 15px;
  color: var(--el-text-color-primary);
}

.config-sample-box p {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
</style>
