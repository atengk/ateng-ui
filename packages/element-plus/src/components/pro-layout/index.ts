/**
 * AtengProLayout 框架布局套件统一导出入口。
 *
 * @author Ateng
 * @since 2026-10-29
 */

import AtengProLayout from './AtengProLayout.vue';

export { AtengProLayout };
export { AtengProLayout as AtProLayout };

export type AtengProLayoutInstance = InstanceType<typeof AtengProLayout>;

export { ATENG_PRO_LAYOUT_KEY } from './types';

export type {
  ProLayoutMode,
  ProMenuItem,
  ProMenuFieldNames,
  AtengProLayoutProps,
  AtengProLayoutEmits,
  AtengProLayoutSlots,
  AtengProLayoutExpose,
  AtengProLayoutContext,
} from './types';
