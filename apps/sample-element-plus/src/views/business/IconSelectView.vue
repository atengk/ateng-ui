<script setup lang="ts">
/**
 * AtengIconSelect 通用图标选择器展厅。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { ref } from 'vue';
import {
  ElCard,
  ElForm,
  ElFormItem,
  ElRadioGroup,
  ElRadioButton,
  ElSwitch,
  ElDivider,
  ElTag,
} from 'element-plus';
import { AtengIconSelect, type IconSelectMode, type IconItem } from '@atengk/element-plus';

const selectedIcon1 = ref<string>('User');
const selectedIcon2 = ref<string>('Setting');
const selectedIcon3 = ref<string>('');

const currentMode = ref<IconSelectMode>('popover');
const isDisabled = ref<boolean>(false);
const currentSize = ref<'large' | 'default' | 'small'>('default');

// 自定义企业图标扩充
const customIcons: IconItem[] = [
  {
    name: 'AtengCloud',
    label: '阿腾云',
    pinyin: 'atengyun,aty',
    svgPath:
      '<path d="M704 384c-12-84-84-148-172-148-76 0-140 48-164 116-16-4-32-6-48-6-88 0-160 72-160 160 0 88 72 160 160 160h384c70 0 128-58 128-128 0-66-50-120-114-126z" fill="currentColor"/>',
  },
  {
    name: 'AtengShield',
    label: '安全盾牌',
    pinyin: 'anquandunpai,aq',
    svgPath:
      '<path d="M512 64l320 128v320c0 224-192 384-320 448C384 896 192 736 192 512V192z" fill="currentColor"/>',
  },
];
</script>

<template>
  <div class="icon-select-view">
    <ElCard shadow="never" class="demo-card">
      <template #header>
        <div class="card-header">
          <span class="title">AtengIconSelect 全量通用图标选择器</span>
          <span class="subtitle">
            支持拼音/英文/中文全维模糊检索、Popover 浮窗与 Dialog
            弹窗双模展现，内置高频标准图标并支持企业扩展
          </span>
        </div>
      </template>

      <!-- 选项栏 -->
      <div class="toolbar">
        <ElForm inline>
          <ElFormItem label="展现模式：">
            <ElRadioGroup v-model="currentMode" size="small">
              <ElRadioButton value="popover">Popover 浮窗</ElRadioButton>
              <ElRadioButton value="dialog">Dialog 模态窗</ElRadioButton>
            </ElRadioGroup>
          </ElFormItem>

          <ElFormItem label="输入框尺寸：">
            <ElRadioGroup v-model="currentSize" size="small">
              <ElRadioButton value="large">Large</ElRadioButton>
              <ElRadioButton value="default">Default</ElRadioButton>
              <ElRadioButton value="small">Small</ElRadioButton>
            </ElRadioGroup>
          </ElFormItem>

          <ElFormItem label="是否禁用：">
            <ElSwitch v-model="isDisabled" />
          </ElFormItem>
        </ElForm>
      </div>

      <ElDivider />

      <!-- 表单集成场景展示 -->
      <div class="form-wrapper">
        <ElForm label-width="130px" style="max-width: 560px">
          <ElFormItem label="系统菜单图标：">
            <AtengIconSelect
              v-model="selectedIcon1"
              :mode="currentMode"
              :size="currentSize"
              :disabled="isDisabled"
              :custom-icons="customIcons"
            />
            <div class="val-hint">
              当前选中：<ElTag size="small">{{ selectedIcon1 || '未选择' }}</ElTag>
            </div>
          </ElFormItem>

          <ElFormItem label="权限按钮图标：">
            <AtengIconSelect
              v-model="selectedIcon2"
              :mode="currentMode"
              :size="currentSize"
              :disabled="isDisabled"
            />
            <div class="val-hint">
              当前选中：<ElTag size="small">{{ selectedIcon2 || '未选择' }}</ElTag>
            </div>
          </ElFormItem>

          <ElFormItem label="自选空状态测试：">
            <AtengIconSelect
              v-model="selectedIcon3"
              placeholder="请挑选一个精美图标"
              :mode="currentMode"
              :size="currentSize"
              :disabled="isDisabled"
              :custom-icons="customIcons"
            />
            <div class="val-hint">
              当前选中：<ElTag size="small">{{ selectedIcon3 || '未选择' }}</ElTag>
            </div>
          </ElFormItem>
        </ElForm>
      </div>
    </ElCard>
  </div>
</template>

<style scoped lang="scss">
.icon-select-view {
  padding: 20px;

  .demo-card {
    border-radius: 8px;
  }

  .card-header {
    display: flex;
    flex-direction: column;
    gap: 4px;

    .title {
      font-size: 18px;
      font-weight: 600;
      color: var(--el-text-color-primary);
    }

    .subtitle {
      font-size: 13px;
      color: var(--el-text-color-secondary);
    }
  }

  .val-hint {
    margin-top: 6px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}
</style>
