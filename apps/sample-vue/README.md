# sample-vue

`@atengk/vue` 1:1 响应式通用 Composables/Hooks 基础设施交互沙箱与自验展厅。

---

## 模块定位与运行方式

本工程基于 Vue 3.5 + Vite 6 构建，用于真实交互自验 `@atengk/vue` 导出的全部 Composables 与状态机，并作为 CI/CD 阶段的端到端构建与规范把关沙箱。

### 启动本地开发服务

```bash
pnpm --filter sample-vue dev
```

默认在 `http://localhost:3002/` 启动，支持热更新（HMR）。

### 质量自验命令

```bash
pnpm --filter sample-vue typecheck  # TypeScript 严格类型检查
pnpm --filter sample-vue lint       # ESLint 静态代码检查
pnpm --filter sample-vue build      # Vite 生产构建打包
```

---

## 包含的交互自验模块

1. **全局配置注入自验 (createAtengVue & useAtengConfig)**：验证全局插件默认分页大小与单例 HTTP 注入。
2. **纯原生受管微工具自验 (Debounce / Throttle / EventListener)**：验证纯原生防抖、节流与事件解绑。
3. **异步请求状态机自验 (useRequest)**：验证 loading/data/error 状态流转与本地乐观更新 mutate。
4. **契约分页状态机自验 (PaginationDemo / usePagination)**：验证四维原子动作与空数组保底。
5. **异步时序竞态双重防御自验 (LatestDemo / useLatest)**：验证快速切换请求时的物理中断与逻辑丢弃。
6. **响应式鉴权与多租户切片自验 (AuthTenantDemo / useAuth & useTenant)**：验证登录态、细粒度权限/角色校验与动态租户切换。
7. **前端提交防刷与幂等互斥锁自验 (IdempotentDemo / useIdempotent)**：验证高频连打拦截与超时自动防死锁。
8. **Fesod 流式 Excel 导出与批注回写自验 (ExcelDemo / useExcel)**：验证流式导出、Blob-JSON 双态拦截与标红批注回写。
9. **大文件分片切片与受控并发上传自验 (UploadDemo / useUpload)**：验证大文件原生切片、受控并发上传与断点续传。
10. **SSE 大模型打字机流式响应自验 (StreamDemo / useStream)**：验证 ReadableStream 增量流解析与自动断连。
11. **WebSocket 全双工长连接心跳状态机自验 (WebSocketDemo / useWebSocket)**：验证双向心跳保活、假死超时判定、指数退避重连与离线缓冲队列。
