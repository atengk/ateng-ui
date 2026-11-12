/**
 * @atengk/map-vue 核心领域类型契约集合。
 *
 * 依据 ADR-0051 与 CONTEXT.md 规范，建立地理坐标系、标记点、电子围栏、轨迹点与驱动 SPI 契约。
 *
 * @author Ateng
 * @since 2026-11-11
 */

import type { TilePreset } from '../constants';

/**
 * 坐标系标准类型。
 *
 * - `WGS84`: 国际通用标准坐标系（GPS、OpenStreetMap、Leaflet 默认基准）
 * - `GCJ02`: 国测局火星坐标系（高德、腾讯、Google 中国使用）
 * - `BD09`: 百度二次加密坐标系
 */
export type CoordType = 'WGS84' | 'GCJ02' | 'BD09';

/**
 * 标准化地理坐标点实体契约。
 */
export interface MapCoordinate {
  /** 经度 (Longitude，范围 -180 ~ 180) */
  lng: number;
  /** 纬度 (Latitude，范围 -90 ~ 90) */
  lat: number;
  /** 可选海拔高度 (米) */
  alt?: number;
  /** 显式声明的坐标系类型，未指定时默认按组件级设定或 GCJ02 处理 */
  coordType?: CoordType;
}

/**
 * 自定义标记图标配置契约。
 */
export interface MapMarkerIcon {
  /** 图标图片地址 */
  url: string;
  /** 图标尺寸 [宽, 高] (像素) */
  size?: [number, number];
  /** 图标锚点位置偏移 [x, y] (像素)，通常设为底部中心点如 [width/2, height] */
  anchor?: [number, number];
}

/**
 * 地图标记点配置实体契约。
 */
export interface MapMarker {
  /** 标记点唯一标识 */
  id: string | number;
  /** 标记经纬度坐标 */
  coordinate: MapCoordinate;
  /** 鼠标悬停标题或简短文案 */
  title?: string;
  /** 图标 URL 或详细图标配置 */
  icon?: string | MapMarkerIcon;
  /** 锚点偏移 [x, y] */
  anchor?: [number, number];
  /** 点击弹出信息浮窗内容 (支持 HTML 纯文本) */
  popup?: string;
  /** 自定义业务数据载荷 */
  data?: Record<string, unknown>;
}

/**
 * 电子围栏几何形状联合类型。
 */
export type FenceShape = 'circle' | 'polygon' | 'rectangle';

/**
 * 电子围栏实体契约。
 */
export interface FenceRecord {
  /** 围栏唯一标识 */
  id: string | number;
  /** 围栏显示名称 */
  name?: string;
  /** 围栏几何形状 */
  shape: FenceShape;
  /** 圆形围栏特有：中心点坐标 */
  center?: MapCoordinate;
  /** 圆形围栏特有：半径 (单位：米) */
  radius?: number;
  /** 多边形 / 矩形围栏特有：有序顶点坐标序列 */
  points?: MapCoordinate[];
  /** 围栏计算得出的地表物理面积 (单位：平方米) */
  area?: number;
  /** 边框描边颜色 */
  strokeColor?: string;
  /** 区域填充颜色 */
  fillColor?: string;
  /** 描边粗细 (像素) */
  strokeWidth?: number;
  /** 填充透明度 (0 ~ 1) */
  fillOpacity?: number;
  /** 自定义业务数据载荷 */
  data?: Record<string, unknown>;
}

/**
 * 轨迹时序点实体契约。
 */
export interface TrackPoint {
  /** 轨迹节点经纬度坐标 */
  coordinate: MapCoordinate;
  /** 时间戳 (毫秒数字或 ISO 字符串) */
  timestamp?: number | string;
  /** 瞬时行驶速度 (km/h) */
  speed?: number;
  /** 航向切线角 (0 ~ 360 度，0 为正北) */
  heading?: number;
  /** 是否为停靠驻留点 */
  isStop?: boolean;
  /** 停靠驻留时长 (秒) */
  stopDuration?: number;
  /** 节点标注文案 */
  name?: string;
  /** 自定义业务数据载荷 */
  data?: Record<string, unknown>;
}

