# @atengk/element-plus

面向现代 Web 应用与企业级系统的 Element Plus 基础设施增强组件库与指令集。坚持纯原生 TypeScript、强类型契约、零臃肿依赖与深模块解耦设计，深度打通 `@atengk/core` 与 `@atengk/vue` 基础设施能力。

---

## 维度零：特性与公共 API 全景速查矩阵

| 特性分类     | 特性名称           | 核心门面 / 组件 / 指令       | 关键参数 / Props / Emits                                                                       | 核心行为说明                                                                                                           | 锚定验证源头 (*Test / Sample)                                                     |
| :----------- | :----------------- | :--------------------------- | :--------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------- |
| **基础底座** | 插件全局安装器     | `install(app)` / `installer` | `app: App`                                                                                     | 批量注册官方 PascalCase 组件与全部操作指令，具备 Symbol 幂等保护                                                       | [`install.test.ts`](./test/install.test.ts)                                       |
| **基础底座** | 版本标识           | `VERSION`                    | `string`                                                                                       | 导出当前模块运行时版本号（0.1.0）                                                                                      | [`index.test.ts`](./test/index.test.ts)                                           |
| **权限指令** | 细粒度操作权限控制 | `v-permission`               | `string \| string[]`, 修饰符 `.disabled`, `.all`                                               | 默认物理移除 DOM 并留存注释锚点，支持原位插回；支持 `.disabled` 置灰态与 `.all` 且逻辑                                 | [`v-permission.test.ts`](./test/v-permission.test.ts)<br>`/directives/permission` |
| **权限指令** | 角色细粒度控制     | `v-role`                     | `string \| string[]`, 修饰符 `.disabled`, `.all`                                               | 基于用户角色判定；内置 admin / superadmin 超管全局豁免放行机制                                                         | [`v-role.test.ts`](./test/v-role.test.ts)<br>`/directives/role`                   |
| **防重指令** | 提交防刷与前端幂等 | `v-idempotent`               | `number \| Function \| IdempotentOptions`, 参数 `:delay`, 修饰符 `.noFeedback`                 | DOM 捕获阶段拦截连击；支持时间窗口防刷与异步 Promise 互斥锁双模，自动联动按钮 loading 与禁用，超时与异常安全兜底防死锁 | [`v-idempotent.test.ts`](./test/v-idempotent.test.ts)<br>`/directives/idempotent` |
| **工具指令** | 剪贴板一键复制     | `v-copy`                     | `string \| CopyGetter \| CopyOptions`                                                          | 优先调用 `navigator.clipboard`，自动安全降级至 `execCommand`；支持动态 Getter 与 ElMessage 反馈联动                    | [`v-copy.test.ts`](./test/v-copy.test.ts)<br>`/directives/copy`                   |
| **工具指令** | 动态防篡改水印     | `v-watermark`                | `string \| WatermarkOptions`, 修饰符 `.full`                                                   | Canvas 离屏高清渲染（SVG 安全降级）；MutationObserver 深度监听实现控制台删除与样式篡改微任务自愈                       | [`v-watermark.test.ts`](./test/v-watermark.test.ts)<br>`/directives/watermark`    |
| **交互容器** | 企业级弹窗容器     | `AtengDialog`                | `v-model`, `title`, `draggable`, `beforeConfirm`, `@confirm`, `@success`                       | 默认可拖拽；右上角全屏切换与双击 Header 全屏；el-scrollbar 限制视口高度防撑破；异步确认 Loading 锁协议                 | [`AtengDialog.test.ts`](./test/AtengDialog.test.ts)<br>`/containers/dialog`       |
| **交互容器** | 企业级抽屉容器     | `AtengDrawer`                | `v-model`, `title`, `size: 'small' \| 'default' \| 'large'`, `beforeConfirm`                   | 响应式语义尺寸断点；移动端视口（< 768px）自适应 100% 全宽；统一的异步确认 Loading 锁协议                               | [`AtengDrawer.test.ts`](./test/AtengDrawer.test.ts)<br>`/containers/drawer`       |
| **交互容器** | 统一缺省态占位     | `AtengEmpty`                 | `status: 'empty' \| 'search' \| '403' \| 'network-error' \| '500'`, `description`, `imageSize` | 聚合 5 大语义状态；内置纯矢量 SVG 插画深度绑定 Element Plus 设计令牌，天然完美自适应暗黑模式                           | [`AtengEmpty.test.ts`](./test/AtengEmpty.test.ts)<br>`/containers/empty`          |

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
import AtengElementPlus from '@atengk/element-plus';
import '@atengk/element-plus/style.css';

import App from './App.vue';

