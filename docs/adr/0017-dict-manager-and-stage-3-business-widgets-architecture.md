# 0017. DictManager 全局单例去重、AtengDescriptions 渐进脱敏与第三阶段业务套件架构

## 状态

Accepted (已接受)

## 背景与决策上下文

在完成 `@atengk/element-plus` 的 Stage 1（工程底座与交互容器）与 Stage 2（核心表格 AtengTable 与查询表单 AtengQueryForm）之后，系统进入承接高频业务交互与数据展示的第三阶段（Stage 3）。在此阶段，中后台企业级系统长期面临五项突出的工程痛点：

1. **字典与枚举的“请求风暴”与缓存脏读**：在复杂业务中，同一下拉字典（如用户状态、订单类型）往往被筛选栏、表格列、编辑弹窗与详情组件在同一时点频繁调用。若无全局协调，会导致瞬间向后端发起大量重复 HTTP 请求；若盲目存入 LocalStorage，一旦后端字典元数据更新，前端持久化缓存又极易产生难以定位的业务脏数据死锁。
2. **结构化详情（Descriptions）的样板代码与脱敏安全风险**：详情页开发充斥着对空值（`null`/`undefined`）的判空防御，缺乏统一的 `'-'` 保底容易引发排版参差或白屏；同时，手机号、身份证、银行卡等脱敏展示缺乏统一管道，业务开发者在视图中频繁编写私有打星函数，极易打破“内存真明文”契约或导致重复造轮子。
3. **时间范围选择器与后端参数的阻抗失配**：前端 `<el-date-picker type="daterange">` 习惯双向绑定单一数组 `[startTime, endTime]`，而后端接口几乎全部要求扁平的两个字段（`startTime` 与 `endTime`），导致业务层必须在表单提交与数据回显时反复编写手动解构与拼装逻辑；同时缺乏常用的自然时间快捷筛选。
4. **Excel 导入失败反馈体验割裂**：用户上传 Excel 校验失败后，传统交互要么只能弹出一段简陋的文字，要么下载一个无法看懂的错误文件，缺乏“结构化明细在线表格浏览 + Apache Fesod 标红批注文件一键下载”的完整闭环。
5. **大文件分片切片上传的 UI 割裂**：底座 `@atengk/vue` 已经具备工业级 `useUpload` 状态机，但 UI 表现层若仅停留在 Element Plus 基础直传，无法给用户提供直观的分片进度条、并发控制、暂停/继续与重试交互。

## 架构决策

基于“**深模块解耦、强类型闭环、内存真明文、开箱即用**”原则，确立以下系统级架构决策：

1. **DictManager 全局单例去重与纯内存常驻缓存契约**：
   - **并发去重 (Deduplication)**：`DictManager` 内部维护正在飞行中的 Promise 映射表。若同一 `dictCode` 在毫秒级被多次请求，自动合并为单一物理网络请求，彻底消灭字典请求风暴；
   - **纯内存常驻 (In-Memory Only)**：请求成功后的字典项（`DictItem[]`）常驻于单例 `Map` 中，严禁写入 LocalStorage/SessionStorage，确保页面刷新即可无条件获取最新服务端字典配置；
   - **三级回退数据源**：支持通过 `DictManager.setProvider((code) => Promise<DictItem[]>)` 注册全局接口；组件级支持 `:loader` 局部覆盖；支持 `:options` 静态数组直接传入；
   - **完备对称门面**：提供 `DictManager.clearCache(code?)` 与组件级 `refresh()` 强制穿透刷新机制；
   - 统一驱动 `AtengDictSelect`（下拉单/多选）、`AtengDictRadio`（单选组）与 `AtengDictTag`（彩色标签映射）。
2. **AtengDescriptions 渐进混合架构与脱敏/字典内生管道**：
   - 遵循与 `AtengTable` 100% 一致的设计哲学：**Vue SFC 模板插槽优先（`<AtengDescriptionsItem>`），兼顾 Schema 数据驱动（`:items="DescriptionsItemConfig[]"`）**；
   - **声明式脱敏管道**：预置 `mask="phone" | "idCard" | "email" | "name" | "bankCard"`，底层直接复用 `@atengk/core` 的纯函数，恪守“内存真明文”契约；
   - **内置格式化与空安全**：内置 `currency` 金额千分位、`date` 日期格式化，空值/未定义统一强制保底渲染为 `'-'`；
   - **字典标签内生映射**：支持直接配置 `dict-code="sys_status"`，组件内部自动通过 `DictManager` 解析字典并渲染为 Element Plus 对应的彩色 Tag。
3. **AtengDateRange 双模数据绑定与智能时刻边界补全**：
   - **双模绑定**：支持原生单一数组 `v-model="[start, end]"`，更原生支持 `v-model:start="startTime"` 与 `v-model:end="endTime"` 双字段解构绑定，彻底消灭胶水代码；
   - **常用快捷区间**：内置今天、昨天、本周、上周、本月、近7天、近30天等常用区间快捷操作栏；
   - **时刻智能对齐**：日期范围模式下，起始时间自动补全 `00:00:00`，结束时间自动补全 `23:59:59`。
4. **AtengExcelFeedback 双态在线反馈与批注回写闭环**：
   - 弹窗内置 `<el-table>` 分页渲染错误行号、列名、错误原因，支持一键复制；
   - 底部操作栏支持传入 `fileUrl` 或 `downloadAction` 异步函数，一键拉取并下载服务端回写的标红批注 Excel 结果文件，无缝衔接 `@atengk/vue` 的 `useExcel` 与 L0 的 Blob 双态错误识别防线。
5. **AtengUpload 基础增强与分片切片状态机双模表现容器**：
   - **基础直传增强**：增强拖拽、图片缩略图弹窗预览、文件大小/格式前置校验；
   - **分片切片模式 (`:chunk="true"`)**：通过协议无关适配器（`customUploadChunk`、`customMerge`）深度绑定 `@atengk/vue` 的 `useUpload` 状态机，接管切片进度、并发控制、暂停/继续与单片重试。

## 效果与权衡

- **收益**：
  - 消灭了中后台系统中 95% 以上的重复字典网络请求，显著降低网关负载；
  - 结构化详情组件将传统 30~50 行的判空与脱敏模板压缩至 5~10 行声明式代码；
  - 日期范围双字段解构消灭了表单提交前后的字段转换冗余；
  - 表现层与无头层（`useUpload`、`useExcel`）能力严密缝合，形成完整工业级交付闭环。
- **代价与权衡**：
  - 纯内存缓存意味着用户在全量刷新浏览器（F5）时会重新触发一次字典请求，但换取了零持久化脏数据、零版本废弃迁移成本的高可靠性；
  - `AtengDescriptions` 增加了微量的 VNode 递归提取与计算，换取了 SFC 模板书写的极致易用性。