/**
 * 空间矩形包围盒契约 [西南角坐标, 东北角坐标]。
 */
export type MapBounds = [MapCoordinate, MapCoordinate];

/**
 * 地理编码与逆地理编码反查结果实体契约。
 */
export interface GeocodeResult {
  /** 解析坐标 */
  coordinate: MapCoordinate;
  /** 完整格式化详细地址 */
  formattedAddress: string;
  /** 省份 */
  province?: string;
  /** 城市 */
  city?: string;
  /** 区县 */
  district?: string;
  /** 街道/乡镇 */
  street?: string;
  /** 门牌号 */
  streetNumber?: string;
  /** POI 名称 */
  poiName?: string;
}

/**
 * 地理编码驱动器提供者函数签名。
 */
export type GeocodeProvider = (keywordOrCoord: string | MapCoordinate) => Promise<GeocodeResult[]>;

/**
 * 地图初始化参数选项契约。
 */
export interface MapInitOptions {
  /** 初始中心点 */
  center: MapCoordinate;
  /** 初始缩放等级 */
  zoom: number;
  /** 最小缩放等级 */
  minZoom?: number;
  /** 最大缩放等级 */
  maxZoom?: number;
  /** 瓦片服务地址模板 */
  tileUrl?: string;
  /** 是否允许交互（拖拽、滚轮缩放等） */
  interactive?: boolean;
  /** 是否启用暗黑模式 */
  dark?: boolean;
}

/**
 * 多源地图渲染引擎底层驱动抽象接口 (SPI)。
 *
 * 抹平 Leaflet、高德地图 2.0 与百度地图底层 API 差异。
 */
export interface MapDriverAdapter {
  /** 驱动器引擎标识 */
  readonly engineName: string;
  /** 初始化地图容器 */
  init(container: HTMLElement, options: MapInitOptions): Promise<void> | void;
  /** 彻底销毁地图实例并释放资源 */
  destroy(): void;
  /** 平移地图中心点 */
  setCenter(coord: MapCoordinate, animate?: boolean): void;
  /** 设置缩放等级 */
  setZoom(zoom: number, animate?: boolean): void;
  /** 原子设置地图中心点与缩放等级（避免平移与缩放动画重叠冲突） */
  setView?(coord: MapCoordinate, zoom?: number, animate?: boolean): void;
  /** 动态更新底图瓦片 URL 模板 */
  updateTileUrl?(url: string): void;
  /** 缩放平移以自适应包含指定矩形边界 */
  fitBounds(bounds: MapBounds, padding?: [number, number]): void;
  /** 添加标记点 */
  addMarker(marker: MapMarker): void;
  /** 移除指定标记点 */
  removeMarker(id: string | number): void;
  /** 清空所有标记点 */
  clearMarkers(): void;
  /** 重算尺寸与视口自愈（invalidateSize / resize） */
  invalidateSize(): void;
  /** 获取底层原生引擎实例 */
  getRawInstance<T = unknown>(): T;
}

/**
 * 地图图片导出配置参数契约。
 */
export interface MapExportOptions {
  /** 导出图片格式 */
  format?: 'png' | 'jpeg';
  /** 文件名（不含后缀） */
  fileName?: string;
  /** 导出高分屏像素比，默认 2 */
  pixelRatio?: number;
}

/**
 * AtengMap 核心容器 Props 契约。
 */
