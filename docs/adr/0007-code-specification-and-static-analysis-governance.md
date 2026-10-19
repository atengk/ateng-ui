# 0007. 代码规范与静态代码分析治理策略

## 状态

Accepted (已接受)

## 背景与决策上下文

作为面向企业级中后台与微服务架构的工业级前端基础设施套件，`ateng-ui` 拥有严苛的代码成熟度契约（《AGENTS.md 九道代码成熟度防线》）。以往依靠人工审查和 Code Review Agent 的方式存在一定的后置滞后性，亟需一套具备编译期硬拦截能力的静态分析工具链。

同时，在代码规范治理中存在“排版与质量职责耦合”的常见痛点：若将代码排版交由 ESLint 处理，不仅执行缓慢，且极易在单引号、尾随逗号、换行符等非功能性风格上与开发者的本地 IDE 产生激烈冲突。

## 架构决策

1. **ESLint 9 Flat Config 扁平规范标准**：
   - 全面拥抱 ESLint 9 原生 ESM 扁平配置体系（`eslint.config.mjs`）；
   - 依赖基线：`@eslint/js` + `typescript-eslint` (v8+) + `eslint-plugin-vue` (vue3-recommended)；
   - 坚决杜绝依赖过时的 `.eslintrc` 遗留配置。
2. **排版与质量职责 100% 正交解耦**：
   - **Prettier 3.x 独占排版权**：通过 `.prettierrc` 锁定全局格式（单引号 `'`、尾随逗号 `all`、每行字符数 `100`、2 空格缩进、强制 `LF` 换行）；
   - **ESLint 专职质量与逻辑缺陷检查**：通过 `eslint-config-prettier` 关闭 ESLint 中所有与代码排版重叠的规则，彻底消除双重格式化冲突。
3. **将工业级成熟度防线固化为 Linter 强规则**：
   - 针对单向数据流防线：启用 `vue/no-mutating-props: error`，禁止就地突变 Props；
   - 针对强类型契约防线：启用 `@typescript-eslint/no-explicit-any: warn`，限制裸 `any` 蔓延；
   - 针对架构风格规范：统一约束为 Vue 3 现代 `<script setup>` 范式（`vue/component-api-style: ['error', ['script-setup']]`）。
4. **全链路硬门禁守护 (Zero-Glitch Gate)**：
   - 根工作区与各子包全量接入 `format:check` 与 `lint` 脚本；
   - CI 流水线（`.github/workflows/ci.yml`）将代码风格检查设为阻断性卡点，彻底废除 `continue-on-error: true`。

## 效果与权衡

- **收益**：
  - 研发阶段获得秒级即时的代码质量错误提示；
  - 格式化速度大幅提升，跨团队与跨平台协作零排版冲突；
  - CI 与本地严格对齐，零格式坏味道与零潜在语法隐患进主干。
- **代价**：
  - 对新入库代码的规范要求更为严苛，任何违反 Props 单向流或引入潜在语法错误的操作均会被即时阻断。
