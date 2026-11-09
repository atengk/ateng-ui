<script setup lang="ts">
/**
 * AtengFormPropertyPanel 属性面板自举渲染组件。
 *
 * 遵循 ADR-0044 第 7 条规约：
 * 1. 内部直接调用 <AtengFormRenderer /> 递归自举渲染出当前控件专有 Props 配置面板与全局 FormConfig；
 * 2. 具备“基础属性、专有参数、布局几何”分 Tab 组织；
 * 3. 暴露 #custom-property 具名插槽，为复杂自定义属性配置提供逃生门；
 * 4. 连续输入集成防抖合并标记，与 FormHistoryStack 无缝咬合。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { ref, computed, watch } from 'vue';
import type { FormWidget, FormConfig, FormSchema } from '../types';
import { defaultWidgetRegistry } from '../registry';
import type { FormWidgetRegistry } from '../registry';
import AtengFormRenderer from './AtengFormRenderer.vue';
import { getWidgetPropsConfigSchema, globalFormConfigSchema } from '../utils/propertyPresets';

interface Props {
  /** 当前活动选中的控件实体 */
  activeWidget?: FormWidget | null;
  /** 全局表单配置 */
  formConfig?: FormConfig;
  /** 控件注册中心 */
  registry?: FormWidgetRegistry;
}

const props = withDefaults(defineProps<Props>(), {
  activeWidget: null,
  formConfig: () => ({}),
  registry: () => defaultWidgetRegistry,
});

const emit = defineEmits<{
  'update-widget': [patch: Partial<FormWidget>, debounced?: boolean];
  'update-form-config': [patch: Partial<FormConfig>];
}>();

// 属性面板子 Tab
const activePropTab = ref<'basic' | 'props' | 'layout'>('basic');

// 自举专用 Props Schema
const widgetPropsSchema = computed<FormSchema | null>(() => {
  if (!props.activeWidget) {
    return null;
  }
  const registered = props.registry.get(props.activeWidget.type);
  if (registered && registered.propsConfigSchema) {
    return registered.propsConfigSchema;
  }
  return getWidgetPropsConfigSchema(props.activeWidget);
});

// 临时响应式数据模型（用于向 AtengFormRenderer 双向绑定）
const widgetPropsData = ref<Record<string, unknown>>({});
const formConfigData = ref<Record<string, unknown>>({});

// 监听活动控件切换，同步当前 props
watch(
  () => props.activeWidget,
  widget => {
    if (widget) {
      widgetPropsData.value = { ...(widget.props || {}) };
    }
  },
  { immediate: true, deep: true },
);

// 监听全局配置切换
watch(
  () => props.formConfig,
  cfg => {
    formConfigData.value = { ...cfg };
  },
  { immediate: true, deep: true },
);

// 基础属性字段更新 (防抖)
const handleBasicFieldInput = (key: string, value: unknown): void => {
  if (!props.activeWidget) return;
  emit('update-widget', { [key]: value }, true);
};

// 必填状态切换 (立即提交)
const handleRequiredChange = (checked: boolean): void => {
  if (!props.activeWidget) return;
  const currentRules = props.activeWidget.rules ? [...props.activeWidget.rules] : [];
  const reqIdx = currentRules.findIndex(r => r.required);
  if (checked) {
    if (reqIdx < 0) {
      currentRules.unshift({
        required: true,
        message: `${props.activeWidget.label || '此项'}不能为空`,
      });
    }
  } else {
    if (reqIdx >= 0) {
      currentRules.splice(reqIdx, 1);
    }
  }
  emit('update-widget', { rules: currentRules }, false);
};

// 布局几何变更
const handleLayoutChange = (key: 'span' | 'offset', val: number): void => {
  if (!props.activeWidget) return;
  const newLayout = { ...(props.activeWidget.layout || {}), [key]: val };
  emit('update-widget', { layout: newLayout }, false);
};

// 专有 Props 自举更新
const handlePropsFormUpdate = (data: Record<string, unknown>): void => {
  widgetPropsData.value = data;
  emit('update-widget', { props: { ...data } }, true);
};

// 全局 FormConfig 自举更新
const handleGlobalConfigFormUpdate = (data: Record<string, unknown>): void => {
  formConfigData.value = data;
  emit('update-form-config', { ...data });
};
</script>

