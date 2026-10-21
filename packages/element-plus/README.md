# @atengk/element-plus

面向现代 Web 应用与企业级系统的 Element Plus 基础设施增强组件库与指令集。坚持纯原生 TypeScript、强类型契约、零臃肿依赖与深模块解耦设计，深度打通 `@atengk/core` 与 `@atengk/vue` 基础设施能力。

---

## 维度零：特性与公共 API 全景速查矩阵

| 特性分类     | 特性名称            | 核心门面 / 组件 / 指令                                         | 关键参数 / Props / Emits                                                                       | 核心行为说明                                                                                                                                                                                                                                               | 锚定验证源头 (*Test / Sample)                                                                   |
| :----------- | :------------------ | :------------------------------------------------------------- | :--------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------- |
| **基础底座** | 插件全局安装器      | `install(app)` / `installer`                                   | `app: App`                                                                                     | 批量注册 PascalCase 原名组件与 At* 别名组件，批量注册全部操作指令，具备 Symbol 幂等保护                                                                                                                                                                    | [`install.test.ts`](./test/install.test.ts)                                                     |
| **基础底座** | 版本标识            | `VERSION`                                                      | `string`                                                                                       | 导出当前模块运行时版本号（0.1.0）                                                                                                                                                                                                                          | [`index.test.ts`](./test/index.test.ts)                                                         |
| **权限指令** | 细粒度操作权限控制  | `v-permission`                                                 | `string \| string[]`, 修饰符 `.disabled`, `.all`                                               | 默认物理移除 DOM 并留存注释锚点，支持原位插回；支持 `.disabled` 置灰态与 `.all` 且逻辑                                                                                                                                                                     | [`v-permission.test.ts`](./test/v-permission.test.ts)<br>`/directives/permission`               |
| **权限指令** | 角色细粒度控制      | `v-role`                                                       | `string \| string[]`, 修饰符 `.disabled`, `.all`                                               | 基于用户角色判定；内置 admin / superadmin 超管全局豁免放行机制                                                                                                                                                                                             | [`v-role.test.ts`](./test/v-role.test.ts)<br>`/directives/role`                                 |
| **防重指令** | 提交防刷与前端幂等  | `v-idempotent`                                                 | `number \| Function \| IdempotentOptions`, 参数 `:delay`, 修饰符 `.noFeedback`                 | DOM 捕获阶段拦截连击；支持时间窗口防刷与异步 Promise 互斥锁双模，自动联动按钮 loading 与禁用，超时与异常安全兜底防死锁                                                                                                                                     | [`v-idempotent.test.ts`](./test/v-idempotent.test.ts)<br>`/directives/idempotent`               |
| **工具指令** | 剪贴板一键复制      | `v-copy`                                                       | `string \| CopyGetter \| CopyOptions`                                                          | 优先调用 `navigator.clipboard`，自动安全降级至 `execCommand`；支持动态 Getter 与 ElMessage 反馈联动                                                                                                                                                        | [`v-copy.test.ts`](./test/v-copy.test.ts)<br>`/directives/copy`                                 |
| **工具指令** | 动态防篡改水印      | `v-watermark`                                                  | `string \| WatermarkOptions`, 修饰符 `.full`                                                   | Canvas 离屏高清渲染（SVG 安全降级）；MutationObserver 深度监听实现控制台删除与样式篡改微任务自愈                                                                                                                                                           | [`v-watermark.test.ts`](./test/v-watermark.test.ts)<br>`/directives/watermark`                  |
| **交互容器** | 企业级弹窗容器      | `AtengDialog`                                                  | `v-model`, `title`, `draggable`, `beforeConfirm`, `@confirm`, `@success`                       | 默认可拖拽；右上角全屏切换与双击 Header 全屏；el-scrollbar 限制视口高度防撑破；异步确认 Loading 锁协议                                                                                                                                                     | [`AtengDialog.test.ts`](./test/AtengDialog.test.ts)<br>`/containers/dialog`                     |
| **交互容器** | 企业级抽屉容器      | `AtengDrawer`                                                  | `v-model`, `title`, `size: 'small' \| 'default' \| 'large'`, `beforeConfirm`                   | 响应式语义尺寸断点；移动端视口（< 768px）自适应 100% 全宽；统一的异步确认 Loading 锁协议                                                                                                                                                                   | [`AtengDrawer.test.ts`](./test/AtengDrawer.test.ts)<br>`/containers/drawer`                     |
| **交互容器** | 统一缺省态占位      | `AtengEmpty`                                                   | `status: 'empty' \| 'search' \| '403' \| 'network-error' \| '500'`, `description`, `imageSize` | 聚合 5 大语义状态；内置纯矢量 SVG 插画深度绑定 Element Plus 设计令牌，天然完美自适应暗黑模式                                                                                                                                                               | [`AtengEmpty.test.ts`](./test/AtengEmpty.test.ts)<br>`/containers/empty`                        |
| **查询套件** | 响应式搜索表单容器  | `AtengQueryForm`                                               | `model`, `cols`, `collapsed`, `defaultCollapsed`, `showCollapse`, `@search`, `@reset`          | 24 栅格自适应布局（1~4 列自适应）；平滑展开/收起过渡动画；查询与重置按钮内置防抖；支持独立受控与 Table 上下文感知双模                                                                                                                                      | [`AtengQueryForm.test.ts`](./test/AtengQueryForm.test.ts)<br>`/table/query-form`                |
| **表格套件** | 企业级核心表格容器  | `AtengTable`                                                   | `:pagination`, `:columns`, `rowKey`, `tools`, `storageKey`, `density`, `stripe`, `autoHeight`  | 渐进混合列架构（SFC 插槽为主，兼顾属性列）；双轨深度绑定 `@atengk/vue` 的 `usePagination`；内置 5 大工具栏（刷新、密度、斑马纹、全屏、列配置 Popover、纯原生 HTML5 拖拽列排序与本地持久化）；`autoHeight` 视口高度自适应；跨页多选保持与底部粘滞批量操作条 | [`AtengTable.test.ts`](./test/AtengTable.test.ts)<br>`/table/crud`                              |
| **表格协同** | 表格表单协同上下文  | `ATENG_TABLE_CONTEXT_KEY`                                      | `InjectionKey<AtengTableContext>`                                                              | `AtengTable` 与 `AtengQueryForm` 跨组件层级的 Provide/Inject 自动化联动通道，消灭业务胶水代码                                                                                                                                                              | [`AtengTable.test.ts`](./test/AtengTable.test.ts)<br>`/table/crud`                              |
| **字典底座** | 字典门面管理器      | `DictManager`                                                  | `setProvider`, `loadDict`, `hasCache`, `getCache`, `clearCache`                                | 纯内存常驻映射、飞行中未决 Promise 毫秒级并发请求合并去重、三级回退加载协议与空安全保底返回 `[]`                                                                                                                                                           | [`DictManager.test.ts`](./test/dict/DictManager.test.ts)<br>`/business/dict`                    |
| **字典控件** | 字典下拉选择器      | `AtengDictSelect`                                              | `dictCode`, `loader`, `options`, `v-model`, `multiple`, `filterable`, `clearable`              | 自动联动 `DictManager` 异步加载字典；支持单选/多选/输入筛选；支持局部 Loader 或静态 options 覆盖                                                                                                                                                           | [`AtengDict.test.ts`](./test/AtengDict.test.ts)<br>`/business/dict`                             |
| **字典控件** | 字典单选框组        | `AtengDictRadio`                                               | `dictCode`, `loader`, `options`, `v-model`, `button: boolean`, `size`                          | 自动拉取字典项并渲染为单选框组；支持普通 Radio 与 Button 按钮风格单选无缝切换                                                                                                                                                                              | [`AtengDict.test.ts`](./test/AtengDict.test.ts)<br>`/business/dict`                             |
| **字典控件** | 字典多选框组        | `AtengDictCheckbox`                                            | `dictCode`, `loader`, `options`, `v-model`, `button: boolean`, `showCheckAll`, `size`          | 自动拉取字典项并渲染为多选框组；内置全选与半选 indeterminate 联动；支持普通 Checkbox 与 Button 按钮风格                                                                                                                                                    | [`AtengDictCheckbox.test.ts`](./test/AtengDictCheckbox.test.ts)<br>`/business/dict`             |
| **字典控件** | 彩色状态标签        | `AtengDictTag`                                                 | `dictCode`, `value`, `separator`, `emptyText`, `effect`, `round`                               | 自动匹配字典项并渲染为 Element Plus 彩色 Tag；支持单值、多值数组与逗号分隔字符串；未匹配时保底渲染 `'-'`                                                                                                                                                   | [`AtengDict.test.ts`](./test/AtengDict.test.ts)<br>`/business/dict`                             |
| **数据详情** | 结构化数据详情容器  | `AtengDescriptions`                                            | `data`, `items`, `border`, `column`, `direction`, `size`, `emptyText`                          | 基于 `el-descriptions` 增强封装；双模驱动（Schema 数据驱动与 SFC 声明式子组件）；空值全局保底 `'-'`                                                                                                                                                        | [`AtengDescriptions.test.ts`](./test/AtengDescriptions.test.ts)<br>`/business/descriptions`     |
| **数据详情** | 详情单项声明组件    | `AtengDescriptionsItem`                                        | `prop`, `label`, `span`, `mask`, `type`, `dictCode`, `emptyText`, `formatter`                  | 内置 5 大脱敏管道（phone/idCard/email/name/bankCard）；内置货币/日期格式化；自动联动 AtengDictTag                                                                                                                                                          | [`AtengDescriptions.test.ts`](./test/AtengDescriptions.test.ts)<br>`/business/descriptions`     |
| **时间控件** | 快捷时间范围选择器  | `AtengDateRange`                                               | `v-model`, `v-model:start`, `v-model:end`, `shortcuts`, `autoTime`, `valueFormat`              | 预置 7 大自然时间快捷跨度；双字段解构绑定协议（告别手动拆数组）；智能时刻边界对齐（00:00:00 与 23:59:59）                                                                                                                                                  | [`AtengDateRange.test.ts`](./test/AtengDateRange.test.ts)<br>`/business/date-range`             |
| **文件交互** | 导入错误反馈弹窗    | `AtengExcelFeedback`                                           | `v-model`, `errors`, `fileUrl`, `downloadAction`, `fileName`, `pageSize`, `showCopy`           | 集成 `AtengDialog`；在线表格分页展示导入错误行号、列名与失败原因；一键格式化复制剪贴板；双模批注文件下载                                                                                                                                                   | [`AtengExcelFeedback.test.ts`](./test/AtengExcelFeedback.test.ts)<br>`/business/excel-feedback` |
| **文件交互** | 流式 Excel 导出按钮 | `AtengExcelExport`                                             | `action`, `filename`, `params`, `batch`, `disabled`, `btnType`, `@before-export`, `@success`   | 整合 Fesod 流式 Excel 协议；双轨获取查询参数与选中行（自动感知 AtengTable 上下文或属性直传）；内置防重 Loading 互斥锁与 Blob 错误诊断                                                                                                                      | [`AtengExcelExport.test.ts`](./test/AtengExcelExport.test.ts)<br>`/table/crud`                  |
| **文件交互** | 多源切片上传器      | `AtengUpload`                                                  | `chunk: boolean`, `chunkSize`, `concurrency`, `customUploadChunk`, `customMerge`, `maxSize`    | 原生直传增强与大文件切片双模；前置格式与体积拦截；图片缩略图大图弹窗预览；深度绑定 useUpload 状态机                                                                                                                                                        | [`AtengUpload.test.ts`](./test/AtengUpload.test.ts)<br>`/business/upload`                       |
| **AI 交互**  | 流式打字机呈现      | `AtengStreamText`                                              | `text`, `speed`, `cursor`, `cursorChar`, `stream`, `showCopy`, `@finished`, `@copy`            | 面向 LLM 与 SSE 流式响应；纯原生逐字切片与呼吸光标自适应淡出；双轨对接 `@atengk/vue` 的 `useStream`；内置一键复制代码                                                                                                                                      | [`AtengStreamText.test.ts`](./test/AtengStreamText.test.ts)<br>`/business/stream-text`          |
| **运维监控** | 实时日志滚屏终端    | `AtengLogViewer`                                               | `logs`, `webSocket`, `maxLines`, `theme: 'dark' \| 'light'`, `autoScroll`, `height`, `title`   | 2000 行环形内存缓冲防 DOM 膨胀；原生贴底滚动与手动回滚暂停；关键字高亮检索与日志下载；双轨对接 `useWebSocket`                                                                                                                                              | [`AtengLogViewer.test.ts`](./test/AtengLogViewer.test.ts)<br>`/business/log-viewer`             |
| **统计指标** | 指标趋势与数字翻牌  | `AtengStatistic`                                               | `value`, `title`, `precision`, `separator`, `prefix`, `suffix`, `duration`, `trend`, `loading` | 原生 `requestAnimationFrame` 缓动平滑翻牌（零第三方依赖）；集成货币千分位；红绿涨跌微标与国际反转配色；内置骨架屏防抖                                                                                                                                      | [`AtengStatistic.test.ts`](./test/AtengStatistic.test.ts)<br>`/business/statistic`              |
| **代码数据** | 源码与数据高亮查看  | `AtengCodeView`                                                | `code`, `language: 'json' \| 'sql' \| 'javascript' \| ...`, `theme`, `lineNumbers`, `copyable` | 纯原生 AST 分词与严格 XSS 转义；JSON/SQL/JS/XML 语法高亮；行号侧边栏、一键复制反馈与明暗双模主题                                                                                                                                                           | [`AtengCodeView.test.ts`](./test/AtengCodeView.test.ts)<br>`/business/code-view`                |
| **通用选择** | 全量通用图标选择器  | `AtengIconSelect`                                              | `v-model`, `placeholder`, `mode: 'popover' \| 'dialog'`, `clearable`, `customIcons`, `size`    | 纯原生内建标准 SVG 图标库（零图标包强绑定）；支持拼音/中文/英文全维模糊检索；Popover 浮窗与 Dialog 弹窗双模展现                                                                                                                                            | [`AtengIconSelect.test.ts`](./test/AtengIconSelect.test.ts)<br>`/business/icon-select`          |
| **安全交互** | 验证码防刷新倒计时  | `AtengCaptcha`                                                 | `type: 'button' \| 'image'`, `seconds`, `storageKey`, `beforeSend`, `send`, `imageSrc`         | LocalStorage 物理时间戳防页面刷新清零；前置异步校验拦截钩子；异步发送 Loading 互斥防重锁；支持图形字符验证码防重刷新                                                                                                                                       | [`AtengCaptcha.test.ts`](./test/AtengCaptcha.test.ts)<br>`/business/captcha`                    |
| **文件预览** | 多格式文件在线预览  | `AtengFilePreview`                                             | `url`, `file`, `content`, `name`, `fileType`, `mode: 'inline' \| 'dialog'`, `downloadable`     | 纯原生 HTML5 高性能内嵌（零第三方重型体积）；图片灯箱、原生 PDF、音视频播放、代码文本联动（复用 AtengCodeView）与未知格式降级下载；临时 ObjectURL 确定性生命周期回收                                                                                       | [`AtengFilePreview.test.ts`](./test/AtengFilePreview.test.ts)<br>`/business/file-preview`       |
| **专属类型** | 组件 Ref 实例与契约 | `AtengTableInstance`<br>`AtengUploadInstance`<br>`DictItem` 等 | `InstanceType` 与接口定义                                                                      | 100% 显式收敛导出对外门面方法与状态，强类型安全闭环                                                                                                                                                                                                        | [`index.test.ts`](./test/index.test.ts)                                                         |

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
import AtengElementPlus, { DictManager } from '@atengk/element-plus';
import '@atengk/element-plus/style.css';

