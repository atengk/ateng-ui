/**
 * 面向企业级管理系统的 Element Plus 基础设施增强组件库与指令集。
 *
 * 架构遵循纯声明式导出契约，支持精确 Tree-shaking 按需引用，同时提供全局插件安装器。
 *
 * @author Ateng
 * @since 2026-10-19
 */

import './styles/index.scss';
import installer from './installer';

export const VERSION: string = '0.1.0';

export * from './installer';
export * from './directives';
export * from './components';

export default installer;
