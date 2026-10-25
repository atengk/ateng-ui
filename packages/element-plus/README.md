# @atengk/element-plus

面向现代 Web 应用与企业级系统的 Element Plus 基础设施增强组件库与指令集。坚持纯原生 TypeScript、强类型契约、零臃肿依赖与深模块解耦设计，深度打通 `@atengk/core` 与 `@atengk/vue` 基础设施能力。

---

## 维度零：特性与公共 API 全景速查矩阵

| 特性分类     | 特性名称             | 核心门面 / 组件 / 指令                                                                                                                                                                                                      | 关键参数 / Props / Emits                                                                                                                                                                                                                                                                                                            | 核心行为说明                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | 锚定验证源头 (*Test / Sample)                                                                   |
| :----------- | :------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------- |
| **基础底座** | 插件全局安装器       | `install(app)` / `installer`                                                                                                                                                                                                | `app: App`                                                                                                                                                                                                                                                                                                                          | 批量注册 PascalCase 原名组件与 At* 别名组件，批量注册全部操作指令，具备 Symbol 幂等保护                                                                                                                                                                                                                                                                                                                                                                                                                                     | [`install.test.ts`](./test/install.test.ts)                                                     |
| **基础底座** | 版本标识             | `VERSION`                                                                                                                                                                                                                   | `string`                                                                                                                                                                                                                                                                                                                            | 导出当前模块运行时版本号（0.1.0）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | [`index.test.ts`](./test/index.test.ts)                                                         |
| **权限指令** | 细粒度操作权限控制   | `v-permission`                                                                                                                                                                                                              | `string \| string[]`, 修饰符 `.disabled`, `.all`                                                                                                                                                                                                                                                                                    | 默认物理移除 DOM 并留存注释锚点，支持原位插回；支持 `.disabled` 置灰态与 `.all` 且逻辑                                                                                                                                                                                                                                                                                                                                                                                                                                      | [`v-permission.test.ts`](./test/v-permission.test.ts)<br>`/directives/permission`               |
| **权限指令** | 角色细粒度控制       | `v-role`                                                                                                                                                                                                                    | `string \| string[]`, 修饰符 `.disabled`, `.all`                                                                                                                                                                                                                                                                                    | 基于用户角色判定；内置 admin / superadmin 超管全局豁免放行机制                                                                                                                                                                                                                                                                                                                                                                                                                                                              | [`v-role.test.ts`](./test/v-role.test.ts)<br>`/directives/role`                                 |
| **防重指令** | 提交防刷与前端幂等   | `v-idempotent`                                                                                                                                                                                                              | `number \| Function \| IdempotentOptions`, 参数 `:delay`, 修饰符 `.noFeedback`                                                                                                                                                                                                                                                      | DOM 捕获阶段拦截连击；支持时间窗口防刷与异步 Promise 互斥锁双模，自动联动按钮 loading 与禁用，超时与异常安全兜底防死锁                                                                                                                                                                                                                                                                                                                                                                                                      | [`v-idempotent.test.ts`](./test/v-idempotent.test.ts)<br>`/directives/idempotent`               |
| **工具指令** | 剪贴板一键复制       | `v-copy`                                                                                                                                                                                                                    | `string \| CopyGetter \| CopyOptions`                                                                                                                                                                                                                                                                                               | 优先调用 `navigator.clipboard`，自动安全降级至 `execCommand`；支持动态 Getter 与 ElMessage 反馈联动                                                                                                                                                                                                                                                                                                                                                                                                                         | [`v-copy.test.ts`](./test/v-copy.test.ts)<br>`/directives/copy`                                 |
| **工具指令** | 动态防篡改水印       | `v-watermark`                                                                                                                                                                                                               | `string \| WatermarkOptions`, 修饰符 `.full`                                                                                                                                                                                                                                                                                        | Canvas 离屏高清渲染（SVG 安全降级）；MutationObserver 深度监听实现控制台删除与样式篡改微任务自愈                                                                                                                                                                                                                                                                                                                                                                                                                            | [`v-watermark.test.ts`](./test/v-watermark.test.ts)<br>`/directives/watermark`                  |
| **工具指令** | 细粒度微骨架         | `v-skeleton`                                                                                                                                                                                                                | `boolean \| SkeletonOptions: { loading, animated, radius }`                                                                                                                                                                                                                                                                         | 原地 CSS 盒模型伪元素脉冲遮罩模型，将目标 DOM 内部文字与图标透明度降为 0，100% 保持原有物理宽高，消除排版跳变（Zero-CLS），绝不破坏虚拟 DOM 树；深度适配 ThemePro Slate 深空暗黑基底与纯 GPU 合成图层透明度脉冲动效                                                                                                                                                                                                                                                                                                         | [`v-skeleton.test.ts`](./test/v-skeleton.test.ts)<br>`/directives/skeleton`                     |
| **交互容器** | 企业级弹窗容器       | `AtengDialog`                                                                                                                                                                                                               | `v-model`, `title`, `draggable`, `lazyRender`, `beforeConfirm`, `formRef`, `confirmOnClose`, `@confirm`, `@success`                                                                                                                                                                                                                 | 默认可拖拽；右上角全屏切换与双击 Header 全屏；el-scrollbar 限制视口高度防撑破；异步确认 Loading 锁协议；支持 `:form-ref` 内嵌表单自动前置校验流转（失败就地阻断保留错误现场，成功放行进入 loading）；支持 `:confirm-on-close` 二次防误关确认；支持分帧延迟挂载（lazy-render）与 GPU 硬件合成图层加速杜绝大页面掉帧卡顿                                                                                                                                                                                                      | [`AtengDialog.test.ts`](./test/AtengDialog.test.ts)<br>`/containers/dialog`                     |
| **交互容器** | 企业级抽屉容器       | `AtengDrawer`                                                                                                                                                                                                               | `v-model`, `title`, `size: 'small' \| 'default' \| 'large'`, `lazyRender`, `beforeConfirm`, `formRef`, `confirmOnClose`                                                                                                                                                                                                             | 响应式语义尺寸断点；移动端视口（< 768px）自适应 100% 全宽；统一的异步确认 Loading 锁协议；支持 `:form-ref` 内嵌表单自动前置校验流转（失败就地阻断保留现场，成功放行开启 loading）；支持 `:confirm-on-close` 二次防误关确认；支持分帧延迟挂载（lazy-render）与硬件图层加速杜绝大页面掉帧卡顿                                                                                                                                                                                                                                 | [`AtengDrawer.test.ts`](./test/AtengDrawer.test.ts)<br>`/containers/drawer`                     |
| **交互容器** | 统一缺省态占位       | `AtengEmpty`                                                                                                                                                                                                                | `status: 'empty' \| 'search' \| '403' \| 'network-error' \| '500'`, `description`, `imageSize`                                                                                                                                                                                                                                      | 聚合 5 大语义状态；内置纯矢量 SVG 插画深度绑定 Element Plus 设计令牌，天然完美自适应暗黑模式                                                                                                                                                                                                                                                                                                                                                                                                                                | [`AtengEmpty.test.ts`](./test/AtengEmpty.test.ts)<br>`/containers/empty`                        |
| **加载反馈** | 顶栏纳米科技流光线   | `AtengLoadingBar` / `installLoadingBar`                                                                                                                                                                                     | `router`, `options?: LoadingBarConfig`                                                                                                                                                                                                                                                                                              | 纯粹主义 2px 顶栏纳米科技流光线；0 全屏遮罩、0 模态弹窗、0 悬浮胶囊；独立提升至 GPU 硬件加速层（耗时 < 0.01ms）；`installLoadingBar(router)` 全自动接管 Vue Router 导航守卫                                                                                                                                                                                                                                                                                                                                                 | [`AtengLoadingBar.test.ts`](./test/AtengLoadingBar.test.ts)<br>`/containers/loading`            |
| **加载反馈** | 声明式零遮罩轻量加载 | `AtengLoading`                                                                                                                                                                                                              | `loading`, `mode: 'shimmer' \| 'dots' \| 'skeleton'`, `delay`, `minDuration`, `text`                                                                                                                                                                                                                                                | 默认零遮罩 (Zero-Overlay) 顶沿 2px 极光流线，内容完全可见；支持三点微波浪 (纯单色轻微半透，0 模糊) 与骨架屏多态切换；内部接入 `@atengk/vue` 的 `useAntiFlicker` 工业级防闪烁状态机 (150ms 静默防御 + 300ms 最小展示期)                                                                                                                                                                                                                                                                                                      | [`AtengLoading.test.ts`](./test/AtengLoading.test.ts)<br>`/containers/loading`                  |
| **页面骨架** | 无状态基础布局套件   | `AtengLayout` / `AtengHeader` / `AtengAside` / `AtengContent` / `AtengFooter`                                                                                                                                               | `direction: 'horizontal' \| 'vertical'`, `hasAside`, `tag`, Aside 属性: `width`, `collapsedWidth`, `v-model:collapsed`, `collapsible`, 插槽: `#trigger`                                                                                                                                                                             | 纯 CSS/Flex 驱动，零业务/零路由绑定的纯无状态基础布局架构套件；运行时自动扫描识别子节点包含 AtengAside 并自动追加 `.has-aside` 切换为横向排版，保留 direction 显式逃生门；AtengAside 支持受控 v-model:collapsed 双向折叠、collapsedWidth 设定、自定义 #trigger 插槽与内置折叠触发条                                                                                                                                                                                                                                         | [`AtengLayout.test.ts`](./test/AtengLayout.test.ts)<br>`/layout/layout`                         |
| **页面骨架** | 标准页面承载容器     | `AtengPageContainer`                                                                                                                                                                                                        | `title`, `subTitle`, `breadcrumb`, `autoBreadcrumb`, `breadcrumbTitleKey`, `breadcrumbResolver`, `showBack`, `ghost`, `fitViewport`, `fixedHeader`, `headerBlur`, `tabs`, `fullscreen`, `showFullscreen`, `lockScroll`, `escExit`, `collapseHeaderOnScroll`, `@back`, `@fullscreen`, `@header-collapse`                             | 标准化页头；流动与 fitViewport 视口 100% 撑满双模滚动切换；ghost 沉浸式透明模式；弱感应路由推导自动面包屑；headerBlur 吸顶轻量固顶质感与滚动动态 .is-elevated 渐变悬浮投影；全屏状态通过 `<Teleport to="body">` 瞬移至全局顶层，彻底绕过宿主包含块 CSS transform 限制，集成模块级引用计数 lockScroll 滚动防穿透锁与 ESC 退出；支持 collapseHeaderOnScroll 向下滚动平滑收折页头、向上回滚平滑复原                                                                                                                            | [`AtengPageContainer.test.ts`](./test/AtengPageContainer.test.ts)<br>`/layout/page-container`   |
| **页面骨架** | 弹性拖拽分栏布局     | `AtengSplitLayout`                                                                                                                                                                                                          | `direction`, `v-model`, `v-model:secondCollapsed`, `collapseTarget: 'first' \| 'second' \| 'both'`, `secondCollapseSize`, `defaultSize`, `min`, `max`, `collapsible`, `storageKey`, `@collapse`, `@secondCollapse`                                                                                                                  | W3C PointerEvent 统一与 setPointerCapture 平板触控驱动防越界丢帧；min/max 弹性防越界；双向独立对折把手与折叠互斥安全；storageKey 本地持久化双向折叠状态与尺寸偏好；支持第二栏内嵌子 AtengSplitLayout 实现官方标准“左树 + 中列表 + 右详情”三栏范式                                                                                                                                                                                                                                                                           | [`AtengSplitLayout.test.ts`](./test/AtengSplitLayout.test.ts)<br>`/layout/split-layout`         |
| **页面骨架** | 悬浮吸底操作栏       | `AtengFooterBar`                                                                                                                                                                                                            | `position: 'sticky' \| 'fixed'`, `placeholder`, `height`, `zIndex`, `leftOffset`, `autoOffset`, `target`, `bordered`, `showSubmit`, `submitText`, `submitLoading`, `onSubmit`, `showReset`, `resetText`, `onReset`, `showCancel`, `cancelText`, `onCancel`, `actions: FooterBarAction[]`, 实例暴露 `updateOffset()`                 | sticky 局部粘滞与 fixed 全局悬浮双模；预置保存/重置/取消开箱即用与声明式 `actions` 批量按钮；零胶水直连：绑定 async `onSubmit` 时自动接管 Loading 互斥防重锁并禁用连击防脏写；fixed 模式标配自动等高占位垫块防遮挡；`autoOffset` 结合 ResizeObserver + rAF 动态平滑避让侧边栏过渡动画                                                                                                                                                                                                                                       | [`AtengFooterBar.test.ts`](./test/AtengFooterBar.test.ts)<br>`/layout/footer-bar`               |
| **页面骨架** | 结构化卡片面板       | `AtengCard`                                                                                                                                                                                                                 | `title`, `subTitle`, `icon`, `tooltip`, `collapsible`, `fullscreenable`, `lockScroll`, `escExit`, `loading`, `shadow`, `bordered`, `showRefresh`, `refreshTooltip`, `tabsPosition: 'top' \| 'bottom'`, `#tabs`, `@refresh`                                                                                                          | 结构化标题/副标题/图标/Tooltip；一键平滑折叠；视口全屏最大化；模块级引用计数管理 lockScroll 全屏防穿透滚动锁，多卡片并发安全还原；ESC 防冲突与受控开关；右上角新增局部刷新按钮（带 360 度平滑旋转动效与 loading 联动）；支持单行紧凑模式与次行沉降模式 `#tabs` 插槽；无缝接入 AtengCardGroup 上下文总线                                                                                                                                                                                                                     | [`AtengCard.test.ts`](./test/AtengCard.test.ts)<br>`/layout/card`                               |
| **页面容器** | 多卡片手风琴编排     | `AtengCardGroup`                                                                                                                                                                                                            | `v-model:activeKeys`, `accordion`, `gutter`, 实例暴露 `expandAll()`, `collapseAll()`                                                                                                                                                                                                                                                | 基于 Vue Provide/Inject 跨层协调子 AtengCard 状态机与生命周期；支持 accordion 单开互斥手风琴；通过组件实例 Expose 暴露 expandAll 与 collapseAll 对称批量控制方法；gutter 弹性间距自适应                                                                                                                                                                                                                                                                                                                                     | [`AtengCardGroup.test.ts`](./test/AtengCardGroup.test.ts)<br>`/layout/card-group`               |
| **页面容器** | 电梯楼层导航锚点     | `AtengAnchor`                                                                                                                                                                                                               | `items: AtengAnchorItem[]`, `container`, `targetOffset`, `bounds`, `direction: 'vertical' \| 'horizontal'`, `showInkBar`, `v-model:currentAnchor`, `@click`, `@change`                                                                                                                                                              | 双模滚动宿主智能探测：优先自动向上识别祖先 AtengPageContainer 局部内容滚动区（`.at-page-container__content`）或降级为 window，提供 container 显式逃生舱；声明式树形小节配置与层级缩进；内置 targetOffset 吸顶安全避让与 requestAnimationFrame 节流监听；游标墨水指示条实时高亮跟随激活小节                                                                                                                                                                                                                                  | [`AtengAnchor.test.ts`](./test/AtengAnchor.test.ts)<br>`/layout/anchor`                         |
| **页面容器** | 容器自适应流式网格   | `AtengGrid`                                                                                                                                                                                                                 | `minItemWidth`, `gap`, `rowGap`, `columnGap`, `cols`                                                                                                                                                                                                                                                                                | 纯 CSS 原生驱动；采用 `grid-template-columns: repeat(auto-fill, minmax(minItemWidth, 1fr))` 实现无断点完美流式自适应；内置 `container-type: inline-size` 现代容器查询，完美适配 SplitLayout 拖拽调宽与抽屉/弹窗等变宽容器，零 JS ResizeObserver 性能损耗与抖动                                                                                                                                                                                                                                                              | [`AtengGrid.test.ts`](./test/AtengGrid.test.ts)<br>`/layout/grid`                               |
| **页面容器** | 安全防篡改水印容器   | `AtengWatermark`                                                                                                                                                                                                            | `text`, `image`, `width`, `height`, `rotate`, `gap`, `zIndex`, `font`, `opacity`                                                                                                                                                                                                                                                    | 采用纯原生 Canvas 离屏离线生成高清 Base64 Data URL 注入背景层，高 DPI 视网膜抗锯齿；标配 MutationObserver 监听水印节点样式篡改与 DOM 物理删除，微任务队列强制重绘自愈主动防御                                                                                                                                                                                                                                                                                                                                               | [`AtengWatermark.test.ts`](./test/AtengWatermark.test.ts)<br>`/layout/watermark`                |
| **页面骨架** | 页面骨架屏占位容器   | `AtengPageSkeleton`                                                                                                                                                                                                         | `loading`, `type: 'table' \| 'form' \| 'detail' \| 'card' \| 'dashboard' \| 'custom'`, `rows`, `columns`, `animated`, 插槽 `#default`, `#skeleton`                                                                                                                                                                                  | 内置 table/form/detail/card/dashboard 5 大后台形态预设（dashboard 包含 4 张指标卡与双图表区块）；插槽平滑包装器协议：直接包裹页面真实内容，`loading: false` 时平滑淡入淡出（Fade Transition）无缝切换无白屏；支持自定义 `#skeleton` 骨架插槽                                                                                                                                                                                                                                                                                | [`AtengPageSkeleton.test.ts`](./test/AtengPageSkeleton.test.ts)<br>`/layout/skeleton`           |
| **查询套件** | 响应式搜索表单容器   | `AtengQueryForm`                                                                                                                                                                                                            | `:pagination`, `:enter-search`, `model`, `cols`, `collapsedRows`, `collapsed`, `defaultCollapsed`, `showCollapse`, `autoSearchOnReset`, `@search`, `@reset`                                                                                                                                                                         | 24 栅格自适应布局与基于容器 `ResizeObserver` 的 1~4 列自适应断点（<768px 单列 / <1200px 双列 / <1920px 三列 / ≥1920px 四列）；支持 `:pagination` 零胶水直连分页状态机；内置 `:enter-search` 默认回车即搜；支持 `collapsedRows` 自定义折叠常驻行数；`autoSearchOnReset` 控制重置时是否自动触发查询；展开/收起平滑过渡与查询/重置防抖；支持独立受控与 Table 上下文感知双模                                                                                                                                                    | [`AtengQueryForm.test.ts`](./test/AtengQueryForm.test.ts)<br>`/table/query-form`                |
| **表格套件** | 企业级核心表格容器   | `<AtengTable<T>>`                                                                                                                                                                                                           | `:pagination`, `:reserve-selection`, `selection`, `v-model:selectedKeys`, `v-model:selectedRows`, `:data`, `:columns`, `rowKey`, `tools`, `storageKey`, `density`, `stripe`, `autoHeight`, `enableColumnResize`, `minResizeWidth`, `searchEmptyDescription`                                                                         | Vue 3.5 SFC 原生泛型组件；渐进混合列架构；深度绑定 `@atengk/vue` 的 `usePagination`；内置 5 大工具栏；原生表头列宽拖拽调整、40px 最小防塌陷与 storageKey 本地持久化记忆还原/Popover 重置；搜索感知多态缺省态与一键清空自愈联动；纯原生 HTML5 拖拽列排序；`autoHeight` 视口高度自适应；支持 `:reserve-selection` 跨页多选记忆保持与底部粘滞批量操作条，支持 `v-model:selectedKeys` / `v-model:selectedRows` 双向受控绑定                                                                                                     | [`AtengTable.test.ts`](./test/AtengTable.test.ts)<br>`/table/crud`                              |
| **表格协同** | 表格表单协同上下文   | `ATENG_TABLE_CONTEXT_KEY`                                                                                                                                                                                                   | `InjectionKey<AtengTableContext>`                                                                                                                                                                                                                                                                                                   | `AtengTable` 与 `AtengQueryForm` 跨组件层级的 Provide/Inject 自动化双向联动通道（查询传递、重置联动与多态缺省态清空自愈），消灭业务胶水代码                                                                                                                                                                                                                                                                                                                                                                                 | [`AtengTable.test.ts`](./test/AtengTable.test.ts)<br>`/table/crud`                              |
| **字典底座** | 字典门面管理器       | `DictManager`                                                                                                                                                                                                               | `setProvider`, `loadDict`, `hasCache`, `getCache`, `clearCache`, `preload(codes)`, `setGlobalMapping(mapping)`, `getGlobalMapping()`, `resetGlobalMapping()`, `matchDictItem()`, `getDictLabel()`                                                                                                                                   | 纯内存常驻映射、飞行中未决 Promise 毫秒级并发请求合并去重、`preload` 批量增量拉取预热、全局自定义字段映射解耦、弱类型宽松比对工具与空安全保底返回 `[]`                                                                                                                                                                                                                                                                                                                                                                      | [`DictManager.test.ts`](./test/dict/DictManager.test.ts)<br>`/business/dict`                    |
| **字典控件** | 字典下拉选择器       | `AtengDictSelect`                                                                                                                                                                                                           | `dictCode`, `loader`, `options`, `v-model`, `v-model:item`, `multiple`, `filterable`, `clearable`, `mapping: DictFieldMapping`, `typeWeakMatch`, `emitItem`, `@change-item`                                                                                                                                                         | 自动联动 `DictManager` 异步加载字典；支持单选/多选/输入筛选；支持 fieldNames/mapping 字段映射与 typeWeakMatch 弱类型宽松比对（数字与字符串互通）；支持 `:emit-item` 回传整条字典项对象                                                                                                                                                                                                                                                                                                                                      | [`AtengDict.test.ts`](./test/AtengDict.test.ts)<br>`/business/dict`                             |
| **字典控件** | 字典单选框组         | `AtengDictRadio`                                                                                                                                                                                                            | `dictCode`, `loader`, `options`, `v-model`, `v-model:item`, `button: boolean`, `border: boolean`, `size`, `mapping: DictFieldMapping`, `typeWeakMatch`, `emitItem`, `@change-item`                                                                                                                                                  | 自动拉取字典项并渲染为单选框组；支持普通 Radio 与 Button/Border 按钮边框风格单选无缝切换；支持字段映射与类型弱比对；支持 `:emit-item` 回传整条字典项                                                                                                                                                                                                                                                                                                                                                                        | [`AtengDict.test.ts`](./test/AtengDict.test.ts)<br>`/business/dict`                             |
| **字典控件** | 字典多选框组         | `AtengDictCheckbox`                                                                                                                                                                                                         | `dictCode`, `loader`, `options`, `v-model`, `v-model:items`, `button: boolean`, `border: boolean`, `showCheckAll`, `separator`, `size`, `mapping: DictFieldMapping`, `typeWeakMatch`, `emitItems`, `@change-items`                                                                                                                  | 自动拉取字典项并渲染为多选框组；内置全选与半选 indeterminate 联动；支持数组与逗号分隔字符串双向解构绑定；支持 Button/Border 风格；支持字段映射与类型弱比对；支持 `:emit-items` 回传所选项集合                                                                                                                                                                                                                                                                                                                               | [`AtengDictCheckbox.test.ts`](./test/AtengDictCheckbox.test.ts)<br>`/business/dict`             |
| **字典控件** | 彩色状态标签         | `AtengDictTag`                                                                                                                                                                                                              | `dictCode`, `value`, `separator`, `emptyText`, `effect`, `round`, `mapping: DictFieldMapping`, `typeWeakMatch`                                                                                                                                                                                                                      | 自动匹配字典项并渲染为 Element Plus 彩色 Tag；支持单值、多值数组与逗号分隔字符串；未匹配时保底渲染 `'-'`；支持自定义字段映射与弱类型宽松比对                                                                                                                                                                                                                                                                                                                                                                                | [`AtengDict.test.ts`](./test/AtengDict.test.ts)<br>`/business/dict`                             |
| **数据详情** | 结构化数据详情容器   | `<AtengDescriptions<T>>`                                                                                                                                                                                                    | `data: T`, `items: DescriptionsItemConfig<T>[]`, `border`, `column`, `direction`, `size`, `copyable`, `emptyText`                                                                                                                                                                                                                   | Vue 3.5 SFC 原生泛型组件；基于 `el-descriptions` 增强封装；双模驱动（Schema 数据驱动与 SFC 声明式子组件）；支持 `:copyable` 声明式一键复制，恪守“内存真明文契约”复制脱敏前原始数据；空值全局保底对齐企业规范 `'--'` 且空值项绝不呈现复制按钮                                                                                                                                                                                                                                                                                | [`AtengDescriptions.test.ts`](./test/AtengDescriptions.test.ts)<br>`/business/descriptions`     |
| **数据详情** | 详情单项声明组件     | `AtengDescriptionsItem`                                                                                                                                                                                                     | `prop`, `label`, `span`, `mask`, `type`, `dictCode`, `copyable`, `emptyText`, `formatter`                                                                                                                                                                                                                                           | 内置 5 大脱敏管道（phone/idCard/email/name/bankCard）；内置货币/日期格式化；自动联动 AtengDictTag；支持单项 `copyable` 细粒度开启或覆盖复制控制                                                                                                                                                                                                                                                                                                                                                                             | [`AtengDescriptions.test.ts`](./test/AtengDescriptions.test.ts)<br>`/business/descriptions`     |
| **时间控件** | 快捷时间范围选择器   | `AtengDateRange`                                                                                                                                                                                                            | `v-model`, `v-model:start`, `v-model:end`, `preset`, `shortcuts`, `autoTime`, `smartAlignment`, `valueFormat`, `disableFuture`, `disablePast`, `disabledDate`, `maxRangeDays`, `separator`, 实例暴露 `datePickerRef`, `focus()`, `handleOpen()`, `handleClose()`                                                                    | 预置 9 大常用自然业务周期；双字段解构绑定协议（`v-model:start` 与 `v-model:end`，告别手动拆解数组与重置丢失）；默认开启时刻智能对齐（00:00:00 与 23:59:59）；支持 disableFuture 禁用未来、disablePast 禁用过去、maxRangeDays 最大跨度限制；暴露原生 DatePicker 实例与焦点控制门面                                                                                                                                                                                                                                           | [`AtengDateRange.test.ts`](./test/AtengDateRange.test.ts)<br>`/business/date-range`             |
| **文件交互** | 导入错误反馈弹窗     | `AtengExcelFeedback`                                                                                                                                                                                                        | `v-model`, `errors`, `fileUrl`, `downloadAction`, `fileName`, `pageSize`, `showCopy`, `copyText`, `downloadText`, `allowCsvFallback`, `csvFileName`, `downloadCsvText`, `@copy`, `@download-success`, `@download-error`, 实例暴露 `copyErrors()`, `downloadAnnotatedExcel()`, `exportErrorsAsCsv()`, `downloadLoading`, `dialogRef` | 集成 `AtengDialog`；在线表格分页展示导入错误行号、列名、原始值与失败原因；一键格式化复制剪贴板；双模批注文件下载；无后端批注时前端本地自适应降级生成带 UTF-8 BOM (`\uFEFF`) 的 CSV 错误清单导出，彻底解决 Windows Excel 双击打开中文乱码顽疾                                                                                                                                                                                                                                                                                | [`AtengExcelFeedback.test.ts`](./test/AtengExcelFeedback.test.ts)<br>`/business/excel-feedback` |
| **文件交互** | 流式 Excel 导出按钮  | `AtengExcelExport`                                                                                                                                                                                                          | `action`, `filename`, `params`, `selectedIds`, `mode: 'button' \| 'dropdown'`, `type`, `size`, `plain`, `round`, `text`, `disabled`, `loading`, `customClass`, `@export-start`, `@export-success`, `@export-error`, 实例暴露 `triggerExport(mode?)`, `isLoading`                                                                    | 整合 Fesod 流式 Excel 协议；双轨获取查询参数与选中行（自动感知 AtengTable 上下文或属性直传）；内置防重 Loading 互斥锁；严格对齐 ADR-0004 Blob-JSON 双态异常识别防御（后端返回 `application/json` 业务错误报文时，自动解包并由 `ElMessage.error` 拦截告警，严格阻断伪 `.xlsx` 损坏文件在浏览器中下载，并确定性释放临时 ObjectURL）                                                                                                                                                                                           | [`AtengExcelExport.test.ts`](./test/AtengExcelExport.test.ts)<br>`/table/crud`                  |
| **文件交互** | 多源切片上传器       | `AtengUpload`                                                                                                                                                                                                               | `chunk: boolean`, `chunkSize`, `concurrency`, `customUploadChunk`, `customMerge`, `maxSize`, `maxCount`, `accept`, `allowTypes`, `beforeUpload`, `beforePreview`, 实例暴露 `uploadRef`, `pause()`, `resume()`, `cancel()`, `clearFiles()`                                                                                           | 原生直传增强与大文件切片双模；深度组装 AtengFilePreview 预览灯箱，支持图片、PDF、音视频与代码文本在线即时调阅；内置 beforePreview 绝密文件前置业务拦截守卫；上传中（uploading）过渡态预览防误触保护；临时 ObjectURL 确定性生命周期回收（彻底杜绝内存泄漏）；支持毫秒级暂停、恢复与网络中断                                                                                                                                                                                                                                  | [`AtengUpload.test.ts`](./test/AtengUpload.test.ts)<br>`/business/upload`                       |
| **AI 交互**  | 流式打字机呈现       | `AtengStreamText`                                                                                                                                                                                                           | `text`, `speed`, `cursor`, `cursorChar`, `stream`, `showCopy`, `@finished`, `@copy`                                                                                                                                                                                                                                                 | 面向 LLM 与 SSE 流式响应；纯原生逐字切片与呼吸光标自适应淡出；双轨对接 `@atengk/vue` 的 `useStream`；内置一键复制代码                                                                                                                                                                                                                                                                                                                                                                                                       | [`AtengStreamText.test.ts`](./test/AtengStreamText.test.ts)<br>`/business/stream-text`          |
| **运维监控** | 实时日志滚屏终端     | `AtengLogViewer`                                                                                                                                                                                                            | `logs`, `webSocket`, `maxLines`, `theme: 'dark' \| 'light'`, `autoScroll`, `height`, `title`                                                                                                                                                                                                                                        | 2000 行环形内存缓冲防 DOM 膨胀；原生贴底滚动与手动回滚暂停；关键字高亮检索与日志下载；双轨对接 `useWebSocket`                                                                                                                                                                                                                                                                                                                                                                                                               | [`AtengLogViewer.test.ts`](./test/AtengLogViewer.test.ts)<br>`/business/log-viewer`             |
| **统计指标** | 指标趋势与数字翻牌   | `AtengStatistic`                                                                                                                                                                                                            | `value`, `title`, `precision`, `separator`, `prefix`, `suffix`, `duration`, `trend`, `loading`                                                                                                                                                                                                                                      | 原生 `requestAnimationFrame` 缓动平滑翻牌（零第三方依赖）；集成货币千分位；红绿涨跌微标与国际反转配色；内置骨架屏防抖                                                                                                                                                                                                                                                                                                                                                                                                       | [`AtengStatistic.test.ts`](./test/AtengStatistic.test.ts)<br>`/business/statistic`              |
| **代码数据** | 零依赖代码高亮查看   | `AtengCodeView`                                                                                                                                                                                                             | `code`, `language: 'json' \| 'sql' \| 'javascript' \| ...`, `collapsible`, `theme`, `lineNumbers`, `copyable`                                                                                                                                                                                                                       | 纯原生 AST 分词与严格 XSS 转义；JSON 树形代码块折叠展开；JSON/SQL/JS/XML 语法高亮；自适应行号侧边栏、一键复制反馈与明暗主题双模                                                                                                                                                                                                                                                                                                                                                                                             | [`AtengCodeView.test.ts`](./test/AtengCodeView.test.ts)<br>`/business/code-view`                |
| **通用选择** | 原生图标选择器       | `AtengIconSelect`                                                                                                                                                                                                           | `v-model`, `mode: 'popover' \| 'dialog'`, `clearable`, `showCopy`, `pageSize`, `customIcons`                                                                                                                                                                                                                                        | 原生收敛 Element Plus 标准图标库（0 外部图标包强绑定）；支持拼音缩写/全拼/中英文毫秒级模糊检索；网格分页与一键复制 `<el-icon>` 代码组件                                                                                                                                                                                                                                                                                                                                                                                     | [`AtengIconSelect.test.ts`](./test/AtengIconSelect.test.ts)<br>`/business/icon-select`          |
| **安全交互** | 验证码防刷新倒计时   | `AtengCaptcha`                                                                                                                                                                                                              | `type: 'button' \| 'image'`, `seconds`, `storageKey`, `beforeSend`, `send`, `imageSrc`                                                                                                                                                                                                                                              | LocalStorage 物理时间戳防页面刷新清零；前置异步校验拦截钩子；异步发送 Loading 互斥防重锁；支持图形字符验证码防重刷新                                                                                                                                                                                                                                                                                                                                                                                                        | [`AtengCaptcha.test.ts`](./test/AtengCaptcha.test.ts)<br>`/business/captcha`                    |
| **文件预览** | 多格式文件在线预览   | `AtengFilePreview`                                                                                                                                                                                                          | `url`, `file`, `content`, `name`, `fileType`, `mode: 'inline' \| 'dialog'`, `downloadable`                                                                                                                                                                                                                                          | 纯原生 HTML5 高性能内嵌（零第三方重型体积）；图片灯箱、原生 PDF、音视频播放、代码文本联动（复用 AtengCodeView）与未知格式降级下载；临时 ObjectURL 确定性生命周期回收                                                                                                                                                                                                                                                                                                                                                        | [`AtengFilePreview.test.ts`](./test/AtengFilePreview.test.ts)<br>`/business/file-preview`       |
| **主题引擎** | 现代极客多主题引擎   | `@atengk/element-plus/theme-pro.css`                                                                                                                                                                                        | `data-theme="indigo \| emerald \| violet \| ocean \| rose"`, `html.dark`                                                                                                                                                                                                                                                            | 纯 CSS 变量驱动现代极客多主题引擎（零 `!important`）；预设 5 套科技风主题（极客靛蓝/极客翠绿/赛博幻紫/商务深海/极光绯红）；Slate 暗黑冷感基底；体系化覆盖 18+ 原生组件域（三轨主按钮、激光 Focus-Ring 表单、黑曜石 LED 状态标签、数控轻拟物开关、流体无框表格、高性能轻量浮层、微光卡片、日期时间拾取器全家桶、组织树与树选择、穿梭框、发光滑块与评分、警告卡片 Alert、动态进度条 Progress、步骤条 Steps、时间线 Timeline、徽标 Badge、结果页 Result、分段器 Segmented、折叠面板 Collapse、日历 Calendar、分栏器 Splitter） | `dist/theme-pro.css`<br>`/theme-pro`<br>`/theme/*`                                              |
| **主题引擎** | 租户品牌色动态换肤   | `setThemeColor`                                                                                                                                                                                                             | `color: string`, `options?: SetThemeColorOptions`                                                                                                                                                                                                                                                                                   | 纯原生高精度色阶演算（对齐 Element Plus 官方 Sass 混合算法）；100% 运行时动态生成 9 阶 light 与 2 阶 dark 色阶；支持 LocalStorage 持久化存储记忆、自定义 DOM 挂载目标与即时无刷换肤                                                                                                                                                                                                                                                                                                                                         | [`setThemeColor.test.ts`](./test/theme/setThemeColor.test.ts)<br>`/theme/tenant`                |
| **主题引擎** | 品牌色阶纯函数算法   | `generateThemePalette`                                                                                                                                                                                                      | `color: string`                                                                                                                                                                                                                                                                                                                     | 纯函数调色算法，输入 16 进制颜色（如 `#409eff`），高精度输出主色及全套 9 阶浅色与 2 阶深色配色字典；零外部调色库依赖                                                                                                                                                                                                                                                                                                                                                                                                        | [`setThemeColor.test.ts`](./test/theme/setThemeColor.test.ts)                                   |
| **专属类型** | 组件 Ref 实例与契约  | `AtengTableInstance`<br>`AtengCardGroupInstance`<br>`AtengAnchorInstance`<br>`AtengUploadInstance`<br>`AtengDateRangeInstance`<br>`AtengFooterBarInstance`<br>`AtengExcelExportInstance`<br>`AtengExcelFeedbackInstance` 等 | `InstanceType` 与接口定义                                                                                                                                                                                                                                                                                                           | 100% 显式收敛导出对外门面方法与状态，强类型安全闭环                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | [`index.test.ts`](./test/index.test.ts)                                                         |

