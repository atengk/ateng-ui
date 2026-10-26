# 0030. FileViewer L2 专用能力扩展包架构与弹性预设治理策略

## 状态

Accepted (已接受)

## 背景与决策上下文

在现有的基础设施矩阵中，`@atengk/element-plus` 提供了 `AtengFilePreview` 多格式预览门户组件。该组件坚持轻量化与零第三方重依赖原则，采用纯 HTML5 原生能力（`<img>`、`<video>`、`<audio>`、浏览器原生 `<embed>` PDF、`AtengCodeView` 代码文本高亮与未知格式降级下载），在普通管理后台满足了轻量开箱即用的诉求。

然而，随着现代 Web 应用和企业级复杂业务的深入演进，文档预览面临着更深层次的专业需求：

1. **重型专业文档格式的浏览器原生渲染诉求**：
   - 企业级场景对于 Office 系列（Word `.docx`、Excel `.xlsx`、PPT `.pptx`）、电子发票（OFD）、工程图纸（CAD `.dwg`/`.dxf`）、3D 模型（`.stl`/`.obj`/`.gltf`）以及压缩包（`.zip`/`.tar`）的浏览器端原生脱壳直读需求日益迫切；
   - 依赖服务端转码渲染（如 LibreOffice 或第三方转码集群）存在链路长、运维成本高、私密文档外发风险以及高并发网络瓶颈。
2. **轻量套件零臃肿底线与重型引擎体积失控的矛盾**：
   - 上游优秀开源生态 `flyfish-dev/file-viewer` 提供了纯前端 275+ 格式渲染生态，但若不加节制地直接打包进基础 UI 库，不仅会导致 `@atengk/element-plus` 的打包体积暴增数十兆，还会引入大量 Web Worker 与 WASM 资源，严重破坏基础库的轻量化与秒级冷启动体验；
   - 缺乏合理的依赖隔离与按需分包机制。
3. **企业级非功能性基础设施契约的整合缺位**：
   - 外部开源组件无法感知企业系统的安全鉴权机制（如 `AuthManager` 的双轨 Token 注入、微服务网关多路由前缀）；
   - 二进制流预览报错时容易引发崩溃：若后端接口鉴权失败或文件不存在，往往以 `Content-Type: application/json` 返回报错载荷；直接将 JSON 报错文本投喂给二进制解析器会导致底层渲染引擎异常白屏崩溃，违背了系统级 [ADR-0004](./0004-blob-error-dual-state-and-fesod-excel-protocol.md) 的双态防御规范；
   - 缺乏与企业安全水印容器（防篡改、工号/姓名/时间戳）以及高频切页场景下的请求中断与 Worker 内存确定性清理。

为彻底解决专业文档浏览器原生预览需求与基础 UI 库零臃肿原则的冲突，确立本系统级架构决策。

## 架构决策

基于“**L2 领域高内聚解耦、轻量与专业双轨并存、高频预设开箱即用、小众重载按需插拔、三级降级资产寻址、全维韧性契约集成**”原则，确立以下系统级架构决策：

### 1. 四层洋葱拓扑定级与独立包坐标 (@atengk/file-viewer)

- **分层归属**：正式归入 **L2 专用能力/领域扩展层 (Extension Layer)**；
- **npm 坐标与物理目录**：
  - 命名为 `@atengk/file-viewer`，物理源码目录位于 `packages/file-viewer`；
- **单向拓扑与中立防线铁律**：
  - `@atengk/file-viewer` 仅依赖 L0 (`@atengk/core`)、L1 (`@atengk/vue`) 以及上游引擎 `@file-viewer/*`；
  - **严禁逆向物理依赖 L3 `@atengk/element-plus`**，保持纯 Vue 3 宿主通用性，确保未来可无缝被不同的表现层套件或移动端架构复用；
  - 严格纳入根目录 `CONTEXT-MAP.md` 拓扑登记与 Changesets 独立发版体系。

### 2. “轻量内置 + 专业扩展”双轨分工与协同契约

