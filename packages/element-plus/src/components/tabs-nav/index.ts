/**
 * AtengTabsNav 多标签页导航组件统一出口。
 *
 * @author Ateng
 * @since 2026-10-29
 */

import AtengTabsNav from './AtengTabsNav.vue';

export { AtengTabsNav };
export type AtengTabsNavInstance = InstanceType<typeof AtengTabsNav>;
export * from './types';
export * from './useTabsScroll';
export * from './useTabsDrag';
