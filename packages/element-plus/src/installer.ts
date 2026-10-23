/**
 * Element Plus 增强套件全局插件安装器。
 *
 * 提供集中化 Vue 插件安装机制，显式按需注册所有组件与指令，绝无隐式全局副作用。
 * 支持标准 PascalCase 原名（如 AtengTable）与便捷别名（如 AtTable）。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import type { App, Component, Plugin } from 'vue';
import { AtengDialog } from './components/dialog';
import { AtengDrawer } from './components/drawer';
import { AtengEmpty } from './components/empty';
import { AtengPageContainer } from './components/page-container';
import { AtengSplitLayout } from './components/split-layout';
import { AtengFooterBar } from './components/footer-bar';
import { AtengCard, AtengCardGroup } from './components/card';
import { AtengPageSkeleton } from './components/page-skeleton';
import { AtengQueryForm } from './components/query-form';
import { AtengTable } from './components/table';
import {
  AtengDictSelect,
  AtengDictRadio,
  AtengDictCheckbox,
  AtengDictTag,
  DictManager,
  type DictProvider,
} from './components/dict';
import { AtengDescriptions, AtengDescriptionsItem } from './components/descriptions';
import { AtengDateRange } from './components/date-range';
import { AtengExcelFeedback } from './components/excel-feedback';
import { AtengExcelExport } from './components/excel-export';
import { AtengUpload } from './components/upload';
import { AtengStreamText } from './components/stream-text';
import { AtengLogViewer } from './components/log-viewer';
import { AtengStatistic } from './components/statistic';
import { AtengCodeView } from './components/code-view';
import { AtengIconSelect } from './components/icon-select';
import { AtengCaptcha } from './components/captcha';
import { AtengFilePreview } from './components/file-preview';
import { AtengWatermark } from './components/watermark';
import { AtengGrid } from './components/grid';
import { AtengAnchor } from './components/anchor';
import { AtengLoading } from './loading';
import { vPermission } from './directives/permission';
import { vRole } from './directives/role';
import { vIdempotent } from './directives/idempotent';
import { vCopy } from './directives/copy';
import { vWatermark } from './directives/watermark';

const INSTALLED_KEY = Symbol('ATENG_ELEMENT_PLUS_INSTALLED');

/**
 * 插件安装选项。
 */
export interface AtengElementPlusOptions {
  /**
   * 全局字典数据源提供者接口。
   */
  dictProvider?: DictProvider;
}

/**
 * 套件全部核心组件映射表。
 */
const components: Record<string, Component> = {
  AtengDialog,
  AtengDrawer,
  AtengEmpty,
  AtengPageContainer,
  AtengSplitLayout,
  AtengFooterBar,
  AtengCard,
  AtengCardGroup,
  AtengPageSkeleton,
  AtengQueryForm,
  AtengTable,
  AtengDictSelect,
  AtengDictRadio,
  AtengDictCheckbox,
  AtengDictTag,
  AtengDescriptions,
  AtengDescriptionsItem,
  AtengDateRange,
  AtengExcelFeedback,
  AtengExcelExport,
  AtengUpload,
  AtengStreamText,
  AtengLogViewer,
  AtengStatistic,
  AtengCodeView,
  AtengIconSelect,
  AtengCaptcha,
  AtengFilePreview,
  AtengWatermark,
  AtengGrid,
  AtengAnchor,
  AtengLoading,
};

/**
 * 注册套件内全部组件与指令到目标 Vue 应用实例。
 *
 * @param app Vue 应用实例
 * @param options 安装可选配置项
 */
export function install(app: App, options?: AtengElementPlusOptions): void {
  // 1. 防重复安装幂等保护
  const appRecord = app as unknown as Record<symbol, boolean>;
  if (appRecord[INSTALLED_KEY]) {
    return;
  }
  appRecord[INSTALLED_KEY] = true;

  // 2. 批量注册公共组件（支持 Ateng* 原名与 At* 规范别名）
  Object.entries(components).forEach(([name, comp]) => {
    app.component(name, comp);
    const atAlias = name.replace(/^Ateng/, 'At');
    if (atAlias !== name) {
      app.component(atAlias, comp);
    }
  });

  // 3. 批量注册操作指令
  app.directive('permission', vPermission);
  app.directive('role', vRole);
  app.directive('idempotent', vIdempotent);
  app.directive('copy', vCopy);
  app.directive('watermark', vWatermark);

  // 4. 全局注入与绑定 DictManager
  app.config.globalProperties.$dictManager = DictManager;
  app.provide('DICT_MANAGER', DictManager);
  if (options?.dictProvider) {
    DictManager.setProvider(options.dictProvider);
  }
}

/**
 * Vue 插件标准导出对象。
 */
export const installer: Plugin = {
  install,
};

export default installer;
