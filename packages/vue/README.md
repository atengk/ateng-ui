# @atengk/vue

面向现代 Web 应用与企业级中后台的 Vue 3 响应式通用 Composables/Hooks 基础设施。

---

## 维度零：特性与公共 API 全景速查矩阵

| 特性分类       | 特性名称         | 核心门面 / 方法 / Hook                      | 关键参数 / 返回类型                         | 核心行为说明                                                                 | 锚定验证源头 (*Test / Sample)                               |
| :------------- | :--------------- | :------------------------------------------ | :------------------------------------------ | :--------------------------------------------------------------------------- | :---------------------------------------------------------- |
| **基础导出**   | 基线版本标识     | `VERSION`                                   | `string`                                    | 导出当前模块编译版本基线                                                     | [index.test.ts](./test/index.test.ts)                       |
| **全局上下文** | 插件安装器       | `createAtengVue(options?)`                  | `AtengVueOptions -> Plugin`                 | 全局注入默认配置上下文（默认分页大小、HTTP 实例等）                          | [context.test.ts](./test/context.test.ts)                   |
| **全局上下文** | 局部配置提供     | `provideAtengConfig(options)`               | `AtengVueOptions -> void`                   | 在组件子树层级局部覆盖上下文配置                                             | [context.test.ts](./test/context.test.ts)                   |
| **全局上下文** | 配置解析 Hook    | `useAtengConfig()`                          | `() -> AtengVueContext`                     | 获取当前生效的配置上下文，自动回退全局单例                                   | [context.test.ts](./test/context.test.ts)                   |
| **生命周期**   | 安全作用域销毁   | `tryOnScopeDispose(fn)`                     | `(() -> void) -> boolean`                   | 在活跃 effectScope 内安全挂载注销钩子                                        | [utils.test.ts](./test/utils.test.ts)                       |
| **受管工具**   | 防抖包装函数     | `useDebounceFn(fn, wait)`                   | `(fn, number) -> DebouncedFn`               | 纯原生防抖函数，带 cancel/flush 并在销毁时注销                               | [utils.test.ts](./test/utils.test.ts)                       |
| **受管工具**   | 节流包装函数     | `useThrottleFn(fn, interval)`               | `(fn, number) -> ThrottledFn`               | 纯原生节流函数，带 cancel并在销毁时确定性清理                                | [utils.test.ts](./test/utils.test.ts)                       |
| **受管工具**   | 全局事件监听     | `useEventListener(target, event, listener)` | `(Target, Event, Listener) -> void`         | 宿主安全事件绑定，组件销毁时自动解绑                                         | [utils.test.ts](./test/utils.test.ts)                       |
| **异步请求**   | 请求状态机       | `useRequest(service, options?)`             | `(Service, Options) -> UseRequestResult`    | 提供 loading/data/error 只读状态机、防抖/节流/轮询与抗竞态防御               | [useRequest.test.ts](./test/useRequest.test.ts)             |
| **契约分页**   | 分页调度状态机   | `usePagination(service, options?)`          | `(Service, Options) -> UsePaginationResult` | 零样板双向绑定 PageQuery/PageResult，四维原子动作与空安全保底                | [usePagination.test.ts](./test/usePagination.test.ts)       |
| **时序竞态**   | 异步竞态双重防御 | `useLatest(asyncFn, options?)`              | `(AsyncFn, Options) -> UseLatestResult`     | 物理中断在途连接与逻辑序列号丢弃过期回调，根绝时序倒挂脏写                   | [useLatest.test.ts](./test/useLatest.test.ts)               |
| **鉴权状态**   | 响应式鉴权门面   | `useAuth(options?)`                         | `(Options) -> UseAuthResult`                | 登录态双轨 Token 存取、401 自动清理与细粒度权限角色通配匹配                  | [useAuthAndTenant.test.ts](./test/useAuthAndTenant.test.ts) |
| **多租户隔离** | 响应式租户切片   | `useTenant(options?)`                       | `(Options) -> UseTenantResult`              | 动态租户切片读取与切换，全应用响应式联动与请求头注入                         | [useAuthAndTenant.test.ts](./test/useAuthAndTenant.test.ts) |
| **防刷防重**   | 提交幂等互斥锁   | `useIdempotent(actionFn, options?)`         | `(Action, Options) -> UseIdempotentResult`  | 按钮连打拦截、执行中互斥加锁与超时自动防死锁解除                             | [useIdempotent.test.ts](./test/useIdempotent.test.ts)       |
| **Excel 驱动** | 流式导出批注回写 | `useExcel(options?)`                        | `(Options) -> UseExcelResult`               | 结合 Fesod 协议，流式导出、RFC 5987 解析、Blob-JSON 双态拦截与内存回收       | [useExcel.test.ts](./test/useExcel.test.ts)                 |
| **文件上传**   | 大文件分片并发   | `useUpload(options)`                        | `(Options) -> UseUploadResult`              | 纯原生切片计算、受控并发调度 (默认 3)、状态机、暂停/恢复断点续传与作用域注销 | [useUpload.test.ts](./test/useUpload.test.ts)               |
| **流式打字机** | SSE 大模型流式   | `useStream(url, options?)`                  | `(Url, Options) -> UseStreamResult`         | 增量累积打字机文本、SseParser 规范解析、自动断连与作用域确定性注销           | [useStream.test.ts](./test/useStream.test.ts)               |

