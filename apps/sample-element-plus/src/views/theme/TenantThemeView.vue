<script setup lang="ts">
/**
 * @atengk/element-plus 现代主题引擎 - 动态租户换肤 API (setThemeColor) 自验展厅。
 *
 * 验证维度：
 * 1. 运行时 setThemeColor(hex) 动态演算 1~9 级轻量色阶与 RGB 通道；
 * 2. 页面所有主按钮、Focus 环、标签、开关与表格行微光实时响应；
 * 3. 动态色阶调色板可视化预览；
 * 4. 局部容器隔离演示 (Micro-Frontend / 租户分舱)：仅改变局部容器品牌色，不污染全局；
 * 5. 防御性非法值输入体验。
 *
 * @author Ateng
 * @since 2026-10-22
 */

import { ref, onMounted } from 'vue';
import {
  ElButton,
  ElInput,
  ElTag,
  ElSwitch,
  ElRadioGroup,
  ElRadioButton,
  ElMessage,
} from 'element-plus';
import { AtengCard, setThemeColor } from '@atengk/element-plus';

// 1. 全局品牌色动态设定
const currentGlobalColor = ref('#4f46e5');
const customHexInput = ref('#0d9488');

const applyGlobalColor = (hex: string) => {
  currentGlobalColor.value = hex;
  const success = setThemeColor(hex);
  if (success) {
    ElMessage.success(`已动态演算并应用全局品牌色: ${hex}`);
    updatePalettePreview(hex);
  } else {
    ElMessage.error(`颜色格式非法: ${hex}`);
  }
};

// 2. 调色板全色阶预览状态
interface ColorStep {
  name: string;
  hex: string;
}
const paletteSteps = ref<ColorStep[]>([]);

const updatePalettePreview = (hex: string) => {
  const steps: ColorStep[] = [{ name: 'primary', hex }];
  const tempEl = document.createElement('div');
  setThemeColor(hex, { target: tempEl });
  for (let i = 1; i <= 9; i++) {
    steps.push({
      name: `light-${i}`,
      hex: tempEl.style.getPropertyValue(`--el-color-primary-light-${i}`),
    });
  }
  steps.push({
    name: 'dark-2',
    hex: tempEl.style.getPropertyValue('--el-color-primary-dark-2'),
  });
  paletteSteps.value = steps;
};

// 3. 局部容器独立换肤演示
const localContainerRef = ref<HTMLElement | null>(null);
const localColor = ref('#ea580c');

const applyLocalColor = (hex: string) => {
  localColor.value = hex;
  if (localContainerRef.value) {
    setThemeColor(hex, { target: localContainerRef.value });
    ElMessage.success(`已向局部隔离容器注入专属租户品牌色: ${hex}`);
  }
};

onMounted(() => {
  updatePalettePreview(currentGlobalColor.value);
  if (localContainerRef.value) {
    setThemeColor(localColor.value, { target: localContainerRef.value });
  }
});
</script>

