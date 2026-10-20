<script setup lang="ts">
/**
 * sample-vue 响应式鉴权与多租户切片自验卡片组件。
 *
 * 演示 useAuth 登录态流转、双轨 Token、细粒度权限 (hasPermission) 与角色 (hasRole) 响应式联动，
 * 以及 useTenant 租户切片动态切换。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import { authManager } from '@atengk/core';
import { useAuth, useTenant } from '@atengk/vue';

// 实例化全局响应式鉴权与租户状态机
const auth = useAuth<{ id: number; name: string }>();
const tenant = useTenant();

// 1. 模拟身份快捷切换
const loginAsOperator = () => {
  auth.login({
    token: 'jwt_token_operator_001',
    permissions: ['user:view', 'order:view'],
    roles: ['operator'],
    user: { id: 101, name: '普通员工·小李' },
  });
};

const loginAsManager = () => {
  auth.login({
    token: 'jwt_token_manager_002',
    permissions: ['user:view', 'user:edit', 'order:*'],
    roles: ['manager'],
    user: { id: 201, name: '部门主管·王经理' },
  });
};

const loginAsAdmin = () => {
  auth.login({
    token: 'jwt_token_admin_999',
    permissions: ['*'],
    roles: ['admin'],
    user: { id: 1, name: '超级管理员·Ateng' },
  });
};

const trigger401 = () => {
  // 模拟底层 HTTP 拦截器捕获 401 并广播
  authManager.handleUnauthorized();
};

// 2. 租户切换处理
const handleTenantSelect = (event: Event) => {
  const val = (event.target as HTMLSelectElement).value;
  if (!val) {
    tenant.clearTenantId();
  } else {
    tenant.setTenantId(val);
  }
};
</script>

<template>
  <section class="card">
    <h2>6. 响应式鉴权与多租户切片自验 (useAuth & useTenant)</h2>
    <p class="desc">
      响应式桥接
      <code>AuthManager</code>
      与
      <code>TenantManager</code>
      。支持登录态流转、细粒度通配权限校验 (hasPermission) 与角色判定
      (hasRole)，以及多租户切片动态联动。
    </p>

    <!-- 登录态与租户状态指示条 -->
    <div class="meta-bar">
      <div class="meta-item">
        认证状态:
        <span :class="['status-tag', auth.isAuthenticated.value ? 'status-active' : 'status-idle']">
          {{ auth.isAuthenticated.value ? '已登录 (Authenticated)' : '未登录 (Guest)' }}
        </span>
      </div>
      <div class="meta-item">
        当前用户:
        <strong>{{ auth.user.value ? auth.user.value.name : '(未登录)' }}</strong>
      </div>
      <div class="meta-item">
        当前租户切片:
        <strong>{{ tenant.tenantId.value || '(未指定租户)' }}</strong>
      </div>
    </div>

    <div class="demo-grid">
      <!-- 1. 登录态模拟操作区 -->
      <div class="section-box">
        <h3>身份快速模拟与登录流转</h3>
        <p class="desc">切换身份体验权限矩阵自动响应重绘：</p>
        <div class="btn-group">
          <button class="btn" @click="loginAsOperator">员工登录 (只有查看权限)</button>
          <button class="btn btn-secondary" @click="loginAsManager">
            主管登录 (含编辑与订单*)
          </button>
          <button class="btn btn-warning" @click="loginAsAdmin">超管登录 (admin 通配*)</button>
        </div>
        <div class="btn-group">
          <button
            class="btn btn-danger btn-sm"
            :disabled="!auth.isAuthenticated.value"
            @click="auth.logout()"
          >
            主动退出 (logout)
          </button>
          <button
            class="btn btn-secondary btn-sm"
            :disabled="!auth.isAuthenticated.value"
            @click="trigger401"
          >
            模拟 401 踢出 (handleUnauthorized)
          </button>
        </div>
      </div>

      <!-- 2. 多租户切片动态切换 -->
      <div class="section-box">
        <h3>多租户切片动态切换 (useTenant)</h3>
        <p class="desc">切换后将自动同步至底层请求头 X-Tenant-Id：</p>
        <div>
          <label style="font-size: 13px; color: #475569; margin-right: 8px">选择活跃租户:</label>
          <select
            :value="tenant.tenantId.value || ''"
            class="select-sm"
            @change="handleTenantSelect"
          >
            <option value="">(空) 无租户</option>
            <option value="tenant_beijing_01">北京总部 (tenant_beijing_01)</option>
            <option value="tenant_shanghai_02">上海分部 (tenant_shanghai_02)</option>
            <option value="tenant_cloud_99">云原生集群 (tenant_cloud_99)</option>
          </select>
        </div>
        <div class="btn-group">
          <button
            class="btn btn-secondary btn-sm"
            :disabled="!tenant.hasTenant.value"
            @click="tenant.clearTenantId()"
          >
            清空租户 (clearTenantId)
          </button>
        </div>
      </div>
    </div>

    <!-- 3. 细粒度权限受控区域 -->
    <div class="section-box" style="margin-bottom: 16px">
      <h3>细粒度权限受控测试区 (hasPermission & hasRole)</h3>
      <p class="desc">
        按钮状态根据当前凭据权限规则即时计算，支持冒号通配符（如 order:* 匹配 order:refund）：
      </p>
      <div class="perm-zone">
        <div
          :class="['perm-item', auth.hasPermission('user:view') ? 'perm-granted' : 'perm-denied']"
        >
          <span>查看用户列表 (user:view):</span>
          <span :class="['badge', auth.hasPermission('user:view') ? 'badge-yes' : 'badge-no']">
            {{ auth.hasPermission('user:view') ? '已放行' : '无权访问' }}
          </span>
          <button class="btn btn-sm" :disabled="!auth.hasPermission('user:view')">执行查看</button>
        </div>

        <div
          :class="['perm-item', auth.hasPermission('user:edit') ? 'perm-granted' : 'perm-denied']"
        >
          <span>编辑用户资料 (user:edit):</span>
          <span :class="['badge', auth.hasPermission('user:edit') ? 'badge-yes' : 'badge-no']">
            {{ auth.hasPermission('user:edit') ? '已放行' : '无权访问' }}
          </span>
          <button class="btn btn-sm" :disabled="!auth.hasPermission('user:edit')">执行编辑</button>
        </div>

        <div
          :class="[
            'perm-item',
            auth.hasPermission('order:refund') ? 'perm-granted' : 'perm-denied',
          ]"
        >
          <span>订单退款处理 (order:refund 通配):</span>
          <span :class="['badge', auth.hasPermission('order:refund') ? 'badge-yes' : 'badge-no']">
            {{ auth.hasPermission('order:refund') ? '已放行' : '无权访问' }}
          </span>
          <button class="btn btn-sm" :disabled="!auth.hasPermission('order:refund')">
            发起退款
          </button>
        </div>

        <div
          :class="[
            'perm-item',
            auth.hasPermission('sys:config:edit') ? 'perm-granted' : 'perm-denied',
          ]"
        >
          <span>全局系统配置 (sys:config:edit):</span>
          <span
            :class="['badge', auth.hasPermission('sys:config:edit') ? 'badge-yes' : 'badge-no']"
          >
            {{ auth.hasPermission('sys:config:edit') ? '已放行' : '无权访问' }}
          </span>
          <button class="btn btn-sm" :disabled="!auth.hasPermission('sys:config:edit')">
            修改配置
          </button>
        </div>
      </div>
    </div>

    <!-- 4. 响应式凭据上下文诊断视图 -->
    <div class="section-box">
      <h3>当前响应式凭据上下文快照 (只读状态)</h3>
      <pre class="json-code-sm">{{
        JSON.stringify(
          {
            isAuthenticated: auth.isAuthenticated.value,
            token: auth.token.value,
            roles: auth.roles.value,
            permissions: auth.permissions.value,
            user: auth.user.value,
            tenantId: tenant.tenantId.value,
            hasTenant: tenant.hasTenant.value,
          },
          null,
          2,
        )
      }}</pre>
    </div>
  </section>
</template>

<style scoped src="./auth-tenant-demo.css"></style>
