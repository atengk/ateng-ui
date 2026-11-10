# sample-spreadsheet-vue 电子表格引擎与交互自验展厅

> 专注于演示与自验 `@atengk/spreadsheet-vue` 核心特性在真实企业级前端交互场景下的开箱使用、多工作表编排、数据双向绑定与只读审计自验。

---

## 1. 快速启动与服务端口

- **默认固定端口**：`3017`
- **启动方式**：
  ```bash
  pnpm --filter sample-spreadsheet-vue dev
  ```
- 启动后浏览器访问：`http://localhost:3017`

---

## 2. 运行环境与 Mock 双模切换

- **默认/CI 模式**：内置离线自洽 Mock 电子表格数据（包含多工作表、复杂公式计算、部门员工花名册二维列表与财务审计账目），无需启动任何后端服务即可直接体验完整交互与跑通自动化测试；
- **Local 真实网关模式**：复制 `.env.example` 为 `.env.local` 并修改 `VITE_API_BASE_URL`，重启开发服务即可直连真实微服务后端或文件服务（该文件已被 Git 忽略）。

---

## 3. 分层多场景体验与看板索引

| 场景看板标识        | 场景全称                       | 核心演示特性与交互重点                                                                                                                                                          |
| :------------------ | :----------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `FullWorkbookView`  | 全功能多工作表工作簿看板       | 展示全量工具栏、公式栏与底部分页栏；内置跨表公式求和（`SUM(A1:A5)`）；支持动态实时切换冷钛亮色/暗黑主题；支持一键获取并下载 Univer 原始 JSON 快照。                             |
| `CompactGridView`   | 二维网格与对象数组双向绑定看板 | 启用 `mode="compact"` 紧凑极简模式；使用 `SheetDataMapper` 将对象数组双向映射为表格矩阵；支持列定义自动推导与隐藏业务字段保留；编辑表格自动更新业务表单数据。                   |
| `ReadOnlyAuditView` | 只读审计与轻量导出看板         | 启用 `mode="readonly"` 审计锁定状态；拦截单元格双击与公式编辑；支持只读模式下的选区复制与高亮；集成 `SpreadsheetExporter` 支持快速导出带 UTF-8 BOM 的防乱码 CSV 文件。          |
| `ModalDialogView`   | 弹窗编排与 Teleport 隔离看板   | 演示 `<AtengSpreadsheetModal />` 独立弹窗组件；原生 Teleport 隔离防样式污染；支持全屏模式切换；搭载 `SpreadsheetResizeGuard` 实现 0x0 弹窗动画自愈重绘；支持确认/取消双态回调。 |

---

## 4. 常见问题排查与回归自验

### 4.1 自动化质量回归命令

在根目录下执行以下命令完成全要素质量自检：

```bash
# 类型检查
pnpm --filter sample-spreadsheet-vue typecheck

# 代码规范检查
pnpm --filter sample-spreadsheet-vue lint

# 单元与冒烟测试
pnpm --filter sample-spreadsheet-vue test

# 生产环境打包构建
pnpm --filter sample-spreadsheet-vue build
```

### 4.2 常见排查点

1. **暗黑模式主题切换**：
   - 展厅顶部提供了全局明暗模式切换按钮，动态修改 `document.documentElement` 的 `dark` 类名。
   - `useSpreadsheetThemeSync` 会通过 `MutationObserver` 自动感知并同步 Univer 原生暗黑配色。
2. **弹窗内首次展开布局异常**：
   - 若在动画或 display: none 切换时挂载表格，容器可能捕获到 0x0 尺寸；内置的 `SpreadsheetResizeGuard` 会在容器尺寸恢复大于 0 时自动调度 Resize 事件自愈。
3. **CSV 导出在 Excel 中中文乱码**：
   - `SpreadsheetExporter` 默认写入 `\uFEFF` UTF-8 BOM 头，确保 Microsoft Excel 打开时不发生字符集乱码。
