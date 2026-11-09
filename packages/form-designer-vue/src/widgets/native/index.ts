/**
 * @atengk/form-designer-vue 原生 HTML5 保底控件注册器。
 *
 * 为 L2 扩展层提供 100% 零依赖、跨框架纯净的原生控件池（Input, Textarea, Select, Checkbox, Radio）。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import type { FormWidgetAdapter } from '../../types';
import type { FormWidgetRegistry } from '../../registry';
import { defaultWidgetRegistry } from '../../registry';
import NativeInput from './NativeInput.vue';
import NativeTextarea from './NativeTextarea.vue';
import NativeSelect from './NativeSelect.vue';
import NativeCheckbox from './NativeCheckbox.vue';
import NativeRadio from './NativeRadio.vue';

export const nativeInputAdapter: FormWidgetAdapter = {
  type: 'input',
  label: '单行输入',
  category: 'basic',
  defaultProps: {
    type: 'text',
  },
  defaultValue: '',
  component: NativeInput,
};

export const nativeTextareaAdapter: FormWidgetAdapter = {
  type: 'textarea',
  label: '多行输入',
  category: 'basic',
  defaultProps: {
    rows: 3,
  },
  defaultValue: '',
  component: NativeTextarea,
};

export const nativeSelectAdapter: FormWidgetAdapter = {
  type: 'select',
  label: '下拉选择',
  category: 'basic',
  defaultValue: '',
  component: NativeSelect,
};

export const nativeCheckboxAdapter: FormWidgetAdapter = {
  type: 'checkbox',
  label: '复选框',
  category: 'basic',
  defaultValue: [],
  component: NativeCheckbox,
};

export const nativeRadioAdapter: FormWidgetAdapter = {
  type: 'radio',
  label: '单选框',
  category: 'basic',
  defaultValue: '',
  component: NativeRadio,
};

/**
 * 原生保底控件适配器全量列表。
 */
export const nativeWidgetAdapters: FormWidgetAdapter[] = [
  nativeInputAdapter,
  nativeTextareaAdapter,
  nativeSelectAdapter,
  nativeCheckboxAdapter,
  nativeRadioAdapter,
];

/**
 * 注册所有原生 HTML5 保底控件至指定的控件注册中心。
 *
 * @param registry 目标注册中心，默认为 defaultWidgetRegistry
 */
export function registerNativeWidgets(registry: FormWidgetRegistry = defaultWidgetRegistry): void {
  registry.registerBatch(nativeWidgetAdapters);
}

// 默认自动注册至全局单例注册中心，确保开箱即用
registerNativeWidgets(defaultWidgetRegistry);

export { NativeInput, NativeTextarea, NativeSelect, NativeCheckbox, NativeRadio };