---

## 维度一：最小起步体验 (Happy Path & Out-of-the-Box)

### 1. 安装依赖

```bash
pnpm add @atengk/core @atengk/vue @atengk/element-plus element-plus vue
```

### 2. 全量注册与样式引入

依据 [ADR-0015](../../docs/adr/0015-element-plus-vite-build-pipeline-and-single-css-strategy.md)，仅需单行引入统一打包样式文件 `@atengk/element-plus/style.css`：

```ts
import { createApp } from 'vue';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';

// 引入 @atengk/element-plus 核心套件与单一样式产物
import AtengElementPlus, { DictManager } from '@atengk/element-plus';
import '@atengk/element-plus/style.css';

// 可选：单行引入现代极客多主题引擎样式包 (Pro Theme)
import '@atengk/element-plus/theme-pro.css';

import App from './App.vue';

const app = createApp(App);
app.use(ElementPlus);
app.use(AtengElementPlus);

// 注入全局通用业务字典 Provider
DictManager.setProvider(async (code: string) => {
  const res = await fetch(`/api/system/dict/data/${code}`).then(r => r.json());
  return res.data;
});

app.mount('#app');
```

> [!TIP]
> **多主题启用**：引入 `theme-pro.css` 后，仅需在根节点 `<html data-theme="indigo">` 设置属性即可秒级开启预置科技风主题（支持 `indigo` 极客靛蓝、`emerald` 极客翠绿、`violet` 赛博幻紫、`ocean` 商务深海、`rose` 极光绯红），搭配 `class="dark"` 即可激活工业级 Slate 深空暗黑基底。全量样式纯 CSS 变量驱动，运行时零损耗。

