# 0022. Element Plus 全量组件样式大满贯打磨与富媒体/上传/滚动条扩展架构

## 状态

Accepted (已接受)

## 背景与决策上下文

在 ADR-0021 奠定了 `@atengk/element-plus` 基础设施增强组件库现代多主题套件（`theme-pro.css`）的基础后，主题引擎已涵盖按钮、输入、表格、标签、开关、卡片、导航、分页、基础选择器与部分状态反馈。

然而，在企业级复杂生产系统中，对照 Element Plus 官方源码（`packages/theme-chalk/src`）全量 80+ 个组件，仍有关键高频领域存在视觉割裂：

1. **文件上传全家桶 (Upload)**：原生 `el-upload` 拖拽框虚线粗重、缺乏悬浮微动，照片墙与文件列表缺乏工业级卡片质感与精致微光进度条；
2. **富媒体与灯箱容器 (Avatar / Image / ImageViewer)**：缺少类似现代极客产品（Linear / Vercel）的亚像素环切重叠头像组（AvatarGroup），大图预览灯箱原生为生硬纯黑，缺少黑曜石景深毛玻璃浮岛感；
3. **加载与占位动效 (Loading / Skeleton / Popconfirm)**：原生 Loading 遮罩为纯平不透明或粗糙白色，骨架屏在暗黑模式下存在刺眼的亮白闪烁；
4. **全局精致滚动条与表单排版 (Scrollbar / Form / FormItem / Basics)**：Windows 平台默认灰白宽滚动条严重破坏科技感，表单必填星号与校验错误态未深度联动 Laser Focus-Ring 激光环。

针对上述视觉死角，决定对 `theme-pro` 全局样式引擎实施第二阶段全面升级，实现全量官方组件 100% 极客科技质感大满贯覆盖。

## 架构决策

坚守“**纯 CSS 变量驱动、零 `!important` 铁律、高内聚领域拓扑、双轨独立外挂分发**”原则，确立以下系统级架构决策：

### 1. 扩充领域 SCSS 拓扑（增补三大高内聚领域）

在 `packages/element-plus/src/styles/theme-pro/` 架构下，保持扁平与高内聚，新增 3 个领域 SCSS 文件并扩充 2 个既有文件：

1. **新增 `_upload.scss` (上传全家桶域)**：
   - 覆盖：`el-upload`、`.el-upload-dragger`、`el-upload-list`、`picture-card`；
   - 契约：触感拖拽（亚像素虚线、悬浮轻微放大与激光光晕）、照片墙卡片立体微阴影、文件列表 3px 极简主色微光进度条；
2. **新增 `_media.scss` (媒体与全屏灯箱域)**：
   - 覆盖：`el-avatar`、`el-avatar-group`、`el-image`、`el-image-viewer`；
   - 契约：头像组 8px 负外边距与 2px 环形遮罩（`box-shadow: 0 0 0 2px var(--el-bg-color)`）物理环切，图片大图预览黑曜石深空毛玻璃（`backdrop-filter: blur(16px)`）与悬浮胶囊工具栏；
3. **新增 `_basics.scss` (全局视效与基础排版域)**：
   - 覆盖：全局系统滚动条（`::-webkit-scrollbar` / `scrollbar-width: thin`）、`el-scrollbar`、`el-link`、`el-text`、`el-space`；
   - 契约：6px 极窄冷钛滚动条、9999px 全圆角、悬浮高亮、背景透明；
4. **扩充 `_inputs.scss` (表单编排与复合输入)**：
   - 增补：`el-form`、`el-form-item`、`el-input-number`、`el-input-tag`、`el-input-otp`、`el-autocomplete`、`el-mention`；
   - 契约：必填红星微调、`.is-error` 双层红光报警光晕联动、数字增减按钮紧凑微动；
5. **扩充 `_navigations.scss` (面包屑与锚点)**：
   - 增补：`el-breadcrumb`、`el-anchor`、`el-page-header`；
   - 契约：高反差层级面包屑、弹性主题色锚点游标滑块；
6. **扩充 `_feedbacks.scss` (加载遮罩与骨架屏)**：
   - 增补：`el-loading`、`el-skeleton`、`el-popconfirm`；
   - 契约：Loading 毛玻璃遮罩（`backdrop-filter: blur(6px)`）与主题色 Spinner，深空冷灰呼吸波浪骨架屏。

### 2. 零 `!important` 与二级变量级联响应

- 100% 优先覆写 Element Plus 原生预留的组件级二级 CSS 变量（如 `--el-upload-dragger-padding-horizontal`、`--el-loading-spinner-size`、`--el-skeleton-color` 等）；
- 仅在毛玻璃景深、双层激光光晕、环形遮罩与弹性阻尼微动时，使用高特异度精准 BEM 类选择器渐进增强；
- 所有组件色彩严格绑定 `--el-color-primary` 系列变量，运行时调用 `setThemeColor(color)` 时，全量 80+ 组件毫秒级无缝自动级联同步响应。

### 3. 产物分发与引入形态

- 保持双轨解耦分发：
  - `style.css`：收敛 Ateng 自研业务组件 Scoped 样式；
  - `theme-pro.css`：独立 Dart Sass 编译输出的全量组件现代多主题引擎（约 90KB~100KB，Gzip 后约 15KB）；
  - `src/styles/*`：通过 `package.json` 的 `exports` 暴露，支持下游按需源码级引入。

### 4. 自验展厅超级全景升级

在 `apps/sample-element-plus` 的 `/theme-pro` 展厅中，全面升级 5-Tab 容器切片系统，集中呈现所有新补齐的原生组件，覆盖 5 套科技预设主题秒切、深浅双模与吸管动态调色。

## 效果与权衡

- **收益**：
  - 达成 Element Plus 全量 80+ 组件 100% 现代科技感与暗黑模式覆盖，彻底消灭任意原生组件的视觉断层；
  - 极窄滚动条统一了全屏及各弹窗/下拉视效，毛玻璃加载与呼吸骨架屏消除了等待过程中的突兀感；
  - 全量组件继续遵循零 `!important` 铁律与单色级联换肤机制。
- **代价与权衡**：
  - CSS 产物体积微增（约 15KB Gzip），但极大提升了工业级产品的一致性与尊贵感。
