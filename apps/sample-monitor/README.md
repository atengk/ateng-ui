# sample-monitor

`@atengk/monitor` 1:1 全链路可观测性与异常监控基础设施交互沙箱与自验展厅。

---

## 模块定位与运行方式

本工程基于 Vue 3.5 + Element Plus 2.14 + Vite 6 构建，用于真实交互自验 `@atengk/monitor` 导出的全部插件与核心能力（异常捕获、白屏采样、Web Vitals、用户行为面包屑、网络嗅探、防死循环与 TraceId 串联），并作为端到端构建与质量把关沙箱。

### 启动本地开发服务

```bash
pnpm --filter sample-monitor dev
```

默认在 `http://localhost:3010/` 启动，支持热更新（HMR）。

### 质量自验命令

```bash
pnpm --filter sample-monitor test       # Vitest 端到端自洽单元测试
pnpm --filter sample-monitor typecheck  # TypeScript 严格类型检查
pnpm --filter sample-monitor lint       # ESLint 静态代码检查
pnpm --filter sample-monitor build      # Vite 生产构建打包
```

---

## 包含的 5 大交互自验面板

1. **故障注入与异常熔断控制台 (Fault Injection & Circuit Breaker)**：
   - 交互式模拟触发 JS 同步抛错、Promise 异步拒付、静态资源 404 加载崩溃；
   - 模拟 Vue 组件渲染异常，验证 `createVueErrorHandler` 纯 TS 无损错误桥接；
   - 模拟连续 15 次高频异常抛出，验证 5s 指纹防抖聚合与单会话熔断断路器（休眠保护）。

2. **白屏感知与容器白名单自愈视窗 (White Screen & Skeleton Whitelist)**：
   - 模拟清空视窗触发 3×3 点阵采样，自动判定白屏并生成 `white_screen` 诊断告警；
   - 切换骨架屏（`.skeleton-box`），验证白名单祖先追溯与免报机制；
   - 自愈恢复正常业务内容。

3. **性能指标动态大盘与卡顿感知 (Web Vitals & Long Task)**：
   - 实时读取并渲染 Core Web Vitals 指标卡（FCP, LCP, CLS, TTFB），对齐 Google 官方体验评级；
   - 模拟执行 120ms 阻塞长任务，验证 >50ms Long Task 监听与 Jank 性能告警。

4. **用户行为面包屑轨迹与三级脱敏时间轴 (Breadcrumbs & PII Sanitizer)**：
   - 交互测试普通输入框、密码输入框与 `[data-monitor-mask]` 容器，验证三级脱敏管道自动 `******` 掩码；
   - 模拟 SPA 虚拟路由流转（`history.pushState` 与 Hash 路由），展示下一帧渲染稳定耗时与自动派发 `PAGE_VIEW`；
   - 实时回放最近 30 条行为面包屑时间轴。

5. **本地 Mock APM 实时事件接收终端 (Live APM Terminal)**：
   - 实时捕获并展示所有上报的遥测事件（折叠查看完整 JSON 载荷与 Context 快照）；
   - 支持按分类筛选（异常、网络、性能、白屏、自定义）与一键清空；
   - 模拟 `@atengk/core` Axios 协同拦截器，自动从响应体 `Result<T>` 或 Header 提取后端分布式 MDC `traceId` 并完成端到端串联回显。
