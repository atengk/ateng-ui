# ADR-0032: 文档目录大纲 (TOC) 专有标题语义提取与层级渲染契约

- **状态**：已采纳 (Accepted)
- **责任人**：@Ateng
- **提出日期**：2026-10-26
- **对齐规范**：[AGENTS.md](../../AGENTS.md) 工业级成熟度防线、[ADR-0031](./0031-file-viewer-network-fetch-transport-and-asset-offline-strategy.md)

---

## 1. 背景与业务痛点 (Context & Problem Statement)

在 `@atengk/file-viewer-vue` 的多格式文档预览场景中，左侧大纲栏（Table of Contents, TOC）原实现存在严重的数据污染与层级错配问题：

1. **底层检索 API 语义混淆**：原实现优先尝试调用底层渲染器的 `collectDocumentAnchors()` 方法。经源码逆向，该 API 的设计目标为“文档全文检索分块定位点（Search Text Anchors）”，会将整篇文档的组合全量文本以及每个普通正文段落（如普通 `<p>`）作为搜索切片一并输出，导致大纲被非标题正文和复合容器严重污染；
2. **复合容器与正文误收录**：原兜底 DOM 扫描选择器过于宽松，将父级容器（`<article>`, `<section>`）和普通正文误当成标题收录，甚至提取出拼合全文的巨型伪大纲项；
3. **层级与缩进缺失**：原大纲抽屉采用纯单层平铺列表，缺乏 H1~H6 的树状层级缩进，无法反映文档的多级章节结构；
4. **无标题文档缺乏优雅保底**：当用户上传纯正文文档时，抽屉内行为不确定，缺乏明确的无大纲空状态提示。

---

## 2. 决策考量与架构权衡 (Decision Drivers & Trade-Offs)

- **真实大纲 vs 全文分块**：严格区分“章节目录（TOC / Headings）”与“搜索分块（Search Anchors）”，绝不复用全文搜索的锚点切片；
- **确定性语义过滤**：只有真正的标题（具有 Heading 样式名、HTML 标题标签、Bookmark/Heading 锚点）才能进入目录大纲，绝对禁止收录复合大容器与普通正文；
- **层级化视觉传达**：支持依据 `level` 动态计算树状缩进与指示标识，直观展现多级主次从属关系；
- **优雅空状态防御**：纯正文文档保底呈现语义化空状态，顶栏大纲徽标计数明确归零。

---

## 3. 决策决议 (Decision Outcome)

确立以下三条目录大纲架构不变量与技术契约：

### 规则一：建立专有标题特征提取器（Title-Only Semantic Extractor）

- 彻底废除将底层全文检索接口 `collectDocumentAnchors()` 作为目录大纲数据源的错误逻辑；
- 建立独立的 `extractDocumentHeadings` 语义提取算法：
  - **白名单规则**：仅匹配 HTML 标题标签（`h1~h6`）、Word (docx-preview) 真实标题锚点（`p[id*="heading-"]`、`p[class*="heading"]`、`p[class*="Heading"]`、`p[data-docx-toc-entry="true"]`）以及 Markdown 标题（`.markdown-heading`）；
  - **黑名单规则**：严格排除带有子节点的复合容器（`article`, `section`, `div`），严格排除文本长度超过 150 字符的大段段落；
  - **锚点注入**：若元素缺乏 `id`，由提取器自动赋予全局唯一的确定性锚点 ID（`at-fv-toc-{index}`），确保平滑滚动精准锚定。

### 规则二：层级化缩进与平滑滚动导航（Hierarchical Tree & Smooth Scroll）

- 在 `FileViewerDocumentAnchor` 类型契约中显式扩展 `level?: number`（1 ~ 6）；
- 视图层基于 `padding-left: calc((level - 1) * 14px)` 实现多级递进缩进，并配备主次层级视觉符号；
- 点击大纲项时，通过 `element.scrollIntoView({ behavior: 'smooth', block: 'start' })` 实现毫秒级平滑定位。

### 规则三：无标题优雅空状态保底（Empty State Resilience）

- 当文档经扫描无任何有效标题时，大纲列表清空为 `[]`；
- 抽屉内部展示标准空状态插槽：“当前文档未设置大纲标题”，工具栏大纲计数明确标识为 `(0)`，杜绝伪标题误导用户。

---

## 4. 架构影响与效益 (Consequences & Impact)

- **正面收益**：
  - 彻底根治 Word/Markdown 左侧大纲出现拼合全文与普通正文的严重缺陷；
  - 大纲目录 100% 忠实对齐 Word 与 Markdown 原始文档的真实 Heading 层级；
  - 提取器模块独立解耦（`packages/file-viewer/src/utils/toc.ts`），享受 100% 独立的单元测试守护。
- **负面代价与约束**：
  - 若文档作者未在 Word 中使用标准“标题样式”而仅通过手动调大字号和加粗，将不会被收录为正式大纲（此为符合 Word 官方标准的确定性预期行为）。
