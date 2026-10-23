/**
 * 企业级容器查询自适应流式网格组件统一导出。
 *
 * @author Ateng
 * @since 2026-10-23
 */

import AtengGrid from './AtengGrid.vue';

export type AtengGridInstance = InstanceType<typeof AtengGrid>;

export { AtengGrid };
export default AtengGrid;
export * from './types';
