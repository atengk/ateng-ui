/**
 * Vue 全局组件类型声明扩展（Volar / vue-tsc 支持）。
 *
 * 为通过 `app.use(AtengElementPlus)` 全局注册的全部 39 个 `Ateng*` 组件及对应 `At*` 别名
 * 提供强类型模板提示（Props / Emits / Slots / Ref 实例）。
 *
 * @author Ateng
 * @since 2026-11-24
 */

import type {
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
  AtengLayout,
  AtengHeader,
  AtengAside,
  AtengContent,
  AtengFooter,
  AtengTabsNav,
  AtengProLayout,
} from './components';
import type { AtengLoading } from './loading';

export {};

declare module 'vue' {
  export interface GlobalComponents {
    AtengDialog: typeof AtengDialog;
    AtDialog: typeof AtengDialog;
    AtengDrawer: typeof AtengDrawer;
    AtDrawer: typeof AtengDrawer;
    AtengEmpty: typeof AtengEmpty;
    AtEmpty: typeof AtengEmpty;
    AtengPageContainer: typeof AtengPageContainer;
    AtPageContainer: typeof AtengPageContainer;
    AtengSplitLayout: typeof AtengSplitLayout;
    AtSplitLayout: typeof AtengSplitLayout;
    AtengFooterBar: typeof AtengFooterBar;
    AtFooterBar: typeof AtengFooterBar;
    AtengCard: typeof AtengCard;
    AtCard: typeof AtengCard;
    AtengCardGroup: typeof AtengCardGroup;
    AtCardGroup: typeof AtengCardGroup;
    AtengPageSkeleton: typeof AtengPageSkeleton;
    AtPageSkeleton: typeof AtengPageSkeleton;
    AtengQueryForm: typeof AtengQueryForm;
    AtQueryForm: typeof AtengQueryForm;
    AtengTable: typeof AtengTable;
    AtTable: typeof AtengTable;
    AtengDictSelect: typeof AtengDictSelect;
    AtDictSelect: typeof AtengDictSelect;
    AtengDictRadio: typeof AtengDictRadio;
    AtDictRadio: typeof AtengDictRadio;
    AtengDictCheckbox: typeof AtengDictCheckbox;
    AtDictCheckbox: typeof AtengDictCheckbox;
    AtengDictTag: typeof AtengDictTag;
    AtDictTag: typeof AtengDictTag;
    AtengDescriptions: typeof AtengDescriptions;
    AtDescriptions: typeof AtengDescriptions;
    AtengDescriptionsItem: typeof AtengDescriptionsItem;
    AtDescriptionsItem: typeof AtengDescriptionsItem;
    AtengDateRange: typeof AtengDateRange;
    AtDateRange: typeof AtengDateRange;
    AtengExcelFeedback: typeof AtengExcelFeedback;
    AtExcelFeedback: typeof AtengExcelFeedback;
    AtengExcelExport: typeof AtengExcelExport;
    AtExcelExport: typeof AtengExcelExport;
    AtengUpload: typeof AtengUpload;
    AtUpload: typeof AtengUpload;
    AtengStreamText: typeof AtengStreamText;
    AtStreamText: typeof AtengStreamText;
    AtengLogViewer: typeof AtengLogViewer;
    AtLogViewer: typeof AtengLogViewer;
    AtengStatistic: typeof AtengStatistic;
    AtStatistic: typeof AtengStatistic;
    AtengCodeView: typeof AtengCodeView;
    AtCodeView: typeof AtengCodeView;
    AtengIconSelect: typeof AtengIconSelect;
    AtIconSelect: typeof AtengIconSelect;
    AtengCaptcha: typeof AtengCaptcha;
    AtCaptcha: typeof AtengCaptcha;
    AtengFilePreview: typeof AtengFilePreview;
    AtFilePreview: typeof AtengFilePreview;
    AtengWatermark: typeof AtengWatermark;
    AtWatermark: typeof AtengWatermark;
    AtengGrid: typeof AtengGrid;
    AtGrid: typeof AtengGrid;
    AtengAnchor: typeof AtengAnchor;
    AtAnchor: typeof AtengAnchor;
    AtengLayout: typeof AtengLayout;
    AtLayout: typeof AtengLayout;
    AtengHeader: typeof AtengHeader;
    AtHeader: typeof AtengHeader;
    AtengAside: typeof AtengAside;
    AtAside: typeof AtengAside;
    AtengContent: typeof AtengContent;
    AtContent: typeof AtengContent;
    AtengFooter: typeof AtengFooter;
    AtFooter: typeof AtengFooter;
    AtengTabsNav: typeof AtengTabsNav;
    AtTabsNav: typeof AtengTabsNav;
    AtengProLayout: typeof AtengProLayout;
    AtProLayout: typeof AtengProLayout;
    AtengLoading: typeof AtengLoading;
    AtLoading: typeof AtengLoading;
  }
}
