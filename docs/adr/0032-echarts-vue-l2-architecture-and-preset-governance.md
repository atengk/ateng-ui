# 0032. EChartsVue L2 专用扩展层架构、响应式状态解耦与预设看板治理策略

## 状态

Accepted (已接受)

## 背景与决策上下文

在企业级中后台系统、数据看板、工业物联网（IoT）与运营大盘研发中，数据可视化呈现具有极高频且复杂的业务诉求：

1. **图表开发胶水代码沉重**：开发者直接面对底层原生 ECharts API 时，需要反复编写繁重的配置代码（直角坐标系网格配置、Tooltip 提示框格式化、千分位正则替换、图例适配、双 Y 轴刻度对齐、南丁格尔玫瑰图内外半径计算、漏斗转化率累乘计算等）；
2. **Vue 响应式深度代理破坏 ECharts 内部状态**：若开发者无意识地使用 Vue 原生 `ref` 或 `reactive` 深度包裹 ECharts 实例，Vue 的 Proxy 代理会拦截 ECharts 内部私有属性并破坏其原型链方法，导致图表在缩放、重绘或点击时抛出隐蔽的 `Cannot read properties of undefined` 异常；
3. **尺寸塌陷与零尺寸白屏崩溃**：当图表被嵌入在 Tab 切换项（`display: none`）、折叠面板、抽屉（Drawer）或模态弹窗（Dialog）内部时，容器初始尺寸为 `0x0`；若立即初始化图表，ECharts 会崩溃报错或绘制为宽度 100px 的塌陷残疾图表，切回时无法自愈；
4. **增量合并导致的配置残留脏数据**：ECharts 原生 `setOption` 默认采用 `merge` 浅合并模式；当业务从包含 3 个 series 的数据切换为包含 1 个 series 时，旧图例与折线仍然常驻画面，造成严重的数据时序混乱；
5. **暗黑模式与主题无损热切换困难**：系统在亮暗主题切换时，原生 ECharts 必须先彻底销毁实例（`dispose`）并在新主题下重新 `init`；开发者往往缺乏平滑防闪烁过渡与事件重新绑定的治理；
6. **地图下钻与辅助工具链重复建设**：全国-省-市三级地图下钻需要庞大的 GeoJSON 数据按需加载、内存缓存、面包屑路径栈回退；大屏卡片查看需要视口脱壳全屏与高清（2x/3x DPI）图片导出，业务线各自封装胶水代码质量参差不齐。

为终结业务痛点，确立企业级响应式可视化扩展套件的工业级基线，制定本架构决策。

## 架构决策

基于“**L2 领域扩展解耦、实例响应式解耦防污染、零尺寸挂起自愈、声明式全量同步、六大业务高频预设、GeoJSON SPI 驱动、脱壳全屏双模与高清导出**”原则，确立以下架构决策：

### 1. 四层洋葱拓扑定级与独立包坐标 (@atengk/echarts-vue)

- **分层归属**：正式归入 **L2 专用能力/领域扩展层 (Extension Layer)**；
- **npm 坐标与物理目录**：
  - 命名为 `@atengk/echarts-vue`，源码位于 `packages/echarts-vue`，配套 1:1 独立自验工程 `apps/sample-echarts-vue`；
  - 架构上规范解耦，预留未来 React 镜像包 `@atengk/echarts-react`（`packages/echarts-react`）；
- **单向拓扑与 UI 中立铁律**：
  - 仅依赖 L0 (`@atengk/core`)、L1 (`@atengk/vue`) 与第三方核心 `echarts`（peer 依赖声明 `>=5.4.0`，开发基准锁定 `^5.6.0`）；
  - **绝对严禁逆向或跨层依赖 L3 `@atengk/element-plus`**，工具栏与多态遮罩 100% 采用原生 DOM / SVG / Scoped CSS 实现，保持对任意 Vue 3 宿主环境的通用性；
  - 纳入根目录 `CONTEXT-MAP.md` 拓扑登记与 Changesets 独立发版流转体系。

### 2. ECharts 实例响应式解耦与防污染不变量 (Reactivity Decoupling Invariant)

- **强制 shallowRef 托管**：
  - 无头状态机 `useECharts` 与表现容器组件 `<AtengECharts />` 内部，所有 ECharts 实例必须且只能通过 `shallowRef<EChartsInstance | null>(null)` 进行引用；
  - **严禁使用 `ref` 或 `reactive` 深度包裹 ECharts 实例**，彻底杜绝 Vue Proxy 破坏 ECharts 原型链与内部闭包私有变量。

### 3. ResizeObserver 几何自感知与零尺寸挂起自愈机制

