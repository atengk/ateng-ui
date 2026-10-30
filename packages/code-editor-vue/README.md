# @atengk/code-editor-vue

面向现代 Web 应用与企业级系统的高保真代码/SQL/JSON 编辑器、双模 Diff 差异比对容器与受管多文件 TextModel 模型池基础设施（L2 专用能力扩展层）。

---

## 维度零：特性与公共 API 全景速查矩阵

| 特性分类         | 特性名称                  | 核心门面 / 组件 / Hook                                                                                          | 关键参数 / Props / Emits                                    | 核心行为说明                                                                    | 锚定验证源头 (*Test / Sample)                                                                                                                                      |
| :--------------- | :------------------------ | :-------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------- | :------------------------------------------------------------------------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **单体编辑器**   | 单体代码表现容器          | `AtengCodeEditor`                                                                                               | `v-model, language, theme, readOnly, highlightLines...`     | 集成顶部微操作栏、底部状态栏、暗黑热跟随与 0x0 几何自愈的高阶容器               | [AtengCodeEditor.test.ts](./test/AtengCodeEditor.test.ts) · [BasicCodeEditorScenario](../../apps/sample-code-editor-vue/src/scenarios/BasicCodeEditorScenario.vue) |
| **单体编辑器**   | 单体编辑器实例类型        | `AtengCodeEditorInstance`                                                                                       | 类型定义                                                    | 单体组件收敛暴露的 Ref 实例类型 (`InstanceType<typeof AtengCodeEditor>`)        | [AtengCodeEditor.test.ts](./test/AtengCodeEditor.test.ts)                                                                                                          |
| **单体编辑器**   | 单体编辑器无头状态机      | `useCodeEditor`                                                                                                 | `(containerRef, options) => UseCodeEditorReturn`            | Monaco 原生实例无头管理，响应式解耦防线 (`shallowRef` + `markRaw`)              | [useCodeEditor.test.ts](./test/useCodeEditor.test.ts) · [reactiveDecoupling.test.ts](./test/reactiveDecoupling.test.ts)                                            |
| **Diff 对比**    | 双模 Diff 对比表现容器    | `AtengCodeDiffEditor`                                                                                           | `v-model:original, v-model:modified, diffMode, language...` | 支持并排 (split) 与行内 (inline) 双模无损切换、增删行数统计与差异导航的高阶容器 | [diffEditor.test.ts](./test/diffEditor.test.ts) · [CodeDiffCompareScenario](../../apps/sample-code-editor-vue/src/scenarios/CodeDiffCompareScenario.vue)           |
| **Diff 对比**    | 双模 Diff 组件实例类型    | `AtengCodeDiffEditorInstance`                                                                                   | 类型定义                                                    | Diff 组件收敛暴露的 Ref 实例类型 (`InstanceType<typeof AtengCodeDiffEditor>`)   | [diffEditor.test.ts](./test/diffEditor.test.ts)                                                                                                                    |
| **Diff 对比**    | 双模 Diff 无头状态机      | `useCodeDiff`, `useCodeDiffEditor`                                                                              | `(containerRef, options) => UseCodeDiffReturn`              | 原生 DiffEditor 与双 Model 响应式解耦管理，差异导航与事件托管                   | [diffEditor.test.ts](./test/diffEditor.test.ts) · [CodeDiffCompareScenario](../../apps/sample-code-editor-vue/src/scenarios/CodeDiffCompareScenario.vue)           |
| **Diff 对比**    | Diff 增删行数统计工具     | `computeDiffStats`                                                                                              | `(lineChanges) => DiffStats`                                | 基于 Monaco `ILineChange[]` 精准计算新增行、删除行与差异块总数                  | [diffEditor.test.ts](./test/diffEditor.test.ts)                                                                                                                    |
| **模型池管理**   | 多文件 TextModel 模型池   | `createModel, setModel, disposeModel, getActiveModel, getModels, saveViewState, restoreViewState`               | `(val, lang?, uri?) => ITextModel`, `(modelOrUri) => void`  | 单底座 Canvas 瞬时切换多文件代码，独立保留各文件撤销历史与光标选区              | [modelPool.test.ts](./test/modelPool.test.ts) · [BasicCodeEditorScenario](../../apps/sample-code-editor-vue/src/scenarios/BasicCodeEditorScenario.vue)             |
| **Worker 调度**  | 三级弹性 Worker SPI       | `setupMonacoWorkers`                                                                                            | `(options?: MonacoWorkerOptions) => void`                   | 自定义 Worker、静态 CDN URL 与单线程降级三级弹性寻址防线                        | [workers.test.ts](./test/workers.test.ts) · [ADR-0035](../../docs/adr/0035-code-editor-vue-l2-architecture-and-monaco-governance.md)                               |
| **Worker 调度**  | Vite ESM 原生 Worker 助手 | `setupViteMonacoWorkers`                                                                                        | `(workers: ViteMonacoWorkerConstructors) => void`           | 便捷注册 Vite `?worker` 原生 ESM Web Worker 构造器                              | [workers.test.ts](./test/workers.test.ts) · [workers/index.ts](./src/workers/index.ts)                                                                             |
| **主题感知**     | 主题热跟随无头状态机      | `useEditorTheme`                                                                                                | `(themeGetter) => UseEditorThemeReturn`                     | 监听 `html.dark` 与系统色彩方案，0ms 零闪烁调用 `monaco.editor.setTheme`        | [useEditorTheme.ts](./src/composables/useEditorTheme.ts) · [AtengCodeEditor.test.ts](./test/AtengCodeEditor.test.ts)                                               |
| **智能补全**     | 受管补全注册中心          | `CompletionRegistry`, `registerCompletionProvider`                                                              | `(language, provider) => IDisposable`                       | 纳管全局 Monaco 补全项，支持单个注销与全量集中释放，杜绝跨页面泄露              | [completion/registry.ts](./src/completion/registry.ts) · [sqlAndSchema.test.ts](./test/sqlAndSchema.test.ts)                                                       |
| **SQL 专用能力** | 轻量 SQL 美化算法         | `formatSql`                                                                                                     | `(sql: string) => string`                                   | 原生状态机词法切分，标准大写关键字、逗号换行与缩进排版，安全隔离字符串与注释    | [sqlAndSchema.test.ts](./test/sqlAndSchema.test.ts) · [SqlFormattingScenario](../../apps/sample-code-editor-vue/src/scenarios/SqlFormattingScenario.vue)           |
| **SQL 专用能力** | SQL 格式化 SPI 扩展       | `SqlFormatProvider`                                                                                             | `(sql: string) => Promise<string> \| string`                | 允许外部接管或注入专用远程/重型 SQL 格式化引擎                                  | [sqlAndSchema.test.ts](./test/sqlAndSchema.test.ts) · [SqlFormattingScenario](../../apps/sample-code-editor-vue/src/scenarios/SqlFormattingScenario.vue)           |
| **类型契约**     | 核心语言枚举与契约        | `CodeLanguage`, `EditorTheme`, `DiffMode`, `DiffStats`                                                          | 类型定义                                                    | 常用支持语言、主题模式、Diff 对比视图模式与增删行数实体契约                     | [types/index.ts](./src/types/index.ts)                                                                                                                             |
| **类型契约**     | 编辑器配置与暴露接口      | `CodeEditorProps`, `CodeEditorEmits`, `CodeEditorExpose`, `UseCodeEditorOptions`, `UseCodeEditorReturn`         | 接口定义                                                    | 单体组件输入参数、事件声明与收敛导出的 Ref 实例操作契约                         | [types/index.ts](./src/types/index.ts)                                                                                                                             |
| **类型契约**     | Diff 配置与暴露接口       | `CodeDiffEditorProps`, `CodeDiffEditorEmits`, `CodeDiffEditorExpose`, `UseCodeDiffOptions`, `UseCodeDiffReturn` | 接口定义                                                    | Diff 组件输入参数、事件声明与收敛导出的 Ref 实例操作契约                        | [types/index.ts](./src/types/index.ts)                                                                                                                             |
| **类型契约**     | 智能补全与 Worker 接口    | `CompletionProviderFn`, `MonacoWorkerOptions`, `ViteMonacoWorkerConstructors`, `UseEditorThemeReturn`           | 类型定义                                                    | 自定义代码智能补全提供者契约与 Worker 映射配置构造器契约                        | [types/index.ts](./src/types/index.ts) · [workers/index.ts](./src/workers/index.ts)                                                                                |

