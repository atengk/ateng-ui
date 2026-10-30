/**
 * @atengk/editor-vue 组件统一导出。
 *
 * @author Ateng
 * @since 2026-10-30
 */

export { default as AtengEditor } from './AtengEditor.vue';
export { default as AtengEditorToolbar } from './AtengEditorToolbar.vue';
export { default as AtengTableBubbleMenu } from './AtengTableBubbleMenu.vue';

export type AtengEditorInstance = InstanceType<typeof import('./AtengEditor.vue').default>;
export type AtengEditorToolbarInstance = InstanceType<
  typeof import('./AtengEditorToolbar.vue').default
>;
export type AtengTableBubbleMenuInstance = InstanceType<
  typeof import('./AtengTableBubbleMenu.vue').default
>;
