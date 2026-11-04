/**
 * 双轨 Token 鉴权门面、401 闭环、多租户上下文与时效本地缓存场景看板。
 *
 * @author Ateng
 * @since 2026-11-04
 */

import { http, authManager, tenantManager, cacheStorage, BusinessException } from '@atengk/core';
import { registerUnauthorizedCallback } from '../client';

/**
 * 更新鉴权 UI 指示器状态。
 */
function updateAuthStatusUI(extraMsg?: string): void {
  const token = authManager.getToken();
  const tokenDot = document.getElementById('token-dot');
  const tokenStatusText = document.getElementById('token-status-text');
  const logBox = document.getElementById('log-token');

  if (token) {
    tokenDot?.classList.add('active');
    tokenDot?.classList.remove('inactive');
    if (tokenStatusText) tokenStatusText.textContent = '已鉴权 (Token 在线)';
  } else {
    tokenDot?.classList.remove('active');
    tokenDot?.classList.add('inactive');
    if (tokenStatusText) tokenStatusText.textContent = '未登录 (无凭据)';
  }

  if (logBox) {
    const headers = authManager.getHeaders();
    logBox.textContent = [
      extraMsg ? `[通知] ${extraMsg}` : null,
      `当前 Token: ${token || '(null)'}`,
      `注入请求头 (token): ${headers['token'] || '(无)'}`,
      `注入请求头 (Authorization): ${headers['Authorization'] || '(无)'}`,
    ]
      .filter(Boolean)
      .join('\n');
  }
}

/**
 * 渲染鉴权凭据与时效缓存看板 HTML 模板。
 */
export function renderAuthCard(): string {
  return `
    <!-- 卡片 3: 双轨 Token 鉴权与 401 闭环 -->
    <div class="dashboard-card" id="card-auth-token">
      <div class="card-title">
        <span>3. 通用 Token 双轨凭据门面</span>
        <div class="status-indicator">
          <span class="status-dot" id="token-dot"></span>
          <span id="token-status-text">未登录</span>
        </div>
      </div>
      <p class="card-desc">自动注入 token 与 Authorization: Bearer 双轨请求头，401 自动清理通知。</p>
      <div class="actions-row">
        <button class="btn btn-primary" id="btn-token-login">登录注入凭据</button>
        <button class="btn btn-secondary" id="btn-token-clear">主动清空</button>
        <button class="btn btn-danger" id="btn-token-401">模拟 401 过期</button>
      </div>
      <div class="log-box" id="log-token">// 当前请求头挂载状态将在此打印...</div>
    </div>

    <!-- 卡片 10: 多租户隔离与带 TTL 本地缓存 -->
    <div class="dashboard-card" id="card-auth-tenant-cache">
      <div class="card-title">
        <span>10. 多租户与时效缓存 (Tenant & Cache)</span>
        <span style="font-size: 12px; color: #0d9488;">TTL 命名空间隔离</span>
      </div>
      <p class="card-desc">自动透传 X-Tenant-Id 租户请求头；本地缓存支持指定毫秒存活时长 (TTL) 与惰性过期清理。</p>
      <div class="actions-row">
        <button class="btn btn-secondary" id="btn-tenant-switch">切换为 tenant-888</button>
        <button class="btn btn-primary" id="btn-cache-set">写入 5秒 TTL 缓存</button>
        <button class="btn btn-success" id="btn-cache-get">读取缓存 (观察倒计时)</button>
      </div>
      <div class="log-box" id="log-tenant">// 租户与时效缓存状态日志...</div>
    </div>
  `;
}

/**
 * 初始化鉴权凭据与时效缓存场景交互事件。
 */
export function initAuthScenario(): void {
  // 1. 注册 microserviceClient 的 401 回调通知
  registerUnauthorizedCallback((msg: string) => {
    updateAuthStatusUI(msg);
  });

  // 2. Token 登录、清空与模拟 401
  document.getElementById('btn-token-login')?.addEventListener('click', () => {
    authManager.setToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ateng-token-sample');
    updateAuthStatusUI('成功登录并注入 Token 凭据');
  });

  document.getElementById('btn-token-clear')?.addEventListener('click', () => {
    authManager.clearToken();
    updateAuthStatusUI('凭据已手动清空');
  });

  document.getElementById('btn-token-401')?.addEventListener('click', async () => {
    try {
      await http.get('/api/auth/expire');
    } catch (err) {
      if (err instanceof BusinessException) {
        updateAuthStatusUI(`拦截到 401 业务异常: [${err.code}] ${err.msg}，凭据已自动销毁`);
      }
    }
  });

  // 初始刷新 UI
  updateAuthStatusUI();

  // 3. 多租户隔离与时效缓存
  const logTenant = document.getElementById('log-tenant');

  document.getElementById('btn-tenant-switch')?.addEventListener('click', () => {
    const current = tenantManager.getTenantId();
    const nextTenant = current === 'tenant-888' ? 'tenant-001' : 'tenant-888';
    tenantManager.setTenantId(nextTenant);
    const headers = tenantManager.getHeaders();
    if (logTenant) {
      logTenant.textContent = `[租户切换成功]\n- 当前租户 ID: ${nextTenant}\n- 自动注入请求头: ${JSON.stringify(headers, null, 2)}`;
    }
  });

  document.getElementById('btn-cache-set')?.addEventListener('click', () => {
    cacheStorage.set('order_draft_key', { orderId: 'ORD-2026-999', title: '云服务器旗舰版' }, 5000);
    if (logTenant) {
      logTenant.textContent = `[写入缓存成功]\n- 键名: order_draft_key\n- 存活时长 (TTL): 5000ms (5秒)\n- 写入时间: ${new Date().toLocaleTimeString()}\n请在 5 秒内点击“读取缓存”查看倒计时，超时将自动判定过期清理！`;
    }
  });

  document.getElementById('btn-cache-get')?.addEventListener('click', () => {
    const data = cacheStorage.get<{ orderId: string; title: string }>('order_draft_key');
    if (logTenant) {
      if (data) {
        logTenant.textContent = `[读取缓存成功 (未过期)]\n- 数据载荷: ${JSON.stringify(data, null, 2)}\n- 状态: 处于有效存活期内`;
      } else {
        logTenant.textContent = `[缓存已过期或未命中]\n- 返回值: null\n- 状态: 5000ms TTL 已耗尽，已惰性自动清理！`;
      }
    }
  });
}