import App from './App.vue';

const app = createApp(App);
app.use(ElementPlus);
app.use(AtengElementPlus);

// 注入全局通用业务字典 Provider
DictManager.setProvider(async (code: string) => {
  const res = await fetch(`/api/system/dict/data/${code}`).then(r => r.json());
  return res.data;
});

app.mount('#app');
```

### 3. 开箱即用体验：企业级 CRUD 查询与表格联动

无需编写复杂的翻页、Loading、排序与表单提交胶水逻辑，单行 `:pagination="pagination"` 自动完成双轨联动：

```vue
<script setup lang="ts">
import { reactive } from 'vue';
import { usePagination } from '@atengk/vue';
import { AtengTable, AtengQueryForm, AtengDateRange, AtengDictSelect } from '@atengk/element-plus';

// 1. 初始化业务分页服务状态机
const pagination = usePagination(fetchUserPageList, {
  defaultPageSize: 10,
  defaultSortField: 'createTime',
  defaultSortAsc: false,
});

// 2. 搜索表单状态模型（支持双字段解构时间绑定与字典选择）
const searchForm = reactive({
  username: '',
  role: '',
  startTime: '',
  endTime: '',
});
</script>

<template>
  <div class="user-management-page">
    <AtengTable
      :pagination="pagination"
      row-key="id"
      storage-key="user-table-columns"
      auto-height
      border
    >
      <!-- 顶部嵌入高级搜索表单：通过 Provide/Inject 自动触发 pagination.search 与 reset -->
      <template #query>
        <AtengQueryForm :model="searchForm" label-width="80px">
          <el-form-item label="用户姓名" prop="username">
            <el-input v-model="searchForm.username" placeholder="请输入姓名" clearable />
          </el-form-item>
          <el-form-item label="所属角色" prop="role">
            <AtengDictSelect v-model="searchForm.role" dict-code="sys_user_role" clearable />
          </el-form-item>
          <el-form-item label="创建时间">
            <AtengDateRange v-model:start="searchForm.startTime" v-model:end="searchForm.endTime" />
          </el-form-item>
        </AtengQueryForm>
      </template>

      <!-- 原生与混合列插槽：保留最熟悉的 Vue SFC 模板语法与复杂作用域插槽 -->
      <el-table-column type="selection" width="55" />
      <el-table-column prop="id" label="分布式ID" width="180" />
      <el-table-column prop="username" label="用户名" width="140" />
      <el-table-column prop="status" label="状态" width="120">
        <template #default="{ row }">
          <AtengDictTag dict-code="sys_user_status" :value="row.status" />
        </template>
      </el-table-column>
      <el-table-column prop="createTime" label="创建时间" sortable="custom" min-width="160" />
    </AtengTable>
  </div>