### 3. 开箱即用体验：企业级 CRUD 查询与表格联动

无需编写复杂的翻页、Loading、排序与表单提交胶水逻辑，单行 `:pagination="pagination"` 自动完成双轨联动：

```vue
<script setup lang="ts">
import { reactive } from 'vue';
import { usePagination } from '@atengk/vue';
import { AtengTable, AtengQueryForm, AtengDateRange, AtengDictSelect } from '@atengk/element-plus';

interface UserItem {
  id: string;
  username: string;
  role: string;
  status: string;
  createTime: string;
}

// 1. 初始化业务分页服务状态机
const pagination = usePagination(fetchUserPageList, {
  defaultPageSize: 10,
  defaultSortField: 'createTime',
  defaultSortAsc: false,
});

// 2. 搜索表单状态模型（支持双字段解构时间绑定与字典选择）
const searchForm = reactive({
  username: '',
  role: '',
  startTime: '',
  endTime: '',
});

const handleBatchDelete = (users: UserItem[], clear: () => void) => {
  console.log(
    '批量删除:',
    users.map(u => u.id),
  );
  clear();
};
</script>

<template>
  <div class="user-management-page">
    <!-- 绑定 pagination 自动推导泛型 T 为 UserItem，全链路强类型闭环 -->
    <AtengTable
      :pagination="pagination"
      row-key="id"
      storage-key="user-table-columns"
      auto-height
      border
    >
      <!-- 顶部嵌入高级搜索表单：通过 Provide/Inject 自动触发 pagination.search 与 reset -->
      <template #query>
        <AtengQueryForm :model="searchForm" label-width="80px">
          <el-form-item label="用户姓名" prop="username">
            <el-input v-model="searchForm.username" placeholder="请输入姓名" clearable />
          </el-form-item>
          <el-form-item label="所属角色" prop="role">
            <AtengDictSelect v-model="searchForm.role" dict-code="sys_user_role" clearable />
          </el-form-item>
          <el-form-item label="创建时间">
            <AtengDateRange v-model:start="searchForm.startTime" v-model:end="searchForm.endTime" />
          </el-form-item>
        </AtengQueryForm>
      </template>

      <!-- 原生与混合列插槽：保留最熟悉的 Vue SFC 模板语法与复杂作用域插槽 -->
      <el-table-column type="selection" width="55" />
      <el-table-column prop="id" label="分布式ID" width="180" />
      <el-table-column prop="username" label="用户名" width="140" />
      <el-table-column prop="status" label="状态" width="120">
        <template #default="{ row }">
          <AtengDictTag dict-code="sys_user_status" :value="row.status" />
        </template>
      </el-table-column>
      <el-table-column prop="createTime" label="创建时间" sortable="custom" min-width="160" />

      <!-- 底部粘滞批量操作悬浮条：selectedRows 自动推导为 UserItem[] 强类型零强转 -->
      <template #batch-actions="{ selectedRows, clearSelection }">
        <el-button
          type="danger"
          size="small"
          @click="handleBatchDelete(selectedRows, clearSelection)"
        >
          批量删除 ({{ selectedRows.length }})
        </el-button>
        <el-button size="small" @click="clearSelection">取消选择</el-button>
      </template>
    </AtengTable>
  </div>
</template>
```