- **双重保底与零尺寸挂起防线**：
  - 容器默认具备保底宽高（默认 `width: 100%; height: 350px;`），彻底杜绝容器坍塌；
  - 初始化时主动探查容器几何尺寸：若处于 `clientWidth === 0` 或 `clientHeight === 0`（如 `display: none` 的隐藏 Tab 或未弹出的 Modal），**立即挂起 `init` 动作，绝不盲目初始化**；
  - 监听容器挂载的 `ResizeObserver`，当容器恢复正向尺寸时毫秒级自动触发补救初始化（Auto-Healing）并回放暂存的 `setOption` 配置；
  - 窗口尺寸缩放与侧边栏折叠联动时，内置微任务防抖自适应调用 `chart.resize()`。

### 4. 声明式 Option 全量同步与 DOM 级多态遮罩

- **默认 notMerge 全量同步**：
  - `setOption(newOption, true)` 默认开启 `notMerge: true`，对齐 Vue 声明式直觉，彻底消灭 series 残留造成的脏数据；
  - 默认开启惰性合并更新 `lazyUpdate: true`，高频响应式变更时合并单帧渲染，防止重绘风暴。
- **DOM 级多态遮罩 (Loading / Empty / Error)**：
  - 告别原生 Canvas 粗糙绘制的文本指示器，提供现代 DOM 级 Loading（毛玻璃微动效）、Empty（优雅矢量插画）与 Error（异常文案解析与重试闭环）三态遮罩；
  - 画布节点与 Vue 遮罩节点同级分立，遮罩层显示时绝不卸载底层 Canvas 实例，状态切换平滑无闪烁。

### 5. 暗黑模式 SSOT 联动与调色盘体系

- **双轨原生主题**：内置企业级 `atengLightTheme` 与 `atengDarkTheme`，对齐 Element Plus 设计规范，提供 10 色标准调色盘（`AtengChartColors`）；
- **无损热切换**：
  - `theme: 'auto'` 自动监测 `document.documentElement` 的 `.dark` 样式类与系统色彩偏好；
  - 主题切换时，无头状态机安全销毁旧实例并以新主题即时重建，无缝回放当前生效的 Option 与事件监听，全过程业务视图零感知。

### 6. 六大高频业务预设图表与无头工厂

1. **AtengTrendChart**：经营趋势对比看板，解构维度 `dimension` 与指标集 `metrics`，支持双 Y 轴、柱线混合、平滑渐变面积与千分位 Tooltip；
2. **AtengDonutChart**：分类占比环形图，内嵌绝对居中的 KPI 汇总统计卡（自动求和），支持南丁格尔玫瑰图切换；
3. **AtengFunnelChart**：电商流转与采纳转化漏斗，双轨自动计算前后环节转化率与总体转化率；
4. **AtengGaugeChart**：极值 KPI 达成率仪表盘，支持多段阈值色阶、经典指针与现代环形圆角进度条双模切换；
5. **AtengRadarChart**：多维画像雷达图，支持 polygon/circle 网格与多数据集半透明渐变填充；
6. **AtengMapChart**：三级行政区划与热力散点地图，内置 GeoJSON SPI 驱动器（`createUrlGeoProvider`）与路径栈面包屑下钻状态机（`useMapDrillDown`）。

### 7. 辅助工具链：全屏脱壳与高清图片导出

- **双模全屏脱壳 (`allow-fullscreen`)**：
  - 支持 `fullscreenMode?: 'auto' | 'native' | 'page'`；优先浏览器原生全屏，异常或阻断时优雅降级为页面级脱壳全屏（CSS Fixed 视口无黑边填充），自适应重绘尺寸；
- **高清导出 (`allow-export`)**：
  - 支持 2x/3x 高分辨率像素比放大，结合 `@atengk/core` 的 `saveBlobAsFile` 触发安全下载与内存回收，自动规范化时间戳安全文件名；
- **浮动操作胶囊与插槽**：
  - 容器右上角内置轻量毛玻璃工具胶囊，悬浮渐显；提供 `#toolbar` 供业务完全接管定制。

## 实施后果与评估

- **正面收益 (Positive)**：
  - 业务开发提效 80%：原本需要上百行复杂配置的趋势、占比、漏斗、仪表与地图，现在通过预设组件 10 行声明式属性即可交付；
  - 彻底规避 Proxy 深度劫持导致的 ECharts 致命崩溃；
  - 彻底解决隐藏 Tab 与模态弹窗打开时的尺寸塌陷顽疾；
  - 保持纯净 L2 分层定位，零 UI 库依赖，零体积浪费。
- **中性影响 (Neutral)**：
  - 预设组件采用高内聚 Option 工厂函数封装，若遇到极其小众的定制诉求，可通过 `overrideOption: (base) => base` 逃生通道实施深度拦截与覆盖。
- **合规与风险防范 (Negative Guard)**：
  - 地图 GeoJSON 数据严禁在包内静态硬编码绑定（防止行政区划变动与包体积失控），强制通过 `GeoDataProvider` SPI 动态注入加载。