export interface AtengMapProps {
  /** 中心点坐标 (支持 v-model:center 双向绑定) */
  center?: MapCoordinate;
  /** 缩放等级 (支持 v-model:zoom 双向绑定) */
  zoom?: number;
  /** 最小缩放等级，默认 3 */
  minZoom?: number;
  /** 最大缩放等级，默认 18 */
  maxZoom?: number;
  /** 标准瓦片预设枚举，默认 TilePreset.OSM */
  tilePreset?: TilePreset | string;
  /** 自定义瓦片服务模板 URL (例如内网离线 XYZ 切片) */
  tileUrl?: string;
  /** 渲染引擎标识，默认 'leaflet' */
  engine?: 'leaflet' | 'amap' | 'baidu';
  /** 自定义底层驱动适配器 SPI (最高优先级) */
  driver?: MapDriverAdapter;
  /** 当前坐标系类型，默认 'GCJ02' */
  coordType?: CoordType;
  /** 暗黑模式开关或跟随宿主 'auto'，默认 'auto' */
  dark?: boolean | 'auto';
  /** 是否开启地图交互（拖拽、滚轮缩放等），默认 true */
  interactive?: boolean;
  /** 是否开启 ResizeObserver 自动尺寸几何自愈，默认 true */
  autoResize?: boolean;
  /** 初始标记点集合 */
  markers?: MapMarker[];
  /** 自定义根容器样式类 */
  customClass?: string;
}

/**
 * AtengMap 核心容器 Emits 契约。
 */
export interface AtengMapEmits {
  (e: 'update:center', center: MapCoordinate): void;
  (e: 'update:zoom', zoom: number): void;
  (e: 'ready', driver: MapDriverAdapter): void;
  (e: 'mapClick', payload: { coordinate: MapCoordinate; originalEvent: MouseEvent }): void;
  (e: 'mapDblClick', payload: { coordinate: MapCoordinate; originalEvent: MouseEvent }): void;
  (e: 'mapMoveEnd', center: MapCoordinate): void;
  (e: 'mapZoomEnd', zoom: number): void;
}

/**
 * AtengMap 组件实例暴露方法与引用契约 (defineExpose)。
 */
export interface AtengMapInstance {
  /** 底层驱动适配器实例 */
  driver: MapDriverAdapter | null;
  /** 地图 DOM 挂载容器 */
  container: HTMLElement | null;
  /** 视口重算与几何自愈 */
  invalidateSize: () => void;
  /** 设置中心点 */
  setCenter: (coord: MapCoordinate, animate?: boolean) => void;
  /** 设置缩放等级 */
  setZoom: (zoom: number, animate?: boolean) => void;
  /** 原子设置中心点与缩放等级 */
  setView?: (coord: MapCoordinate, zoom?: number, animate?: boolean) => void;
  /** 添加标记点 */
  addMarker: (marker: MapMarker) => void;
  /** 移除指定标记点 */
  removeMarker: (id: string | number) => void;
  /** 清空标记点 */
  clearMarkers: () => void;
  /** 视口自适应包围盒 */
  fitBounds: (bounds: MapBounds, padding?: [number, number]) => void;
}

/**
 * 选点模式枚举类型。
 * - `marker`: 拖拽/点击 Marker 选点
 * - `crosshair`: 中心十字准星移动地图选点
 */
export type PickerMode = 'marker' | 'crosshair';

/**
 * 坐标与地址拾取器交付结果契约。
 */
export interface PickerResult {
  /** 当前选中的坐标（遵循 targetCoordType，默认 GCJ02） */
  coordinate: MapCoordinate;
  /** 逆地理编码解析得到的结构化地址 */
  address?: GeocodeResult;
  /** 多坐标系防漂移换算对照表 (WGS84 ⇄ GCJ02 ⇄ BD09) */
  coords: {
    wgs84: MapCoordinate;
    gcj02: MapCoordinate;
    bd09: MapCoordinate;
  };
}

/**
 * AtengMapPicker 选点器 Props 契约。
 */
