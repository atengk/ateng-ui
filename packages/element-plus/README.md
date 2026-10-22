# @atengk/element-plus

面向现代 Web 应用与企业级系统的 Element Plus 基础设施增强组件库与指令集。坚持纯原生 TypeScript、强类型契约、零臃肿依赖与深模块解耦设计，深度打通 `@atengk/core` 与 `@atengk/vue` 基础设施能力。

---

## 维度零：特性与公共 API 全景速查矩阵

| 特性分类     | 特性名称            | 核心门面 / 组件 / 指令                                         | 关键参数 / Props / Emits                                                                                                                                                                                           | 核心行为说明                                                                                                                                                                                                                                                                                                           | 锚定验证源头 (*Test / Sample)                                                                   |
| :----------- | :------------------ | :------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------- |
| **基础底座** | 插件全局安装器      | `install(app)` / `installer`                                   | `app: App`                                                                                                                                                                                                         | 批量注册 PascalCase 原名组件与 At* 别名组件，批量注册全部操作指令，具备 Symbol 幂等保护                                                                                                                                                                                                                                | [`install.test.ts`](./test/install.test.ts)                                                     |
| **基础底座** | 版本标识            | `VERSION`                                                      | `string`                                                                                                                                                                                                           | 导出当前模块运行时版本号（0.1.0）                                                                                                                                                                                                                                                                                      | [`index.test.ts`](./test/index.test.ts)                                                         |
| **权限指令** | 细粒度操作权限控制  | `v-permission`                                                 | `string \| string[]`, 修饰符 `.disabled`, `.all`                                                                                                                                                                   | 默认物理移除 DOM 并留存注释锚点，支持原位插回；支持 `.disabled` 置灰态与 `.all` 且逻辑                                                                                                                                                                                                                                 | [`v-permission.test.ts`](./test/v-permission.test.ts)<br>`/directives/permission`               |
| **权限指令** | 角色细粒度控制      | `v-role`                                                       | `string \| string[]`, 修饰符 `.disabled`, `.all`                                                                                                                                                                   | 基于用户角色判定；内置 admin / superadmin 超管全局豁免放行机制                                                                                                                                                                                                                                                         | [`v-role.test.ts`](./test/v-role.test.ts)<br>`/directives/role`                                 |
| **防重指令** | 提交防刷与前端幂等  | `v-idempotent`                                                 | `number \| Function \| IdempotentOptions`, 参数 `:delay`, 修饰符 `.noFeedback`                                                                                                                                     | DOM 捕获阶段拦截连击；支持时间窗口防刷与异步 Promise 互斥锁双模，自动联动按钮 loading 与禁用，超时与异常安全兜底防死锁                                                                                                                                                                                                 | [`v-idempotent.test.ts`](./test/v-idempotent.test.ts)<br>`/directives/idempotent`               |
| **工具指令** | 剪贴板一键复制      | `v-copy`                                                       | `string \| CopyGetter \| CopyOptions`                                                                                                                                                                              | 优先调用 `navigator.clipboard`，自动安全降级至 `execCommand`；支持动态 Getter 与 ElMessage 反馈联动                                                                                                                                                                                                                    | [`v-copy.test.ts`](./test/v-copy.test.ts)<br>`/directives/copy`                                 |
| **工具指令** | 动态防篡改水印      | `v-watermark`                                                  | `string \| WatermarkOptions`, 修饰符 `.full`                                                                                                                                                                       | Canvas 离屏高清渲染（SVG 安全降级）；MutationObserver 深度监听实现控制台删除与样式篡改微任务自愈                                                                                                                                                                                                                       | [`v-watermark.test.ts`](./test/v-watermark.test.ts)<br>`/directives/watermark`                  |
| **交互容器** | 企业级弹窗容器      | `AtengDialog`                                                  | `v-model`, `title`, `draggable`, `beforeConfirm`, `@confirm`, `@success`                                                                                                                                           | 默认可拖拽；右上角全屏切换与双击 Header 全屏；el-scrollbar 限制视口高度防撑破；异步确认 Loading 锁协议                                                                                                                                                                                                                 | [`AtengDialog.test.ts`](./test/AtengDialog.test.ts)<br>`/containers/dialog`                     |
| **交互容器** | 企业级抽屉容器      | `AtengDrawer`                                                  | `v-model`, `title`, `size: 'small' \| 'default' \| 'large'`, `beforeConfirm`                                                                                                                                       | 响应式语义尺寸断点；移动端视口（< 768px）自适应 100% 全宽；统一的异步确认 Loading 锁协议                                                                                                                                                                                                                               | [`AtengDrawer.test.ts`](./test/AtengDrawer.test.ts)<br>`/containers/drawer`                     |
| **交互容器** | 统一缺省态占位      | `AtengEmpty`                                                   | `status: 'empty' \| 'search' \| '403' \| 'network-error' \| '500'`, `description`, `imageSize`                                                                                                                     | 聚合 5 大语义状态；内置纯矢量 SVG 插画深度绑定 Element Plus 设计令牌，天然完美自适应暗黑模式                                                                                                                                                                                                                           | [`AtengEmpty.test.ts`](./test/AtengEmpty.test.ts)<br>`/containers/empty`                        |
| **页面骨架** | 标准页面承载容器    | `AtengPageContainer`                                           | `title`, `subTitle`, `breadcrumb`, `autoBreadcrumb`, `breadcrumbTitleKey`, `breadcrumbResolver`, `showBack`, `ghost`, `fitViewport`, `fixedHeader`, `headerBlur`, `tabs`                                           | 标准化页头；流动与 fitViewport 视口 100% 撑满双模滚动切换；ghost 沉浸式透明模式；弱感应路由推导自动面包屑；headerBlur 吸顶毛玻璃质感与滚动动态 .is-elevated 渐变悬浮投影                                                                                                                                               | [`AtengPageContainer.test.ts`](./test/AtengPageContainer.test.ts)<br>`/layout/page-container`   |
| **页面骨架** | 弹性拖拽分栏布局    | `AtengSplitLayout`                                             | `direction`, `v-model`, `v-model:secondCollapsed`, `collapseTarget: 'first' \| 'second' \| 'both'`, `secondCollapseSize`, `defaultSize`, `min`, `max`, `collapsible`, `storageKey`, `@collapse`, `@secondCollapse` | W3C PointerEvent 统一与 setPointerCapture 平板触控驱动防越界丢帧；min/max 弹性防越界；双向独立对折把手与折叠互斥安全；storageKey 本地持久化双向折叠状态与尺寸偏好                                                                                                                                                      | [`AtengSplitLayout.test.ts`](./test/AtengSplitLayout.test.ts)<br>`/layout/split-layout`         |
| **页面骨架** | 悬浮吸底操作栏      | `AtengFooterBar`                                               | `position: 'sticky' \| 'fixed'`, `placeholder`, `height`, `zIndex`, `leftOffset`, `autoOffset`, `target`, `bordered`, `updateOffset()`                                                                             | sticky 局部粘滞与 fixed 全局悬浮双模；fixed 模式标配自动等高占位垫块防遮挡；autoOffset 结合 ResizeObserver + rAF 动态平滑避让侧边栏展开折叠过渡动画                                                                                                                                                                    | [`AtengFooterBar.test.ts`](./test/AtengFooterBar.test.ts)<br>`/layout/footer-bar`               |
| **页面骨架** | 结构化卡片面板      | `AtengCard`                                                    | `title`, `subTitle`, `icon`, `tooltip`, `collapsible`, `fullscreenable`, `lockScroll`, `escExit`, `loading`, `shadow`, `bordered`                                                                                  | 结构化标题/副标题/图标/Tooltip；一键平滑折叠；视口全屏最大化；模块级引用计数管理 lockScroll 全屏防穿透滚动锁，多卡片并发安全还原；ESC 防冲突与受控开关                                                                                                                                                                 | [`AtengCard.test.ts`](./test/AtengCard.test.ts)<br>`/layout/card`                               |
| **页面骨架** | 页面骨架屏占位容器  | `AtengPageSkeleton`                                            | `loading`, `type: 'table' \| 'form' \| 'detail' \| 'card' \| 'dashboard' \| 'custom'`, `rows`, `columns`, `animated`                                                                                               | 内置 table/form/detail/card/dashboard 5 大后台模态预设（dashboard 包含 4 张指标卡与双图表区块）；现代 CSS Grid auto-fit + minmax 流式自适应布局；平滑淡入淡出过渡消除突变                                                                                                                                              | [`AtengPageSkeleton.test.ts`](./test/AtengPageSkeleton.test.ts)<br>`/layout/skeleton`           |
| **查询套件** | 响应式搜索表单容器  | `AtengQueryForm`                                               | `model`, `cols`, `collapsedRows`, `collapsed`, `defaultCollapsed`, `showCollapse`, `autoSearchOnReset`, `@search`, `@reset`                                                                                        | 24 栅格自适应布局与基于容器 `ResizeObserver` 的 1~4 列自适应断点（<768px 单列 / <1200px 双列 / <1920px 三列 / ≥1920px 四列）；支持 `collapsedRows` 自定义折叠常驻行数；`autoSearchOnReset` 控制重置时是否自动触发查询；展开/收起平滑过渡与查询/重置防抖；支持独立受控与 Table 上下文感知双模                           | [`AtengQueryForm.test.ts`](./test/AtengQueryForm.test.ts)<br>`/table/query-form`                |
| **表格套件** | 企业级核心表格容器  | `<AtengTable<T>>`                                              | `:pagination`, `:data`, `:columns`, `rowKey`, `tools`, `storageKey`, `density`, `stripe`, `autoHeight`, `enableColumnResize`, `minResizeWidth`, `searchEmptyDescription`                                           | Vue 3.5 SFC 原生泛型组件；渐进混合列架构；深度绑定 `@atengk/vue` 的 `usePagination`；内置 5 大工具栏；原生表头列宽拖拽调整、40px 最小防塌陷与 storageKey 本地持久化记忆还原/Popover 重置；搜索感知多态缺省态与一键清空自愈联动；纯原生 HTML5 拖拽列排序；`autoHeight` 视口高度自适应；跨页多选保持与底部粘滞批量操作条 | [`AtengTable.test.ts`](./test/AtengTable.test.ts)<br>`/table/crud`                              |
| **表格协同** | 表格表单协同上下文  | `ATENG_TABLE_CONTEXT_KEY`                                      | `InjectionKey<AtengTableContext>`                                                                                                                                                                                  | `AtengTable` 与 `AtengQueryForm` 跨组件层级的 Provide/Inject 自动化双向联动通道（查询传递、重置联动与多态缺省态清空自愈），消灭业务胶水代码                                                                                                                                                                            | [`AtengTable.test.ts`](./test/AtengTable.test.ts)<br>`/table/crud`                              |
| **字典底座** | 字典门面管理器      | `DictManager`                                                  | `setProvider`, `loadDict`, `hasCache`, `getCache`, `clearCache`                                                                                                                                                    | 纯内存常驻映射、飞行中未决 Promise 毫秒级并发请求合并去重、三级回退加载协议与空安全保底返回 `[]`                                                                                                                                                                                                                       | [`DictManager.test.ts`](./test/dict/DictManager.test.ts)<br>`/business/dict`                    |
| **字典控件** | 字典下拉选择器      | `AtengDictSelect`                                              | `dictCode`, `loader`, `options`, `v-model`, `multiple`, `filterable`, `clearable`                                                                                                                                  | 自动联动 `DictManager` 异步加载字典；支持单选/多选/输入筛选；支持局部 Loader 或静态 options 覆盖                                                                                                                                                                                                                       | [`AtengDict.test.ts`](./test/AtengDict.test.ts)<br>`/business/dict`                             |
| **字典控件** | 字典单选框组        | `AtengDictRadio`                                               | `dictCode`, `loader`, `options`, `v-model`, `button: boolean`, `size`                                                                                                                                              | 自动拉取字典项并渲染为单选框组；支持普通 Radio 与 Button 按钮风格单选无缝切换                                                                                                                                                                                                                                          | [`AtengDict.test.ts`](./test/AtengDict.test.ts)<br>`/business/dict`                             |
| **字典控件** | 字典多选框组        | `AtengDictCheckbox`                                            | `dictCode`, `loader`, `options`, `v-model`, `button: boolean`, `showCheckAll`, `size`                                                                                                                              | 自动拉取字典项并渲染为多选框组；内置全选与半选 indeterminate 联动；支持普通 Checkbox 与 Button 按钮风格                                                                                                                                                                                                                | [`AtengDictCheckbox.test.ts`](./test/AtengDictCheckbox.test.ts)<br>`/business/dict`             |
| **字典控件** | 彩色状态标签        | `AtengDictTag`                                                 | `dictCode`, `value`, `separator`, `emptyText`, `effect`, `round`                                                                                                                                                   | 自动匹配字典项并渲染为 Element Plus 彩色 Tag；支持单值、多值数组与逗号分隔字符串；未匹配时保底渲染 `'-'`                                                                                                                                                                                                               | [`AtengDict.test.ts`](./test/AtengDict.test.ts)<br>`/business/dict`                             |
| **数据详情** | 结构化数据详情容器  | `<AtengDescriptions<T>>`                                       | `data: T`, `items: DescriptionsItemConfig<T>[]`, `border`, `column`, `direction`, `size`, `emptyText`                                                                                                              | Vue 3.5 SFC 原生泛型组件；基于 `el-descriptions` 增强封装；双模驱动（Schema 数据驱动与 SFC 声明式子组件）；空值全局保底 `'-'`                                                                                                                                                                                          | [`AtengDescriptions.test.ts`](./test/AtengDescriptions.test.ts)<br>`/business/descriptions`     |
| **数据详情** | 详情单项声明组件    | `AtengDescriptionsItem`                                        | `prop`, `label`, `span`, `mask`, `type`, `dictCode`, `emptyText`, `formatter`                                                                                                                                      | 内置 5 大脱敏管道（phone/idCard/email/name/bankCard）；内置货币/日期格式化；自动联动 AtengDictTag                                                                                                                                                                                                                      | [`AtengDescriptions.test.ts`](./test/AtengDescriptions.test.ts)<br>`/business/descriptions`     |
| **时间控件** | 快捷时间范围选择器  | `AtengDateRange`                                               | `v-model`, `v-model:start`, `v-model:end`, `shortcuts`, `autoTime`, `valueFormat`                                                                                                                                  | 预置 7 大自然时间快捷跨度；双字段解构绑定协议（告别手动拆数组）；智能时刻边界对齐（00:00:00 与 23:59:59）                                                                                                                                                                                                              | [`AtengDateRange.test.ts`](./test/AtengDateRange.test.ts)<br>`/business/date-range`             |
| **文件交互** | 导入错误反馈弹窗    | `AtengExcelFeedback`                                           | `v-model`, `errors`, `fileUrl`, `downloadAction`, `fileName`, `pageSize`, `showCopy`                                                                                                                               | 集成 `AtengDialog`；在线表格分页展示导入错误行号、列名与失败原因；一键格式化复制剪贴板；双模批注文件下载                                                                                                                                                                                                               | [`AtengExcelFeedback.test.ts`](./test/AtengExcelFeedback.test.ts)<br>`/business/excel-feedback` |
| **文件交互** | 流式 Excel 导出按钮 | `AtengExcelExport`                                             | `action`, `filename`, `params`, `batch`, `disabled`, `btnType`, `@before-export`, `@success`                                                                                                                       | 整合 Fesod 流式 Excel 协议；双轨获取查询参数与选中行（自动感知 AtengTable 上下文或属性直传）；内置防重 Loading 互斥锁与 Blob 错误诊断                                                                                                                                                                                  | [`AtengExcelExport.test.ts`](./test/AtengExcelExport.test.ts)<br>`/table/crud`                  |
| **文件交互** | 多源切片上传器      | `AtengUpload`                                                  | `chunk: boolean`, `chunkSize`, `concurrency`, `customUploadChunk`, `customMerge`, `maxSize`                                                                                                                        | 原生直传增强与大文件切片双模；前置格式与体积拦截；图片缩略图大图弹窗预览；深度绑定 useUpload 状态机                                                                                                                                                                                                                    | [`AtengUpload.test.ts`](./test/AtengUpload.test.ts)<br>`/business/upload`                       |
| **AI 交互**  | 流式打字机呈现      | `AtengStreamText`                                              | `text`, `speed`, `cursor`, `cursorChar`, `stream`, `showCopy`, `@finished`, `@copy`                                                                                                                                | 面向 LLM 与 SSE 流式响应；纯原生逐字切片与呼吸光标自适应淡出；双轨对接 `@atengk/vue` 的 `useStream`；内置一键复制代码                                                                                                                                                                                                  | [`AtengStreamText.test.ts`](./test/AtengStreamText.test.ts)<br>`/business/stream-text`          |
| **运维监控** | 实时日志滚屏终端    | `AtengLogViewer`                                               | `logs`, `webSocket`, `maxLines`, `theme: 'dark' \| 'light'`, `autoScroll`, `height`, `title`                                                                                                                       | 2000 行环形内存缓冲防 DOM 膨胀；原生贴底滚动与手动回滚暂停；关键字高亮检索与日志下载；双轨对接 `useWebSocket`                                                                                                                                                                                                          | [`AtengLogViewer.test.ts`](./test/AtengLogViewer.test.ts)<br>`/business/log-viewer`             |
| **统计指标** | 指标趋势与数字翻牌  | `AtengStatistic`                                               | `value`, `title`, `precision`, `separator`, `prefix`, `suffix`, `duration`, `trend`, `loading`                                                                                                                     | 原生 `requestAnimationFrame` 缓动平滑翻牌（零第三方依赖）；集成货币千分位；红绿涨跌微标与国际反转配色；内置骨架屏防抖                                                                                                                                                                                                  | [`AtengStatistic.test.ts`](./test/AtengStatistic.test.ts)<br>`/business/statistic`              |
| **代码数据** | 零依赖代码高亮查看  | `AtengCodeView`                                                | `code`, `language: 'json' \| 'sql' \| 'javascript' \| ...`, `collapsible`, `theme`, `lineNumbers`, `copyable`                                                                                                      | 纯原生 AST 分词与严格 XSS 转义；JSON 树形代码块折叠展开；JSON/SQL/JS/XML 语法高亮；自适应行号侧边栏、一键复制反馈与明暗主题双模                                                                                                                                                                                        | [`AtengCodeView.test.ts`](./test/AtengCodeView.test.ts)<br>`/business/code-view`                |
| **通用选择** | 原生图标选择器      | `AtengIconSelect`                                              | `v-model`, `mode: 'popover' \| 'dialog'`, `clearable`, `showCopy`, `pageSize`, `customIcons`                                                                                                                       | 原生收敛 Element Plus 标准图标库（0 外部图标包强绑定）；支持拼音缩写/全拼/中英文毫秒级模糊检索；网格分页与一键复制 `<el-icon>` 代码组件                                                                                                                                                                                | [`AtengIconSelect.test.ts`](./test/AtengIconSelect.test.ts)<br>`/business/icon-select`          |
| **安全交互** | 验证码防刷新倒计时  | `AtengCaptcha`                                                 | `type: 'button' \| 'image'`, `seconds`, `storageKey`, `beforeSend`, `send`, `imageSrc`                                                                                                                             | LocalStorage 物理时间戳防页面刷新清零；前置异步校验拦截钩子；异步发送 Loading 互斥防重锁；支持图形字符验证码防重刷新                                                                                                                                                                                                   | [`AtengCaptcha.test.ts`](./test/AtengCaptcha.test.ts)<br>`/business/captcha`                    |
| **文件预览** | 多格式文件在线预览  | `AtengFilePreview`                                             | `url`, `file`, `content`, `name`, `fileType`, `mode: 'inline' \| 'dialog'`, `downloadable`                                                                                                                         | 纯原生 HTML5 高性能内嵌（零第三方重型体积）；图片灯箱、原生 PDF、音视频播放、代码文本联动（复用 AtengCodeView）与未知格式降级下载；临时 ObjectURL 确定性生命周期回收                                                                                                                                                   | [`AtengFilePreview.test.ts`](./test/AtengFilePreview.test.ts)<br>`/business/file-preview`       |
| **主题引擎** | 现代极客多主题引擎  | `@atengk/element-plus/theme-pro.css`                           | `data-theme="indigo \| emerald \| violet \| ocean \| rose"`, `html.dark`                                                                                                                                           | 纯 CSS 变量驱动现代极客主题引擎（零 `!important`）；预设 5 套科技风主题（极客靛蓝/极客翠绿/赛博幻紫/商务深海/极光绯红）；Slate 暗黑冷感基底；三轨主按钮、激光 Focus-Ring 表单、黑曜石 LED 状态标签、数控轻拟物开关、流体无框表格、毛玻璃浮层与结构化微光卡片                                                           | `dist/theme-pro.css`<br>`/theme-pro`<br>`/theme/*`                                              |
| **主题引擎** | 租户品牌色动态换肤  | `setThemeColor`                                                | `color: string`, `options?: SetThemeColorOptions`                                                                                                                                                                  | 纯原生高精度色阶演算（对齐 Element Plus 官方 Sass 混合算法）；100% 运行时动态生成 9 阶 light 与 2 阶 dark 色阶；支持 LocalStorage 持久化存储记忆、自定义 DOM 挂载目标与即时无刷换肤                                                                                                                                    | [`setThemeColor.test.ts`](./test/theme/setThemeColor.test.ts)<br>`/theme/tenant`                |
| **主题引擎** | 品牌色阶纯函数算法  | `generateThemePalette`                                         | `color: string`                                                                                                                                                                                                    | 纯函数调色算法，输入 16 进制颜色（如 `#409eff`），高精度输出主色及全套 9 阶浅色与 2 阶深色配色字典；零外部调色库依赖                                                                                                                                                                                                   | [`setThemeColor.test.ts`](./test/theme/setThemeColor.test.ts)                                   |
| **专属类型** | 组件 Ref 实例与契约 | `AtengTableInstance`<br>`AtengUploadInstance`<br>`DictItem` 等 | `InstanceType` 与接口定义                                                                                                                                                                                          | 100% 显式收敛导出对外门面方法与状态，强类型安全闭环                                                                                                                                                                                                                                                                    | [`index.test.ts`](./test/index.test.ts)                                                         |

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

