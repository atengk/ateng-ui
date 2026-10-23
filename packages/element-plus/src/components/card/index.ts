/**
 * 企业级结构化卡片面板与卡片组容器统一导出。
 *
 * @author Ateng
 * @since 2026-10-22
 */

import AtengCard from './AtengCard.vue';
import AtengCardGroup from './AtengCardGroup.vue';

export type AtengCardInstance = InstanceType<typeof AtengCard>;
export type AtengCardGroupInstance = InstanceType<typeof AtengCardGroup>;

export { AtengCard, AtengCardGroup };
export default AtengCard;
export * from './types';
