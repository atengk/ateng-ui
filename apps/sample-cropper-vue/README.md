# sample-cropper-vue 图片裁剪与图像处理自验展厅

> 专注于演示与自验 `@atengk/cropper-vue` 核心特性在真实业务场景下的开箱使用、响应式状态机交互与极限边界防御。

---

## 1. 快速启动与服务端口

- **默认固定端口**：`3016`
- **启动方式**：
  ```bash
  pnpm --filter sample-cropper-vue dev
  ```
- 启动后浏览器访问：`http://localhost:3016`

---

## 2. 运行环境与 Mock 双模切换

- **默认/CI 模式**：内置离线 Canvas 离线自洽图像生成器（`mock-images.ts`），无需依赖任何外部网络服务与静态图床即可直接体验完整交互并跑通自动化测试；
- **Local 真实网关模式**：复制 `.env.example` 为 `.env.local` 并配置 `VITE_API_BASE_URL`，重启开发服务即可接入企业后端 OSS 或文件直传网关（该文件已被 Git 忽略）。

---

## 3. 核心场景看板与交互路由表

| 场景分类               | 场景看板组件 / 路由路径                           | 核心可视化交互操作                                                                           | 验证重点                                                                                                         |
| :--------------------- | :------------------------------------------------ | :------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------- |
| **基础画布与参数交互** | `src/views/BasicCropperView.vue` (`#basic`)       | 比例锁定/自由切换、90° 旋转、水平/垂直镜像翻转、-45°~+45° 调平滑块微调、多源图像输入         | 验证 `AtengCropper` 容器交互、实时几何参数（`data` / `cropBoxData`）与多轨（Canvas/Blob/File/DataURL）导出一致性 |
| **圆形头像与脱壳弹窗** | `src/views/AvatarCropperView.vue` (`#avatar`)     | 唤起 `AtengCropperModal` 弹窗、开箱 `preset="avatar"`、物理圆形 Alpha 切片切换、模拟上传流程 | 验证纯原生 Teleport 脱壳弹窗（零 UI 库依赖）、`ctx.arc() + ctx.clip()` 物理剔除底色（棋盘格透明视口无黑白角）    |
| **商品主图与防伪水印** | `src/views/ProductWatermarkView.vue` (`#product`) | 1:1 / 3:4 / 16:9 电商标准比例切换、倾斜文字水印参数配置、目标体积（如 300KB）压缩            | 验证 `applyWatermark` 离线抗锯齿平铺合成与 `compressCanvas` 质量二分逼近及步进降采样（0.85）压缩效率与耗时       |
| **高级防御与内存监控** | `src/views/AdvancedStressView.vue` (`#stress`)    | 载入 5000×4000 超大位图、全局 `Ctrl+V` 剪贴板粘贴、模拟 CORS 污损守卫、连续 20 次快速换图    | 验证 4096 像素尺寸护栏、`ClipboardReceiver` 剪贴板位图嗅探、`CanvasTaintGuard` 跨域转译与 `BlobUrlGuard` 零泄漏  |

---

## 4. 全真自动化回归命令

```bash
pnpm --filter @atengk/cropper-vue --filter sample-cropper-vue typecheck && \
pnpm --filter @atengk/cropper-vue --filter sample-cropper-vue lint && \
pnpm --filter @atengk/cropper-vue --filter sample-cropper-vue test && \
pnpm --filter @atengk/cropper-vue --filter sample-cropper-vue build
```

> 详细原理机制、Props/Options 接口清单与生产边界，请参阅核心子包文档：[@atengk/cropper-vue README](../../packages/cropper-vue/README.md)。