<template>
  <aside class="at-form-property-panel">
    <!-- 头部标题与标识 -->
    <div class="at-prop-header">
      <div class="at-prop-header__left">
        <span class="at-prop-header__title">
          {{ activeWidget ? '⚙️ 控件属性' : '📋 表单全局配置' }}
        </span>
        <span v-if="activeWidget" class="at-prop-badge" :data-type="activeWidget.type">
          {{ activeWidget.type }}
        </span>
        <span v-else class="at-prop-badge is-global">Global Config</span>
      </div>
    </div>

    <!-- 1. 选中控件状态 -->
    <div v-if="activeWidget" class="at-prop-content">
      <!-- 属性三段式子 Tab 栏 -->
      <div class="at-prop-tabs">
        <button
          type="button"
          class="at-prop-tab-btn"
          :class="{ 'is-active': activePropTab === 'basic' }"
          @click="activePropTab = 'basic'"
        >
          基础参数
        </button>
        <button
          type="button"
          class="at-prop-tab-btn"
          :class="{ 'is-active': activePropTab === 'props' }"
          @click="activePropTab = 'props'"
        >
          专用扩展
        </button>
        <button
          type="button"
          class="at-prop-tab-btn"
          :class="{ 'is-active': activePropTab === 'layout' }"
          @click="activePropTab = 'layout'"
        >
          布局几何
        </button>
      </div>

      <!-- Tab 1: 基础属性 -->
      <div v-if="activePropTab === 'basic'" class="at-prop-pane">
        <div class="at-prop-field">
          <label class="at-prop-label">控件唯一标识 (id)</label>
          <input class="at-prop-input is-readonly" :value="activeWidget.id" readonly />
        </div>

        <div v-if="!activeWidget.isContainer" class="at-prop-field">
          <label class="at-prop-label">模型绑定键 (modelKey)</label>
          <input
            class="at-prop-input"
            :value="activeWidget.modelKey"
            placeholder="例如: username 或 order.code"
            @input="handleBasicFieldInput('modelKey', ($event.target as HTMLInputElement).value)"
          />
        </div>

        <div class="at-prop-field">
          <label class="at-prop-label">展示标签名称 (label)</label>
          <input
            class="at-prop-input"
            :value="activeWidget.label"
            placeholder="字段标签名"
            @input="handleBasicFieldInput('label', ($event.target as HTMLInputElement).value)"
          />
        </div>

        <div v-if="!activeWidget.isContainer" class="at-prop-field">
          <label class="at-prop-label">占位提示文案 (placeholder)</label>
          <input
            class="at-prop-input"
            :value="activeWidget.placeholder"
            placeholder="提示文本"
            @input="handleBasicFieldInput('placeholder', ($event.target as HTMLInputElement).value)"
          />
        </div>

        <div v-if="!activeWidget.isContainer" class="at-prop-field is-row">
          <label class="at-prop-label">是否强制必填</label>
          <input
            type="checkbox"
            :checked="activeWidget.rules?.some(r => r.required)"
            @change="handleRequiredChange(($event.target as HTMLInputElement).checked)"
          />
        </div>
      </div>

      <!-- Tab 2: 专有属性自举渲染与自定义插槽 -->
      <div v-else-if="activePropTab === 'props'" class="at-prop-pane">
        <!-- 宿主逃生门插槽 -->
        <slot
          name="custom-property"
          :widget="activeWidget"
          :update-property="
            (k: string, v: unknown) =>
              emit('update-widget', { props: { ...activeWidget?.props, [k]: v } }, true)
          "
        />

        <!-- 由 <AtengFormRenderer /> 驱动自举渲染 Schema -->
        <div v-if="widgetPropsSchema" class="at-prop-bootstrap-form">
          <AtengFormRenderer
            :schema="widgetPropsSchema"
            :form-data="widgetPropsData"
            @update:form-data="handlePropsFormUpdate"
          />
        </div>

        <div v-else class="at-prop-empty-hint">
          <span>该控件类型无需额外专有配置</span>
        </div>
      </div>

      <!-- Tab 3: 布局几何排版 -->
      <div v-else-if="activePropTab === 'layout'" class="at-prop-pane">
        <div class="at-prop-field">
          <label class="at-prop-label">24 栅格所占列数 (span: 1~24)</label>
          <input
            type="number"
            class="at-prop-input"
            min="1"
            max="24"
            :value="activeWidget.layout?.span ?? 24"
            @change="handleLayoutChange('span', Number(($event.target as HTMLInputElement).value))"
          />
        </div>

        <div class="at-prop-field">
          <label class="at-prop-label">左侧偏移格数 (offset: 0~24)</label>
          <input
            type="number"
            class="at-prop-input"
            min="0"
            max="24"
            :value="activeWidget.layout?.offset ?? 0"
            @change="
              handleLayoutChange('offset', Number(($event.target as HTMLInputElement).value))
            "
          />
        </div>
      </div>
    </div>

    <!-- 2. 未选中控件：全局表单 FormConfig 自举渲染 -->
    <div v-else class="at-prop-global-wrap">
      <div class="at-prop-global-intro">
        <span class="at-prop-global-title">全局表单排版参数</span>
        <span class="at-prop-global-desc">针对当前画板所有控件生效的默认排版与尺寸</span>
      </div>

      <div class="at-prop-bootstrap-form">
        <AtengFormRenderer
          :schema="globalFormConfigSchema"
          :form-data="formConfigData"
          @update:form-data="handleGlobalConfigFormUpdate"
        />
      </div>
    </div>
  </aside>
