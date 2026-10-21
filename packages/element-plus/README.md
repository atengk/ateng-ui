# @atengk/element-plus

面向现代 Web 应用与企业级系统的 Element Plus 基础设施增强组件库与指令集。坚持纯原生 TypeScript、强类型契约、零臃肿依赖与深模块解耦设计，深度打通 `@atengk/core` 与 `@atengk/vue` 基础设施能力。

---

## 维度零：特性与公共 API 全景速查矩阵

| 特性分类     | 特性名称           | 核心门面 / 组件 / 指令                          | 关键参数 / Props / Emits                                                                        | 核心行为说明                                                                                                                                                                                                                                                    | 锚定验证源头 (*Test / Sample)                                                     |
| :----------- | :----------------- | :---------------------------------------------- | :---------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------- |
| **基础底座** | 插件全局安装器     | `install(app)` / `installer`                    | `app: App`                                                                                      | 批量注册官方 PascalCase 组件与全部操作指令，具备 Symbol 幂等保护                                                                                                                                                                                                | [`install.test.ts`](./test/install.test.ts)                                       |
| **基础底座** | 版本标识           | `VERSION`                                       | `string`                                                                                        | 导出当前模块运行时版本号（0.1.0）                                                                                                                                                                                                                               | [`index.test.ts`](./test/index.test.ts)                                           |
| **权限指令** | 细粒度操作权限控制 | `v-permission`                                  | `string \| string[]`, 修饰符 `.disabled`, `.all`                                                | 默认物理移除 DOM 并留存注释锚点，支持原位插回；支持 `.disabled` 置灰态与 `.all` 且逻辑                                                                                                                                                                          | [`v-permission.test.ts`](./test/v-permission.test.ts)<br>`/directives/permission` |
| **权限指令** | 角色细粒度控制     | `v-role`                                        | `string \| string[]`, 修饰符 `.disabled`, `.all`                                                | 基于用户角色判定；内置 admin / superadmin 超管全局豁免放行机制                                                                                                                                                                                                  | [`v-role.test.ts`](./test/v-role.test.ts)<br>`/directives/role`                   |
| **防重指令** | 提交防刷与前端幂等 | `v-idempotent`                                  | `number \| Function \| IdempotentOptions`, 参数 `:delay`, 修饰符 `.noFeedback`                  | DOM 捕获阶段拦截连击；支持时间窗口防刷与异步 Promise 互斥锁双模，自动联动按钮 loading 与禁用，超时与异常安全兜底防死锁                                                                                                                                          | [`v-idempotent.test.ts`](./test/v-idempotent.test.ts)<br>`/directives/idempotent` |
| **工具指令** | 剪贴板一键复制     | `v-copy`                                        | `string \| CopyGetter \| CopyOptions`                                                           | 优先调用 `navigator.clipboard`，自动安全降级至 `execCommand`；支持动态 Getter 与 ElMessage 反馈联动                                                                                                                                                             | [`v-copy.test.ts`](./test/v-copy.test.ts)<br>`/directives/copy`                   |
| **工具指令** | 动态防篡改水印     | `v-watermark`                                   | `string \| WatermarkOptions`, 修饰符 `.full`                                                    | Canvas 离屏高清渲染（SVG 安全降级）；MutationObserver 深度监听实现控制台删除与样式篡改微任务自愈                                                                                                                                                                | [`v-watermark.test.ts`](./test/v-watermark.test.ts)<br>`/directives/watermark`    |
| **交互容器** | 企业级弹窗容器     | `AtengDialog`                                   | `v-model`, `title`, `draggable`, `beforeConfirm`, `@confirm`, `@success`                        | 默认可拖拽；右上角全屏切换与双击 Header 全屏；el-scrollbar 限制视口高度防撑破；异步确认 Loading 锁协议                                                                                                                                                          | [`AtengDialog.test.ts`](./test/AtengDialog.test.ts)<br>`/containers/dialog`       |
| **交互容器** | 企业级抽屉容器     | `AtengDrawer`                                   | `v-model`, `title`, `size: 'small' \| 'default' \| 'large'`, `beforeConfirm`                    | 响应式语义尺寸断点；移动端视口（< 768px）自适应 100% 全宽；统一的异步确认 Loading 锁协议                                                                                                                                                                        | [`AtengDrawer.test.ts`](./test/AtengDrawer.test.ts)<br>`/containers/drawer`       |
| **交互容器** | 统一缺省态占位     | `AtengEmpty`                                    | `status: 'empty' \| 'search' \| '403' \| 'network-error' \| '500'`, `description`, `imageSize`  | 聚合 5 大语义状态；内置纯矢量 SVG 插画深度绑定 Element Plus 设计令牌，天然完美自适应暗黑模式                                                                                                                                                                    | [`AtengEmpty.test.ts`](./test/AtengEmpty.test.ts)<br>`/containers/empty`          |
| **查询套件** | 响应式搜索表单容器 | `AtengQueryForm`                                | `model`, `cols`, `collapsed`, `defaultCollapsed`, `showCollapse`, `@search`, `@reset`           | 24 栅格自适应布局（1~4 列自适应）；平滑展开/收起过渡动画；查询与重置按钮内置防抖；支持独立受控与 Table 上下文感知双模                                                                                                                                           | [`AtengQueryForm.test.ts`](./test/AtengQueryForm.test.ts)<br>`/table/query-form`  |
| **表格套件** | 企业级核心表格容器 | `AtengTable`                                    | `:pagination`, `:columns`, `rowKey`, `tools`, `storageKey`, `density`, `stripe`, `@sort-change` | 渐进混合列架构（SFC 插槽为主，兼顾属性列）；双轨深度绑定 `@atengk/vue` 的 `usePagination`；内置 5 大工具栏（刷新、密度、斑马纹、全屏、列配置 Popover 与本地持久化）；跨页多选保持机制与底部粘滞批量悬浮操作条（`#batch-actions`）；空数据与异常重试占位自动集成 | [`AtengTable.test.ts`](./test/AtengTable.test.ts)<br>`/table/crud`                |
| **协同契约** | 表格表单协同上下文 | `ATENG_TABLE_CONTEXT_KEY`                       | `InjectionKey<AtengTableContext>`                                                               | `AtengTable` 与 `AtengQueryForm` 跨组件层级的 Provide/Inject 自动化联动通道，消灭业务胶水代码                                                                                                                                                                   | [`AtengTable.test.ts`](./test/AtengTable.test.ts)<br>`/table/crud`                |
| **专属类型** | 组件 Ref 实例契约  | `AtengTableInstance` / `AtengQueryFormInstance` | `InstanceType` 约束接口                                                                         | 100% 显式收敛导出对外门面方法与状态（`tableRef`, `formRef`, `columns`, `selectedRows`, `selectedCount`, `clearSelection`, `validate` 等）                                                                                                                       | [`index.test.ts`](./test/index.test.ts)                                           |

