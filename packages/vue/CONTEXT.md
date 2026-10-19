# Vue (响应式通用 Composables)

面向现代 Web 应用的 Vue 3 无头通用 Composables/Hooks 基础设施，提供请求状态机、分页联动、权限控制与生命周期资源确定性清理。

## 响应式请求与分页

**useRequest**:
异步数据请求响应式包装 Hook，提供 loading、data、error 状态机流转与防抖/节流/轮询能力。
_Avoid_: useFetch, useHttp, useApi, useQuery

**usePagination**:
双向绑定 PageQuery 入参与 PageResult 响应的分页状态调度 Hook。
_Avoid_: usePage, useTablePagination, usePager

## 状态治理与扩展能力

**useAuth**:
响应式 Sa-Token 鉴权状态、用户凭据与细粒度权限/角色校验门面 Hook。
_Avoid_: usePermission, useToken, useSession

**useTenant**:
多租户上下文隔离、租户切片与状态响应式切换 Hook。
_Avoid_: useTenantId, useTenantScope

**useExcel**:
基于 Apache Fesod 协议的流式 Excel 导出下载与错误标红批注文件回写调度 Hook。
_Avoid_: useExport, useDownloadExcel, useExcelExport
