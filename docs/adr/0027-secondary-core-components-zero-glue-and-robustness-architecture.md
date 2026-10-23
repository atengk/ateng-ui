# 0027. 次核心基石组件零胶水集成、字段映射与多维健壮性增强架构

## 状态

Accepted (已接受)

## 背景与决策上下文

在企业级中后台系统建设中，核心五大基石组件（`AtengTable`、`AtengQueryForm`、`AtengDialog`、`AtengDrawer`、`AtengDescriptions`）在 Epic #108 中已完成了响应式强契约绑定与零胶水体验升级。在此之后，调用频次极高、与日常增删改查业务深度咬合的**次核心基石组件套件**（数据字典套件、快捷时间范围套件、大文件上传与多媒体预览套件、页面骨架与吸底操作栏套件、Excel 导出与导入反馈套件）在真实生产开发中显现出一系列胶水代码多、类型脆弱、网络冗余及非功能缺陷：

1. **字典套件字段强契约与类型弱匹配断层**：
   - 目前字典套件强依赖 `{ label, value, tagType, disabled }` 标准字段，而后端微服务经常返回 `{ name, id }` 或 `{ codeDesc, codeValue }`，迫使调用方在每个组件前手写 `map` 转换胶水；
   - 字典值 `value` 与表单绑定模型存在整型 `1` 与字符 `'1'` 类型不一致导致的匹配落空、无法回显与彩色 Tag 缺省问题；
   - 复杂单页存在多字典组件并发挂载时重复发起单项 HTTP 请求引发网络风暴，缺乏批量预加载契约。
2. **时间范围选择器双向解构与边界对齐痛点**：
   - 检索表单普遍要求将单个日期区间控件拆解为 `start` / `end` 双字段（如 `beginTime`, `endTime`），目前调用方常需在 `change` 回调上手动解构与重置赋值；
   - 当用户在日常搜索中选择纯日期范围（如选择今天），后端由于精确到时分秒常查漏当天最后一刻的数据，需要自动将起止时刻智能对齐至 `00:00:00` 与 `23:59:59`。
3. **文件上传与多媒体流预览割裂与内存泄漏隐患**：
   - `AtengUpload` 仅内置原生基础图片弹窗，当文件列表出现 PDF、音频、视频、纯文本代码时缺乏即插即用的多媒体流预览能力；
   - 本地待上传文件的 `URL.createObjectURL` 临时句柄若未在弹窗关闭或组件销毁时确定性回收，会导致单页应用内存持续泄露。
4. **吸底操作栏与骨架屏缺乏业务流收敛**：
   - `AtengFooterBar` 仅提供纯布局容器，开发者仍需在插槽中重复书写保存/取消按钮、Loading 互斥变量与异常回退逻辑；
   - `AtengPageSkeleton` 缺乏对真实视图插槽包装与平滑过渡的能力。
5. **Excel 导出防伪文件与导入错误高亮排查脱节**：
   - 导出遇后端业务异常（JSON）时若缺乏双态拦截，易将错误 JSON 直接保存为损坏的 `.xlsx` 乱码文件（违背 [ADR-0004](./0004-blob-error-dual-state-and-fesod-excel-protocol.md)）；
   - 导入错误反馈弹窗若后端未生成标红批注 Excel 时，缺乏前端生成带 UTF-8 BOM（`\uFEFF`）的纠错清单导出兜底，导致 Windows Excel 打开乱码。

## 架构决策

基于“**字段映射灵活自适应、并发批量缓存去重、时刻智能边界对齐、同层零胶水组装、确定性生命周期回收、ADR-0004 双态闭环**”原则，确立以下系统级架构决策：

### 1. 数据字典套件：灵活映射、类型自适应与批量预热架构

- **多层级字段映射契约 (`fieldNames`)**：
  - 在 `AtengDictSelect`、`AtengDictTag`、`AtengDictRadio`、`AtengDictCheckbox` 中统一支持 `fieldNames?: { label?: string; value?: string; tagType?: string; disabled?: string }`；
  - 同时提供扁平快捷属性 `labelField` 与 `valueField`（如 `label-field="name"`、`value-field="id"`）；
  - **安全回退链规则**：按 `item[fieldNames.label] ?? item.label ?? ''` 与 `item[fieldNames.value] ?? item.value` 渐进提取，未命中时安全回退，杜绝白屏崩溃。
- **值类型自适应弱比对 (`valueType="auto"`)**：
  - 提供 `valueType?: 'auto' | 'string' | 'number'`（默认 `'auto'`）；
  - 在选项回显、Tag 匹配或多选匹配时，若为 `'auto'` 则采用跨类型安全比对（`String(item.value) === String(bindValue)`），彻底消灭整型与字符不匹配导致的回显失效。
- **DictManager 批量 Provider 与增量差异过滤 (`preload`)**：
  - 在 `DictManager` 单例中扩充 `setBatchProvider(provider: (codes: string[]) => Promise<Record<string, DictItem[]>>)`；
  - 扩充 `preload(codes: string[])` 批量预取接口：自动剔除已命中的内存缓存项，仅对未缓存的字典编码发起单次批量拉取；若未注册 `batchProvider`，则自动并发回退单项 `loadDict`，全程内存并发去重。