// 可选：单行引入现代极客多主题引擎样式包 (Pro Theme)
import '@atengk/element-plus/theme-pro.css';

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

> [!TIP]
> **多主题启用**：引入 `theme-pro.css` 后，仅需在根节点 `<html data-theme="indigo">` 设置属性即可秒级开启预置科技风主题（支持 `indigo` 极客靛蓝、`emerald` 极客翠绿、`violet` 赛博幻紫、`ocean` 商务深海、`rose` 极光绯红），搭配 `class="dark"` 即可激活工业级 Slate 深空暗黑基底。全量样式纯 CSS 变量驱动，运行时零损耗。

### 3. 开箱即用体验：企业级 CRUD 查询与表格联动

无需编写复杂的翻页、Loading、排序与表单提交胶水逻辑，单行 `:pagination="pagination"` 自动完成双轨联动：

```vue
<script setup lang="ts">
import { reactive } from 'vue';
import { usePagination } from '@atengk/vue';
import { AtengTable, AtengQueryForm, AtengDateRange, AtengDictSelect } from '@atengk/element-plus';

interface UserItem {
  id: string;
  username: string;
  role: string;
  status: string;
  createTime: string;
}

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

const handleBatchDelete = (users: UserItem[], clear: () => void) => {
  console.log(
    '批量删除:',
    users.map(u => u.id),
  );
  clear();
};
</script>

<template>
  <div class="user-management-page">
    <!-- 绑定 pagination 自动推导泛型 T 为 UserItem，全链路强类型闭环 -->
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

      <!-- 底部粘滞批量操作悬浮条：selectedRows 自动推导为 UserItem[] 强类型零强转 -->
      <template #batch-actions="{ selectedRows, clearSelection }">
        <el-button
          type="danger"
          size="small"
          @click="handleBatchDelete(selectedRows, clearSelection)"
        >
          批量删除 ({{ selectedRows.length }})
        </el-button>
        <el-button size="small" @click="clearSelection">取消选择</el-button>
      </template>
    </AtengTable>
  </div>
</template>
```

