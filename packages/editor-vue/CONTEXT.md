# EditorVue

企业级 TipTap / ProseMirror 现代富文本与内容创作响应式扩展基础设施，纯 Vue 3 驱动，归属于四层洋葱拓扑之 L2 专用能力/领域扩展层。

## Language

**EditorContainer**:
面向单体内容创作、排版、微工具栏与全屏脱壳的高阶表现容器（`<AtengEditor />`）。
_Avoid_: RichText, TextArea, InputBox, DocumentEditor

**EditorState**:
受管的 ProseMirror 文档树、光标选区、只读状态与撤销重做历史快照。
_Avoid_: ContentState, DocSnapshot, EditorData

**UploadHandler**:
媒体资产上传拦截器 SPI，负责拦截粘贴或拖拽的 File 实体并异步置换为可持久化的安全 URL。
_Avoid_: FileUploader, ImageService, UploadHelper

**BubbleMenu**:
划词选区或节点激活时动态跟随定位的快捷样式排版与链接浮层。
_Avoid_: FloatingBar, SelectionPopup, InlineToolbar

**TableBubbleMenu**:
光标置于表格内部时激活的行列增删、单元格合并与表格操控上下文浮层。
_Avoid_: TableToolbar, GridMenu, TableContextMenu

**SlashCommand**:
键入 `/` 唤起的纯中文块级物料（标题、表格、代码块、待办列表）快捷插入面板。
_Avoid_: QuickAction, CommandPalette, InsertMenu

**CharacterCounter**:
过滤 HTML 标签的纯文本字数统计引擎，负责硬限制拦截与状态栏警示。
_Avoid_: WordCount, TextLength, CharLimit

**GeometricSelfHealing**:
当容器挂载于隐藏弹窗或未激活标签页（0x0 像素）时，通过 ResizeObserver 挂起并自愈排版的健壮性机制。
_Avoid_: AutoResize, ForceLayout, DelayedRender

**TeleportFullscreen**:
通过将表现容器提升至 `document.body` 顶层以突破局部弹窗层级与 CSS Transform 裁剪的真全屏机制。
_Avoid_: WindowMaximize, AbsoluteFullscreen, BodyFix

**EditorPreset**:
针对特定业务场景分化的高阶开箱即用编辑器形态包装（包含 Simple、Notion-like、DOCX、Agent 四大预设）。
_Avoid_: EditorTheme, EditorTemplate, EditorVariant

**DragHandle**:
块级节点（段落、标题、列表、表格）左侧悬浮的六点拖拽手柄，用于块级上下重排与唤起块级上下文菜单。
_Avoid_: MoveHandle, BlockGrip, RowHandle, DragBar

**AiStreamHandler**:
解耦具体大模型提供商的纯前端流式通信协议 SPI，向编辑器状态机供给增量文本流与 Diff 比对数据。
_Avoid_: AiService, LlmClient, ChatApi, ModelCaller

**PageCanvas**:
模拟真实物理 A4 纸张、页边距（Margins）、页眉页脚（Header/Footer）及动态断页几何排版的文档视图容器。
_Avoid_: PrintView, DocView, SheetContainer, PaperBox

**CalloutBlock**:
具备 4 种语义形态（提示、警告、错误、信息）与图标选择的块级重点强调卡片。
_Avoid_: AlertCard, NoticeBox, HighlightCard, InfoPanel

**ToggleList**:
支持下属子内容或嵌套列表收起与展开的交互式块级折叠节点。
_Avoid_: AccordionItem, CollapsibleList, FoldableBlock

**AiDiffCard**:
AI 流式生成完毕后原位呈现原文与变更内容的行内对比审阅卡片，承载采纳、追加与废弃决策。
_Avoid_: AiReviewModal, DiffViewer, ChangeConfirm

**DocxPageLayout**:
纳管 A4 物理纸张尺寸、纵横向方向、页边距、页眉页脚与动态页码的几何排版模型。
_Avoid_: PageConfig, PrintLayout, PaperSetting
