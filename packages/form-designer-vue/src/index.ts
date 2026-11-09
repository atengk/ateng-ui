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

// 导出组件
export { AtengFormRenderer };

// 导出无头状态机 Hooks
export { useFormRenderer } from './composables/useFormRenderer';
export type { UseFormRendererOptions } from './composables/useFormRenderer';

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
export { getByPath, setByPath, parsePath } from './utils/path';

// 导出全量强类型声明
export type {
  FieldPermission,
  FieldPermissionMatrix,
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
} from './types';

/**
 * Vue 插件安装门面（显式安装调用，零隐式自注册副作用）。
 */
export function install(app: App): void {
  app.component('AtengFormRenderer', AtengFormRenderer);
}

export default {
  install,
};