---

## 维度一：最小起步体验 (Happy Path)

### 安装依赖

```bash
pnpm add @atengk/code-editor-vue monaco-editor
```

### 1. 单体代码编辑器开箱即用

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { AtengCodeEditor } from '@atengk/code-editor-vue';

const code = ref('const greeting = "Hello ateng-ui";\nconsole.log(greeting);');
</script>

<template>
  <AtengCodeEditor v-model="code" language="typescript" theme="auto" height="360px" />
</template>
```

### 2. 双模 Diff 差异比对编辑器起步

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { AtengCodeDiffEditor } from '@atengk/code-editor-vue';

const original = ref('export const version = "1.0.0";\nexport const env = "dev";');
const modified = ref(
  'export const version = "1.1.0";\nexport const env = "production";\nexport const cluster = "cn-east-01";',
);
const diffMode = ref<'split' | 'inline'>('split');
</script>

<template>
  <AtengCodeDiffEditor
    v-model:original="original"
    v-model:modified="modified"
    :diff-mode="diffMode"
    language="typescript"
    theme="auto"
    height="480px"
  />
</template>
```

---

## 维度二：生产扩展接管 (Customization & Extensibility)

### 1. 自定义内网 CDN Worker SPI 寻址与 Vite 原生 ESM Worker 助手

针对企业私网与离线隔离环境，可显式配置 Worker CDN 路径或强制单线程回退：

