# sample-echarts-vue EChartsVue 响应式图表可视化体验展厅

> 专注于演示与自验 `@atengk/echarts-vue` 核心特性在真实业务场景下的开箱使用与交互自验。

---

## 1. 快速启动与服务端口

- **默认固定端口**：`3006` (严格遵守 ADR-0001 / ADR-0009 端口契约)
- **启动方式**：
  ```bash
  pnpm --filter sample-echarts-vue dev
  ```
- 启动后浏览器访问：`http://localhost:3006`

---

## 2. 运行环境与 Mock 双模切换

- **默认/CI 模式**：内置离线自洽 Mock 数据（内置全国、广东省、深圳市三级行政区划 GeoJSON 数据与模拟指标数据集），无需启动任何外部后端服务即可直接体验完整交互与跑通自动化测试；
- **Local 真实网关/CDN 模式**：若需连接真实内网 OSS / CDN 或业务网关，可通过 `createUrlGeoProvider('https://your-oss-cdn.example.com/geo/{code}.json')` 注入真实的区划 GeoJSON 地址，并配置 `VITE_API_BASE_URL` 直连真实接口。

---

## 3. 核心场景看板与交互路由表

应用启动后，可通过顶部卡片导航切换以下 6 大场景看板进行直观交互体验：

| 场景分类               | 场景看板组件                    | 核心可视化交互操作                                                                            | 验证重点                                                                                                                |
| :--------------------- | :------------------------------ | :-------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------- |
| **通用表现容器**       | `ContainerScenario.vue`         | 动态刷新数据、切换 Loading/Empty/Error 遮罩、点击重试、切换 60% 压缩宽度、导出截图            | 验证声明式 `notMerge` 全量同步、DOM 级三态遮罩防白屏、`ResizeObserver` 容器防抖自适应重排                               |
| **经营趋势看板**       | `TrendScenario.vue`             | 随机刷新趋势数据、切换 DataZoom 缩放手柄、切换面积平滑渐变、切换空数据遮罩、加载遮罩          | 验证双 Y 轴刻度对齐、柱线混合排版、千分位 Tooltip 格式化、MarkLine/MarkPoint 极值标注                                   |
| **占比与转化漏斗**     | `DonutFunnelScenario.vue`       | 刷新多云算力费用占比、切换南丁格尔玫瑰图、切换居中 KPI 统计卡、切换漏斗升/降序、调节断层间隙  | 验证中心绝对居中 KPI 指标卡自动求和与千分位、扇区圆角高亮、漏斗相邻环节与总体转化率双轨自动计算                         |
| **达成率与能力画像**   | `GaugeRadarScenario.vue`        | 随机生成 SLA 可用性达成率数值、切换指针/环形进度条双模、刷新研发效能分值、切换渐变填充/纯轮廓 | 验证极值达成率多段阈值色阶渐变、现代圆角环形进度条与经典指针平滑切换、雷达图 polygon 多边形网格自适应                   |
| **行政区划地图下钻**   | `MapDrillDownScenario.vue`      | 点击“下钻至广东省”、“下钻至深圳市”、点击“返回上一级”、“重置全国”、点击地图区域                | 验证 GeoDataProvider SPI 异步按需拉取与内存去重缓存、全国 ➔ 省 ➔ 市三级受控下钻状态机、渐变面包屑药丸回退               |
| **高级生命周期与导出** | `LifecycleAdvancedScenario.vue` | 点击“页面级脱壳全屏”、“系统全屏”、“导出 2x/3x 高清报表”、“模态弹窗内初次渲染”、“初始隐藏 Tab” | 验证 0x0 零尺寸挂起与弹窗展开毫秒级自愈、CSS Fixed 视口脱壳全屏防黑边、2x/3x 高分辨率安全导出与 `#toolbar` 插槽完全接管 |

---

## 4. 全真自动化回归命令

```bash
pnpm --filter @atengk/echarts-vue --filter sample-echarts-vue typecheck && \
pnpm --filter @atengk/echarts-vue --filter sample-echarts-vue lint && \
pnpm --filter @atengk/echarts-vue test && \
pnpm --filter sample-echarts-vue build
```

> 详细原理机制、Props/Options 接口清单与生产边界，请参阅核心子包文档：[@atengk/echarts-vue README](../../packages/echarts-vue/README.md)。
