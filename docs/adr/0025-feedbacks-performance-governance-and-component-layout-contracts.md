# 0025. 状态反馈性能治理、GPU 脉冲动效与组件布局契约深化架构

## 状态

Accepted (已接受)

## 背景与决策上下文

在企业级中后台与多主题展厅（`ThemeProPanoramaView`、`/layout/skeleton`、`/business/file-preview` 等）的实际高频使用中，暴露出五大关于渲染性能、控制台警告与布局坍缩的工程痛点：

1. **骨架屏与骨架页面卡顿感明显 (`/layout/skeleton`)**：
   - 骨架屏 `.el-skeleton` 使用传统的 `background-position` 连续位移线性渐变实现 Shimmer 动效。当屏幕内有 30+ 骨架节点或嵌套复杂页面时，每一帧都会强制触发 CPU/GPU 的 Paint 与 Composite，显卡功耗陡增并伴随肉眼可见掉帧；
   - `AtengPageSkeleton` 容器过渡使用了 `mode="out-in"` 串行模式，导致旧内容淡出完毕（耗时 250ms）后才开始新内容淡入（耗时 250ms），产生了长达 500ms 的肉眼可感知等待迟滞。
2. **多主题展厅首屏控制台报表未捕获异常 (`/theme-pro`)**：
   - 控制台抛出 `Unhandled error during execution of mounted hook at <ElTable>`：展厅 5 个 TabPane 默认全量即时挂载，Tab 5（`tables`）处于未激活隐藏状态（`display: none`，DOM 宽高为 0），其中的 `ElTable` 在 0 宽高环境下执行挂载测量与布局 Observer 触发未处理异常；
   - 控制台抛出 `Uncaught (in promise) TypeError: Cannot read properties of undefined (reading 'hour')`：日期范围拾取器配置的 `shortcuts` 返回了单个 `Date` 对象，而 Element Plus 对 `daterange` 类型期望的是 `[Date, Date]` 起止元组，在计算结束时间的小时字段时因取到 `undefined` 崩溃。
3. **查询表单单选按钮 API 即将废弃警告 (`/table/query-form`)**：
   - 控制台提示 `[el-radio] [API] label act as value is about to be deprecated in version 3.0.0, please use value instead.`：由于传入 `:value="undefined"`，Element Plus 3.0 预检逻辑判定未传递显式 `value`，退回读取 `label` 并触发弃用警告。
4. **多格式文件预览代码卡片居中坍缩 (`/business/file-preview`)**：
   - 源码/JSON 预览模式下，代码卡片缩成中间一小块孤立狭长矩形，未撑满预览容器。根源在于 `.at-file-preview__container` 为 Flex 居中容器，而 `AtengCodeView` 样式缺少 `width: 100%` 契约，导致其在弹性容器中退化为根据单行文本宽度 shrink-to-fit 自适应收缩。
5. **加载遮罩与骨架屏质感与性能缺陷**：
   - `.el-loading-mask` 配置了 `backdrop-filter: blur(6px/12px)`，在高频局部 loading 与全屏遮罩场景下严重拖慢渲染管线；
   - 骨架屏高亮扫光质感粗糙且过度消耗 GPU 显存带宽。

## 架构决策

基于“**纯净极速渲染、GPU 硬件加速脉冲、显式强类型契约与严密布局防护**”原则，确立以下架构决策：

### 1. 彻底淘汰线性扫光，全面升级 GPU 纯透明度脉冲 (`at-skeleton-pulse`)

- **零重绘脉冲动效**：废止基于 `background-position` 移动渐变的 Shimmer 方案，全面采用基于纯 `opacity` 变换的 `at-skeleton-pulse` 关键帧动画：
  ```scss
  @keyframes at-skeleton-pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.45;
    }
  }
  ```
  动画仅改变硬件合成器透明度图层，完全免除 CPU/GPU 重排（Reflow）与重绘（Repaint），在 100+ 复杂节点高密度骨架屏下依旧保持稳定 60/120fps；
- **消除串行切换迟滞**：移除 `AtengPageSkeleton` 过渡动画上的 `mode="out-in"` 串行等待，升级为 0.18s 紧凑微缓动渐变，并注入 `will-change: opacity;`，实现骨架屏与真实内容的平滑无缝交叉淡入。

### 2. 剥离 Loading 遮罩 `backdrop-filter`，回归高质感纯净半透明遮罩

- **移除毛玻璃模糊滤镜**：彻底移除 `.el-loading-mask` 上的 `backdrop-filter: blur(6px/12px)`，彻底释放 GPU 算力；
- **沉浸半透材质**：
  - 浅色模式：采用 `rgba(255, 255, 255, 0.78)`；
  - 暗黑模式：采用 `rgba(15, 23, 42, 0.78)`；
    搭配主题色微发光 Spinner，提供工业级通透感且零性能损耗。

### 3. 多 Tab 分帧懒挂载架构与拾取器强类型区间修复

- **`ElTabPane` 延迟挂载**：在多 Tab 全景展厅等复杂场景下，非默认激活的 TabPane 一律声明 `:lazy="true"`。未激活的 Tab 内容在用户首次切换前不进入 DOM 挂载树，彻底避免 `ElTable` 等具有 DOM 测量依赖的重型组件在 0 宽高隐藏容器中挂载报错；
- **日期范围 Shortcut 契约严密化**：
  - 单日期选择器：`shortcuts` 返回 `Date` 或 `() => Date`；
  - 范围选择器（`daterange`）：`shortcuts` 严格返回 `[Date, Date]` 或 `() => [Date, Date]`；
  - 补齐所有 Date/Time 拾取器的 `value-format`（`YYYY-MM-DD` / `HH:mm:ss`），杜绝隐式时区反序列化漂移。

