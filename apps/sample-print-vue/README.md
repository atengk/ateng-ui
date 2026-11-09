# @atengk/print-vue 打印调度与单据排版自验展厅

> 本工程作为 `@atengk/print-vue` 的 1:1 配套可视化交互自验展厅，固定分配端口 **`3014`**，提供多驱动打印调度、物理纸张排版仿真、分页防撕裂截断、批量并发队列与 C-Lodop 硬件直连的端到端真实交互验证环境。

---

## 一、 展厅核心场景看板矩阵

| 看板编号 | 场景分类                   | 路由 / 视图文件                 | 核心端到端验证重点                                                                                              |
| :------: | :------------------------- | :------------------------------ | :-------------------------------------------------------------------------------------------------------------- |
|  **01**  | **多驱动与样式保真调试**   | `src/views/DriverDebugView.vue` | 验证无头隐藏 iframe 浏览器打印、StyleHarvester 样式深抓取、表单输入值实时克隆、页眉页脚净化与指令/Hook 双模触发 |
|  **02**  | **多规格纸张与排版仿真**   | _(待接入 Ticket 2)_             | 验证 A4/A5/小票/多联单预设、物理毫米标尺 `<AtengPrintRuler />` 与视口 1:1 缩放                                  |
|  **03**  | **长单据分页防撕裂截断**   | _(待接入 Ticket 3)_             | 验证 `autoPaginate` 动态分页引擎、`vPrintNoSplit` 行块保护与 `{ pageIndex, totalPages }` 动态页码注入           |
|  **04**  | **PDF 矢量导出与防爆切片** | _(待接入 Ticket 4)_             | 验证 `PdfExportDriver` 逐页切片光栅化、Canvas 显存释放与跨域图片防污损                                          |
|  **05**  | **批量并发打印队列调度**   | _(待接入 Ticket 5)_             | 验证 `PrintQueueCoordinator` 并发限流、进度响应式条、暂停/继续与失败重试                                        |

---

## 二、 本地快速启动

```bash
# 1. 在仓库根目录下启动展厅服务（自动绑定 3014 端口）
pnpm --filter sample-print-vue dev

# 2. 或在当前目录下直接启动
cd apps/sample-print-vue
pnpm dev
```

启动成功后，浏览器访问 `http://localhost:3014` 即可进入展厅体验。

---

## 三、 四合一门禁验证命令

```bash
pnpm --filter @atengk/print-vue --filter sample-print-vue typecheck && \
pnpm --filter @atengk/print-vue --filter sample-print-vue lint && \
pnpm --filter @atengk/print-vue --filter sample-print-vue test && \
pnpm --filter @atengk/print-vue --filter sample-print-vue build
```

---

## 四、 架构与设计约束

1. **L2 领域纯净律**：展厅作为 L3 宿主消费层，统一引入 Element Plus 处理外围按钮、弹窗与消息提示；下层 `@atengk/print-vue` 保持零 UI 组件硬依赖；
2. **生命周期确定性闭环**：所有打印产生的隐藏 iframe、Blob URL 以及 Canvas 显存均在打印完成后 100% 销毁清理，杜绝连打内存泄露。
