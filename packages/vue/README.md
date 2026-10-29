# @atengk/vue

面向现代 Web 应用与企业级系统的 Vue 3 响应式通用 Composables/Hooks 基础设施。

---

## 维度零：特性与公共 API 全景速查矩阵

| 特性分类       | 特性名称         | 核心门面 / 方法 / Hook                      | 关键参数 / 返回类型                           | 核心行为说明                                                                                                                                                                            | 锚定验证源头 (*Test / Sample)                                                                                                                    |
| :------------- | :--------------- | :------------------------------------------ | :-------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------- |
| **基础导出**   | 基线版本标识     | `VERSION`                                   | `string`                                      | 导出当前模块编译版本基线                                                                                                                                                                | [index.test.ts](./test/index.test.ts)                                                                                                            |
| **全局上下文** | 插件安装器       | `createAtengVue(options?)`                  | `AtengVueOptions -> Plugin`                   | 全局注入默认配置上下文（默认分页大小、HTTP 实例等）                                                                                                                                     | [context.test.ts](./test/context.test.ts) / [App.vue](../../apps/sample-vue/src/App.vue)                                                         |
| **全局上下文** | 局部配置提供     | `provideAtengConfig(options)`               | `AtengVueOptions -> void`                     | 在组件子树层级局部覆盖上下文配置                                                                                                                                                        | [context.test.ts](./test/context.test.ts) / [App.vue](../../apps/sample-vue/src/App.vue)                                                         |
| **全局上下文** | 配置解析 Hook    | `useAtengConfig()`                          | `() -> AtengVueContext`                       | 获取当前生效的配置上下文，自动回退全局单例                                                                                                                                              | [context.test.ts](./test/context.test.ts) / [App.vue](../../apps/sample-vue/src/App.vue)                                                         |
| **生命周期**   | 安全作用域销毁   | `tryOnScopeDispose(fn)`                     | `(() -> void) -> boolean`                     | 在活跃 effectScope 内安全挂载注销钩子                                                                                                                                                   | [utils.test.ts](./test/utils.test.ts) / [App.vue](../../apps/sample-vue/src/App.vue)                                                             |
| **受管工具**   | 防抖包装函数     | `useDebounceFn(fn, wait)`                   | `(fn, number) -> DebouncedFn`                 | 纯原生防抖函数，带 cancel/flush 并在销毁时注销                                                                                                                                          | [utils.test.ts](./test/utils.test.ts) / [App.vue](../../apps/sample-vue/src/App.vue)                                                             |
| **受管工具**   | 节流包装函数     | `useThrottleFn(fn, interval)`               | `(fn, number) -> ThrottledFn`                 | 纯原生节流函数，带 cancel并在销毁时确定性清理                                                                                                                                           | [utils.test.ts](./test/utils.test.ts) / [App.vue](../../apps/sample-vue/src/App.vue)                                                             |
| **受管工具**   | 全局事件监听     | `useEventListener(target, event, listener)` | `(Target, Event, Listener) -> void`           | 宿主安全事件绑定，组件销毁时自动解绑                                                                                                                                                    | [utils.test.ts](./test/utils.test.ts) / [App.vue](../../apps/sample-vue/src/App.vue)                                                             |
| **异步请求**   | 请求状态机       | `useRequest(service, options?)`             | `(Service, Options) -> UseRequestResult`      | 提供 loading/data/error 只读状态机、防抖/节流/轮询、响应式依赖自动刷新 (refreshDeps) 与抗竞态防御                                                                                       | [useRequest.test.ts](./test/useRequest.test.ts) / [App.vue](../../apps/sample-vue/src/App.vue)                                                   |
| **契约分页**   | 分页调度状态机   | `usePagination(service, options?)`          | `(Service, Options) -> UsePaginationResult`   | 零样板双向绑定 PageQuery/PageResult，五维原子动作（翻页/切条数/搜索/排序/重置）、依赖刷新与空安全保底                                                                                   | [usePagination.test.ts](./test/usePagination.test.ts) / [PaginationDemo.vue](../../apps/sample-vue/src/components/PaginationDemo.vue)            |
| **跨页多选**   | 多选状态机       | `useSelection(options?)`                    | `(Options) -> UseSelectionResult<T>`          | 响应式跨页多选状态机，支持 `selectedKeys`/`selectedRows`/`selectedCount`，具备 `select`/`deselect`/`toggle`/`selectAll`/`clear`/`syncWithData` 等原子动作，雪花 ID 字符串类型安全防截断 | [useSelection.test.ts](./test/useSelection.test.ts) / [TableCrudView.vue](../../apps/sample-element-plus/src/views/table/TableCrudView.vue)      |
| **时序竞态**   | 异步竞态双重防御 | `useLatest(asyncFn, options?)`              | `(AsyncFn, Options) -> UseLatestResult`       | 物理中断在途连接与逻辑序列号丢弃过期回调，根绝时序倒挂脏写                                                                                                                              | [useLatest.test.ts](./test/useLatest.test.ts) / [LatestDemo.vue](../../apps/sample-vue/src/components/LatestDemo.vue)                            |
| **鉴权状态**   | 响应式鉴权门面   | `useAuth(options?)`                         | `(Options) -> UseAuthResult`                  | 登录态双轨 Token 存取、401 自动清理与细粒度权限角色通配匹配                                                                                                                             | [useAuthAndTenant.test.ts](./test/useAuthAndTenant.test.ts) / [AuthTenantDemo.vue](../../apps/sample-vue/src/components/AuthTenantDemo.vue)      |
| **多租户隔离** | 响应式租户切片   | `useTenant(options?)`                       | `(Options) -> UseTenantResult`                | 动态租户切片读取与切换，全应用响应式联动与请求头注入                                                                                                                                    | [useAuthAndTenant.test.ts](./test/useAuthAndTenant.test.ts) / [AuthTenantDemo.vue](../../apps/sample-vue/src/components/AuthTenantDemo.vue)      |
| **防刷防重**   | 提交幂等互斥锁   | `useIdempotent(actionFn, options?)`         | `(Action, Options) -> UseIdempotentResult`    | 按钮连打拦截、执行中互斥加锁与超时自动防死锁解除                                                                                                                                        | [useIdempotent.test.ts](./test/useIdempotent.test.ts) / [IdempotentDemo.vue](../../apps/sample-vue/src/components/IdempotentDemo.vue)            |
| **Excel 驱动** | 流式导出批注回写 | `useExcel(options?)`                        | `(Options) -> UseExcelResult`                 | 结合 Fesod 协议，流式导出、RFC 5987 解析、Blob-JSON 双态拦截与内存回收                                                                                                                  | [useExcel.test.ts](./test/useExcel.test.ts) / [ExcelDemo.vue](../../apps/sample-vue/src/components/ExcelDemo.vue)                                |
| **文件上传**   | 大文件分片并发   | `useUpload(options)`                        | `(Options) -> UseUploadResult`                | 纯原生切片计算、受控并发调度 (默认 3)、状态机、暂停/恢复断点续传与作用域注销                                                                                                            | [useUpload.test.ts](./test/useUpload.test.ts) / [UploadDemo.vue](../../apps/sample-vue/src/components/UploadDemo.vue)                            |
| **流式打字机** | SSE 大模型流式   | `useStream(url, options?)`                  | `(Url, Options) -> UseStreamResult`           | 增量累积打字机文本、SseParser 规范解析、自动断连与作用域确定性注销                                                                                                                      | [useStream.test.ts](./test/useStream.test.ts) / [StreamDemo.vue](../../apps/sample-vue/src/components/StreamDemo.vue)                            |
| **全双工长连** | WebSocket 状态机 | `useWebSocket(url, options?)`               | `(Url, Options) -> UseWebSocketResult`        | 双向心跳保活、指数退避断线重连、离线缓冲队列与作用域确定性清理                                                                                                                          | [useWebSocket.test.ts](./test/useWebSocket.test.ts) / [WebSocketDemo.vue](../../apps/sample-vue/src/components/WebSocketDemo.vue)                |
| **加载防抖**   | 防闪烁时序状态机 | `useAntiFlicker(source, options?)`          | `(Source, Options) -> Readonly<Ref<boolean>>` | 150ms 静默延迟保护（极速请求 0ms 视觉打扰）+ 300ms 最小展示期（平滑淡出，杜绝 1 帧闪烁震颤）与作用域确定性清理                                                                          | [useAntiFlicker.test.ts](./test/useAntiFlicker.test.ts) / [LoadingView.vue](../../apps/sample-element-plus/src/views/containers/LoadingView.vue) |
| **框架布局**   | 标签导航状态机   | `useTabsNav(options?)`                      | `(Options) -> UseTabsNavReturn`               | 多标签页纯算法无头响应式状态机，负责标签增删查改、FIFO 超限淘汰、Affix 保护、KeepAlive 缓存名单计算 (`cachedViews`)、局部刷新调度 (`refreshTab`) 与持久化                               | [useTabsNav.test.ts](./test/useTabsNav.test.ts) / [TabsNavView.vue](../../apps/sample-element-plus/src/views/layout/TabsNavView.vue)             |

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

