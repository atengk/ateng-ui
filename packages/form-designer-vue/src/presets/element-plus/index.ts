/**
 * @atengk/form-designer-vue/presets/element-plus 次级官方预设导出入口。
 *
 * 遵循 ADR-0015、ADR-0039 与 ADR-0044 规约：
 * 纯声明式导出 Element Plus 15 种表单控件适配器、兄弟生态物料装配器与签名板组件。
 *
 * @author Ateng
 * @since 2026-11-09
 */

export * from './widgets';
export * from './ecosystem';
export * from './register';
export { default as AtengSignature } from './components/AtengSignature.vue';