---

## 维度一：最小起步体验 (Happy Path & Out-of-the-Box)

### 1. 安装依赖

```bash
pnpm add @atengk/core @atengk/vue @atengk/element-plus element-plus vue
```

### 2. 全量注册与样式引入

依据 [ADR-0015](../../docs/adr/0015-element-plus-vite-build-pipeline-and-single-css-strategy.md)，仅需单行引入统一打包样式文件 `@atengk/element-plus/style.css`：

```ts
import { createApp } from 'vue';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';

// 引入 @atengk/element-plus 核心套件与单一样式产物
import AtengElementPlus from '@atengk/element-plus';
import '@atengk/element-plus/style.css';

import App from './App.vue';

const app = createApp(App);
app.use(ElementPlus);
app.use(AtengElementPlus);
app.mount('#app');
```

### 3. 开箱即用体验：企业级 CRUD 查询与表格联动

无需编写复杂的翻页、Loading、排序与表单提交胶水逻辑，单行 `:pagination="pagination"` 自动完成双轨联动：

```vue
<script setup lang="ts">
import { reactive } from 'vue';
import { usePagination } from '@atengk/vue';
import { AtengTable, AtengQueryForm } from '@atengk/element-plus';

// 1. 初始化业务分页服务状态机
const pagination = usePagination(fetchUserPageList, {
  defaultPageSize: 10,
  defaultSortField: 'createTime',
  defaultSortAsc: false,
});

// 2. 搜索表单状态模型
const searchForm = reactive({
  username: '',
  role: '',
});
</script>

<template>
  <div class="user-management-page">
    <AtengTable :pagination="pagination" row-key="id" storage-key="user-table-columns" border>
      <!-- 顶部嵌入高级搜索表单：通过 Provide/Inject 自动触发 pagination.search 与 reset -->
      <template #query>
        <AtengQueryForm :model="searchForm" label-width="80px">
          <el-form-item label="用户姓名" prop="username">
            <el-input v-model="searchForm.username" placeholder="请输入姓名" clearable />
          </el-form-item>
          <el-form-item label="所属角色" prop="role">
            <el-select v-model="searchForm.role" placeholder="请选择角色" clearable>
              <el-option label="管理员" value="admin" />
              <el-option label="运营人员" value="operator" />
            </el-select>
          </el-form-item>
        </AtengQueryForm>
      </template>

      <!-- 工具栏左侧自定义业务操作 -->
      <template #toolbar-left>
        <el-button type="primary"> + 新增用户 </el-button>
        <el-button plain> 导出数据 </el-button>
      </template>

      <!-- 原生与混合列插槽：保留最熟悉的 Vue SFC 模板语法与复杂作用域插槽 -->
      <el-table-column type="selection" width="55" />
      <el-table-column prop="id" label="分布式ID" width="180" />
      <el-table-column prop="username" label="用户名" width="140" />
      <el-table-column prop="role" label="岗位角色" width="120" />
      <el-table-column prop="createTime" label="创建时间" sortable="custom" min-width="160" />

      <!-- 底部粘滞批量操作悬浮条自定义业务插槽 -->
      <template #batch-actions="{ selectedRows, clearSelection }">
        <el-button
          type="danger"
          size="small"
          @click="handleBatchDelete(selectedRows, clearSelection)"
        >
          批量删除 ({{ selectedRows.length }})
        </el-button>
      </template>
    </AtengTable>
  </div>
</template>
```