</template>
```

---

## 维度二：生产扩展接管 (Customization & Extensibility)

### 1. 字典套件数据源接管与并发去重 (`DictManager`)

`DictManager` 采用单例无状态与纯内存缓存架构：

```ts
import { DictManager, type DictItem } from '@atengk/element-plus';

// 1. 注册全局字典数据源 Provider
DictManager.setProvider(async (dictCode: string): Promise<DictItem[]> => {
  const result = await http.get(`/system/dict/data/type/${dictCode}`);
  return result.data.map(item => ({
    label: item.dictLabel,
    value: item.dictValue,
    tagType: item.listClass,
  }));
});

// 2. 局部组件覆盖数据源（优先级高于全局 Provider）
<AtengDictSelect v-model="role" :loader="fetchCustomRoleList" />

// 3. 字典多选框组（支持全选快捷复选框与逗号分隔字符串双向解构绑定）
<AtengDictCheckbox
  v-model="selectedTags"
  dict-code="sys_notice_level"
  separator=","
  show-check-all
  button
/>

// 4. 内存缓存穿透刷新
await DictManager.loadDict('sys_user_status', undefined, true);
```

### 2. 双字段解构绑定与时刻智能对齐 (`AtengDateRange`)

针对后端接口通常拆分为 `beginTime` 与 `endTime` 两个离散入参的常见痛点，`AtengDateRange` 深度内置双字段解构绑定协议：

```vue
<!-- 双向双字段解构绑定，并在选择单日时自动补全为 00:00:00 与 23:59:59 -->
<AtengDateRange
  v-model:start="query.beginTime"
  v-model:end="query.endTime"
  :auto-time="true"
  value-format="YYYY-MM-DD HH:mm:ss"