```ts
import { setupMonacoWorkers } from '@atengk/code-editor-vue';

setupMonacoWorkers({
  // 方式一：指定静态内网 CDN 根路径
  workerBaseUrl: 'https://cdn.internal.company.com/monaco-workers/',

  // 方式二：完全自定义动态 Worker 实例工厂
  getWorker: (workerId, label) => {
    return new Worker(`/assets/workers/${label}.worker.js`, { type: 'module' });
  },

  // 方式三：极简兼容环境强制主线程单线程模式
  forceSingleThread: false,
});
```

针对现代 Vite 项目，可直接引入 Monaco 官方 Worker 模块并通过 `setupViteMonacoWorkers` 一行注入：

```ts
import { setupViteMonacoWorkers } from '@atengk/code-editor-vue';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

setupViteMonacoWorkers({
  editorWorker: EditorWorker,
  jsonWorker: JsonWorker,
  tsWorker: TsWorker,
});
```

### 2. 外部接管 SQL 格式化与智能补全

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { AtengCodeEditor, type CompletionProviderFn } from '@atengk/code-editor-vue';

const sqlCode = ref('SELECT id, name FROM sys_user WHERE status = 1;');

// 自定义智能补全项注入（受管生命周期，组件卸载时自动注销）
const customCompletions: CompletionProviderFn = (model, position) => {
  return [
    {
      label: 'sys_tenant',
      kind: 14, // monaco.languages.CompletionItemKind.Keyword
      insertText: 'sys_tenant',
      detail: '多租户管理核心表',
    },
  ];
};
</script>

<template>
  <AtengCodeEditor
    v-model="sqlCode"
    language="sql"
    :completion-provider="customCompletions"
    height="400px"
  />
</template>
```

### 3. 多文件 TextModel 模型池秒切与状态保持

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { AtengCodeEditor, type AtengCodeEditorInstance } from '@atengk/code-editor-vue';

const editorRef = ref<AtengCodeEditorInstance | null>(null);

onMounted(() => {
  if (!editorRef.value) return;

  // 1. 在模型池中预载多个脚本文件
  editorRef.value.createModel('const a = 100;', 'typescript', 'file:///app/main.ts');
  editorRef.value.createModel('{"version": "1.0.0"}', 'json', 'file:///app/config.json');

  // 2. 毫秒级瞬时切换活动模型（平滑保留各文件独立光标位置与撤销历史栈）
  editorRef.value.setModel('file:///app/config.json');
});
</script>

<template>
  <AtengCodeEditor ref="editorRef" height="400px" />
</template>
```

---

## 维度三：核心生产边界与非功能语义 (Production Boundary & Invariants)

1. **响应式解耦防线 (Reactive Decoupling Invariant)**：
   - Monaco Editor 与 DiffEditor 原生实例包含深层复杂的私有作用域与循环引用。本套件中所有实例与 TextModel **强制采用 `shallowRef` + `markRaw` 封装**，单测断言 `isReactive === false`，彻底杜绝 Vue 响应式 Proxy 深度劫持导致的内存爆仓与调用栈溢出。
2. **0x0 视口几何自愈状态机 (0x0 Viewport Geometry & Layout Healing)**：
   - 当编辑器处于隐藏 Tab、折叠面板或未打开的弹窗/抽屉中时，视口尺寸为 `0x0`；
   - 内置 `checkViewportSuspension` 状态机自动将视口置为挂起（`isSuspended`），暂停高开销的 `layout()` 计算；
   - 通过 `ResizeObserver` 探测到容器恢复可见时，通过 `healLayout()` 确定性自愈重算布局，杜绝样式折叠与行号错位。
3. **确定性生命周期治理防线 (Deterministic Lifecycle Governance)**：
   - 卸载时严格遵循 Monaco 安全注销时序：优先解除 DiffEditor 挂载的 Model（`setModel(null)` 并 `dispose`），再安全清理 TextModel；
   - 100% 解除 `ResizeObserver`、DOM `MutationObserver`、系统色彩方案媒体查询监听与补全 Provider 句柄，杜绝内存泄漏与幽灵回调。
4. **增量编辑光标保护管道 (Incremental Cursor Preservation)**：
   - 外部响应式更新绑定代码时，底层通过单次原子替换编辑（`executeEdits`）增量注入 Undo 栈，100% 保持当前光标行号、列号与选区，杜绝跳行跳字。
5. **模型池多文件状态自洽不变量 (Model Pool & State Isolation Invariant)**：
   - 单 Canvas 底座支持复用切换多 TextModel，不同文件间独立保留各自的 Undo/Redo 历史记录与光标选区视图状态；
   - 组件卸载或调用 `dispose()` 时，受管模型池内所有 TextModel 100% 确定性销毁，杜绝幽灵内存驻留。

---

## 维度四：物理排版与代码全真验证 (Evergreen & Hermetic Testing)

- **单测自洽**：所有用例严格遵循全自洽单测 3 项铁律，Canvas 2D 上下文完全离线隔离，测试后严格清理 DOM 与全局状态。
- **自验工程**：1:1 独立镜像工程位于 `apps/sample-code-editor-vue`（端口 3008），6 大真实沙箱端到端运行验证。