---

## 维度二：生产扩展接管 (Customization & Extensibility)

### 1. 双轨分页绑定与离散逃生门 (Dual-Track Pagination)

`AtengTable` 遵循 [ADR-0016](../../docs/adr/0016-ateng-table-hybrid-columns-and-query-synergy-architecture.md) 确立的双轨契约：

- **高阶双轨模式**：直接传入 `:pagination="paginationState"`（`UsePaginationResult` 类型），自动双向接管数据渲染、Loading 遮罩、底部分页组件调度以及服务端排序列转换（`sort-change` ➔ `changeSort`）；
- **离散原生逃生门**：当不使用 `@atengk/vue` 状态机时，向下兼容原生离散属性：
  ```vue
  <AtengTable
    :data="userList"
    :loading="tableLoading"
    :total="totalCount"
    :page-num="currentPage"
    :page-size="pageSize"
    :show-pagination="true"
    @pagination-change="({ pageNum, pageSize }) => fetchPage(pageNum, pageSize)"
    @sort-change="handleCustomSort"
  />
  ```

### 2. 企业级工具栏与本地持久化 (`storageKey`)

`AtengTable` 默认内置 5 大原子工具项：

1. **刷新 (`refresh`)**：点击自动调用 `pagination.refresh()` 并触发 `@refresh` 事件；
2. **密度切换 (`density`)**：下拉支持宽松（`large`）、默认（`default`）、紧凑（`small`）无缝切换行高并同步派发 `@update:density`；
3. **斑马线开关 (`stripe`)**：一键切换表格斑马条纹样式，图标高亮指示激活状态；
4. **全屏沉浸 (`fullscreen`)**：一键将表格容器固定全屏放大，支持 `ESC` 键盘监听退出并在组件卸载时确定性解绑；
5. **列配置浮层 (`column-setting`)**：弹出 `el-popover` 支持列显隐勾选、全选/半选指示与重置还原。

若配置了 `:storage-key="key"`，列显隐状态自动序列化写回浏览器的 `localStorage`，点击“重置”即可一键恢复出厂配置并清除本地缓存。

### 3. 跨页多选保持与底部粘滞批量悬浮条 (Sticky Batch Bar)

