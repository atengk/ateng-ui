# CropperVue

面向现代 Web 应用、电子商务、内容创作与政企审核认证的工业级图片裁剪与图像处理扩展基础设施，纯 Vue 3 驱动，基于 cropperjs 1.6.x 封装，归属于四层洋葱拓扑之 L2 专用能力/领域扩展层。

## Language

### Core Components & Containers

**AtengCropper**:
图片裁剪核心表现容器组件，底层基于 `cropperjs` 封装，提供多源图片输入适配、比例锁定、视口拖拽、缩放旋转与响应式尺寸自适应能力。
_Avoid_: CropperContainer, ImageViewerCropper, CropperWrapper, VueCropper

**AtengCropperModal**:
轻量级脱壳裁剪模态弹窗组件，纯原生 Vue 3 Teleport 与 `--at-cropper-*` CSS 变量驱动，100% 物理脱耦具体 UI 库，内置空状态拖拽/剪贴板拾取、快捷比例切换栏、角度调平滑块、多尺寸缩略预览与结构化结果回传。
_Avoid_: CropperDialog, ImageCropPopup, CropDialog, CropperWindow

**AtengCropperPreview**:
多规格实时缩略预览组件，自动与活跃的 Cropper 实例建立响应式视口同步，支持多尺寸矩阵（如 128px / 64px / 32px）与圆形/矩形遮罩形态同步呈现。
_Avoid_: CropPreviewer, ThumbnailList, CropperThumb, PreviewBox

### Composables & State Machines

**useCropper**:
纯无状态图片裁剪无头状态机 Composable，管理实例生命周期、提供只读响应式几何度量（ready、loading、data、cropBoxData、zoomRatio、rotateAngle）与对称操作 API（zoom、rotate、flipX、flipY、setAspectRatio、replace、reset、destroy），并内置多轨结构化导出管道。
_Avoid_: useImageCropper, useCropTool, useCropperInstance

### Data Models & Contracts

**CropperResult**:
裁剪完成结构化输出契约，包含二进制 `blob`、带类型文件名 `file`、Base64 `dataUrl`、几何度量坐标 `data` 与视口物理坐标 `cropBoxData`。
_Avoid_: CropOutput, CroppedData, ImageCropResult

**CropperPreset**:
企业级高频裁剪场景预设联合类型（`'avatar' | 'banner' | 'product' | 'id-card' | 'free'`）。
_Avoid_: CropType, CropperMode, AspectRatioPreset

**CropperCropData**:
图片物理像素坐标裁切数据契约（包含 `x`, `y`, `width`, `height`, `rotate`, `scaleX`, `scaleY`）。
_Avoid_: CropRect, CropPoint, RawCropData

**CropperBoxData**:
裁切框在视口容器中的渲染像素坐标契约（包含 `left`, `top`, `width`, `height`）。
_Avoid_: ViewBoxData, BoxRect, CanvasBox

**CropperExportOptions**:
导出管道配置契约，包含目标文件格式（`format`）、压缩质量（`quality`）、尺寸限制（`maxWidth` / `maxHeight`）、目标最大体积（`maxByteSize`）、物理圆形裁剪开关（`clipCircle`）及水印选项（`watermark`）。
_Avoid_: OutputOptions, ExportConfig, CanvasSaveParams

**CropperWatermarkOptions**:
倾斜防伪水印配置契约，包含文本内容（`text`）、字号（`fontSize`）、颜色透明度（`color`）、旋转角（`rotate`）与全图平铺开关（`repeat`）。
_Avoid_: WatermarkConfig, StampOptions, TextMark

### Engines, Drivers & Safety Guards

**BlobUrlGuard**:
临时对象 URL 确定性生命周期守卫，严格跟踪并收敛组件内部接管 `File`/`Blob` 创建的临时 `blob:` URL，在源变更、重置与组件销毁时 100% 释放，避免内存泄漏并杜绝误伤外部 URL。
_Avoid_: UrlCleaner, MemoryReleaser, ObjectUrlTracker

**CanvasTaintGuard**:
远程跨域图片安全守卫，统一前置 `crossOrigin` 配置，捕获跨域 Canvas 污染导致的 SecurityError 并转译为语义化因果异常，防止静默白屏崩溃。
_Avoid_: CorsHandler, ImageSecurity, TaintDetector

**ImageCompressionPipeline**:
智能图像压缩与降级重绘管道，支持 Canvas 质量二分逼近与步进降采样，在保留视觉清晰度的前提下将导出体积严格收敛至目标 `maxByteSize` 阈值内。
_Avoid_: CompressHelper, QualityReducer, ImageResizer

**WatermarkEngine**:
离屏 Canvas 2D 轻量水印合成引擎，零外部依赖实现高清晰度抗锯齿倾斜平铺防伪水印绘制。
_Avoid_: MarkDrawer, WatermarkRenderer, SignAppender

**ClipboardReceiver**:
剪贴板图像监听与提取守卫，自动捕获快捷键 `Ctrl+V` / `Cmd+V` 注入的剪贴板位图数据并安全载入裁剪器。
_Avoid_: PasteHandler, ClipboardWatcher, SniffPastedImage