---

## 维度一：最小起步体验 (Happy Path)

### 安装依赖

```bash
pnpm add @atengk/core @atengk/vue vue
```

### 开箱即用分页 (usePagination)

```vue
<script setup lang="ts">
import { usePagination } from '@atengk/vue';
import type { PageQuery, PageResult } from '@atengk/core';

interface UserItem {
  id: number;
  name: string;
}

// 模拟分页服务函数
const queryUsers = async (params: PageQuery): Promise<PageResult<UserItem>> => {
  const res = await fetch(`/api/users?pageNum=${params.pageNum}&pageSize=${params.pageSize}`);
  return res.json();
};

// 初始化状态机
const { pageNum, pageSize, total, list, loading, changePage, changePageSize, search, reset } =
  usePagination(queryUsers, {
    defaultPageSize: 10,
  });
</script>

<template>
  <div v-loading="loading">
    <ul>
      <!-- 空安全保底：list 100% 保证为数组，彻底杜绝 NPE -->
      <li v-for="user in list" :key="user.id">{{ user.name }}</li>
    </ul>

    <div>
      <button :disabled="pageNum <= 1" @click="changePage(pageNum - 1)">上一页</button>
      <span>第 {{ pageNum }} 页 / 共 {{ total }} 条</span>
      <button @click="changePage(pageNum + 1)">下一页</button>
    </div>
  </div>
</template>
```

---

## 维度二：生产扩展接管 (Customization & Extensibility)

### 1. 搜索条件与四维原子动作

```ts
interface CustomQuery extends PageQuery {
  keyword?: string;
  departmentId?: number;
}

const pagination = usePagination<UserItem, CustomQuery>(queryUsers, {
  defaultParams: {
    departmentId: 101,
  },
});

// 1. 触发搜索：合并新条件并自动重置当前页码归 1
pagination.search({ keyword: '张三' });

// 2. 修改每页显示条数：自动重置当前页码归 1 并重新请求
pagination.changePageSize(20);

// 3. 翻页：跳转至目标页码
pagination.changePage(3);

// 4. 重置：清空额外搜索条件，恢复为初始 defaultParams 并归 1 页
pagination.reset();
```

### 2. 全局分页大小统一接管

```ts
import { createApp } from 'vue';
import { createAtengVue } from '@atengk/vue';
import App from './App.vue';

const app = createApp(App);

// 全局注册默认分页大小（缺省时为 20 条/页）
app.use(
  createAtengVue({
    defaultPageSize: 20,
  }),
);

app.mount('#app');
```

### 3. 高频异步操作与抗时序倒挂 (useLatest)

```vue
<script setup lang="ts">
import { useLatest } from '@atengk/vue';
import { http } from '@atengk/core';

// 首参注入当前请求专属的 AbortSignal，可直接交付底层 HTTP 客户端物理中断
const { run, data, loading } = useLatest(async (signal, keyword: string) => {
  return await http.get('/api/search', {
    params: { keyword },
    signal,
  });
});

const handleInput = (event: Event) => {
  const value = (event.target as HTMLInputElement).value;
  run(value);
};
</script>

<template>
  <div>
    <input placeholder="输入关键字搜索..." @input="handleInput" />
    <span v-if="loading">搜索中...</span>
    <div>最新结果: {{ data }}</div>
  </div>
</template>
```

### 4. 响应式鉴权与多租户切片 (useAuth & useTenant)

```vue
<script setup lang="ts">
import { useAuth, useTenant } from '@atengk/vue';

// 鉴权门面：支持细粒度权限通配符与角色判断
const { isAuthenticated, hasPermission, hasRole, login, logout } = useAuth();

// 租户切片：支持租户 ID 响应式读取与动态切换
const { tenantId, setTenantId, clearTenantId } = useTenant();

// 执行登录
const handleLogin = () => {
  login({
    token: 'jwt-token-xyz',
    permissions: ['sys:user:*', 'order:view'],
    roles: ['manager'],
  });
};
</script>

<template>
  <div>
    <p>登录状态: {{ isAuthenticated ? '已登录' : '未登录' }}</p>
    <p>当前租户: {{ tenantId || '默认租户' }}</p>

    <!-- 权限受控元素 -->
    <button v-if="hasPermission('sys:user:add')">新增用户</button>
    <button v-if="hasRole('admin')">超管操作</button>
  </div>
</template>
```