export interface AtengMapPickerProps {
  /** 当前选中的坐标 (支持 v-model 或 v-model:modelValue) */
  modelValue?: MapCoordinate;
  /** 默认中心点坐标 */
  defaultCenter?: MapCoordinate;
  /** 初始缩放等级，默认 15 */
  zoom?: number;
  /** 瓦片源预设枚举或自定义模板 URL */
  tilePreset?: TilePreset | string;
  /** 坐标系类型，默认 'GCJ02' */
  coordType?: CoordType;
  /** 初始选点模式，默认 'marker' */
  mode?: PickerMode;
  /** 自定义地理与逆地理反查解析 Provider */
  geocodeProvider?: GeocodeProvider;
  /** 搜索输入防抖延时 (毫秒)，默认 300 */
  searchDebounceMs?: number;
  /** 是否启用暗黑模式或跟随宿主，默认 'auto' */
  dark?: boolean | 'auto';
  /** 容器高度，默认 '480px' */
  height?: string;
  /** 是否显示模式切换按键，默认 true */
  showModeSwitch?: boolean;
  /** 是否显示快速复制按键，默认 true */
  showCopyButton?: boolean;
  /** 自定义容器 CSS 类名 */
  customClass?: string;
}

/**
 * AtengMapPicker 选点器 Emits 契约。
 */
export interface AtengMapPickerEmits {
  (e: 'update:modelValue', coordinate: MapCoordinate): void;
  (e: 'change', result: PickerResult): void;
  (e: 'confirm', result: PickerResult): void;
  (e: 'reset'): void;
}

/**
 * AtengMapPicker 选点器组件实例暴露方法 (defineExpose)。
 */
export interface AtengMapPickerInstance {
  /** 当前选中坐标 */
  selectedCoord: MapCoordinate;
  /** 当前逆地理反查结果 */
  selectedAddress: GeocodeResult | null;
  /** 当前选点模式 */
  mode: PickerMode;
  /** 切换选点模式 */
  setMode: (mode: PickerMode) => void;
  /** 主动定位并选中指定坐标 */
  pickCoord: (coord: MapCoordinate, triggerGeocode?: boolean) => Promise<void>;
  /** 执行关键词检索 */
  search: (keyword: string) => Promise<GeocodeResult[]>;
  /** 获取当前完整拾取结果 */
  getPickerResult: () => PickerResult;
  /** 重置选点与搜索状态 */
  reset: () => void;
}

/**
 * 围栏绘制模式枚举。
 */
export type FenceDrawMode = 'none' | 'circle' | 'polygon' | 'rectangle';

/**
 * 电子围栏进出与滞留告警载荷契约。
 */
export interface FenceAlarmPayload {
  /** 触发告警的地理点位 */
  point: MapCoordinate;
  /** 关联的电子围栏实体 */
  fence: FenceRecord;
  /** 告警动作：enter(进入)、leave(离开)、inside(内部滞留) */
  action: 'enter' | 'leave' | 'inside';
  /** 告警时间戳 (毫秒) */
  timestamp: number;
}

/**
 * AtengMapFence 围栏表现容器 Props 契约。
 */
export interface AtengMapFenceProps {
  /** 围栏记录集合 (支持 v-model:fences 双向绑定) */
  fences?: FenceRecord[];
  /** 地图中心点坐标 */
  center?: MapCoordinate;
  /** 缩放等级，默认 14 */
  zoom?: number;
  /** 瓦片源预设枚举或自定义模板 URL */
  tilePreset?: TilePreset | string;
  /** 暗黑模式开关或跟随宿主，默认 'auto' */
  dark?: boolean | 'auto';
  /** 容器高度，默认 '480px' */
  height?: string;
  /** 当前选中的围栏 ID (支持 v-model:activeId 双向绑定) */
  activeId?: string | number | null;
  /** 当前标绘绘制模式 (支持 v-model:drawMode 双向绑定)，默认 'none' */
  drawMode?: FenceDrawMode;
  /** 是否开启顶点可编辑微调，默认 true */
  editable?: boolean;
  /** 是否在图层上渲染面积/半径标尺浮层，默认 true */
  showRuler?: boolean;
  /** 外部动态巡检点位流 (单点或批量)，自动触发越界报警判定 */
  checkPoints?: MapCoordinate | MapCoordinate[];
  /** 自定义容器 CSS 类名 */
  customClass?: string;
}