### 开箱即用多标签页状态机与 KeepAlive 缓存 (useTabsNav)

```vue
<script setup lang="ts">
import { useTabsNav } from '@atengk/vue';

const { tabs, activeKey, cachedViews, openTab, closeTab, refreshTab, closeOthers } = useTabsNav({
  defaultActiveKey: '/dashboard',
  defaultTabs: [
    { key: '/dashboard', title: '工作台首页', affix: true, componentName: 'Dashboard' },
    { key: '/system/user', title: '用户列表', componentName: 'UserList' },
  ],
  maxTabs: 20, // 超过 20 个标签按 FIFO 自动淘汰最早未固定的非激活项
});
</script>

<template>
  <div class="app-layout">
    <!-- 标签栏渲染 -->
    <div class="tabs-nav-bar">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        :class="{ active: tab.key === activeKey }"
        @click="activeKey = tab.key"
      >
        {{ tab.title }}
        <span v-if="!tab.affix" @click.stop="closeTab(tab.key)">×</span>
      </button>
    </div>

    <!-- KeepAlive 真实缓存视口与局部刷新调度 -->
    <KeepAlive :include="cachedViews">
      <router-view :key="activeKey" />
    </KeepAlive>
  </div>
</template>
```

---

## 维度二：生产扩展接管 (Customization & Extensibility)

