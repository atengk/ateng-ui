# sample-code-editor-vue 企业级代码与Diff比对自验展厅

> 专注于演示与自验 `@atengk/code-editor-vue` 核心 Monaco Editor 高保真代码编辑、双模 Diff 差异比对、多文件 TextModel 模型池、SQL/JSON 智能拓展与 0x0 视口几何自愈在真实企业级前端业务场景下的开箱使用与交互自验。

---

## 1. 快速启动与服务端口

- **默认固定端口**：`3008` (严格遵守 ADR-0001 / ADR-0009 端口契约)
- **启动方式**：
  ```bash
  pnpm --filter sample-code-editor-vue dev
  ```
- 启动后浏览器访问：`http://localhost:3008`

---

## 2. 运行环境与 Mock 双模切换

- **默认/CI 模式**：内置 100% 离线自洽 Mock 逻辑（涵盖企业级微服务发布配置版本比对、SQL 数据库系统表名与字段元数据补全、微服务部署契约 JSON Schema 校验规则、多标签页转换脚本等），无需启动或依赖任何外部物理网络与真实后端服务即可跑通完整交互与自动化检查；
- **Local 真实网关模式**：若需直连真实微服务配置发布中心或 SQL 执行网关，可配置本地环境变量通过工程统一网络适配层进行真实接口通信（该环境配置已被 Git 严格忽略，CI 零风险）。

---

## 3. 核心场景看板与交互索引表

应用启动后，可通过顶部导航 Tab 选项卡或深色模式切换开关快速浏览体验以下 6 大自洽场景看板：

| 场景分类                   | 场景看板组件                                     | 核心可视化交互操作                                                                                                  | 验证重点                                                                                                     |
| :------------------------- | :----------------------------------------------- | :------------------------------------------------------------------------------------------------------------------ | :----------------------------------------------------------------------------------------------------------- |
| **基础代码编辑与语言切换** | `src/scenarios/BasicCodeEditorScenario.vue`      | 切换 10 种主流编程语言、调整字号 (12~20px)、切换主题、调用 Ref 暴露的 `format()` 格式化与 `getValue()` 获取当前代码 | 验证 Monaco 原生多语言语法高亮、响应式 `v-model` 双向同步、Ref 实例高级操作与微操作栏原生插槽反转            |
| **Diff 差异双模比对**      | `src/scenarios/CodeDiffCompareScenario.vue`      | 切换并排 (split) 与行内 (inline) 双模视图、点击上一处/下一处差异跳转导航、在修改侧双向编辑代码                      | 验证 Diff 双模无损平滑切换、增删行数与变更块实时统计（`DiffStats`）及双轨响应式数据流回写                    |
| **SQL 智能补全与美化**     | `src/scenarios/SqlFormattingScenario.vue`        | 输入 SQL 语句触发数据库表名与字段智能补全、点击一键美化排版、切换注入自定义 `formatSqlProvider` SPI 格式化器        | 验证轻量原生 `formatSql` 词法状态机、受管智能补全生命周期（组件卸载 100% 自动注销）与 SPI 外部格式化扩展接管 |
| **JSON Schema 语法校验**   | `src/scenarios/JsonSchemaValidationScenario.vue` | 查看微服务发布配置契约红浪线报错（副本数为 0、端口越界等）、悬停查看字段中文说明文档、点击“一键纠正”恢复合法配置    | 验证 Monaco 声明式 `jsonSchema` 校验规则、语法错误智能诊断与悬停文档提示能力                                 |
| **只读安全审计与行高亮**   | `src/scenarios/AuditReadOnlyScenario.vue`        | 点击切换高危越权与删库告警行号（行 4、11、16）、仅标记删库行或清空高亮标记，验证只读编辑防篡改                      | 验证 `readOnly: true` 审计防篡改保护与 `highlightLines` 边槽/背景告警装饰渲染                                |
| **弹窗与 Tabs 几何自愈**   | `src/scenarios/DialogTabsLifecycleScenario.vue`  | 在 `<el-dialog>` 模态弹窗与 `<el-drawer>` 抽屉中打开编辑器、快速切换隐藏的 `<el-tabs>` 标签卡片                     | 验证 `0x0` 零尺寸视口感知挂起（`isSuspended`）、恢复可见防抖自愈（`healLayout`）与组件卸载确定性销毁清理     |

---

## 4. 全真自动化回归命令

```bash
pnpm --filter @atengk/code-editor-vue --filter sample-code-editor-vue typecheck && \
pnpm --filter @atengk/code-editor-vue --filter sample-code-editor-vue lint && \
pnpm --filter @atengk/code-editor-vue test && \
pnpm --filter sample-code-editor-vue build
```

> 详细原理机制、Props/Options 接口清单与生产边界，请参阅核心子包文档：[@atengk/code-editor-vue README](../../packages/code-editor-vue/README.md)。