### 5. 提交防刷与幂等互斥锁 (useIdempotent)

```vue
<script setup lang="ts">
import { useIdempotent } from '@atengk/vue';
import { http } from '@atengk/core';

// 包装写操作（保存/提交/扣款），支持超时防死锁
const { executing, run } = useIdempotent(
  async (orderId: string) => {
    return await http.post(`/api/orders/${orderId}/pay`);
  },
  {
    timeout: 5000,
    onBlocked: () => {
      alert('正在处理中，请勿重复点击！');
    },
  },
);
</script>

<template>
  <button :disabled="executing" @click="run('ORDER_001')">
    {{ executing ? '正在安全扣款...' : '确认支付' }}
  </button>
</template>
```

### 6. 流式 Excel 导出与批注回写 (useExcel)

```vue
<script setup lang="ts">
import { useExcel } from '@atengk/vue';
import { http } from '@atengk/core';

// 实例化导出状态机
const { exporting, exportExcel, downloadFeedback, abort } = useExcel({
  defaultFilename: '默认销售报表_2026.xlsx',
  onSuccess: (_blob, filename) => {
    console.log('导出完成:', filename);
  },
  onError: err => {
    // 双态识别：若后端返回 JSON 业务错误，捕获强类型 BusinessException 且不下载伪损坏文件
    console.error('导出异常:', err);
  },
});

// 1. 触发流式导出（支持直接传入 URL、配置对象或服务函数）
const handleExport = () => {
  exportExcel('/api/reports/sales/export', '2026年Q1销售明细.xlsx');
};

// 2. 导入校验失败时，下载服务端回写的标红批注反馈文件（Fesod 协议）
const handleDownloadFeedback = (feedbackBlob: Blob) => {
  downloadFeedback(feedbackBlob, '用户导入_批注回写_2026.xlsx');
};
</script>

<template>
  <div>
    <button :disabled="exporting" @click="handleExport">
      {{ exporting ? '正在导出中...' : '流式导出 Excel' }}
    </button>
    <button :disabled="!exporting" @click="abort">中断导出</button>
  </div>
</template>
```

### 7. 大文件切片受控并发上传与断点续传 (useUpload)

```vue
<script setup lang="ts">
import { useUpload, type UploadChunkItem } from '@atengk/vue';
import { http } from '@atengk/core';

// 实例化上传状态机与并发队列调度器
const { status, uploading, progress, chunks, upload, pause, resume, cancel, reset } = useUpload({
  chunkSize: 5 * 1024 * 1024, // 5MB 分片
  concurrency: 3, // 最大 3 并发连接
  maxRetries: 2, // 单切片局部重试 2 次
  uploadChunk: async (chunk: UploadChunkItem, signal?: AbortSignal) => {
    const formData = new FormData();
    formData.append('chunk', chunk.chunk);
    formData.append('index', String(chunk.index));
    formData.append('totalChunks', String(chunk.totalChunks));
    return await http.post('/api/files/upload-chunk', formData, { signal });
  },
  onProgress: (percent, loaded, total) => {
    console.log(`上传进度: ${percent}% (${loaded}/${total})`);
  },
});

const onFileSelected = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) {
    upload(file);
  }
};
</script>

<template>
  <div>
    <input type="file" :disabled="uploading" @change="onFileSelected" />
    <div v-if="chunks.length > 0">
      <p>状态: {{ status }} | 进度: {{ progress }}%</p>
      <button :disabled="!uploading" @click="pause">暂停</button>
      <button :disabled="status !== 'paused'" @click="resume">断点恢复</button>
      <button :disabled="status === 'idle'" @click="cancel">取消</button>
    </div>
  </div>
</template>
```

### 8. SSE 大模型打字机流式响应 (useStream)

```vue
<script setup lang="ts">
import { useStream } from '@atengk/vue';

// 实例化流式打字机状态机
const { text, isStreaming, event, start, abort, reset } = useStream('/api/v1/chat/completions', {
  method: 'POST',
  body: { prompt: '请简述 ateng-ui 的设计理念' },
  onMessage: (chunk, sseEvent) => {
    console.log('增量分块:', chunk, sseEvent?.id);
  },
  onDone: fullText => {
    console.log('流式传输结束，全文:', fullText);
  },
});
</script>

<template>
  <div>
    <button :disabled="isStreaming" @click="start()">
      {{ isStreaming ? '正在生成中...' : '开始生成' }}
    </button>
    <button :disabled="!isStreaming" @click="abort">中断</button>
    <button @click="reset">清空</button>

    <div class="terminal-content">
      <span>{{ text }}</span>
      <span v-if="isStreaming" class="cursor"></span>
    </div>
  </div>
</template>
```

