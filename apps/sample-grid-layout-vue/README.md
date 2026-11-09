# sample-grid-layout-vue 可拖拽网格布局体验展厅

> 专注于演示与自验 `@atengk/grid-layout-vue` 核心特性在现代数据大屏、工作台与仪表盘编排场景下的开箱使用与交互自验。

---

## 1. 快速启动与服务端口

- **默认固定端口**：`3013`
- **启动方式**：
  ```bash
  pnpm --filter sample-grid-layout-vue dev
  ```
- 启动后浏览器访问：`http://localhost:3013`

---

## 2. 运行环境与 Mock 双模切换

- **默认/CI 模式**：内置离线自洽 Mock 数据集（柱线趋势图、多维环形图、SLA 仪表盘、外部预设物料），无需启动任何外部后端服务即可直接体验完整交互与跑通自动化测试；
- **Local 真实网关模式**：复制 `.env.example` 为 `.env.local` 并配置 `VITE_API_BASE_URL`，重启开发服务即可直连真实工作台编排接口（该文件已被 Git 忽略）。

---

## 3. 核心场景看板与交互路由表

| 场景分类                 | 场景看板组件 / 标签页                  | 核心可视化交互操作                                                                               | 验证重点                                                                                                     |
| :----------------------- | :------------------------------------- | :----------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------- |
| **基础栅格与双向 JSON**  | `BasicDashboard.vue`<br>`(Tab 1)`      | 动态增删卡片、自动寻空插入、调整卡片尺寸、撤销 (Ctrl+Z) 与重做 (Ctrl+Y)、保存/恢复草稿           | 双向 JSON 响应式同步数据流、原子更新互斥锁、纯内存不可变历史快照栈与本地持久化                               |
| **排版物理与自由浮动**   | `PhysicsDashboard.vue`<br>`(Tab 2)`    | 切换垂直重力紧凑与自由浮动双模、操作卡片静态锁控、一键规整 (`tidyLayout`)                        | 碰撞避让、空洞消除算法、锁定项防拖拽防拉伸                                                                   |
| **容器断点与参考辅助线** | `ResponsiveDashboard.vue`<br>`(Tab 3)` | 拖动容器缩放条触发容器查询断点、切换纯 CSS 参考网格虚线、切换暗黑模式                            | 容器查询断点多列自适应 (12/6/2/1 列响应)、纯 CSS 网格对齐、CSS Tokens 主题继承                               |
| **外部物料抽屉拖拽**     | `PaletteDashboard.vue`<br>`(Tab 4)`    | 从右侧物料抽屉拖拽预设卡片至网格画布、测试卡片内部文本选择与点击                                 | `vGridDragIn` 指令、物料悬浮影子与占位框、拖拽手柄保护内部交互事件                                           |
| **ECharts 驾驶舱联动**   | `CockpitDashboard.vue`<br>`(Tab 5)`    | 拖拽与缩放卡片、点击“🔼 折叠 / 🔽 展开”、点击“⛶ 聚焦 / 🗗 还原”、随机刷新数据集                   | `useGridItem()` 尺寸总线、卡片尺寸变动防抖广播、单卡片全视口聚焦无损还原、手风琴高度折叠                     |
| **企业级治理与容灾**     | `GovernanceDashboard.vue`<br>`(Tab 6)` | 切换生产只读态与编辑设计态、注入 18 列越界/负数/重叠脏数据并执行自愈、模拟 Tab 隐藏 (0x0) 与唤醒 | `EditViewDualMode` 生产只读保护、移动端触控轻扫滚动防冲突、`sanitizeLayout()` 纯函数清洗自愈、Tab 唤醒无白屏 |

---

## 4. 全真自动化回归命令

```bash
pnpm --filter @atengk/grid-layout-vue --filter sample-grid-layout-vue typecheck && \
pnpm --filter @atengk/grid-layout-vue --filter sample-grid-layout-vue lint && \
pnpm --filter @atengk/grid-layout-vue --filter sample-grid-layout-vue test && \
pnpm --filter @atengk/grid-layout-vue --filter sample-grid-layout-vue build
```

> 详细原理机制、Props/Options 接口清单与生产边界，请参阅核心子包文档：[@atengk/grid-layout-vue README](../../packages/grid-layout-vue/README.md)。
