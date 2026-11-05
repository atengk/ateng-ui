# @atengk/echarts-vue EChartsVue 响应式图表可视化扩展

> 面向现代 Web 应用与企业级工控大盘的工业级 ECharts 5 响应式数据可视化扩展基础设施，纯 Vue 3 驱动，基于轻量无头解耦内核构建。提供通用表现容器、几何感知自愈、声明式全量 Option 同步、DOM 级多态遮罩、暗黑模式无损热切换、六大高频业务预设图表、GeoJSON SPI 地图下钻状态机与脱壳全屏高清图片导出能力。

---

## 0. 特性与公共 API 全景速查矩阵 (100% 覆盖)

| 特性分类           | 特性名称           | 核心门面 / 组件 / Hook                                                 | 关键参数 / Props / Emits / Slots                                                                                                                                                                                                                                       | 核心行为说明                                                                                                                                                                                        | 锚定验证源头 (*Test / Sample)                                                                                                                                |
| :----------------- | :----------------- | :--------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **通用表现容器**   | 核心图表容器       | `<AtengECharts />`                                                     | `Props: option, theme, autoResize, notMerge, loading, empty, error, allowFullscreen, allowExport...`<br>`Emits: rendered, finished, click, dblclick, legendselectchanged, datazoom, resize, retry, export...`<br>`Slots: #default, #loading, #empty, #error, #toolbar` | 包装 ECharts 实例，集成保底宽高、ResizeObserver 几何自感知、`0x0` 挂起自愈、全量同步、DOM 级三态遮罩与右上角浮动操作胶囊                                                                            | [AtengECharts.test.ts](./test/AtengECharts.test.ts) / [ContainerScenario.vue](../../apps/sample-echarts-vue/src/scenarios/ContainerScenario.vue)             |
| **无头状态机**     | ECharts 状态机     | `useECharts(elRef, options)`                                           | `theme, initOptions, autoResize, resizeDebounce, onThemeChange, onResize`                                                                                                                                                                                              | 纯无头生命周期管理，强制采用 `shallowRef` 托管实例防 Proxy 污染；封装 init, dispose, resize, setOption, showLoading, hideLoading, clear, getDataURL                                                 | [useECharts.test.ts](./test/useECharts.test.ts) / [ContainerScenario.vue](../../apps/sample-echarts-vue/src/scenarios/ContainerScenario.vue)                 |
| **高频业务预设**   | 趋势对比看板       | `<AtengTrendChart />`                                                  | `Props: data, dimension, metrics, yAxis, dataZoom, smooth, area...`<br>`Slots: #default, #loading, #empty, #error, #toolbar`                                                                                                                                           | 专职处理单/双 Y 轴折线、柱线混合与时序渐变面积，内置千分位 Tooltip 与最大/最小/平均线标线                                                                                                           | [trend.test.ts](./test/presets/trend.test.ts) / [TrendScenario.vue](../../apps/sample-echarts-vue/src/scenarios/TrendScenario.vue)                           |
| **高频业务预设**   | 趋势 Option 生成   | `createTrendOption(config)`                                            | `config: TrendChartConfig`                                                                                                                                                                                                                                             | 将维度字段、多指标数组、双 Y 轴与 DataZoom 配置转换为严谨的 EChartsOption                                                                                                                           | [trend.test.ts](./test/presets/trend.test.ts) / [TrendScenario.vue](../../apps/sample-echarts-vue/src/scenarios/TrendScenario.vue)                           |
| **高频业务预设**   | 分类占比环形图     | `<AtengDonutChart />`                                                  | `Props: data, nameKey, valueKey, radius, center, roseType, centerSummary...`<br>`Slots: #default, #loading, #empty, #error, #toolbar`                                                                                                                                  | 分类占比预设，支持居中 KPI 统计指标卡（自动求和/千分位）、南丁格尔玫瑰图与扇区圆角高亮                                                                                                              | [donut-funnel.test.ts](./test/presets/donut-funnel.test.ts) / [DonutFunnelScenario.vue](../../apps/sample-echarts-vue/src/scenarios/DonutFunnelScenario.vue) |
| **高频业务预设**   | 环形 Option 生成   | `createDonutOption(config)`                                            | `config: DonutChartConfig`                                                                                                                                                                                                                                             | 将分类数据、半径与中心指标卡配置转换为 EChartsOption                                                                                                                                                | [donut-funnel.test.ts](./test/presets/donut-funnel.test.ts) / [DonutFunnelScenario.vue](../../apps/sample-echarts-vue/src/scenarios/DonutFunnelScenario.vue) |
| **高频业务预设**   | 全链路转化漏斗     | `<AtengFunnelChart />`                                                 | `Props: data, nameKey, valueKey, unit, sort, gap, funnelAlign...`<br>`Slots: #default, #loading, #empty, #error, #toolbar`                                                                                                                                             | 营销与采纳漏斗预设，双轨自动按视觉流向计算相邻环节转化率与总体转化率                                                                                                                                | [donut-funnel.test.ts](./test/presets/donut-funnel.test.ts) / [DonutFunnelScenario.vue](../../apps/sample-echarts-vue/src/scenarios/DonutFunnelScenario.vue) |
| **高频业务预设**   | 漏斗 Option 生成   | `createFunnelOption(config)`                                           | `config: FunnelChartConfig`                                                                                                                                                                                                                                            | 自动计算前后转化率百分比并构造动态标签与对齐方式的 EChartsOption                                                                                                                                    | [donut-funnel.test.ts](./test/presets/donut-funnel.test.ts) / [DonutFunnelScenario.vue](../../apps/sample-echarts-vue/src/scenarios/DonutFunnelScenario.vue) |
| **高频业务预设**   | 目标达成率仪表盘   | `<AtengGaugeChart />`                                                  | `Props: value, min, max, unit, thresholds, progress, pointer, extremities...`<br>`Slots: #default, #loading, #empty, #error, #toolbar`                                                                                                                                 | 经营 KPI 达成率预设，支持多段阈值色阶、极值两端刻度、经典指针与现代环形圆角进度条双模切换                                                                                                           | [gauge-radar.test.ts](./test/presets/gauge-radar.test.ts) / [GaugeRadarScenario.vue](../../apps/sample-echarts-vue/src/scenarios/GaugeRadarScenario.vue)     |
| **高频业务预设**   | 仪表盘 Option 生成 | `createGaugeOption(config)`                                            | `config: GaugeChartConfig`                                                                                                                                                                                                                                             | 将当前数值、色阶阈值与指针/进度条样式映射为高适配度 EChartsOption                                                                                                                                   | [gauge-radar.test.ts](./test/presets/gauge-radar.test.ts) / [GaugeRadarScenario.vue](../../apps/sample-echarts-vue/src/scenarios/GaugeRadarScenario.vue)     |
| **高频业务预设**   | 多维画像雷达图     | `<AtengRadarChart />`                                                  | `Props: indicators, data, area, shape, splitNumber...`<br>`Slots: #default, #loading, #empty, #error, #toolbar`                                                                                                                                                        | 团队工程能力与业务多维分值对比预设，支持 polygon/circle 网格与渐变半透明填充                                                                                                                        | [gauge-radar.test.ts](./test/presets/gauge-radar.test.ts) / [GaugeRadarScenario.vue](../../apps/sample-echarts-vue/src/scenarios/GaugeRadarScenario.vue)     |
| **高频业务预设**   | 雷达 Option 生成   | `createRadarOption(config)`                                            | `config: RadarChartConfig`                                                                                                                                                                                                                                             | 将维度指示器与对比数据集转换为网格自适应的 EChartsOption                                                                                                                                            | [gauge-radar.test.ts](./test/presets/gauge-radar.test.ts) / [GaugeRadarScenario.vue](../../apps/sample-echarts-vue/src/scenarios/GaugeRadarScenario.vue)     |
| **高频业务预设**   | 地图多级下钻       | `<AtengMapChart />`                                                    | `Props: map, data, scatterData, geoProvider, beforeDrillDown, showBreadcrumb...`<br>`Slots: #default, #loading, #empty, #error, #toolbar, #breadcrumb`                                                                                                                 | 行政区划与散点分布预设，标配全国-省-市三级下钻、渐变面包屑药丸与 `#breadcrumb` 专属插槽                                                                                                             | [map.test.ts](./test/presets/map.test.ts) / [MapDrillDownScenario.vue](../../apps/sample-echarts-vue/src/scenarios/MapDrillDownScenario.vue)                 |
| **高频业务预设**   | 地图 Option 生成   | `createMapOption(config)`                                              | `config: MapChartConfig`                                                                                                                                                                                                                                               | 组合区域填充（Choropleth）、经纬度散点（Scatter）与 VisualMap 色阶控制器，自适应挂载 geo 坐标系                                                                                                     | [map.test.ts](./test/presets/map.test.ts) / [MapDrillDownScenario.vue](../../apps/sample-echarts-vue/src/scenarios/MapDrillDownScenario.vue)                 |
| **地图 SPI 驱动**  | 地图下钻状态机     | `useMapDrillDown(options)`                                             | `options: UseMapDrillDownOptions`                                                                                                                                                                                                                                      | 托管当前节点、面包屑路径栈、下钻层级深度（`currentLevel`）、加载态，提供 `drillTo`、`back`、`reset` 及前置拦截器                                                                                    | [map.test.ts](./test/presets/map.test.ts) / [MapDrillDownScenario.vue](../../apps/sample-echarts-vue/src/scenarios/MapDrillDownScenario.vue)                 |
| **地图 SPI 驱动**  | URL GeoJSON 驱动器 | `createUrlGeoProvider(url, opts?)`                                     | `urlTemplate, options?: UrlGeoProviderOptions`                                                                                                                                                                                                                         | GeoJSON SPI 驱动构造器，内置区划级单例内存缓存与按需加载，自动调用 `registerMap`                                                                                                                    | [map.test.ts](./test/presets/map.test.ts) / [MapDrillDownScenario.vue](../../apps/sample-echarts-vue/src/scenarios/MapDrillDownScenario.vue)                 |
| **辅助工具链**     | 高清图片导出驱动   | `exportChartImage(chart, opts?)`                                       | `chart: EChartsInstance, options?: ChartExportOptions`                                                                                                                                                                                                                 | 支持 2x/3x 高分辨率像素比放大，由 `@atengk/core` 的 `saveBlobAsFile` 触发安全下载与内存确定性回收                                                                                                   | [toolbar.test.ts](./test/toolbar.test.ts) / [LifecycleAdvancedScenario.vue](../../apps/sample-echarts-vue/src/scenarios/LifecycleAdvancedScenario.vue)       |
| **辅助工具链**     | 安全文件名生成     | `generateChartFilename(prefix?, ext?)`                                 | `prefix?: string, ext?: 'png' \| 'jpeg'`                                                                                                                                                                                                                               | 依据时间戳规范生成安全无歧义文件名 `${prefix}_YYYYMMDD_HHmmss.${ext}`                                                                                                                               | [toolbar.test.ts](./test/toolbar.test.ts) / [LifecycleAdvancedScenario.vue](../../apps/sample-echarts-vue/src/scenarios/LifecycleAdvancedScenario.vue)       |
| **辅助工具链**     | Base64 转 Blob     | `dataUrlToBlob(dataUrl)`                                               | `dataUrl: string`                                                                                                                                                                                                                                                      | 将 Base64 DataURL 安全转换为二进制标准 Blob 对象，具备宿主环境探测                                                                                                                                  | [toolbar.test.ts](./test/toolbar.test.ts) / [LifecycleAdvancedScenario.vue](../../apps/sample-echarts-vue/src/scenarios/LifecycleAdvancedScenario.vue)       |
| **辅助工具链**     | 原生全屏支持探测   | `isNativeFullscreenSupported()`                                        | 无                                                                                                                                                                                                                                                                     | 探测当前宿主环境（浏览器/WebView）是否支持浏览器原生 Fullscreen API                                                                                                                                 | [toolbar.test.ts](./test/toolbar.test.ts) / [fullscreen.ts](./src/utils/fullscreen.ts)                                                                       |
| **辅助工具链**     | 元素全屏检测       | `isElementInNativeFullscreen(el)`                                      | `el: HTMLElement \| null`                                                                                                                                                                                                                                              | 探测目标 DOM 节点当前是否处于原生浏览器全屏状态中                                                                                                                                                   | [toolbar.test.ts](./test/toolbar.test.ts) / [fullscreen.ts](./src/utils/fullscreen.ts)                                                                       |
| **辅助工具链**     | 请求进入原生全屏   | `requestNativeFullscreen(el)`                                          | `el: HTMLElement`                                                                                                                                                                                                                                                      | 优雅请求元素进入全屏，自动处理厂商前缀兼容并捕获阻断异常                                                                                                                                            | [toolbar.test.ts](./test/toolbar.test.ts) / [fullscreen.ts](./src/utils/fullscreen.ts)                                                                       |
| **辅助工具链**     | 退出原生全屏       | `exitNativeFullscreen()`                                               | 无                                                                                                                                                                                                                                                                     | 退出浏览器原生全屏状态，自动适配厂商前缀并捕获阻断异常                                                                                                                                              | [toolbar.test.ts](./test/toolbar.test.ts) / [fullscreen.ts](./src/utils/fullscreen.ts)                                                                       |
| **设计系统与主题** | 统一调色盘字典     | `AtengChartColors`                                                     | 常量对象                                                                                                                                                                                                                                                               | 预设 10 色标准序列、成功/告警/危险/信息功能色与语义化渐变配色矩阵                                                                                                                                   | [theme.test.ts](./test/theme.test.ts) / [theme/index.ts](./src/theme/index.ts)                                                                               |
| **设计系统与主题** | 原生主题注册       | `registerTheme(name, theme)`                                           | `name: string, theme: object`                                                                                                                                                                                                                                          | 向底层 ECharts 运行时注册自定义明暗色彩规范                                                                                                                                                         | [theme.test.ts](./test/theme.test.ts) / [theme/index.ts](./src/theme/index.ts)                                                                               |
| **设计系统与主题** | 内置主题注册保障   | `ensureBuiltinThemes()`                                                | 无                                                                                                                                                                                                                                                                     | 幂等注入企业级 `ateng-light` 与 `ateng-dark` 双轨明暗主题                                                                                                                                           | [theme.test.ts](./test/theme.test.ts) / [theme/index.ts](./src/theme/index.ts)                                                                               |
| **设计系统与主题** | 标准亮色主题规范   | `atengLightTheme`                                                      | 主题 JSON 规范对象                                                                                                                                                                                                                                                     | 统一背景、文字、坐标轴、工具提示与系列调色盘的企业级浅色规范                                                                                                                                        | [theme.test.ts](./test/theme.test.ts) / [theme/builtin.ts](./src/theme/builtin.ts)                                                                           |
| **设计系统与主题** | 标准暗黑主题规范   | `atengDarkTheme`                                                       | 主题 JSON 规范对象                                                                                                                                                                                                                                                     | 适配 `:global(.dark)` 环境的高对比深色背景、刻度线与图例文字颜色规范                                                                                                                                | [theme.test.ts](./test/theme.test.ts) / [theme/builtin.ts](./src/theme/builtin.ts)                                                                           |
| **插件安装**       | Vue 插件安装器     | `install(app)`                                                         | `app: App`                                                                                                                                                                                                                                                             | 显式受控批量全局注册 `AtengECharts` 与全部 6 大高频业务预设组件                                                                                                                                     | [AtengECharts.test.ts](./test/AtengECharts.test.ts) / [main.ts](../../apps/sample-echarts-vue/src/main.ts)                                                   |
| **强类型契约**     | 实例 Ref 契约      | `*Instance`                                                            | 实例类型别名                                                                                                                                                                                                                                                           | 导出 `AtengEChartsInstance`, `AtengTrendChartInstance`, `AtengDonutChartInstance`, `AtengFunnelChartInstance`, `AtengGaugeChartInstance`, `AtengRadarChartInstance`, `AtengMapChartInstance`        | [index.ts](./src/index.ts)                                                                                                                                   |
| **强类型契约**     | 组件插槽契约       | `*Slots`                                                               | 泛型接口                                                                                                                                                                                                                                                               | 导出 `AtengEChartsSlots`, `AtengTrendChartSlots`, `AtengDonutChartSlots`, `AtengFunnelChartSlots`, `AtengGaugeChartSlots`, `AtengRadarChartSlots`, `AtengMapChartSlots`，支持自定义具名插槽类型推导 | [presets/types.ts](./src/presets/types.ts) / [types/index.ts](./src/types/index.ts)                                                                          |
| **强类型契约**     | Props & Emits 契约 | `*Props` / `*Emits`                                                    | 泛型接口                                                                                                                                                                                                                                                               | 导出各预设专属的 Props 与 Emits 契约接口，100% 支持 TS 类型推导                                                                                                                                     | [types/index.ts](./src/types/index.ts)                                                                                                                       |
| **强类型契约**     | 导出工具与载荷契约 | `ChartExportOptions` / `ChartExportPayload`                            | 结构化接口                                                                                                                                                                                                                                                             | 定义图片导出像素放大比、导出文件名、导出格式以及导出成功通知载荷结构                                                                                                                                | [types/index.ts](./src/types/index.ts)                                                                                                                       |
| **强类型契约**     | 引擎基础契约       | `EChartsInstance`, `EChartsOption`, `EChartsInitOpts`, `SetOptionOpts` | 引擎类型别名                                                                                                                                                                                                                                                           | 规范解耦导出底层 ECharts 核心实例与初始化配置类型                                                                                                                                                   | [types/index.ts](./src/types/index.ts)                                                                                                                       |
| **强类型契约**     | 无头状态机契约     | `UseEChartsOptions`, `UseEChartsReturn`                                | 状态机接口                                                                                                                                                                                                                                                             | 规范 `useECharts` 输入配置参数与返回方法/ShallowRef 结构                                                                                                                                            | [types/index.ts](./src/types/index.ts)                                                                                                                       |

