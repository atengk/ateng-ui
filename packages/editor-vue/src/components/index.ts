/**
 * @atengk/editor-vue 组件统一导出。
 *
 * @author Ateng
 * @since 2026-10-30
 */

export { default as AtengEditor } from './AtengEditor.vue';
export { default as AtengSimpleEditor } from './AtengSimpleEditor.vue';
export { default as AtengEditorToolbar } from './AtengEditorToolbar.vue';
export { default as AtengSimpleToolbar } from './AtengSimpleToolbar.vue';
export { default as AtengTableBubbleMenu } from './AtengTableBubbleMenu.vue';
export { default as AtengImageBubbleMenu } from './AtengImageBubbleMenu.vue';
export { default as AtengLinkBubbleMenu } from './AtengLinkBubbleMenu.vue';
export { default as AtengBubbleMenu } from './AtengBubbleMenu.vue';
export { default as AtengSlashCommand } from './AtengSlashCommand.vue';
export { default as AtengStatusBar } from './AtengStatusBar.vue';

export type AtengEditorInstance = InstanceType<typeof import('./AtengEditor.vue').default>;
export type AtengSimpleEditorInstance = InstanceType<
  typeof import('./AtengSimpleEditor.vue').default
>;
export type AtengEditorToolbarInstance = InstanceType<
  typeof import('./AtengEditorToolbar.vue').default
>;
export type AtengSimpleToolbarInstance = InstanceType<
  typeof import('./AtengSimpleToolbar.vue').default
>;
export type AtengTableBubbleMenuInstance = InstanceType<
  typeof import('./AtengTableBubbleMenu.vue').default
>;
export type AtengImageBubbleMenuInstance = InstanceType<
  typeof import('./AtengImageBubbleMenu.vue').default
>;
export type AtengLinkBubbleMenuInstance = InstanceType<
  typeof import('./AtengLinkBubbleMenu.vue').default
>;
export type AtengBubbleMenuInstance = InstanceType<typeof import('./AtengBubbleMenu.vue').default>;
export type AtengSlashCommandInstance = InstanceType<
  typeof import('./AtengSlashCommand.vue').default
>;
export type AtengStatusBarInstance = InstanceType<typeof import('./AtengStatusBar.vue').default>;
