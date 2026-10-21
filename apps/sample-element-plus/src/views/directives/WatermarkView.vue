<script setup lang="ts">
/**
 * 动态防篡改水印指令 v-watermark 自验页面。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { ref } from 'vue';
import {
  ElCard,
  ElButton,
  ElInput,
  ElSlider,
  ElColorPicker,
  ElAlert,
  ElSwitch,
} from 'element-plus';

const watermarkText = ref('内部绝密文档 · 禁止外传');
const watermarkColor = ref('rgba(0, 0, 0, 0.12)');
const watermarkRotate = ref(-22);

const enableFullScreenWatermark = ref(false);
</script>

<template>
  <div class="watermark-view">
    <ElCard header="动态防篡改水印指令 v-watermark">
      <ElAlert
        title="指令特性说明"
        type="info"
        description="基于 Canvas 离屏渲染清晰抗锯齿文本背景图（SVG 兜底降级）；样式强制 pointer-events: none 穿透交互；配备 MutationObserver 深度监听，当在 DevTools 控制台遭遇恶意删除节点或修改 style 隐藏时微任务级即时重建自愈。"
        show-icon
        :closable="false"
        style="margin-bottom: 20px"
      />

      <div class="control-grid">
        <div class="control-item">
          <span class="label">水印文案：</span>
          <ElInput v-model="watermarkText" style="width: 260px" />
        </div>
        <div class="control-item">
          <span class="label">旋转角度：</span>
          <ElSlider v-model="watermarkRotate" :min="-90" :max="90" style="width: 180px" />
        </div>
        <div class="control-item">
          <span class="label">颜色与透明度：</span>
          <ElColorPicker v-model="watermarkColor" show-alpha />
        </div>
        <div class="control-item">
          <span class="label">启用全局视口全屏水印 (.full)：</span>
          <ElSwitch v-model="enableFullScreenWatermark" />
        </div>
      </div>

      <!-- 全局全屏水印节点（按开关激活） -->
      <div v-if="enableFullScreenWatermark" v-watermark.full="watermarkText" />

      <div class="demo-section">
        <h3>1. 局部容器水印自愈实测区</h3>
        <p class="desc">
          💡 <b>防篡改实测指引</b>：按 F12 打开浏览器控制台，使用 Elements 检查下方容器中的
          <code>&lt;div class="at-watermark-mask"&gt;</code>，尝试在控制台中按 Delete
          删除该节点，或修改样式加上 <code>display: none</code> /
          <code>opacity: 0</code>，观察水印是否即时自愈重建！
        </p>

        <!-- 局部容器水印区域 -->
        <div
          v-watermark="{
            text: watermarkText,
            color: watermarkColor,
            rotate: watermarkRotate,
          }"
          class="watermark-container-box"
        >
          <div class="inner-content">
            <h4>企业财务敏感数据报表</h4>
            <table class="mock-table">
              <thead>
                <tr>
                  <th>季度</th>
                  <th>营业收入 (万元)</th>
                  <th>净利润 (万元)</th>
                  <th>审核状态</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>2026 Q1</td>
                  <td>¥ 12,850.00</td>
                  <td>¥ 3,420.00</td>
                  <td>已归档</td>
                </tr>
                <tr>
                  <td>2026 Q2</td>
                  <td>¥ 15,200.00</td>
                  <td>¥ 4,110.00</td>
                  <td>复核中</td>
                </tr>
              </tbody>
            </table>
            <div class="inner-action">
              <ElButton type="primary" size="small" @click="() => {}">
                穿透交互测试：点击正常触发
              </ElButton>
            </div>
          </div>
        </div>
      </div>
    </ElCard>
  </div>
</template>

<style scoped>
.control-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-items: center;
  margin-bottom: 24px;
}
.control-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
.label {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-regular);
}
.demo-section h3 {
  margin-bottom: 8px;
  font-size: 15px;
  color: var(--el-text-color-primary);
}
.desc {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 20px;
  margin-bottom: 16px;
}
.watermark-container-box {
  width: 100%;
  min-height: 260px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  padding: 24px;
  background-color: var(--el-bg-color);
  box-sizing: border-box;
}
.mock-table {
  width: 100%;
  border-collapse: collapse;
  margin: 16px 0;
}
.mock-table th,
.mock-table td {
  border: 1px solid var(--el-border-color-light);
  padding: 8px 12px;
  text-align: left;
  font-size: 13px;
}
.mock-table th {
  background-color: var(--el-fill-color-light);
}
.inner-action {
  margin-top: 12px;
}
</style>