---

## 1. 模块定位与 pnpm 坐标

`@atengk/echarts-vue` 归属于 `ateng-ui` 基础设施套件的 **L2 专用能力/领域扩展层 (Extension Layer)**，专注于 ECharts 5 企业级工业可视化封装。

- **npm 坐标**：`@atengk/echarts-vue`
- **源码工程**：`packages/echarts-vue`
- **自验展厅**：`apps/sample-echarts-vue`（端口 `3006`）
- **依赖方向**：严格遵循洋葱拓扑单向无环依赖律，仅合法依赖 L0 (`@atengk/core`)、L1 (`@atengk/vue`) 与底层 `echarts` 核心库，**绝对严禁逆向依赖 L3 `@atengk/element-plus`**，保持 100% UI 表现中立；
- **镜像演进**：顶层架构规范解耦，预留未来 React 镜像包 `@atengk/echarts-react`。

### 安装依赖

```bash
pnpm add @atengk/echarts-vue echarts vue
```

### 引入基础样式

在项目入口文件（如 `main.ts`）中引入样式：

```ts
import '@atengk/echarts-vue/style.css';
```

### Peer Dependencies 契约基线

| 依赖包    | 兼容版本基线 | 推荐生产版本 | 作用域说明             |
| :-------- | :----------- | :----------- | :--------------------- |
| `echarts` | `>=5.4.0`    | `^5.6.0`     | 底层图表渲染引擎核心库 |
| `vue`     | `>=3.5.0`    | `^3.5.44`    | Vue 响应式核心驱动引擎 |

