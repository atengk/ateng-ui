# FormDesignerVue

面向现代 Web 应用与企业级审批流的工业级动态表单设计器、JSON Schema 渲染引擎与流程权限协同响应式扩展基础设施，纯 Vue 3 驱动，归属于四层洋葱拓扑之 L2 专用能力/领域扩展层。

## Language

### Core Components & Containers

**FormDesigner**:
表单可视化编排设计器高阶容器组件，集成物料拖拽面板、画板工作区、属性配置抽屉与操作工具栏。
_Avoid_: FormBuilder, FormEditor, FormCreator, SchemaDesigner

**FormRenderer**:
轻量级无头动态表单运行态渲染高阶容器组件，负责解析 Schema 协议、双向数据绑定、动态联动与表单校验。
_Avoid_: FormViewer, DynamicForm, FormParser, SchemaRenderer

**FormCanvas**:
设计态中央拖拽画板容器，承载控件树的嵌套放置、实时高亮、快速选中与多层级拖拽交互。
_Avoid_: DesignWorkspace, FormBoard, DragCanvas, FormStage

**FormStencil**:
设计态左侧物料拖拽面板，按基础输入、高级选择、布局容器与数据集合分类组织物料图元。
_Avoid_: WidgetPalette, MaterialPanel, DragList, ComponentList

**FormOutlineTree**:
设计态左侧图层大纲树面板，以树状层级呈现全表单父子节点，提供深层高亮定位、重命名、拖拽调序与显隐锁控。
_Avoid_: LayersPanel, ComponentTree, NodeHierarchy, DomTree

**FormPropertyPanel**:
设计态右侧属性配置面板，基于配置 Schema 动态呈现当前选中控件的属性、校验规则与动态联动设置。
_Avoid_: AttributeDrawer, ConfigPanel, SettingSidebar

**FormDesignerToolbar**:
设计态顶部操作工具栏，集成撤销重做、清空、导入导出、代码生成预览与多端视口切换。
_Avoid_: ActionHeader, TopBar, ToolStrip, ControlBar

**FormItemRenderer**:
表单项细粒度隔离渲染单元，精准依赖收集自身绑定的字段路径，杜绝大表单全量渲染性能抖动。
_Avoid_: FieldWrapper, DynamicItem, CellRenderer

**FormWizard**:
用于超长复杂单据的分步向导高阶布局容器，支持步骤流转、分段局部校验与步骤导航切换。
_Avoid_: StepperForm, StepContainer, MultiStepForm

**FormTabs**:
用于复杂单据多分组组织的多标签页高阶布局容器，支持标签页切换与 Tab 级独立分段校验。
_Avoid_: TabContainer, FormTabGroup, SheetTabs

### Schema & Data Models

**FormSchema**:
面向企业级表单的专用三段式抽象语法树（AST）协议实体，包含版本号、全局表单配置与控件树节点列表。
_Avoid_: JsonSchema, FormDefinition, FormModel, FormMetadata

**FormWidget**:
表单中独立的可渲染控件单元，包含唯一标识、控件类型、数据模型绑定键、排版几何、属性配置与动态规则。
_Avoid_: FormField, FormItem, ComponentNode, ControlElement

**PropsConfigSchema**:
控件自身属性配置面板的自描述 Schema 协议，用于驱动 `<AtengFormPropertyPanel />` 递归自举渲染配置表单。
_Avoid_: ConfigMetadata, PropertyDefinition, SettingSchema

**LayoutContainer**:
仅负责页面排版与栅格几何、不产生独立数据层级的布局容器控件（如栅格 Grid、卡片 Card、折叠面板 Collapse）。
_Avoid_: UIContainer, LayoutWrapper, DivContainer

**DataContainer**:
负责明细数据集合、在表单数据模型中产生数组分支的动态列表或子表单明细表格容器控件，支持紧凑表格与弹窗收集双模。
_Avoid_: SubForm, ArrayField, DetailTable, RepeatList

**ResponsiveViewport**:
设计态画布视口仿真规格枚举，支持 `pc`（100% 宽屏）、`pad`（768px 平板）与 `mobile`（375px 真实手机壳仿真）。
_Avoid_: ScreenMode, DeviceSize, ViewportType

### SPI & Architecture Decoupling

**FormWidgetAdapter**:
控件适配器标准接口规约（SPI），定义控件在画板与属性面板的渲染行为、默认属性及属性配置 Schema，彻底解耦底层 UI 库。
_Avoid_: ComponentWrapper, WidgetBridge, FormPlugin, ElementAdapter

**FormWidgetRegistry**:
全局或局部控件注册中心，负责维护已注册的控件类型、物料分组索引与适配器实例。
_Avoid_: ComponentPool, WidgetManager, WidgetFactory

**DataSourceConfig**:
表单动态数据源标准化配置规约，支持静态选项、全局数据字典与远程异步 API 请求，具备变量插值与下级级联清空重拉能力。
_Avoid_: OptionLoader, RemoteFetchConfig, ApiSource

### Logic & Governance

**DynamicRuleEngine**:
基于声明式条件树与零依赖轻量安全 AST 的动态联动与公式计算引擎，负责运行时动态显隐、禁用、值计算与必填切换，100% 免疫 CSP 与 XSS。
_Avoid_: RuleEvaluator, ExpressionRunner, LogicEngine, ScriptSandbox

**FieldPermissionMatrix**:
流程协同契约中审批节点对表单各字段的控制矩阵，包含 `editable`、`readonly`、`hidden` 与 `required` 四态且具备最高覆盖优先级。
_Avoid_: NodePermissions, FieldAuthMap, FlowRuleTable

**AsyncValidatorEngine**:
对齐 `async-validator` 规范并内置防抖与 `useLatest` 抗竞态防御的表单校验引擎。
_Avoid_: RuleChecker, ValidationRunner, FormValidator

**FormHistoryStack**:
基于原生 `structuredClone` 深度克隆快照与防抖合并撤销重做（Undo/Redo）历史记录栈。
_Avoid_: SnapshotManager, UndoManager, EditHistory

**DraftManager**:
基于本地存储的表单草稿箱自动暂存与崩溃恢复管理器，支持输入防抖静默落盘、二次进入主动感知提示与提交自动销毁。
_Avoid_: AutoSaveStorage, FormDraft, LocalRecovery

**CodeGenerator**:
将 `FormSchema` 一键编译输出为 Vue 3 SFC 单文件组件、标准 JSON Schema 与 Mock 数据的多目标代码生成引擎。
_Avoid_: TemplateCompiler, SFCExporter, CodeBuilder
