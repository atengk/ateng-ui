# sample-echarts-vue (EChartsVue 1:1 镜像全特性自验展厅)

面向 `@atengk/echarts-vue` 的 1:1 开箱镜像与端到端真实交互验证展厅。

---

## 运行与自验

```bash
# 启动自验展厅开发服务器 (默认端口 3006)
pnpm --filter sample-echarts-vue dev
```

浏览器访问：`http://localhost:3006`

---

## 验证场景矩阵

1. **侧边栏折叠联动与几何感知自愈**：
   - 点击“折叠/展开侧边栏 (220px ➔ 64px)”，右侧图表卡片平滑过渡，验证 ResizeObserver 毫秒级几何自感知与自适应重排；
2. **模态弹窗内初次渲染 (Modal Zero-Dimension Healing)**：
   - 点击“模态弹窗内渲染图表”，验证图表在弹窗弹出瞬间从 `0x0` 零尺寸自愈展开并正确绘制；
3. **Tab 选项卡保真与零尺寸挂起**：
   - 切换隐藏选项卡（初始 `display: none`），切入瞬间自愈绘制，切出挂起，绝不崩溃；
4. **暗黑模式无损热切换**：
   - 点击“切换为暗黑模式”，底层 ECharts 实例平滑销毁并以 `ateng-dark` 主题重建，Option 与图例事件无损回放；
5. **DOM 级多态遮罩**：
   - 模拟 Loading、Empty、Error 遮罩切换，验证错误重试与空状态防白屏；
6. **六大业务高频预设看板**：
   - `AtengTrendChart`：双 Y 轴、柱线混合、平滑渐变面积、DataZoom 缩放；
   - `AtengDonutChart`：居中自动求和 KPI 统计指标卡与南丁格尔玫瑰图切换；
   - `AtengFunnelChart`：双轨自动计算环节转化率与总体转化率；
   - `AtengGaugeChart`：极值 KPI 达成率，指针与环形进度条双模切换；
   - `AtengRadarChart`：多维能力画像，多边形/蛛网网格与渐变半透明填充；
   - `AtengMapChart`：全国 ➔ 广东省 ➔ 深圳市三级行政区划受控下钻，面包屑路径栈回退；
7. **全屏脱壳与高清图片报表导出**：
   - 浏览器原生系统全屏与 CSS 脱壳视口全屏双模切换；
   - 2x/3x 高清设备像素比图片导出并生成带时间戳的安全文件名；
   - `#toolbar` 自定义操作插槽替换与扩展。
