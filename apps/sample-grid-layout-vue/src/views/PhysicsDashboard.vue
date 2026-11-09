<script setup lang="ts">
/**
 * 布局物理算法、碰撞避让与自由浮动双模看板 (Dashboard 2)。
 *
 * 验证垂直重力紧凑 (Gravity Compacting)、自由浮动留白 (Float Layout)、
 * 碰撞避让、卡片级静态锁控与一键智能规整 (tidyLayout)。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { ref } from 'vue';
import { AtengGridLayout, AtengGridItem } from '@atengk/grid-layout-vue';
import type { GridLayoutItem } from '@atengk/grid-layout-vue';

interface PhysicsCardPayload {
  title: string;
  tag: string;
  type: string;
  description: string;
}

const initialCards: GridLayoutItem<PhysicsCardPayload>[] = [
  {
    id: 'locked-banner',
    x: 0,
    y: 0,
    w: 6,
    h: 2,
    locked: true,
    data: {
      title: '🔒 静态锁控卡片 (Locked)',
      tag: '禁止移动/缩放',
      type: 'danger',
      description: '声明了 locked: true，禁止任何鼠标移动或拉伸，但正常参与碰撞阻挡。',
    },
  },
  {
    id: 'no-resize-card',
    x: 6,
    y: 0,
    w: 6,
    h: 2,
    noResize: true,
    data: {
      title: '↔️ 禁止调整尺寸 (No Resize)',
      tag: '定宽定高',
      type: 'warning',
      description: '声明了 noResize: true，可以自由拖拽位移，但边缘和边角不会出现缩放手柄。',
    },
  },
  {
    id: 'no-move-card',
    x: 0,
    y: 2,
    w: 4,
    h: 3,
    noMove: true,
    data: {
      title: '⚓ 锚定位置 (No Move)',
      tag: '禁止拖动',
      type: 'info',
      description: '声明了 noMove: true，无法拖拽移动位置，但允许拉伸边角调整大小。',
    },
  },
  {
    id: 'floating-card-1',
    x: 4,
    y: 4,
    w: 4,
    h: 2,
    data: {
      title: '🎈 自由悬空卡片 A',
      tag: '普通项',
      type: 'primary',
      description: '在浮动模式下可自由悬空；切换为紧凑模式或一键规整时将自动向上贴靠。',
    },
  },
  {
    id: 'floating-card-2',
    x: 8,
    y: 5,
    w: 4,
    h: 2,
    data: {
      title: '🎈 自由悬空卡片 B',
      tag: '普通项',
      type: 'success',
      description: '拖动到其他卡片上方时，被碰撞的卡片将平滑向下顺延避让。',
    },
  },
];

const layout = ref<GridLayoutItem<PhysicsCardPayload>[]>(JSON.parse(JSON.stringify(initialCards)));
const float = ref(true);
const editable = ref(true);
const showGridLines = ref(true);
const gridLayoutRef = ref<{ tidyLayout: () => void } | null>(null);

const handleTidy = () => {
  if (gridLayoutRef.value) {
    gridLayoutRef.value.tidyLayout();
  }
};

const handleReset = () => {
  layout.value = JSON.parse(JSON.stringify(initialCards));
};
</script>

<template>
  <div class="physics-dashboard">
    <div class="physics-dashboard__toolbar">
      <el-space wrap>
        <el-radio-group v-model="float" size="default">
          <el-radio-button :value="false">⬇️ 垂直重力紧凑模式 (Compact)</el-radio-button>
          <el-radio-button :value="true">🎈 自由浮动留白模式 (Float)</el-radio-button>
        </el-radio-group>
        <el-divider direction="vertical" />
        <el-button type="success" @click="handleTidy"> ✨ 一键垂直规整 (Auto-Tidy) </el-button>
        <el-button @click="handleReset">重置初始状态</el-button>
        <el-divider direction="vertical" />
        <el-switch v-model="editable" active-text="编辑态" inactive-text="只读态" />
        <el-switch v-model="showGridLines" active-text="显示网格线" inactive-text="隐藏网格线" />
      </el-space>
    </div>

    <el-alert
      v-if="float"
      title="自由浮动模式 (Float Mode) 说明"
      type="info"
      description="允许卡片自由停留在网格任意物理坐标并保持悬空空白；点击【一键垂直规整】可立刻将所有卡片无损向上压实消除空洞。"
      show-icon
      :closable="false"
      class="physics-alert"
    />
    <el-alert
      v-else
      title="垂直重力紧凑模式 (Compact Mode) 说明"
      type="success"
      description="网格开启垂直重力紧凑吸附（Gravity Compacting），卡片移动或删除后下方卡片自动向上挤压补齐空位，不允许视觉悬空留白。"
      show-icon
      :closable="false"
      class="physics-alert"
    />

    <div class="physics-dashboard__canvas">
      <AtengGridLayout
        ref="gridLayoutRef"
        v-model:layout="layout"
        :float="float"
        :editable="editable"
        :show-grid-lines="showGridLines"
        cell-height="85px"
      >
        <AtengGridItem v-for="item in layout" :key="item.id" :item="item">
          <template #default="{ item: current }">
            <el-card class="physics-card" shadow="hover">
              <template #header>
                <div class="card-header at-grid-item__header">
                  <span class="card-title">{{ current.data?.title }}</span>
                  <el-tag size="small" :type="current.data?.type || 'info'">
                    {{ current.data?.tag }}
                  </el-tag>
                </div>
              </template>
              <div class="card-content">
                <p class="card-desc">{{ current.data?.description }}</p>
                <div class="card-coordinates">
                  <code>X: {{ current.x }}</code>
                  <code>Y: {{ current.y }}</code>
                  <code>W: {{ current.w }}</code>
                  <code>H: {{ current.h }}</code>
                </div>
              </div>
            </el-card>
          </template>
        </AtengGridItem>
      </AtengGridLayout>
    </div>
  </div>
</template>

<style scoped>
.physics-dashboard {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.physics-dashboard__toolbar {
  padding: 12px 16px;
  background-color: var(--el-bg-color);
  border-radius: 8px;
  border: 1px solid var(--el-border-color-light);
}

.physics-alert {
  margin-bottom: 4px;
}

.physics-dashboard__canvas {
  background-color: var(--el-bg-color);
  border-radius: 8px;
  border: 1px solid var(--el-border-color-light);
  min-height: 650px;
  padding: 8px;
}

.physics-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

:deep(.physics-card .el-card__body) {
  flex: 1;
  overflow: auto;
  padding: 12px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-title {
  font-weight: 600;
  font-size: 14px;
}

.card-desc {
  font-size: 13px;
  color: var(--el-text-color-regular);
  line-height: 1.5;
  margin: 0 0 8px 0;
}

.card-coordinates {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.card-coordinates code {
  background-color: var(--el-fill-color-light);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
}
</style>