### 4. 开箱即用体验：页面骨架容器、弹性拖拽分栏与吸底操作栏

在中后台典型页面中，组装 `AtengPageContainer`、`AtengSplitLayout` 与 `AtengFooterBar` 构建标准化架构：

```vue
<template>
  <AtengPageContainer
    title="部门与员工协同中枢"
    sub-title="支持左树右表拖拽调宽与偏好记忆"
    :breadcrumb="[{ label: '首页', path: '/' }, { label: '组织架构' }]"
    fit-viewport
    show-back
  >
    <AtengSplitLayout
      v-model="splitWidth"
      storage-key="org_user_split"
      default-size="280px"
      min="180px"
      max="480px"
    >
      <!-- 左栏：组织架构树 -->
      <template #first>
        <el-tree :data="deptTree" default-expand-all />
      </template>

      <!-- 右栏：业务表格与吸底提交栏 -->
      <template #second>
        <AtengTable :data="userList" border>
          <el-table-column prop="name" label="姓名" />
          <el-table-column prop="role" label="岗位" />
        </AtengTable>

        <AtengFooterBar position="sticky">
          <template #extra>已选择 12 位员工</template>
          <el-button>重置</el-button>
          <el-button type="primary">确认分配</el-button>
        </AtengFooterBar>
      </template>
    </AtengSplitLayout>
  </AtengPageContainer>
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

### 6. 纯原生表头列宽拖拽调整、列配置拖拽排序与 `autoHeight` 视口自适应 (`AtengTable`)

`AtengTable` 针对现代企业级中后台表格交互，坚决摒弃引入 `SortableJS` 等重型第三方库：

- **原生表头列宽拖拽调整**：原生支持在表头列右边缘按住鼠标拖拽调整列宽，内置 `Math.max(40, newWidth)` 最小 40px 防塌陷保底；当配置 `storageKey` 时，拖拽结果自动持久化至 LocalStorage，页面刷新后列宽精确恢复记忆；并在右上角「列设置」Popover 中提供「重置列宽」按钮一键还原。
- **纯原生 HTML5 列配置拖拽排序**：基于纯原生 HTML5 Drag & Drop API 实现列配置弹窗内的拖拽排序，顺序刷新后持久化记忆。
- **视口高度自适应**：集成 `autoHeight` 基于 `ResizeObserver` 动态计算视口剩余空间，彻底消除双滚动条与视口撑破。

```vue
<!-- 表格列宽调整记忆、视口高度自适应与原生列拖拽排序持久化 -->
<AtengTable
  :pagination="pagination"
  :auto-height="32"
  :enable-column-resize="true"
  :min-resize-width="40"
  storage-key="admin-user-table-columns"
  row-key="id"
  border
