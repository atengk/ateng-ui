/**
 * 地图下钻预设 AtengMapChart、GeoJSON SPI 抽象与状态机实现。
 *
 * @author Ateng
 * @since 2026-10-27
 */

import { ref, computed } from 'vue';
import * as echarts from 'echarts';
import type {
  EChartsOption,
  MapSeriesOption,
  ScatterSeriesOption,
  TooltipComponentOption,
  VisualMapComponentOption,
} from 'echarts';
import type {
  GeoDataProvider,
  UrlGeoProviderOptions,
  MapNode,
  UseMapDrillDownOptions,
  UseMapDrillDownReturn,
  MapChartConfig,
} from './types';

/**
 * 创建基于 URL 模板的 GeoJSON 异步 SPI 提供者。
 *
 * 内置单例级内存缓存，同区划编码仅请求并注册一次。
 *
 * @param urlTemplate URL 字符串模板（包含 '{code}'）或动态解析函数
 * @param options 定制配置项（支持自定义 fetcher 与缓存开关）
 */
export function createUrlGeoProvider(
  urlTemplate: string | ((code: string, name: string) => string),
  options: UrlGeoProviderOptions = {},
): GeoDataProvider {
  const cache = new Map<string, unknown>();

  return async (mapCode: string, mapName: string): Promise<unknown> => {
    // 1. 优先命中内存缓存
    if (options.cache !== false && cache.has(mapCode)) {
      return cache.get(mapCode);
    }

    // 2. 解析目标 URL
    const url =
      typeof urlTemplate === 'function'
        ? urlTemplate(mapCode, mapName)
        : urlTemplate.replace('{code}', mapCode).replace('{name}', mapName);

    // 3. 异步拉取 GeoJSON 数据
    let geoJson: unknown;
    if (options.fetcher) {
      geoJson = await options.fetcher(mapCode, mapName, url);
    } else if (typeof fetch !== 'undefined') {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`加载地图 GeoJSON 失败: [${response.status}] ${response.statusText}`);
      }
      geoJson = await response.json();
    } else {
      throw new Error('当前运行环境缺失 fetch API，请通过 options.fetcher 注入自定义获取器');
    }

    // 4. 自动注册到 ECharts 引擎
    echarts.registerMap(mapCode, geoJson as Parameters<typeof echarts.registerMap>[1]);

    if (options.cache !== false) {
      cache.set(mapCode, geoJson);
    }

    return geoJson;
  };
}

/**
 * 地图多级下钻状态机。
 *
 * 托管面包屑路径栈（breadcrumbs）、受控下钻跳转（drillTo）、单级回退（back）与全局重置（reset）。
 *
 * @param options 状态机配置选项
 */
export function useMapDrillDown(options: UseMapDrillDownOptions = {}): UseMapDrillDownReturn {
  const rootNode: MapNode = options.initialNode ?? { code: 'china', name: '全国' };
  const currentNode = ref<MapNode>(rootNode);
  const breadcrumbs = ref<MapNode[]>([rootNode]);
  const isDrilling = ref(false);

  const canBack = computed(() => breadcrumbs.value.length > 1);

  const drillTo = async (target: MapNode): Promise<boolean> => {
    // 1. 执行前置拦截器（如边界越界拦截、鉴权等）
    if (options.beforeDrillDown) {
      const allowed = await options.beforeDrillDown(target, currentNode.value);
      if (!allowed) {
        return false;
      }
    }

    isDrilling.value = true;
    try {
      if (options.geoProvider) {
        await options.geoProvider(target.code, target.name);
      }

      currentNode.value = target;

      // 若点击已存在的面包屑节点，截断前序路径
      const existingIdx = breadcrumbs.value.findIndex(b => b.code === target.code);
      if (existingIdx !== -1) {
        breadcrumbs.value = breadcrumbs.value.slice(0, existingIdx + 1);
      } else {
        breadcrumbs.value.push(target);
      }

      options.onDrillDown?.(target, breadcrumbs.value);
      return true;
    } finally {
      isDrilling.value = false;
    }
  };

  const back = async (): Promise<boolean> => {
    if (breadcrumbs.value.length <= 1) {
      return false;
    }

    breadcrumbs.value.pop();
    const prev = breadcrumbs.value[breadcrumbs.value.length - 1];
    if (!prev) {
      return false;
    }

    isDrilling.value = true;
    try {
      if (options.geoProvider) {
        await options.geoProvider(prev.code, prev.name);
      }
      currentNode.value = prev;
      return true;
    } finally {
      isDrilling.value = false;
    }
  };

  const reset = async (): Promise<boolean> => {
    const root = breadcrumbs.value[0] ?? rootNode;
    breadcrumbs.value = [root];

    isDrilling.value = true;
    try {
      if (options.geoProvider) {
        await options.geoProvider(root.code, root.name);
      }
      currentNode.value = root;
      return true;
    } finally {
      isDrilling.value = false;
    }
  };

  return {
    currentNode,
    breadcrumbs,
    isDrilling,
    canBack,
    drillTo,
    back,
    reset,
  };
}

/**
 * 根据业务配置生成地图/热力/散点 Option 对象。
 *
 * @param config 地图语义化配置
 * @returns 合法且深度可覆盖的 EChartsOption
 */
export function createMapOption(config: MapChartConfig): EChartsOption {
  // 1. 构建区域填充（Choropleth）系列
  const mapSeries: MapSeriesOption = {
    name: '区域指标',
    type: 'map',
    map: config.map,
    roam: config.roam ?? true,
    emphasis: {
      label: { color: '#303133', fontWeight: 'bold' },
      itemStyle: { areaColor: '#C6E2FF' },
    },
    itemStyle: {
      borderColor: '#fff',
      borderWidth: 1,
      areaColor: '#E4E7ED',
    },
    data: config.data ?? [],
  };

  // 2. 组装散点图层（若提供）
  const series: (MapSeriesOption | ScatterSeriesOption)[] = [mapSeries];
  if (config.scatterData && config.scatterData.length > 0) {
    const scatterSeries: ScatterSeriesOption = {
      type: 'scatter',
      coordinateSystem: 'geo',
      symbolSize: 10,
      itemStyle: { color: '#F56C6C' },
      data: config.scatterData,
    };
    series.push(scatterSeries);
  }

  // 3. 构建连续/分段视觉映射
  let visualMap: VisualMapComponentOption | undefined;
  if (config.visualMap) {
    visualMap = {
      type: 'continuous',
      min: 0,
      max: 1000,
      calculable: true,
      inRange: {
        color: ['#E1F3D8', '#409EFF', '#F56C6C'],
      },
      textStyle: { color: '#606266' },
      ...(typeof config.visualMap === 'object' ? config.visualMap : {}),
    };
  }

  // 4. 提示框配置
  let tooltip: TooltipComponentOption | undefined;
  if (config.tooltip !== false) {
    tooltip = {
      trigger: 'item',
      formatter: '{b}: {c}',
      ...(typeof config.tooltip === 'object' ? config.tooltip : {}),
    };
  }

  let baseOption: EChartsOption = {
    tooltip,
    visualMap,
    series,
  };

  if (typeof config.overrideOption === 'function') {
    baseOption = config.overrideOption(baseOption);
  }

  return baseOption;
}