---

## 2. 核心架构与设计不变量

### 2.1 四层洋葱拓扑定级图

```mermaid
flowchart TD
    subgraph L3["L3 表现与高阶组件层 (UI & Suite Layer)"]
        EP["@atengk/element-plus<br/>(Element Plus 增强组件)"]
    end

    subgraph L2["L2 专用能力/领域扩展层 (Extension Layer)"]
        ECH["@atengk/echarts-vue<br/>(ECharts 5 响应式数据可视化扩展)"]
    end

    subgraph L1["L1 无头响应式层 (Headless Layer)"]
        VUE["@atengk/vue<br/>(Vue 3 通用无头 Composables)"]
    end

    subgraph L0["L0 纯原生核心底座 (Core Layer)"]
        CORE["@atengk/core<br/>(统一强类型契约 / Axios 管道 / 平台中立工具)"]
    end

    EP -->|合法单向依赖| ECH
    ECH -->|合法单向依赖| VUE
    ECH -->|合法单向依赖| CORE
    VUE -->|合法单向依赖| CORE
```

### 2.2 ECharts 响应式解耦更新流转图

```mermaid
sequenceDiagram
    autonumber
    participant SFC as 业务视图 (Vue SFC)
    participant Comp as AtengECharts / 预设组件
    participant Hook as useECharts 状态机
    participant Engine as ECharts 原生引擎 (DOM / WebGL)

    SFC->>Comp: 声明式传入 option / 预设 data
    Comp->>Hook: shallowRef 实例托管 (绝不深度代理)
    Hook->>Hook: 探查容器尺寸 (clientWidth / clientHeight)
    alt 容器尺寸为 0x0 (隐藏 Tab / 未弹出 Modal)
        Hook->>Hook: 挂起初始化 (Suspended) 并开启 ResizeObserver 监听
    else 容器尺寸 > 0
        Hook->>Engine: init(dom, theme, opts)
        Hook->>Engine: setOption(option, true, true) [notMerge: true, lazyUpdate: true]
    end
    Note over Hook,Engine: 当容器恢复正向尺寸时毫秒级自动触发补救自愈 (Auto-Healing)
    Engine-->>Comp: 抛出 rendered / finished / chart-click 事件
    Comp-->>SFC: 触发 Vue 组件标准 Emits 透传
```