- 表格依赖 `:row-key="rowKey"`（默认 `id`，对 64 位雪花大数字符串 100% 友好），多选列自动赋予 `reserveSelection: true`，翻页后跨页选中数据确定性累积记忆；
- 当 `selectedCount > 0` 且 `showBatchBar !== false` 时，在表格容器内部平滑向上滑出粘滞操作条（`position: sticky; bottom: 0; z-index: 10;`）；
- 作用域插槽 `#batch-actions` 接收 `{ selectedRows, clearSelection }`，开发者可自由挂载批量业务操作按钮。

### 4. 异步确认 Loading 锁协议 (`beforeConfirm`)

`AtengDialog` 与 `AtengDrawer` 统一支持 `beforeConfirm` 异步钩子函数。当该函数返回 `Promise` 时：

1. 确定按钮自动切换为 `loading` 状态；
2. **同步禁用取消按钮、Header 关闭按钮、ESC 快捷键与遮罩点击**，杜绝并发竞态与半提交状态；
3. **成功决议**：自动关闭弹窗并触发 `@success` 事件；
4. **抛错容错**：若 Promise 发生 reject 或抛错，自动退出 loading 并**保持弹窗/抽屉开启**，严格保护用户表单输入现场。

---

## 维度三：核心生产边界与非功能语义 (Production Boundary & Failure Modes)

1. **雪花 ID 字符串主键不变量 (Snowflake String Key Invariant)**：
   - 企业级系统的全局主键均为 64 位分布式 Snowflake ID。`AtengTable` 的 `rowKey` 默认指向 `'id'`，底层多选记忆与批量操作在内存中严格以字符串（String）为基准比对，杜绝因转换为 JS Number 造成 $2^{53}-1$ 精度截断与多选错乱；
2. **渐进混合列 VNode 扁平递归解析不变量 (Hybrid Column VNode Parsing Invariant)**：
   - 原生 `<el-table-column>` 插槽列通过递归 VNode 遍历（支持 Fragment 解构与动态循环）提取列元数据；
   - 动态列显隐过滤机制通过在渲染管线中剔除隐藏列 VNode，使 Element Plus 原生插槽列无需重新声明复杂的 Schema JSON 即可实现列显隐；
3. **粘滞批量条隔离不变量 (Sticky Batch Bar Containment Invariant)**：
   - 批量悬浮操作条物理严格定位于 `.at-table__main` 容器内部（`position: sticky; bottom: 0;`），严禁超出表格容器外部，确保在多 Tab 页签卡、抽屉或复杂分栏布局下绝对不发生视口越界遮挡；
4. **注释定位锚点不变量 (Comment Anchor Invariant)**：
   - `v-permission` 与 `v-role` 在无权限时通过 `replaceChild(comment, el)` 物理剔除真实 DOM 节点；内部严格同步将 `vnode.el = comment`，当组件带有 `v-if` 或动态销毁时，确保 Vue 运行时可正确定位卸载，彻底根除 `Cannot read properties of null (reading 'insertBefore')` 空指针异常；
5. **DOM 捕获阶段防重锁 (Capture Phase Invariant)**：
   - `v-idempotent` 在 DOM 原生捕获阶段（`capture: true`）注册监听，在锁定状态下立即调用 `stopImmediatePropagation()` 与 `preventDefault()`，在浏览器事件流最前端彻底切断下游业务绑定的普通 `@click`；
6. **DevTools 恶意篡改微任务自愈防线 (MutationObserver Anti-Tamper Invariant)**：
   - `v-watermark` 配备 MutationObserver 深度监听宿主属性与子节点变动。当遭遇控制台恶意 `remove()` 节点或增加 `display: none` / `opacity: 0` 时，微任务级立即强制重建自愈；
7. **暗黑模式自适应 (Design Token Invariant)**：
   - 组件库样式 100% 绑定复用 Element Plus 原生 CSS 变量（`--el-color-*`、`--el-bg-*`、`--el-border-*`、`--el-fill-*`），支持通过 `html.dark` 实现零配置暗黑模式自适应变色。

---

## 维度四：物理排版与代码全真验证 (Evergreen & Zero-Glitch)

- 所有代码示例与 API 100% 对齐 TypeScript 强类型定义；
- 所有特性 100% 经由 `packages/element-plus/test` 离线单元测试覆盖，并在 `apps/sample-element-plus` 自验展厅中跑通真实交互。
