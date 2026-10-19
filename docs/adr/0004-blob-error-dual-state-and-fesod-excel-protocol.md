# 0004. Blob 异常双态识别防御与 Apache Fesod Excel 协议对接

## 状态

Accepted (已接受)

## 背景与决策上下文

在中后台数据导出与批量导入场景中，前端调用下载或回写接口通常在 Axios 中指定 `responseType: 'blob'`。当后端发生业务校验失败、权限未通过或参数非法时，后端返回的是标准的 JSON 错误响应（如 `{"code": 40001, "msg": "数据存在格式错误"}`）。

然而，Axios 会将该 JSON 字符串强制包装为 Blob 二进制对象。若调用方未予识别直接调用 `URL.createObjectURL` 触发下载，用户将会下载并打开一个无法识别且内容为 JSON 错误信息的损坏 `.xlsx` 文件，造成严重的交互静默失败与白屏崩溃。

同时，后端已采用 Apache Fesod（阿里开源 Excel 框架孵化版本）处理流式数据，支持导入失败时自动标红错误单元格并追加批注（Comment），需在前端形成标准的回写下载与交互弹窗支持。

## 架构决策

1. **Blob-JSON 双态自适应解包**：在核心网络层（`@atengk/core`）的响应拦截器中显式检测：当 `responseType === 'blob'` 且数据类型为 `application/json` 时，通过 `blob.text()` 异步读取内容，反序列化为 `Result<T>`，并统一作为 `BusinessException` 抛出；
2. **标准文件名提取**：基于 RFC 5987 与 RFC 6266 标准，从 `Content-Disposition` 响应头提取 UTF-8 编码的文件名，若不存在则降级为带有时间戳的默认文件名；
3. **确定性内存释放**：由 `URL.createObjectURL` 生成的 Object URL，必须在触发模拟下载后确定性调用 `URL.revokeObjectURL(url)`，坚决杜绝前端大文件下载内存泄漏；
4. **两级错误交互模型**：在 `@atengk/vue`（`useExcel`）与 `@atengk/element-plus`（`AtengExcelFeedback`）中封装：支持流式直下载标红批注文件，以及弹窗预览高频错误明细 + 下载批注回写文件的双模态体验。

## 效果与权衡

- **收益**：彻底消灭“下载假文件与损坏 Excel”的行业普遍痛点，使二进制文件流交互具备与普通 API 一致的强类型异常闭环。
- **代价**：当命中错误时需进行一次异步 `blob.text()` 读取，微小的开销对于异常路径完全可以忽略。
