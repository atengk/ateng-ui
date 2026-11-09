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
import AtengFormQuickPropertyPanel from './components/AtengFormQuickPropertyPanel.vue';
import AtengFormCanvasLeaf from './components/AtengFormCanvasLeaf.vue';

// 导出运行态与设计态组件
export {
  AtengFormRenderer,
  AtengFormDesigner,
  AtengFormDesignerToolbar,
  AtengFormQuickPropertyPanel,
  AtengFormCanvas,
  AtengFormCanvasItem,
  AtengFormCanvasLeaf,
  AtengFormStencil,
  AtengFormOutlineTree,
};
export { default as AtengFormItemRenderer } from './components/AtengFormItemRenderer.vue';
export { AtengFormGrid, AtengFormCard, AtengSubForm } from './containers';

// 导出无头状态机 Hooks
export { useFormRenderer } from './composables/useFormRenderer';
export type { UseFormRendererOptions } from './composables/useFormRenderer';
export { useFormDesigner, createEmptySchema } from './composables/useFormDesigner';

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
  UseFormDesignerOptions,
  UseFormDesignerReturn,
  FormDesignerInstance,
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
}

export default {
  install,
};
