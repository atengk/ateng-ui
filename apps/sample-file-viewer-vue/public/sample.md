# 现代前端工业级架构实践指南

欢迎使用 `@atengk/file-viewer-vue` Markdown 原生流式预览引擎！本组件已全面就绪多级大纲解析、深浅色主题自适应、防泄密水印与全维 DLP 安全隔离。

## 1. 架构定位与四层单向拓扑

面向未来百模块级扩展，仓库内所有模块严格归入四层单向拓扑结构，依赖方向只能自顶向下单向流动（L3 ➔ L2 ➔ L1 ➔ L0）：

- **L0 纯原生核心底座 (`@atengk/core`)**：纯 TypeScript 封装，零 UI、零 Vue、零 React 依赖；
- **L1 无头响应式层 (`@atengk/vue`)**：纯响应式状态机与无头 Hooks 编排；
- **L2 专用能力/领域扩展层 (`@atengk/file-viewer-vue`)**：重型文档、表格、幻灯片与矢量图纸多模态预览引擎；
- **L3 表现与高阶组件层 (`@atengk/element-plus`)**：企业级设计系统与交互套件。

## 2. 核心性能基准与离线化

组件支持 Web Worker 离线解码与 WASM 静态计算，彻底消除主线程阻塞：

| 文件类型             | 渲染引擎                   | Worker 线程               | 预估渲染耗时 |
| :------------------- | :------------------------- | :------------------------ | :----------- |
| Word (`.docx`)       | `@file-viewer/docx`        | `docx.worker.js` (650KB)  | < 30ms       |
| PowerPoint (`.pptx`) | `@file-viewer/pptx`        | `pptx.worker.js` (477KB)  | < 50ms       |
| Excel (`.xlsx`)      | `@file-viewer/spreadsheet` | `sheet.worker.js` (882KB) | < 40ms       |
| PDF (`.pdf`)         | PDF.js Legacy              | `pdf.worker.js` (2.09MB)  | < 60ms       |
| Markdown (`.md`)     | TextRenderer               | 主线程虚拟化流式挂载      | < 10ms       |

### 2.1 雪花 ID 与大数防失真

在处理分布式全局主键时，超过 JavaScript 安全整型（$2^{53}-1$）的数值将在网络反序列化时自动由核心管道转换为强类型字符串。

```typescript
// 示例：雪花 ID 自动字符串化防精度截断
const rawJson = '{"id": 1849382910394857291, "name": "Document"}';
const parsed = transformSnowflakeJson(rawJson);
console.log(typeof parsed.id); // "string"
```

## 3. 安全防护与 DLP 策略

- **防复制 (Copy Protection)**：拦截 `copy`, `cut`, `selectstart` 事件；
- **防打印 (Print Protection)**：注入 `@media print { display: none !important; }`；
- **动态防篡改水印 (Watermark)**：基于 Canvas + MutationObserver 防篡改防移除。

## 4. 总结与展望

`@atengk/file-viewer-vue` 坚持纯原生优先、双轨凭据注入与全链路离线可用，为企业级现代 Web 应用提供极致可靠的文档图纸可视化基座。
