# MapVue

面向现代 Web 应用与企业级空间地理信息系统的工业级多源地图、坐标拾取、空间电子围栏与轨迹回放扩展基础设施，纯 Vue 3 驱动，基于 Leaflet 1.9.x 默认离线免密引擎与多源商业驱动 SPI（高德地图 2.0 / 百度地图）解耦架构封装，归属于四层洋葱拓扑之 L2 专用能力/领域扩展层。

## Language

### Core Components & Containers

**AtengMap**:
核心基础地图表现容器组件，作为所有地理图层与控件的统一载体。底层支持通过 `MapDriverAdapter` SPI 接入不同渲染引擎（默认免密内置 Leaflet 1.9.x，支持动态高德/百度驱动插拔），内置 `MapResizeGuard` 视口几何自愈、暗黑模式瓦片无损反色滤镜以及插槽反转微工具栏支持。
_Avoid_: MapContainer, LeafletMap, AmapWrapper, MapViewer, GisContainer

**AtengMapPicker**:
通用地理坐标与地址拾取器组件，提供地图中心十字靶标或可拖拽标记、POI 关键词联想检索、经纬度与逆地理编码（Reverse Geocoding）地址结构化展示、坐标系防漂移转换以及一键复制/确定回填能力。
_Avoid_: CoordinatePicker, LocationSelector, PoiPicker, MapAddressPicker

**AtengMapFence**:
空间电子围栏交互与越界判定容器组件，支持圆形（中心点+半径）、多边形（顶点列表）、矩形（对角包围盒）的可视化绘制与顶点拖拽微调，内置面积与半径实时标尺，以及实时点位越界感知与进出告警计算。
_Avoid_: GeoFence, ElectronicFence, AreaFence, MapFenceContainer

**AtengMapTrack**:
历史轨迹流转与车辆/巡检动态回放组件，支持输入带时间戳/速度的有序轨迹点序列，提供播放/暂停、倍速切换（0.5x~8x）、进度拖拽、大圆切线方位角（Bearing）自动平滑旋转移动图标、已走/未走路径分色渲染以及停靠点驻留标记展示。
_Avoid_: TrackPlayback, TrajectoryPlayer, RouteReplay, CarTracker

**AtengMapCluster**:
海量点标记高性能网格聚合图层组件，支持在数千至数万个点位场景下自动执行四叉树/网格聚合，根据缩放等级聚合为计数徽标气泡，支持点击聚合点扩散拆解（Spiderfy）与 Canvas 纯画布高性能渲染模式。
_Avoid_: MarkerClusterer, PointCluster, MassPoints, ClusterLayer

**AtengMapMask**:
行政区划反向遮罩与下钻轮廓组件，基于行政边界 GeoJSON 数据自动计算反向掩膜多边形（Inverted Polygon Mask），将目标行政区域之外的世界范围以半透明遮罩遮蔽，突出目标管辖区域，支持多级行政区划下钻联动。
_Avoid_: BoundaryMask, GeoMask, DistrictPolygon, AdminBoundary

**AtengMapToolbar**:
轻量半透明悬浮地图微工具栏组件，以 `.at-map-toolbar` 命名空间提供全屏切换、中心复位、缩放控制、底图标绘切换、空间距离测量（测距尺）与物理面积测量（测面尺）原生小工具，支持纯无头配置与插槽反转替换。
_Avoid_: MapTools, GisToolbar, MeasureBar, MapControls

**AtengMapModal**:
轻量级脱壳模态弹窗组件，纯原生 Vue 3 Teleport 与 `--at-map-*` CSS 变量驱动，100% 物理脱耦具体 UI 库，内置真全屏切换、操作保存/取消事件与坐标/围栏数据双向回传。
_Avoid_: MapDialog, LocationModal, GisDialog, MapPopup

### Composables & State Machines

**useMap**:
纯无状态地图核心无头状态机 Composable，管理地图实例全生命周期，以非响应式浅引用持有底层引擎实例，暴露 Facade 门面操作 API（平移缩放、标记增删、图层管理、底图切换、暗黑模式同步及确定性销毁清理）。
_Avoid_: useLeaflet, useAmap, useGis, useMapInstance

**useMapPicker**:
坐标拾取无头状态机 Composable，编排标记拖拽、中心点联动、POI 联想防抖检索与逆地理编码地址反查解析。
_Avoid_: usePicker, useLocationPicker, useCoordinateSelect

**useMapFence**:
电子围栏无头状态机 Composable，管理圆形/多边形/矩形顶点状态、图形编辑吸附、实时面积/半径推导以及基于 `GeoMath` 的点位进出判定。
_Avoid_: useFence, useGeoFence, useFenceDrawer

