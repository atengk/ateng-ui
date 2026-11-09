# sample-form-designer-vue 动态表单设计器与运行态引擎体验展厅

> 专注于演示与自验 `@atengk/form-designer-vue` 核心特性在企业级审批单据、多端视口仿真、动态联动与生态扩展物料等真实业务场景下的开箱使用与交互自验。

---

## 1. 快速启动与服务端口

- **默认固定端口**：`3012`
- **启动方式**：
  ```bash
  pnpm --filter sample-form-designer-vue dev
  ```
- 启动后浏览器访问：`http://localhost:3012`

---

## 2. 运行环境与 Mock 双模切换

- **默认/CI 模式（离线自洽）**：内置离线全真模拟数据与响应式状态机，无需启动任何外部后端服务即可体验 15+ 种 Element Plus 控件、BPMN 节点权限矩阵切换与公式计算；
- **Local 真实网关模式**：复制工程根目录下的 `.env.example` 为 `.env.local` 并配置 `VITE_API_BASE_URL`，重启开发服务即可直连真实微服务后端或低代码元数据网关（该文件已被 Git 忽略，保障凭据安全）。

---

## 3. 核心场景看板与交互路由表

| 场景分类                                 | 场景看板组件                    | 核心可视化交互操作                                                                   | 验证重点与防御机制                                                                                    |
| :--------------------------------------- | :------------------------------ | :----------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------- |
| **看板一：全功能可视化设计器**           | `<VisualDesignerBoard.vue>`     | 拖拽物料库、切换 PC/Pad/Mobile 手机壳、修改右侧属性自举面板、导出 Vue 3 SFC 代码     | 验证 SortableJS 拖拽守卫、30 步快照撤销重做、500ms 防抖草稿箱与单列自适应流动                         |
| **看板二：BPMN 流程协同节点权限**        | `<WorkflowSynergyBoard.vue>`    | 切换“发起申请人”、“直属部门主管”、“财务审核总监”审批节点角色                         | 验证 `editable` / `readonly` / `hidden` / `required` 权限覆盖、前置校验短路与展示脱敏                 |
| **看板三：零 eval 动态规则与算术 AST**   | `<DynamicLinkageBoard.vue>`     | 输入商品单价与采购数量实时联动总价；切换会员级别触发折扣优惠与必填项联动             | 验证零 `eval` 词法解析器与算术 AST 解释器安全沙箱计算，防范 XSS 注入                                  |
| **看板四：嵌套排版与动态子表单**         | `<SubFormTableBoard.vue>`       | 在明细表中新增行、删除行、行内输入求和；在 Card / Grid 容器中嵌套字段                | 验证容器二分法模型：LayoutContainer 字段平铺与 DataContainer 独立数组分支                             |
| **看板五：官方 Element Plus 与生态物料** | `<CustomWidgetBoard.vue>`       | 交互 15 种 Element Plus 控件，省市级联数据源重拉；在手写板签名、体验富文本与代码编辑 | 验证 `@atengk/form-designer-vue/presets/element-plus` 次级导出、`DataSourceConfig` 动态字典与生态装配 |
| **基础自验：三段式 AST 极简渲染**        | `<MinimalRendererScenario.vue>` | 极简表单填报与双向绑定数据提交                                                       | 验证 `FormSchema`（version / formConfig / widgetList）标准 AST 解析                                   |
| **网络防卫：异步校验与抗竞态丢弃**       | `<AsyncValidationScenario.vue>` | 高频输入用户名并发触发模拟远程异步查重（300ms 防抖）                                 | 验证 `AbortController` 取消前序未决请求与逻辑序号丢弃时序穿透（ADR-0013）                             |

---

## 4. 全真自动化回归命令

```bash
pnpm --filter @atengk/form-designer-vue --filter sample-form-designer-vue typecheck && \
pnpm --filter @atengk/form-designer-vue --filter sample-form-designer-vue lint && \
pnpm --filter @atengk/form-designer-vue --filter sample-form-designer-vue test && \
pnpm --filter @atengk/form-designer-vue --filter sample-form-designer-vue build
```

> 详细架构设计、三段式 AST 契约、Props 规格矩阵与生产避坑指南，请参阅核心子包权威文档：[@atengk/form-designer-vue README](../../packages/form-designer-vue/README.md)。