### 1. 搜索条件与五维原子动作 (含 changeSort 与 refreshDeps)

```ts
interface CustomQuery extends PageQuery {
  keyword?: string;
  departmentId?: number;
}

const activeDept = ref(101);

const pagination = usePagination<UserItem, CustomQuery>(queryUsers, {
  defaultParams: {
    departmentId: 101,
  },
  defaultSortField: 'createTime',
  defaultSortAsc: false,
  // 响应式依赖自动刷新：当 activeDept 改变时，自动将 pageNum 归 1 重新请求
  refreshDeps: activeDept,
});

// 1. 触发搜索：合并新条件并自动重置当前页码归 1
pagination.search({ keyword: '张三' });

// 2. 修改每页显示条数：自动重置当前页码归 1 并重新请求
pagination.changePageSize(20);

// 3. 翻页：跳转至目标页码
pagination.changePage(3);

// 4. 列排序：设置字段与升降序，自动将 pageNum 归 1 并重新发起请求
pagination.changeSort('name', true); // 按姓名升序
pagination.changeSort(undefined); // 清除排序

// 5. 重置：恢复为初始 defaultParams 与初始排序并归 1 页
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

### 3. 异步请求状态机与本地乐观更新 (useRequest)

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useRequest } from '@atengk/vue';

interface UserProfile {
  id: number;
  name: string;
  role: string;
}

// 模拟异步请求服务函数
const fetchUser = async (id: number): Promise<UserProfile> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return {
    id,
    name: id === 1 ? '张三 (超级管理员)' : '李四 (运营人员)',
    role: id === 1 ? 'ADMIN' : 'OPERATOR',
  };
};

const currentUserId = ref(1);
const userRequest = useRequest(fetchUser, {
  defaultParams: [1],
});

const onSwitchUser = (id: number) => {
  currentUserId.value = id;
  userRequest.run(id);
};

// 本地乐观更新：无需等待网络请求直接在视图呈现修改
const onOptimisticMutate = () => {
  userRequest.mutate(prev =>
    prev
      ? { ...prev, name: `${prev.name} [本地乐观修改 ${new Date().toLocaleTimeString()}]` }
      : undefined,
  );
};
</script>

<template>
  <div>
    <button :disabled="userRequest.loading.value" @click="userRequest.refresh()">
      {{ userRequest.loading.value ? '加载处理中...' : '刷新当前用户 (refresh)' }}
    </button>
    <button
      :disabled="userRequest.loading.value"
      @click="onSwitchUser(currentUserId === 1 ? 2 : 1)"
    >
      切换用户 (ID: {{ currentUserId === 1 ? 2 : 1 }})
    </button>
    <button :disabled="!userRequest.data.value" @click="onOptimisticMutate">
      乐观修改 (mutate)
    </button>

    <div v-if="userRequest.loading.value">状态: 加载中...</div>
    <pre>{{ JSON.stringify(userRequest.data.value, null, 2) || '(暂无数据)' }}</pre>
  </div>
</template>
```

