/**
 * @atengk/core 原生 TS 契约与网络层自验工程交互看板主入口。
 *
 * 具象化呈现：
 * 1. 统一响应自动解包与 { unwrap: false } 逃生门；
 * 2. 64位雪花 ID 大数防截断原始 JSON 对比与字符串类型保护；
 * 3. 双轨 Token 请求头注入指示与 401 自动清理广播；
 * 4. 微服务网关前缀路由与路径重写分发；
 * 5. cancelDuplicate 防竞态自动中断与未决协调器计数；
 * 6. Blob 双态异常阻断与 RFC 5987 安全下载落地；
 * 7. 内存真明文与展示脱敏纯函数对比矩阵。
 *
 * @author Ateng
 * @since 2026-10-20
 */

import './style.css';
import {
  VERSION,
  http,
  createHttpClient,
  authManager,
  formatMaskPhone,
  formatMaskIdCard,
  formatMaskEmail,
  formatMaskName,
  BusinessException,
  isAbortError,
  type Result,
} from '@atengk/core';
import { installMockAdapter } from './mock';

// 1. 安装离线自洽模拟适配器
installMockAdapter(http.instance);

// 创建独立的微服务客户端实例
const microserviceClient = createHttpClient({
  routes: [
    { prefix: '/auth', target: 'https://auth-service.cloud' },
    { prefix: '/order', target: 'https://order-service.cloud', rewritePrefix: '/api/v1' },
    { prefix: '/vip', target: 'https://vip-service.cloud', service: 'vip' },
  ],
  cancelDuplicate: true,
  onUnauthorized: () => {
    updateAuthStatusUI('401 凭据失效，已触发客户端全局 onUnauthorized 回调！');
  },
});
installMockAdapter(microserviceClient.instance);

// 2. 内存真实明文数据模型
const rawUserData = {
  name: '诸葛孔明',
  phone: '13800138000',
  idCard: '110101199003072345',
  email: 'zhuge.kongming@ateng.local',
};

