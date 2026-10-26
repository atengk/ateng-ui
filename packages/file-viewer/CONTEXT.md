# FileViewer (专业文档与工程文件渲染扩展)

面向现代 Web 应用与企业级系统的纯前端多格式文档与工程图纸浏览器原生离线渲染基础设施，纯 Vue 3 驱动，提供三阶智能嗅探、常用预设开箱即用、超大重载动态插拔、三级离线静态资产寻址、四维 DLP 数据防泄密控制与多模态呈现范式。

## 表现容器与多模态组件

**AtengFileViewer**:
多格式文件浏览器原生渲染核心容器组件。100% 弹性撑满宿主容器，内置纯 CSS/SVG 轻量工具栏与状态反馈，支持插槽全量定制，专职处理 Word、Excel、PPT、PDF、OFD、CAD、3D 等重型文档渲染。
_Avoid_: FileViewerComponent, DocViewer, OfficePreview, FilePreviewer

**AtengFileViewerDialog**:
基于 AtengFileViewer 封装的声明式全功能全屏/弹窗预览组件。支持 `v-model` 双向受控、全屏切换、ESC 快速退出、自适应视口与移动端响应式布局。
_Avoid_: FileViewerModal, PreviewDialog, DocModal

**FileViewer.preview**:
在任意业务逻辑或表格操作列中一行代码快速唤起全屏文档预览弹窗的全局命令式方法。
_Avoid_: showFileViewer, openPreview, previewFile

## 无头控制与状态机

**useFileViewer**:
文件预览会话生命周期与底层渲染器指令控制的无头组合式 Hook。导出 `loading`、`error`、`currentType`、`page`、`sheet`、`zoom` 等响应式状态，以及 `zoomIn`、`zoomOut`、`rotate`、`print`、`download`、`destroy` 等操作指令。
_Avoid_: useDocViewer, usePreviewSession, useViewerController

## 预设与静态资源治理

**Preset**:
渲染器支持的格式插件预设集合。分为默认内置的高频 Office 预设（Office Preset，覆盖 docx、xlsx、pptx、pdf、图片）与外部按需注入的重型扩展预设（Heavy Presets，覆盖 CAD、3D、OFD、压缩包）。
_Avoid_: Plugin, Addon, FormatBundle

**AssetBaseUrl**:
用于在企业专网或私有云中离线托管 Web Worker、WASM 及 CJK 字体包的三级弹性静态资产根寻址路径。
_Avoid_: workerPath, cdnHost, publicPath

## 契约防御与安全控制

**ThreeStageSniffing (三阶智能嗅探)**:
针对无扩展名 RESTful 接口流的文件类型探测机制，按照“显式属性 ➔ 响应头 Content-Disposition/Content-Type ➔ 二进制文件魔数 (Magic Number)”三阶级联推导。
_Avoid_: autoDetect, typeGuessing, extParser

**DlpSecurityMatrix (四维数据防泄密矩阵)**:
企业数据外泄防护矩阵，由 `downloadable`、`printable`、`copyable`、`contextMenu` 四项权限及其底层物理拦截（Ctrl+S、Ctrl+P、打印 CSS 隐藏、文字防选、右键禁用）与防篡改水印组成。
_Avoid_: securityPolicy, permissionGuard, readOnlyGuard

**SizeGuard (内存防崩护栏)**:
针对百兆级超大文件的浏览器 V8 堆内存熔断警示与降级分流保护机制。
_Avoid_: fileLimit, memoryShield, sizeChecker