/**
 * AtengMapFence 围栏表现容器 Emits 契约。
 */
export interface AtengMapFenceEmits {
  (e: 'update:fences', fences: FenceRecord[]): void;
  (e: 'update:activeId', id: string | number | null): void;
  (e: 'update:drawMode', mode: FenceDrawMode): void;
  (e: 'fenceCreate', fence: FenceRecord): void;
  (e: 'fenceUpdate', fence: FenceRecord): void;
  (e: 'fenceDelete', id: string | number): void;
  (e: 'fenceSelect', fence: FenceRecord | null): void;
  (e: 'pointEnter', payload: FenceAlarmPayload): void;
  (e: 'pointLeave', payload: FenceAlarmPayload): void;
  (e: 'pointInside', payload: FenceAlarmPayload): void;
}

/**
 * AtengMapFence 实例暴露接口 (defineExpose)。
 */
export interface AtengMapFenceInstance {
  /** 围栏列表 */
  fences: FenceRecord[];
  /** 当前选中的围栏 ID */
  activeId: string | number | null;
  /** 当前绘制模式 */
  drawMode: FenceDrawMode;
  /** 切换绘制模式 */
  setDrawMode: (mode: FenceDrawMode) => void;
  /** 添加新围栏 */
  addFence: (fence: Omit<FenceRecord, 'id'> & { id?: string | number }) => FenceRecord;
  /** 更新指定围栏 */
  updateFence: (id: string | number, partial: Partial<FenceRecord>) => FenceRecord | null;
  /** 删除指定围栏 */
  removeFence: (id: string | number) => boolean;
  /** 清空所有围栏 */
  clearFences: () => void;
  /** 选中指定围栏 */
  selectFence: (id: string | number | null) => void;
  /** 对指定点位执行越界报警判定 */
  checkPoint: (point: MapCoordinate) => FenceAlarmPayload[];
}

/**
 * 轨迹回放状态枚举。
 */
export type TrackPlaybackStatus = 'idle' | 'playing' | 'paused' | 'finished';

/**
 * AtengMapTrack 轨迹回放容器 Props 契约。
 */
export interface AtengMapTrackProps {
  /** 轨迹节点序列 (支持空数组兜底) */
  trackPoints?: TrackPoint[];
  /** 初始播放倍速 (0.5x, 1x, 2x, 4x, 8x)，默认 1 */
  speedRate?: number;
  /** 播放进度 (0 ~ 1，支持 v-model:progress 双向绑定) */
  progress?: number;
  /** 是否循环播放，默认 false */
  loop?: boolean;
  /** 是否就绪后自动开始播放，默认 false */
  autoPlay?: boolean;
  /** 已行驶路线颜色，默认 '#10b981' (绿色) */
  passedPathColor?: string;
  /** 待行驶路线颜色，默认 '#94a3b8' (石板灰) */
  pendingPathColor?: string;
  /** 轨迹折线宽度 (像素)，默认 4 */
  pathWidth?: number;
  /** 自定义移动载具/人物图标 (URL 或 MapMarkerIcon) */
  carIcon?: string | MapMarkerIcon;
  /** 是否渲染停靠驻留点标记图钉，默认 true */
  showStopMarkers?: boolean;
  /** 是否展示内置回放控制底栏，默认 true */
  showControlBar?: boolean;
  /** 地图中心点坐标 */
  center?: MapCoordinate;
  /** 缩放等级，默认 14 */
  zoom?: number;
  /** 瓦片源预设枚举或自定义模板 URL */
  tilePreset?: TilePreset | string;
  /** 暗黑模式开关或跟随宿主，默认 'auto' */
  dark?: boolean | 'auto';
  /** 容器高度，默认 '520px' */
  height?: string;
  /** 自定义容器 CSS 类名 */
  customClass?: string;
}

