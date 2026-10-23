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
export * from './theme';

// 便捷别名导出（与 Ateng* 形成双轨具名导出支持）
export {
  AtengDialog as AtDialog,
  AtengDrawer as AtDrawer,
  AtengEmpty as AtEmpty,
  AtengPageContainer as AtPageContainer,
  AtengSplitLayout as AtSplitLayout,
  AtengFooterBar as AtFooterBar,
  AtengCard as AtCard,
  AtengCardGroup as AtCardGroup,
  AtengPageSkeleton as AtPageSkeleton,
  AtengQueryForm as AtQueryForm,
  AtengTable as AtTable,
  AtengDictSelect as AtDictSelect,
  AtengDictRadio as AtDictRadio,
  AtengDictCheckbox as AtDictCheckbox,
  AtengDictTag as AtDictTag,
  AtengDescriptions as AtDescriptions,
  AtengDescriptionsItem as AtDescriptionsItem,
  AtengDateRange as AtDateRange,
  AtengExcelFeedback as AtExcelFeedback,
  AtengExcelExport as AtExcelExport,
  AtengUpload as AtUpload,
  AtengStreamText as AtStreamText,
  AtengLogViewer as AtLogViewer,
  AtengStatistic as AtStatistic,
  AtengCodeView as AtCodeView,
  AtengIconSelect as AtIconSelect,
  AtengCaptcha as AtCaptcha,
  AtengFilePreview as AtFilePreview,
  AtengWatermark as AtWatermark,
  AtengGrid as AtGrid,
} from './components';

export default installer;
