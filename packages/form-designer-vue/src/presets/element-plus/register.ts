/**
 * Element Plus 适配预设与生态物料注册工厂。
 *
 * 遵循 ADR-0015（显式安装门面）与 ADR-0044 规约。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import { FormWidgetRegistry, defaultWidgetRegistry } from '../../registry';
import { elementPlusAdapters } from './widgets';
import {
  createEditorWidgetAdapter,
  createCodeEditorWidgetAdapter,
  createSignatureWidgetAdapter,
  createUploadWidgetAdapter,
  type EcosystemWidgetsOptions,
} from './ecosystem';

/**
 * 注册 Element Plus 官方 15 种高频标准表单控件适配器。
 */
export function registerElementPlusWidgets(
  registry: FormWidgetRegistry = defaultWidgetRegistry,
): FormWidgetRegistry {
  for (const adapter of elementPlusAdapters) {
    registry.register(adapter);
  }
  return registry;
}

/**
 * 注册兄弟生态物料适配器（富文本、代码编辑器、手写签名、切片上传）。
 */
export function registerEcosystemWidgets(
  registry: FormWidgetRegistry = defaultWidgetRegistry,
  options: EcosystemWidgetsOptions = {},
): FormWidgetRegistry {
  registry.register(createEditorWidgetAdapter(options.editorComponent));
  registry.register(createCodeEditorWidgetAdapter(options.codeEditorComponent));
  registry.register(createSignatureWidgetAdapter(options.signatureComponent));
  registry.register(createUploadWidgetAdapter(options.uploadComponent));
  return registry;
}

/**
 * 一键安装全套 Element Plus 官方控件与兄弟生态物料。
 */
export function installElementPlusPreset(
  registry: FormWidgetRegistry = defaultWidgetRegistry,
  ecosystemOptions: EcosystemWidgetsOptions = {},
): FormWidgetRegistry {
  registerElementPlusWidgets(registry);
  registerEcosystemWidgets(registry, ecosystemOptions);
  return registry;
}
