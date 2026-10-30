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