**useMapTrack**:
轨迹回放无头状态机 Composable，管理轨迹播放时钟、requestAnimationFrame 平滑插值动画、倍速调节、航向角度数推导与当前进度百分比。
_Avoid_: useTrack, useTrajectory, useRoutePlayer

**useMapThemeSync**:
响应式明亮/暗黑主题热跟随 Composable，自动监听 DOM 树 `.dark` 类名变化并动态更新瓦片反色滤镜或通知高德驱动切换 `'dark'` 底图样式，实现零重载平滑换肤。
_Avoid_: useMapTheme, useDarkTiles, useTileFilter

### Data Models & Contracts

**MapCoordinate**:
标准化地理坐标实体契约，规范经度（`lng`）、纬度（`lat`）、高度（`alt`）以及显式归属坐标系（`coordType`）。
_Avoid_: LatLngPoint, GeoPoint, CoordTuple, MapPoint

**CoordType**:
坐标系规范联合类型（`'WGS84' | 'GCJ02' | 'BD09'`），分别对应 GPS 原生/国际开源标准（WGS-84）、中国国测局火星坐标系（GCJ-02）与百度坐标系（BD-09）。
_Avoid_: CoordinateSystem, CrsType, MapProjection

**MapMarker**:
标记点配置契约，包含唯一标识（`id`）、坐标（`coordinate`）、标题（`title`）、图标配置（`icon`）、锚点偏移（`anchor`）、弹窗浮层内容（`popup`）与自定义数据载荷。
_Avoid_: MarkerItem, PointAnnotation, PinConfig, MapPin

**FenceRecord**:
电子围栏实体契约，定义围栏唯一标识（`id`）、围栏类型（`shape`: `'circle' | 'polygon' | 'rectangle'`）、中心点与半径（圆形特有）、顶点经纬度列表（多边形特有）、边框样式与业务元数据。
_Avoid_: GeoFenceEntity, FenceArea, ZoneConfig, BoundaryRecord

**TrackPoint**:
轨迹时间序列节点契约，规范经纬度（`coordinate`）、时间戳（`timestamp`）、瞬时速度（`speed`）、航向角（`heading`）与停靠状态（`isStop`）。
_Avoid_: PathNode, RouteStep, TrailPoint, GpsLog

**TilePreset**:
开箱即用标准瓦片图层枚举常量，涵盖 `OSM`（OpenStreetMap）、`TIANDITU_VEC`（天地图矢量）、`TIANDITU_IMG`（天地图影像）、`CARTODB_LIGHT`（CartoDB 明亮极简）、`CARTODB_DARK`（CartoDB 暗黑极简）与 `AMAP_VECTOR`（高德矢量）。
_Avoid_: LayerConfig, MapSource, TileSourceEnum, BaseMapType

### Engines, Drivers & Safety Guards

**MapDriverAdapter**:
多源地图渲染引擎驱动抽象接口（SPI），规范地图初始化（`init`）、销毁（`destroy`）、平移缩放、瓦片图层挂载、Marker 增删与事件绑定的统一协议，抹平 Leaflet、高德与百度地图的底层 API 差异。
_Avoid_: MapDriver, GisProvider, EngineWrapper, MapBridge

**CoordTransform**:
纯数学零依赖高精度坐标转换算法引擎，提供 `wgs84ToGcj02`、`gcj02ToWgs84`、`gcj02ToBd09`、`bd09ToGcj02`、`wgs84ToBd09` 等双向精确转换方法，消除跨坐标系 300~500 米显示漂移。
_Avoid_: CoordConverter, GpsTransformer, MarsCoordHelper

**GeoMath**:
纯 TS 空间几何轻量算法引擎，内置射线法（Ray-Casting Algorithm）点在多边形内检测、Haversine 大圆球面两点测距与鞋带公式（Shoelace Formula）多边形物理面积计算，零外部大型 GIS 依赖。
_Avoid_: SpatialCalculator, TurfHelper, GeometryUtils

**MapResizeGuard**:
基于 `ResizeObserver` 的视口几何自愈守卫，初次渲染为 `0x0` 挂起并在所在 Tab、折叠面板或模态弹窗恢复有效尺寸后自动触发底层引擎尺寸自愈重绘（`invalidateSize` / `resize`），消灭切片灰屏与中心偏移。
_Avoid_: ResizeWatcher, MapGeometryFixer, TileRefresher

**InvertedPolygonMask**:
行政区划反向遮罩几何构造器，接收标准 GeoJSON 多边形，自动构建包含全球外圈与目标行政区内孔的多边形镂空多环拓扑，实现区域外围暗黑半透明压暗遮罩。
_Avoid_: BoundaryClipper, InvertGeoJson, MaskGenerator