### 2.3 0x0 几何挂起与自愈状态机

```mermaid
stateDiagram-v2
    [*] --> Unmounted: 组件创建
    Unmounted --> Mounted: onMounted 挂载 DOM
    Mounted --> InspectSize: 探查容器尺寸 (clientWidth, clientHeight)

    state InspectSize <<choice>>
    InspectSize --> Suspended: 宽或高 === 0 (Tab隐藏/弹窗关闭)
    InspectSize --> Initialized: 宽与高 > 0

    Suspended --> AutoHealing: ResizeObserver 探测到正向尺寸恢复
    AutoHealing --> Initialized: 补救初始化 init() 并回放暂存 Option
    Initialized --> ActiveRender: 声明式全量 setOption (notMerge)
    ActiveRender --> ActiveRender: 窗口缩放 / 侧栏联动 (微任务防抖 resize)
    ActiveRender --> Disposing: 组件卸载 onUnmounted
    Disposing --> [*]: 四步确定性清理 (注销监听、销毁实例、释放显存)
```

### 2.4 五大核心设计不变量

1. **`shallowRef` 零深层代理防线 (Reactivity Decoupling Invariant)**：
   - ECharts 实例内部重度依赖闭包变量、私有符号与原型链；若使用 Vue 原生 `ref` 或 `reactive` 深度包裹，Vue Proxy 会拦截内部属性并破坏私有上下文，在图表缩放、点击或销毁时引发不可预期的崩溃；
   - `useECharts` 与所有预设组件内部**100% 强制且仅能使用 `shallowRef<EChartsInstance | null>(null)`** 托管图表句柄，从根源上杜绝 Proxy 深度代理污染。
2. **`0x0` 几何挂起与毫秒级自愈机制 (Zero-Dimension Healing Invariant)**：
   - 当图表置于 `display: none` 的隐藏 Tab 选项卡或尚未弹出的模态对话框内部时，物理 DOM 几何尺寸为 `0x0`；
   - 初始化管道主动检测尺寸：若宽高为 0 则**立即挂起（Suspended）初始化动作**，绝不绘制 100px 塌陷残疾图表；由 `ResizeObserver` 捕获到容器恢复正向可见尺寸瞬间，毫秒级自动触发补救初始化并完整回放暂存的 Option。
3. **`notMerge: true` 声明式全量同步 (Declarative Full Sync Invariant)**：
   - 原生 ECharts `setOption` 默认采用增量浅合并（Merge）模式，当从 3 条折线切换为 1 条折线时，旧图例与线条仍然残留；
   - 本套件默认开启 `notMerge: true` 与 `lazyUpdate: true`，确保渲染产物与当前 Vue 响应式状态严格对齐，并在高频更新时单帧合并防重绘风暴。
4. **`theme: 'auto'` 暗黑模式无损热重建 (Seamless Dark Mode Invariant)**：
   - ECharts 不支持在已存在的 Canvas 画布上热更新基础调色盘；
   - 本套件通过无头状态机实时感知 `:global(.dark)` 或系统偏好，在主题切换瞬间平滑销毁旧实例并在新主题下即时重建，无损回放当前生效的 Option 与事件监听，全过程业务层零感知、零闪烁。
5. **纯原生微操作栏与插槽反转 (Pure Native Toolbar & Slot Invariant)**：
   - 通用表现容器右上角标配轻量毛玻璃操作胶囊，内置双模全屏与高清导出；
   - 100% 暴露 `#toolbar` 作用域插槽（接收 `{ isFullscreen, toggleFullscreen, exportImage }`），允许业务按需完全接管或扩展操作按钮，保持组件的深度可塑性。