- **存量 L3 `AtengFilePreview` 定位保持不变**：
  - 继续保持 0 重型依赖，专注于 HTML5 原生图片、原生 PDF、音视频与代码高亮；
  - 预留引擎扩展插槽与钩子，当上层业务同时安装并注入 `@atengk/file-viewer` 时，可通过配置无缝接管复杂文档格式；
- **新建 L2 `AtengFileViewer` 聚焦专业文档全功能渲染**：
  - 提供专业级渲染容器 `<AtengFileViewer />`，专职处理 Word、Excel、PPT、PDF、OFD、CAD、3D 等高复杂度渲染。

### 3. 按需分层预设与体积治理机制 (Presets Strategy)

- **核心依赖基线**：
  - 依赖 `@file-viewer/vue3` 核心渲染包装器；
  - 默认内置集成高频使用的 `@file-viewer/preset-office`（覆盖 Word、Excel、PPT、PDF 以及基础格式），实现企业 90%+ 办公报表与文档预览的零配置开箱即用；
- **重载小众预设外部化插拔**：
  - 对于 CAD、3D 模型、OFD 及压缩包等超大体量预设，严禁作为 direct dependencies 默认捆绑打包；
  - 提供静态配置门面 `registerPreset(preset)` 及组件属性 `:preset="customPreset"`，由具体业务按需显式安装并在运行时动态注入，杜绝普通项目被打入冗余巨额产物。

### 4. 离线私有化与三级弹性资产寻址机制 (Asset Distribution)

文档引擎解析复杂格式所需的 Web Worker、WASM 及 CJK 字体资源，实施三级弹性寻址策略：

1. **一级优先：内网私有化基地址**：
   - 暴露全局配置门面 `configureFileViewer({ assetBaseUrl: string })`，支持政企或专网环境配置自建内网 MinIO / OSS / Nginx 静态文件路径；
2. **二级兜底：公共 CDN 回落**：
   - 未显式配置内网路径时，公网环境默认回落至官方或主流开源 CDN（如 unpkg / jsDelivr），保证开发调试与轻量场景零配置运行；
3. **本地资产一键同步辅助**：
   - 在工程文档与脚本中提供静态资产拷贝指导，方便构建流程将 WASM / Worker 自动化注入到宿主应用的 `/public/` 静态目录下。

### 5. 全维企业级基础设施契约集成 (Enterprise Resilience)

1. **安全鉴权与 Token 双轨注入**：
   - 原生对接 `@atengk/core` 的 `AuthManager`；在传入私有文件下载/预览 URL 时，内部自动完成 Token 解析并标准化注入双轨请求头（`token` 与 `Authorization: Bearer`）；
2. **Blob-JSON 双态异常识别与防崩溃防御 (ADR-0004)**：
   - 预览文件流接口时实施异常探测：若响应状态码非 2xx 或响应数据格式为 `application/json`（如 `{"code": 403, "msg": "无权限查看"}`），组件自动拦截该异常，转译为友好的错误提示卡片并派发 `onError` 事件，**坚决杜绝将 JSON 文本丢进二进制解析器导致渲染器白屏崩溃**；
3. **确定性生命周期与抗竞态内存清理**：
   - 组件销毁或在快速切换 `url`/`file` 时，自动利用 `AbortController` 取消前序未决网络请求，注销已分配的 `URL.revokeObjectURL`，并彻底终止正在计算的 Worker 任务，杜绝内存泄漏与时序倒挂。

### 6. 企业级全景深水区特性强化 (Enterprise Full-Scenario Invariants)

1. **无后缀 RESTful 流式 URL 与三阶智能嗅探 (MIME / Magic Number Sniffing)**：
   - 针对无后缀的接口流（如 `/api/files/stream?id=123`），建立三阶判定管道：
     - **一阶**：优先使用调用方显式声明的 `fileType` 或 `fileName`；
     - **二阶**：从响应头中解析 `Content-Disposition` 文件名或 `Content-Type` 的 MIME 类型映射；
     - **三阶（终极保底）**：读取文件头二进制魔数（Magic Number，如 `%PDF`、`PK\x03\x04`、`\xd0\xcf\x11\xe0` 等），精准自动匹配正确渲染器，杜绝无后缀接口报错；
