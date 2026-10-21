# 0018. Element Plus 企业级组件矩阵全景扩充与零臃肿工程深化架构

## 状态

Accepted (已接受)

## 背景与决策上下文

在完成 `@atengk/element-plus` 的基础工程底座、CRUD 表格套件与通用业务套件（共 11 大核心组件与 5 大指令）后，系统已具备稳固的企业级支撑能力。然而，立足于广义现代 Web 应用与复杂企业级中后台交互场景，仍面临三层维度的结构性演进诉求：

1. **下层 L0/L1 基础设施能力的表现层对齐断层**：
   - L0 具备高可用流式客户端 `StreamClient` 与 L1 无头 `useStream` 打字机状态机，但 L3 缺少轻量开箱即用的打字机呈现组件；
   - L0 具备高可用 `WebSocketClient` 与 L1 `useWebSocket`（支持断线重连、心跳保活与离线缓冲），但在企业级自动化调度、构建部署与监控运维中，极度缺少一个具备内存受控缓冲、自动滚屏与状态指示灯的实时日志滚屏终端；
   - L1 具备基于 Apache Fesod 协议的 `useExcel`（支持流式导出与批注），但 L3 仅有针对导入失败的 `AtengExcelFeedback` 弹窗，缺少与 `AtengTable` 深度协同的声明式一键导出按钮。
2. **核心既有套件的“最后一公里”工程质感深化**：
   - **表格列排序与双滚动条**：`AtengTable` 的列配置 Popover 仅支持显隐控制，缺乏列顺序调整能力；同时在复杂后台中，固定表格高度常导致窗口外层与表格内层“双滚动条”并存；
   - **字典多选形态缺失**：已有 `AtengDictSelect`、`AtengDictRadio`、`AtengDictTag`，但表单中高频使用的多选框组（Checkbox Group）缺位，且常面临后端逗号分隔字符串（如 `'1,2,3'`）的手动拆装成本。
3. **高频企业级交互组件的碎片化重复建设**：
   - KPI 统计指标卡片（缺乏平滑动效与金融千分位规整）；
   - 菜单与权限管理中的 Element Plus 原生图标选择器（缺乏开箱即用带拼音检索的弹层）；
   - 接口报文与审计日志的轻量 JSON/代码展示（引入 Monaco 或 Prism 会导致产物体积急剧膨胀几百 KB）；
   - 登录与认证场景中的防刷倒计时验证码（防页面刷新、防连击互斥）；
   - 附件上传后的图片灯箱、原生 PDF 与多媒体统一在线预览。
4. **架构边界防线防守（反模式抵御）**：
   - 业界常见体系（如 ProForm）倾向于打造由巨大 JSON Schema 驱动的“上帝表单容器（God-Form）”，导致配置项无穷递增（抽象倒置）、槽点灵活性极差且难以调试。

## 架构决策

遵循“**纯原生优先、深模块解耦、零臃肿依赖、开箱即用**”原则，确立以下系统级架构决策：

### 1. L0/L1 基础设施能力的表现层全链路闭环

1. **`AtengStreamText` (AI / SSE 流式打字机组件)**：
   - 双轨驱动：既支持直接绑定 `@atengk/vue` 的 `useStream` 返回对象（响应式监听增量 chunk 与 `isFinished`），又支持受控静态纯文本切片动画模式；
   - 纯原生闪烁竖线光标，在流结束或静态完成时平滑淡出隐藏；内置一键复制（联动 `v-copy`）与 `@finished` 广播；
   - 坚决杜绝内置大型 Markdown 语法树引擎，保持纯文本打字的高性能与 0 依赖。
2. **`AtengLogViewer` (WebSocket 实时日志滚屏终端组件)**：
   - 深度绑定 `useWebSocket` 或支持手动喂入日志数组；
   - 内置**自动贴底滚屏**与暂停滚屏开关、暗色/亮色终端质感主题切换、关键字检索高亮、一键清屏与日志下载导出；
   - **内存防溢出有限缓冲不变量 (Bounded Memory Invariant)**：硬性限定最大历史行数（默认 2000 行），超出确定性移出早期行，彻底杜绝长时间运行引发的 DOM 膨胀与浏览器崩溃。
3. **`AtengExcelExport` (流式 Excel 导出按钮组件)**：
   - 具备 `AtengTable` 上下文无感知联动：通过 `inject` 自动读取父表格当前的筛选参数（用于全量导出）或多选勾选的行记录（用于选中导出）；
   - 智能多模分支：多选存在时优先导出选中项，无勾选时全量导出，支持下拉多模菜单切换；
   - 内置防重复连击、Loading 互斥锁，底层安全捕获 Blob-JSON 异常并转译弹窗。

### 2. 既有核心组件的深模块正交补全