---

## 维度三：核心生产边界与非功能语义 (Production Boundary)

- **空安全保底不变量 (Null Safety Invariant)**：
  无论是未决状态、网络超时、业务异常还是服务端返回 `null`/`undefined`，`list` 100% 保底返回空数组 `[]`，`total` 保底返回 `0`，彻底阻断模板层白屏崩溃；
- **异步竞态双重协同防御机制 (Dual Defense Invariant)**：
  在 `useLatest` 与 `useRequest({ cancelPrevious: true })` 中，实施“物理切断 + 逻辑过期”双重防线：后发新请求触发时，一方面调用 `AbortController.abort()` 物理切断底层 HTTP 物理连接节省网络带宽；另一方面递增生成单调自增序列号，即使先发慢请求底层不支持中断而在稍后 resolve/reject，其结果与异常也将在逻辑层被 100% 丢弃，彻底根绝数据时序倒挂；
- **Blob-JSON 双态异常识别与 Excel 安全回写不变量 (Blob Error & Fesod Protocol)**：
  `useExcel` 针对 `responseType: 'blob'` 实施双态嗅探：若响应头或载荷为 `application/json`，必须异步提取文本解析为 `Result<never>` 并转译为 `BusinessException` 抛出，彻底杜绝下载损坏伪文件；优先采用 RFC 5987 / RFC 6266 `filename*=` 提取 UTF-8 编码文件名，并在下载后由 `URL.revokeObjectURL` 确定性回收内存；
- **大文件切片受控并发与断点续传不变量 (Chunk Upload & Concurrency Invariant)**：
  `useUpload` 响应式桥接 `UploadCoordinator`，坚持纯原生 `Blob.prototype.slice` 算法切分文件并保证零孔洞；并发度严格受限不溢出（默认 3）；切片级局部异常采用指数退避重试而不推倒整体；在途主动 `pause()` 时物理切断未决切片请求并将状态置为 `paused`，`resume()` 仅扫描未完成切片恢复上传，实现真正的零重复传输断点续传；
- **SSE 打字机增量响应与防分包撕裂不变量 (SSE Stream & Typewriter Invariant)**：
  `useStream` 基于 Web 标准 `ReadableStream` 与纯原生 `SseParser`，支持跨网络分包撕裂缓冲区无损拼接，原生自动过滤大模型 `[DONE]` 终止符；支持 `autoConnect` 自动握手与 `abort()` 物理切断，在活跃作用域销毁时由 `tryOnScopeDispose` 确定性注销读取器释放句柄；
- **响应式鉴权与多租户切片不变量 (Auth & Tenant Reactivity Invariant)**：
  `useAuth` 与 `useTenant` 基于单例维度映射响应式状态，全应用跨组件即时同步；当底层 HTTP 拦截器捕获 401 触发 `authManager.handleUnauthorized()` 时，响应式登录态自动清理为未登录；`tenantManager` 租户切换时全应用无缝响应重绘；
- **提交防刷与防死锁互斥锁不变量 (Idempotent Mutex & Deadlock Prevention Invariant)**：
  `useIdempotent` 针对写操作严格维持 `executing` 执行中独占互斥锁，连击请求直接阻断；同时配备可配置的安全 `timeout` 熔断机制，超时后确定性自动释放互斥锁，杜绝前端死锁卡死；
- **状态单向流与只读保护 (Readonly Reactivity Invariant)**：
  对外暴露的响应式状态（`pageNum`、`pageSize`、`total`、`list`、`loading`、`error`、`data`、`token`、`tenantId`、`executing`、`exporting`、`status`、`uploading`、`progress`、`chunks`、`text`、`isStreaming`）统一通过 `readonly()` 包裹导出，严禁在调用方外部就地修改；
- **确定性生命周期回收**：
  所有异步状态机在组件或活跃作用域销毁时，均通过 `tryOnScopeDispose` 自动物理切断未决请求（`AbortController`）并销毁定时器。

---

## 维度四：物理排版与代码全真验证

所有示例均经过内部单元测试（[usePagination.test.ts](./test/usePagination.test.ts)、[useLatest.test.ts](./test/useLatest.test.ts)、[useAuthAndTenant.test.ts](./test/useAuthAndTenant.test.ts)、[useIdempotent.test.ts](./test/useIdempotent.test.ts)、[useExcel.test.ts](./test/useExcel.test.ts)、[useUpload.test.ts](./test/useUpload.test.ts)、[useStream.test.ts](./test/useStream.test.ts)）与 `apps/sample-vue` 1:1 镜像自验工程全真运行验证。
