<script setup lang="ts">
/**
 * AtengFormDesigner 动态表单设计器统领容器。
 *
 * 遵循 ADR-0044 规约：
 * 1. 组合物料面板（AtengFormStencil）、图层大纲树（AtengFormOutlineTree）与中央拖拽画板（AtengFormCanvas）；
 * 2. 调度 useFormDesigner 无头状态机、不可变快照历史栈与多端视口仿真；
 * 3. 接入 AtengFormPropertyPanel 属性自举面板与 #custom-property 插槽逃生门；
 * 4. 支持设计态与运行态（AtengFormRenderer）实时零损无缝切换预览与全屏模式；
 * 5. 显式通过 defineExpose 暴露实例方法族。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { ref } from 'vue';
import type {
  FormSchema,
  ViewportType,
  FormDesignerInstance,
  FormWidget,
  FormConfig,
  ContainerType,
} from '../types';
import { defaultWidgetRegistry } from '../registry';
import type { FormWidgetRegistry } from '../registry';
import { useFormDesigner } from '../composables/useFormDesigner';
import { createDefaultWidget, findWidgetNode } from '../utils/designer';
import AtengFormStencil from './AtengFormStencil.vue';
import AtengFormOutlineTree from './AtengFormOutlineTree.vue';
import AtengFormCanvas from './AtengFormCanvas.vue';
import AtengFormRenderer from './AtengFormRenderer.vue';
import AtengFormDesignerToolbar from './AtengFormDesignerToolbar.vue';
import AtengFormPropertyPanel from './AtengFormPropertyPanel.vue';

interface Props {
  /** 初始表单 Schema */
  schema?: FormSchema;
  /** 快照历史栈最大深度，默认 30 */
  maxHistoryLimit?: number;
  /** 连续输入防抖合并延迟（毫秒），默认 300ms */
  debounceMs?: number;
  /** 默认画布视口 */
  defaultViewport?: ViewportType;
  /** 控件注册中心单例 */
  registry?: FormWidgetRegistry;
}

const props = withDefaults(defineProps<Props>(), {
  schema: undefined,
  maxHistoryLimit: 30,
  debounceMs: 300,
  defaultViewport: 'pc',
  registry: () => defaultWidgetRegistry,
});

const emit = defineEmits<{
  'update:schema': [schema: FormSchema];
  'select-widget': [widget: FormWidget | null];
}>();

// 实例化设计态状态机
const designer = useFormDesigner({
  initialSchema: props.schema,
  maxHistoryLimit: props.maxHistoryLimit,
  debounceMs: props.debounceMs,
  onSchemaChange: s => emit('update:schema', s),
  onSelectWidget: w => emit('select-widget', w),
});

const {
  schema: activeSchema,
  activeWidgetId,
  activeWidget,
  viewport,
  canUndo,
  canRedo,
  selectWidget,
  selectParentWidget,
  addWidget,
  removeWidget,
  moveWidget,
  updateWidget,
  copyWidget,
  clearWidgets,
  undo,
  redo,
  setViewport,
  exportSchema,
  setSchema,
  validateDrop,
} = designer;

// 初始化视口
if (props.defaultViewport) {
  setViewport(props.defaultViewport);
}

// 侧边栏活动 Tab
const activeSideTab = ref<'stencil' | 'outline'>('stencil');

// 预览模式与全屏状态开关
const isPreviewMode = ref<boolean>(false);
const isFullscreen = ref<boolean>(false);
const previewFormData = ref<Record<string, unknown>>({});

// 处理物料添加
const handleAddFromStencil = (item: {
  type: string;
  isContainer?: boolean;
  isCollection?: boolean;
  containerType?: ContainerType;
}): void => {
  const newWidget = createDefaultWidget(item.type, {
    isContainer: item.isContainer,
    isCollection: item.isCollection,
    containerType: item.containerType,
  });

  const targetParentId =
    activeWidget.value &&
    (activeWidget.value.isContainer ||
      activeWidget.value.isCollection ||
      activeWidget.value.type === 'grid' ||
      activeWidget.value.type === 'card' ||
      activeWidget.value.type === 'subform')
      ? activeWidget.value.id
      : null;

  addWidget(newWidget, targetParentId);
};

// 画布内部拖拽或点击添加
const handleCanvasAddWidget = (
  type: string,
  targetParentId: string | null,
  index?: number,
): void => {
  const newWidget = createDefaultWidget(type);
  addWidget(newWidget, targetParentId, index);
};

// 画布内部排序位移
const handleCanvasSortWidget = (
  parentId: string | null,
  oldIndex: number,
  newIndex: number,
): void => {
  if (parentId) {
    const parentNode = findWidgetNode(activeSchema.value.widgetList, parentId);
    const childId = parentNode?.widget.children?.[oldIndex]?.id;
    if (childId) {
      moveWidget(childId, parentId, newIndex);
    }
  } else {
    const rootId = activeSchema.value.widgetList[oldIndex]?.id;
    if (rootId) {
      moveWidget(rootId, null, newIndex);
    }
  }
};

// 属性面板更新控件属性
const handlePropertyPanelUpdateWidget = (patch: Partial<FormWidget>, debounced = true): void => {
  if (activeWidget.value) {
    updateWidget(activeWidget.value.id, patch, debounced);
  }
};

// 属性面板更新全局配置
const handleUpdateFormConfig = (cfg: Partial<FormConfig>): void => {
  activeSchema.value.formConfig = { ...(activeSchema.value.formConfig || {}), ...cfg };
  emit('update:schema', activeSchema.value);
};

