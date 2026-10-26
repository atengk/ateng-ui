# sample-file-viewer: @atengk/file-viewer 全真自验展厅

1:1 独立镜像自验工程，针对 `@atengk/file-viewer` 提供的多格式文档/工程文件浏览器原生离线渲染容器进行端到端全真验证。

## 展厅全景验证特性

1. **多格式原生离线渲染**：内置 Word (`.docx`)、Excel (`.xlsx`)、PPT (`.pptx`)、PDF (`.pdf`) 与矢量图片 (`.svg`) 预设文件；
2. **三阶智能类型嗅探**：支持无后缀接口流二进制特征魔数嗅探；
3. **企业级流式网络与安全**：支持 AuthManager 双轨 Token 鉴权凭据流拉取；
4. **ADR-0004 异常拦截验证**：模拟 403 权限受阻时的 Blob-JSON 双态拦截与友好提示；
5. **四维 DLP 防泄密矩阵**：实时切换下载、打印、复制与右键权限，验证硬拦截与打印白屏抑制；
6. **防篡改动态水印**：实时切换纯文本/自定义高防伪倾斜平铺水印，验证 DOM 篡改实时毫秒级自愈；
7. **SizeGuard 内存防崩护栏**：模拟 120MB 超大虚拟文件拦截与渐进传输指示；
8. **加密文档原地解密**：模拟加密 PDF 原地输入密码解密重试；
9. **结构化升级建议**：识别早期老旧二进制格式 (`.doc`) 并提供升级建议；
10. **阅读位置状态记忆**：弱引用缓存阅读状态，模拟切 Tab 销毁重绘后自动复原阅读页码、工作表与缩放；
11. **三位一体多模态调用**：提供基础容器嵌入、声明式全屏弹窗 (`<AtengFileViewerDialog />`) 与一行 JS 命令式函数预览 (`FileViewer.preview()`)。

## 运行方式

```bash
# 启动自验展厅
pnpm --filter sample-file-viewer dev

# 编译类型检查
pnpm --filter sample-file-viewer typecheck

# 代码规范检查
pnpm --filter sample-file-viewer lint

# 生产构建
pnpm --filter sample-file-viewer build
```
