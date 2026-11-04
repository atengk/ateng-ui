/**
 * @atengk/core 原生 TS 契约与网络层自验工程交互看板主入口。
 *
 * 模块化组装 6 大能力领域可视化协议场景看板：
 * 1. 统一强类型响应契约与雪花 Long ID 大数防截断
 * 2. 工业级 HTTP 客户端管道、网关路由、防竞态与请求签名
 * 3. 双轨 Token 鉴权门面、401 闭环、多租户上下文与时效本地缓存
 * 4. Web 原生流式打字机与全双工 WebSocket 长连接矩阵
 * 5. 二进制 Blob 双态异常识别安全下载与大文件分片受控并发上传
 * 6. 内存真明文展示脱敏矩阵、金融级高精度金额换算与强类型业务断言
 *
 * @author Ateng
 * @since 2026-10-20
 */

import './style.css';
import { VERSION } from '@atengk/core';
import { initSharedClients } from './client';
import { renderContractsCard, initContractsScenario } from './scenarios/contracts';
import { renderHttpCard, initHttpScenario } from './scenarios/http';
import { renderAuthCard, initAuthScenario } from './scenarios/auth';
import { renderStreamWsCard, initStreamWsScenario } from './scenarios/stream-ws';
import { renderUploadCard, initUploadScenario } from './scenarios/upload';
import { renderSecurityCard, initSecurityScenario } from './scenarios/security';

// 1. 初始化共享网络与 Mock 客户端
initSharedClients();

// 2. 构建页面主容器与 6 大领域场景看板
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
        ${renderContractsCard()}
        ${renderHttpCard()}
        ${renderAuthCard()}
        ${renderStreamWsCard()}
        ${renderUploadCard()}
        ${renderSecurityCard()}
      </div>
    </div>
  `;

  // 3. 挂载 6 大领域场景交互逻辑
  initContractsScenario();
  initHttpScenario();
  initAuthScenario();
  initStreamWsScenario();
  initUploadScenario();
  initSecurityScenario();
}