// 3. 构建页面 DOM
const app = document.getElementById('app');
if (app) {
  app.innerHTML = `
    <div class="dashboard-container">
      <header class="dashboard-header">
        <h1>
          <span>🛡️ @atengk/core 基础设施交互看板</span>
          <span class="version-badge">v${VERSION}</span>
        </h1>
        <div style="font-size: 13px; color: #64748b;">
          自验展厅端口: <strong>3001</strong> | 宿主: 纯原生 TypeScript
        </div>
      </header>

      <div class="dashboard-grid">
        <!-- 卡片 1: 统一响应解包与逃生门 -->
        <div class="dashboard-card">
          <div class="card-title">
            <span>1. 统一响应解包与逃生门</span>
            <span style="font-size: 12px; color: #2563eb;">unwrap: true / false</span>
          </div>
          <p class="card-desc">默认自动校验 code === 200 并解包返回实体；逃生门保留完整 Result 信封。</p>
          <div class="actions-row">
            <button class="btn btn-primary" id="btn-request-unwrap">发送常规请求 (自动解包)</button>
            <button class="btn btn-secondary" id="btn-request-envelope">逃生门 (保留信封)</button>
          </div>
          <div class="log-box" id="log-unwrap">// 点击上方按钮查看网络响应提取结果...</div>
        </div>

        <!-- 卡片 2: 雪花 Long ID 防截断 -->
        <div class="dashboard-card">
          <div class="card-title">
            <span>2. 雪花 Long ID 大数防截断</span>
            <span style="font-size: 12px; color: #10b981;">纳秒级正则保护</span>
          </div>
          <p class="card-desc">对比 JavaScript 原生 JSON.parse 精度丢失与 @atengk/core 字符串固化防线。</p>
          <div class="diff-box">
            <div class="diff-pane danger">
              <strong>原生 JSON.parse 截断:</strong><br/>
              9007199254740995123<br/>
              ➔ <span id="snow-native-loss">计算中...</span>
            </div>
            <div class="diff-pane success">
              <strong>@atengk/core 防护结果:</strong><br/>
              typeof id: <strong id="snow-type">-</strong><br/>
              值: <span id="snow-protected-val">-</span>
            </div>
          </div>
          <div class="actions-row">
            <button class="btn btn-success" id="btn-snow-test">测试雪花大数请求管道</button>
          </div>
        </div>

        <!-- 卡片 3: 双轨 Token 鉴权与 401 闭环 -->
        <div class="dashboard-card">
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

        <!-- 卡片 4: 微服务网关多路由分发 -->
        <div class="dashboard-card">
          <div class="card-title">
            <span>4. 微服务多路由映射引擎</span>
            <span style="font-size: 12px; color: #6366f1;">最长前缀 / service 覆盖</span>
          </div>
          <p class="card-desc">自动将请求匹配分发至目标服务网关并重写路径参数与查询参数。</p>
          <div class="actions-row">
            <button class="btn btn-secondary" id="btn-route-order">请求 /order/detail/100</button>
            <button class="btn btn-secondary" id="btn-route-vip">显式覆盖 service: vip</button>
          </div>
          <div class="log-box" id="log-routing">// 路由分发解析日志...</div>
        </div>

        <!-- 卡片 5: 取消协调器与防竞态 -->
        <div class="dashboard-card">
          <div class="card-title">
            <span>5. 异步取消协调器与防竞态</span>
            <span style="font-size: 12px; color: #f59e0b;">未决请求: <span id="pending-count">0</span></span>
          </div>
          <p class="card-desc">快速翻页或频繁搜索时，cancelDuplicate: true 自动中断旧未决请求，杜绝数据倒挂。</p>
          <div class="actions-row">
            <button class="btn btn-primary" id="btn-race-test">连续高频点击搜索 (模拟竞态)</button>
          </div>
          <div class="log-box" id="log-race">// 竞态中断监听记录...</div>
        </div>

        <!-- 卡片 6: Blob 双态异常与安全下载 -->
        <div class="dashboard-card">
          <div class="card-title">
            <span>6. Blob 双态异常与安全下载</span>
            <span style="font-size: 12px; color: #ec4899;">RFC 5987 / 异常嗅探</span>
          </div>
          <p class="card-desc">正常文件提取中文名下载并确定性释放内存；业务异常 JSON 自动阻断并抛出 BusinessException。</p>
          <div class="actions-row">
            <button class="btn btn-success" id="btn-download-normal">下载正常清单 (CSV)</button>
            <button class="btn btn-danger" id="btn-download-error">下载异常文件 (JSON拦截)</button>
          </div>
          <div class="log-box" id="log-download">// 下载状态与异常拦截日志...</div>
        </div>

        <!-- 卡片 7: 内存真明文展示脱敏矩阵 -->
        <div class="dashboard-card full-width">
          <div class="card-title">
            <span>7. 内存真明文展示脱敏工具看板 (In-Memory Plaintext Invariant)</span>
            <span style="font-size: 12px; color: #10b981;">纯函数式计算</span>
          </div>
          <p class="card-desc">内存模型中数据始终保持 100% 原始真实明文，脱敏仅在渲染层动态调用纯函数计算，杜绝脏写数据库。</p>
          <table class="table-preview">
            <thead>
              <tr>
                <th>脱敏字段</th>
                <th>内存真实明文 (Plaintext)</th>
                <th>脱敏纯函数门面</th>
                <th>渲染层最终呈现 (Masked Output)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>手机号码</td>
                <td><code>${rawUserData.phone}</code></td>
                <td><code>formatMaskPhone(phone)</code></td>
                <td><strong style="color: #2563eb;">${formatMaskPhone(rawUserData.phone)}</strong></td>
              </tr>
              <tr>
                <td>身份证号</td>
                <td><code>${rawUserData.idCard}</code></td>
                <td><code>formatMaskIdCard(idCard)</code></td>
                <td><strong style="color: #2563eb;">${formatMaskIdCard(rawUserData.idCard)}</strong></td>
              </tr>
              <tr>
                <td>电子邮箱</td>
                <td><code>${rawUserData.email}</code></td>
                <td><code>formatMaskEmail(email)</code></td>
                <td><strong style="color: #2563eb;">${formatMaskEmail(rawUserData.email)}</strong></td>
              </tr>
              <tr>
                <td>中文姓名</td>
                <td><code>${rawUserData.name}</code></td>
                <td><code>formatMaskName(name)</code></td>
                <td><strong style="color: #2563eb;">${formatMaskName(rawUserData.name)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // 4. 事件绑定与动态交互编排
  initDashboardEvents();
}

/**
 * 更新鉴权 UI 指示器。
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
 * 绑定响应解包与逃生门事件。
 */
function bindUnwrapEvents(): void {
  const logUnwrap = document.getElementById('log-unwrap');
  document.getElementById('btn-request-unwrap')?.addEventListener('click', async () => {
    if (logUnwrap) logUnwrap.textContent = '发起 GET /api/user/detail 请求中...';
    try {
      // 默认自动解包：直接拿到 User 实体
      const user = await http.get<{ id: string; name: string; role: string }>('/api/user/detail');
      if (logUnwrap) {
        logUnwrap.textContent = `[成功自动解包 Promise<T>]\n数据实体:\n${JSON.stringify(user, null, 2)}`;
      }
    } catch (err) {
      if (logUnwrap) logUnwrap.textContent = `[请求失败] ${String(err)}`;
    }
  });

  document.getElementById('btn-request-envelope')?.addEventListener('click', async () => {
    if (logUnwrap) logUnwrap.textContent = '发起带 { unwrap: false } 逃生门请求中...';
    try {
      // 逃生门：保留 Result<T> 完整信封
      const res = await http.get<Result<{ id: string }>>('/api/user/detail', { unwrap: false });
      if (logUnwrap) {
        logUnwrap.textContent = `[逃生门返回完整 Result<T> 信封]\n状态码: ${res.code}\n消息: ${res.msg}\n链路Id: ${res.traceId}\n数据: ${JSON.stringify(res.data)}`;
      }
    } catch (err) {
      if (logUnwrap) logUnwrap.textContent = `[请求失败] ${String(err)}`;
    }
  });
}

/**
 * 绑定雪花大数防截断事件与对比展示。
 */
function bindSnowflakeEvents(): void {
  const nativeLossEl = document.getElementById('snow-native-loss');
  if (nativeLossEl) {
    nativeLossEl.textContent = `${JSON.parse('{"id":9007199254740995123}').id} (精度丢失后末尾变为 000)`;
  }

  document.getElementById('btn-snow-test')?.addEventListener('click', async () => {
    const snowTypeEl = document.getElementById('snow-type');
    const snowValEl = document.getElementById('snow-protected-val');
    try {
      const order = await http.get<{ orderId: string; amount: number }>('/api/snowflake/test');
      if (snowTypeEl) snowTypeEl.textContent = typeof order.orderId;
      if (snowValEl) snowValEl.textContent = `"${order.orderId}" (完美保真)`;
    } catch (err) {
      if (snowTypeEl) snowTypeEl.textContent = 'Error';
      if (snowValEl) snowValEl.textContent = `[请求失败] ${String(err)}`;
    }
  });
}

/**
 * 绑定通用 Token 鉴权与 401 模拟事件。
 */
function bindAuthEvents(): void {
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
  updateAuthStatusUI();
}

/**
 * 绑定微服务网关路由重写与覆盖事件。
 */
function bindRoutingEvents(): void {
  const logRouting = document.getElementById('log-routing');
  document.getElementById('btn-route-order')?.addEventListener('click', async () => {
    if (logRouting) logRouting.textContent = '请求 /order/detail/100...';
    try {
      const res = await microserviceClient.get('/order/detail/100');
      if (logRouting) {
        logRouting.textContent = `[网关匹配成功]\n已将 /order 路径重写分发至:\n${JSON.stringify(res, null, 2)}`;
      }
    } catch (err) {
      if (logRouting) logRouting.textContent = `[路由失败] ${String(err)}`;
    }
  });

  document.getElementById('btn-route-vip')?.addEventListener('click', async () => {
    if (logRouting) logRouting.textContent = '显式指定 service: vip...';
    try {
      const res = await microserviceClient.get('/order/detail/100', { service: 'vip' });
      if (logRouting) {
        logRouting.textContent = `[服务显式覆盖成功]\n已强制路由至 VIP 服务:\n${JSON.stringify(res, null, 2)}`;
      }
    } catch (err) {
      if (logRouting) logRouting.textContent = `[路由失败] ${String(err)}`;
    }
  });
}

/**
 * 绑定并发请求取消与防竞态事件。
 */
function bindRaceEvents(): void {
  const logRace = document.getElementById('log-race');
  const pendingCountEl = document.getElementById('pending-count');
  let clickCount = 0;

  document.getElementById('btn-race-test')?.addEventListener('click', async () => {
    clickCount++;
    const currentNum = clickCount;
    if (logRace) {
      logRace.textContent += `\n[触发] 发起慢速搜索请求 #${currentNum} (q=slow)...`;
    }
    if (pendingCountEl) {
      pendingCountEl.textContent = String(microserviceClient.abortCoordinator.getPendingCount());
    }

    try {
      const res = await microserviceClient.get('/api/search', { params: { q: 'slow' } });
      if (logRace) {
        logRace.textContent += `\n[成功响应] 请求 #${currentNum} 顺利返回: ${JSON.stringify(res)}`;
      }
    } catch (err) {
      if (isAbortError(err)) {
        if (logRace) {
          logRace.textContent += `\n[防竞态拦截] 请求 #${currentNum} 已被自动中断 (Canceled duplicate request)`;
        }
      } else {
        if (logRace) {
          logRace.textContent += `\n[异常] 请求 #${currentNum} 失败: ${String(err)}`;
        }
      }
    } finally {
      if (pendingCountEl) {
        pendingCountEl.textContent = String(microserviceClient.abortCoordinator.getPendingCount());
      }
    }
  });
}

