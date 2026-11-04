# sample-element-plus Element Plus 基础设施自验展厅

> 专注于演示与自验 `@atengk/element-plus` 核心组件、业务套件、指令集与 Theme Pro 现代多主题引擎在真实业务场景下的开箱使用与交互自验。

---

## 1. 快速启动与服务端口

- **默认固定端口**：`3003` (严格遵守 ADR-0001 / ADR-0009 端口契约)
- **启动方式**：
  ```bash
  pnpm --filter sample-element-plus dev
  ```
- 启动后浏览器访问：`http://localhost:3003`

---

## 2. 运行环境与 Mock 双模切换

- **默认/CI 模式**：内置离线自洽 Mock 数据，无需启动任何外部后端服务即可直接体验完整交互与跑通自动化检查；
- **Local 真实网关模式**：若需连接真实后端服务，复制 `.env.example` 为 `.env.local` 并配置 `VITE_API_BASE_URL`，重启开发服务即可直连真实微服务网关接口（该环境配置受 Git 忽略，CI 零风险）。

---

## 3. 核心场景看板与交互路由表

应用启动后，可通过侧边栏导航或直接访问以下 6 大模块、43 个独立场景路由视图进行直观交互体验：

| 场景分类     | 场景看板组件 / 路由路径                                     | 核心可视化交互操作                                                                                | 验证重点                                                                                     |
| :----------- | :---------------------------------------------------------- | :------------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------- |
| **权限指令** | `PermissionView.vue`<br/>(`/directives/permission`)         | 切换测试角色与权限码下拉列表，观察不同权限下操作按钮的即时显隐与置灰状态                          | 验证 `v-permission` 权限码控制、DOM 物理移除插回与 `.disabled` 修饰符                        |
| **角色指令** | `RoleView.vue`<br/>(`/directives/role`)                     | 切换普通员工/运维管理员/超级管理员，验证特定角色专属操作权限与超管全局放行                        | 验证 `v-role` 角色控制与 admin / superadmin 全局豁免机制                                     |
| **防重指令** | `IdempotentView.vue`<br/>(`/directives/idempotent`)         | 高频疯狂点击“模拟下单”与“异步支付”按钮；测试超时防死锁机制                                        | 验证 `v-idempotent` 毫秒级时间窗口防刷、异步 Promise 锁与捕获阶段连击拦截                    |
| **工具指令** | `CopyView.vue`<br/>(`/directives/copy`)                     | 点击复制优惠券码、订单号与动态 Getter 函数生成的订单详情，观察轻量气泡反馈                        | 验证 `v-copy` 原生剪贴板 API 调用、execCommand 降级及 ElMessage 联动                         |
| **工具指令** | `WatermarkView.vue`<br/>(`/directives/watermark`)           | 动态修改水印文本与颜色；打开浏览器控制台尝试删除水印 DOM 或篡改样式                               | 验证 `v-watermark` 局部/全屏双模、Canvas 高清离线渲染与 MutationObserver 篡改自愈            |
| **工具指令** | `SkeletonView.vue`<br/>(`/directives/skeleton`)             | 切换微骨架开关，对比加载态与真实内容的排版变化                                                    | 验证 `v-skeleton` 原位盒模型伪元素微光遮罩与 Zero-CLS 零布局跳变                             |
| **模态容器** | `DialogView.vue`<br/>(`/containers/dialog`)                 | 打开弹窗、拖拽标题栏、双击顶栏全屏、触发表单自动校验，并在表单脏数据下测试防误关                  | 验证 `AtengDialog` 拖拽调位、`:form-ref` 异步校验流转与 `:confirm-on-close` 防误关           |
| **模态容器** | `DrawerView.vue`<br/>(`/containers/drawer`)                 | 打开抽屉、切换 small/default/large 尺寸断点；缩放浏览器至移动端视口（<768px）                     | 验证 `AtengDrawer` 响应式语义尺寸、移动端 100% 全宽自适应与异步提交 Loading 锁               |
| **缺省占位** | `EmptyView.vue`<br/>(`/containers/empty`)                   | 切换 empty、search、403、network-error、500 五大语义状态，切换明暗主题                            | 验证 `AtengEmpty` 多态语义状态占位与纯矢量 SVG 插画暗黑模式自适应                            |
| **加载反馈** | `LoadingView.vue`<br/>(`/containers/loading`)               | 对比体验顶沿极光流线（Zero-Overlay）、三点弹性微波浪与脉冲骨架屏；触发 2px 顶栏流光线             | 验证 `AtengLoading` 零遮罩加载与 150ms/300ms 防闪烁，以及 `installLoadingBar` 路由守卫流光线 |
| **框架布局** | `ProLayoutView.vue`<br/>(`/layout/pro-layout`)              | 切换 Side（经典侧边）、Top（顶部通栏）、Mix（顶左混合）三大布局；折叠侧边栏；缩放视口至移动端抽屉 | 验证 `AtengProLayout` 多形态布局、异构菜单字段别名自适应映射与移动端抽屉遮罩                 |
| **框架布局** | `TabsNavView.vue`<br/>(`/layout/tabs-nav`)                  | 连续打开多个标签页测试横向滚轮滑动；拖拽标签卡片调整顺序；右键调出上下文快捷菜单                  | 验证 `AtengTabsNav` 视口溢出滚动、原生拖拽排序、批量关闭与 KeepAlive 缓存名单同步            |
| **框架布局** | `LayoutView.vue`<br/>(`/layout/layout`)                     | 切换弹性 Aside 展开与折叠（64px/220px）；测试多层 Header/Content/Footer 纯无状态排版              | 验证 `AtengLayout` 纯无状态 Flex 盒模型布局与运行时自动 Aside 感知                           |
| **容器套件** | `ContainerSuiteView.vue`<br/>(`/layout/container-suite`)    | 浏览包含页头折叠、左右拖拽分栏、电梯楼层寻锚与底栏避让的综合业务页面                              | 验证 `AtengContainerSuite` 骨架与通用容器大满贯深度协同，打通整套容器上下文总线              |
| **页面骨架** | `PageContainerView.vue`<br/>(`/layout/page-container`)      | 滚动内容区观察页头固顶与阴影渐变；向下滚动测试页头平滑折叠；点击全屏展开                          | 验证 `AtengPageContainer` 容器总线注入、自动路由面包屑、滚动阴影与 Teleport 全屏脱壳         |
| **页面骨架** | `SplitLayoutView.vue`<br/>(`/layout/split-layout`)          | 鼠标按住分割把手左右拖拽调整宽度；拖拽逼近左右边缘测试磁吸折叠与反向拉出                          | 验证 `AtengSplitLayout` 原生 Pointer Events 触控、`snapThreshold` 边缘磁吸附与尺寸持久化     |
| **页面骨架** | `FooterBarView.vue`<br/>(`/layout/footer-bar`)              | 滚动页面观察底栏吸底粘滞；点击“保存”按钮触发异步 Promise 提交，监视自动防重锁                     | 验证 `AtengFooterBar` 智能避让侧边栏、容器高度垫块自动注册与提交防重复点击                   |
| **页面骨架** | `CardView.vue`<br/>(`/layout/card`)                         | 点击右上角局部刷新按钮；点击折叠展开卡片；点击全屏展开并测试 ESC 退出与滚动防穿透                 | 验证 `AtengCard` 结构化标题/操作栏、360 度平滑刷新动效、折叠展开与视口最大化                 |
| **页面骨架** | `CardGroupView.vue`<br/>(`/layout/card-group`)              | 点击不同卡片标题栏；切换“手风琴互斥”开关；点击实例方法“全部展开”与“全部折叠”                      | 验证 `AtengCardGroup` 跨层协调子卡片状态机、accordion 单开互斥与对称批量控制                 |
| **页面骨架** | `SkeletonView.vue`<br/>(`/layout/skeleton`)                 | 切换 table、form、detail、card、dashboard 五大预设；调整列宽比例与假分页栏开关                    | 验证 `AtengPageSkeleton` 多形态预设与内容插槽渐变平滑过渡（Fade Transition）                 |
| **页面容器** | `WatermarkView.vue`<br/>(`/layout/watermark`)               | 修改水印内容、旋转角度与透明度；在浏览器中尝试审查元素删除水印包裹层                              | 验证 `AtengWatermark` 容器包裹形态、离屏 Canvas 渲染与 MutationObserver 动态防篡改           |
| **页面容器** | `GridView.vue`<br/>(`/layout/grid`)                         | 动态拖拽调节父容器宽度，观察子元素在无 JS ResizeObserver 介入下的无断点平滑流式重排               | 验证 `AtengGrid` 现代 CSS 容器查询（Container Queries）与 `repeat(auto-fill, minmax)`        |
| **页面容器** | `AnchorView.vue`<br/>(`/layout/anchor`)                     | 滚动卡片内容区，观察锚点游标墨水指示条实时跟随高亮；点击楼层锚点平滑直达                          | 验证 `AtengAnchor` 局部滚动宿主自动识别、吸顶安全避让与 requestAnimationFrame 节流监听       |
| **数据表格** | `QueryFormView.vue`<br/>(`/table/query-form`)               | 调整浏览器窗口宽度观察 1~4 列响应式栅格；点击“展开/收起”查看多行折叠；输入回车即搜                | 验证 `AtengQueryForm` 容器感知断点、回车即搜与自动重置联动                                   |
| **数据表格** | `TableCrudView.vue`<br/>(`/table/crud`)                     | 原生拖拽表头调整列宽；拖拽列配置调序；跨页勾选多行商品；测试搜索感知多态缺省态一键清空            | 验证 `<AtengTable<ProductItem>>` 原生泛型、列宽拖拽持久化、跨页多选记忆与多态缺省态联动      |
| **业务套件** | `DictView.vue`<br/>(`/business/dict`)                       | 连续渲染多个字典下拉、单选框、多选框与彩色 Tag；监视 Network 选项仅发起单次请求                   | 验证 `DictManager` 单例毫秒级请求去重合并与 `AtengDict*` 全形态弱类型比对映射                |
| **业务套件** | `DescriptionsView.vue`<br/>(`/business/descriptions`)       | 查看用户信息详情，点击手机号、身份证旁的一键复制按钮，粘贴验证内存真实明文                        | 验证 `<AtengDescriptions<UserAccount>>` 5 大脱敏管道与 `:copyable` 复制内存未脱敏真明文      |
| **业务套件** | `DateRangeView.vue`<br/>(`/business/date-range`)            | 点击“今日”、“本周”、“近30天”等快捷预设；双向绑定 `start` 与 `end` 独立字段                        | 验证 `AtengDateRange` 9 大业务周期快捷切换、双字段解构绑定与 00:00:00 智能对齐               |
| **业务套件** | `ExcelFeedbackView.vue`<br/>(`/business/excel-feedback`)    | 触发模拟 Excel 导入失败弹窗，查阅错误行号与失败原因；点击“导出纠错 CSV”                           | 验证 `AtengExcelFeedback` 在线错误明细分页、批注文件下载与 UTF-8 BOM CSV 防乱码降级导出      |
| **业务套件** | `UploadView.vue`<br/>(`/business/upload`)                   | 选择大文件测试分片切片与受控并发上传；点击暂停与断点续传；点击已上传文件调起全能预览灯箱          | 验证 `AtengUpload` 纯原生切片、受控并发上传 (3) 与 `AtengFilePreview` 灯箱协同               |
| **业务套件** | `StreamTextView.vue`<br/>(`/business/stream-text`)          | 触发模拟 AI 大模型 SSE 问答对话流，查看增量打字机逐字吐出与平滑呼吸光标                           | 验证 `AtengStreamText` 原生流式文本逐字切片呈现与一键复制功能                                |
| **业务套件** | `LogViewerView.vue`<br/>(`/business/log-viewer`)            | 开启模拟 WebSocket 实时滚动日志；输入关键字高亮过滤；手动回滚触发暂停贴底                         | 验证 `AtengLogViewer` 2000 行环形内存缓冲防 DOM 膨胀与贴底滚动控制                           |
| **业务套件** | `StatisticView.vue`<br/>(`/business/statistic`)             | 点击刷新指标数值，观察纯原生 rAF 动效数字翻牌平滑滚入与千分位格式化                               | 验证 `AtengStatistic` 数字渐变动效、千分位规整与涨跌趋势展示                                 |
| **业务套件** | `CodeViewView.vue`<br/>(`/business/code-view`)              | 切换查看 JSON 树形折叠、TypeScript 源码与 SQL 语句，点击行号与一键复制                            | 验证 `AtengCodeView` 轻量结构化代码展示、自适应行号栏与一键格式化复制                        |
| **业务套件** | `IconSelectView.vue`<br/>(`/business/icon-select`)          | 打开图标选择器，输入拼音（如 "sousuo" 或 "bianji"）极速模糊检索并选中国标图标                     | 验证 `AtengIconSelect` Element Plus 原生图标库集成与拼音极速模糊检索                         |
| **业务套件** | `CaptchaView.vue`<br/>(`/business/captcha`)                 | 点击“获取验证码”，监视 60 秒倒计时防刷新状态机；测试前置手机号校验拦截                            | 验证 `AtengCaptcha` 防刷新倒计时状态机、前置校验钩子与连击防刷互斥锁                         |
| **业务套件** | `FilePreviewView.vue`<br/>(`/business/file-preview`)        | 分别点击调阅高清图片、PDF 文档、MP4 视频、MP3 音频与源码文本在线预览弹窗                          | 验证 `AtengFilePreview` 原生轻量多媒体灯箱、PDF 内嵌与异常降级下载                           |
| **主题引擎** | `ThemeProPanoramaView.vue`<br/>(`/theme-pro`)               | 体验 Theme Pro 旗舰全景实装大沙箱，整体浏览 Slate 深空暗黑基底与科技风控件                        | 验证 Theme Pro 现代极客主题引擎、5 大高反差预设与独立 GPU 合成图层高质感暗黑                 |
| **主题引擎** | `ButtonsInputsView.vue`<br/>(`/theme/buttons-inputs`)       | 体验 Linear/Vercel 黑曜石高反差签名按钮（`.is-contrast`）与双层激光聚焦环输入控件                 | 验证纯阻尼微缩放（`:active scale(0.98)`）与内嵌阴影描边盒模型（`box-shadow inset`）          |
| **主题引擎** | `TablesView.vue`<br/>(`/theme/tables`)                      | 查看自适应流体表格的斑马纹、微光高亮表头与防抖悬浮行交互                                          | 验证 Theme Pro 表格专属 Slate 调色板与紧凑型极窄冷钛滚动条（6px）                            |
| **主题引擎** | `TagsOverlaysView.vue`<br/>(`/theme/tags-overlays`)         | 查看彩色标签、开关控件、Tooltip 黑色冷钛气泡与黑曜石高质感浮层                                    | 验证黑曜石高质感浮层（零 backdrop-filter 消耗）与微光高对比度视觉规范                        |
| **主题引擎** | `TenantThemeView.vue`<br/>(`/theme/tenant`)                 | 在色盘拾取任意品牌主色，点击“应用租户主题”，观察整站主色与 10 级梯度瞬时动态响应                  | 验证 `setThemeColor` 动态双轨调色板计算与原生 CSS 变量瞬时覆写能力                           |
| **主题引擎** | `CardsNavigationsView.vue`<br/>(`/theme/cards-navigations`) | 查看科技风卡片悬浮、环切重叠头像组（Ring-Cut Avatar）与导航选择菜单的高质感呈现                   | 验证定向微光线（Specular Hairline）、环切重叠头像组与现代科技质感                            |

---

## 4. 全真自动化回归命令

```bash
pnpm --filter @atengk/element-plus --filter sample-element-plus typecheck && \
pnpm --filter @atengk/element-plus --filter sample-element-plus lint && \
pnpm --filter @atengk/element-plus test && \
pnpm --filter sample-element-plus build
```

> 详细原理机制、Props/Options 接口清单与生产边界，请参阅核心子包文档：[@atengk/element-plus README](../../packages/element-plus/README.md)。