### 4. 开箱即用体验：页面骨架容器、弹性拖拽分栏与吸底操作栏

在中后台典型页面中，组装 `AtengPageContainer`、`AtengSplitLayout` 与 `AtengFooterBar` 构建标准化架构：

```vue
<template>
  <AtengPageContainer
    title="部门与员工协同中枢"
    sub-title="支持左树右表拖拽调宽与偏好记忆"
    :breadcrumb="[{ label: '首页', path: '/' }, { label: '组织架构' }]"
    fit-viewport
    show-back
  >
    <AtengSplitLayout
      v-model="splitWidth"
      storage-key="org_user_split"
      default-size="280px"
      min="180px"
      max="480px"
    >
      <!-- 左栏：组织架构树 -->
      <template #first>
        <el-tree :data="deptTree" default-expand-all />
      </template>

      <!-- 右栏：业务表格与吸底提交栏 -->
      <template #second>
        <AtengTable :data="userList" border>
          <el-table-column prop="name" label="姓名" />
          <el-table-column prop="role" label="岗位" />
        </AtengTable>

        <AtengFooterBar position="sticky">
          <template #extra>已选择 12 位员工</template>
          <el-button>重置</el-button>
          <el-button type="primary">确认分配</el-button>
        </AtengFooterBar>
      </template>
    </AtengSplitLayout>
  </AtengPageContainer>
</template>
```