/>
```

### 3. Fesod 批注错误回写与下载集成 (`AtengExcelFeedback`)

当用户上传导入 Excel 失败时，后端通常返回结构化错误明细或带有错误批注的 Excel 文件。通过 `AtengExcelFeedback` 可无缝接入：

```vue
<AtengExcelFeedback
  v-model="feedbackVisible"
  title="用户数据导入校验失败"
  :errors="errorList"
  :download-action="handleDownloadAnnotatedExcel"
  file-name="用户导入校验失败批注清单.xlsx"
  @copy="onCopySuccess"
/>
```

### 4. 大文件切片并发上传状态机 (`AtengUpload`)

开启 `:chunk="true"` 模式后，`AtengUpload` 自动组装 `@atengk/vue` 的 `useUpload` 状态机，无需编写复杂的切片切片循环与并发限制：

```vue
<AtengUpload
  ref="uploadRef"
  :chunk="true"
  :chunk-size="5 * 1024 * 1024"
  :concurrency="3"
  :custom-upload-chunk="uploadChunkApi"
  :custom-merge="mergeChunksApi"
  @chunk-progress="progress => console.log('总进度:', progress)"
  @chunk-success="onAllChunksSuccess"
/>
```

通过对外暴露的 `uploadRef.value.pause()`、`resume()`、`cancel()` 可实现毫秒级暂停、恢复与网络中断。

### 5. 流式 Excel 声明式导出与 ADR-0004 双态异常防御 (`AtengExcelExport`)

`AtengExcelExport` 深度契合 ADR-0004 协议，可嵌套于 `AtengTable` 自动感知当前查询条件与跨页勾选行，或独立传参使用：

```vue
<!-- 表格上下文感知：勾选时优先导出选中项，无勾选时全量导出；内置 Blob-JSON 双态拦截与 Loading 互斥锁 -->
<AtengExcelExport :action="exportApi" filename="用户清单.xlsx" />