- **展示与交互形态拓展**：
  - `AtengDictTag` 强化多值解析：支持数组（`[1, 2]`）与逗号分隔字符串（`"1,2,3"`），支持自定义 `separator` 与空安全保底占位符（`emptyText="-"`）；
  - `AtengDictRadio` 与 `AtengDictCheckbox` 扩充 `button` 按钮形态与 `border` 选项。

### 2. 快捷时间范围套件：双向解构绑定与时刻智能对齐架构

- **双向字段解构绑定**：
  - `AtengDateRange` 强化对 `v-model:start="query.beginTime"` 与 `v-model:end="query.endTime"` 的原生响应式双向支持；
  - 内部响应式监听与表单清空（`resetFields()`）联动：当外部重置为 `null`/`undefined` 时，内部状态瞬时清空，杜绝脏值回弹。
- **时刻边界对齐不变量 (`autoTime`)**：
  - 默认开启 `autoTime: true`：当选择类型为 `type="daterange"` 且输出格式包含时分秒时，选择范围自动将起始时刻补全为当天 `00:00:00`，截止时刻补全为当天 `23:59:59`；
  - 当为精确时间模式 `type="datetimerange"` 时，`autoTime` 尊重用户在日历面板的手动微调，默认提供 `defaultTime: [00:00:00, 23:59:59]` 辅助。
- **开箱即用自然周期快捷项 (`shortcuts`)**：
  - 内置“今天”、“昨天”、“本周”、“上周”、“近7天”、“本月”、“近30天”、“本季度”、“本年”等自然业务周期，点击瞬间自动按 `autoTime` 规则计算时刻区间。

### 3. 文件上传与多媒体流预览：同层深度组装与内存确定性回收

- **开箱即用多媒体预览灯箱集成**：
  - `AtengUpload` 内部深度组装 `AtengFilePreview` 弹窗；
  - 点击已上传或本地选取的文件项时，依据 MIME 类型与扩展名自动判定（图片/PDF/音视频/文本直接呼出灯箱预览，未知文件提供下载降级）；
  - 提供 `beforePreview?: (file: UploadFile) => boolean | void` 供业务端显式接管拦截。
- **Blob ObjectURL 确定性生命周期回收**：
  - 本地待上传文件的 `URL.createObjectURL(raw)` 句柄，必须且只能在预览关闭、文件从列表移除、或组件 `onUnmounted` 钩子中，100% 确定性调用 `URL.revokeObjectURL` 释放，严格遵循工业级第 2 道防线。

### 4. 页面骨架与吸底操作栏：内置操作编排与骨架屏插槽包装

- **AtengFooterBar 操作编排与异步防重锁**：
  - 预置常用操作按钮（保存/提交/重置/取消），支持通过 `actions` 或快捷属性配置；
  - 提交动作支持绑定异步 Promise（`:on-submit="handleSubmit"`），点击触发后按钮自动进入 Loading 互斥锁态，并在 resolve/reject 后自动释放；同时支持 `:submit-loading` 外部受控覆盖。
- **AtengPageSkeleton 内容插槽包装模式**：
  - 支持直接包装业务插槽内容：`<AtengPageSkeleton :loading="loading" type="table"><slot /></AtengPageSkeleton>`，在 `loading` 为 `false` 时平滑渐变展示真实页面，彻底解耦手动 `v-if/v-else`。

### 5. Excel 套件：ADR-0004 双态异常识别与防乱码纠错闭环

- **AtengExcelExport 严格践行 ADR-0004 双态协议**：
  - 导出动作强制通过核心 Blob-JSON 转换管道，一旦识别为 `application/json` 业务报错，立即由 `ElMessage.error` 拦截告警并严格阻断伪 `.xlsx` 文件落地。
- **AtengExcelFeedback 双轨纠错清单**：
  - 针对后端校验失败的行列与错误原因，在弹窗表格展示与复制的基础上，支持“下载标红批注 Excel”；
  - 若后端未返回批注文件，前端自动生成带 UTF-8 BOM 字符标记（`\uFEFF`）的 `导入错误清单.csv`，彻底根除中文版 Windows Excel 双击打开乱码的问题。

## 效果与权衡

- **收益**：
  - **零胶水开箱体验**：消除日常业务中对字典手写 `map`、日期手动解构、上传预览手拼弹窗、FooterBar 重复手写 Loading 变量等大量模板代码；
  - **工业级健壮性与防错防漏**：解决整型与字符匹配失效、日期未覆盖当天 23:59:59 查漏数据、损坏 Excel 文件误下载及 CSV 乱码等高频暗坑；
  - **内存与性能确定性**：统一管理临时 Blob 对象的释放，杜绝长期运行的 SPA 页面内存泄漏。
- **代价与权衡**：
  - 组件内部增加了字段映射解析与类型弱匹配推导，但逻辑均收敛在轻量纯函数内，对微秒级渲染性能影响完全可忽略；
  - 100% 保持既有属性与事件向后兼容，存量代码无感知平滑迁移。
