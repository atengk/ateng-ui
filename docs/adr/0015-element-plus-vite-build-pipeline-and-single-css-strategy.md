# 0015. @atengk/element-plus 构建管线选型与单一样式产物分发策略

## 状态

Accepted (已接受)

## 背景与决策上下文

在 `ateng-ui` 四层洋葱拓扑中：

- **L0 纯原生核心底座 (`@atengk/core`)** 与 **L1 无头响应式层 (`@atengk/vue`)** 均为纯 TypeScript 逻辑包，采用 `tsup`（基于 esbuild + rollup）能够实现纳秒级的双模构建（ESM + CJS + DTS）；
- **L3 表现与高阶组件层 (`@atengk/element-plus`)** 则是具体的 UI 组件库与指令集，包含大量 Vue 3.5 单文件组件（SFC `.vue`）、`<style scoped lang="scss">` 与 Element Plus 设计令牌绑定。

在此场景下，`tsup` 暴露出对 Vue SFC 模板编译、Scoped 样式抽取与深度 `.vue.d.ts` 类型提取的适配裂痕；此外，在组件库的样式分发策略上，业内长期存在“细粒度按需导入 CSS”与“单一全局 CSS 打包分发”的技术路线分歧。若采用细粒度样式注入，下游应用在动态引入或多组件嵌套时极易遭遇 CSS 层叠加载顺序错乱（Cascading Order Bugs），导致特定覆盖样式失效。

## 架构决策

基于“**工业级稳定、零层叠冲突、强类型闭环、开箱即用**”原则，确立以下架构决策：

1. **构建管线全面迁移至 Vite 库模式**：
   - 移除 `packages/element-plus` 的 `tsup`，统一引入 `vite`（Library Mode）+ `@vitejs/plugin-vue` + `vite-plugin-dts` + `sass`；
   - 产物矩阵锁定为：
     - ESM：`dist/index.js`
     - CJS：`dist/index.cjs`
     - DTS：`dist/index.d.ts`
     - CSS：`dist/index.css`
2. **单一全局样式分发契约 (Single CSS Bundle Contract)**：
   - 组件库所有 SFC 的 Scoped 样式统一由 Vite 提取并压缩输出为单一 CSS 文件 `dist/index.css`；
   - `package.json` 显式声明别名导出：`exports["./style.css"] = "./dist/index.css"`，并严格标注 `"sideEffects": ["*.css", "*.scss"]`；
   - 下游应用只需在入口执行一次 `import '@atengk/element-plus/style.css'` 即可全量生效，彻底消除细粒度样式层叠顺序倒挂隐患。
3. **指令动态恢复与防重拦截协议**：
   - **权限与角色指令 (`v-permission` / `v-role`)**：无权限时采用“注释节点定位锚点（Comment Anchor）”在 DOM 树中留存位置标识；在 `updated` 钩子中侦听到权限/角色动态就绪时，基于锚点将原元素安全插回；
   - **幂等防重指令 (`v-idempotent`)**：采用原生 DOM **捕获阶段（Capture Phase）** 监听机制，在处于时间窗口冷却期或异步 Promise 未决状态时，坚决执行 `event.stopImmediatePropagation()` 阻断一切后续事件，并联动目标按钮的 `is-loading` / `is-disabled` 类名。
4. **自验展厅单功能单页面组织契约**：
   - 自验工程 `apps/sample-element-plus` 引入 `vue-router`，建立标准中后台布局框架（左侧 `<el-menu router>` 导航，右侧 `<router-view>`）；
   - 严禁将所有特性拼凑在单一组件中，每一个组件与指令必须配备专属且自洽的独立页面，正交覆盖常规场景与极端边界。

## 效果与权衡

- **收益**：
  - 终结了 `tsup` 对 Vue SFC 的支持痛点，原生享受 Vite 与 `@vitejs/plugin-vue` 的一流编译生态与精确类型推导；
  - 单一 CSS 产物让下游接入心智负担降至最低，杜绝按需样式竞争与样式加载时序 Bug；
  - 注释锚点与捕获拦截确保了指令在复杂动态数据流与暴力连击下的绝对鲁棒性；
  - 展厅单功能单页面体系为全特性 100% 场景实测与人工验收提供了干净、隔离的自验底座。
- **代价与权衡**：
  - 单一 CSS 产物在下游仅引入单个轻量指令时包含全量组件基础样式（约数十 KB），但在中后台或企业级 Web 系统中，整体样式开销微乎其微，换取了绝对的样式层叠确定性与免配置体验。