/**
 * 绑定文件下载与双态异常阻断事件。
 */
function bindDownloadEvents(): void {
  const logDownload = document.getElementById('log-download');
  document.getElementById('btn-download-normal')?.addEventListener('click', async () => {
    if (logDownload) logDownload.textContent = '请求下载正常清单...';
    try {
      const ok = await http.download('/api/download/normal');
      if (logDownload) {
        logDownload.textContent = `[下载触发] 状态: ${ok ? '已成功通过浏览器触发下载' : '在非浏览器环境安全降级'}\n已解析 RFC 5987 文件名: 用户清单_2026.csv\n临时 ObjectURL 已安排确定性释放`;
      }
    } catch (err) {
      if (logDownload) logDownload.textContent = `[下载失败] ${String(err)}`;
    }
  });

  document.getElementById('btn-download-error')?.addEventListener('click', async () => {
    if (logDownload) logDownload.textContent = '请求下载异常文件 (模拟服务端故障)...';
    try {
      await http.download('/api/download/error');
      if (logDownload) logDownload.textContent = '[异常] 预期被阻断但未被捕获！';
    } catch (err) {
      if (err instanceof BusinessException) {
        if (logDownload) {
          logDownload.textContent = `[已安全拦截损坏伪文件]\n成功捕获 BusinessException:\n- 错误码: ${err.code}\n- 错误消息: ${err.msg}\n- 链路追踪: ${err.traceId}\n彻底避免了损坏伪文件的下载落地！`;
        }
      } else {
        if (logDownload) logDownload.textContent = `[错误] ${String(err)}`;
      }
    }
  });
}

/**
 * 初始化所有交互看板事件。
 */
function initDashboardEvents(): void {
  bindUnwrapEvents();
  bindSnowflakeEvents();
  bindAuthEvents();
  bindRoutingEvents();
  bindRaceEvents();
  bindDownloadEvents();
}