/**
 * AtengMapTrack 轨迹回放容器 Emits 契约。
 */
export interface AtengMapTrackEmits {
  (e: 'update:progress', progress: number): void;
  (e: 'update:speedRate', rate: number): void;
  (e: 'statusChange', status: TrackPlaybackStatus): void;
  (
    e: 'pointChange',
    payload: { point: TrackPoint; index: number; coordinate: MapCoordinate; heading: number },
  ): void;
  (e: 'finish'): void;
}

/**
 * AtengMapTrack 实例暴露方法 (defineExpose)。
 */
export interface AtengMapTrackInstance {
  /** 当前播放状态 */
  status: TrackPlaybackStatus;
  /** 当前进度 (0 ~ 1) */
  progress: number;
  /** 当前瞬时坐标 */
  currentCoordinate: MapCoordinate | null;
  /** 当前瞬时航向角 (0 ~ 360 度) */
  currentHeading: number;
  /** 当前所在轨迹段索引 */
  currentIndex: number;
  /** 播放倍速 */
  speedRate: number;
  /** 启动播放 */
  play: () => void;
  /** 暂停播放 */
  pause: () => void;
  /** 停止并重置至起点 */
  stop: () => void;
  /** 跳转指定进度 (0 ~ 1) */
  seek: (progress: number) => void;
  /** 设置播放倍速 */
  setSpeedRate: (rate: number) => void;
}

/**
 * 海量点聚合标记点契约。
 */
export interface ClusterMarker {
  /** 点位唯一标识 */
  id: string | number;
  /** 经纬度坐标 */
  coordinate: MapCoordinate;
  /** 标题或悬停提示 */
  title?: string;
  /** 自定义图标 */
  icon?: string | MapMarkerIcon;
  /** 自定义业务数据载荷 */
  data?: Record<string, unknown>;
}

/**
 * 聚合簇实体契约。
 */
export interface ClusterGroup {
  /** 簇唯一标识 */
  id: string;
  /** 簇质心经纬度坐标 */
  center: MapCoordinate;
  /** 簇包含的点位总数 */
  count: number;
  /** 簇内包含的所有标记点列表 */
  markers: ClusterMarker[];
  /** 簇空间矩形外包围盒 */
  bounds: MapBounds;
}

/**
 * AtengMapCluster 海量点聚合容器 Props 契约。
 */
export interface AtengMapClusterProps {
  /** 待聚合点位集合 (支持 50,000+ 点位) */
  markers?: ClusterMarker[];
  /** 聚合网格单元像素大小 (像素)，默认 60 */
  gridSize?: number;
  /** 最大聚合缩放等级 (超过此层级不再聚合，呈散开点)，默认 17 */
  maxClusterZoom?: number;
  /** 最大缩放层级下重叠点是否启用蜘蛛网散开扩散 (Spiderfy)，默认 true */
  spiderfyOnMaxZoom?: boolean;
  /** 渲染模式：'dom' 标牌渲染或 'canvas' 纯画布极致性能，默认 'dom' */
  renderMode?: 'dom' | 'canvas';
  /** 聚合圈主色调，默认 '#3b82f6' */
  clusterColor?: string;
  /** 地图中心点坐标 */
  center?: MapCoordinate;
  /** 缩放等级，默认 12 */
  zoom?: number;
  /** 瓦片源预设枚举或自定义模板 URL */
  tilePreset?: TilePreset | string;
  /** 暗黑模式开关或跟随宿主，默认 'auto' */
  dark?: boolean | 'auto';
  /** 容器高度，默认 '520px' */
  height?: string;
  /** 自定义容器 CSS 类名 */
  customClass?: string;
}

/**
 * AtengMapCluster 海量点聚合容器 Emits 契约。
 */
