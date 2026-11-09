/**
 * @atengk/form-designer-vue 顶级公开导出入口。
 *
 * 遵循 ADR-0009（洋葱拓扑）、ADR-0015（无隐式副作用，纯声明式导出）与 ADR-0044 规约。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import type { App } from 'vue';
import AtengFormRenderer from './components/AtengFormRenderer.vue';
import AtengFormDesigner from './components/AtengFormDesigner.vue';
import AtengFormCanvas from './components/AtengFormCanvas.vue';
import AtengFormCanvasItem from './components/AtengFormCanvasItem.vue';
import AtengFormStencil from './components/AtengFormStencil.vue';
import AtengFormOutlineTree from './components/AtengFormOutlineTree.vue';
import AtengFormDesignerToolbar from './components/AtengFormDesignerToolbar.vue';
import AtengFormPropertyPanel from './components/AtengFormPropertyPanel.vue';
import AtengFormQuickPropertyPanel from './components/AtengFormQuickPropertyPanel.vue';
import AtengFormCanvasLeaf from './components/AtengFormCanvasLeaf.vue';
import AtengFormCodeDrawer from './components/AtengFormCodeDrawer.vue';
import AtengSignature from './presets/element-plus/components/AtengSignature.vue';

// 导出运行态与设计态组件
export {
  AtengFormRenderer,
  AtengFormDesigner,
  AtengFormDesignerToolbar,
  AtengFormPropertyPanel,
  AtengFormQuickPropertyPanel,
  AtengFormCanvas,
  AtengFormCanvasItem,
  AtengFormCanvasLeaf,
  AtengFormStencil,
  AtengFormOutlineTree,
  AtengFormCodeDrawer,
};
export { default as AtengFormItemRenderer } from './components/AtengFormItemRenderer.vue';
export { AtengFormGrid, AtengFormCard, AtengSubForm } from './containers';

// 导出无头状态机 Hooks 与不可变历史栈
export { useFormRenderer } from './composables/useFormRenderer';
export type { UseFormRendererOptions } from './composables/useFormRenderer';
export { useFormDesigner, createEmptySchema } from './composables/useFormDesigner';
export { FormHistoryStack } from './history';

// 导出异步校验引擎
export { AsyncValidatorEngine } from './validator/AsyncValidatorEngine';
export type { ValidationResult } from './validator/AsyncValidatorEngine';

// 导出零 eval 动态规则与算术 AST 解释器
export { SafeMathEvaluator, DynamicRuleEngine } from './rules';
export type { WidgetBaselineState, EvaluatedWidgetState } from './rules';

// 导出控件注册中心与原生适配器
export { FormWidgetRegistry, defaultWidgetRegistry } from './registry';
export {
  registerNativeWidgets,
  nativeWidgetAdapters,
  nativeInputAdapter,
  nativeTextareaAdapter,
  nativeSelectAdapter,
  nativeCheckboxAdapter,
  nativeRadioAdapter,
} from './widgets/native';

// 导出容灾草稿箱与代码生成器
export { DraftManager, createDraftManager } from './storage';
export { CodeGenerator } from './generator';

// 导出数据源与 Element Plus 官方适配套件
export * from './datasource';
export * from './presets/element-plus';

// 导出工具函数
export { getByPath, setByPath, parsePath, safeClone } from './utils/path';
export {
  validateDropTarget,
  createDefaultWidget,
  cloneWidgetWithNewIds,
  findWidgetNode,
  isDescendantOf,
  generateWidgetId,
} from './utils/designer';
export { getWidgetPropsConfigSchema, globalFormConfigSchema } from './utils/propertyPresets';
export {
  formatReadonlyValue,
  formatCurrency,
  formatPhone,
  formatIdCard,
  formatEmail,
  formatDate,
} from './utils/format';
export type { ReadonlyFormatType, ReadonlyFormatOptions } from './utils/format';

// 导出全量强类型声明
export type {
  FieldPermission,
  FieldPermissionMatrix,
  ContainerType,
  LayoutContainerProps,
  SubFormProps,
  WidgetLayout,
  FormRule,
  DynamicCondition,
  DynamicAction,
  DynamicRule,
  FormWidget,
  FormConfig,
  FormSchema,
  FormWidgetCategory,
  WidgetRenderContext,
  FormWidgetAdapter,
  FormValidationErrors,
  FormRendererInstance,
  ViewportType,
  DropValidationResult,
  StencilItem,
  FormHistoryStackOptions,
  UseFormDesignerOptions,
  UseFormDesignerReturn,
  FormDesignerInstance,
  DraftRecord,
  DraftManagerOptions,
  CodeGeneratorTarget,
  VueSfcGenOptions,
  StandardJsonSchema,
  StandardJsonSchemaProperty,
} from './types';

/**
 * Vue 插件安装门面（显式安装调用，零隐式自注册副作用）。
 */
export function install(app: App): void {
  app.component('AtengFormRenderer', AtengFormRenderer);
  app.component('AtengFormDesigner', AtengFormDesigner);
  app.component('AtengFormCanvas', AtengFormCanvas);
  app.component('AtengFormStencil', AtengFormStencil);
  app.component('AtengFormOutlineTree', AtengFormOutlineTree);
  app.component('AtengFormPropertyPanel', AtengFormPropertyPanel);
  app.component('AtengFormCodeDrawer', AtengFormCodeDrawer);
  app.component('AtengSignature', AtengSignature);
}

export default {
  install,
};
