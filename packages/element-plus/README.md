# @atengk/element-plus

面向企业级管理系统的 Element Plus 基础设施增强组件库与指令集。

---

## 维度零：特性与公共 API 全景速查矩阵

| 特性分类     | 特性名称     | 核心门面 / 组件 / 指令 | 关键参数 / Props / Emits | 核心行为说明             | 锚定验证源头 (*Test / Sample)         |
| :----------- | :----------- | :--------------------- | :----------------------- | :----------------------- | :------------------------------------ |
| **基础导出** | 基线版本标识 | `VERSION`              | `string`                 | 导出当前模块编译版本基线 | [index.test.ts](./test/index.test.ts) |

---

## 维度一：最小起步体验 (Happy Path)

### 安装依赖

```bash
pnpm add @atengk/core @atengk/vue @atengk/element-plus element-plus vue
```

### 快速接入

```ts
import { VERSION } from '@atengk/element-plus';

console.log(`@atengk/element-plus 当前版本: ${VERSION}`);
```

---

## 维度二：生产扩展接管 (Customization & Extensibility)

待具体业务特性（如高级表格组件、Excel 导出指令等）落地后，1:1 逆向提取自对应 Sample 工程。

---

## 维度三：核心生产边界与非功能语义 (Production Boundary)

- **严格单向数据流**：组件严禁直接突变外部传入的 Props，所有状态同步统一通过标准 Emit 事件触发；
- **空安全保底防御**：表格与列表查询结果保底返回空数组 `[]`，杜绝调用方访问空指针崩溃；
- **双轨依赖宽进严出**：库 peer 宽泛包容 `>=2.8.0`，自验展厅锁定最新稳态 Patch。

---

## 维度四：物理排版与代码全真验证

所有示例均经过内部单元测试与 `apps/sample-element-plus` 1:1 真实运行验证。