2. **大文件细粒度进度指示与内存防崩护栏 (Progressive Loading & Size Guard)**：
   - 挂接底层流式下载进度，向外与界面暴露具象指标（`loaded`, `total`, `percent`, `speed`），提供平滑物理进度条；
   - 标配 `maxSize` 阈值防御（默认 100MB），超出时弹出人性化确认面板（提供【继续在浏览器渲染】与【直接下载本地查看】双通道），坚决守卫宿主浏览器 V8 堆内存安全；
3. **四维企业数据防泄密控制矩阵 (DLP Security Controls)**：
   - 提供 `downloadable`、`printable`、`copyable`、`contextMenu` 细粒度权限控制；
   - 实施行为级硬拦截：禁用 `Ctrl+S`、注入 CSS `@media print { display: none !important; }` 与拦截 `Ctrl+P`、注入 `user-select: none` 并拦截复制事件、禁用右键菜单；
   - 原生集成防篡改安全水印（工号/姓名/时间戳/防篡改监听）；
4. **结构化异常诊断与人性化降级恢复体系 (Error Taxonomy & Recovery)**：
   - 异常细分诊断：`ENCRYPTED`（受密码保护，弹出密码交互框原地解密）、`LEGACY_BINARY`（早期二进制 .doc/.xls 引导转换）、`NETWORK_CORS`（跨域或网络超时）、`CORRUPTED`（损坏文件）、`BUSINESS_ERROR`（后端 JSON 错误）；
   - 面板提供【刷新重试】与【受控下载原文件】双向逃生通道；
5. **多页定位、多 Sheet 切换与阅读状态记忆恢复 (View State Synergy)**：
   - 支持受控双向绑定 `v-model:page="currentPage"` 与 `v-model:sheet="activeSheet"`；
   - 默认开启 `preserveViewState: true`，在 Tab 切换或短暂重绘时通过弱引用自动复原滚动位置、缩放比与旋转角度；
   - 原生提供文档目录/大纲抽屉导航。

### 7. “三位一体”多模态调用范式与表现层解耦

- **基石内联容器 `<AtengFileViewer />`**：
  - 100% 弹性撑满父容器，自带纯 CSS/SVG 轻量工具栏与状态反馈，完整开放 `#toolbar`、`#loading`、`#error`、`#watermark` 插槽；
- **声明式弹窗组件 `<AtengFileViewerDialog />`**：
  - 支持 `v-model="visible"`，内置全屏切换、ESC 快捷退出、视口自适应等开箱弹窗体验；
- **命令式函数调用门面 `FileViewer.preview(options)`**：
  - 允许一行代码挂载呼出全屏预览弹窗，彻底免除在业务表格中手写弹窗模板与状态管理；
- **无头 Hook 门面 `useFileViewer(options)`**：
  - 导出纯响应式状态与底层控制指令集。

### 8. 1:1 独立镜像工程规范 (Sample First)

- 搭建 `apps/sample-file-viewer` 独立自验沙箱工程；
- 全景覆盖 Word、Excel、PPT、PDF、接口流、大文件进度、403 双态拦截、密码解密、DLP 防泄密与命令式弹窗交互；纳入 Turborepo 统一质量流水线。

## 影响与推演后果

### 积极收益 (Positive Consequences)

- **四层拓扑边界清晰**：专业文档引擎归入 L2 扩展层，保障了核心包与 L3 UI 套件的纯净度与轻量性，彻底消除体积污染风险；
- **极致的开箱即用与按需扩展平衡**：常用 Office 文档零门槛即开即用，专业格式按需可插拔；
- **企业级高韧性保障**：彻底治理了内网离线 WASM 托管、Token 鉴权流、Blob 异常防崩溃与内存泄漏隐患；
- **多框架演进就绪**：L2 包不强绑定 Element Plus，未来若扩展 React UI 套件，可无缝共享该扩展能力。

### 权衡与成本 (Trade-offs & Mitigations)

- **静态资源托管心智**：在纯内网离线环境中，需要使用者将 WASM/Worker 静态资源置于内网或应用的 `public/` 目录。通过提供清晰文档与一键配置门面 `configureFileViewer({ assetBaseUrl })` 降低接入成本。
