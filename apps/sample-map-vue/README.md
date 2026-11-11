# sample-map-vue 多源地图引擎与空间计算体验展厅

> 专注于演示与自验 `@atengk/map-vue` 核心特性在真实业务场景下的开箱使用、多源瓦片、三维坐标纠偏、电子围栏告警、轨迹回放、海量点聚合、行政区划遮罩与微工具栏交互自验。

---

## 1. 快速启动与服务端口

- **默认固定端口**：`3019`
- **启动方式**：
  ```bash
  pnpm --filter sample-map-vue dev
  ```
- 启动后浏览器访问：`http://localhost:3019`

---

## 2. 运行环境与 Mock 双模切换

- **默认/CI 模式**：内置离线自洽 Mock 数据与内置免费 OpenStreetMap 瓦片源，无需启动任何外部后端服务即可直接体验完整交互与跑通自动化测试；
- **Local 真实网关模式**：复制 `.env.example` 为 `.env.local` 并配置 `VITE_AMAP_KEY` 或 `VITE_TIANDITU_TOKEN`，重启开发服务即可接入商业级高德矢量与国家天地图测绘服务（该文件已被 Git 忽略）。

---

## 3. 核心场景看板与交互路由表

| 场景分类                     | 场景看板组件          | 核心可视化交互操作                                                                                                  | 验证重点                                                                                                                             |
| :--------------------------- | :-------------------- | :------------------------------------------------------------------------------------------------------------------ | :----------------------------------------------------------------------------------------------------------------------------------- |
| **多源底图与瓦片预设**       | `<BoardBaseMap.vue>`  | 切换瓦片服务预设、城市快捷跳转、暗黑滤镜切换、视口几何自愈、连续测距与测面工具栏、脱壳模态弹窗选点                  | 验证 `MapDriverAdapter` SPI、`useMapThemeSync` 瓦片暗黑反色、`MapResizeGuard` 视口自愈、`<AtengMapToolbar />` 与 `<AtengMapModal />` |
| **坐标拾取与逆地理纠偏**     | `<BoardPicker.vue>`   | 切换自由图钉/中心十字准星模式、拖拽定位、关键词防抖 POI 检索、点击确认交付                                          | 验证 `useMapPicker` 状态机、`CoordTransform` WGS84/GCJ02/BD09 实时纠偏转换、结构化地址解析回填                                       |
| **空间电子围栏与越界告警**   | `<BoardFence.vue>`    | 圆形/多边形标绘、面积标尺实时渲染、启动模拟目标穿越围栏巡检                                                         | 验证 `useMapFence` 状态机、`GeoMath.isPointInPolygon` 光线投射法、实时 enter/inside/leave 越界告警流                                 |
| **历史轨迹回放与海量点聚合** | `<BoardAdvanced.vue>` | 轨迹播放/暂停/调速 (0.5x~8x)/进度拖拽、10,000 点网格聚合与 Canvas 渲染切换、Spiderfy 扩散展开、行政区划反向遮罩聚焦 | 验证 `useMapTrack` 插帧转向、`ClusterEngine` 墨卡托网格分桶、`MaskEngine` Inverted Polygon 全局压暗反向掩膜                          |

---

## 4. 全真自动化回归命令

```bash
pnpm --filter @atengk/map-vue --filter sample-map-vue typecheck && \
pnpm --filter @atengk/map-vue --filter sample-map-vue lint && \
pnpm --filter @atengk/map-vue --filter sample-map-vue test && \
pnpm --filter @atengk/map-vue --filter sample-map-vue build
```

> 详细原理机制、Props/Options 接口清单与生产边界，请参阅核心子包文档：[@atengk/map-vue README](../../packages/map-vue/README.md)。