export interface AtengMapClusterEmits {
  (e: 'clusterClick', cluster: ClusterGroup): void;
  (e: 'markerClick', marker: ClusterMarker): void;
}

/**
 * AtengMapCluster 实例暴露方法 (defineExpose)。
 */
export interface AtengMapClusterInstance {
  /** 当前聚合簇列表 */
  clusters: ClusterGroup[];
  /** 触发重新网格聚合计算与图层重绘 */
  refresh: () => void;
}

/**
 * 行政区划 GeoJSON 多边形几何数据联合类型。
 */
export type GeoJSONGeometryData =
  | {
      type: 'Polygon';
      coordinates: number[][][]; // [ [ [lng, lat], ... ] ]
    }
  | {
      type: 'MultiPolygon';
      coordinates: number[][][][]; // [ [ [ [lng, lat], ... ] ] ]
    }
  | {
      type: 'Feature';
      geometry: {
        type: 'Polygon' | 'MultiPolygon';
        coordinates: unknown;
      };
      properties?: Record<string, unknown>;
    }
  | {
      type: 'FeatureCollection';
      features: Array<{
        type: 'Feature';
        geometry: {
          type: 'Polygon' | 'MultiPolygon';
          coordinates: unknown;
        };
        properties?: Record<string, unknown>;
      }>;
    };

/**
 * AtengMapMask 行政区划反向遮罩容器 Props 契约。
 */
export interface AtengMapMaskProps {
  /** 行政区划 GeoJSON 数据 (Polygon / MultiPolygon / Feature / FeatureCollection) */
  geoData?: GeoJSONGeometryData | null;
  /** 反向遮罩全局压暗填充色 (支持 rgba/hex)，默认 'rgba(15, 23, 42, 0.72)' */
  maskColor?: string;
  /** 行政边界高亮描边颜色，默认 '#38bdf8' */
  boundaryColor?: string;
  /** 行政边界描边线宽 (像素)，默认 2.5 */
  boundaryWidth?: number;
  /** 行政边界描边虚线模式 (如 '5, 5') */
  dashArray?: string;
  /** 地图中心点坐标 */
  center?: MapCoordinate;
  /** 缩放等级，默认 11 */
  zoom?: number;
  /** 瓦片源预设枚举或自定义模板 URL */
  tilePreset?: TilePreset | string;
  /** 暗黑模式开关或跟随宿主，默认 'auto' */
  dark?: boolean | 'auto';
  /** 容器高度，默认 '520px' */
  height?: string;
  /** 自定义容器 CSS 类名 */
  customClass?: string;
}

/**
 * AtengMapMask 行政区划反向遮罩容器 Emits 契约。
 */
export interface AtengMapMaskEmits {
  (e: 'ready', driver: MapDriverAdapter): void;
  (e: 'maskClick', payload: { coordinate: MapCoordinate; originalEvent: MouseEvent }): void;
}

/**
 * AtengMapMask 实例暴露方法 (defineExpose)。
 */
export interface AtengMapMaskInstance {
  /** 视口自动平移缩放至行政区划外包围盒 (fitBounds) */
  fitMaskBounds: () => void;
  /** 重新生成并绘制反向掩膜 */
  refresh: () => void;
}

/**
 * 测量工具工作模式。
 */
export type MeasureMode = 'none' | 'distance' | 'area';

/**
 * 测距过程点位信息契约。
 */
export interface MeasurePoint {
  /** 点位坐标 */
  coordinate: MapCoordinate;
  /** 与上一节点的单段物理距离 (单位：米) */
  segmentDistance: number;
  /** 截止当前节点的累计物理距离 (单位：米) */
  totalDistance: number;
}

/**
 * 空间测量结算结果契约。
 */
export interface MeasureResult {
  /** 测量模式 */
  mode: MeasureMode;
  /** 测量所有顶点序列 */
  points: MapCoordinate[];
  /** 连续折线总距离 (单位：米) */
  totalDistance?: number;
  /** 封闭多边形地表物理面积 (单位：平方米) */
  area?: number;
}