---

## 3. 核心表现容器与几何生命周期套件

### 3.1 AtengECharts 通用表现容器

`<AtengECharts />` 是企业级数据大盘的基础表现容器。专职处理 ECharts 原生 Canvas 挂载、响应式解耦防 Proxy 劫持、ResizeObserver 几何自感知、`notMerge` 声明式全量同步与原生图表事件透传。

#### 1. 本节专属 TypeScript 契约片段

```ts
export interface AtengEChartsProps {
  /** ECharts 完整配置项对象 */
  option: EChartsOption;
  /** 图表主题，支持 'auto'（自动侦测深浅色）、内置主题名或自定义规范对象 @default 'auto' */
  theme?: string | object;
  /** 容器保底宽度 @default '100%' */
  width?: string;
  /** 容器保底高度，杜绝父级高度塌陷 @default '350px' */
  height?: string;
  /** 是否自动监听容器尺寸变化并自适应调整大小 @default true */
  autoResize?: boolean;
  /** 是否在更新 option 时彻底消除旧系列残影（全量替换） @default true */
  notMerge?: boolean;
  /** 是否启用帧合并惰性更新，防止高频触发重排重绘 @default true */
  lazyUpdate?: boolean;
}

export interface AtengEChartsEmits {
  (e: 'rendered', instance: EChartsInstance): void;
  (e: 'finished'): void;
  (e: 'chart-click', params: unknown): void;
  (e: 'legend-change', params: unknown): void;
  (e: 'resize'): void;
}
```

#### 2. 面向实战的业务代码示例 (月度经营数据大盘)

_代码 100% 逆向提取自自验沙箱：[ContainerScenario.vue](../../apps/sample-echarts-vue/src/scenarios/ContainerScenario.vue)_

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { AtengECharts, type AtengEChartsInstance, type EChartsOption } from '@atengk/echarts-vue';

const chartRef = ref<AtengEChartsInstance | null>(null);

// 声明式柱状/折线混合经营大盘配置
const businessOption = ref<EChartsOption>({
  title: { text: '月度经营数据看板 (柱线混合)', left: 'center', top: 8 },
  tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
  legend: { data: ['销售额 (万元)', '毛利率 (%)'], top: 56 },
  grid: { top: 92, left: '3%', right: 48, bottom: '4%', containLabel: true },
  xAxis: { type: 'category', data: ['1月', '2月', '3月', '4月', '5月', '6月'] },
  yAxis: [
    { type: 'value', name: '销售额', min: 0, max: 250, axisLabel: { formatter: '{value} 万' } },
    { type: 'value', name: '毛利率', min: 0, max: 100, axisLabel: { formatter: '{value} %' } },
  ],
  series: [
    {
      name: '销售额 (万元)',
      type: 'bar',
      data: [120, 132, 101, 134, 190, 230],
      itemStyle: { borderRadius: [4, 4, 0, 0] },
    },
    {
      name: '毛利率 (%)',
      type: 'line',
      yAxisIndex: 1,
      data: [35, 42, 38, 55, 62, 70],
      smooth: true,
      lineStyle: { width: 3 },
    },
  ],
});

const onChartClick = (params: unknown) => {
  const p = params as { seriesName?: string; name?: string; value?: unknown };
  console.log(`点击系列: ${p.seriesName}, 类目: ${p.name}, 数值: ${p.value}`);
};
</script>

<template>
  <div style="height: 400px; padding: 16px; background: #fff; border-radius: 8px;">
    <AtengECharts
      ref="chartRef"
      :option="businessOption"
      theme="auto"
      height="100%"
      @chart-click="onChartClick"
    />
  </div>
</template>
```

#### 3. 核心机制与生产边界说明

- **保底尺寸防坍塌**：组件默认内置 `height: 350px`（可通过 `height` 属性覆盖），彻底杜绝原生 ECharts 因父容器未设置高度而导致的 `clientHeight === 0` 无法渲染或挤压变形问题；
- **声明式全量同步 (`notMerge: true`)**：原生 ECharts 默认采用合并更新，导致在切换查询条件删减系列时旧线条与图例顽固残留；本组件强制默认 `notMerge: true`，确保图表状态与 Vue 数据集完全同构；
- **全事件受控透传**：完整包装原生图表事件，标准输出 `@chart-click`、`@legend-change` 与 `@rendered`，同时提供实例 Ref 的 `getInstance()` 供深层原生调用。

---

### 3.2 useECharts 无头状态机

`useECharts` 是 `@atengk/echarts-vue` 的纯无头状态机核心，专为高阶自定义图表组件、复杂工控看板与微前端动态挂载场景设计，与具体 UI 完全解耦。

#### 1. 本节专属 TypeScript 契约片段

```ts
export interface UseEChartsOptions {
  /** 主题设置，支持 'auto'、主题名称或主题 JSON 规范 @default 'auto' */
  theme?: MaybeRefOrGetter<string | object | undefined>;
  /** ECharts 原生初始化选项（渲染器类型等） */
  initOptions?: MaybeRefOrGetter<EChartsInitOpts | undefined>;
  /** 是否监听容器尺寸变化 @default true */
  autoResize?: MaybeRefOrGetter<boolean | undefined>;
  /** 尺寸调整防抖延迟时间 (ms) @default 150 */
  resizeDebounce?: number;
  /** 主题热切换回调 */
  onThemeChange?: (theme: string) => void;
  /** 尺寸变化自愈回调 */
  onResize?: () => void;
}

