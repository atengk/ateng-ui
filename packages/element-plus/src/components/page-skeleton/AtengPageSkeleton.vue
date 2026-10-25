<script setup lang="ts">
/**
 * 页面骨架屏占位容器组件。
 *
 * 核心特性：
 * 1. 预设 5 大企业级高频形态：table（检索表单+表格）、form（表单栅格）、detail（详情结构）、card（流式卡片网格）、dashboard（4 指标卡+双图表看板）；
 * 2. 现代 CSS Grid 流式自适应布局（repeat(auto-fit, minmax(220px, 1fr))），小屏幕优雅折行无溢出；
 * 3. 深度集成 ElSkeleton，自带原生平滑呼吸动效；
 * 4. 真实内容切换时采用平滑 Fade Transition 淡入淡出过渡，彻底消除突兀闪变；
 * 5. 支持 #skeleton 完全自定义扩展。
 *
 * @author Ateng
 * @since 2026-10-22
 */

import { ref, computed } from 'vue';
import { ElSkeleton, ElSkeletonItem } from 'element-plus';
import type { AtengPageSkeletonProps, AtengPageSkeletonSlots } from './types';

defineOptions({
  name: 'AtengPageSkeleton',
});

defineSlots<AtengPageSkeletonSlots>();

const props = withDefaults(defineProps<AtengPageSkeletonProps>(), {
  loading: true,
  type: 'table',
  animated: true,
  rows: 5,
  columns: 3,
  showPagination: false,
  showHeader: true,
});

const DEFAULT_COLUMN_WIDTHS = ['15%', '25%', '20%', '20%', '20%'];

const resolvedColumnWidths = computed<string[]>(() => {
  if (props.columnWidths && props.columnWidths.length > 0) {
    return props.columnWidths.map(w =>
      typeof w === 'number' || /^\d+$/.test(String(w)) ? `${w}px` : String(w),
    );
  }
  return DEFAULT_COLUMN_WIDTHS;
});

const skeletonRef = ref<HTMLElement | null>(null);

defineExpose({
  skeletonRef,
});
</script>

<template>
  <div ref="skeletonRef" class="at-page-skeleton">
    <transition name="at-fade">
      <!-- 骨架屏占位区 -->
      <div v-if="loading" key="skeleton" class="at-page-skeleton__wrapper">
        <slot v-if="type === 'custom' || $slots.skeleton" name="skeleton" />

        <el-skeleton v-else :animated="animated">
          <template #template>
            <!-- 形态 1: 表格型 (table) -->
            <div v-if="type === 'table'" class="at-skeleton-table">
              <!-- 顶部模拟检索表单 -->
              <div v-if="showHeader" class="at-skeleton-table__query">
                <el-skeleton-item variant="rect" class="at-skeleton-item-input" />
                <el-skeleton-item variant="rect" class="at-skeleton-item-input" />
                <el-skeleton-item variant="rect" class="at-skeleton-item-input" />
                <div class="at-skeleton-table__btns">
                  <el-skeleton-item variant="button" class="at-skeleton-item-btn" />
                  <el-skeleton-item variant="button" class="at-skeleton-item-btn" />
                </div>
              </div>

              <!-- 表格表头 -->
              <div class="at-skeleton-table__header">
                <el-skeleton-item
                  v-for="(w, idx) in resolvedColumnWidths"
                  :key="idx"
                  variant="rect"
                  :style="{ width: w, height: '28px' }"
                />
              </div>

              <!-- 表格多行数据 -->
              <div v-for="i in rows" :key="i" class="at-skeleton-table__row">
                <el-skeleton-item
                  v-for="(w, idx) in resolvedColumnWidths"
                  :key="idx"
                  variant="text"
                  :style="{ width: w }"
                />
              </div>

              <!-- 底部模拟假分页栏 -->
              <div v-if="showPagination" class="at-skeleton-table__pagination">
                <el-skeleton-item
                  variant="text"
                  class="at-skeleton-pagination-total"
                  style="width: 88px; height: 16px"
                />
                <div class="at-skeleton-table__pagination-controls">
                  <el-skeleton-item
                    variant="button"
                    class="at-skeleton-pagination-btn"
                    style="width: 32px; height: 32px"
                  />
                  <el-skeleton-item
                    variant="button"
                    class="at-skeleton-pagination-btn"
                    style="width: 32px; height: 32px"
                  />
                  <el-skeleton-item
                    variant="button"
                    class="at-skeleton-pagination-btn"
                    style="width: 32px; height: 32px"
                  />
                  <el-skeleton-item
                    variant="button"
                    class="at-skeleton-pagination-btn"
                    style="width: 32px; height: 32px"
                  />
                  <el-skeleton-item
                    variant="rect"
                    class="at-skeleton-pagination-sizes"
                    style="width: 96px; height: 32px"
                  />
                </div>
              </div>
            </div>

            <!-- 形态 2: 表单型 (form) -->
            <div v-else-if="type === 'form'" class="at-skeleton-form">
              <div
                class="at-skeleton-form__grid"
                :style="{ gridTemplateColumns: `repeat(${columns}, 1fr)` }"
              >
                <div v-for="i in rows * columns" :key="i" class="at-skeleton-form__item">
                  <el-skeleton-item
                    variant="text"
                    style="width: 30%; height: 16px; margin-bottom: 8px"
                  />
                  <el-skeleton-item variant="rect" style="width: 100%; height: 32px" />
                </div>
              </div>
              <div class="at-skeleton-form__actions">
                <el-skeleton-item variant="button" style="width: 80px; height: 32px" />
                <el-skeleton-item variant="button" style="width: 80px; height: 32px" />
              </div>
            </div>

            <!-- 形态 3: 详情型 (detail) -->
            <div v-else-if="type === 'detail'" class="at-skeleton-detail">
              <el-skeleton-item
                variant="rect"
                style="width: 20%; height: 24px; margin-bottom: 20px"
              />
              <div
                class="at-skeleton-detail__grid"
                :style="{ gridTemplateColumns: `repeat(${columns}, 1fr)` }"
              >
                <div v-for="i in rows * columns" :key="i" class="at-skeleton-detail__item">
                  <el-skeleton-item variant="text" style="width: 35%; height: 14px" />
                  <el-skeleton-item variant="text" style="width: 60%; height: 14px" />
                </div>
              </div>
            </div>

            <!-- 形态 4: 卡片网格型 (card) -->
            <div v-else-if="type === 'card'" class="at-skeleton-card-grid">
              <div v-for="i in columns * 2" :key="i" class="at-skeleton-card-item">
                <el-skeleton-item
                  variant="rect"
                  style="width: 100%; height: 120px; border-radius: 4px; margin-bottom: 12px"
                />
                <el-skeleton-item
                  variant="text"
                  style="width: 60%; height: 18px; margin-bottom: 8px"
                />
                <el-skeleton-item variant="text" style="width: 90%; height: 14px" />
              </div>
            </div>

            <!-- 形态 5: 仪表盘看板型 (dashboard) -->
            <div v-else-if="type === 'dashboard'" class="at-skeleton-dashboard">
              <!-- 4 张指标卡骨架 -->
              <div class="at-skeleton-dashboard__stats">
                <div v-for="i in 4" :key="i" class="at-skeleton-stat-card">
                  <el-skeleton-item
                    variant="text"
                    style="width: 45%; height: 16px; margin-bottom: 12px"
                  />
                  <el-skeleton-item
                    variant="rect"
                    style="width: 65%; height: 28px; margin-bottom: 10px; border-radius: 4px"
                  />
                  <el-skeleton-item variant="text" style="width: 80%; height: 14px" />
                </div>
              </div>

              <!-- 双图表区块骨架 -->
              <div class="at-skeleton-dashboard__charts">
                <div v-for="i in 2" :key="i" class="at-skeleton-chart-card">
                  <div class="at-skeleton-chart-card__header">
                    <el-skeleton-item variant="text" style="width: 30%; height: 18px" />
                    <el-skeleton-item variant="button" style="width: 64px; height: 24px" />
                  </div>
                  <el-skeleton-item variant="rect" class="at-skeleton-chart-card__body" />
                </div>
              </div>
            </div>
          </template>
        </el-skeleton>
      </div>

      <!-- 真实业务视图 -->
      <div v-else key="content" class="at-page-skeleton__content">
        <slot />
      </div>
    </transition>
  </div>