>
  <el-table-column type="selection" width="55" fixed="left" />
  <el-table-column prop="id" label="分布式ID" width="180" />
  <el-table-column prop="username" label="用户名" width="140" />
  <el-table-column prop="role" label="岗位角色" width="120" />
  <el-table-column prop="createTime" label="创建时间" min-width="160" />
</AtengTable>
```

### 7. 搜索感知多态缺省态与一键清空自愈联动 (`AtengTable` & `AtengQueryForm`)

企业级中后台中，当用户输入特定筛选条件导致数据为空时，若仅展示“暂无数据”易引发“系统没数据”的误解。`AtengTable` 内置多态缺省态计算引擎，并与 `AtengQueryForm` 深度联动自愈：

- **多态缺省态引擎**：用户自定义 `#empty` 插槽最高优先级；若 `hasError: true` 展示 `status="network-error"` 与重试按钮；若表格数据为空且探测到非空筛选条件时，自动切换为 `status="search"` 并展示“未找到符合条件的检索结果”；仅在无筛选参数时展示 `status="empty"` 与“暂无数据”。
- **一键清空自愈按钮**：在 `status="search"` 缺省态下内置呈现「清空筛选条件」按钮，点击时通过跨层级 Provide/Inject 调用 `tableContext.reset()`，驱动 `AtengQueryForm` 表单清空并自动向表格触发第 1 页数据拉取，瞬间自愈还原数据。