<template>
  <div class="theme-tenant-view">
    <!-- 1. 全局租户品牌色动态演算 -->
    <AtengCard title="🎨 运行时全局租户品牌色演算 (setThemeColor)" class="mb-4">
      <div class="action-bar mb-3">
        <span class="label">经典企业品牌色快捷演算：</span>
        <ElRadioGroup
          :model-value="currentGlobalColor"
          @update:model-value="val => applyGlobalColor(val as string)"
        >
          <ElRadioButton value="#4f46e5">靛蓝科技 (#4f46e5)</ElRadioButton>
          <ElRadioButton value="#2563eb">商务普蓝 (#2563eb)</ElRadioButton>
          <ElRadioButton value="#0d9488">松石墨绿 (#0d9488)</ElRadioButton>
          <ElRadioButton value="#ea580c">动力烈阳 (#ea580c)</ElRadioButton>
          <ElRadioButton value="#db2777">极客霓虹 (#db2777)</ElRadioButton>
        </ElRadioGroup>
      </div>

      <div class="custom-input-row mb-4">
        <span class="label">输入任意十六进制品牌色：</span>
        <ElInput
          v-model="customHexInput"
          placeholder="如 #6366f1 或 #059669"
          style="width: 200px"
        />
        <ElButton type="primary" @click="applyGlobalColor(customHexInput)">
          执行全自动演算并应用
        </ElButton>
      </div>

      <!-- 动态演算色阶可视化调色板 -->
      <div class="palette-preview-block">
        <div class="preview-title">1~9 全阶梯衍生色阶实时看板：</div>
        <div class="palette-grid">
          <div
            v-for="step in paletteSteps"
            :key="step.name"
            class="palette-card"
            :style="{ backgroundColor: step.hex }"
          >
            <span class="step-name">{{ step.name }}</span>
            <span class="step-hex">{{ step.hex }}</span>
          </div>
        </div>
      </div>
    </AtengCard>

    <!-- 2. 全局联动效果即时体验 -->
    <AtengCard title="⚡ 动态演算效果即时验证" class="mb-4">
      <div class="controls-preview-row">
        <ElButton type="primary">全局主题按钮</ElButton>
        <ElButton type="primary" class="is-contrast">Linear 高反差主按钮</ElButton>
        <ElTag type="primary" class="is-dot">动态色状态标签</ElTag>
        <ElSwitch :model-value="true" />
        <ElInput placeholder="聚焦查看 Focus 激光环联动" style="width: 220px" />
      </div>
    </AtengCard>

    <!-- 3. 局部容器隔离演示 (Micro-Frontend / 租户多舱) -->
    <AtengCard title="🏢 局部容器隔离 (支持微前端与不同租户分舱)" class="mb-4">
      <p class="mb-3 text-sm text-muted">
        通过 <code>setThemeColor(hex, { target: localElement })</code> 将特定租户色仅注入局部
        DOM，完全不污染全局 <code>document.documentElement</code>。
      </p>

      <div class="mb-3">
        <span class="label">局部租户色切换：</span>
        <ElRadioGroup
          :model-value="localColor"
          @update:model-value="val => applyLocalColor(val as string)"
        >
          <ElRadioButton value="#ea580c">租户 A: 活力橙 (#ea580c)</ElRadioButton>
          <ElRadioButton value="#059669">租户 B: 极客绿 (#059669)</ElRadioButton>
          <ElRadioButton value="#7c3aed">租户 C: 赛博紫 (#7c3aed)</ElRadioButton>
        </ElRadioGroup>
      </div>

      <!-- 局部隔离容器 -->
      <div ref="localContainerRef" class="local-tenant-box">
        <div class="box-header">
          <span class="box-title">💼 独立租户私有沙箱容器 (Target Container)</span>
          <ElTag type="primary" class="is-dot">私有品牌色</ElTag>
        </div>
        <div class="box-body">
          <ElButton type="primary">私有主按钮</ElButton>
          <ElSwitch :model-value="true" />
          <ElInput placeholder="私有 Focus-Ring 激光环" style="width: 240px" />
        </div>
      </div>
    </AtengCard>
  </div>
</template>

<style scoped>
.theme-tenant-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.action-bar,
.custom-input-row {
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

.palette-preview-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}

.preview-title {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
}

.palette-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  gap: 8px;
}

.palette-card {
  padding: 10px 8px;
  border-radius: var(--el-border-radius-base);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s;
}

.palette-card:hover {
  transform: translateY(-2px);
}

.step-name {
  font-size: 11px;
  font-weight: 600;
  color: #ffffff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
  font-family: var(--at-font-mono, monospace);
}

.step-hex {
  font-size: 10px;
  color: #ffffff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
  font-family: var(--at-font-mono, monospace);
}

.controls-preview-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
}

.text-muted {
  color: var(--el-text-color-secondary);
}

.text-sm {
  font-size: 13px;
}

.local-tenant-box {
  padding: 20px;
  background-color: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color);
  border-radius: var(--at-radius-card, 10px);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.box-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.box-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.box-body {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
}
</style>