### 4. 高频异步操作与抗时序倒挂 (useLatest)

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

### 5. 响应式鉴权与多租户切片 (useAuth & useTenant)

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

### 6. 提交防刷与幂等互斥锁 (useIdempotent)

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

### 7. 流式 Excel 导出与批注回写 (useExcel)

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

### 8. 大文件切片受控并发上传与断点续传 (useUpload)

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

### 9. SSE 大模型打字机流式响应 (useStream)

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

### 10. WebSocket 全双工长连接心跳状态机 (useWebSocket)

```vue
<script setup lang="ts">
import { useWebSocket } from '@atengk/vue';

// 实例化 WebSocket 全双工状态机
const { status, isOpen, data, reconnectAttempt, send, open, close } = useWebSocket(
  'wss://echo.websocket.events',
  {
    heartbeat: {
      interval: 15000,
      pingMessage: 'ping',
      pongMessage: 'pong',
    },
    autoReconnect: {
      maxRetries: 5,
      delay: 1000,
      maxDelay: 10000,
    },
    bufferWhileConnecting: true,
    onMessage: msg => {
      console.log('收到服务端推送:', msg);
    },
  },
);

const onSendMessage = () => {
  send(JSON.stringify({ type: 'chat', content: 'Hello WebSocket!' }));
};
</script>

<template>
  <div>
    <p>状态: {{ status }} | 重连次数: {{ reconnectAttempt }}</p>
    <button :disabled="isOpen" @click="open()">连接</button>
    <button :disabled="!isOpen" @click="close()">断开</button>
    <button :disabled="!isOpen" @click="onSendMessage">发送消息</button>
    <div>最新消息: {{ data }}</div>
  </div>
</template>
```

### 11. 跨页多选与雪花 ID 安全状态机 (useSelection)

```vue
<script setup lang="ts">
import { useSelection } from '@atengk/vue';

interface OrderItem {
  id: string; // 64 位雪花 Long ID
  orderNo: string;
  amount: number;
}

// 实例化跨页多选状态机（天然防 64 位雪花大数截断）
const { selectedKeys, selectedRows, selectedCount, isSelected, toggle, selectAll, clear } =
  useSelection<OrderItem>({
    rowKey: 'id',
  });

// 模拟数据源
const list: OrderItem[] = [
  { id: '189389283928192831', orderNo: 'ORD-001', amount: 100 },
  { id: '189389283928192832', orderNo: 'ORD-002', amount: 200 },
];
</script>

<template>
  <div>
    <p>已勾选: {{ selectedCount }} 项 (IDs: {{ selectedKeys.join(', ') }})</p>
    <button @click="selectAll(list)">全选本页</button>
    <button :disabled="selectedCount === 0" @click="clear">清空勾选</button>

    <ul>
      <li v-for="item in list" :key="item.id">
        <input type="checkbox" :checked="isSelected(item)" @change="toggle(item)" />
        {{ item.orderNo }} - ￥{{ item.amount }}
      </li>
    </ul>
  </div>
</template>
```

### 12. 多标签页状态机进阶：KeepAlive 调度与本地持久化 (useTabsNav)