```vue
<!-- 搜索条件无匹配时自动呈现 status="search" 缺省态与一键自愈按钮 -->
<AtengTable
  :pagination="pagination"
  search-empty-description="未找到符合条件的检索结果，请尝试调整筛选条件"
>
  <template #query>
    <AtengQueryForm :model="queryForm">
      <el-form-item label="用户姓名" prop="username">
        <el-input v-model="queryForm.username" placeholder="输入姓名" clearable />
      </el-form-item>
    </AtengQueryForm>
  </template>
  <el-table-column prop="username" label="用户名" />
</AtengTable>
```

### 8. 容器感知响应式断点与多行折叠展示 (`AtengQueryForm`)

`AtengQueryForm` 彻底打破依赖浏览器全局 `window` 视口宽度的局限，全面升级为**容器感知响应式引擎 (Container Query)**：

- **容器级 ResizeObserver 响应式断点**：监听组件自身根容器的宽度变化，在 `<768px` (1 列)、`<1200px` (2 列)、`<1920px` (3 列)、`>=1920px` (4 列) 之间平滑无刷重排；当将表单嵌入 `AtengSplitLayout` 分栏、`AtengDrawer` 抽屉或 Tab 容器中，用户拖拽分栏手柄改变局部容器宽度时，表单即刻自适应调整列数，无需改变浏览器视口宽度！
- **多行折叠常驻展示 (`collapsedRows`)**：支持通过 `collapsedRows` 属性配置收起时常驻展示的行数（如 `collapsedRows="2"` 常驻 2 行），展开时平滑滑出全部检索项，并在折叠状态下始终将「查询 / 重置 / 展开」操作按钮保持在末尾。
- **重置自触发控制 (`autoSearchOnReset`)**：配置 `:auto-search-on-reset="true"`（默认 true），点击重置按钮时自动重置为默认值并立即派发 `@search` 事件。

```vue
<!-- 嵌入 AtengSplitLayout 演示容器感知响应式，配合 collapsedRows="2" 双行常驻折叠 -->
<AtengSplitLayout v-model="splitSize" min="20%" max="60%">
  <template #first>
    <el-tree :data="deptTree" />
  </template>
  <template #second>
    <AtengQueryForm
      :model="queryModel"
      :collapsed-rows="2"
      :default-collapsed="true"
      :auto-search-on-reset="true"
      @search="handleSearch"
      @reset="handleReset"
    >
      <el-form-item label="姓名" prop="name"><el-input v-model="queryModel.name" /></el-form-item>
      <el-form-item label="工号" prop="code"><el-input v-model="queryModel.code" /></el-form-item>
      <el-form-item label="角色" prop="role"><el-input v-model="queryModel.role" /></el-form-item>
      <el-form-item label="状态" prop="status"><el-input v-model="queryModel.status" /></el-form-item>
      <el-form-item label="邮箱" prop="email"><el-input v-model="queryModel.email" /></el-form-item>
      <el-form-item label="职级" prop="level"><el-input v-model="queryModel.level" /></el-form-item>
    </AtengQueryForm>
  </template>
</AtengSplitLayout>
```

### 9. Vue 3.5 SFC 原生泛型全链路打通 (`<AtengTable<T>>` & `<AtengDescriptions<T>>`)

遵循 ADR-0002 规范，`AtengTable` 与 `AtengDescriptions` 采用 Vue 3.5 原生 `<script setup lang="ts" generic="T extends Record<string, unknown> = Record<string, unknown>">`：

