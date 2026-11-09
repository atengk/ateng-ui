# PrintVue

面向现代 Web 应用与企业级生产系统的专业静默打印、精准票据排版、分页防撕裂截断与高保真 PDF 矢量导出扩展基础设施，纯 Vue 3 驱动，基于多驱动 SPI 与无头状态机封装，归属于四层洋葱拓扑之 L2 专用能力/领域扩展层。

## Language

### Core Components & Containers

**AtengPrintSheet**:
物理纸张排版统领容器组件，负责定义标准物理纸张预设（A4/A5/热敏小票/连续针式多联单）、视口仿真缩放、注入 `@media print` 样式隔离并提供物理页边距管控。
_Avoid_: PrintPage, PaperContainer, SheetWrapper, PrintCanvas, PrintContainer

**AtengPrintRuler**:
物理毫米网格标尺辅助组件，用于在单据排版与预览时提供精确的横纵向毫米（`mm`）刻度线、辅助参考线与鼠标物理坐标感知。
_Avoid_: MillimeterRuler, CanvasRuler, GridRuler, RulerBar, ScaleRuler

**AtengPrintBreak**:
物理强制分页占位组件，以声明式虚拟节点形式在单据排版中显式注入物理分页断点。
_Avoid_: PageBreak, PrintDivider, NewPage, PageSplitter, BreakPage

**AtengPrintCalibrator**:
预印套打物理走纸毫米级偏差校准器组件，提供基准十字刻度测试页打印、偏差测量输入与终端本地持久化存储。
_Avoid_: OffsetCalibrator, PrintTuner, AlignDialog, CalibrationWidget

**AtengPrintSeal**:
高保真电子印章容器组件，支持纯矢量 SVG 动态印章生成与透明 PNG 贴图、任意角度倾斜旋转及表单穿透悬浮。
_Avoid_: ElectronicStamp, StampView, OfficialSeal, SignatureBadge

### Preset Business Sheets

**AtengInvoiceSheet**:
高频企业销售发货与增值税发票单据开箱即用预设容器，内置规范表头、明细表格、大写金额自动转换与签字盖章栏。
_Avoid_: InvoiceTemplate, BillingSheet, TaxReceipt, InvoiceCard

**AtengReceiptSheet**:
热敏小票单据开箱即用预设容器，针对 58mm/80mm 连续卷纸排版优化，内置锯齿虚线切纸符与收银字段网格。
_Avoid_: ThermalTicket, POSReceipt, ReceiptCard, LittleTicket

**AtengWaybillSheet**:
物流快递电子面单开箱即用预设容器，内置标准三段码、收发件人格子与条码/二维码套打插槽。
_Avoid_: ExpressSheet, LogisticsLabel, CourierWaybill, TrackingBill

**AtengLabelSheet**:
仓储货架物料条码标签开箱即用预设容器，支持多行多列网格矩阵连续排版与微型字号适配。
_Avoid_: BarcodeSheet, ShelfLabel, TagGrid, MaterialLabel

### Directives

**vPrint**:
轻量一键打印点击指令，用于将 DOM 触发源（如操作按钮）声明式绑定至目标容器及指定打印驱动。
_Avoid_: v-do-print, v-printer, v-print-trigger, v-print-btn

**vPrintNoSplit**:
分页防截断防撕裂标记指令，用于标记表格行、复合表单块或签字盖章区等不可分割的原子 DOM 节点，在打印分页与 PDF 导出切片时强制整块避开分页线。
_Avoid_: v-no-break, v-anti-slice, v-avoid-break, v-keep-together, v-no-split

### Composables & State Machines

**usePrint**:
统领无头打印状态机 Composable，提供对默认浏览器打印、PDF 导出、批量打印调度、驱动热切换及响应式执行状态的全套编程调度接口。
_Avoid_: usePrinter, usePrintEngine, usePrintDispatcher, usePrinting

**useLodop**:
C-Lodop 硬件级静默直连驱动专用状态机 Composable，负责管理本地 C-Lodop 服务的探针连接、物理打印机枚举、端口心跳感知与原生指令下发。
_Avoid_: useCLodop, useLodopDriver, useSilentPrint, useHardwarePrinter

### Drivers, Schedulers & Infrastructure

**PrintDriver**:
打印驱动抽象 SPI 接口，规范统一的多端打印介质（浏览器无头 iframe 驱动、PDF 矢量导出驱动、C-Lodop 本地直连驱动）的可用性探测、任务提交与取消契约。
_Avoid_: PrinterAdapter, PrintStrategy, PrintProvider, DriverPlugin

**PrintQueueCoordinator**:
批量打印并发队列调度器，支持多单据分片流转、受控并发数限流、执行进度响应式监听、暂停取消与失败故障隔离重试。
_Avoid_: BatchScheduler, PrintQueue, BatchPrintManager, PrintJobQueue

**PrinterManager**:
业务多物理打印机偏好持久化与路由管理器，负责物理设备列表探测、按单据业务类型绑定目标设备并持久化偏好映射。
_Avoid_: PrinterRegistry, DeviceRouter, PrinterSelector, PrintRouting

**StyleHarvester**:
宿主文档全量样式深度抓取与 `@page` 净化引擎，负责克隆当前页面中的全部样式规则并剔除浏览器自带的页眉页脚干扰。
_Avoid_: CssCloner, StyleCollector, StyleExtractor, HeadScraper

**PrintException**:
打印领域强类型统一异常实体，继承自基础设施因果异常体系，封装结构化错误码、驱动原始上下文与因果堆栈，与具体 UI 弹窗彻底解耦。
_Avoid_: PrintError, PrintingFailure, LodopError, PrintProblem