---

## 维度二：生产扩展接管 (Customization & Extensibility)

### 1. 字典套件数据源接管与并发去重 (`DictManager`)

`DictManager` 采用单例无状态与纯内存缓存架构：

```ts
import { DictManager, type DictItem } from '@atengk/element-plus';

// 1. 注册全局字典数据源 Provider
DictManager.setProvider(async (dictCode: string): Promise<DictItem[]> => {
  const result = await http.get(`/system/dict/data/type/${dictCode}`);
  return result.data.map(item => ({
    label: item.dictLabel,
    value: item.dictValue,
    tagType: item.listClass,
  }));
});

// 2. 局部组件覆盖数据源（优先级高于全局 Provider）
<AtengDictSelect v-model="role" :loader="fetchCustomRoleList" />

// 3. 字典多选框组（支持全选快捷复选框与逗号分隔字符串双向解构绑定）
<AtengDictCheckbox
  v-model="selectedTags"
  dict-code="sys_notice_level"
  separator=","
  show-check-all
  button
/>

// 4. 内存缓存穿透刷新
await DictManager.loadDict('sys_user_status', undefined, true);

// 5. 批量预热与字段解耦映射 (Ticket #115)
// 页面初始化或登录后批量拉取多字典并常驻内存
await DictManager.preload(['sys_user_status', 'sys_notice_level']);

// 组件级别自定义字段映射与数字/字符串跨类型弱比对防呆
<AtengDictSelect
  v-model="status"
  dict-code="sys_user_status"
  :mapping="{ label: 'title', value: 'code' }"
  type-weak-match
  emit-item
  @change-item="item => console.log('选中项:', item)"
/>
```

### 2. 双字段解构绑定、业务预设周期与禁用策略 (`AtengDateRange`)

针对后端接口通常拆分为 `beginTime` 与 `endTime` 两个离散入参的常见痛点，`AtengDateRange` 深度内置双字段解构绑定协议与预置常用业务周期：

```vue
<!-- 双向双字段解构绑定，并在选择单日时自动补全为 00:00:00 与 23:59:59 -->
<AtengDateRange
  v-model:start="query.beginTime"
  v-model:end="query.endTime"
  :auto-time="true"
  value-format="YYYY-MM-DD HH:mm:ss"
/>

<!-- 业务预设周期快捷拉取、未来日期禁用与最大跨度限制 (Ticket #116) -->
<AtengDateRange
  v-model:start="query.beginTime"
  v-model:end="query.endTime"
  preset="last7Days"
  disable-future
  :max-range-days="90"
  value-format="YYYY-MM-DD HH:mm:ss"
/>
```

### 3. Fesod 批注错误回写与下载集成 (`AtengExcelFeedback`)

当用户上传导入 Excel 失败时，后端通常返回结构化错误明细或带有错误批注的 Excel 文件。通过 `AtengExcelFeedback` 可无缝接入：

```vue
<!-- 场景 A：后端返回 Fesod 标红批注 Excel 文件回写 -->
<AtengExcelFeedback
  v-model="feedbackVisible"
  title="用户数据导入校验失败"
  :errors="errorList"
  :download-action="handleDownloadAnnotatedExcel"
  file-name="用户导入校验失败批注清单.xlsx"
  @copy="onCopySuccess"
/>

<!-- 场景 B：后端未提供批注文件时，前端本地无缝降级生成带 UTF-8 BOM (\uFEFF) 的 CSV 错误清单（Windows Excel 双击不乱码） -->
<AtengExcelFeedback
  v-model="feedbackCsvVisible"
  title="用户数据导入校验失败"
  :errors="errorList"
  csv-file-name="导入校验错误清单.csv"
  @copy="onCopySuccess"
/>
```

### 4. 大文件切片并发上传状态机 (`AtengUpload`)

开启 `:chunk="true"` 模式后，`AtengUpload` 自动组装 `@atengk/vue` 的 `useUpload` 状态机，无需编写复杂的切片切片循环与并发限制：

```vue
<AtengUpload
  ref="uploadRef"
  :chunk="true"
  :chunk-size="5 * 1024 * 1024"
  :concurrency="3"
  :custom-upload-chunk="uploadChunkApi"
  :custom-merge="mergeChunksApi"
  @chunk-progress="progress => console.log('总进度:', progress)"
  @chunk-success="onAllChunksSuccess"
/>
```

通过对外暴露的 `uploadRef.value.pause()`、`resume()`、`cancel()` 可实现毫秒级暂停、恢复与网络中断。

同时深度组装 `AtengFilePreview` 预览灯箱，支持图片、PDF、音视频与代码文本在线即时调阅，内置 `beforePreview` 业务权限前置守卫：

```vue
<!-- 多媒体在线预览与 beforePreview 绝密权限业务前置守卫 (Ticket #117) -->
<AtengUpload
  v-model:file-list="fileList"
  :before-preview="
    file => {
      if (file.name.includes('secret')) {
        ElMessage.error('绝密档案禁止在线调阅！');
        return false; // 阻断预览
      }
      return true;
    }
  "
/>
```

### 5. 流式 Excel 声明式导出与 ADR-0004 双态异常防御 (`AtengExcelExport`)

`AtengExcelExport` 深度契合 ADR-0004 协议，可嵌套于 `AtengTable` 自动感知当前查询条件与跨页勾选行，或独立传参使用：

```vue
<!-- 表格上下文感知：勾选时优先导出选中项，无勾选时全量导出；内置 Blob-JSON 双态拦截与 Loading 互斥锁 -->
<AtengExcelExport :action="exportApi" filename="用户清单.xlsx" />

<!-- 独立传参与多模下拉菜单 -->
<AtengExcelExport
  :action="exportApi"
  :params="{ role: 'admin' }"
  mode="dropdown"
  type="success"
  text="多模导出"
/>
```

### 6. 吸底操作栏异步防重锁与骨架屏插槽平滑包装 (`AtengFooterBar` & `AtengPageSkeleton`)

`AtengFooterBar` 原生内置保存/重置/取消标准操作流与异步 Loading 互斥防重锁：

```vue
<!-- 绑定 async onSubmit 自动接管 loading 并禁用连击，彻底杜绝脏写并发 -->
<AtengFooterBar
  position="sticky"
  :on-submit="handleSaveForm"
  submit-text="保存企业资料"
  show-reset
  show-cancel
/>
```

`AtengPageSkeleton` 遵循插槽平滑包装器协议，直接包裹业务真实视图：

```vue
<!-- loading=false 时自带淡入淡出（Fade Transition）切换，告别突变与空白闪屏 -->
<AtengPageSkeleton :loading="pageLoading" type="table" :rows="5">
  <AtengTable :data="tableData" border>
    <!-- 业务表格内容 -->
  </AtengTable>
</AtengPageSkeleton>
```

### 7. 纯原生表头列宽拖拽调整、列配置拖拽排序与 `autoHeight` 视口自适应 (`AtengTable`)

`AtengTable` 针对现代企业级中后台表格交互，坚决摒弃引入 `SortableJS` 等重型第三方库：

- **原生表头列宽拖拽调整**：原生支持在表头列右边缘按住鼠标拖拽调整列宽，内置 `Math.max(40, newWidth)` 最小 40px 防塌陷保底；当配置 `storageKey` 时，拖拽结果自动持久化至 LocalStorage，页面刷新后列宽精确恢复记忆；并在右上角「列设置」Popover 中提供「重置列宽」按钮一键还原。
- **纯原生 HTML5 列配置拖拽排序**：基于纯原生 HTML5 Drag & Drop API 实现列配置弹窗内的拖拽排序，顺序刷新后持久化记忆。
- **视口高度自适应**：集成 `autoHeight` 基于 `ResizeObserver` 动态计算视口剩余空间，彻底消除双滚动条与视口撑破。

```vue
<!-- 表格列宽调整记忆、视口高度自适应与原生列拖拽排序持久化 -->
<AtengTable
  :pagination="pagination"
  :auto-height="32"
  :enable-column-resize="true"
  :min-resize-width="40"
  storage-key="admin-user-table-columns"
  row-key="id"
  border
>
  <el-table-column type="selection" width="55" fixed="left" />
  <el-table-column prop="id" label="分布式ID" width="180" />
  <el-table-column prop="username" label="用户名" width="140" />
  <el-table-column prop="role" label="岗位角色" width="120" />
  <el-table-column prop="createTime" label="创建时间" min-width="160" />
</AtengTable>
```

### 7. 搜索感知多态缺省态与一键清空自愈联动 (`AtengTable` & `AtengQueryForm`)

企业级中后台中，当用户输入特定筛选条件导致数据为空时，若仅展示“暂无数据”易引发“系统没数据”的误解。`AtengTable` 内置多态缺省态计算引擎，并与 `AtengQueryForm` 深度联动自愈：

- **多态缺省态引擎**：用户自定义 `#empty` 插槽最高优先级；若 `hasError: true` 展示 `status="network-error"` 与重试按钮；若表格数据为空且探测到非空筛选条件时，自动切换为 `status="search"` 并展示“未找到符合条件的检索结果”；仅在无筛选参数时展示 `status="empty"` 与“暂无数据”。
- **一键清空自愈按钮**：在 `status="search"` 缺省态下内置呈现「清空筛选条件」按钮，点击时通过跨层级 Provide/Inject 调用 `tableContext.reset()`，驱动 `AtengQueryForm` 表单清空并自动向表格触发第 1 页数据拉取，瞬间自愈还原数据。

```vue
<!-- 搜索条件无匹配时自动呈现 status="search" 缺省态与一键自愈按钮 -->
<AtengTable
  :pagination="pagination"
  search-empty-description="未找到符合条件的检索结果，请尝试调整筛选条件"
>
  <template #query>
    <AtengQueryForm :model="queryForm">
      <el-form-item label="用户姓名" prop="username">
        <el-input v-model="queryForm.username" placeholder="输入姓名" clearable />
      </el-form-item>
    </AtengQueryForm>
  </template>
  <el-table-column prop="username" label="用户名" />
</AtengTable>
```

### 8. 容器感知响应式断点与多行折叠展示 (`AtengQueryForm`)

`AtengQueryForm` 彻底打破依赖浏览器全局 `window` 视口宽度的局限，全面升级为**容器感知响应式引擎 (Container Query)**：

