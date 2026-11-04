/**
 * 统一强类型响应契约、解包与雪花大数防截断场景看板。
 *
 * @author Ateng
 * @since 2026-11-04
 */

import { http, type Result } from '@atengk/core';

/**
 * 渲染响应契约与雪花大数看板 HTML 模板。
 */
export function renderContractsCard(): string {
  return `
    <!-- 卡片 1: 统一响应解包与逃生门 -->
    <div class="dashboard-card" id="card-contracts-unwrap">
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
    <div class="dashboard-card" id="card-contracts-snowflake">
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
  `;
}

/**
 * 初始化响应契约与雪花大数场景交互事件。
 */
export function initContractsScenario(): void {
  // 1. 响应解包与逃生门
  const logUnwrap = document.getElementById('log-unwrap');
  document.getElementById('btn-request-unwrap')?.addEventListener('click', async () => {
    if (logUnwrap) logUnwrap.textContent = '发起 GET /api/user/detail 请求中...';
    try {
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
      const res = await http.get<Result<{ id: string }>>('/api/user/detail', { unwrap: false });
      if (logUnwrap) {
        logUnwrap.textContent = `[逃生门返回完整 Result<T> 信封]\n状态码: ${res.code}\n消息: ${res.msg}\n链路Id: ${res.traceId}\n数据: ${JSON.stringify(res.data)}`;
      }
    } catch (err) {
      if (logUnwrap) logUnwrap.textContent = `[请求失败] ${String(err)}`;
    }
  });

  // 2. 雪花大数防截断
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