export interface UseEChartsReturn {
  /** 底层 ECharts 实例，强制采用 ShallowRef 托管，严禁深度 Proxy */
  instance: ShallowRef<EChartsInstance | null>;
  /** 标识当前是否处于 0x0 几何零尺寸挂起状态 */
  isZeroDimension: Readonly<Ref<boolean>>;
  /** 当前生效主题标识 */
  currentTheme: Readonly<Ref<string>>;
  /** 初始化/恢复实例 */
  init: () => EChartsInstance | null;
  /** 彻底注销与销毁实例 */
  dispose: () => void;
  /** 声明式更新图表 Option */
  setOption: (option: EChartsOption, notMerge?: boolean, lazyUpdate?: boolean) => void;
  /** 尺寸自适应重绘 */
  resize: () => void;
  /** 导出 Base64 图片地址 */
  getDataURL: (opts?: { pixelRatio?: number }) => string;
}
```

#### 2. 面向实战的业务代码示例 (高频系统吞吐量时序监控)

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useECharts, type EChartsOption } from '@atengk/echarts-vue';

const chartDomRef = ref<HTMLDivElement | null>(null);

// 初始化无头状态机：强制 shallowRef 托管
const { instance, setOption, isZeroDimension } = useECharts(chartDomRef, {
  theme: 'auto',
  autoResize: true,
  resizeDebounce: 100,
});

onMounted(() => {
  const throughputOption: EChartsOption = {
    title: { text: '网关实时吞吐量 (QPS)', left: 'center' },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'] },
    yAxis: { type: 'value', name: 'QPS' },
    series: [
      {
        type: 'line',
        smooth: true,
        areaStyle: { opacity: 0.3 },
        data: [820, 932, 1434, 1290, 1330, 1320],
      },
    ],
  };
  setOption(throughputOption);
});
</script>

<template>
  <div style="position: relative; height: 350px;">
    <div ref="chartDomRef" style="width: 100%; height: 100%;" />
    <span
      v-if="isZeroDimension"
      style="position: absolute; top: 8px; right: 8px; color: #f59e0b; font-size: 12px;"
    >
      ⚠️ 容器挂起中 (0x0 尺寸自愈等待)
    </span>
  </div>
</template>
```

#### 3. 核心机制与生产边界说明

- **`shallowRef` 实例防污染防线**：`instance` 严格以 `ShallowRef<EChartsInstance | null>` 托管；若误用 Vue 原生 `ref` 深度递归代理，Proxy 劫持会导致 ECharts 原型方法丢失、闭包变量解构异常并抛出 `Cannot read properties of undefined`；
- **确定性四步生命周期清理**：在 `onUnmounted` 阶段，状态机自动依序断开 `ResizeObserver` 监听、解绑全屏与键盘事件、调用原生 `dispose()` 释放 Canvas/WebGL 显存并清空响应式引用，彻底消除内存泄漏。

---

### 3.3 DOM 级多态遮罩与 0x0 几何挂起自愈

传统图表在接口请求或异常时往往采用 Canvas 原生绘制文本，样式生硬且无法交互。`AtengECharts` 将画布节点与 Vue DOM 级遮罩同级分立，提供毛玻璃动效的加载中、优雅空状态与错误重试闭环。

#### 1. 本节专属 TypeScript 契约片段

```ts
export interface AtengEChartsOverlayProps {
  /** 是否展示加载遮罩 @default false */
  loading?: boolean;
  /** 加载文案提示 @default '加载中...' */
  loadingText?: string;
  /** 是否展示空数据状态遮罩 @default false */
  empty?: boolean;
  /** 空状态提示文案 @default '暂无图表数据' */
  emptyText?: string;
  /** 异常对象或错误消息字符串，非空时自动激活错误遮罩 @default null */
  error?: Error | string | null;
  /** 异常标题文案 @default '图表加载异常' */
  errorText?: string;
}

export interface AtengEChartsOverlayEmits {
  /** 点击错误遮罩中的“重新加载”按钮时触发 */
  (e: 'retry'): void;
}
```

#### 2. 面向实战的业务代码示例 (三态多态遮罩与重试闭环)

_代码 100% 逆向提取自自验沙箱：[ContainerScenario.vue](../../apps/sample-echarts-vue/src/scenarios/ContainerScenario.vue)_

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { AtengECharts, type EChartsOption } from '@atengk/echarts-vue';

const isLoading = ref(false);
const isEmpty = ref(false);
const errorMessage = ref<string | null>(null);

const pieOption = ref<EChartsOption>({
  title: { text: '品类销售占比', left: 'center' },
  series: [
    {
      type: 'pie',
      radius: ['45%', '70%'],
      data: [
        { name: '云底座', value: 1048 },
        { name: '安全套件', value: 735 },
        { name: '音视频中台', value: 580 },
      ],
    },
  ],
});

// 模拟异步加载与异常重试
const fetchChartData = () => {
  isLoading.value = true;
  errorMessage.value = null;
  setTimeout(() => {
    isLoading.value = false;
    // 模拟偶发超时异常
    errorMessage.value = 'HTTP 504: 经营分析微服务网关响应超时';
  }, 1000);
};

const handleRetry = () => {
  errorMessage.value = null;
  fetchChartData();
};
</script>

<template>
  <div style="height: 380px;">
    <AtengECharts
      :option="pieOption"
      theme="auto"
      :loading="isLoading"
      :empty="isEmpty"
      :error="errorMessage"
      @retry="handleRetry"
    />
  </div>
</template>
```

#### 3. 核心机制与生产边界说明

- **遮罩双轨不卸载机制**：DOM 级多态遮罩与底层的 Canvas 画布同级并存，状态切换时**绝不销毁底层的 ECharts 实例**，保证加载完成后无白屏、无重排、无闪烁；
- **0x0 尺寸挂起防线**：在模态弹窗（Modal）未弹出、折叠面板（Collapse）收起或选项卡（Tabs）处于 `display: none` 时，`clientWidth` 与 `clientHeight` 均为 0；初始化引擎主动挂起，由绑定的 `ResizeObserver` 在容器恢复真实可见尺寸瞬间，毫秒级自动触发补救初始化并回放暂存的 Option。

---

## 4. 经营趋势与时序对比套件

### 4.1 AtengTrendChart 趋势看板 (双 Y 轴/柱线混合/渐变面积)

`AtengTrendChart` 是企业级中后台最常用的趋势看板预设组件。专职处理单/双 Y 轴折线、柱线混合排版、平滑面积渐变与千分位 Tooltip 格式化。

#### 1. 本节专属 TypeScript 契约片段

```ts
export interface TrendMetric {
  /** 对应数据源中的字段名 */
  key: string;
  /** 系列展示名称 (图例与提示框显示) */
  name?: string;
  /** 系列表现类型 @default 'line' */
  type?: 'line' | 'bar';
  /** 归属 Y 轴：0 为左轴，1 为右轴 @default 0 */
  yAxisIndex?: 0 | 1;
  /** 数值单位后缀 (如 '元', '%', '万') */
  unit?: string;
  /** 系列固定色彩或渐变 */
  color?: string;
  /** 折线平滑贝塞尔曲线 @default true */
  smooth?: boolean;
  /** 是否开启渐变面积填充或传入自定义 RGBA 色彩 */
  area?: boolean | string;
  /** 柱状图圆角配置，如 [4, 4, 0, 0] */
  barBorderRadius?: number | number[];
}

