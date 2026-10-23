/**
 * 自验展厅路由配置。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router';

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/directives/permission',
  },
  {
    path: '/directives/permission',
    name: 'DirectivePermission',
    component: () => import('../views/directives/PermissionView.vue'),
    meta: { title: '权限指令 v-permission' },
  },
  {
    path: '/directives/role',
    name: 'DirectiveRole',
    component: () => import('../views/directives/RoleView.vue'),
    meta: { title: '角色指令 v-role' },
  },
  {
    path: '/directives/idempotent',
    name: 'DirectiveIdempotent',
    component: () => import('../views/directives/IdempotentView.vue'),
    meta: { title: '幂等防重指令 v-idempotent' },
  },
  {
    path: '/directives/copy',
    name: 'DirectiveCopy',
    component: () => import('../views/directives/CopyView.vue'),
    meta: { title: '剪贴板复制指令 v-copy' },
  },
  {
    path: '/directives/watermark',
    name: 'DirectiveWatermark',
    component: () => import('../views/directives/WatermarkView.vue'),
    meta: { title: '动态防篡改水印指令 v-watermark' },
  },
  {
    path: '/containers/dialog',
    name: 'ContainerDialog',
    component: () => import('../views/containers/DialogView.vue'),
    meta: { title: '企业级弹窗容器 AtengDialog' },
  },
  {
    path: '/containers/drawer',
    name: 'ContainerDrawer',
    component: () => import('../views/containers/DrawerView.vue'),
    meta: { title: '企业级抽屉容器 AtengDrawer' },
  },
  {
    path: '/containers/empty',
    name: 'ContainerEmpty',
    component: () => import('../views/containers/EmptyView.vue'),
    meta: { title: '统一缺省态占位 AtengEmpty' },
  },
  {
    path: '/layout/page-container',
    name: 'LayoutPageContainer',
    component: () => import('../views/layout/PageContainerView.vue'),
    meta: { title: '页面主体容器 AtengPageContainer' },
  },
  {
    path: '/layout/split-layout',
    name: 'LayoutSplitLayout',
    component: () => import('../views/layout/SplitLayoutView.vue'),
    meta: { title: '弹性分栏容器 AtengSplitLayout' },
  },
  {
    path: '/layout/footer-bar',
    name: 'LayoutFooterBar',
    component: () => import('../views/layout/FooterBarView.vue'),
    meta: { title: '吸底操作栏 AtengFooterBar' },
  },
  {
    path: '/layout/card',
    name: 'LayoutCard',
    component: () => import('../views/layout/CardView.vue'),
    meta: { title: '结构化卡片 AtengCard' },
  },
  {
    path: '/layout/card-group',
    name: 'LayoutCardGroup',
    component: () => import('../views/layout/CardGroupView.vue'),
    meta: { title: '卡片手风琴编排 AtengCardGroup' },
  },
  {
    path: '/layout/skeleton',
    name: 'LayoutSkeleton',
    component: () => import('../views/layout/SkeletonView.vue'),
    meta: { title: '页面骨架屏 AtengPageSkeleton' },
  },
  {
    path: '/layout/watermark',
    name: 'LayoutWatermark',
    component: () => import('../views/layout/WatermarkView.vue'),
    meta: { title: '安全防篡改水印容器 AtengWatermark' },
  },
  {
    path: '/layout/grid',
    name: 'LayoutGrid',
    component: () => import('../views/layout/GridView.vue'),
    meta: { title: '容器自适应流式网格 AtengGrid' },
  },
  {
    path: '/table/query-form',
    name: 'TableQueryForm',
    component: () => import('../views/table/QueryFormView.vue'),
    meta: { title: '响应式搜索表单 AtengQueryForm' },
  },
  {
    path: '/table/crud',
    name: 'TableCrud',
    component: () => import('../views/table/TableCrudView.vue'),
    meta: { title: '综合表格沙箱 AtengTable' },
  },
  {
    path: '/business/dict',
    name: 'BusinessDict',
    component: () => import('../views/business/DictView.vue'),
    meta: { title: '字典套件 AtengDict' },
  },
  {
    path: '/business/descriptions',
    name: 'BusinessDescriptions',
    component: () => import('../views/business/DescriptionsView.vue'),
    meta: { title: '结构化数据详情 AtengDescriptions' },
  },
  {
    path: '/business/date-range',
    name: 'BusinessDateRange',
    component: () => import('../views/business/DateRangeView.vue'),
    meta: { title: '快捷时间范围选择器 AtengDateRange' },
  },
  {
    path: '/business/excel-feedback',
    name: 'BusinessExcelFeedback',
    component: () => import('../views/business/ExcelFeedbackView.vue'),
    meta: { title: '导入错误明细反馈 AtengExcelFeedback' },
  },
  {
    path: '/business/upload',
    name: 'BusinessUpload',
    component: () => import('../views/business/UploadView.vue'),
    meta: { title: '多源切片上传器 AtengUpload' },
  },
  {
    path: '/business/stream-text',
    name: 'BusinessStreamText',
    component: () => import('../views/business/StreamTextView.vue'),
    meta: { title: '流式打字机 AtengStreamText' },
  },
  {
    path: '/business/log-viewer',
    name: 'BusinessLogViewer',
    component: () => import('../views/business/LogViewerView.vue'),
    meta: { title: '实时日志终端 AtengLogViewer' },
  },
  {
    path: '/business/statistic',
    name: 'BusinessStatistic',
    component: () => import('../views/business/StatisticView.vue'),
    meta: { title: '指标翻牌统计 AtengStatistic' },
  },
  {
    path: '/business/code-view',
    name: 'BusinessCodeView',
    component: () => import('../views/business/CodeViewView.vue'),
    meta: { title: '源码数据高亮 AtengCodeView' },
  },
  {
    path: '/business/icon-select',
    name: 'BusinessIconSelect',
    component: () => import('../views/business/IconSelectView.vue'),
    meta: { title: '通用图标选择器 AtengIconSelect' },
  },
  {
    path: '/business/captcha',
    name: 'BusinessCaptcha',
    component: () => import('../views/business/CaptchaView.vue'),
    meta: { title: '验证码防刷新倒计时 AtengCaptcha' },
  },
  {
    path: '/business/file-preview',
    name: 'BusinessFilePreview',
    component: () => import('../views/business/FilePreviewView.vue'),
    meta: { title: '多格式文件预览 AtengFilePreview' },
  },
  {
    path: '/theme-pro',
    name: 'ThemeProPanorama',
    component: () => import('../views/theme/ThemeProPanoramaView.vue'),
    meta: { title: '旗舰全景实装大沙箱 (Theme Pro)' },
  },
  {
    path: '/theme/buttons-inputs',
    name: 'ThemeButtonsInputs',
    component: () => import('../views/theme/ButtonsInputsView.vue'),
    meta: { title: '主按钮与表单控件 (Theme Pro)' },
  },
  {
    path: '/theme/tables',
    name: 'ThemeTables',
    component: () => import('../views/theme/TablesView.vue'),
    meta: { title: '流体表格与防抖 (Theme Pro)' },
  },
  {
    path: '/theme/tags-overlays',
    name: 'ThemeTagsOverlays',
    component: () => import('../views/theme/TagsOverlaysView.vue'),
    meta: { title: '标签开关与浮层 (Theme Pro)' },
  },
  {
    path: '/theme/tenant',
    name: 'ThemeTenant',
    component: () => import('../views/theme/TenantThemeView.vue'),
    meta: { title: '租户换肤 API (Theme Pro)' },
  },
  {
    path: '/theme/cards-navigations',
    name: 'ThemeCardsNavigations',
    component: () => import('../views/theme/CardsNavigationsView.vue'),
    meta: { title: '卡片与导航选择 (Theme Pro)' },
  },
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
