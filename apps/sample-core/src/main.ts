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
  tenantManager,
  cacheStorage,
  formatMaskPhone,
  formatMaskIdCard,
  formatMaskEmail,
  formatMaskName,
  BusinessException,
  isAbortError,
  toCents,
  toYuan,
  formatCurrency,
  assert,
  assertNonNull,
  isEmpty,
  isNotEmpty,
  createRequestSigner,
  createStreamClient,
  createFileChunks,
  createUploadCoordinator,
  createWebSocketClient,
  type WebSocketStatus,
  type Result,
} from '@atengk/core';
import { installMockAdapter, createMockStreamFetch, createMockWebSocketServer } from './mock';

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

// 创建带签名的独立客户端实例
const signedClient = createHttpClient({
  signer: createRequestSigner({ secret: 'ateng-sample-secret-2026' }),
});
installMockAdapter(signedClient.instance);

// 创建流式客户端实例
const sampleStreamClient = createStreamClient({
  fetch: createMockStreamFetch(),
});

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

        <!-- 卡片 8: 幂等安全重试与飞行中合并去重 -->
        <div class="dashboard-card full-width">
          <div class="card-title">
            <span>8. 幂等安全重试与飞行中请求合并去重 (RetryPolicy & RequestDeduplicator)</span>
            <span style="font-size: 12px; color: #8b5cf6;">高可用韧性防线</span>
          </div>
          <p class="card-desc">针对 GET/HEAD 幂等只读请求遭遇网络或 5xx 抖动执行指数退避自动重试，写操作严格禁止重试；并发相同只读请求复用单一飞行中 Promise，向后端并发从 N 降为 1。</p>
          <div class="actions-row">
            <button class="btn btn-primary" id="btn-retry-get">GET 瞬态抖动重试 (retry: 2)</button>
            <button class="btn btn-danger" id="btn-retry-post">POST 写操作故障 (严禁重试防重复扣款)</button>
            <button class="btn btn-success" id="btn-dedupe-flight">并发 5 个相同 GET (去重合并为 1 次网络)</button>
          </div>
          <div class="log-box" id="log-resilience">// 韧性重试与去重合并执行日志...</div>
        </div>

        <!-- 卡片 9: AI 流式响应与打字机输出 -->
        <div class="dashboard-card">
          <div class="card-title">
            <span>9. AI 流式响应门面 (StreamClient)</span>
            <span style="font-size: 12px; color: #0284c7;">原生 fetch & SSE</span>
          </div>
          <p class="card-desc">纯 Web 原生 ReadableStream 与打字机流式消费，零 Axios 依赖，支持即时 AbortSignal 级联中断与断线重连。</p>
          <div class="actions-row">
            <button class="btn btn-primary" id="btn-stream-start">启动打字机输出</button>
            <button class="btn btn-danger" id="btn-stream-abort">中途即刻中断</button>
          </div>
          <div class="log-box" id="log-stream" style="min-height: 100px;">// 点击上方按钮查看 AI 打字机增量输出...</div>
        </div>

        <!-- 卡片 10: 多租户隔离与带 TTL 本地缓存 -->
        <div class="dashboard-card">
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

        <!-- 卡片 11: 金融级金额高精度换算与强类型业务断言 -->
        <div class="dashboard-card">
          <div class="card-title">
            <span>11. 金融级金额换算与强类型断言</span>
            <span style="font-size: 12px; color: #ea580c;">纯原生零失真</span>
          </div>
          <p class="card-desc">纯原生位移补齐实现元分互转与千分位格式化；业务断言 assert/assertNonNull 编译期类型收窄。</p>
          <div class="actions-row">
            <button class="btn btn-secondary" id="btn-currency-calc">12.34元 ➔ 分 ➔ 千分位</button>
            <button class="btn btn-danger" id="btn-assert-fail">测试 assertNonNull 异常拦截</button>
          </div>
          <div class="log-box" id="log-currency">// 金额计算与断言测试结果...</div>
        </div>

        <!-- 卡片 12: API 请求防重放与原生 WebCrypto 签名 -->
        <div class="dashboard-card">
          <div class="card-title">
            <span>12. 请求防重放与原生签名 (RequestSigner)</span>
            <span style="font-size: 12px; color: #7c3aed;">WebCrypto SHA-256</span>
          </div>
          <p class="card-desc">自动在写操作请求头注入 X-Timestamp、X-Nonce 唯一排重随机数与稳定排序的十六进制签名摘要。</p>
          <div class="actions-row">
            <button class="btn btn-primary" id="btn-sign-post">发起 POST 带签名安全请求</button>
          </div>
          <div class="log-box" id="log-sign">// 签名计算与服务端验签结果...</div>
        </div>

        <!-- 卡片 13: 大文件分片切片与受控并发上传协调器 -->
        <div class="dashboard-card full-width">
          <div class="card-title">
            <span>13. 大文件分片切片与受控并发上传 (UploadCoordinator)</span>
            <span style="font-size: 12px; color: #16a34a;">并发数受控限制 (concurrency: 2)</span>
          </div>
          <p class="card-desc">将大文件按安全字节区间切分，受控限制最大并发上传连接数，提供单调递增加权进度统计、单片局部重试与外部中断。</p>
          <div class="progress-container">
            <div class="progress-bar" id="upload-progress-bar"></div>
          </div>
          <div style="font-size: 12px; color: #64748b; margin-top: -6px;">
            当前上传进度: <strong id="upload-percent-text">0%</strong> | 已上传: <span id="upload-loaded-text">0 B / 0 B</span>
          </div>
          <div class="actions-row">
            <button class="btn btn-success" id="btn-upload-start">切片 15MB 虚拟文件并并发上传</button>
            <button class="btn btn-danger" id="btn-upload-cancel">中途取消上传</button>
          </div>
          <div class="log-box" id="log-upload">// 分片切片与并发上传调度日志...</div>
        </div>

        <!-- 卡片 14: WebSocketClient 全双工长连接矩阵 -->
        <div class="dashboard-card full-width">
          <div class="card-title">
            <span>14. WebSocket 全双工长连接客户端 (WebSocketClient)</span>
            <span style="display: flex; align-items: center; gap: 8px; font-size: 13px;">
              <span id="ws-status-dot" style="width: 10px; height: 10px; border-radius: 50%; background: #94a3b8; display: inline-block;"></span>
              <strong id="ws-status-text">CLOSED</strong>
            </span>
          </div>
          <p class="card-desc">纯原生全双工通信底座，集成双向心跳保活、Pong 超时假死切断、指数退避自动重连、受控容量离线缓冲队列与强类型主题订阅分发。</p>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; font-size: 13px; background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid var(--border-color);">
            <div><strong>心跳保活:</strong> <span id="ws-heartbeat-status">未启动</span> | 已收到Pong: <span id="ws-pong-count">0</span> 次</div>
            <div><strong>指数退避重连:</strong> 第 <span id="ws-reconnect-attempt">0</span> 次重试 | 延迟: <span id="ws-reconnect-delay">0ms</span></div>
            <div><strong>离线发送缓冲:</strong> <span id="ws-buffer-count">0</span> / 5 条 (FIFO受控)</div>
          </div>

          <div class="actions-row" style="flex-wrap: wrap; gap: 8px;">
            <button class="btn btn-primary" id="btn-ws-connect">建立连接</button>
            <button class="btn btn-danger" id="btn-ws-disconnect">主动断开 (close)</button>
            <button class="btn" style="background: #f59e0b; color: white;" id="btn-ws-simulate-disconnect">模拟异常断线 (1006)</button>
            <button class="btn" style="background: #8b5cf6; color: white;" id="btn-ws-toggle-drop-pong">模拟服务端假死 (停回Pong)</button>
            <button class="btn" style="background: #64748b; color: white;" id="btn-ws-clear-log">清空日志</button>
          </div>

          <div class="input-row" style="flex-wrap: wrap; gap: 8px;">
            <input class="input-control" id="input-ws-chat" placeholder="输入聊天内容..." value="你好，WebSocket！" style="flex: 1; min-width: 200px;" />
            <button class="btn btn-success" id="btn-ws-send-chat">发送主题消息 (chat)</button>
            <button class="btn" style="background: #0ea5e9; color: white;" id="btn-ws-send-quote">订阅实时行情 (quote)</button>
          </div>

          <div class="log-box" id="log-ws" style="height: 180px; overflow-y: auto;">// WebSocket 全双工通信与主题订阅日志流...</div>
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
 * 绑定高可用韧性重试与去重合并事件。
 */