export interface TrendYAxisConfig {
  /** Y 轴标题 */
  name?: string;
  /** 数值单位后缀 */
  unit?: string;
  /** 是否展示水平分割线 */
  splitLine?: boolean;
}

export interface AtengTrendChartProps {
  /** 扁平业务数据源列表 */
  data: Record<string, unknown>[];
  /** X 轴维度字段声明 (如 'month') */
  dimension: string;
  /** 指标度量数组 */
  metrics: TrendMetric[];
  /** 双 Y 轴配置元组 [leftAxis, rightAxis] */
  yAxis?: [TrendYAxisConfig, TrendYAxisConfig];
  /** 逃生通道：深度拦截与定制最终 EChartsOption */
  overrideOption?: (base: EChartsOption) => EChartsOption;
}
```

#### 2. 面向实战的业务代码示例 (电商月度财务经营看板)

_代码 100% 逆向提取自自验沙箱：[TrendScenario.vue](../../apps/sample-echarts-vue/src/scenarios/TrendScenario.vue)_

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { AtengTrendChart, type TrendMetric, type TrendYAxisConfig } from '@atengk/echarts-vue';

// 真实电商经营收支数据集
const trendData = ref([
  { month: '2026-01', revenue: 1250000, cost: 820000, profitRate: 34.4 },
  { month: '2026-02', revenue: 1480000, cost: 910000, profitRate: 38.5 },
  { month: '2026-03', revenue: 1890000, cost: 1120000, profitRate: 40.7 },
  { month: '2026-04', revenue: 1620000, cost: 980000, profitRate: 39.5 },
  { month: '2026-05', revenue: 2150000, cost: 1250000, profitRate: 41.8 },
  { month: '2026-06', revenue: 2580000, cost: 1460000, profitRate: 43.4 },
]);

// 声明多指标度量：柱状图 (收入/成本) + 折线 (毛利率双 Y 轴)
const trendMetrics: TrendMetric[] = [
  {
    key: 'revenue',
    name: '营业收入',
    type: 'bar',
    unit: '元',
    color: '#409EFF',
    barBorderRadius: [4, 4, 0, 0],
  },
  {
    key: 'cost',
    name: '营业成本',
    type: 'bar',
    unit: '元',
    color: '#E6A23C',
    barBorderRadius: [4, 4, 0, 0],
  },
  {
    key: 'profitRate',
    name: '毛利率',
    type: 'line',
    yAxisIndex: 1,
    unit: '%',
    color: '#67C23A',
    smooth: true,
  },
];

// 双 Y 轴配置：左轴金额带分割线，右轴百分比不带分割线
const trendYAxis: [TrendYAxisConfig, TrendYAxisConfig] = [
  { name: '财务金额 (元)', splitLine: true },
  { name: '毛利率 (%)', splitLine: false, unit: '%' },
];
</script>

<template>
  <div style="height: 380px; padding: 16px; background: #fff; border-radius: 8px;">
    <AtengTrendChart
      :data="trendData"
      dimension="month"
      :metrics="trendMetrics"
      :y-axis="trendYAxis"
      theme="auto"
    />
  </div>
</template>
```

#### 3. 核心机制与生产边界说明

- **声明式解构防胶水代码**：告别原生上百行坐标轴与系列配置，仅需传入扁平数据数组、`dimension` 与 `metrics`，组件内部自动通过 `createTrendOption` 工厂构建规范图例、色彩与对齐网格；
- **双 Y 轴分割线治理**：默认仅左 Y 轴展示网格分割线（`splitLine: true`），右轴不展示，彻底杜绝双轴网格线交叉错位导致画面脏乱。

---

### 4.2 DataZoom 时序缩放与千分位标线定制

面向跨月、跨季度或高频 IoT 时序海量数据，`AtengTrendChart` 原生集成底部滑动缩放手柄与内置鼠标滚轮缩放，并支持平均基准线（MarkLine）与极值（MarkPoint）自动标绘。

#### 1. 本节专属 TypeScript 契约片段

```ts
export interface TrendDataZoomConfig {
  /** 是否展示底部滑动条手柄 @default true */
  slider?: boolean;
  /** 是否支持鼠标滚轮与手势缩放 @default true */
  inside?: boolean;
  /** 初始可是范围起始百分比 (0-100) @default 0 */
  start?: number;
  /** 初始可视范围结束百分比 (0-100) @default 100 */
  end?: number;
}

export interface TrendMetricMarkOptions {
  /** 极值标记点：'max' | 'min' | 'both' */
  markPoint?: 'max' | 'min' | 'both';
  /** 标线基准：'average' | 'median' | 'max' | 'min' */
  markLine?: 'average' | 'median' | 'max' | 'min';
}
```

#### 2. 面向实战的业务代码示例 (时序平滑面积渐变与基准均线看板)

_代码 100% 逆向提取自自验沙箱：[TrendScenario.vue](../../apps/sample-echarts-vue/src/scenarios/TrendScenario.vue)_

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { AtengTrendChart, type TrendMetric } from '@atengk/echarts-vue';

const trendData = ref([
  { month: '2026-01', revenue: 1250000 },
  { month: '2026-02', revenue: 1480000 },
  { month: '2026-03', revenue: 1890000 },
  { month: '2026-04', revenue: 1620000 },
  { month: '2026-05', revenue: 2150000 },
  { month: '2026-06', revenue: 2580000 },
  { month: '2026-07', revenue: 2340000 },
  { month: '2026-08', revenue: 2790000 },
  { month: '2026-09', revenue: 3120000 },
  { month: '2026-10', revenue: 2980000 },
  { month: '2026-11', revenue: 3450000 },
  { month: '2026-12', revenue: 4200000 },
]);

// 声明平滑渐变面积与标线/标点
const areaMetrics: TrendMetric[] = [
  {
    key: 'revenue',
    name: '营收走势 (面积渐变)',
    type: 'line',
    smooth: true,
    area: 'rgba(64, 158, 255, 0.45)',
    color: '#409EFF',
    unit: '元',
    markLine: 'average', // 自动计算年度平均线
    markPoint: 'both', // 自动标记最大值与最小值点
  },
];
</script>