// 大纲重命名
const handleOutlineRename = (id: string, newLabel: string): void => {
  updateWidget(id, { label: newLabel }, false);
};

// 暴露实例方法
defineExpose<FormDesignerInstance>({
  getSchema: exportSchema,
  setSchema,
  getActiveWidget: () => activeWidget.value,
  selectWidget,
  clearWidgets,
  undo,
  redo,
  exportSchema,
  setViewport,
});
</script>

<template>
  <div class="at-form-designer" :class="{ 'is-fullscreen': isFullscreen }">
    <!-- 顶部操作工具栏 -->
    <AtengFormDesignerToolbar
      :viewport="viewport"
      :can-undo="canUndo"
      :can-redo="canRedo"
      :is-preview-mode="isPreviewMode"
      :is-fullscreen="isFullscreen"
      @set-viewport="setViewport"
      @undo="undo"
      @redo="redo"
      @clear="clearWidgets"
      @toggle-preview="isPreviewMode = !isPreviewMode"
      @toggle-fullscreen="isFullscreen = !isFullscreen"
    />

    <!-- 中间主工作区 -->
    <div class="at-designer-body">
      <!-- 左侧面板：物料库 / 大纲树 -->
      <aside class="at-designer-sidebar is-left">
        <div class="at-designer-tabs">
          <button
            type="button"
            class="at-designer-tab-btn"
            :class="{ 'is-active': activeSideTab === 'stencil' }"
            @click="activeSideTab = 'stencil'"
          >
            📦 物料库
          </button>
          <button
            type="button"
            class="at-designer-tab-btn"
            :class="{ 'is-active': activeSideTab === 'outline' }"
            @click="activeSideTab = 'outline'"
          >
            🌳 图层大纲 ({{ activeSchema.widgetList.length }})
          </button>
        </div>

        <div class="at-designer-panel-content">
          <AtengFormStencil v-if="activeSideTab === 'stencil'" @add="handleAddFromStencil" />
          <AtengFormOutlineTree
            v-else
            :widgets="activeSchema.widgetList"
            :active-widget-id="activeWidgetId"
            @select="selectWidget"
            @remove="removeWidget"
            @copy="copyWidget"
            @rename="handleOutlineRename"
          />
        </div>
      </aside>

      <!-- 中央主画板 -->
      <main class="at-designer-canvas-wrap">
        <div v-if="isPreviewMode" class="at-designer-preview-wrap">
          <div class="at-designer-preview-card">
            <h3 class="at-designer-preview-title">表单运行态实时填报仿真</h3>
            <AtengFormRenderer
              :schema="activeSchema"
              :form-data="previewFormData"
              @update:form-data="previewFormData = $event"
            />
          </div>
        </div>

        <AtengFormCanvas
          v-else
          :schema="activeSchema"
          :active-widget-id="activeWidgetId"
          :viewport="viewport"
          :validate-drop="validateDrop"
          @select-widget="selectWidget"
          @select-parent="selectParentWidget"
          @add-widget="handleCanvasAddWidget"
          @remove-widget="removeWidget"
          @copy-widget="copyWidget"
          @move-widget="moveWidget"
          @sort-widget="handleCanvasSortWidget"
        />
      </main>

      <!-- 右侧自举属性面板与自定义插槽 -->
      <AtengFormPropertyPanel
        :active-widget="activeWidget"
        :form-config="activeSchema.formConfig"
        :registry="registry"
        @update-widget="handlePropertyPanelUpdateWidget"
        @update-form-config="handleUpdateFormConfig"
      >
        <template #custom-property="slotProps">
          <slot name="custom-property" v-bind="slotProps" />
        </template>
      </AtengFormPropertyPanel>
    </div>
  </div>
</template>

<style scoped>
.at-form-designer {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 580px;
  background: var(--el-bg-color, #ffffff);
  border: 1px solid var(--el-border-color-light, #e4e7ed);
  border-radius: 6px;
  overflow: hidden;
  box-sizing: border-box;
}

.at-form-designer.is-fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 2000;
  border-radius: 0;
  border: none;
}

.at-designer-body {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.at-designer-sidebar {
  width: 260px;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color, #ffffff);
  overflow-y: auto;
  box-sizing: border-box;
}

.at-designer-sidebar.is-left {
  border-right: 1px solid var(--el-border-color-light, #e4e7ed);
}

.at-designer-tabs {
  display: flex;
  border-bottom: 1px solid var(--el-border-color-light, #e4e7ed);
  background: var(--el-fill-color-lighter, #fafafa);
}

.at-designer-tab-btn {
  flex: 1;
  height: 36px;
  border: none;
  background: transparent;
  font-size: 12px;
  font-weight: 500;
  color: var(--el-text-color-secondary, #909399);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s ease;
}

.at-designer-tab-btn.is-active {
  color: var(--el-color-primary, #409eff);
  border-bottom-color: var(--el-color-primary, #409eff);
  background: var(--el-bg-color, #ffffff);
}

.at-designer-panel-content {
  flex: 1;
  overflow-y: auto;
}

.at-designer-canvas-wrap {
  flex: 1;
  display: flex;
  min-width: 0;
  overflow: hidden;
  position: relative;
}

.at-designer-preview-wrap {
  flex: 1;
  padding: 24px;
  background: var(--el-bg-color-page, #f5f7fa);
  overflow-y: auto;
}

.at-designer-preview-card {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px;
  background: var(--el-bg-color, #ffffff);
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}

.at-designer-preview-title {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary, #303133);
}
</style>
