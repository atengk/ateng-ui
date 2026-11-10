# BarcodeVue

面向现代 Web 应用、仓储物流（WMS/TMS）、零售收银、智能制造与标签单据套打的工业级条码、艺术二维码与动态扫码扩展基础设施，纯 Vue 3 驱动，基于 jsbarcode、qr-code-styling、html5-qrcode 懒加载与多模式硬件扫描无头状态机封装，归属于四层洋葱拓扑之 L2 专用能力/领域扩展层。

## Language

### Core Components & Containers

**AtengBarcode**:
一维条码统领表现容器组件，底层基于 `jsbarcode` 封装，支持 SVG 纯矢量与 Canvas 双模渲染、内置严格格式离线校验器、工业静区保护、肉眼防错文本分组与优雅降级插槽。
_Avoid_: BarcodeView, BarcodeContainer, BarcodeItem, JsBarcodeWrapper, Code128View

**AtengQRCode**:
艺术与企业级二维码统领容器组件，底层基于 `qr-code-styling` 封装，支持 SVG 与 Canvas 渲染、6 大开箱即用企业级主题预设、Logo 容错级别自动提升、安全防干扰保护圈、跨域图片防污损（CORS Guard）与中心富媒体插槽。
_Avoid_: QrCodeView, QRCodeContainer, StylingQRCode, ArtQRCode, QuickResponseCode

**AtengCodeScanner**:
动态按需摄像头与本地图像扫码器统领容器组件，底层基于 `html5-qrcode` 动态 `import()` 懒加载，提供自适应长宽比取景框（一维码/二维码专用构型）、前后镜头切换、手电筒补光、文件拖拽/剪贴板解码、连续流水线扫码去重冷却与 Web Audio 蜂鸣/触觉震动反馈。
_Avoid_: CameraScanner, BarcodeScanner, QrScanner, Html5QrScanner, VisionScanner

**AtengCodeScannerModal**:
轻量级脱壳全屏/遮罩扫码弹窗容器组件，纯原生 CSS 变量与 Teleport 驱动，解耦具体 UI 库，内置半透明暗黑遮罩、浮动工具栏与扫码完成自愈关闭。
_Avoid_: ScannerDialog, ScannerPopup, ScanModal, QrCodeDialog

### Directives

**vHardwareScannerReceiver**:
物理扫码枪定向接收目标标记指令，用于显式标记某个文本输入框为手持硬件扫码枪的唯一输入靶向，使扫码结果定向填充该输入框并阻止页面其他焦点受到污染。
_Avoid_: v-scanner-target, v-barcode-input, v-scan-to, v-hardware-target

### Composables & State Machines

**useBarcode**:
一维码纯无状态无头状态机 Composable，提供离线格式校验、SVG/Canvas 渲染上下文提取、格式化文本管道与图像导出能力。
_Avoid_: useCode128, useJsBarcode, useBarcodeGenerator

**useQRCode**:
艺术二维码纯无状态无头状态机 Composable，提供 6 大企业级主题预设组装、动态 Logo 跨域加载防卫、容错级自动校准与矢量/栅格图像导出能力。
_Avoid_: useQrCodeStyling, useArtQRCode, useQRGenerator

**useCodeScanner**:
软件摄像头与本地文件解码无头状态机 Composable，封装动态模块按需加载、MediaStream 视频流受管生命周期、设备枚举、前后摄像头切换、手电筒开关、单次/连续扫码去重状态以及文件静默解码能力。
_Avoid_: useCameraScan, useScannerStream, useQrDecoder

**useHardwareScanner**:
手持物理扫码枪（HID 虚拟键盘输入）无头状态机 Composable，通过毫秒级击键间隔阈值算法精准识别扫码枪高频脉冲输入，支持前缀/后缀清洗、防重复冷却、全局/容器双模作用域及表单输入污染防御守卫（Form Guard）。
_Avoid_: useUsbScanner, useScanGun, useKeyboardBarcode, useHidScanner

