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

**AtengDictCheckbox**:
接入全局 DictManager 单例去重与常驻缓存的多选框组字典组件。
_Avoid_: DictCheckbox, EnumCheckbox, DictCheckGroup

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

**AtengExcelExport**:
具备防重复连击、Loading 锁与表格状态感知的流式 Excel 导出按钮组件。
_Avoid_: ExportButton, ExcelBtn, Downloader, TableExport

**AtengUpload**:
统一抽象本地与标准 S3/MinIO 多源存储的直传与分片上传器组件。
_Avoid_: FileUploader, OssUpload, UploadBox, StorageUpload

**AtengDialog**:
具备可拖拽、全屏切换、异步提交 Loading 锁、分帧延迟挂载（lazy-render）与独立 GPU 合成图层加速的企业级弹窗交互容器组件。
_Avoid_: AtengModal, BaseDialog, DragDialog, FullscreenDialog

**AtengDrawer**:
具备响应式尺寸断点、异步提交 Loading 锁、分帧延迟挂载（lazy-render）与硬件图层加速的企业级抽屉交互容器组件。
_Avoid_: AtengSidePanel, BaseDrawer, SlideDrawer

**AtengPageContainer**:
具备统一页头（自动路由推导/面包屑/标题/副标题/操作区/页签/可选滚动折叠）、吸顶轻量固顶与滚动阴影、双模自适应滚动、内容脱壳全屏与沉浸式卡片包装的企业级标准页面容器组件。
_Avoid_: PageLayout, LayoutPage, PageView, AdminPage, PageWrapper

**AtengSplitLayout**:
具备现代 Pointer Events 原生拖拽调宽、双向折叠收起把手与尺寸持久化记忆的企业级弹性左右/上下分栏布局容器组件。
_Avoid_: SplitPane, TreeTableLayout, TwoColumn, SplitView, Splitter

**AtengFooterBar**:
具备自动安全边距占位、ResizeObserver 容器智能锚定自适应避让与双向操作排版的企业级吸底悬浮操作栏容器组件。
_Avoid_: BottomBar, ActionBar, StickyFooter, SubmitBar, FootToolbar

**AtengCard**:
具备自定义标题区、操作插槽、局部刷新触发、内嵌页签切换、一键平滑折叠、视口全屏展开与防穿透栈式滚动锁定的企业级结构化卡片面板组件。
_Avoid_: Panel, BoxCard, ContentBox, AtengPanel

**AtengCardGroup**:
具备状态集中编排、手风琴单开互斥与批量折叠展开的企业级多卡片协调容器组件。
_Avoid_: CardList, PanelGroup, MultiCard, AccordionGroup, CardAccordion

**AtengWatermark**:
具备离屏 Canvas 矢量渲染、多行文本/图片合成与 MutationObserver 防篡改防删除守卫的企业级安全水印包裹容器组件。
_Avoid_: WaterMarker, WaterMarkView, BgWatermark, SafeWatermark

**AtengAnchor**:
具备双模滚动自适应感知、平滑滚动定位与卡片节点联动的企业级电梯楼层导航锚点容器组件。
_Avoid_: Elevator, FloorNav, ScrollSpy, AffixAnchor, AnchorNav

**AtengGrid**:
基于现代 CSS 容器查询与自适应最小列宽机制的企业级响应式流式网格排版容器组件。
_Avoid_: AutoGrid, FlexGrid, ResponsiveLayout, ContainerGrid, FluidGrid

**AtengPageSkeleton**:
具备列表、表单、详情、卡片网格与仪表盘看板等多形态预设及弹性自适应栅格的页面骨架屏占位容器组件。
_Avoid_: PageLoading, SkeletonView, LayoutSkeleton, ContentSkeleton

**AtengEmpty**:
统一多语义状态（空数据、403、网络异常、搜索无结果、500）与暗黑自适应插画的缺省态占位组件。
_Avoid_: EmptyState, Placeholder, NoData, ErrorPlaceholder

**AtengStreamText**:
面向 AI/SSE 流式响应与平滑打字机吐字呈现的轻量级纯文本展示组件。
_Avoid_: Typewriter, StreamView, ChatStream, AiText

**AtengLogViewer**:
对接全双工 WebSocket 与受控内存缓冲的企业级实时日志终端滚屏组件。
_Avoid_: ConsoleView, WsLog, TerminalBox, LogTerminal

**AtengStatistic**:
具备纯原生 rAF 动效数字翻牌、千分位规整与涨跌趋势的企业级统计卡片组件。
_Avoid_: StatCard, NumberRoll, MetricBox, DigitCard

