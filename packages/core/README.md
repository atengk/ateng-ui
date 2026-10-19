# @atengk/core

面向现代企业级中后台与微服务架构的纯 TypeScript 强类型网络契约与工业级客户端基础设施。

---

## 维度零：特性与公共 API 全景速查矩阵

| 特性分类     | 特性名称     | 核心门面 / 方法 / 类型 | 关键参数 / 返回类型 | 核心行为说明             | 锚定验证源头 (*Test / Sample)         |
| :----------- | :----------- | :--------------------- | :------------------ | :----------------------- | :------------------------------------ |
| **基础导出** | 基线版本标识 | `VERSION`              | `string`            | 导出当前模块编译版本基线 | [index.test.ts](./test/index.test.ts) |

---

## 维度一：最小起步体验 (Happy Path)

### 安装依赖

```bash
pnpm add @atengk/core axios
```

### 快速接入

```ts
import { VERSION } from '@atengk/core';

console.log(`@atengk/core 当前版本: ${VERSION}`);
```

---

## 维度二：生产扩展接管 (Customization & Extensibility)

待具体业务特性（如 Axios 实例工厂、双轨 AuthStorage 适配器等）落地后，1:1 逆向提取自对应 Sample 工程。

---

## 维度三：核心生产边界与非功能语义 (Production Boundary)

- **雪花 ID 防精度截断**：网络响应反序列化前必须在 `transformResponse` 阶段通过纳秒级正则匹配将 16 位以上无引号大数转换为字符串，严禁数字截断；
- **平台中立防御**：底层纯 TS 架构保持宿主环境弹性中立，严禁硬编码裸浏览器全局对象；
- **双态异常阻断**：二进制文件下载遇到业务异常 JSON 时，自动逆向转译为 `BusinessException`。

---

## 维度四：物理排版与代码全真验证

所有示例均经过内部单元测试与 `apps/sample-core` 1:1 真实运行验证。
