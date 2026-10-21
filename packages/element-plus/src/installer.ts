/**
 * Element Plus 增强套件全局插件安装器。
 *
 * 提供集中化 Vue 插件安装机制，显式按需注册所有组件与指令，绝无隐式全局副作用。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import type { App, Plugin } from 'vue';
import { AtengDialog } from './components/dialog';
import { AtengDrawer } from './components/drawer';
import { AtengEmpty } from './components/empty';
import { AtengQueryForm } from './components/query-form';
import { AtengTable } from './components/table';
import { vPermission } from './directives/permission';
import { vRole } from './directives/role';
import { vIdempotent } from './directives/idempotent';
import { vCopy } from './directives/copy';
import { vWatermark } from './directives/watermark';

const INSTALLED_KEY = Symbol('ATENG_ELEMENT_PLUS_INSTALLED');

/**
 * 注册套件内全部组件与指令到目标 Vue 应用实例。
 *
 * @param app Vue 应用实例
 */
export function install(app: App): void {
  // 1. 防重复安装幂等保护
  const appRecord = app as unknown as Record<symbol, boolean>;
  if (appRecord[INSTALLED_KEY]) {
    return;
  }
  appRecord[INSTALLED_KEY] = true;

  // 2. 批量注册公共组件（严格遵循 PascalCase 规范命名，拒绝混乱别名）
  app.component('AtengDialog', AtengDialog);
  app.component('AtengDrawer', AtengDrawer);
  app.component('AtengEmpty', AtengEmpty);
  app.component('AtengQueryForm', AtengQueryForm);
  app.component('AtengTable', AtengTable);

  // 3. 批量注册操作指令
  app.directive('permission', vPermission);
  app.directive('role', vRole);
  app.directive('idempotent', vIdempotent);
  app.directive('copy', vCopy);
  app.directive('watermark', vWatermark);
}

/**
 * Vue 插件标准导出对象。
 */
export const installer: Plugin = {
  install,
};

export default installer;