```vue
<script setup lang="ts">
import { useTabsNav } from '@atengk/vue';

const {
  tabs,
  activeKey,
  cachedViews,
  openTab,
  closeTab,
  closeOthers,
  refreshTab,
  pinTab,
  moveTab,
} = useTabsNav({
  defaultActiveKey: '/dashboard',
  defaultTabs: [
    { key: '/dashboard', title: '工作台首页', affix: true, componentName: 'Dashboard' },
    { key: '/system/user', title: '用户列表', componentName: 'UserList' },
    { key: '/system/role', title: '角色权限', componentName: 'RoleList' },
  ],
  maxTabs: 10, // 超限时 FIFO 淘汰最早非固定标签
  persistKey: 'MY_APP_TABS', // 本地持久化缓存 Key
  storageType: 'session', // 可选 'local' | 'session'
  onRefresh: async key => {
    // 局部刷新钩子通知
    console.log(`页面 ${key} 正在局部刷新重载`);
  },
});

// 手动触发指定页面局部物理重新挂载（从 cachedViews 瞬态剔除下一帧加回）
const onRefreshCurrent = () => {
  refreshTab(activeKey.value);
};

// 拖拽调序（普通标签不能移至固定标签之前，内置防呆）
const onDragReorder = (fromIdx: number, toIdx: number) => {
  moveTab(fromIdx, toIdx);
};
</script>
```

---

## 维度三：核心生产边界与非功能语义 (Production Boundary)

- **空安全保底不变量 (Null Safety Invariant)**：
  无论是未决状态、网络超时、业务异常还是服务端返回 `null`/`undefined`，`list` 100% 保底返回空数组 `[]`，`total` 保底返回 `0`，彻底阻断模板层白屏崩溃；
- **多标签页 FIFO 容量淘汰与 Affix 锁定防关不变量 (TabsNav Invariant)**：
  `useTabsNav` 内置标签容量安全上限（`maxTabs`）。当标签数量超标时，状态机按照先进先出（FIFO）算法自动淘汰最早打开的非固定标签，绝对不会淘汰带 `affix: true` 的常驻标签；固定标签不可关闭（`closeTab`、`closeOthers`、`closeAll` 均严格跳过）；拖拽调序时内置防呆逻辑，普通标签禁止被拖放至固定标签前方；
- **KeepAlive 局部刷新零闪烁调度不变量 (RefreshTab Zero-Flicker Invariant)**：
  `refreshTab(key)` 局部刷新时，状态机通过 `nextTick` 从 `cachedViews` 名单中瞬态剔除该组件的 `componentName`，驱动 Vue KeepAlive 彻底卸载其缓存实例，在异步钩子执行完毕后下一帧再安全将名称纳管回 `cachedViews`，实现真正开箱即用的局部物理重新挂载，彻底根绝必须刷新整页或刷新失效的痛点；
- **跨页多选雪花 Long ID 字符串归一化不变量 (Snowflake Selection Invariant)**：
  `useSelection` 针对后端返回的 64 位分布式大数主键（Snowflake ID），在内部一律使用 `String(key)` 进行强制类型归一化与哈希映射。内部以 `Map<string, T>` 存储跨页缓存，杜绝底层 JS Number 转换为浮点导致末位丢失和勾选错乱。同时提供 `syncWithData` 在翻页时同步更新已缓存对象的最新属性；
- **异步竞态双重协同防御机制 (Dual Defense Invariant)**：
  在 `useLatest` 与 `useRequest({ cancelPrevious: true })` 中，实施“物理切断 + 逻辑过期”双重防线：后发新请求触发时，一方面调用 `AbortController.abort()` 物理切断底层 HTTP 物理连接节省网络带宽；另一方面递增生成单调自增序列号，即使先发慢请求底层不支持中断而在稍后 resolve/reject，其结果与异常也将在逻辑层被 100% 丢弃，彻底根绝数据时序倒挂；
- **Blob-JSON 双态异常识别与 Excel 安全回写不变量 (Blob Error & Fesod Protocol)**：
  `useExcel` 针对 `responseType: 'blob'` 实施双态嗅探：若响应头或载荷为 `application/json`，必须异步提取文本解析为 `Result<never>` 并转译为 `BusinessException` 抛出，彻底杜绝下载损坏伪文件；优先采用 RFC 5987 / RFC 6266 `filename*=` 提取 UTF-8 编码文件名，并在下载后由 `URL.revokeObjectURL` 确定性回收内存；