- 组件使用方无需任何深层 `as UserItem[]` 强转断言；
- Props（`:data="userList"`、`:pagination="pagination"`）、Emits（`@selection-change`）、Slots（`#batch-actions="{ selectedRows }"`）及 Expose（`tableRef.value.selectedRows`）全链路 100% 具备强类型推导与 IDE 智能补全；
- `AtengDescriptions` 支持 `<AtengDescriptions<UserDetailProfile>>`，其 `:data` 与 `DescriptionsItemConfig<T>` 字段严格校验，彻底消灭拼写错误。

### 10. 面向 LLM 与 SSE 流式响应的纯原生打字机 (`AtengStreamText`)

`AtengStreamText` 面向现代大语言模型生成式输出与 SSE 流式数据推送，纯原生微任务实现平滑打字机切片呈现，内置呼吸光标状态机，可一键复制文本并无缝对接 `@atengk/vue` 的 `useStream` 状态机：

```vue
<!-- 纯原生逐字打字机切片、呼吸光标自适应淡出与一键复制代码 -->
<AtengStreamText
  ref="streamRef"
  :text="aiGeneratedMarkdown"
  :speed="30"
  :cursor="true"
  cursor-char="|"
  :show-copy="true"
  @finished="val => console.log('流式输出完毕, 总长:', val.length)"
  @copy="val => ElMessage.success(`内容已复制 (${val.length} 字符)`)"
/>
```

### 11. 高性能运维日志终端与防内存泄漏缓冲 (`AtengLogViewer`)

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

### 12. 金融级动效统计指标卡片 (`AtengStatistic`)

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

### 13. 零依赖结构化代码与数据查看器 (`AtengCodeView`)

`AtengCodeView` 面向接口报文查阅、审计日志详情与配置展示，坚决拒绝引入 Monaco Editor 或 Prism.js 等庞大类库。采用纯原生 TypeScript 分词状态机与成对括号折叠算法，支持 JSON 对象/数组树形折叠、SQL 语法高亮、自适应行号侧边栏与一键复制反馈：

```vue
<!-- 结构化数据查看器，支持 JSON 树形折叠、代码高亮、行号与明暗双模 -->
<AtengCodeView
  :code="responsePayload"
  language="json"
  theme="dark"
  :collapsible="true"
  :line-numbers="true"
  max-height="450px"
  @copy="text => ElMessage.success(`代码已复制 (${text.length} 字符)`)"
/>
```

### 14. 企业级原生图标选择器与拼音极速检索 (`AtengIconSelect`)

`AtengIconSelect` 面向菜单管理与权限分配，内建全量常用官方标准 SVG 图标库（零外部依赖）。支持中文、全拼与拼音首字母模糊检索，支持 Popover 浮窗与 Dialog 模态窗双模展现，并提供网格分页与一键复制 `<el-icon>` 组件代码：

```vue
<!-- 支持 Popover/Dialog 双模、拼音首字母/全拼检索与一键复制代码组件 -->
<AtengIconSelect
  v-model="menuIcon"
  mode="popover"
  placeholder="请选择菜单图标"
  :show-copy="true"
  :page-size="36"
  @select="item => console.log('选中图标:', item)"
/>
```

### 15. 安全防刷新验证码倒计时与前置拦截 (`AtengCaptcha`)

`AtengCaptcha` 面向登录注册、找回密码与短信推送场景，摒弃易失的内存倒计时，基于 LocalStorage 物理时间戳防刷新清零。支持前置异步校验拦截（`beforeSend`）、异步发送 Loading 互斥防重锁与图形验证码刷新形态：

```vue
<!-- 短信/邮件验证码倒计时：持久化防刷新 + 前置异步校验拦截 -->
<AtengCaptcha
  storage-key="login_sms_timer"
  :seconds="60"
  :before-send="checkPhoneBeforeSend"
  :send="mockSendSms"
/>

<!-- 图形验证码形态与点击刷新 -->
<AtengCaptcha type="image" :image-src="currentImageSrc" :refresh="handleRefreshImage" />
```

### 16. 原生轻量多格式文件在线预览门户 (`AtengFilePreview`)

`AtengFilePreview` 面向附件查阅、图片轮播、音视频审查与日志报文浏览，坚决拒绝引入数十 MB 的 pdfjs 或 video.js 重型依赖。基于纯原生 HTML5 与组件联动，支持图片灯箱、原生 PDF、音视频播放、代码文本高亮（复用 `AtengCodeView`）与未知格式降级下载：

```vue
<!-- 内嵌模式：智能推导文件类型（支持图片、PDF、音视频、代码文本与未知降级） -->
<AtengFilePreview
  url="https://example.com/files/report.pdf"
  name="年度经营汇报.pdf"
  height="520px"
  @download="filename => console.log('下载文件:', filename)"
/>

<!-- 模态弹窗模式 (v-model:visible) 与本地 File/Blob 即时预览 -->
<AtengFilePreview
  v-model:visible="isPreviewDialogVisible"
  mode="dialog"
  :file="uploadFileRaw"
  title="本地文件预览"
/>
```

### 17. 现代极客多主题引擎与预设科技风切换 (`@atengk/element-plus/theme-pro.css`)

面向现代云原生控制台、DevOps 平台与 AI 交互系统，提供开箱即用、纯 CSS 变量驱动的工业级现代极客主题引擎：

- **5 款预置科技配色**：
  - `indigo`（极客靛蓝，默认 Linear 质感高智冷调 `#4f46e5`）
  - `emerald`（极客翠绿，清新翡翠青 `#10b981`）
  - `violet`（赛博幻紫，未来主义霓虹幻紫 `#7c3aed`）
  - `ocean`（商务深海，严谨可靠深海蓝 `#0284c7`）
  - `rose`（极光绯红，热烈创新高能绯红 `#e11d48`）