- **容器级 ResizeObserver 响应式断点**：监听组件自身根容器的宽度变化，在 `<768px` (1 列)、`<1200px` (2 列)、`<1920px` (3 列)、`>=1920px` (4 列) 之间平滑无刷重排；当将表单嵌入 `AtengSplitLayout` 分栏、`AtengDrawer` 抽屉或 Tab 容器中，用户拖拽分栏手柄改变局部容器宽度时，表单即刻自适应调整列数，无需改变浏览器视口宽度！
- **多行折叠常驻展示 (`collapsedRows`)**：支持通过 `collapsedRows` 属性配置收起时常驻展示的行数（如 `collapsedRows="2"` 常驻 2 行），展开时平滑滑出全部检索项，并在折叠状态下始终将「查询 / 重置 / 展开」操作按钮保持在末尾。
- **重置自触发控制 (`autoSearchOnReset`)**：配置 `:auto-search-on-reset="true"`（默认 true），点击重置按钮时自动重置为默认值并立即派发 `@search` 事件。

```vue
<!-- 嵌入 AtengSplitLayout 演示容器感知响应式，配合 collapsedRows="2" 双行常驻折叠 -->
<AtengSplitLayout v-model="splitSize" min="20%" max="60%">
  <template #first>
    <el-tree :data="deptTree" />
  </template>
  <template #second>
    <AtengQueryForm
      :model="queryModel"
      :collapsed-rows="2"
      :default-collapsed="true"
      :auto-search-on-reset="true"
      @search="handleSearch"
      @reset="handleReset"
    >
      <el-form-item label="姓名" prop="name"><el-input v-model="queryModel.name" /></el-form-item>
      <el-form-item label="工号" prop="code"><el-input v-model="queryModel.code" /></el-form-item>
      <el-form-item label="角色" prop="role"><el-input v-model="queryModel.role" /></el-form-item>
      <el-form-item label="状态" prop="status"><el-input v-model="queryModel.status" /></el-form-item>
      <el-form-item label="邮箱" prop="email"><el-input v-model="queryModel.email" /></el-form-item>
      <el-form-item label="职级" prop="level"><el-input v-model="queryModel.level" /></el-form-item>
    </AtengQueryForm>
  </template>
</AtengSplitLayout>
```

### 9. Vue 3.5 SFC 原生泛型全链路打通 (`<AtengTable<T>>` & `<AtengDescriptions<T>>`)

遵循 ADR-0002 规范，`AtengTable` 与 `AtengDescriptions` 采用 Vue 3.5 原生 `<script setup lang="ts" generic="T extends Record<string, unknown> = Record<string, unknown>">`：

- 组件使用方无需任何深层 `as UserItem[]` 强转断言；
- Props（`:data="userList"`、`:pagination="pagination"`）、Emits（`@selection-change`）、Slots（`#batch-actions="{ selectedRows }"`）及 Expose（`tableRef.value.selectedRows`）全链路 100% 具备强类型推导与 IDE 智能补全；
- `AtengDescriptions` 支持 `<AtengDescriptions<UserDetailProfile>>`，其 `:data` 与 `DescriptionsItemConfig<T>` 字段严格校验，彻底消灭拼写错误。

### 10. 面向 LLM 与 SSE 流式响应的纯原生打字机 (`AtengStreamText`)

`AtengStreamText` 面向现代大语言模型生成式输出与 SSE 流式数据推送，纯原生微任务实现平滑打字机切片呈现，内置呼吸光标状态机，可一键复制文本并无缝对接 `@atengk/vue` 的 `useStream` 状态机：

```vue
<!-- 纯原生逐字打字机切片、呼吸光标自适应淡出与一键复制代码 -->
<AtengStreamText
  ref="streamRef"
  :text="aiGeneratedMarkdown"
  :speed="30"
  :cursor="true"
  cursor-char="|"
  :show-copy="true"
  @finished="val => console.log('流式输出完毕, 总长:', val.length)"
  @copy="val => ElMessage.success(`内容已复制 (${val.length} 字符)`)"
/>
```

### 11. 高性能运维日志终端与防内存泄漏缓冲 (`AtengLogViewer`)

`AtengLogViewer` 面向 CI/CD 容器构建、服务端日志追踪与设备监控，深度对接 `@atengk/vue` 的 `useWebSocket` 或静态日志列表：

```vue
<!-- 绑定 WebSocket 实时流，限制最大 2000 行环形缓冲，内置关键词检索过滤与 XSS 安全防御 -->
<AtengLogViewer
  :web-socket="wsResult"
  :max-lines="2000"
  height="480px"
  theme="dark"
  title="生产构建监控终端"
/>
```

### 12. 金融级动效统计指标卡片 (`AtengStatistic`)

`AtengStatistic` 基于原生 `requestAnimationFrame` 指数衰减缓动算法实现平滑翻牌过渡动画（零第三方依赖），支持金融级千分位与涨跌微标：

```vue
<!-- 金融级平滑数字滚动卡片，支持千分位格式化、红涨绿跌微标与骨架屏 Loading -->
<AtengStatistic
  title="年度总成交额 (GMV)"
  :value="8923450.68"
  prefix="¥"
  suffix="元"
  :thousands="true"
  trend="up"
  trend-value="+18.5%"
  :duration="1200"
/>
```

### 13. 零依赖结构化代码与数据查看器 (`AtengCodeView`)

`AtengCodeView` 面向接口报文查阅、审计日志详情与配置展示，坚决拒绝引入 Monaco Editor 或 Prism.js 等庞大类库。采用纯原生 TypeScript 分词状态机与成对括号折叠算法，支持 JSON 对象/数组树形折叠、SQL 语法高亮、自适应行号侧边栏与一键复制反馈：

```vue
<!-- 结构化数据查看器，支持 JSON 树形折叠、代码高亮、行号与明暗双模 -->
<AtengCodeView
  :code="responsePayload"
  language="json"
  theme="dark"
  :collapsible="true"
  :line-numbers="true"
  max-height="450px"
  @copy="text => ElMessage.success(`代码已复制 (${text.length} 字符)`)"
/>
```

### 14. 企业级原生图标选择器与拼音极速检索 (`AtengIconSelect`)

`AtengIconSelect` 面向菜单管理与权限分配，内建全量常用官方标准 SVG 图标库（零外部依赖）。支持中文、全拼与拼音首字母模糊检索，支持 Popover 浮窗与 Dialog 弹窗双模展现，并提供网格分页与一键复制 `<el-icon>` 组件代码：

```vue
<!-- 支持 Popover/Dialog 双模、拼音首字母/全拼检索与一键复制代码组件 -->
<AtengIconSelect
  v-model="menuIcon"
  mode="popover"
  placeholder="请选择菜单图标"
  :show-copy="true"
  :page-size="36"
  @select="item => console.log('选中图标:', item)"
/>
```

### 15. 安全防刷新验证码倒计时与前置拦截 (`AtengCaptcha`)

`AtengCaptcha` 面向登录注册、找回密码与短信推送场景，摒弃易失的内存倒计时，基于 LocalStorage 物理时间戳防刷新清零。支持前置异步校验拦截（`beforeSend`）、异步发送 Loading 互斥防重锁与图形验证码刷新形态：

```vue
<!-- 短信/邮件验证码倒计时：持久化防刷新 + 前置异步校验拦截 -->
<AtengCaptcha
  storage-key="login_sms_timer"
  :seconds="60"
  :before-send="checkPhoneBeforeSend"
  :send="mockSendSms"
/>

<!-- 图形验证码形态与点击刷新 -->
<AtengCaptcha type="image" :image-src="currentImageSrc" :refresh="handleRefreshImage" />
```

### 16. 原生轻量多格式文件在线预览门户 (`AtengFilePreview`)

`AtengFilePreview` 面向附件查阅、图片轮播、音视频审查与日志报文浏览，坚决拒绝引入数十 MB 的 pdfjs 或 video.js 重型依赖。基于纯原生 HTML5 与组件联动，支持图片灯箱、原生 PDF、音视频播放、代码文本高亮（复用 `AtengCodeView`）与未知格式降级下载：

```vue
<!-- 内嵌模式：智能推导文件类型（支持图片、PDF、音视频、代码文本与未知降级） -->
<AtengFilePreview
  url="https://example.com/files/report.pdf"
  name="年度经营汇报.pdf"
  height="520px"
  @download="filename => console.log('下载文件:', filename)"
/>

<!-- 对话框弹窗模式 (v-model:visible) 与本地 File/Blob 即时预览 -->
<AtengFilePreview
  v-model:visible="isPreviewDialogVisible"
  mode="dialog"
  :file="uploadFileRaw"
  title="本地文件预览"
/>
```

### 17. 现代极客多主题引擎与预设科技风切换 (`@atengk/element-plus/theme-pro.css`)

面向现代云原生控制台、DevOps 平台与 AI 交互系统，提供开箱即用、纯 CSS 变量驱动的工业级现代极客主题引擎：

- **5 款预置科技配色**：
  - `indigo`（极客靛蓝，默认 Linear 质感高智冷调 `#4f46e5`）
  - `emerald`（极客翠绿，清新翡翠青 `#10b981`）
  - `violet`（赛博幻紫，未来主义霓虹幻紫 `#7c3aed`）
  - `ocean`（商务深海，严谨可靠深海蓝 `#0284c7`）
  - `rose`（极光绯红，热烈创新高能绯红 `#e11d48`）
- **Slate 冷感深空暗黑基底**：基于 Slate 调色板重构 Element Plus 暗黑体系（底板 `--el-bg-color-page: #0b0f19`、卡片 `--el-bg-color: #111827`、浮层 `--el-bg-color-overlay: #1e293b`），告别发灰混浊的视觉体验；
- **现代质感组件增强**：
  - **三轨主按钮**：纯色扁平、渐变极客（`.at-btn-gradient`）与微光脉冲发光（`.at-btn-glow`）；
  - **激光 Focus-Ring**：输入框、选择器在 `:focus-within` 下呈现 3px 柔和半透明光晕扩散；
  - **黑曜石暗晶体 LED 标签**：暗黑模式下呈现暗晶底色与 6px LED 呼吸微标；
  - **数控轻拟物开关**：内嵌线性滑槽阴影与滑动球体光晕，提供数控级精密微交互；
  - **流体无框表格**：无重边框、表头悬浮微光、斑马纹细腻区分与 150ms 平滑悬浮高亮；
  - **高质感浮层**：弹窗与抽屉 Header 采用独立 GPU 合成图层与实体微透高质感底色（0 模糊计算、0 掉帧）；
  - **微光卡片与 Pills 导航**：卡片上边缘微光发光线条、Tabs 胶囊 Pill 切换滑块。

```vue
<!-- 1. 切换预设主题与暗黑基底 -->
<script setup lang="ts">
import { ref } from 'vue';

type ThemeName = 'indigo' | 'emerald' | 'violet' | 'ocean' | 'rose';
const currentTheme = ref<ThemeName>('indigo');

function switchTheme(theme: ThemeName) {
  currentTheme.value = theme;
  document.documentElement.setAttribute('data-theme', theme);
}
</script>

<!-- 2. 组件样式的零 !important 优雅局部定制与逃生门 -->
<style scoped>
/* 业务视图无需任何 !important 即可优雅覆盖组件样式 */
.custom-card {
  --el-card-border-color: rgba(59, 130, 246, 0.4);
  border-radius: 16px;
}
</style>
```