- **大文件切片受控并发与断点续传不变量 (Chunk Upload & Concurrency Invariant)**：
  `useUpload` 响应式桥接 `UploadCoordinator`，坚持纯原生 `Blob.prototype.slice` 算法切分文件并保证零孔洞；并发度严格受限不溢出（默认 3）；切片级局部异常采用指数退避重试而不推倒整体；在途主动 `pause()` 时物理切断未决切片请求并将状态置为 `paused`，`resume()` 仅扫描未完成切片恢复上传，实现真正的零重复传输断点续传；
- **SSE 打字机增量响应与防分包撕裂不变量 (SSE Stream & Typewriter Invariant)**：
  `useStream` 基于 Web 标准 `ReadableStream` 与纯原生 `SseParser`，支持跨网络分包撕裂缓冲区无损拼接，原生自动过滤大模型 `[DONE]` 终止符；支持 `autoConnect` 自动握手与 `abort()` 物理切断，在活跃作用域销毁时由 `tryOnScopeDispose` 确定性注销读取器释放句柄；
- **WebSocket 双向心跳保活与指数退避重连不变量 (WebSocket Heartbeat & Reconnect Invariant)**：
  `useWebSocket` 基于 `@atengk/core` 的 `WebSocketClient` 架构，提供开箱即用的应用层双向心跳（`heartbeat` 定时发送 ping 并等待服务端 pong，超时自动判定假死断线重连）；内置离散抖动指数退避自动重连机制（`autoReconnect`）；开启 `bufferWhileConnecting` 时，连接就绪前发送的消息自动进入高阶离线缓冲队列并在握手成功后原子刷新清空；在组件或活跃作用域卸载时，通过 `tryOnScopeDispose` 确定性断开物理连接并注销所有事件监听与定时器句柄，彻底杜绝僵尸长连接与内存泄漏；
- **响应式鉴权与多租户切片不变量 (Auth & Tenant Reactivity Invariant)**：
  `useAuth` 与 `useTenant` 基于单例维度映射响应式状态，全应用跨组件即时同步；当底层 HTTP 拦截器捕获 401 触发 `authManager.handleUnauthorized()` 时，响应式登录态自动清理为未登录；`tenantManager` 租户切换时全应用无缝响应重绘；
- **提交防刷与防死锁互斥锁不变量 (Idempotent Mutex & Deadlock Prevention Invariant)**：
  `useIdempotent` 针对写操作严格维持 `executing` 执行中独占互斥锁，连击请求直接阻断；同时配备可配置的安全 `timeout` 熔断机制，超时后确定性自动释放互斥锁，杜绝前端死锁卡死；
- **状态单向流与只读保护 (Readonly Reactivity Invariant)**：
  对外暴露的响应式状态（`pageNum`、`pageSize`、`total`、`list`、`loading`、`error`、`data`、`token`、`tenantId`、`executing`、`exporting`、`status`、`uploading`、`progress`、`chunks`、`text`、`isStreaming`、`isOpen`、`isClosed`、`reconnectAttempt`）统一通过 `readonly()` 包裹导出，严禁在调用方外部就地修改；
- **确定性生命周期回收**：
  所有异步状态机在组件或活跃作用域销毁时，均通过 `tryOnScopeDispose` 自动物理切断未决请求（`AbortController` / WebSocket 连接）并销毁定时器。

---

## 维度四：物理排版与代码全真验证

所有示例均经过内部单元测试（[useSelection.test.ts](./test/useSelection.test.ts)、[useRequest.test.ts](./test/useRequest.test.ts)、[usePagination.test.ts](./test/usePagination.test.ts)、[useLatest.test.ts](./test/useLatest.test.ts)、[useAuthAndTenant.test.ts](./test/useAuthAndTenant.test.ts)、[useIdempotent.test.ts](./test/useIdempotent.test.ts)、[useExcel.test.ts](./test/useExcel.test.ts)、[useUpload.test.ts](./test/useUpload.test.ts)、[useStream.test.ts](./test/useStream.test.ts)、[useWebSocket.test.ts](./test/useWebSocket.test.ts)、[context.test.ts](./test/context.test.ts)、[utils.test.ts](./test/utils.test.ts)、[index.test.ts](./test/index.test.ts)）与 `apps/sample-vue` 1:1 镜像自验工程全真运行验证。
