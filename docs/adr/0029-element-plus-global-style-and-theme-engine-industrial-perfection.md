# 0029. Element Plus 全局样式体系与现代多主题引擎工业级全维优化架构

## 状态

Accepted (已接受)

## 背景与决策上下文

在现存 `@atengk/element-plus` 的样式与主题体系中，经历了早期功能性积累后，全景样式覆盖度已达 80+ 原生组件。但在高复杂度企业级微服务、多租户深色控制台及前沿 AI 大模型交互落地场景中，暴露出以下 6 类结构性深层隐患：

1. **暗黑模式单一数据源 (SSOT) 破坏与硬编码暗色泄露**：
   - 超过 80 处暗黑选择器（如 `.el-dialog`、`.el-card`、`.el-input` 等）硬编码了 `#0c1017`、`#121824`、`#151b26` 等物理 Hex 值；当上层企业需要定制深蓝黑、纯黑（OLED）、或深灰背景色时，无法通过 `--el-bg-color` 等标准 CSS 变量统一覆盖，导致暗黑层级脱节；
2. **多主题作用域机制 (Scoping) 脆弱**：
   - 依赖全局 `html.dark` 单一根节点，无法支持多租户同屏微前端局部深色卡片（如暗黑看板混排）或局部 `[data-theme]` 科技预设子树；
3. **官方原生组件美化缺位**：
   - `ElPageHeader`、`ElBacktop`、`ElCheckTag`、`ElStatistic` 等常用原生组件未纳入 ThemePro 美化，其原生默认样式与整体 Linear/Obsidian 质感格格不入；
4. **运行时换肤算法白化失真**：
   - `setThemeColor(hex)` 默认演算 `light-1..9` 阶梯时固定与纯白 `#ffffff` 混合；内联样式的高优先级在暗黑模式下直接将 `--el-color-primary-light-9` 变为刺眼的淡白粉（如 `#eef2ff`），使表格选中行与激活节点失真；
5. **现代 CSS 标准与非功能性体验断层**：
   - 物理方向外边距（如 `margin-left`、`border-left`）未全面迁移至 W3C Logical Properties（`margin-inline-start` 等）；
   - 缺乏全局字体平滑优化（`-webkit-font-smoothing`）；
   - 缺乏现代媒体查询全景守卫（`prefers-reduced-motion` 动效减弱、`forced-colors` Windows 高对比度、`@media print` 打印优化、触屏细滚动条防误触 `pointer: coarse`）；
   - 模式切换瞬间未冻结 CSS 过渡，造成全屏重绘卡顿（Transition Storm）；
6. **Z-Index 与全局令牌缺乏统一梯度**：
   - 吸顶、悬浮、遮罩、顶栏加载条等出现 `99999` 魔法值，缺乏全局 `--at-z-index-*` 阶梯规范；
   - 移动端 PWA/iOS 视口底部安全区未防御。

## 架构决策

遵循“**设计令牌单一数据源、子树级多主题穿透、W3C 逻辑属性、无障碍与媒体查询全景守卫、全生命周期客户端主题编排**”原则，确立以下 18 项工业级架构决策：

### 1. 暗黑模式单一数据源 (SSOT) 彻底收敛

- **全局 CSS 变量对齐**：
  所有组件暗黑模式选择器中的硬编码物理颜色（`#0c1017`、`#121824` 等）彻底替换为标准 Element Plus 变量或 `@atengk` 派生设计令牌：
  - 页面背景：`var(--el-bg-color-page)`
  - 容器底色：`var(--el-bg-color)`
  - 浮层与下拉：`var(--el-bg-color-overlay)`
  - 半透实体毛玻璃：`var(--at-bg-overlay-translucent)`
  - 填充与悬停：`var(--el-fill-color-*)`
- **单测质量门禁熔断**：
  在 `themeBundle.test.ts` 中新增暗黑模式 SSOT 治理校验，组件选择器内部出现 `background-color:#0c1017` 等硬编码泄露直接断言失败。

### 2. 双轨根选择器与子树局部多主题作用域

- **选择器双轨升级**：
  全量子模块暗黑模式选择器由脆弱的 `html.dark .el-*` 全面升级为：
  ```scss
  :root.dark,
  .dark {
    .el-xxx { ... }
  }
  ```
- **科技预设子树穿透**：
  `[data-theme]` 预设（`indigo`, `emerald`, `violet`, `ocean`, `rose`）解除 `:root` 单一绑定，允许挂载于任意 DOM 子容器（如 `<div data-theme="ocean">`），微前端子应用或局部看板无需全站切换即可呈现专属品牌色。

### 3. 官方缺位组件全量美化入驻

- **ElPageHeader**：精简圆润返回按钮，具备 0.15s 阻尼微动，副标题与面包屑对齐，暗黑模式边框柔化；
- **ElBacktop**：数控圆角或圆形浮岛，实体半透明底色，硬件加速悬浮提升与点击微回弹；
- **ElCheckTag**：Soft Pill 软药丸圆角，未选中态冷灰微边框，选中态主题色微渐变发光；
- **ElStatistic**：数字与正负号 100% 开启 `font-variant-numeric: tabular-nums; font-feature-settings: 'tnum';`，杜绝动态翻牌跳跃抖动。