### 18. 运行时租户品牌色动态高精度换肤 (`setThemeColor`)

针对多租户 SaaS 系统、个性化自选品牌色等动态场景，`setThemeColor` 提供纯原生极速色阶演算，100% 对齐官方 Sass 线性插值标准：

```ts
import { setThemeColor, generateThemePalette } from '@atengk/element-plus';

// 1. 纯函数生成完整色阶（9 阶 light + 2 阶 dark）
const palette = generateThemePalette('#10b981');
console.log(palette['--el-color-primary']); // '#10b981'
console.log(palette['--el-color-primary-light-3']); // '#57ce9e'
console.log(palette['--el-color-primary-dark-2']); // '#0d9468'

// 2. 动态换肤并持久化至 LocalStorage（页面刷新自动保持）
setThemeColor('#8b5cf6', {
  storageKey: 'my_tenant_theme_color',
  dark: document.documentElement.classList.contains('dark'),
});

// 3. 应用初始化时从存储中恢复品牌色
const savedColor = localStorage.getItem('my_tenant_theme_color');
if (savedColor) {
  setThemeColor(savedColor);
}
```

### 19. AtengTable 跨页多选记忆与批量操作 (`reserveSelection` & `useSelection`)

`AtengTable` 原生支持跨页勾选记忆。配置 `:reserve-selection="true"` 时，翻页与切换每页条数将持续保持已选中的数据行，配合 `v-model:selected-keys` 双向受控，彻底告别传统表格翻页即丢失勾选状态的痛点：

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { AtengTable } from '@atengk/element-plus';
import { usePagination } from '@atengk/vue';

interface UserItem {
  id: string; // 64 位雪花大数 ID
  name: string;
}

const pagination = usePagination(fetchUsers);
const selectedKeys = ref<string[]>([]);

const handleBatchDelete = (users: UserItem[], clear: () => void) => {
  console.log('批量处理选中的项:', users);
  clear();
};
</script>

<template>
  <AtengTable
    :pagination="pagination"
    row-key="id"
    :reserve-selection="true"
    v-model:selected-keys="selectedKeys"
  >
    <el-table-column type="selection" width="55" />
    <el-table-column prop="id" label="ID" />
    <el-table-column prop="name" label="姓名" />

    <template #batch-actions="{ selectedRows, clearSelection }">
      <span>已跨页选中 {{ selectedRows.length }} 项</span>
      <el-button
        type="danger"
        size="small"
        @click="handleBatchDelete(selectedRows, clearSelection)"
      >
        批量删除
      </el-button>
    </template>
  </AtengTable>
</template>
```

### 20. AtengQueryForm 零胶水直连分页状态机与默认回车即搜 (`pagination` & `enterSearch`)

`AtengQueryForm` 原生支持直接直连 `@atengk/vue` 的 `usePagination` 分页调度状态机。无需在业务层手动编写 `@search="params => pagination.search(params)"` 与 `@reset="pagination.reset()"` 样板代码；同时内置 `enterSearch: true`，在表单内任何输入框敲击回车键即可自动触发查询：

```vue
<script setup lang="ts">
import { reactive } from 'vue';
import { AtengQueryForm } from '@atengk/element-plus';
import { usePagination } from '@atengk/vue';

const queryModel = reactive({
  keyword: '',
  departmentId: '',
});

const pagination = usePagination(fetchUsers);
</script>

<template>
  <!-- 零胶水直连 pagination：搜索与重置全自动由状态机接管，默认回车即搜 -->
  <AtengQueryForm
    :model="queryModel"
    :pagination="pagination"
    :enter-search="true"
    :collapsed-rows="1"
  >
    <el-form-item label="关键字" prop="keyword">
      <el-input v-model="queryModel.keyword" placeholder="回车即搜..." clearable />
    </el-form-item>
    <el-form-item label="部门" prop="departmentId">
      <el-input v-model="queryModel.departmentId" placeholder="部门编号" clearable />
    </el-form-item>
  </AtengQueryForm>
</template>
```

### 21. AtengDialog 与 AtengDrawer 表单自动校验流转与优雅防误关 (`formRef` & `confirmOnClose`)

面向复杂表单弹窗/抽屉场景，`AtengDialog` 与 `AtengDrawer` 原生支持通过 `:form-ref` 绑定内嵌表单实例，确定性在触发确认动作前自动执行前置校验。校验失败时就地阻断并保留错误现场；支持 `:confirm-on-close="true"` 二次防误关确认，杜绝用户误触丢失编辑中内容：

```vue
<script setup lang="ts">
import { ref, reactive } from 'vue';
import { AtengDialog } from '@atengk/element-plus';
import type { FormInstance } from 'element-plus';

const visible = ref(false);
const formRef = ref<FormInstance>();
const formData = reactive({ name: '', email: '' });
const rules = {
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
};

const handleConfirm = async () => {
  // 仅在 formRef 前置校验 100% 通过后才会执行到此处，并自动开启 loading
  await apiSubmit(formData);
};
</script>

<template>
  <AtengDialog
    v-model="visible"
    title="新建项目"
    :form-ref="formRef"
    :confirm-on-close="true"
    :before-confirm="handleConfirm"
  >
    <el-form ref="formRef" :model="formData" :rules="rules" label-width="80px">
      <el-form-item label="名称" prop="name">
        <el-input v-model="formData.name" />
      </el-form-item>
      <el-form-item label="邮箱" prop="email">
        <el-input v-model="formData.email" />
      </el-form-item>
    </el-form>
  </AtengDialog>
</template>
```

### 22. AtengDescriptions 声明式一键复制与统一空安全保底 (`copyable` & `emptyText`)

`AtengDescriptions` 深度践行“内存真明文契约”，配置 `:copyable="true"` 可在容器级或单项级一键开启剪贴板复制。复制时严格提取脱敏前的原始明文数据；空值统一保底对齐企业规范 `'--'`，且空值项绝不呈现复制按钮：

```vue
<script setup lang="ts">
import { AtengDescriptions, AtengDescriptionsItem } from '@atengk/element-plus';

const userDetail = {
  username: 'ateng_admin',
  phone: '13812345678',
  email: '', // 空值将自动保底显示 '--' 且不展示复制图标
};
</script>

<template>
  <!-- copyable 容器级开启，空值自动统一保底显示 '--' -->
  <AtengDescriptions :data="userDetail" :column="3" border copyable>
    <AtengDescriptionsItem prop="username" label="登录账号" />
    <!-- 视图脱敏显示为 138****5678，点击复制按钮真实复制明文 13812345678 -->
    <AtengDescriptionsItem prop="phone" label="手机号码" mask="phone" />
    <AtengDescriptionsItem prop="email" label="企业邮箱" />
  </AtengDescriptions>
