# Vue (响应式通用 Composables)

面向现代 Web 应用的 Vue 3 无头通用 Composables/Hooks 基础设施，提供请求状态机、分页联动、权限控制、实时流与生命周期资源确定性清理。

## 响应式请求与分页

**useRequest**:
异步数据请求响应式包装 Hook，提供 loading、data、error 状态机流转、防抖/节流/轮询、响应式依赖自动刷新（refreshDeps）及只读保护。
_Avoid_: useFetch, useHttp, useApi, useQuery

**usePagination**:
双向绑定 PageQuery 入参与 PageResult 响应的分页状态调度 Hook，基于 useRequest 深度组合，结果集硬性保底空数组。提供五维原子语义动作（翻页、改条数、条件搜索、列排序、全量重置）与响应式依赖自动刷新（refreshDeps）。
_Avoid_: usePage, useTablePagination, usePager

**useLatest**:
解决高频异步操作时序倒挂的竞态控制 Hook，采用“物理中断 + 逻辑过期”双重防御，确保快速切换或连续触发时仅最新一次请求生效并自动作废未决前序请求。
_Avoid_: useRace, useLatestAsync, useCancelPrevious, useAsyncLock

## 状态治理与扩展能力

**useAuth**:
响应式鉴权状态、用户凭据与细粒度权限/角色校验门面 Hook。
_Avoid_: usePermission, useToken, useSession

**useTenant**:
多租户上下文隔离、租户切片与状态响应式切换 Hook。
_Avoid_: useTenantId, useTenantScope

**useIdempotent**:
针对按钮点击、表单提交等写操作的防刷防重与幂等执行互斥锁 Hook。
_Avoid_: useDebounceClick, useLock, usePreventDuplicate

## 数据交换与文件传输

**useExcel**:
基于 Apache Fesod 协议的流式 Excel 导出下载与错误标红批注文件回写调度 Hook。
_Avoid_: useExport, useDownloadExcel, useExcelExport

**useUpload**:
基于 L0 大文件切片与受控并发上传协调器的响应式文件上传 Hook，提供进度统计、单片重试与取消控制。
_Avoid_: useStorage, useFileUpload, useChunkUpload

## 实时通信与流式传输

**useStream**:
基于 L0 StreamClient 的 SSE 服务端发送事件与大模型打字机流式响应封装 Hook。
_Avoid_: useSse, useChatStream, useEventSource

**useWebSocket**:
基于 L0 WebSocketClient 的全双工双向长连接通信与心跳状态机 Hook，提供自动重连与离线缓冲响应式映射。
_Avoid_: useSocket, useWs, useSocketIo
