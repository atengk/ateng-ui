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
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
