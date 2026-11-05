# sample-file-viewer-vue 专业文档与工程文件渲染自验展厅

> 专注于演示与自验 `@atengk/file-viewer-vue` 核心特性（Word/Excel/PPT/PDF/Markdown/SVG 原生离线渲染、三阶魔数智能类型嗅探、DOM 目录大纲提取、四维 DLP 防泄密、反审查自愈水印、三级弹性离线资产寻址、CAD/3D 动态重型预设插拔、SizeGuard 内存防崩护栏、6 大结构化异常诊断、声明式/命令式多模态弹窗与 WeakMap 阅读状态记忆恢复）在真实业务场景下的开箱使用与交互自验。

---

## 1. 快速启动与服务端口

- **默认固定端口**：`3004` (严格遵守 ADR-0001 / ADR-0009 / CONTEXT-MAP 端口契约)
- **启动方式**：
  ```bash
  pnpm --filter sample-file-viewer-vue dev
  ```
- 启动后浏览器访问：`http://localhost:3004`

---

## 2. 运行环境与 Mock 双模切换

- **默认/CI 模式**：内置 100% 离线自洽的 public 静态预设文件与 Web Worker/WASM 离线资产，无需启动或依赖任何外部物理后端与文件存储服务，即可体验全部核心格式的离线渲染与跑通自动化测试；
- **Local 真实网关模式**：若需直连真实微服务网关或 MinIO 私有化对象存储，在工程根目录创建 `.env.local` 并配置 `VITE_API_BASE_URL`，重启开发服务即可代理直连真实文件流接口（该环境配置文件已被 Git 严格忽略，CI 零风险）。

---

## 3. 核心场景看板与交互索引表

应用启动后，可通过顶部场景导航 Tab 栏快速切换体验以下 8 大自洽场景看板：

| 场景分类                   | 场景看板组件                                   | 核心可视化交互操作                                                                                          | 验证重点                                                                                                           |
| :------------------------- | :--------------------------------------------- | :---------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------- |
| **办公文档渲染与嗅探**     | `src/scenarios/OfficeDocumentScenario.vue`     | 点击切换 Word / Markdown / Excel / PPT / PDF / SVG 预设，或上传任意本地文件                                 | 验证多格式原生离线渲染、零外部依赖解析、三阶智能魔数推导与无后缀流安全解析                                         |
| **DOM 大纲与目录联动**     | `src/scenarios/TableOfContentsScenario.vue`    | 切换长篇协议/指南，点击展开目录大纲，点击章节锚点平滑跳转，切换外部 Mock 注入覆盖                           | 验证 `HeadingSemanticExtractor` 真实 DOM 扫描、复合容器排除、1~6 级树状缩进与外部目录覆盖注入                      |
| **四维 DLP 与自愈水印**    | `src/scenarios/DlpSecurityScenario.vue`        | 勾选/取消下载、打印、复制、右键权限；选择标准文本/旋转高保真水印；点击触发打印测试                          | 验证 Ctrl+S / Ctrl+P 快捷键硬拦截、`@media print` 打印白屏抑制、文字防选防复制与 `MutationObserver` 水印防篡改自愈 |
| **三级资产与预设插拔**     | `src/scenarios/AssetStrategyScenario.vue`      | 切换“本地同源 / 内网 MinIO / 公共 CDN”三级寻址策略，动态勾选 CAD / 3D 渲染器预设                            | 验证三级弹性资产寻址优先级与降级、重型渲染预设解耦动态插拔（DWG/DXF/GLTF）防核心包膨胀                             |
| **百兆内存护栏与进度**     | `src/scenarios/SizeGuardScenario.vue`          | 选择 20MB ~ 500MB 防崩阈值，载入 120MB 虚拟超大文件，点击“强行破除拦截渲染”                                 | 验证超大文件堆内存溢出熔断警告、渐进下载百分比指示、瞬时速率（MB/s）与剩余时间（ETA）计算                          |
| **异常诊断与原地解密**     | `src/scenarios/DiagnosticPasswordScenario.vue` | 点击注入 403 权限受阻、加密 PDF、老旧 .doc 二进制、损坏文件等故障，点击代填密码原地解密                     | 验证 ADR-0004 Blob-JSON 双态拦截、6 大错误分类指引（`DiagnosticClassifier`）与加密文档原地密码解密重试             |
| **多模态声明与命令式弹窗** | `src/scenarios/ModalPreviewScenario.vue`       | 点击唤起 `<AtengFileViewerDialog>` 全屏弹窗（含定制顶栏插槽），或点击通过 `FileViewer.preview` 一行 JS 唤起 | 验证声明式 `v-model` 双向受控、ESC 退出、全屏切换；命令式动态挂载与确定性 DOM 移除销毁零残留                       |
| **无头状态机与状态记忆**   | `src/scenarios/HeadlessStateScenario.vue`      | 点击上/下一页或直达页码、切换 Excel 多个工作表、点击放大/缩小、点击“模拟切 Tab 销毁重绘”                    | 验证 `useFileViewer` 纯无头状态机与指令调度、基于 WeakMap 的 `preserveViewState` 阅读位置秒级自愈复原              |

---

### 💡 高频特色交互与自验热键速查卡

在展厅自验过程中，可通过以下键盘与鼠标微交互秒级体验渲染器的工业级防御特性：

| 特色交互场景              | 触发方式与操作口诀                                                       | 预期交互反馈                                                                     |
| :------------------------ | :----------------------------------------------------------------------- | :------------------------------------------------------------------------------- |
| **快捷键防另存拦截**      | 在启用了 DLP 的场景中，直接按下键盘 `Ctrl + S`（Mac: `Cmd + S`）         | 浏览器默认保存弹窗被物理阻止，状态条显示已拦截保存尝试                           |
| **打印白屏抑制防御**      | 在启用了 DLP 的场景中按下 `Ctrl + P` 或点击“触发打印测试”                | 浏览器打印预览中渲染容器区域强制白屏隐藏（`display: none !important`），杜绝翻拍 |
| **水印反审查自愈**        | 打开 F12 开发者工具，选中水印 DOM 节点并按 `Delete` 删除或修改其样式     | `MutationObserver` 在 1 帧（毫秒级）内原地自愈重建水印节点，篡改无效             |
| **切 Tab 弱引用状态记忆** | 在无头状态机场景中翻到第 3 页并切换至 Sheet 2，点击“模拟切 Tab 销毁重绘” | 组件销毁卸载 300ms 后重新挂载，自动无感复原第 3 页、Sheet 2 与先前的缩放比例     |
| **加密 PDF 原地解密**     | 在异常诊断场景点击“模拟加密 PDF”，出现原地密码输入提示                   | 点击“一键代填密码”或输入 `123456`，状态机立即消费密码并触发原地解密重新渲染      |

---

## 4. 全真自动化回归命令

在自验展厅与核心子包交付前，必须在本地依次执行并通过以下四道全真质量门禁：

```bash
pnpm --filter @atengk/file-viewer-vue --filter sample-file-viewer-vue typecheck && \
pnpm --filter @atengk/file-viewer-vue --filter sample-file-viewer-vue lint && \
pnpm --filter @atengk/file-viewer-vue test && \
pnpm --filter sample-file-viewer-vue build
```

> 详细原理机制、Props/Options 强类型契约清单与生产防御边界，请参阅核心子包权威真理源文档：[@atengk/file-viewer-vue README](../../packages/file-viewer-vue/README.md)。