- **Slate 冷感深空暗黑基底**：基于 Slate 调色板重构 Element Plus 暗黑体系（底板 `--el-bg-color-page: #0b0f19`、卡片 `--el-bg-color: #111827`、浮层 `--el-bg-color-overlay: #1e293b`），告别发灰混浊的视觉体验；
- **现代质感组件增强**：
  - **三轨主按钮**：纯色扁平、渐变极客（`.at-btn-gradient`）与微光脉冲发光（`.at-btn-glow`）；
  - **激光 Focus-Ring**：输入框、选择器在 `:focus-within` 下呈现 3px 柔和半透明光晕扩散；
  - **黑曜石暗晶体 LED 标签**：暗黑模式下呈现暗晶底色与 6px LED 呼吸微标；
  - **数控轻拟物开关**：内嵌线性滑槽阴影与滑动球体光晕，提供数控级精密微交互；
  - **流体无框表格**：无重边框、表头悬浮微光、斑马纹细腻区分与 150ms 平滑悬浮高亮；
  - **毛玻璃浮层**：弹窗与抽屉 Header 自带 `backdrop-filter: blur(12px)` 半透明毛玻璃沉浸质感；
  - **微光卡片与 Pills 导航**：卡片上边缘微光发光线条、Tabs 胶囊 Pill 切换滑块。

```vue
<!-- 1. 切换预设主题与暗黑基底 -->
<script setup lang="ts">
import { ref } from 'vue';

type ThemeName = 'indigo' | 'emerald' | 'violet' | 'ocean' | 'rose';
const currentTheme = ref<ThemeName>('indigo');

function switchTheme(theme: ThemeName) {
  currentTheme.value = theme;
  document.documentElement.setAttribute('data-theme', theme);
}
</script>

<!-- 2. 组件样式的零 !important 优雅局部定制与逃生门 -->
<style scoped>
/* 业务视图无需任何 !important 即可优雅覆盖组件样式 */
.custom-card {
  --el-card-border-color: rgba(59, 130, 246, 0.4);
  border-radius: 16px;
}
</style>
```

### 18. 运行时租户品牌色动态高精度换肤 (`setThemeColor`)

针对多租户 SaaS 系统、个性化自选品牌色等动态场景，`setThemeColor` 提供纯原生极速色阶演算，100% 对齐官方 Sass 线性插值标准：

