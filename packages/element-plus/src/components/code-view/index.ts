/**
 * AtengCodeView 组件入口。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import AtengCodeView from './AtengCodeView.vue';

export * from './types';
export * from './highlight';
export * from './folding';
export { AtengCodeView };
export type AtengCodeViewInstance = InstanceType<typeof AtengCodeView>;
export default AtengCodeView;
