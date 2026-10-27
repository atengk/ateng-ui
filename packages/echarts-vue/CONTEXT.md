# EChartsVue (企业级响应式数据可视化扩展 - Vue 3 版)

面向现代 Web 应用与企业级工控大盘的工业级 ECharts 5 响应式数据可视化扩展基础设施，纯 Vue 3 驱动，基于轻量无头解耦内核构建。提供通用表现容器、几何感知自愈、声明式全量 Option 同步、DOM 级多态遮罩、暗黑模式无损热切换、六大高频业务预设图表、GeoJSON SPI 地图下钻状态机与脱壳全屏高清图片导出能力。

- **npm 坐标**：`@atengk/echarts-vue`
- **源码工程**：`packages/echarts-vue`
- **自验展厅**：`apps/sample-echarts-vue`
- **分层拓扑**：L2 专用能力/领域扩展层（仅合法依赖 L0 `@atengk/core`、L1 `@atengk/vue` 与 `echarts`，绝对严禁逆向依赖 L3 `@atengk/element-plus`）
- **对称架构**：预留未来 React 镜像包 `@atengk/echarts-react`

---

## 表现容器与协同组件

**AtengECharts**:
通用 ECharts 表现容器组件。内置保底高度与 BEM 独立样式隔离，集成 ResizeObserver 尺寸变化自感知自愈与零尺寸挂起机制；支持声明式 Option 全量同步（`notMerge` 彻底消除旧 series 残留），提供 Loading/Empty/Error 三态 DOM 级遮罩、暗黑模式无损热切换与通用事件透传；右上角标配轻量浮动操作胶囊并提供 `#toolbar` 深度定制插槽。
_Avoid_: EChartsContainer, VChart, AtengChartBox, EchartsView

**AtengTrendChart**:
趋势图看板预设组件。专职处理单/双 Y 轴折线、柱线混合、平滑面积渐变与海量数据缩放（DataZoom）交互，支持语义化声明维度（`dimension`）与指标集合（`metrics`），自动计算多指标千分位格式化 Tooltip 与最大/最小/平均线标线。
_Avoid_: AtengLineChart, TrendLine, CurveChart, MetricTrend

**AtengDonutChart**:
业务占比环形图预设组件。专职处理分类占比与层级分布，支持内嵌绝对居中的 KPI 汇总统计指标卡（自动求和与千分位格式化）、南丁格尔玫瑰图模式切换与扇区圆角高亮。
_Avoid_: AtengPieChart, RingChart, CircleRatio, DonutCard

**AtengFunnelChart**:
转化漏斗图预设组件。专职处理营销转化、用户流转与链路漏斗分析，内置相邻环节递进转化率与首环节总体转化率双轨自动计算，支持倒梯形、正三角形动态排序与扇区分割。
_Avoid_: AtengConversionChart, FunnelPipeline, FilterChart

**AtengGaugeChart**:
经营 KPI 目标达成率仪表盘预设组件。专职处理极值对比与履约率呈现，支持多段阈值色阶渐变、经典高精度机械指针与现代环形圆角进度条双模无缝切换，搭载千分位与动态单位后缀。
_Avoid_: AtengMeter, KPIPlate, Speedometer, GaugeView

**AtengRadarChart**:
多维业务画像与工程能力雷达图预设组件。专职处理团队多维分值对比与能力平衡分析，支持 polygon 多边形与 circle 蛛网网格切换、多数据集半透明渐变面积填充与极值约束。
_Avoid_: AtengSpiderChart, RadarMatrix, DimensionSpider

**AtengMapChart**:
行政区划与散点分布地图下钻预设组件。集成区域填充（Choropleth）与经纬度散点（Scatter），标配全国 ➔ 省 ➔ 市多级受控下钻状态机，内置防重路径栈与渐变面包屑药丸导航，暴露 `#breadcrumb` 自定义槽位。
_Avoid_: AtengGeoChart, DrillMap, GeoViewer, AreaMap

---

## 无头状态机与核心 Hooks

**useECharts**:
ECharts 实例生命周期无头编排状态机。强制采用 `shallowRef` 托管 ECharts 实例防止深度响应式代理劫持；封装原生 `init`、`dispose`、`setOption`、`resize`、`showLoading`、`hideLoading`、`clear`、`dispatchAction`、`getDataURL`；内置 ResizeObserver 几何自感知与 `0x0` 零尺寸挂起自愈防线；对接暗黑模式热切换管道，确保组件销毁时确定性清理监听器与释放 WebGL/Canvas 资源。
_Avoid_: useChartSession, useEchartInstance, useChartDriver