**AtengIconSelect**:
集成 Element Plus 原生图标库与拼音极速模糊检索的系统配置图标选择器组件。
_Avoid_: IconPicker, IconSelector, AtengIconPicker

**AtengCodeView**:
具备自适应行号栏、JSON 树形折叠展开与格式化一键复制的轻量结构化代码展示组件。
_Avoid_: CodeMirrorWrapper, HighlightBox, PreCode, JsonViewer

**AtengCaptcha**:
具备 60 秒防刷新倒计时状态机、前置校验钩子与防刷互斥锁的验证码输入组件。
_Avoid_: VerifyCode, SafeInput, PwdMeter, CaptchaInput

**AtengFilePreview**:
具备图片灯箱、原生 PDF 内嵌、多媒体播放与异常降级下载的多格式轻量文件预览弹窗组件。
_Avoid_: FileViewer, DocPreview, QuickPreview, MediaModal

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

## 表格与检索高级交互机制

**列宽自适应持久化 (Column Width Persistence)**:
在 AtengTable 中基于原生表头拖拽监听与 storageKey 联合存储列顺序、显隐与像素级宽度的生命周期持久化机制。
_Avoid_: 动态列宽存储, 自定义拖拽列宽, ColumnWidthSaver

**多态缺省态 (Polymorphic Empty State)**:
AtengTable 依据网络异常、全局空数据与活跃筛选条件动态呈现 empty、search、network-error 状态插画与一键清空/重试的自愈感知机制。
_Avoid_: 动态空状态, 搜索空状态, SmartEmpty

**容器感知断点 (Container-Aware Breakpoints)**:
AtengQueryForm 摆脱 window 视口大小限制，基于原生 ResizeObserver 动态探测自身容器宽度并流式计算 1~4 列响应式栅格的布局策略。
_Avoid_: 媒体查询断点, 视口断点, WindowBreakpoints

**多行折叠编排 (Multi-Row Collapse)**:
AtengQueryForm 支持配置展示前 N 行表单项并在末行尾部吸附操作按钮的高级折叠交互编排能力。
_Avoid_: 动态折叠, 多行展开, ExpandRows

## 现代多主题设计引擎 (Theme Engine)

**ThemePro**:
基于 Element Plus 原生二级 CSS 变量与现代 Dart Sass 模块化构建的现代极客多主题套件（`theme-pro.css`），集成 5 款高反差科技预设与 Slate 深空暗黑基底。
_Avoid_: ElementTheme, CustomTheme, DarkTheme, ProSkin

**Specular Hairline (定向微光线)**:
模拟现代工业级金属/黑曜石数控光泽的顶部亚像素半透明高光渐变微亮线物理视觉模型。
_Avoid_: TopLight, HighLight, BorderGlow

**Laser Focus-Ring (双层激光聚焦环)**:
基于主品牌色 1px 锐利内环与 4px 半透明柔光外环的表单与拾取器无框激光聚焦高光反馈机制。
_Avoid_: FocusBorder, Outline, GlowRing

**Obsidian Dark Overlay (黑曜石高质感浮层)**:
遮罩层、全局/局部加载态（Loading）与全屏大图预览（ImageViewer）统一应用的独立 GPU 合成图层与实体微透暗黑高质感模型（彻底剥离 backdrop-filter，杜绝 GPU 资源消耗与模糊失真）。
_Avoid_: BlurMask, GlassModal, FrostedOverlay, HeavyBlurOverlay

**Tactile Dragger (触感拖拽上传)**:
基于亚像素虚线描边、阻尼悬浮反馈与主色激光微光的现代文件上传拖拽容器交互规约。
_Avoid_: UploadDropzone, DragArea, FilePickerBox

**Compact Slate Scrollbar (极窄冷钛滚动条)**:
基于 6px 极窄轨距、9999px 全圆角与冷钛半透悬浮过渡的全局与组件双轨规整滚动条视觉基线。
_Avoid_: CustomScrollbar, ThinScrollbar, MiniBar

**Pulse Wave Skeleton (深空脉冲波纹骨架屏)**:
在浅色与 Slate 深空暗黑基底（`#121824` 到 `#1e293b`）下消除高光刺眼感的平滑呼吸波浪骨架屏视觉规范。
_Avoid_: FlashSkeleton, DefaultSkeleton, ShimmerWhite

**Ring-Cut Avatar Group (环切重叠头像组)**:
基于 8px 负外边距与 2px 环形遮罩（`box-shadow: 0 0 0 2px var(--el-bg-color)`）物理重叠呈现立体景深的团队头像排版规约。
_Avoid_: OverlapAvatars, StackedAvatars, MergedAvatars
