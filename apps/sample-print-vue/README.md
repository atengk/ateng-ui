# sample-print-vue 打印调度与排版自验展厅

> 专注于演示与自验 `@atengk/print-vue` 核心特性在真实企业级单据排版与多驱动打印场景下的开箱使用与交互自验。

---

## 1. 快速启动与服务端口

- **默认固定端口**：`3014`
- **启动方式**：
  ```bash
  pnpm --filter sample-print-vue dev
  ```
- 启动后浏览器访问：`http://localhost:3014`

---

## 2. 运行环境与 Mock 双模切换

- **默认/CI 模式**：内置离线自洽模拟数据与本地 Mock 打印机驱动环境，无需依赖物理外设与后端服务即可直接体验多驱动切换、分页防撕裂、批量队列并发与 4 大高频单据预设排版；
- **硬件实装联调模式**：启动本地 C-Lodop 服务（默认端口 8000 / 18000 / 8443），打开展厅看板 5，即可直连本地物理针式/热敏打印机并执行连续走纸与偏移行校准。

---

## 3. 核心场景看板与交互路由表

| 场景分类                         | 场景看板组件 / 路由路径            | 核心可视化交互操作                                                    | 验证重点                                                                                       |
| :------------------------------- | :--------------------------------- | :-------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------- |
| **01. 多驱动与样式保真调试**     | `src/views/DriverDebugView.vue`    | 切换 iframe 浏览器打印与 PDF 导出，修改表单内容并点击打印             | 样式深抓取、表单输入值实时克隆、页眉页脚净化、PDF 逐页切片与 Canvas 显存释放                   |
| **02. 多规格纸张与单据预设仿真** | `src/views/StandardSheetsView.vue` | 切换 A4/A5/小票纸张预设、毫米标尺，并切换发票/小票/面单/标签 4 大预设 | 物理毫米标尺、视口缩放、微调偏移平移、强制分页符 `<AtengPrintBreak />` 与 4 大高频单据开箱即用 |
| **03. 长单据动态分页防撕裂**     | `src/views/PaginationView.vue`     | 切换 20~100 行动态长表格，观察分页防撕裂计算与页眉页脚注入            | `autoPaginate` 引擎 DOM 高度度量、`v-print-no-split` 行块保护、跨页续表头与动态总页数计算      |
| **04. 批量并发打印队列调度**     | `src/views/BatchQueueView.vue`     | 设定并发通道数 (1~10)，添加 5~20 个批量任务，执行启动/暂停/恢复/重试  | `PrintQueueCoordinator` 并发限流、响应式进度条、错误重试与通道熔断防卡死                       |
| **05. C-Lodop 硬件直连与控制台** | `src/views/LodopTerminalView.vue`  | 探测本地 C-Lodop 服务端口，枚举可用打印机，交互拖拽十字偏移行校准器   | 硬件端口探针、走纸偏移 `(offsetX, offsetY)`、`<AtengPrintCalibrator />` 与矢量电子印章加盖     |

---

## 4. 全真自动化回归命令

```bash
pnpm --filter @atengk/print-vue --filter sample-print-vue typecheck && \
pnpm --filter @atengk/print-vue --filter sample-print-vue lint && \
pnpm --filter @atengk/print-vue --filter sample-print-vue test && \
pnpm --filter @atengk/print-vue --filter sample-print-vue build
```

> 详细原理机制、Props/Options 接口清单与生产边界，请参阅核心子包文档：[@atengk/print-vue README](../../packages/print-vue/README.md)。