function bindResilienceEvents(): void {
  const logResilience = document.getElementById('log-resilience');

  // 1. GET 瞬态故障安全指数退避重试
  document.getElementById('btn-retry-get')?.addEventListener('click', async () => {
    if (logResilience) {
      logResilience.textContent =
        '[触发 GET 幂等请求] 配置 retry: 2, retryDelay: 500ms... 首次调用将模拟 500 抖动并自动指数退避重试...';
    }
    const startTime = Date.now();
    try {
      const res = await http.get<{ status: string; attempts: number }>(
        '/api/resilience/retry-transient',
        {
          retry: 2,
          retryDelay: 300,
        },
      );
      const elapsed = Date.now() - startTime;
      if (logResilience) {
        logResilience.textContent = `[GET 幂等重试成功]\n- 耗时: ${elapsed}ms (包含指数退避等待)\n- 响应数据: ${JSON.stringify(res, null, 2)}\n- 状态说明: 首次遭遇 500 故障，拦截器自动捕获并执行指数退避重试，第 2 次尝试成功恢复！`;
      }
    } catch (err) {
      if (logResilience) logResilience.textContent = `[重试最终失败] ${String(err)}`;
    }
  });

  // 2. POST 写操作安全防护
  document.getElementById('btn-retry-post')?.addEventListener('click', async () => {
    if (logResilience) {
      logResilience.textContent =
        '[触发 POST 写操作] 配置 retry: 3... 校验安全重试不变量（写操作默认严禁自动重试）...';
    }
    try {
      await http.post(
        '/api/resilience/write-forbidden',
        { orderId: '10086', amount: 500 },
        {
          retry: 3,
          retryDelay: 300,
        },
      );
      if (logResilience) logResilience.textContent = '[异常] 写操作本应抛出错误但成功返回！';
    } catch (err) {
      if (err instanceof BusinessException) {
        if (logResilience) {
          logResilience.textContent = `[安全重试不变量生效]\n成功拦截写操作自动重试！\n- 错误码: ${err.code}\n- 错误消息: ${err.msg}\n- 安全状态: POST 非幂等写操作严格禁止自动重试，杜绝了重复扣款与脏写！`;
        }
      } else {
        if (logResilience) logResilience.textContent = `[错误] ${String(err)}`;
      }
    }
  });

  // 3. 5 个并发 GET 请求飞行中去重合并
  document.getElementById('btn-dedupe-flight')?.addEventListener('click', async () => {
    if (logResilience) {
      logResilience.textContent = '[并发触发 5 个相同只读 GET 请求] 开启 dedupeInFlight: true...';
    }
    const startTime = Date.now();
    try {
      const results = await Promise.all([
        http.get('/api/resilience/dedupe-flight', { dedupeInFlight: true }),
        http.get('/api/resilience/dedupe-flight', { dedupeInFlight: true }),
        http.get('/api/resilience/dedupe-flight', { dedupeInFlight: true }),
        http.get('/api/resilience/dedupe-flight', { dedupeInFlight: true }),
        http.get('/api/resilience/dedupe-flight', { dedupeInFlight: true }),
      ]);
      const elapsed = Date.now() - startTime;
      if (logResilience) {
        logResilience.textContent = `[飞行中去重合并成功]\n- 5 个组件并发调用总耗时: ${elapsed}ms\n- 共享结果数量: ${results.length}\n- 飞行中队列当前大小: ${http.deduplicator.getInFlightCount()} (已确定性释放)\n- 5 个并发请求仅向后端发起了 1 次真实网络调用，其余 4 个共享同一未决 Promise！`;
      }
    } catch (err) {
      if (logResilience) logResilience.textContent = `[去重调用异常] ${String(err)}`;
    }
  });
}