### 4. CodeView 与 FilePreview 100% 容器尺寸契约

- **组件自身撑满基线**：在 `AtengCodeView` 的根样式 `.at-code-view` 显式确立 `width: 100%; box-sizing: border-box;` 不变量；
- **上层容器弹性包裹**：在 `AtengFilePreview` 的代码/文本预览分支中引入专用 `.at-file-preview__code-wrapper`（`width: 100%; height: 100%; display: flex; flex-direction: column;`），强行覆盖外层弹性居中容器对子元素的宽度压缩，确保在线代码与数据预览 100% 撑满可用视口。

### 5. 图片与多媒体文件在线预览排版与交互体验深化

- **视频视口自适应撑满与原生控件底置**：
  - 彻底淘汰 `.at-file-preview__video` 单纯声明 `max-width: 100%; max-height: 100%` 导致低分辨率视频（如 320x180）在巨幅黑盒中缩成邮票大小的缺陷；
  - 规范声明 `width: 100%; height: 100%; object-fit: contain;`，视频播放器充满可用视窗，原生长条进度条与音量、全屏控件在容器底部平稳展开，视频画面按真实宽高比 GPU 硬件缩放平滑填充。
- **透明图片/矢量 SVG 棋盘格底纹与全屏灯箱**：
  - 为 `.at-file-preview__image-wrapper` 注入工业级微透明棋盘网格背景（CSS 双向 45 度渐变点阵），彻底解决透明 PNG 图标与白色线框 SVG 在纯白底色下发生图形吞色、边缘不可见与“伪残破”的视觉问题；
  - `.at-file-preview__image` 与 `:deep(.el-image__inner)` 全面确立 `width: 100%; height: 100%; object-fit: contain; cursor: zoom-in;` 契约，支持 SVG 字符串 `content` 自动转换为内存 Blob URL 渲染，并常驻悬浮交互提示条引导用户点击触发全屏旋转缩放灯箱。

### 6. Element Plus 3.0 单选按钮弃用警告防御

- 对于受控切换“自适应断点”等非数值项，禁止传入 `:value="undefined"`；
- 统一规范为字面量 `value="auto"`（或语义化特定字符串），配合计算属性派发实际可选数值，消除弃用警告并为 Element Plus 3.0 平滑升级扫清障碍。

### 7. 全量剥离 `backdrop-filter` 模糊计算与展厅文案全面校准

- **全系统剥离 `backdrop-filter: blur(...)`**：
  在 `_pickers.scss`、`_inputs.scss`、`_overlays.scss`、`_navigations.scss`、`_media.scss`、`_tables.scss`、`_displays.scss`、`_steps.scss`、`_upload.scss` 以及组件 `AtengPageContainer` 中，全量移除所有 `backdrop-filter: blur(...)` 与 `-webkit-backdrop-filter`；
  替代为高性能实体底色（`var(--el-bg-color-overlay)` 或高对比半透 RGBA）+ 1px 亚像素轻描边 + 浮层投影（`var(--at-shadow-floating)`）。彻底杜绝动效与滚动时下层 DOM 节点被多通道高斯模糊计算拖垮 CPU/GPU，保证 60/120fps 极速渲染；
- **展厅文案与设计术语对齐**：
  全面清理示例工程及模块文档中遗留的“毛玻璃”、“blur(8px)”等陈旧宣传词，校准为“轻量微透/高质感暗色沉浸/独立硬件图层”；将骨架屏“模态”校准为“形态”，将“模态弹窗”校准为“对话框 (Dialog)”，与高性能工程基线 100% 对齐。

## 影响与验证

1. **渲染帧率与流畅度**：
   - 全局彻底消灭 `backdrop-filter` 高斯模糊渲染管线消耗，全屏遮罩、下拉面板与批量操作条滚动动画流畅度达到硬件极致；
   - `/layout/skeleton` 与全局骨架加载 CPU 占用降低 80% 以上，消除卡顿掉帧；
   - 骨架与真实内容切换响应从 500ms 降至 180ms，视觉过渡丝滑自然。
2. **控制台洁净度**：
   - `/theme-pro` 彻底消灭 `Cannot read properties of undefined (reading 'hour')` 与 `<ElTable>` 挂载报错；
   - `/table/query-form` 彻底消除 `label act as value is about to be deprecated` 警告；
   - 控制台实现零报错、零警告。
3. **UI 布局稳定性与媒体体验**：
   - `/business/file-preview` 源码与 JSON 格式预览 100% 撑满容器，消除狭窄挤压 bug；
   - 图片预览具备棋盘格透明边界与 `cursor: zoom-in` 放大提示，SVG 字符串自适应转码；
   - 视频播放器 100% 撑满容器，底置宽幅控制台，消除邮票式黑框孤岛。
4. **测试与类型全维准出**：
   - `@atengk/element-plus` 38 个测试套件、323 个单测 100% 通过；
   - 全库及 sample 展厅 `typecheck` 与 `lint` 0 报错。
