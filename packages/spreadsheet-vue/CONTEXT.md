# SpreadsheetVue

面向现代 Web 应用与企业级系统的高性能在线电子表格、公式联动与批量填报扩展基础设施，纯 Vue 3 驱动，基于 Univer 1.4.x 封装，归属于四层洋葱拓扑之 L2 专用能力/领域扩展层。

## Language

### Core Components & Containers

**AtengSpreadsheet**:
核心全功能电子表格表现容器组件，底层基于 Univer 引擎封装，提供多 Sheet 标签页切换、公式实时计算、行列冻结、单元格合并、多种交互模式切换（`full` / `compact` / `readonly`）与插槽反转定制能力。
_Avoid_: SpreadsheetContainer, UniverSpreadsheet, ExcelSheet, SheetWrapper

**AtengSpreadsheetModal**:
轻量级脱壳电子表格模态弹窗组件，纯原生 Vue 3 Teleport 与 `--at-spreadsheet-*` CSS 变量驱动，100% 物理脱耦具体 UI 库，内置全屏/模态切换、快捷操作栏、保存/取消事件与数据自动回传。
_Avoid_: SpreadsheetDialog, ExcelDialog, SheetModal, TableDialog

### Composables & State Machines

**useSpreadsheet**:
纯无状态电子表格无头状态机 Composable，管理实例生命周期，以非响应式浅引用持有 Univer 底层实例，暴露 Facade 门面操作 API（快照与扁平数据读写、选区读取、工作表管理、只读状态切换、主题热跟随、CSV/JSON 导出及确定性销毁）。
_Avoid_: useExcel, useSpreadsheetInstance, useUniver, useSheet

### Data Models & Contracts

**SpreadsheetSnapshot**:
Univer 完整工作簿 JSON 快照契约（对应 Univer `IWorkbookData`），包含多工作表、单元格样式、公式、行列尺寸与合并单元格全量元数据。
_Avoid_: WorkbookData, SheetSnapshot, RawExcelJson

**SpreadsheetRecord**:
扁平轻量行对象记录契约（`Record<string, any>`），用于业务数据与二维报表极简批量填报。
_Avoid_: RowData, FlatRecord, SheetItem

**SpreadsheetColumn**:
扁平填报模式下的列配置契约，包含字段名（`key`）、列标题（`title`）、列宽（`width`）、必填（`required`）、下拉选项校验（`dataValidation`）与数值格式化（`numfmt`）。
_Avoid_: ColumnOption, TableColumn, HeaderConfig

**SpreadsheetMode**:
电子表格场景交互模式联合类型（`'full' | 'compact' | 'readonly'`）。
_Avoid_: ViewMode, SheetState, TableMode

**SpreadsheetLocale**:
国际化多语言标识契约（`'zh-CN' | 'en-US' | (string & {})`），默认中文优先，支持中英双轨与自定义语言扩展包。
_Avoid_: LanguageCode, SheetLang, LocaleKey

**SpreadsheetExportOptions**:
数据导出配置契约，包含导出格式（`'csv' | 'json'`）、导出工作表索引/名称、文件名及编码。
_Avoid_: ExportConfig, SaveOptions

**SpreadsheetRange**:
活动选区几何度量契约，包含起始行列坐标（`startRow`, `endRow`, `startColumn`, `endColumn`）与选区聚合信息。
_Avoid_: SelectionArea, CellRange, ActiveBox

**SpreadsheetWorkerOptions**:
公式计算引擎 Web Worker 弹性扩展配置契约，支持主线程默认与大型算力独立 Worker 脚本按需挂载。
_Avoid_: WorkerConfig, FormulaWorkerParams

### Engines, Drivers & Safety Guards

**SheetDataMapper**:
扁平行记录对象数组与 Univer 单元格二维坐标系之间的双向数据转换适配引擎，实现 `records` 与 Univer 矩阵零胶水双向映射，支持动态列推断、防抖回写与未显式展示属性保全。
_Avoid_: RecordMapper, DataTransformer, FlatToMatrix

**SpreadsheetResizeGuard**:
基于 `ResizeObserver` 的视口几何自愈守卫，初次渲染为 `0x0` 挂起并在恢复有效尺寸后自动触发 Univer Canvas 引擎 `resize()` 重绘，防止白屏。
_Avoid_: ResizeWatcher, GeometryFixer, CanvasRefresher

**ExcelExchangeSPI**:
外部 Excel 文件交换驱动器接口，解耦客户端/服务端二进制 `.xlsx` 解析与生成能力。
_Avoid_: XlsxDriver, ExcelPlugin, FileImporter