1. **`AtengDictCheckbox` (字典多选框组组件)**：
   - 达成 Select / Radio / Checkbox / Tag 四大原子字典形态正交闭环；
   - 接入 `DictManager` 飞行中并发去重与纯内存常驻缓存；
   - **双向解构不变量**：除原生数组 `v-model` 外，支持配置 `separator=","`，组件内部自动处理逗号分隔字符串的双向 `split` 与 `join`；
   - 支持 `button: boolean` 胶囊按钮风格无缝切换，支持快捷全选（`showCheckAll`）与半选（`indeterminate`）状态自适应。
2. **`AtengTable` 进阶交互深化 (纯原生列拖拽与视口自适应)**：
   - **纯原生 HTML5 列拖拽排序**：在列配置 Popover 内为每列提供抓手图标，使用原生 HTML5 Drag & Drop API（`draggable="true"`, `dragstart`, `dragover`, `drop`）实现上下拖拽重排，0 引入任何外部第三方库；重排结果实时同步底层表格并持久化至 `storageKey`；
   - **视口高度自适应 (`autoHeight`)**：增加 `autoHeight?: boolean | number` 配置，利用原生 `ResizeObserver` 监听视口并动态计算表格高度（`window.innerHeight - tableTop - bottomOffset`），销毁时确定性解绑，彻底消灭外层双滚动条。

### 3. 高频企业级基础设施组件矩阵扩充

1. **`AtengStatistic` (金融级动效数字与统计指标卡片)**：
   - 基于纯原生 `requestAnimationFrame` 实现平滑数字滚动翻牌动效（0 引入外部 countup 依赖）；
   - 深度融合 L0 `Currency` 工具箱，保障金融级精度与千分位规范化；
   - 支持前后缀单位、涨跌趋势百分比与红绿微标、骨架屏 Loading。
2. **`AtengIconSelect` (企业级原生图标选择器)**：
   - 原生收敛 `@element-plus/icons-vue` 全量图标；
   - 支持中文拼音与英文名称极速模糊搜索过滤；
   - 支持 Popover 与 Dialog 双模展示，直接双向绑定 `v-model` 图标字符串，提供一键复制代码组件名。
3. **`AtengCodeView` (零依赖轻量结构化代码展示框)**：
   - 纯原生 TS 实现轻量 JSON 树形折叠展开与高亮、SQL/XML 格式化展示；
   - 提供暗黑终端质感、自适应行号栏、展开/收起长文本、一键复制（联动 `v-copy`）。坚决拒绝引入 Monaco / Prism.js 等庞大类库。
4. **`AtengCaptcha` (安全防刷验证码输入框)**：
   - 内置 60 秒倒计时状态机，并在 LocalStorage 登记时钟戳，防止用户恶意刷新页面重置倒计时；
   - 提供异步 `beforeSend` 校验钩子（如前置校验手机号合法性），内置发送中 Loading 与防刷互斥锁。
5. **`AtengFilePreview` (多格式统一轻量文件预览弹窗)**：
   - 纯原生识别文件类型：图片调用大图灯箱预览（旋转/缩放）；PDF 使用原生 iframe/embed 内嵌渲染；音视频使用原生 HTML5 播放器；文本/JSON 联动 `AtengCodeView`；
   - 无法在线预览的格式自动降级为文件摘要卡片与一键安全下载。

### 4. 架构红线裁定

1. **坚决不造上帝表单容器（No God-Form）**：
   - 复杂业务表单（增删改、联动、多步校验）坚决不采用 JSON Schema 包装；
   - 坚持使用 Vue SFC 原生模板 `<el-form>` + `<AtengDialog>` / `<AtengDrawer>` + `v-idempotent`，将表现力与排版自由度完整交还给开发者，从根源规避配置膨胀与维护性崩溃。
2. **租户切换归属应用外壳（Admin Layout）**：
   - `AtengTenantSelect` 属于框架模板层职能，不进入通用组件库原子层，上层通过无头 `useTenant` 自行组装。

## 效果与权衡

- **收益 (Benefits)**：
  - `@atengk/element-plus` 扩充至 **17 个高频核心组件与 5 大指令**，全面覆盖现代 Web 与企业级中后台 95% 以上的高频交互场景；
  - 彻底打通与 L0/L1 底座在流式 AI、实时长连接与 Excel 双向流转上的闭环；
  - 100% 坚持纯原生与零外部臃肿依赖，组件库整体产物依然极致轻量（Tree-shakeable），无任何第三方大型库拖累；
  - 表格列拖拽与视口高度自适应从底层消灭了长久困扰开发者的工程瑕疵。
- **代价与权衡 (Trade-offs)**：
  - 纯原生 HTML5 拖拽在移动端触控屏上不支持触摸拖拽，但定位为企业级桌面端管理系统，权衡可接受；
  - `AtengCodeView` 与 `AtengFilePreview` 放弃了对 docx/xlsx 在线渲染与 Monaco 复杂语法的支持，换取了 0 字节外部膨胀与毫秒级初始化体验。
