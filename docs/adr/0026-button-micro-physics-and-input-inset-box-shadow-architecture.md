# 0026. 按钮微动效物理学、高反差签名隔离与表单内嵌描边盒模型架构

## 状态

Accepted (已接受)

## 背景与决策上下文

在企业级中后台与多主题展厅（`ThemeProPanoramaView`、`ButtonsInputsView` 等）的实际交互使用与多场景测试中，暴露出四大关于视觉层叠穿透、微动效冲突与边框盒模型错位的工程痛点：

1. **按钮微动效物理违和与文字虚焦**：
   - 源码中同时声明了 `hover: translateY(-1px)`（向上浮动 1px）与 `active: scale(0.975)`（按压缩放 0.975）；
   - 在用户点击交互时，Hover 浮动与 Active 缩放发生非正交叠加，点击瞬间按钮“向下坠落 1px 同时向内缩放”，松开时又“向上弹跳 1px 同时向外展开”，伴随亚像素抗锯齿抖动（Jitter & Blur），产生强烈的上下颠簸与廉价感；
   - 鼠标点击后，常规 `:focus` 状态残留，导致按钮持续维持类似卡死的伪悬浮激活外观。
2. **Linear / Vercel 签名级高反差按钮 (.is-contrast) 色彩穿透**：
   - 在浅色模式下，`.el-button--primary` 选择器特异性（Specificity）过大且漏加了 `:not(.is-contrast)`，导致其背景色被全局 Primary 主题色（如 Indigo `#4f46e5`）强行覆盖，原本标配的纯黑底白字变为与普通 Primary 按钮一模一样；
   - Hover 时触发 Primary 浅淡 hover 色，文字颜色倒挂为深蓝紫，高反差特性完全失效。
3. **四大语义按钮 (Success/Warning/Danger/Info) 色彩污染**：
   - 样式表仅静态声明了语义按钮的初始背景色，未显式覆盖其 `&:hover`、`&:active` 选择器；
   - 鼠标悬停到 Warning 按钮时，Element Plus 的 `.el-button:hover` 规则被触发，读取了全局未收敛的 Primary 悬浮色，导致 Warning 按钮变成“白底 + 蓝紫色边框 + 蓝紫色文字”，完全丢失警示属性。
4. **数字步进器 (ElInputNumber) 边框残缺与外环裁切**：
   - 步进器内部的加减按钮分割线以及紧凑右翼上下箭头横线，使用了 `rgba(15, 23, 42, 0.03)`（3% 透明度）的 `--el-border-color-lighter`，在浅色底色下肉眼几乎隐形，导致界面呈现“线条残缺、断断续续”；
   - 在 `.el-input__wrapper` 上暴力声明了物理 `border: 1px solid`，破坏了 Element Plus 的绝对定位盒模型（加减按钮绝对定位在 `top: 1px; bottom: 1px`），引发 1px 错位；且聚焦时两端加减按钮的实心浅灰背景将外层紫色 Focus-Ring 生生切断裁掉。

## 架构决策

基于“**纯阻尼微物理、高反差解耦隔离、全态封闭色阶与 Box-Shadow 纯净内描边**”原则，确立以下架构决策：

### 1. 废除 Hover 物理位移，建立 Pure Damped Press（纯阻尼微缩放）物理模型

- **剥离物理坐标位移**：常规按钮彻底取消 `hover: translateY(-1px)`，保持排版基准线稳固，杜绝密布按钮场景下的颠簸与文字边缘亚像素模糊；
- **纯阻尼微按压反馈**：仅在 `:active` 按压态施加极轻微且稳定的 `scale(0.98)`（搭配 `0.12s cubic-bezier(0.16, 1, 0.3, 1)`），提供清脆紧凑的微物理阻尼反馈；
- **指针与键盘焦点解耦**：剥离普通鼠标点击的 `:focus` 轮廓残留，仅在用户通过键盘按键（Tab 导航）聚焦时触发 `:focus-visible` 激光外环。

### 2. 确立 Contrast Obsidian Invariant（高反差黑曜石签名）隔离律

- **全模式黑白权威反差锁定**：
  - 浅色模式：默认锁定极黑曜石底 (`#090d16`) + 纯白文字 (`#ffffff`)，Hover 态平滑过渡至深灰青 (`#1e293b`)，Active 态为深墨底 (`#0f172a`)，文字全程锁定纯白；
  - 暗黑模式：默认锁定冷白底 (`#f8fafc`) + 极黑文字 (`#07090e`)，Hover 态平滑过渡至冷浅灰 (`#e2e8f0`)，Active 态为冷灰底 (`#cbd5e1`)，文字全程锁定极黑；
- **选择器特异性绝缘**：在 `.el-button--primary` 选择器中强制注入 `:not(.is-contrast)`，并将 `.is-contrast` 提升至复合最高特异性，彻底绝缘多主题预设色彩覆盖。

### 3. 四大语义按钮（Success / Warning / Danger / Info）独立全态色阶闭环

- 为 Success（翠绿）、Warning（琥珀）、Danger（绯红）、Info（冷灰）分别显式补齐独立的 `&:hover`、`&:active` 选择器与文字色彩声明；
- 悬停时呈现同相明亮微光，点击时呈现同相沉稳暗调，文字颜色 100% 锁定 `#ffffff`，彻底切断 Element Plus 全局 Primary 变量穿透污染。

### 4. 确立 Inset Box-Shadow Border Model（内嵌阴影描边盒模型）与步进器一体化规约

- **输入框盒模型修正**：彻底剥离 `.el-input__wrapper`、`.el-select__wrapper`、`.el-textarea__inner` 上的物理 `border: 1px solid`，全面对齐现代组件库采用的 `box-shadow: 0 0 0 1px var(--el-border-color) inset` 内描边架构，零挤占物理排版空间，杜绝绝对定位子元素发生 1px 错位；
- **步进器清晰分割线**：加减按钮纵向分隔线与上下箭头横向分割线统一对齐 `var(--el-border-color)`（暗黑模式 `rgba(255, 255, 255, 0.12)`），彻底杜绝线条隐形残缺；
- **步进器一体化焦点联动 (Integrated Stepper Focus-Ring)**：步进器激活焦点时，通过 `:focus-within` 将激光 Focus-Ring 完整包裹至整体 `.el-input-number` 外围，减号、加号与中间输入区共享一体化光晕，彻底根除两端按钮裁切破坏焦点环。

## 影响与验证结果

1. **按钮微交互手感**：消除 hover 跳动与 active 坠落，按钮手感达到媲美 macOS / Linear 的现代工业级沉稳触感；
2. **高反差与语义表现**：`is-contrast` 在浅色模式下完美呈现黑底白字与高级深灰青悬浮态；Warning 等语义按钮在 Hover 时保持清晰明亮的告警色阶，零色彩污染；
3. **步进器与输入框质感**：双翼与右翼步进器线条严丝合缝、清脆可见，聚焦时外圈形成无缝整体激光环，盒模型零错位。
