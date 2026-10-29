# CodeEditorVue

企业级 Monaco Editor 代码编辑与结构化 Diff 差异比对响应式扩展基础设施，纯 Vue 3 驱动，归属于四层洋葱拓扑之 L2 专用能力/领域扩展层。

## Language

**TextModel**:
Monaco Editor 中表示只读或可编辑代码文本的独立内存数据模型，维护独立的版本号、撤销历史与光标状态。
_Avoid_: File, buffer, document, code string

**CodeEditor**:
面向单一代码文本的高保真编辑、语法高亮、校验与格式化操作的表现容器。
_Avoid_: TextArea, input, code viewer

**CodeDiffEditor**:
面向原始版本与修改版本进行双栏并排或单栏内联差异比对的高阶表现容器。
_Avoid_: Comparator, merger, git diff view

**IncrementalEdit**:
基于 Monaco 内部版本控制与光标保护进行的增量操作补丁应用，避免冲掉撤销/重做历史栈。
_Avoid_: Full replace, setValue, rewrite

**WorkerProvider**:
用于弹性解析、加载和分发 Monaco Web Worker 脚本地址的三级弹性策略接口。
_Avoid_: CDN loader, script tag, worker injector

**CompletionProvider**:
受管生命周期的智能代码与业务字段补全提供者，支持在组件卸载或切语言时确定性注销。
_Avoid_: Auto-complete, hint function, suggestion list

**DiffMode**:
差异比对器的视觉呈现模式，支持双栏并排（Split / Side-by-Side）与行间内联（Inline）两种形态。
_Avoid_: Diff view type, comparison layout

**GeometricSelfHealing**:
当容器挂载于隐藏弹窗或未激活标签页（0x0 像素）时，通过尺寸感应与挂起机制自愈内部 Canvas 的健壮性保障。
_Avoid_: Auto resize, delayed render, force refresh
