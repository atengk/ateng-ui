/**
 * 企业级弹窗交互容器组件统一导出。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import AtengDialog from './AtengDialog.vue';

export type AtengDialogInstance = InstanceType<typeof AtengDialog>;

export { AtengDialog };
export default AtengDialog;
export * from './types';
