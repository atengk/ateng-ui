# 0002. Vue 3.5 核心基线升级与响应式解构传参契约

## 状态

Accepted (已接受)

## 背景与决策上下文

Vue 3.5 正式稳定了“响应式 Props 解构 (Reactive Props Destructure)”，消除了 Vue 3.4 必须依赖 `toRefs` 与 `withDefaults` 宏的繁琐样板；同时内部重构了响应式依赖追踪，内存消耗大幅降低 56%，并在大型数组遍历操作上实现了高达 10 倍的性能突破。

然而，在开发通用无头 Composables 库（`@atengk/vue`）时，若调用方将解构后的响应式 Prop 作为参数传入函数（如 `useRequest(userId)`），编译器仅会传入当下的静态基础类型值，导致 Composable 内部永久丢失响应性追踪。

## 架构决策

1. **基线升级**：所有子包与自验工程全面将 Vue 最低兼容基线由 `^3.4.0` 提至 **`^3.5.0`**（`peerDependencies` 显式声明）；
2. **入参规范**：`@atengk/vue` 导出的所有公共 Composables 入参必须声明为 `MaybeRefOrGetter<T>` 类型，内部统一使用 Vue 原生 `toValue(param)` 进行安全解包并建立响应依赖；
3. **调用规范**：对于解构 Prop，调用方统一通过 Getter 箭头函数传入（如 `usePagination(() => pageSize)`）；
4. **生命周期协同**：异步请求与副作用监听深度整合 Vue 3.5 原生 `onWatcherCleanup` 与 `useTemplateRef`，保障九道防线中的“确定性生命周期清理”。

## 效果与权衡

- **收益**：大型表格（`AtengTable`）渲染性能大幅跃升，彻底杜绝解构丢失响应性的隐性 Bug。
- **代价**：不再兼容低于 3.5.0 的旧版 Vue 3 宿主环境。