<!-- 独立传参与多模下拉菜单 -->
<AtengExcelExport
  :action="exportApi"
  :params="{ role: 'admin' }"
  mode="dropdown"
  type="success"
  text="多模导出"
/>
```

### 6. 高性能运维日志终端与防内存泄漏缓冲 (`AtengLogViewer`)

`AtengLogViewer` 面向 CI/CD 容器构建、服务端日志追踪与设备监控，深度对接 `@atengk/vue` 的 `useWebSocket` 或静态日志列表：

```vue
<!-- 绑定 WebSocket 实时流，限制最大 2000 行环形缓冲，内置关键词检索过滤与 XSS 安全防御 -->
<AtengLogViewer
  :web-socket="wsResult"
  :max-lines="2000"
  height="480px"
  theme="dark"
  title="生产构建监控终端"
/>
```

### 7. 金融级动效统计指标卡片 (`AtengStatistic`)

`AtengStatistic` 基于原生 `requestAnimationFrame` 指数衰减缓动算法实现平滑翻牌过渡动画（零第三方依赖），支持金融级千分位与涨跌微标：

```vue
<!-- 金融级平滑数字滚动卡片，支持千分位格式化、红涨绿跌微标与骨架屏 Loading -->
<AtengStatistic
  title="年度总成交额 (GMV)"
  :value="8923450.68"
  prefix="¥"
  suffix="元"
  :thousands="true"
  trend="up"
  trend-value="+18.5%"
  :duration="1200"
