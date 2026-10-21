# Element Plus (基础设施增强组件库)

基于 Element Plus 封装的企业级高频基础设施组件与指令集，与底层状态契约深度解耦。

## 基础设施组件

**AtengTable**:
与统一网络契约（PageQuery / PageResult）深度绑定的企业级分页表格容器组件。
_Avoid_: ProTable, SuperTable, DataTable, BaseTable

**AtengQueryForm**:
具备响应式栅格、平滑折叠展开与操作防抖的企业级结构化高级搜索表单容器组件。
_Avoid_: SearchForm, FilterBar, QueryBox, AtengSearch, SearchPanel

**AtengDescriptions**:
具备预置脱敏管道（手机号、身份证、银行卡、金额）与空值防御展示的企业级结构化详情组件。
_Avoid_: DetailView, InfoDescriptions, ProDescriptions

**AtengDictSelect**:
接入全局 DictManager 单例去重与常驻缓存的下拉字典选择组件。
_Avoid_: DictSelect, EnumSelect, CodeSelect

**AtengDictRadio**:
接入全局 DictManager 单例去重与常驻缓存的单选框组字典组件。
_Avoid_: DictRadio, EnumRadio

**AtengDictTag**:
基于全局 DictManager 字典项自动映射显示样式与标签的企业级彩色 Tag 组件。
_Avoid_: DictTag, EnumTag, StatusTag

**DictManager**:
负责全局字典异步请求并发合并去重与内存常驻缓存的无状态/单例门面管理器。
_Avoid_: DictService, CodeManager, EnumCache

**AtengDateRange**:
具备常用区间快捷切换与双字段解构绑定的快捷时间范围选择器组件。
_Avoid_: RangePicker, DateRangePicker, QuickDateRange

**AtengExcelFeedback**:
Excel 导入错误明细在线预览与 Apache Fesod 标红批注回写文件下载弹窗组件。
_Avoid_: ErrorDialog, ExcelModal, FeedbackDialog, ImportResultModal

**AtengUpload**:
统一抽象本地与标准 S3/MinIO 多源存储的直传与分片上传器组件。
_Avoid_: FileUploader, OssUpload, UploadBox, StorageUpload

**AtengDialog**:
企业级可拖拽、全屏切换与异步提交 Loading 锁交互弹窗容器组件。
_Avoid_: AtengModal, BaseDialog, DragDialog, FullscreenDialog

**AtengDrawer**:
企业级响应式尺寸与异步提交 Loading 锁抽屉交互容器组件。
_Avoid_: AtengSidePanel, BaseDrawer, SlideDrawer

**AtengEmpty**:
统一多语义状态（空数据、403、网络异常、搜索无结果、500）与暗黑自适应插画的缺省态占位组件。
_Avoid_: EmptyState, Placeholder, NoData, ErrorPlaceholder

## 权限与防重指令

**v-permission**:
基于权限码的细粒度操作按钮可见性控制指令（默认物理移除 DOM 并留存注释锚点，支持 `.disabled` 与 `.all` 修饰符）。
_Avoid_: v-auth, v-hasPermi, v-access, v-privilege

**v-role**:
基于角色标识的操作权限控制指令（默认物理移除 DOM 并留存注释锚点，支持 `.disabled` 与 `.all` 修饰符）。
_Avoid_: v-hasRole, v-isRole, v-roles

**v-idempotent**:
针对提交动作的防刷、防重复点击与前端幂等锁保护指令（支持时间窗口防刷与异步 Promise 锁双模，捕获阶段拦截）。
_Avoid_: v-debounce, v-throttle, v-preventReClick, v-noRepeat

## 辅助工具指令

**v-copy**:
基于剪贴板 API 的一键文本复制与轻量反馈指令（支持 Getter、静默配置与 ElMessage 反馈）。
_Avoid_: v-clipboard, v-text-copy, v-click-copy

**v-watermark**:
基于 Canvas 渲染与 MutationObserver 动态防御篡改的防伪水印指令（支持局部容器与全屏双模）。
_Avoid_: v-mask, v-water-mark, v-stamp