```ts
import { setThemeColor, generateThemePalette } from '@atengk/element-plus';

// 1. 纯函数生成完整色阶（9 阶 light + 2 阶 dark）
const palette = generateThemePalette('#10b981');
console.log(palette['--el-color-primary']); // '#10b981'
console.log(palette['--el-color-primary-light-3']); // '#57ce9e'
console.log(palette['--el-color-primary-dark-2']); // '#0d9468'

// 2. 动态换肤并持久化至 LocalStorage（页面刷新自动保持）
setThemeColor('#8b5cf6', {
  storageKey: 'my_tenant_theme_color',
  dark: document.documentElement.classList.contains('dark'),
});

// 3. 应用初始化时从存储中恢复品牌色
const savedColor = localStorage.getItem('my_tenant_theme_color');
if (savedColor) {
  setThemeColor(savedColor);
}
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
   - 组件库样式 100% 复用 Element Plus 原生 CSS 变量（`--el-color-*`、`--el-bg-*`、`--el-border-*`、`--el-fill-*`），支持通过 `html.dark` 实现零配置暗黑模式自适应变色；
8. **严格 XSS 转义与零重型库语法高亮防线 (Safe Syntax Tokenization Invariant)**：
   - `AtengCodeView` 坚持纯原生 TypeScript 分词状态机与严格 HTML 字符实体转义，严禁将未受转义的原始标签直接注入 DOM；摒弃 Monaco Editor 与 Prism.js 等百 KB 级重型库，兼顾毫秒级极速渲染与成对成块树形折叠，并无缝集成 `v-copy` 一键剪贴板复制；
9. **图标库零臃肿与极速多维检索防线 (Zero-Bloat Icon Search Invariant)**：
   - `AtengIconSelect` 内建常用标准 SVG 矢量路径与拼音/中英索引，无需下游全量打包庞大外部图标包；通过纯内存拼音与英文倒排检索，兼顾毫秒级极速响应、网格极速分页与一键复制 `<el-icon>` 代码组件；
10. **物理时间戳防刷新与并发防刷互斥锁防线 (Physical Timestamp & Concurrency Lock Invariant)**：

- `AtengCaptcha` 倒计时摒弃传统的易失纯内存计时器，将绝对到期时间戳（`Date.now() + seconds * 1000`）持久化至 LocalStorage/SessionStorage。用户刷新页面或路由流转后重新挂载时，根据物理时钟差值自动精准恢复倒计时，彻底杜绝刷新页面重置倒计时的防刷漏洞；同时内置 `beforeSend` 前置校验与发送互斥锁，多重防护杜绝接口重复调用；

11. **纯原生零依赖文件渲染与 ObjectURL 确定性生命周期防线 (Zero-Bloat Preview & ObjectURL Lifecycle Invariant)**：

- `AtengFilePreview` 坚决拒绝引入 pdfjs、video.js 等数十 MB 级庞大依赖包，采用原生 HTML5 `iframe`、`video`、`audio`、`ElImage` 与 `AtengCodeView` 高性能组合实现全格式开箱即览；在传入本地 `File`/`Blob` 对象时，自动安全生成 `URL.createObjectURL` 临时句柄，并在更新资源或组件卸载（`onUnmounted`）时 100% 确定性调用 `URL.revokeObjectURL` 释放句柄，彻底杜绝浏览器内存泄漏；

12. **纯原生 HTML5 列拖拽排序与 ResizeObserver 视口高度自适应防线 (Native Drag Order & AutoHeight Invariant)**：

- `AtengTable` 坚决拒绝引入重型 `SortableJS`，基于原生 HTML5 Drag & Drop API 实现列配置列表的毫秒级拖拽排序，并通过 `storageKey` 本地持久化记忆用户排序列顺序；`autoHeight` 基于 `ResizeObserver` 实时监听父容器/视口变化动态计算表格体最大高度，组件销毁时确定性解绑监听，彻底告别双滚动条与视口撑破；

13. **2000 行环形内存截断防 DOM 膨胀与贴底滚动防线 (Circular Memory Buffer & Anti-DOM-Bloat Invariant)**：

- `AtengLogViewer` 面向高频实时日志流，内置固定容量环形队列（默认最大 2000 行），超限时以 $O(1)$ 复杂度自动丢弃最旧日志行，坚决杜绝因数万行 DOM 元素导致浏览器标签页内存溢出或卡顿崩溃；支持用户向上滚动时自动挂起贴底跟随，恢复贴底时无缝恢复实时滚屏；

14. **原生逐字打字机切片与 SSE/LLM 呼吸光标淡出防线 (Stream Text Tokenization Invariant)**：

- `AtengStreamText` 针对现代大模型流式输出（SSE/Fetch ReadableStream），基于原生微任务队列与字符切片实现打字机平滑过渡；内置呼吸光标状态机，在流式完成（`finished`）或中断时自动优雅淡出，杜绝幽灵光标残留；集成防 XSS 字符转义与一键剪贴板无感复制；

15. **原生 rAF 指数衰减缓动与金融级货币千分位防线 (rAF Easing Transition Invariant)**：
    - `AtengStatistic` 摒弃庞大的 `countup.js`，采用原生 `requestAnimationFrame` 与三阶指数衰减缓动算法驱动数字平滑过渡，并在目标值突变时自动从当前过渡值平滑重定向至新目标值，在组件销毁时立即取消未决帧，防内存泄露与脏帧渲染；
16. **双模视口滚动治理与弱感应路由面包屑防线 (Dual-Mode Scroll & Auto Breadcrumb Invariant)**：
    - `AtengPageContainer` 通过 `fitViewport` 严格解耦固定页头与内部自适应滚动区，杜绝内外双滚动条灾难；`autoBreadcrumb` 通过安全弱探测 `route.matched` 提炼有效层级并过滤无标题节点；`headerBlur` 吸顶毛玻璃质感与滚动动态 `.is-elevated` 投影平滑呈现现代沉浸质感；
17. **指针事件统一与双向折叠把手防线 (Pointer Events & Bidirectional Split Invariant)**：
    - `AtengSplitLayout` 采用 W3C `PointerEvent` 与 `setPointerCapture` 原生支持触控与 iPad 拖拽调宽，彻底消除高速越界丢帧；双向独立把手支持首栏与次栏折叠互斥安全；`storageKey` 本地同步恢复折叠偏好防首屏闪烁；
18. **智能容器避让与防穿透全局引用计数防线 (AutoOffset & Multi-Card Lock Invariant)**：
    - `AtengFooterBar` 在 `fixed` 模式下基于 `ResizeObserver` + rAF 动态测量容器边界平滑避让侧边栏折叠动画；`AtengCard` 采用模块级引用计数管理 `lockScroll` 全屏防穿透滚动锁，确保多卡片并发或嵌套弹层时 100% 确定性安全复原，ESC 快捷键尊重 `defaultPrevented` 防止误关子组件；
19. **流式自适应网格与仪表盘模态防线 (Fluid Adaptive Grid & Dashboard Skeleton Invariant)**：
    - `AtengPageSkeleton` 扩充 `'dashboard'` 高频模态（4 指标卡 + 双图表区块）；网格全面升级为现代 CSS Grid `repeat(auto-fit, minmax(220px, 1fr))` 流式自适应，移动端与窄屏自然折行，杜绝挤压变形与横向溢出；
20. **40px 最小列宽防塌陷与存储防脏数据不变量 (Column Resize Min Width & Storage Invariant)**：
    - `AtengTable` 在表头拖拽调整列宽时，强制执行 `Math.max(40, newWidth)` 保底，防止用户误操作将列宽缩减至 0 或负数导致列在 DOM 中完全不可逆塌陷消失；本地反序列化列宽配置时，严格进行非空对象与正数值白名单校验，若发现脏数据或损坏数据立即安全降级忽略，确保界面永不崩溃；
21. **容器感知断点隔离不变量 (Container Query & ResizeObserver Invariant)**：
    - `AtengQueryForm` 彻底解耦对全局 `window.innerWidth` 的依赖，基于组件根 DOM 节点的 `ResizeObserver` 动态计算断点（<768px 单列 / <1200px 双列 / <1920px 三列 / ≥1920px 四列）。当嵌套在 `AtengSplitLayout` 分栏拖拽、抽屉或卡片内部时，仅响应自身所在容器的物理宽度变化；组件销毁时确定性调用 `disconnect()` 解绑，零悬挂监听与内存泄露；
22. **搜索多态缺省态与双向重置自愈通道 (Polymorphic Empty & Healing Reset Invariant)**：
    - `AtengTable` 智能感知数据源状态，当数据为空且存在非空检索字段时确定性展示 `status="search"` 多态缺省态与一键清空自愈按钮；点击自愈按钮时通过 `tableContext.reset()` 跨层级双向通道驱动 `AtengQueryForm` 重置并向表格重刷第 1 页数据，消灭因检索条件无匹配且缺乏自愈路径导致业务停滞的体验盲区；
23. **现代极客多主题纯 CSS 变量驱动与零运行时开销不变量 (Zero-Runtime Theme Overhead Invariant)**：
    - `theme-pro.css` 全量样式规则采用纯原生 CSS Custom Properties 派生演算，零 CSS-in-JS 或额外 JS 运行时重绘开销；切换主题仅需在 `<html>` 节点切换 `data-theme` 属性即可瞬间激活不同科技风配色，性能达到原生浏览器渲染顶峰；
24. **零 `!important` 与无损样式逃生门防线 (Zero !important & Extensible Invariant)**：
    - 主题引擎全量样式代码（包括 5 套预设、暗黑适配与组件增强）坚持 100% 绝对不使用 `!important`；上层业务组件库与业务视图可以基于常规 CSS 优先级无损覆盖或微调任意样式变量，彻底消除样式被锁死无法定制的痛点；
25. **官方 Sass 线性插值算法 100% 精度对齐防线 (Color Palette Precision Invariant)**：
    - `generateThemePalette` 与 `setThemeColor` 底层调色算法严格遵循 Element Plus 官方 `color.mix($color-white, $base, weight)` 数学公式，在 RGB 空间进行精准整数四舍五入线性混合，与官方 Sass 编译产物达到逐通道 100% 精度对齐，杜绝因粗糙颜色转换造成的色阶偏离与视觉失真；
26. **现代等宽数字 Tabular Nums 防抖与微动效平衡不变量 (Tabular Nums & Anti-Jitter Invariant)**：
    - 主题引擎在表格单元格、统计指标及卡片中全局强制开启 `font-variant-numeric: tabular-nums`，确保数字列在动态递增或高频刷新时绝对等宽，根除表格列宽微幅左右跳动的视觉抖动缺陷；同时表格 Hover 状态统一采用 150ms 优雅淡入缓动，兼顾极致流畅度与科技品质感。

---

## 维度四：物理排版与代码全真验证 (Evergreen & Zero-Glitch)

- 所有代码示例与 API 100% 对齐 TypeScript 强类型定义；
- 所有特性 100% 经由 `packages/element-plus/test` 离线单元测试覆盖，并在 `apps/sample-element-plus` 自验展厅中跑通真实交互。
