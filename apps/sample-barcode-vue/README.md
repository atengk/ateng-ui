# sample-barcode-vue 条码、艺术二维码与扫码自验展厅

> 专注于演示与自验 `@atengk/barcode-vue` 核心特性在真实工业与企业业务场景下的开箱使用、响应式交互与硬件协同闭环。

---

## 1. 快速启动与服务端口

- **默认固定端口**：`3015`
- **启动方式**：
  ```bash
  pnpm --filter sample-barcode-vue dev
  ```
- 启动后浏览器访问：`http://localhost:3015`（支持通过 URL Hash 直接路由至指定看板，如 `http://localhost:3015/#/print-synergy-modal`）

---

## 2. 运行环境与 Mock 双模切换

- **默认/CI 模式**：内置离线自洽 Mock 条码/二维码数据、内置合成音频与离线解码仿真，无需启动任何外部后端服务即可直接体验完整交互与跑通自动化测试；
- **Local 真实网关模式**：复制 `.env.example` 为 `.env.local` 并配置业务网关（如需要结合真实 WMS/TMS 后端），重启开发服务即可直连真实接口（该文件已被 Git 忽略）。

---

## 3. 核心场景看板与交互路由表

| 场景分类                        | 场景看板组件 / 路由路径                                  | 核心可视化交互操作                                                                                                                        | 验证重点                                                                                                                      |
| :------------------------------ | :------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------- |
| **1. 一维条码与防崩溃容错**     | `BarcodeBasicView.vue`<br>`#/barcode-basic`              | 切换 EAN-13、CODE128、ITF-14 等格式，输入非法校验码测试前置校验，实时切换 SVG / Canvas 双模渲染                                           | 离线前置防崩溃校验管线 `validateBarcode()`、校验失败优雅回退占位插槽、动态响应式重绘                                          |
| **2. 工业排版与肉眼防错**       | `BarcodeTypographyView.vue`<br>`#/barcode-typography`    | 开启 4-4-5 / 3-4-4 人眼友好文本分组格式化，调节静区（quiet zone）边距，一键导出 PNG / SVG 图像                                            | 文本管道 `formatEan13` / `formatCustomGrouping`、工业级静区保护、零依赖大数防截断图像导出 `exportBarcodeAsImage()`            |
| **3. 艺术二维码与企业主题**     | `QRCodePresetsView.vue`<br>`#/qrcode-presets`            | 一键切换标准极简、工业重载、商务科技蓝等 6 大企业级主题预设，切换码点码眼样式与自适应高分屏                                               | 预设引擎 `QR_CODE_PRESETS`、无头状态机 `useQRCode`、Canvas Retina 像素比缩放防毛边模糊                                        |
| **4. Logo 护栏与防污损**        | `QRCodeLogoGuardView.vue`<br>`#/qrcode-logo-guard`       | 上传大尺寸 Logo 测试自动纠错等级提升（L 自动提升至 H）、测试外部跨域图片安全加载                                                          | Logo 保护算法 `clampLogoSize()`、容错级别自动提升 `elevateErrorCorrectionLevel()`、跨域防污损 `CorsImageGuard` 预检           |
| **5. 摄像头扫码与构型自适应**   | `CameraScannerView.vue`<br>`#/camera-scanner`            | 启动前/后置摄像头扫码、切换 2.8:1 狭长条码专用取景框与 1:1 二维码方框、手电筒补光与后台防发热挂起                                         | 扫码无头状态机 `useCodeScanner()`、按需动态懒加载 `html5-qrcode`、Page Visibility 页面隐藏自动释放硬件视频流                  |
| **6. 本地图像解码与连续流水线** | `ContinuousAndFilesView.vue`<br>`#/continuous-and-files` | 拖拽/粘贴本地条码图像离线快速解码、开启连续流水线扫码、测试 1.5 秒同码去重冷却与异码即刻过机                                              | 文件解码管道 `decodeFile()`、流水线连续扫码去重滑窗、原生 Web Audio 动态合成 880Hz 短促蜂鸣音与设备触觉震动                   |
| **7. 物理扫码枪与表单防污染**   | `HardwareScannerView.vue`<br>`#/hardware-scanner`        | 模拟手持 USB 扫码枪快速击键（< 30ms 脉冲流）与人类键盘慢速打字，验证扫码结果定向靶向注入指定输入框                                        | 物理扫码枪无头监听器 `useHardwareScanner`、击键时序聚类匹配器、`vHardwareScannerReceiver` 定向靶向指令、Form Guard 表单防污染 |
| **8. 打印套打协同与扫码弹窗**   | `PrintSynergyModalView.vue`<br>`#/print-synergy-modal`   | 打开纯原生脱壳扫码弹窗 `<AtengCodeScannerModal />` 快速录入，联动 `@atengk/print-vue` 的 `<AtengLabelSheet />` 批量标签单据毫米级排版套打 | 脱壳扫码弹窗 Teleport 隔离与自愈关闭、SVG 矢量无损排版在打印机下的高保真还原与工业扫码枪高阶可读性                            |

---

## 4. 全真自动化回归命令

```bash
pnpm --filter @atengk/barcode-vue --filter sample-barcode-vue typecheck && \
pnpm --filter @atengk/barcode-vue --filter sample-barcode-vue lint && \
pnpm --filter @atengk/barcode-vue test && \
pnpm --filter @atengk/barcode-vue --filter sample-barcode-vue build
```

> 详细技术架构、API 契约、Props/Options 全景矩阵与生产边界，请参阅核心子包文档：[@atengk/barcode-vue README](../../packages/barcode-vue/README.md)。