### Data Models & Contracts

**BarcodeFormat**:
一维码格式强类型枚举联合（`'CODE128' | 'CODE39' | 'EAN13' | 'EAN8' | 'UPC' | 'ITF14' | 'ITF' | 'MSI' | 'pharmacode' | 'codabar'` 等）。
_Avoid_: BarcodeType, BarcodeMode, CodeType

**BarcodeOptions**:
一维条码渲染配置契约，包含格式、渲染形态、宽度倍率、高度、静区边距、文本展示、文本位置、对齐、字体、颜色、背景色及格式化管道 `formatText`。
_Avoid_: BarcodeProps, JsBarcodeConfig, CodeSettings

**QRCodePreset**:
企业级二维码主题预设联合类型（`'standard' | 'industrial' | 'tech-blue' | 'elegant-dots' | 'classy' | 'minimal-fluid'`）。
_Avoid_: QrStyle, QrTheme, QrTemplate

**QRCodeOptions**:
二维码渲染配置契约，包含预设、纠错级别（`'L' | 'M' | 'Q' | 'H'`）、码点样式（`dotsOptions`）、码眼样式（`cornersSquareOptions` / `cornersDotOptions`）、背景、Logo 安全选项及中心插槽配置。
_Avoid_: QrStylingConfig, QrCodeSettings

**ScannerConfig**:
摄像头扫码器运行态配置契约，包含扫码模式（`'qr-code' | 'barcode' | 'all'`）、扫码交互模式（`'single' | 'continuous'`）、取景框构型（`qrbox`）、同码去重冷却时间（`duplicateIntervalMs`）、蜂鸣反馈、震动反馈与摄像头朝向。
_Avoid_: Html5QrcodeConfig, ScanOptions, CameraConfig

**HardwareScannerOptions**:
物理手持扫码枪监听器配置契约，包含击键时间阈值（`maxIntervalMs`）、结束符（`endKeys`）、最短长度（`minLength`）、防表单污染守卫（`preventInputPollution`）、目标容器、防重冷却时间与扫码回调。
_Avoid_: ScanGunConfig, UsbScannerOptions, KeyboardScanOptions

### Engines, Drivers & Safety Guards

**BarcodeValidator**:
一维码前置离线防崩溃校验引擎，提供针对 EAN-13、CODE39、ITF-14 等严格格式的纯算法校验，拦截非法字符与长度错误，守护前端避免运行时未捕获异常。
_Avoid_: BarcodeChecker, CodeRuleEngine, ValidateBarcodeHelper

**CorsImageGuard**:
外部 Logo 跨域防污损加载器，统一预检图片跨域策略，注入 `crossOrigin="anonymous"` 并提供 SVG 占位回退，杜绝 Canvas Tainting 导致导出中断。
_Avoid_: ImageCORSHandler, CrossOriginLoader, LogoSecurityGuard

**ScannerEngineLoader**:
扫码引擎动态懒加载器，基于动态 `import('html5-qrcode')` 实现按需拉取，内置单例缓存与离线单测环境 Mock 驱动降级。
_Avoid_: Html5QrcodeLoader, ScannerLazyModule, DynamicScannerImporter

**ScannerAudioFeedback**:
基于 Web 原生 Web Audio API 动态合成短促蜂鸣声（BEEP）的音频发生器，零外部 MP3/WAV 静态资产依赖，确保离线与内网环境下 100% 可用。
_Avoid_: BeepPlayer, AudioBuzzer, SoundFeedbackManager

**HardwareScanMatcher**:
物理扫码枪高速脉冲时序捕获与表单守卫匹配器，在事件捕获阶段精确分辨人类慢速击键与扫码枪高速字符流，拦截输入框污染并派发结构化扫码结果。
_Avoid_: KeystrokeAnalyzer, PulseInputMatcher, ScanGunInterceptor
