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
