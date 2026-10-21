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
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
