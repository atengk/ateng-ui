# Element Plus (基础设施增强组件库)

基于 Element Plus 封装的企业级高频基础设施组件与指令集，与底层状态契约深度解耦。

## 基础设施组件

**AtengTable**:
与统一网络契约（PageQuery / PageResult）深度绑定的企业级分页表格容器组件。
_Avoid_: ProTable, SuperTable, DataTable, BaseTable

**AtengExcelFeedback**:
Excel 导入错误明细在线预览与 Apache Fesod 标红批注回写文件下载弹窗组件。
_Avoid_: ErrorDialog, ExcelModal, FeedbackDialog, ImportResultModal

**AtengUpload**:
统一抽象本地与标准 S3/MinIO 多源存储的直传与分片上传器组件。
_Avoid_: FileUploader, OssUpload, UploadBox, StorageUpload

## 权限与防重指令

**v-permission**:
基于 Sa-Token 权限码的细粒度操作按钮可见性控制指令。
_Avoid_: v-auth, v-hasPermi, v-access, v-privilege

**v-role**:
基于角色标识的操作权限控制指令。
_Avoid_: v-hasRole, v-isRole, v-roles

**v-idempotent**:
针对提交动作的防刷、防重复点击与前端幂等锁保护指令。
_Avoid_: v-debounce, v-throttle, v-preventReClick, v-noRepeat