/**
 * 绑定 AI 流式响应与打字机事件。
 */
function bindStreamEvents(): void {
  const logStream = document.getElementById('log-stream');
  let streamAbortController: AbortController | null = null;

  document.getElementById('btn-stream-start')?.addEventListener('click', async () => {
    if (streamAbortController) {
      streamAbortController.abort();
    }
    streamAbortController = new AbortController();

    if (logStream) {
      logStream.textContent = '[连接建立] 正在接收大模型增量 SSE 数据流...\n\n';
    }

    try {
      await sampleStreamClient.subscribe('/api/llm/stream', {
        signal: streamAbortController.signal,
        onMessage: (data, event) => {
          if (logStream) {
            logStream.textContent += data;
            logStream.scrollTop = logStream.scrollHeight;
            if (event?.id) {
              logStream.title = `最新事件ID: ${event.id}`;
            }
          }
        },
        onDone: () => {
          if (logStream) {
            logStream.textContent += '\n\n[流已正常结束] 打字机接收完成！';
          }
        },
      });
    } catch (err) {
      if (logStream) {
        logStream.textContent += `\n[流式错误] ${String(err)}`;
      }
    }
  });

  document.getElementById('btn-stream-abort')?.addEventListener('click', () => {
    if (streamAbortController) {
      streamAbortController.abort();
      streamAbortController = null;
      if (logStream) {
        logStream.textContent += '\n\n[用户操作] 已通过 AbortSignal 即刻中断流读取与网络连接！';
      }
    }
  });
}