const app = createApp(App);
app.use(ElementPlus);
app.use(AtengElementPlus);
app.mount('#app');
```

### 3. 开箱即用体验

无需在每个页面手动局部注册，全局即可直接使用组件与指令：

```vue
<template>
  <div class="user-container">
    <!-- 1. 提交防重指令：2秒异步保存，自动挂载 loading 且防止连击 -->
    <el-button v-idempotent="handleSaveUser" type="primary"> 保存修改 </el-button>

    <!-- 2. 剪贴板复制：动态读取输入内容 -->
    <el-button v-copy="() => shareToken"> 复制分享凭证 </el-button>

    <!-- 3. 企业级弹窗容器：拖拽、全屏、异步提交锁一体化 -->
    <AtengDialog v-model="dialogVisible" title="配置参数" :before-confirm="handleSaveConfig">
      <p>表单内容区域（内置视口滚动防溢出）</p>
    </AtengDialog>

    <!-- 4. 统一缺省占位组件：自适应 Element Plus 深浅色主题 -->
    <AtengEmpty v-if="dataList.length === 0" status="empty" />
  </div>
</template>
```

---

## 维度二：生产扩展接管 (Customization & Extensibility)

### 1. 异步确认 Loading 锁协议 (`beforeConfirm`)

`AtengDialog` 与 `AtengDrawer` 统一支持 `beforeConfirm` 异步钩子函数。当该函数返回 `Promise` 时：

1. 确定按钮自动切换为 `loading` 状态；
2. **同步禁用取消按钮、Header 关闭按钮、ESC 快捷键与遮罩点击**，杜绝并发竞态与半提交状态；
3. **成功决议**：自动关闭弹窗并触发 `@success` 事件；
4. **抛错容错**：若 Promise 发生 reject 或抛错，自动退出 loading 并**保持弹窗/抽屉开启**，严格保护用户表单输入现场。

```vue
<template>
  <AtengDialog
    v-model="visible"
    title="安全审批操作"
    :before-confirm="submitApproval"
    @success="handleReload"
  >
    <el-input v-model="approvalRemark" type="textarea" placeholder="请输入审批意见" />
  </AtengDialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ElMessage } from 'element-plus';

const visible = ref(false);
const approvalRemark = ref('');

const submitApproval = async () => {
  if (!approvalRemark.value) {
    ElMessage.warning('审批意见不能为空');
    return false; // 显式返回 false 阻断关闭
  }
  await apiSubmitAudit({ remark: approvalRemark.value });
  ElMessage.success('审批已归档');
};
</script>
```

### 2. 精确 Tree-Shaking 按需导入

本包严格声明 `"sideEffects": ["*.css", "*.scss"]`，顶级入口 `index.ts` 零隐式副作用。下游工程可直接按需具名导入：

```ts
import { AtengEmpty, vIdempotent } from '@atengk/element-plus';
import type { AtengEmptyInstance, IdempotentOptions } from '@atengk/element-plus';
```

---

## 维度三：核心生产边界与非功能语义 (Production Boundary & Failure Modes)

1. **注释定位锚点不变量 (Comment Anchor Invariant)**：
   - `v-permission` 与 `v-role` 在无权限时通过 `replaceChild(comment, el)` 物理剔除真实 DOM 节点；
   - 内部严格同步将 `vnode.el = comment`，当组件带有 `v-if` 或动态销毁时，确保 Vue 运行时可正确定位卸载，彻底根除 `Cannot read properties of null (reading 'insertBefore')` 空指针异常；
2. **DOM 捕获阶段防重锁 (Capture Phase Invariant)**：
   - `v-idempotent` 在 DOM 原生捕获阶段（`capture: true`）注册监听，在锁定状态下立即调用 `stopImmediatePropagation()` 与 `preventDefault()`，在浏览器事件流最前端彻底切断下游业务绑定的普通 `@click`；
3. **DevTools 恶意篡改微任务自愈防线 (MutationObserver Anti-Tamper Invariant)**：
   - `v-watermark` 配备 MutationObserver 深度监听宿主属性与子节点变动。当遭遇控制台恶意 `remove()` 节点或增加 `display: none` / `opacity: 0` 时，微任务级立即强制重建自愈；
4. **弹窗视口防撑破不变量 (Viewport Safe Scrolling Invariant)**：
   - `AtengDialog` 内部主要内容区默认由 `<el-scrollbar>` 承载并设置受控最大高度（默认 `calc(100vh - 160px)`，全屏自动展开为 `calc(100vh - 120px)`），杜绝极端宽幅或超长报表撑破屏幕；移动端视口（`< 768px`）自动全屏覆盖；
5. **暗黑模式自适应 (Design Token Invariant)**：
   - `AtengEmpty` 内置的 5 组纯矢量 SVG 插画完全复用 `--el-fill-color-*`、`--el-border-color-*` 与 `--el-color-primary` 等原生变量，在暗黑模式切换（`html.dark`）时无缝自适应变色。

---

## 维度四：物理排版与代码全真验证 (Evergreen & Zero-Glitch)

- 所有代码示例与 API 100% 对齐 TypeScript 强类型定义；
- 所有特性 100% 经由 `packages/element-plus/test` 离线单元测试覆盖，并在 `apps/sample-element-plus` 自验展厅中跑通真实交互。