</template>
```

---

## 维度三：核心生产边界与非功能语义 (Production Boundary & Failure Modes)

1. **字典高并发请求合并去重不变量 (In-Flight Request Coalescing Invariant)**：
   - 界面上无论同时渲染多少个同类型字典组件（例如表格一屏 50 行同时使用 `AtengDictTag dict-code="sys_user_status"`），`DictManager` 在飞行中（In-Flight）自动合并同 code 的并发 Promise。真实物理网络只发送 1 次 HTTP 请求，结果解析后全量常驻内存，彻底杜绝字典并发风暴；
2. **数据脱敏与“内存真明文”防线 (In-Memory Plaintext Invariant)**：
   - `AtengDescriptions` 内置的手机（`mask="phone"`）、身份证（`mask="idCard"`）、银行卡（`mask="bankCard"`）等脱敏管道仅在虚拟 DOM 渲染视图层动态格式化，底层绑定的响应式对象始终保持原始真实明文，防止数据回传时将星号脏数据写回数据库；
3. **时刻对齐防边界遗漏不变量 (Date Boundary Alignment Invariant)**：
   - `AtengDateRange` 默认开启 `autoTime: true`。当选择时间区间时，起始时间无论原始毫秒如何，自动规范化为当天 `00:00:00`，截止时间自动规范化为当天 `23:59:59`，彻底根除因缺少截止当天最后一秒导致查询漏数据的经典边界缺陷；
4. **大文件切片生命周期与 AbortSignal 秒级中断 (Deterministic Cleanup Invariant)**：
   - `AtengUpload` 分片上传在调用 `cancel()` 或组件销毁（`onUnmounted`）时，通过内部 `AbortController` 立即中断底层 Axios HTTP 连接，且确定性回收大文件切片的内存引用，坚决杜绝内存泄漏；
5. **雪花 ID 字符串主键不变量 (Snowflake String Key Invariant)**：
   - `AtengTable` 的 `rowKey` 默认指向 `'id'`，底层多选记忆与批量操作在内存中严格以字符串（String）为基准比对，杜绝因转换为 JS Number 造成 $2^{53}-1$ 精度截断与多选错乱；
6. **异步确认 Loading 锁协议 (Async Confirm Lock Invariant)**：
   - `AtengDialog` 与 `AtengDrawer` 统一支持 `beforeConfirm` 异步钩子。在确认提交过程中自动开启 loading 并禁用取消按钮、ESC 键与遮罩关闭；若异步提交失败保持弹窗开启，保护用户输入现场；
7. **暗黑模式与设计令牌 100% 绑定 (Design Token Invariant)**：
   - 组件库样式 100% 复用 Element Plus 原生 CSS 变量（`--el-color-*`、`--el-bg-*`、`--el-border-*`、`--el-fill-*`），支持通过 `html.dark` 实现零配置暗黑模式自适应变色；
8. **严格 XSS 转义与零重型库语法高亮防线 (Safe Syntax Tokenization Invariant)**：
   - `AtengCodeView` 坚持纯原生 TypeScript 分词状态机与严格 HTML 字符实体转义，严禁将未受转义的原始标签直接注入 DOM；摒弃 Monaco Editor 与 Prism.js 等百 KB 级重型库，兼顾毫秒级极速渲染与成对成块树形折叠，并无缝集成 `v-copy` 一键剪贴板复制；
9. **图标库零臃肿与极速多维检索防线 (Zero-Bloat Icon Search Invariant)**：
   - `AtengIconSelect` 内建常用标准 SVG 矢量路径与拼音/中英索引，无需下游全量打包庞大外部图标包；通过纯内存拼音与英文倒排检索，兼顾毫秒级极速响应、网格极速分页与一键复制 `<el-icon>` 代码组件；
10. **物理时间戳防刷新与并发防刷互斥锁防线 (Physical Timestamp & Concurrency Lock Invariant)**：

- `AtengCaptcha` 倒计时摒弃传统的易失纯内存计时器，将绝对到期时间戳（`Date.now() + seconds * 1000`）持久化至 LocalStorage/SessionStorage。用户刷新页面或路由流转后重新挂载时，根据物理时钟差值自动精准恢复倒计时，彻底杜绝刷新页面重置倒计时的防刷漏洞；同时内置 `beforeSend` 前置校验与发送互斥锁，多重防护杜绝接口重复调用；

11. **纯原生零依赖文件渲染与 ObjectURL 确定性生命周期防线 (Zero-Bloat Preview & ObjectURL Lifecycle Invariant)**：

- `AtengFilePreview` 坚决拒绝引入 pdfjs、video.js 等数十 MB 级庞大依赖包，采用原生 HTML5 `iframe`、`video`、`audio`、`ElImage` 与 `AtengCodeView` 高性能组合实现全格式开箱即览；在传入本地 `File`/`Blob` 对象时，自动安全生成 `URL.createObjectURL` 临时句柄，并在更新资源或组件卸载（`onUnmounted`）时 100% 确定性调用 `URL.revokeObjectURL` 释放句柄，彻底杜绝浏览器内存泄漏；

12. **纯原生 HTML5 列拖拽排序与 ResizeObserver 视口高度自适应防线 (Native Drag Order & AutoHeight Invariant)**：

- `AtengTable` 坚决拒绝引入重型 `SortableJS`，基于原生 HTML5 Drag & Drop API 实现列配置列表的毫秒级拖拽排序，并通过 `storageKey` 本地持久化记忆用户排序列顺序；`autoHeight` 基于 `ResizeObserver` 实时监听父容器/视口变化动态计算表格体最大高度，组件销毁时确定性解绑监听，彻底告别双滚动条与视口撑破；

13. **2000 行环形内存截断防 DOM 膨胀与贴底滚动防线 (Circular Memory Buffer & Anti-DOM-Bloat Invariant)**：

- `AtengLogViewer` 面向高频实时日志流，内置固定容量环形队列（默认最大 2000 行），超限时以 $O(1)$ 复杂度自动丢弃最旧日志行，坚决杜绝因数万行 DOM 元素导致浏览器标签页内存溢出或卡顿崩溃；支持用户向上滚动时自动挂起贴底跟随，恢复贴底时无缝恢复实时滚屏；

14. **原生逐字打字机切片与 SSE/LLM 呼吸光标淡出防线 (Stream Text Tokenization Invariant)**：

- `AtengStreamText` 针对现代大模型流式输出（SSE/Fetch ReadableStream），基于原生微任务队列与字符切片实现打字机平滑过渡；内置呼吸光标状态机，在流式完成（`finished`）或中断时自动优雅淡出，杜绝幽灵光标残留；集成防 XSS 字符转义与一键剪贴板无感复制；

15. **原生 rAF 指数衰减缓动与金融级货币千分位防线 (rAF Easing Transition Invariant)**：
    - `AtengStatistic` 摒弃庞大的 `countup.js`，采用原生 `requestAnimationFrame` 与三阶指数衰减缓动算法驱动数字平滑过渡，并在目标值突变时自动从当前过渡值平滑重定向至新目标值，在组件销毁时立即取消未决帧，防内存泄露与脏帧渲染；
16. **双模视口滚动治理与弱感应路由面包屑防线 (Dual-Mode Scroll & Auto Breadcrumb Invariant)**：
    - `AtengPageContainer` 通过 `fitViewport` 严格解耦固定页头与内部自适应滚动区，杜绝内外双滚动条灾难；`autoBreadcrumb` 通过安全弱探测 `route.matched` 提炼有效层级并过滤无标题节点；`headerBlur` 吸顶轻量固顶质感与滚动动态 `.is-elevated` 投影平滑呈现现代沉浸质感；
17. **指针事件统一与双向折叠把手防线 (Pointer Events & Bidirectional Split Invariant)**：
    - `AtengSplitLayout` 采用 W3C `PointerEvent` 与 `setPointerCapture` 原生支持触控与 iPad 拖拽调宽，彻底消除高速越界丢帧；双向独立把手支持首栏与次栏折叠互斥安全；`storageKey` 本地同步恢复折叠偏好防首屏闪烁；
18. **智能容器避让与防穿透全局引用计数防线 (AutoOffset & Multi-Card Lock Invariant)**：
    - `AtengFooterBar` 在 `fixed` 模式下基于 `ResizeObserver` + rAF 动态测量容器边界平滑避让侧边栏折叠动画；`AtengCard` 采用模块级引用计数管理 `lockScroll` 全屏防穿透滚动锁，确保多卡片并发或嵌套弹层时 100% 确定性安全复原，ESC 快捷键尊重 `defaultPrevented` 防止误关子组件；
19. **流式自适应网格与仪表盘形态防线 (Fluid Adaptive Grid & Dashboard Skeleton Invariant)**：
    - `AtengPageSkeleton` 扩充 `'dashboard'` 高频形态（4 指标卡 + 双图表区块）；网格全面升级为现代 CSS Grid `repeat(auto-fit, minmax(220px, 1fr))` 流式自适应，移动端与窄屏自然折行，杜绝挤压变形与横向溢出；
20. **40px 最小列宽防塌陷与存储防脏数据不变量 (Column Resize Min Width & Storage Invariant)**：
    - `AtengTable` 在表头拖拽调整列宽时，强制执行 `Math.max(40, newWidth)` 保底，防止用户误操作将列宽缩减至 0 或负数导致列在 DOM 中完全不可逆塌陷消失；本地反序列化列宽配置时，严格进行非空对象与正数值白名单校验，若发现脏数据或损坏数据立即安全降级忽略，确保界面永不崩溃；
21. **容器感知断点隔离不变量 (Container Query & ResizeObserver Invariant)**：
    - `AtengQueryForm` 彻底解耦对全局 `window.innerWidth` 的依赖，基于组件根 DOM 节点的 `ResizeObserver` 动态计算断点（<768px 单列 / <1200px 双列 / <1920px 三列 / ≥1920px 四列）。当嵌套在 `AtengSplitLayout` 分栏拖拽、抽屉或卡片内部时，仅响应自身所在容器的物理宽度变化；组件销毁时确定性调用 `disconnect()` 解绑，零悬挂监听与内存泄露；
22. **搜索多态缺省态与双向重置自愈通道 (Polymorphic Empty & Healing Reset Invariant)**：
    - `AtengTable` 智能感知数据源状态，当数据为空且存在非空检索字段时确定性展示 `status="search"` 多态缺省态与一键清空自愈按钮；点击自愈按钮时通过 `tableContext.reset()` 跨层级双向通道驱动 `AtengQueryForm` 重置并向表格重刷第 1 页数据，消灭因检索条件无匹配且缺乏自愈路径导致业务停滞的体验盲区；
23. **现代极客多主题纯 CSS 变量驱动与零运行时开销不变量 (Zero-Runtime Theme Overhead Invariant)**：
    - `theme-pro.css` 全量样式规则采用纯原生 CSS Custom Properties 派生演算，零 CSS-in-JS 或额外 JS 运行时重绘开销；切换主题仅需在 `<html>` 节点切换 `data-theme` 属性即可瞬间激活不同科技风配色，性能达到原生浏览器渲染顶峰；
24. **零 `!important` 与无损样式逃生门防线 (Zero !important & Extensible Invariant)**：
    - 主题引擎全量样式代码（包括 5 套预设、暗黑适配与组件增强）坚持 100% 绝对不使用 `!important`；上层业务组件库与业务视图可以基于常规 CSS 优先级无损覆盖或微调任意样式变量，彻底消除样式被锁死无法定制的痛点；
25. **官方 Sass 线性插值算法 100% 精度对齐防线 (Color Palette Precision Invariant)**：
    - `generateThemePalette` 与 `setThemeColor` 底层调色算法严格遵循 Element Plus 官方 `color.mix($color-white, $base, weight)` 数学公式，在 RGB 空间进行精准整数四舍五入线性混合，与官方 Sass 编译产物达到逐通道 100% 精度对齐，杜绝因粗糙颜色转换造成的色阶偏离与视觉失真；
26. **现代等宽数字 Tabular Nums 防抖与微动效平衡不变量 (Tabular Nums & Anti-Jitter Invariant)**：
    - 主题引擎在表格单元格、统计指标及卡片中全局强制开启 `font-variant-numeric: tabular-nums`，确保数字列在动态递增或高频刷新时绝对等宽，根除表格列宽微幅左右跳动的视觉抖动缺陷；同时表格 Hover 状态统一采用 150ms 优雅淡入缓动，兼顾极致流畅度与科技品质感；
27. **弹窗/抽屉 GPU 硬件合成图层与分帧挂载防掉帧防线 (Modal Layer Promotion & Deferred Mount Invariant)**：
    - 遮罩层彻底剥离全屏 `backdrop-filter` 避免动效期间 100vw*100vh 动态高斯模糊吞噬显存与 GPU 算力；弹窗与抽屉提升为独立 GPU 合成图层（`will-change`, `transform: translateZ(0)`）；支持开箱即用的 `:lazy-render="true"`，在 250ms 展开动效完成后（`@opened`）再平滑挂载重型业务节点，首帧 100% 独占主线程，彻底消除大页面打开弹窗时的掉帧卡顿；
28. **表单自动前置校验流转与防误关二次确认不变量 (Form Validation & Safe Close Invariant)**：
    - `AtengDialog` 与 `AtengDrawer` 支持 `:form-ref` 绑定内嵌表单，在点击确定时自动触发 `validate()`，若校验不通过确定性阻断并保留错误高亮，不触发 `beforeConfirm` 亦不开启 loading；若开启 `:confirm-on-close`，在用户点击右上角关闭、遮罩层或按 ESC 时弹出 `ElMessageBox.confirm` 二次确认弹窗，用户确认关闭才关闭，取消则安全留在当前编辑态；
29. **详情内存真明文一键复制与统一空安全保底不变量 (In-Memory Plaintext Copy & Descriptions Invariant)**：
    - `AtengDescriptions` 开启 `:copyable` 时，复制内容严格提取原始未脱敏明文数据，绝不复制脱敏掩码脏数据；空值（`null`、`undefined`、`''`）统一保底对齐企业规范 `'--'`，且空值字段绝对不展示复制图标，避免复制无意义的占位符。

---

## 维度四：物理排版与代码全真验证 (Evergreen & Zero-Glitch)

- 所有代码示例与 API 100% 对齐 TypeScript 强类型定义；
- 所有特性 100% 经由 `packages/element-plus/test` 离线单元测试覆盖，并在 `apps/sample-element-plus` 自验展厅中跑通真实交互。