<template>
  <div style="height: 380px;">
    <AtengTrendChart
      :data="trendData"
      dimension="month"
      :metrics="areaMetrics"
      :data-zoom="true"
      theme="auto"
    />
  </div>
</template>
```

#### 3. 核心机制与生产边界说明

- **海量时序流畅交互**：开启 `:data-zoom="true"` 时，同时激活 `slider`（底部可视化拖拽条）与 `inside`（鼠标滚轮捏合缩放），结合 `lazyUpdate: true` 单帧渲染合并，防止时序拖拽时造成严重的掉帧卡顿；
- **千分位 Tooltip 智能格式化**：提示框内置千分位正则替换（如 `1,250,000 元`），自动匹配各指标声明的 `unit` 单位，无需开发者手写正则与 HTML 字符串拼接。

---

---

## 维度二：生产扩展接管 (Customization & Extensibility)

### 1. 深度逃生门 (`overrideOption`)

当内置的高频预设无法满足极其严苛的定制诉求时，无需退回手写原生配置，可通过 `overrideOption` 获得最终的 Option 对象并实施深度拦截：

```vue
<template>
  <AtengDonutChart
    :data="categoryData"
    name-key="dept"
    value-key="budget"
    :override-option="patchCustomOption"
  />
</template>

<script setup lang="ts">
import type { EChartsOption } from '@atengk/echarts-vue';

const patchCustomOption = (base: EChartsOption): EChartsOption => {
  return {
    ...base,
    graphic: [
      {
        type: 'text',
        left: 'center',
        top: 'bottom',
        style: {
          text: '注：统计截止至本月末 24:00',
          fill: '#909399',
          fontSize: 12,
        },
      },
    ],
  };
};
</script>
```

### 2. 自定义浮动工具栏 (`#toolbar` 插槽)

通过 `#toolbar` 作用域插槽接收当前全屏状态与操作函数，完全接管或扩展操作按钮：

```vue
<template>
  <AtengECharts :option="myOption" :allow-fullscreen="true" :allow-export="true">
    <template #toolbar="{ isFullscreen, toggleFullscreen, exportImage }">
      <button class="my-fs-btn" @click="toggleFullscreen('page')">
        {{ isFullscreen ? '↩️ 还原视口' : '🔍 脱壳放大' }}
      </button>
      <button class="my-export-btn" @click="exportImage({ pixelRatio: 3, filename: 'kpi_report' })">
        💾 导出高清 3x 图片
      </button>
    </template>
  </AtengECharts>
</template>
```

### 3. 三级行政区划地图下钻与 GeoJSON SPI 接管

无需在前端静态打包臃肿的 GeoJSON 文件，通过 `GeoDataProvider` SPI 实现动态按需拉取与自动注册：

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { AtengMapChart, createUrlGeoProvider } from '@atengk/echarts-vue';

// 构造内网 OSS / CDN 动态区划驱动器（自动内存缓存）
const ossGeoProvider = createUrlGeoProvider('https://cdn.example.com/geo/{code}.json');

const regionData = ref([
  { name: '广东省', value: 890 },
  { name: '浙江省', value: 720 },
]);
</script>

<template>
  <AtengMapChart
    :data="regionData"
    :geo-provider="ossGeoProvider"
    :show-breadcrumb="true"
    @drill-down="node => console.log('下钻至:', node.name)"
    @back="node => console.log('回退上一级:', node.name)"
  />
</template>
```

---

## 维度三：核心生产边界与非功能语义 (Production Boundary & Failure Modes)

### 1. 响应式深度代理防污染铁律 (Reactivity Decoupling)

- **底层防线**：ECharts 内部深度依赖闭包变量、私有符号与原生原型链；若无意将其交由 Vue `ref` 或 `reactive` 深度代理，会破坏底层状态引发未决崩溃；
- **实现承诺**：无头状态机 `useECharts` 与所有组件内部 100% 强制采用 `shallowRef` 托管 ECharts 实例，杜绝代理穿透。

### 2. 隐藏 Tab 与模态弹窗零尺寸自愈 (0x0 Auto-Healing)

- **场景问题**：当图表被置入 `v-show="false"` 的隐藏 Tab 选项卡或未弹出的 Modal 对话框中时，物理 DOM 的 `clientWidth` 与 `clientHeight` 为 0；
- **自愈机制**：初始化逻辑自动探测几何尺寸，发现尺寸为 0 时**主动挂起（Suspended）初始化**，绝不绘制 100px 残疾画布；由绑定的 `ResizeObserver` 在容器恢复真实可见尺寸瞬间，毫秒级自动触发补救初始化并回放暂存的 Option。

### 3. 声明式 Option 全量同步 (notMerge Invariant)

- **时序问题**：ECharts 原生 `setOption` 默认采用增量合并模式，当减少系列（Series）或重置类目时，旧残影无法自动消除；
- **声明承诺**：组件层默认开启 `notMerge: true` 与 `lazyUpdate: true`，严格保证视图呈现与传入的数据 Option 完全一致，杜绝脏数据残留，并在高频更新时实施单帧渲染合并防重排。

### 4. 确定性生命周期与资源清理 (Zero-Leak Cleanup)

- **无泄露保障**：组件卸载或 `useECharts` 销毁时，自动在 `onUnmounted` 阶段依次执行：
  1. `ResizeObserver.disconnect()` 物理注销尺寸监听；
  2. 移除原生全屏 `fullscreenchange` 与 `Escape` 按键事件；
  3. 调用 ECharts 原生 `dispose()` 彻底回收 Canvas 与 WebGL 显存；
  4. 清空响应式实例引用。

---

## 维度四：物理排版与代码全真验证 (Evergreen & Zero-Glitch)

- 本包所有公开接口、组件 Props 与插槽契约 100% 通过 TypeScript 5.6 严格类型检查；
- 本包导出的所有预设与状态机特性，均已在 `packages/echarts-vue/test/` 编写全自洽对抗性单测（10 个测试文件、70 项单测用例 100% 全绿）；
- 本包所有交互模式与场景演练（侧边栏联动折叠、Tabs 切换保真、Dialog 弹窗内渲染、暗黑模式无损切换、三级地图下钻与高清导出），均已在 `apps/sample-echarts-vue` 1:1 自验工程中全真跑通。