### 4. 键盘无障碍 (Focus-Visible) 全链路闭环

- 为 `ElTabs__item`、`ElAnchor__link`、`ElPagination` 翻页器与页码按钮、`ElDropdownItem` 等组件补齐 `:focus-visible` 样式；
- 统一使用 `var(--at-shadow-focus-ring)` 双层激光微光环，杜绝浏览器原生突兀黑色方框，键盘可访问性（A11y）达标。

### 5. W3C 逻辑属性与全终端响应式

- 头像组重叠负边距迁移为 `margin-inline-start: -8px;`；
- 小红点微标、折叠指示迁移为 `padding-inline-start` 与 `inset-inline-start`；
- 吸底操作栏 `AtengFooterBar` 注入 `padding-bottom: max(0px, env(safe-area-inset-bottom, 0px));`，天然兼容 iPhone/iPad 全面屏底条。

### 6. 全局排版与视网膜渲染优化

- 在 `html, body` 顶层注入全局视网膜抗锯齿平滑渲染：
  ```scss
  html,
  body {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }
  ```

### 7. 媒体查询全景守卫与动效风暴防御

- **减弱动效守卫 (prefers-reduced-motion)**：
  在用户系统开启减弱动效时，将全局动画与平滑滚动时长降至毫秒级（0.01ms），杜绝眩晕困扰；
- **Windows 高对比度守护 (forced-colors: active)**：
  关键边框与焦点环统一使用 `CanvasText`、`Highlight`、`ButtonBorder` 等系统系统颜色，杜绝视障辅助模式下界面消失；
- **专业打印优化 (@media print)**：
  隐藏操作栏与浮动元素，强制背景纯白、文字纯黑、移除浮层投影；
- **触屏防误触优化 (pointer: coarse)**：
  移动端与平板触摸屏下，滚动条宽度自适应提升至 6px~8px，杜绝无法触控；
- **切换动效风暴防御 (Transition Storm Defense)**：
  在主题切换瞬间向 `html` 注入 `is-theme-switching` 类，并在 250ms 内冻结所有元素的 `transition`，彻底消除全屏 100vw*100vh 元素不同步重绘掉帧。

### 8. 全局分层 Z-Index 与核心设计令牌

- 确立清晰系统级 Z-Index 标尺：
  - `--at-z-index-base: 1`
  - `--at-z-index-sticky: 100`
  - `--at-z-index-overlay: 1000`
  - `--at-z-index-fullscreen: 2000`
  - `--at-z-index-top-bar: 9999`（替换 loading-bar 的 99999 魔法值）
- 确立统一圆角与投影令牌：
  - `--at-radius-card: 10px`
  - `--at-radius-dialog: 16px`
  - `--at-shadow-floating`、`--at-bg-overlay-translucent`

### 9. 运行时换肤算法暗黑模式适配与 initTheme 客户端编排

- **setThemeColor 暗黑自适应**：
  支持 `options.isDark?: boolean` 或当检测到 target 包含 `dark` 类时，`light-1..9` 色阶自动与 Element Plus 暗黑基底 `#141414` 插值混合，消除暗黑下背景白化失真；`dark-2` 在暗黑下与白色混合增强反差；
- **initTheme 客户端生命周期控制器**：
  提供轻量纯原生门面 `initTheme(options)`，返回标准 `ThemeManager`（`getMode()`, `getActiveTheme()`, `setMode()`, `setColor()`, `cleanup()`），自动协调 `localStorage` 持久化、系统偏好（`prefers-color-scheme`）监听注销、与防动效风暴类切换。

## 验证源头与测试矩阵

1. **样式编译与零 !important 质量门禁**：
   - 运行 `pnpm --filter @atengk/element-plus build`，通过 `sass src/styles/theme-pro.scss dist/theme-pro.css` 编译产物；
   - 运行 `packages/element-plus/test/theme/themeBundle.test.ts`，验证：
     - `dist/theme-pro.css` 产物大小健康（> 50KB）；
     - 100% 恪守零 `!important` 铁律；
     - 全量 80+ 原生组件全覆盖（包含 `ElPageHeader`, `ElBacktop`, `ElCheckTag`, `ElStatistic`）；
     - 媒体查询全景守卫已编译；
     - 零硬编码 `#0c1017` 泄露；
2. **运行时色阶与主题管理器单测**：
   - 运行 `packages/element-plus/test/theme/setThemeColor.test.ts`，验证：
     - 浅色模式下 1~9 级色阶与 Sass mix 100% 精度对齐；
     - 暗黑模式下 light-9 混合 `#141414` 不出现刺眼浅色；
     - `initTheme` 支持三态切换、本地持久化、媒体查询监听与确定性 `cleanup()` 清理；
3. **旗舰自验展厅全景验证**：
   - 更新 `apps/sample-element-plus/src/views/theme/ThemeProPanoramaView.vue`，集齐 `ElPageHeader`、`ElBacktop`、`ElCheckTag`、`ElStatistic`；
   - 跑通 `pnpm --filter sample-element-plus build` 生产构建。