</template>

<style scoped>
.at-page-skeleton {
  width: 100%;
  box-sizing: border-box;
}

.at-page-skeleton__wrapper {
  padding: 16px;
  background-color: var(--el-bg-color);
  border-radius: var(--el-border-radius-base);
  border: 1px solid var(--el-border-color-lighter);
  box-sizing: border-box;
}

/* 形态 1: 表格 */
.at-skeleton-table__query {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.at-skeleton-item-input {
  width: 200px;
  height: 32px;
  border-radius: 4px;
}

.at-skeleton-table__btns {
  display: flex;
  gap: 12px;
  margin-left: auto;
}

.at-skeleton-item-btn {
  width: 72px;
  height: 32px;
}

.at-skeleton-table__header {
  display: flex;
  gap: 16px;
  padding: 12px 16px;
  background-color: var(--el-fill-color-light);
  border-radius: 4px;
  margin-bottom: 12px;
}

.at-skeleton-table__row {
  display: flex;
  gap: 16px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.at-skeleton-table__pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.at-skeleton-table__pagination-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.at-skeleton-pagination-total {
  border-radius: 4px;
}

.at-skeleton-pagination-btn {
  border-radius: 4px;
}

.at-skeleton-pagination-sizes {
  border-radius: 4px;
}

/* 形态 2: 表单 */
.at-skeleton-form__grid {
  display: grid;
  gap: 20px 24px;
  margin-bottom: 24px;
}

.at-skeleton-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--el-border-color-lighter);
}

/* 形态 3: 详情 */
.at-skeleton-detail__grid {
  display: grid;
  gap: 18px 24px;
}

.at-skeleton-detail__item {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 形态 4: 卡片网格（流式自适应） */
.at-skeleton-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
}

.at-skeleton-card-item {
  padding: 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: var(--el-border-radius-base);
  box-sizing: border-box;
}

/* 形态 5: 仪表盘看板（4 指标卡 + 双图表区块） */
.at-skeleton-dashboard {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.at-skeleton-dashboard__stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.at-skeleton-stat-card {
  padding: 16px;
  background-color: var(--el-fill-color-light);
  border-radius: var(--el-border-radius-base);
  box-sizing: border-box;
}

.at-skeleton-dashboard__charts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 20px;
}

.at-skeleton-chart-card {
  padding: 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: var(--el-border-radius-base);
  background-color: var(--el-bg-color);
  box-sizing: border-box;
}

.at-skeleton-chart-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.at-skeleton-chart-card__body {
  width: 100%;
  height: 240px;
  border-radius: 4px;
}

/* 淡入淡出过渡动效 - 极速 GPU 毫秒级过渡 */
.at-fade-enter-active,
.at-fade-leave-active {
  transition: opacity 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  will-change: opacity;
}

.at-fade-enter-from,
.at-fade-leave-to {
  opacity: 0;
}
</style>