**useMapDrillDown**:
地图多级下钻状态机。托管当前区划节点 `currentNode`、面包屑下钻历史路径栈 `breadcrumbs`、加载态 `isDrilling` 与可回退计算属性 `canBack`；提供 `drillTo`、`back`、`reset` 语义方法与 `beforeDrillDown` 前置拦截钩子，具备路径截断防重与优雅容错。
_Avoid_: useDrillStack, useGeoNav, useMapHistory

---

## 预设 Option 生成器与 SPI 驱动

**createTrendOption**:
面向趋势图的声明式 Option 生成工厂函数。将高层语义化配置（维度字段、多指标数组、双 Y 轴配置、DataZoom 缩放手柄）转换为严谨且符合工业级排版的 EChartsOption。
_Avoid_: buildLineOption, makeTrendConfig

**createDonutOption**:
面向环形图的声明式 Option 生成工厂函数。将分类名、数值数组与中心统计指标配置转换为符合设计系统色彩规范的 EChartsOption。
_Avoid_: buildPieOption, makeDonutConfig

**createFunnelOption**:
面向漏斗图的声明式 Option 生成工厂函数。自动计算并拼接各阶段前后转化率，生成带动态标签与排序间隔的 EChartsOption。
_Avoid_: buildFunnelOption, makeFunnelConfig

**createGaugeOption**:
面向仪表盘的声明式 Option 生成工厂函数。将当前数值、最大/最小值、阈值色阶与指针/进度条模式转换为高适配性的 EChartsOption。
_Avoid_: buildGaugeOption, makeMeterConfig

**createRadarOption**:
面向雷达图的声明式 Option 生成工厂函数。将维度指示器（Indicator）与多对比数据集转换为网格自适应的 EChartsOption。
_Avoid_: buildRadarOption, makeRadarConfig

**createMapOption**:
面向行政区划与热力散点的声明式 Option 生成工厂函数。将地图注册标识、区域指标数据、散点经纬度与 VisualMap 色阶映射转换为 EChartsOption。
_Avoid_: buildMapOption, makeGeoOption

**GeoDataProvider**:
GeoJSON 异步按需提供者 SPI 函数契约接口 `(mapCode: string, mapName: string) => Promise<unknown>`。
_Avoid_: MapLoader, GeoFetcher, GeoService

**createUrlGeoProvider**:
基于 URL 模板的 GeoJSON 异步 SPI 驱动器。支持 `{code}` 占位符解析，内置区划级单例内存缓存与并发去重，仅在未注册时发起网络请求并自动调用 `echarts.registerMap`。
_Avoid_: makeUrlGeoLoader, DefaultGeoProvider

---

## 主题设计与辅助工具链

**AtengChartColors**:
对齐企业级设计系统与 Element Plus 品牌色系的高级图表调色盘矩阵。提供 10 色标准序列色系、功能色（成功/告警/危险/信息）与语义化渐变预设。
_Avoid_: DefaultColors, ChartPalettes, ColorSet

**atengLightTheme / atengDarkTheme**:
工业级原生明亮与暗黑主题规范对象。预先定义文本对比度、坐标轴分割线、网格背景、Tooltip 毛玻璃质感与 Legend 样式，通过 `registerTheme` 注入 ECharts 运行时。
_Avoid_: LightThemeConfig, DarkThemeConfig

**exportChartImage**:
图表高清图片报表导出驱动函数。支持 2x/3x 高分辨率像素比放大与深浅背景色适配，将 Canvas 画面转化为二进制 Blob 并由 `@atengk/core` 的 `saveBlobAsFile` 触发安全下载与内存确定性回收。
_Avoid_: downloadChart, saveChartImage, chartToPng

**generateChartFilename**:
依据时间戳与命名规约生成安全无歧义文件名的工具函数。默认格式为 `${prefix}_YYYYMMDD_HHmmss.${ext}`。
_Avoid_: getFilename, createChartName

**toggleFullscreen / isElementInNativeFullscreen**:
全屏与脱壳操作工具。封装浏览器原生 Fullscreen API 与 CSS 视口脱壳全屏双模自适应，提供异常静默降级防御。
_Avoid_: switchFullscreen, runFullscreen