/>
```

---

## 维度三：核心生产边界与非功能语义 (Production Boundary & Failure Modes)

1. **字典高并发请求合并去重不变量 (In-Flight Request Coalescing Invariant)**：
   - 界面上无论同时渲染多少个同类型字典组件（例如表格一屏 50 行同时使用 `AtengDictTag dict-code="sys_user_status"`），`DictManager` 在飞行中（In-Flight）自动合并同 code 的并发 Promise。真实物理网络只发送 1 次 HTTP 请求，结果解析后全量常驻内存，彻底杜绝字典并发风暴；
2. **数据脱敏与“内存真明文”防线 (In-Memory Plaintext Invariant)**：
   - `AtengDescriptions` 内置的手机（`mask="phone"`）、身份证（`mask="idCard"`）、银行卡（`mask="bankCard"`）等脱敏管道仅在虚拟 DOM 渲染视图层动态格式化，底层绑定的响应式对象始终保持原始真实明文，防止数据回传时将星号脏数据写回数据库；
3. **时刻对齐防边界遗漏不变量 (Date Boundary Alignment Invariant)**：
   - `AtengDateRange` 默认开启 `autoTime: true`。当选择时间区间时，起始时间无论原始毫秒如何，自动规范化为当天 `00:00:00`，截止时间自动规范化为当天 `23:59:59`，彻底根除因缺少截止当天最后一秒导致查询漏数据的经典边界缺陷；
4. **大文件切片生命周期与 AbortSignal 秒级中断 (Deterministic Cleanup Invariant)**：
   - `AtengUpload` 分片上传在调用 `cancel()` 或组件销毁（`onUnmounted`）时，通过内部 `AbortController` 立即中断底层 Axios HTTP 连接，且确定性回收大文件切片的内存引用，坚决杜绝内存泄漏；
5. **雪花 ID 字符串主键不变量 (Snowflake String Key Invariant)**：
   - `AtengTable` 的 `rowKey` 默认指向 `'id'`，底层多选记忆与批量操作在内存中严格以字符串（String）为基准比对，杜绝因转换为 JS Number 造成 $2^{53}-1$ 精度截断与多选错乱；
6. **异步确认 Loading 锁协议 (Async Confirm Lock Invariant)**：
   - `AtengDialog` 与 `AtengDrawer` 统一支持 `beforeConfirm` 异步钩子。在确认提交过程中自动开启 loading 并禁用取消按钮、ESC 键与遮罩关闭；若异步提交失败保持弹窗开启，保护用户输入现场；
7. **暗黑模式与设计令牌 100% 绑定 (Design Token Invariant)**：
   - 组件库样式 100% 复用 Element Plus 原生 CSS 变量（`--el-color-*`、`--el-bg-*`、`--el-border-*`、`--el-fill-*`），支持通过 `html.dark` 实现零配置暗黑模式自适应变色。

---

## 维度四：物理排版与代码全真验证 (Evergreen & Zero-Glitch)

- 所有代码示例与 API 100% 对齐 TypeScript 强类型定义；
- 所有特性 100% 经由 `packages/element-plus/test` 离线单元测试覆盖，并在 `apps/sample-element-plus` 自验展厅中跑通真实交互。
