# @atengk/vue

面向现代 Web 应用与企业级中后台的 Vue 3 响应式通用 Composables/Hooks 基础设施。

---

## 维度零：特性与公共 API 全景速查矩阵

| 特性分类     | 特性名称     | 核心门面 / 方法 / Hook | 关键参数 / 返回类型 | 核心行为说明             | 锚定验证源头 (*Test / Sample)         |
| :----------- | :----------- | :--------------------- | :------------------ | :----------------------- | :------------------------------------ |
| **基础导出** | 基线版本标识 | `VERSION`              | `string`            | 导出当前模块编译版本基线 | [index.test.ts](./test/index.test.ts) |

---

## 维度一：最小起步体验 (Happy Path)

### 安装依赖

```bash
pnpm add @atengk/core @atengk/vue vue
```

### 快速接入

```ts
import { VERSION } from '@atengk/vue';

console.log(`@atengk/vue 当前版本: ${VERSION}`);
```

---

## 维度二：生产扩展接管 (Customization & Extensibility)

待具体业务特性（如通用分页状态机、防抖节流 Hook 等）落地后，1:1 逆向提取自对应 Sample 工程。

---

## 维度三：核心生产边界与非功能语义 (Production Boundary)

- **Vue 3.5 响应式解构入参契约**：所有 Composables 入参必须声明为 `MaybeRefOrGetter<T>`，内部统一由 Vue 原生 `toValue(param)` 解包，彻底根除响应性丢失陷阱；
- **确定性生命周期清理**：物理监听与定时器必须在 `onScopeDispose` 或 `onUnmounted` 中确定性解绑。

---

## 维度四：物理排版与代码全真验证

所有示例均经过内部单元测试与 `apps/sample-vue` 1:1 真实运行验证。
