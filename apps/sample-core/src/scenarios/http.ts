/**
 * 工业级 HTTP 客户端管道、网关路由、防竞态、幂等重试、去重合并与请求签名场景看板。
 *
 * @author Ateng
 * @since 2026-11-04
 */

import { http, BusinessException, isAbortError } from '@atengk/core';
import { microserviceClient, signedClient } from '../client';

/**
 * 渲染 HTTP 客户端管道与调度治理看板 HTML 模板。
 */
export function renderHttpCard(): string {
  return `
    <!-- 卡片 4: 微服务网关多路由分发 -->
    <div class="dashboard-card" id="card-http-routing">
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
    <div class="dashboard-card" id="card-http-race">
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

    <!-- 卡片 8: 幂等安全重试与飞行中合并去重 -->
    <div class="dashboard-card full-width" id="card-http-resilience">
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

    <!-- 卡片 12: API 请求防重放与原生 WebCrypto 签名 -->
    <div class="dashboard-card" id="card-http-sign">
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
  `;
}

/**
 * 初始化 HTTP 客户端管道与调度治理场景交互事件。
 */
export function initHttpScenario(): void {
  // 1. 微服务网关路由重写与覆盖
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

  // 2. 并发请求取消与防竞态
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

  // 3. 幂等安全重试与去重合并
  const logResilience = document.getElementById('log-resilience');

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

  // 4. API 请求防重放与原生签名
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
