/**
 * 企业级抽屉交互容器组件统一导出。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import AtengDrawer from './AtengDrawer.vue';

export type AtengDrawerInstance = InstanceType<typeof AtengDrawer>;

export { AtengDrawer };
export default AtengDrawer;
export * from './types';
