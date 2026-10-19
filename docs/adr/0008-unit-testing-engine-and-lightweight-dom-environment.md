# 0008. 单元测试引擎与轻量 DOM 运行环境选型

## 状态

Accepted (已接受)

## 背景与决策上下文

作为面向工业级生产交付的前端基础设施套件，`ateng-ui` 恪守测试驱动开发（TDD）与对抗性极限用例守护契约。
在前端单测体系中，传统 Jest 体系存在两大痛点：

1. **ESM 与 Vite 管道分裂**：Jest 内部采用独立的代码转换机制，与 Vite 的打包和预构建管道存在割裂，需额外维护复杂的 `babel-jest` / `ts-jest` 配置；
2. **`jsdom` 内存开销过重**：`jsdom` 试图在 Node.js 中 100% 完整模拟完整浏览器对象树，在多包并发单测时内存急剧飙升，容易发生 OOM 或执行卡顿。

## 架构决策

1. **统一选用 Vitest 2.x 作为单测执行引擎**：
   - 与 Vite 6 共享底层编译流水线与模块图（Module Graph），实现秒级热更新测试反馈；
   - 根目录引入 `vitest.workspace.ts` 实施 Monorepo 多包并行调度；
2. **纯 TS 核心包与 UI 组件包环境按需隔离**：
   - **`@atengk/core`**：运行于纯净原生 `node` 运行环境，杜绝无意义的 DOM 模拟开销；
   - **`@atengk/vue` 与 `@atengk/element-plus`**：统一运行于 **`happy-dom`** 轻量 DOM 环境，并集成 `@vue/test-utils`；
3. **全自洽单测铁律执行保证**：
   - 测试必须完全离线可运行；
   - 挂载组件必须在 `afterEach` 中通过 `wrapper.unmount()` 确定性销毁；
   - 杜绝跨用例状态继承污染。

## 效果与权衡

- **收益**：
  - 启动测试比 Jest 快 3~5 倍，内存占用降低约 70%；
  - 完美复用现有 TypeScript 与 Vite 配置，无需维护两套编译工具链。
- **代价**：
  - `happy-dom` 针对个别极冷门的 Canvas/WebGL 伪物理渲染支持略逊于重量级 `jsdom`，但中后台逻辑与组件单测场景下完全不受影响。