/**
 * 绑定多租户与时效缓存事件。
 */
function bindTenantCacheEvents(): void {
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

/**
 * 绑定金融金额计算与强类型业务断言事件。
 */
function bindCurrencyAssertionEvents(): void {
  const logCurrency = document.getElementById('log-currency');

  document.getElementById('btn-currency-calc')?.addEventListener('click', () => {
    const yuan = 12.34;
    const cents = toCents(yuan);
    const backYuan = toYuan(cents);
    const bigMoney = 987654321.05;
    const formatted = formatCurrency(bigMoney);

    // 校验 isEmpty 与 isNotEmpty 谓词及 assert 断言
    const sampleList = [1, 2, 3];
    assert(isNotEmpty(sampleList), '数据集不应为空');
    assert(isEmpty([]), '空集合校验');

    if (logCurrency) {
      logCurrency.textContent = [
        '[金融级高精度金额运算]',
        `1. 元转分: toCents(${yuan}) = ${cents} 分 (纯原生整数位移运算)`,
        `2. 分转元: toYuan(${cents}) = ${backYuan} 元 (零浮点失真)`,
        `3. 格式化千分位: formatCurrency(${bigMoney}) = "${formatted}"`,
        `4. 断言守卫: assert(isNotEmpty([1,2,3])) 与 assert(isEmpty([])) 校验通过`,
      ].join('\n');
    }
  });

  document.getElementById('btn-assert-fail')?.addEventListener('click', () => {
    try {
      const mockInput: string | null = null;
      // 强类型断言校验
      assertNonNull(mockInput, '用户关键身份标识 (userId) 缺失');
    } catch (err) {
      if (err instanceof BusinessException) {
        if (logCurrency) {
          logCurrency.textContent = `[业务断言拦截成功]\n成功抛出强类型 BusinessException:\n- 错误码: ${err.code}\n- 提示信息: ${err.msg}\n- 校验作用: 快速失败 (Fail-Fast)，并在编译期实现 TypeScript 类型安全收窄！`;
        }
      } else if (logCurrency) {
        logCurrency.textContent = `[错误] ${String(err)}`;
      }
    }
  });
}

/**
 * 绑定防重放与原生签名事件。
 */
function bindSecuritySignEvents(): void {
  const logSign = document.getElementById('log-sign');

  document.getElementById('btn-sign-post')?.addEventListener('click', async () => {
    if (logSign) {
      logSign.textContent = '正在计算 SHA-256 签名并发送 POST 请求...';
    }

    try {
      const res = await signedClient.post<{
        verified: boolean;
        receivedTimestamp: string;
        receivedNonce: string;
        receivedSignature: string;
      }>('/api/security/sign-verify', {
        goodsId: 'PROD-8888',
        price: 9900,
      });

      if (logSign) {
        logSign.textContent = [
          '[API 请求签名与防重放验证成功]',
          `- 服务端验签结果: ${res.verified ? '100% 匹配通过 (Verified)' : '失败'}`,
          `- 自动注入时间戳 (X-Timestamp): ${res.receivedTimestamp}`,
          `- 唯一排重随机数 (X-Nonce): ${res.receivedNonce}`,
          `- 原生 SHA-256 签名 (X-Signature): ${res.receivedSignature}`,
          '杜绝了网络重放反向攻击与载荷中间人篡改！',
        ].join('\n');
      }
    } catch (err) {
      if (logSign) {
        logSign.textContent = `[签名请求失败] ${String(err)}`;
      }
    }
  });
}

/**
 * 绑定大文件切片并发上传事件。
 */
function bindUploadEvents(): void {
  const logUpload = document.getElementById('log-upload');
  const progressBar = document.getElementById('upload-progress-bar');
  const percentText = document.getElementById('upload-percent-text');
  const loadedText = document.getElementById('upload-loaded-text');
  let uploadController: AbortController | null = null;

  document.getElementById('btn-upload-start')?.addEventListener('click', async () => {
    if (uploadController) {
      uploadController.abort();
    }
    uploadController = new AbortController();

    // 创建 15MB 虚拟大文件
    const totalBytes = 15 * 1024 * 1024;
    const chunkSize = 3 * 1024 * 1024; // 3MB / 片，共 5 片
    const dummyBlob = new Blob([new Uint8Array(totalBytes)]);

    if (logUpload) {
      logUpload.textContent = `[开始切片] 文件总大小: 15 MB，按 3 MB/片切分...\n`;
    }

    const chunks = createFileChunks(dummyBlob, chunkSize);
    if (logUpload) {
      logUpload.textContent += `成功切分为 ${chunks.length} 个分片，受控并发数: 2\n`;
    }

    const coordinator = createUploadCoordinator({
      concurrency: 2,
      maxRetries: 2,
      retryDelay: 300,
      onProgress: (percent, loaded, total) => {
        if (progressBar) progressBar.style.width = `${percent}%`;
        if (percentText) percentText.textContent = `${percent}%`;
        if (loadedText) {
          loadedText.textContent = `${(loaded / (1024 * 1024)).toFixed(1)} MB / ${(total / (1024 * 1024)).toFixed(1)} MB`;
        }
      },
      onChunkSuccess: chunk => {
        if (logUpload) {
          logUpload.textContent += `[切片 #${chunk.index} 完成] 起始偏移: ${chunk.start} B, 大小: ${(chunk.size / 1024 / 1024).toFixed(1)} MB\n`;
          logUpload.scrollTop = logUpload.scrollHeight;
        }
      },
      uploadChunk: async (chunk, signal) => {
        // 模拟网络上传延迟 (250ms)
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(resolve, 250);
          signal?.addEventListener(
            'abort',
            () => {
              clearTimeout(timer);
              reject(new Error('Chunk upload aborted'));
            },
            { once: true },
          );
        });
        return { chunkIndex: chunk.index, status: 'uploaded' };
      },
    });

    try {
      const results = await coordinator.upload(chunks, uploadController.signal);
      if (logUpload) {
        logUpload.textContent += `\n[全部上传完成] 共计 ${results.length} 个分片 100% 成功交付！`;
      }
    } catch (err) {
      if (logUpload) {
        logUpload.textContent += `\n[上传中止/异常] ${String(err)}`;
      }
    }
  });

  document.getElementById('btn-upload-cancel')?.addEventListener('click', () => {
    if (uploadController) {
      uploadController.abort();
      uploadController = null;
      if (logUpload) {
        logUpload.textContent += `\n[用户操作] 已通过 AbortSignal 级联取消所有在途与等待中的分片上传！`;
      }
    }
  });
}