/**
 * 微工具栏支持的操作按钮动作枚举。
 */
export type ToolbarAction =
  'zoomIn' | 'zoomOut' | 'reset' | 'measureDistance' | 'measureArea' | 'fullscreen' | 'clear';

/**
 * AtengMapToolbar 悬浮微工具栏 Props 契约。
 */
export interface AtengMapToolbarProps {
  /** 地图底层驱动适配器 SPI */
  driver?: MapDriverAdapter | null;
  /** 启用的工具按钮列表，默认全开 */
  actions?: ToolbarAction[];
  /** 悬浮浮层方位，默认 'top-right' */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** 复位初始中心点 */
  defaultCenter?: MapCoordinate;
  /** 复位初始缩放等级，默认 13 */
  defaultZoom?: number;
  /** 自定义容器 CSS 类名 */
  customClass?: string;
}

/**
 * AtengMapToolbar 悬浮微工具栏 Emits 契约。
 */
export interface AtengMapToolbarEmits {
  (e: 'measureChange', result: MeasureResult): void;
  (e: 'measureFinish', result: MeasureResult): void;
  (e: 'action', action: ToolbarAction): void;
  (e: 'fullscreenChange', isFullscreen: boolean): void;
}

/**
 * AtengMapToolbar 实例暴露接口 (defineExpose)。
 */
export interface AtengMapToolbarInstance {
  /** 当前测量模式 */
  measureMode: MeasureMode;
  /** 切换测量模式 */
  setMeasureMode: (mode: MeasureMode) => void;
  /** 清空测量图层与结果 */
  clearMeasurement: () => void;
  /** 切换全屏状态 */
  toggleFullscreen: () => void;
}

/**
 * AtengMapModal 轻量脱壳模态弹窗 Props 契约。
 */
export interface AtengMapModalProps {
  /** 弹窗显隐状态 (支持 v-model) */
  modelValue?: boolean;
  /** 弹窗头部标题，默认 '地图窗口' */
  title?: string;
  /** 弹窗宽度，默认 '920px' */
  width?: string;
  /** 弹窗高度，默认 '620px' */
  height?: string;
  /** 是否处于全屏状态 (支持 v-model:fullscreen) */
  fullscreen?: boolean;
  /** 是否展示全屏切换按钮，默认 true */
  showFullscreenBtn?: boolean;
  /** 是否展示右上角关闭按钮，默认 true */
  showCloseBtn?: boolean;
  /** 是否展示底部操作底栏，默认 true */
  showFooter?: boolean;
  /** 确认按钮文本，默认 '确定' */
  confirmText?: string;
  /** 取消按钮文本，默认 '取消' */
  cancelText?: string;
  /** Teleport 目标挂载 DOM 选择器或元素，默认 'body' */
  teleportTo?: string | HTMLElement;
  /** 点击遮罩层是否触发关闭，默认 false */
  closeOnClickOverlay?: boolean;
  /** 暗黑模式开关或跟随宿主，默认 'auto' */
  dark?: boolean | 'auto';
  /** 自定义模态框 CSS 类名 */
  customClass?: string;
}

/**
 * AtengMapModal 轻量脱壳模态弹窗 Emits 契约。
 */
export interface AtengMapModalEmits {
  (e: 'update:modelValue', visible: boolean): void;
  (e: 'update:fullscreen', isFullscreen: boolean): void;
  (e: 'confirm'): void;
  (e: 'cancel'): void;
  (e: 'close'): void;
  (e: 'open'): void;
}

/**
 * AtengMapModal 实例暴露接口 (defineExpose)。
 */
export interface AtengMapModalInstance {
  /** 主动打开模态弹窗 */
  open: () => void;
  /** 主动关闭模态弹窗 */
  close: () => void;
  /** 切换全屏放大状态 */
  toggleFullscreen: () => void;
}