</template>

<style scoped>
.at-form-property-panel {
  width: 280px;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color, #ffffff);
  border-left: 1px solid var(--el-border-color-light, #e4e7ed);
  overflow-y: auto;
  box-sizing: border-box;
}

.at-prop-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: var(--el-fill-color-lighter, #fafafa);
  border-bottom: 1px solid var(--el-border-color-light, #e4e7ed);
}

.at-prop-header__left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.at-prop-header__title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary, #303133);
}

.at-prop-badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 3px;
  background: var(--el-color-primary-light-9, #ecf5ff);
  color: var(--el-color-primary, #409eff);
  font-family: monospace;
}

.at-prop-badge.is-global {
  background: #f6ffed;
  color: #52c41a;
}

.at-prop-content {
  display: flex;
  flex-direction: column;
}

.at-prop-tabs {
  display: flex;
  background: var(--el-fill-color-lighter, #fafafa);
  border-bottom: 1px solid var(--el-border-color-light, #e4e7ed);
}

.at-prop-tab-btn {
  flex: 1;
  height: 32px;
  border: none;
  background: transparent;
  font-size: 11px;
  color: var(--el-text-color-secondary, #909399);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.15s ease;
}

.at-prop-tab-btn.is-active {
  color: var(--el-color-primary, #409eff);
  border-bottom-color: var(--el-color-primary, #409eff);
  background: var(--el-bg-color, #ffffff);
  font-weight: 500;
}

.at-prop-pane {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.at-prop-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.at-prop-field.is-row {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.at-prop-label {
  font-size: 12px;
  color: var(--el-text-color-regular, #606266);
}

.at-prop-input {
  height: 28px;
  padding: 0 8px;
  font-size: 12px;
  border: 1px solid var(--el-border-color, #dcdfe6);
  border-radius: 4px;
  outline: none;
  background: var(--el-bg-color, #ffffff);
  color: var(--el-text-color-primary, #303133);
}

.at-prop-input.is-readonly {
  background: var(--el-fill-color-light, #f5f7fa);
  color: var(--el-text-color-secondary, #909399);
  cursor: default;
}

.at-prop-input:focus:not(.is-readonly) {
  border-color: var(--el-color-primary, #409eff);
}

.at-prop-bootstrap-form {
  padding-top: 4px;
}

.at-prop-empty-hint {
  padding: 24px 8px;
  text-align: center;
  font-size: 12px;
  color: var(--el-text-color-placeholder, #c0c4cc);
}

.at-prop-global-wrap {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.at-prop-global-intro {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-bottom: 8px;
  border-bottom: 1px dashed var(--el-border-color-lighter, #ebeef5);
}

.at-prop-global-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary, #303133);
}

.at-prop-global-desc {
  font-size: 11px;
  color: var(--el-text-color-placeholder, #a8abb2);
}
</style>