/**
 * 绑定 WebSocket 全双工长连接客户端交互看板。
 */
function bindWebSocketEvents(): void {
  const logWs = document.getElementById('log-ws');
  const dotEl = document.getElementById('ws-status-dot');
  const statusTextEl = document.getElementById('ws-status-text');
  const heartbeatStatusEl = document.getElementById('ws-heartbeat-status');
  const pongCountEl = document.getElementById('ws-pong-count');
  const reconnectAttemptEl = document.getElementById('ws-reconnect-attempt');
  const reconnectDelayEl = document.getElementById('ws-reconnect-delay');
  const bufferCountEl = document.getElementById('ws-buffer-count');
  const btnDropPong = document.getElementById('btn-ws-toggle-drop-pong');
  const inputChat = document.getElementById('input-ws-chat') as HTMLInputElement | null;

  let pongCount = 0;

  const appendLog = (msg: string) => {
    if (logWs) {
      const time = new Date().toLocaleTimeString();
      logWs.textContent += `\n[${time}] ${msg}`;
      logWs.scrollTop = logWs.scrollHeight;
    }
  };

  const updateStatusUI = (status: WebSocketStatus, code?: number) => {
    if (!dotEl || !statusTextEl) return;
    switch (status) {
      case 'OPEN':
        dotEl.style.backgroundColor = '#10b981';
        statusTextEl.textContent = 'OPEN (已连接)';
        statusTextEl.style.color = '#10b981';
        break;
      case 'CONNECTING':
        dotEl.style.backgroundColor = '#3b82f6';
        statusTextEl.textContent = 'CONNECTING (连接/握手中)';
        statusTextEl.style.color = '#3b82f6';
        break;
      case 'CLOSING':
        dotEl.style.backgroundColor = '#f59e0b';
        statusTextEl.textContent = 'CLOSING (关闭中)';
        statusTextEl.style.color = '#f59e0b';
        break;
      case 'CLOSED':
      default:
        dotEl.style.backgroundColor = '#94a3b8';
        statusTextEl.textContent = code ? `CLOSED (code=${code})` : 'CLOSED (已断开)';
        statusTextEl.style.color = '#64748b';
        break;
    }
  };

  const mockServer = createMockWebSocketServer();

  const wsClient = createWebSocketClient({
    url: 'ws://mock.ateng.local/ws',
    webSocketFactory: mockServer.factory,
    heartbeat: {
      enabled: true,
      interval: 4000,
      timeout: 2000,
    },
    reconnect: {
      enabled: true,
      baseDelay: 1000,
      factor: 1.5,
      maxDelay: 5000,
      maxRetries: 5,
    },
    bufferWhileConnecting: true,
    maxBufferSize: 5,
  });

  // 1. 监听底层生命周期事件
  wsClient.on('open', () => {
    updateStatusUI('OPEN');
    if (heartbeatStatusEl) heartbeatStatusEl.textContent = '正常保活中 (4s周期)';
    if (reconnectAttemptEl) reconnectAttemptEl.textContent = '0';
    if (reconnectDelayEl) reconnectDelayEl.textContent = '0ms';
    if (bufferCountEl) bufferCountEl.textContent = String(wsClient.getBufferSize());
    appendLog('【连接成功】WebSocket 握手就绪！自动启动心跳保活探针并冲刷离线队列');
  });

  wsClient.on('close', event => {
    updateStatusUI('CLOSED', event.code);
    if (heartbeatStatusEl) heartbeatStatusEl.textContent = '已停止';
    appendLog(`【连接关闭】code=${event.code}, reason=${event.reason || 'none'}`);
  });

  wsClient.on('reconnect', (attempt, delay) => {
    updateStatusUI('CONNECTING');
    if (reconnectAttemptEl) reconnectAttemptEl.textContent = String(attempt);
    if (reconnectDelayEl) reconnectDelayEl.textContent = `${delay}ms`;
    appendLog(`【自动重连】触发第 ${attempt} 次指数退避重连，等待延迟 ${delay}ms...`);
  });

  wsClient.on('message', data => {
    if (data === 'pong') {
      pongCount += 1;
      if (pongCountEl) pongCountEl.textContent = String(pongCount);
      appendLog('【心跳响应】收到对端 Pong 探针应答，连接健康续命');
    }
  });

  // 2. 注册高阶强类型主题订阅
  wsClient.subscribe<{ user: string; text: string; time?: string }>('chat', payload => {
    appendLog(`【主题:chat】[${payload.user}]: ${payload.text} (${payload.time || ''})`);
  });

  wsClient.subscribe<{ symbol: string; price: number; time?: string }>('quote', payload => {
    appendLog(
      `【主题:quote】${payload.symbol} 最新行情: $${payload.price} (${payload.time || ''})`,
    );
  });

  // 3. 按钮交互绑定
  document.getElementById('btn-ws-connect')?.addEventListener('click', () => {
    appendLog('【用户操作】发起建立连接...');
    void wsClient.connect();
  });

  document.getElementById('btn-ws-disconnect')?.addEventListener('click', () => {
    appendLog('【用户操作】主动断开长连接 (close)，永久阻断自动重连...');
    wsClient.close(1000, '用户主动关闭连接');
    if (bufferCountEl) bufferCountEl.textContent = String(wsClient.getBufferSize());
  });

  document.getElementById('btn-ws-simulate-disconnect')?.addEventListener('click', () => {
    appendLog('【测试操作】模拟服务端网络异常闪断 (code=1006)...');
    mockServer.triggerServerClose(1006, '模拟网关异常重启');
  });

  document.getElementById('btn-ws-toggle-drop-pong')?.addEventListener('click', () => {
    const nextDrop = !mockServer.isDropPong();
    mockServer.setDropPong(nextDrop);
    if (btnDropPong) {
      btnDropPong.textContent = nextDrop ? '恢复正常 Pong 响应' : '模拟服务端假死 (停回Pong)';
      btnDropPong.style.background = nextDrop ? '#ef4444' : '#8b5cf6';
    }
    if (heartbeatStatusEl) {
      heartbeatStatusEl.textContent = nextDrop ? '模拟假死中 (Pong已阻断)' : '正常保活中 (4s周期)';
    }
    appendLog(
      nextDrop
        ? '【测试操作】已阻断服务端 Pong 响应，等待客户端心跳超时判定假死切断...'
        : '【测试操作】已恢复正常 Pong 响应',
    );
  });

  document.getElementById('btn-ws-send-chat')?.addEventListener('click', () => {
    const text = inputChat?.value || '测试消息';
    const msg = { type: 'chat', data: { text, time: new Date().toLocaleTimeString() } };
    const ok = wsClient.send(msg);
    if (bufferCountEl) bufferCountEl.textContent = String(wsClient.getBufferSize());
    appendLog(
      ok
        ? `【消息发送】已交付发送或入缓冲: "${text}" (状态: ${wsClient.getStatus()}, 缓冲: ${wsClient.getBufferSize()}/5)`
        : '【发送失败】未就绪且未开启缓冲或队列已满',
    );
  });

  document.getElementById('btn-ws-send-quote')?.addEventListener('click', () => {
    const msg = { type: 'quote', data: { symbol: 'ATENG' } };
    const ok = wsClient.send(msg);
    if (bufferCountEl) bufferCountEl.textContent = String(wsClient.getBufferSize());
    appendLog(
      ok
        ? `【订阅行情】发送 quote 行情订阅请求 (状态: ${wsClient.getStatus()})`
        : '【发送失败】未就绪且未开启缓冲',
    );
  });

  document.getElementById('btn-ws-clear-log')?.addEventListener('click', () => {
    if (logWs) logWs.textContent = '// WebSocket 全双工通信与主题订阅日志流...';
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
  bindResilienceEvents();
  bindStreamEvents();
  bindTenantCacheEvents();
  bindCurrencyAssertionEvents();
  bindSecuritySignEvents();
  bindUploadEvents();
  bindWebSocketEvents();
}
