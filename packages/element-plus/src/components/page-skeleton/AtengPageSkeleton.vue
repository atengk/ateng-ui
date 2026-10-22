<script setup lang="ts">
/**
 * 页面骨架屏占位容器组件。
 *
 * 核心特性：
 * 1. 预设 4 大企业级高频模态：table（检索表单+表格）、form（表单栅格）、detail（详情结构）、card（卡片网格）；
 * 2. 深度集成 ElSkeleton，自带原生平滑呼吸动效；
 * 3. 真实内容切换时采用平滑 Fade Transition 淡入淡出过渡，彻底消除突兀闪变；
 * 4. 支持 #skeleton 完全自定义扩展。
 *
 * @author Ateng
 * @since 2026-10-22
 */

import { ref } from 'vue';
import { ElSkeleton, ElSkeletonItem } from 'element-plus';
import type { AtengPageSkeletonProps } from './types';

defineOptions({
  name: 'AtengPageSkeleton',
});

withDefaults(defineProps<AtengPageSkeletonProps>(), {
  loading: true,
  type: 'table',
  animated: true,
  rows: 5,
  columns: 3,
});

const skeletonRef = ref<HTMLElement | null>(null);

defineExpose({
  skeletonRef,
});
</script>

<template>
  <div ref="skeletonRef" class="at-page-skeleton">
    <transition name="at-fade" mode="out-in">
      <!-- 骨架屏占位区 -->
      <div v-if="loading" key="skeleton" class="at-page-skeleton__wrapper">
        <slot v-if="type === 'custom' || $slots.skeleton" name="skeleton" />

        <el-skeleton v-else :animated="animated">
          <template #template>
            <!-- 模态 1: 表格型 (table) -->
            <div v-if="type === 'table'" class="at-skeleton-table">
              <!-- 顶部模拟检索表单 -->
              <div class="at-skeleton-table__query">
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
                <el-skeleton-item variant="rect" style="width: 15%; height: 28px" />
                <el-skeleton-item variant="rect" style="width: 25%; height: 28px" />
                <el-skeleton-item variant="rect" style="width: 20%; height: 28px" />
                <el-skeleton-item variant="rect" style="width: 20%; height: 28px" />
                <el-skeleton-item variant="rect" style="width: 20%; height: 28px" />
              </div>

              <!-- 表格多行数据 -->
              <div v-for="i in rows" :key="i" class="at-skeleton-table__row">
                <el-skeleton-item variant="text" style="width: 15%" />
                <el-skeleton-item variant="text" style="width: 25%" />
                <el-skeleton-item variant="text" style="width: 20%" />
                <el-skeleton-item variant="text" style="width: 20%" />
                <el-skeleton-item variant="text" style="width: 20%" />
              </div>
            </div>

            <!-- 模态 2: 表单型 (form) -->
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

            <!-- 模态 3: 详情型 (detail) -->
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

            <!-- 模态 4: 卡片网格型 (card) -->
            <div
              v-else-if="type === 'card'"
              class="at-skeleton-card-grid"
              :style="{ gridTemplateColumns: `repeat(${columns}, 1fr)` }"
            >
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

/* 模态 1: 表格 */
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

/* 模态 2: 表单 */
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

/* 模态 3: 详情 */
.at-skeleton-detail__grid {
  display: grid;
  gap: 18px 24px;
}

.at-skeleton-detail__item {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 模态 4: 卡片网格 */
.at-skeleton-card-grid {
  display: grid;
  gap: 20px;
}

.at-skeleton-card-item {
  padding: 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: var(--el-border-radius-base);
  box-sizing: border-box;
}

/* 淡入淡出过渡动效 */
.at-fade-enter-active,
.at-fade-leave-active {
  transition: opacity 0.25s ease;
}

.at-fade-enter-from,
.at-fade-leave-to {
  opacity: 0;
}
</style>
