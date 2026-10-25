/**
 * 纯无状态基础布局架构套件统一入口导出。
 *
 * @author Ateng
 * @since 2026-10-25
 */

import AtengLayout from './AtengLayout.vue';
import AtengHeader from './AtengHeader.vue';
import AtengAside from './AtengAside.vue';
import AtengContent from './AtengContent.vue';
import AtengFooter from './AtengFooter.vue';

export { AtengLayout, AtengHeader, AtengAside, AtengContent, AtengFooter };

export type AtengLayoutInstance = InstanceType<typeof AtengLayout>;
export type AtengHeaderInstance = InstanceType<typeof AtengHeader>;
export type AtengAsideInstance = InstanceType<typeof AtengAside>;
export type AtengContentInstance = InstanceType<typeof AtengContent>;
export type AtengFooterInstance = InstanceType<typeof AtengFooter>;

export * from './types';
