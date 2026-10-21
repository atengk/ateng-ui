<script setup lang="ts">
/**
 * 统一缺省态与异常占位组件 AtengEmpty 自验页面。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { ref } from 'vue';
import {
  ElCard,
  ElRadioGroup,
  ElRadioButton,
  ElSlider,
  ElButton,
  ElAlert,
  ElMessage,
} from 'element-plus';
import { AtengEmpty, type AtengEmptyStatus } from '@atengk/element-plus';

const currentStatus = ref<AtengEmptyStatus>('empty');
const imageSize = ref(160);

const handleActionClick = () => {
  ElMessage.success('已触发重试/跳转动作！');
};
</script>

<template>
  <div class="empty-view">
    <ElCard header="统一缺省态与异常占位组件 AtengEmpty">
      <ElAlert
        title="组件特性说明"
        type="info"
        description="支持 5 大语义状态聚合。内置 5 套精致纯矢量内联 SVG 插画，颜色深度绑定 Element Plus 原生 CSS 变量（--el-*），切换顶部暗黑模式即可实时观察插画自适应深浅色变色！提供 #default 操作区、#image 插画与 #description 文案三维插槽。"
        show-icon
        :closable="false"
        style="margin-bottom: 20px"
      />

      <div class="control-panel">
        <div class="control-item">
          <span class="label">切换语义状态：</span>
          <ElRadioGroup v-model="currentStatus">
            <ElRadioButton value="empty">无数据 (empty)</ElRadioButton>
            <ElRadioButton value="search">搜索无结果 (search)</ElRadioButton>
            <ElRadioButton value="403">无权限 (403)</ElRadioButton>
            <ElRadioButton value="network-error">网络异常 (network-error)</ElRadioButton>
            <ElRadioButton value="500">服务异常 (500)</ElRadioButton>
          </ElRadioGroup>
        </div>

        <div class="control-item">
          <span class="label">调节插画尺寸：</span>
          <ElSlider v-model="imageSize" :min="100" :max="260" style="width: 180px" />
        </div>
      </div>

      <div class="display-box">
        <AtengEmpty :status="currentStatus" :image-size="imageSize">
          <!-- 底部操作按钮插槽 -->
          <ElButton type="primary" @click="handleActionClick">
            {{
              currentStatus === '403'
                ? '申请访问权限'
                : currentStatus === 'search'
                  ? '清空搜索条件'
                  : '重新加载数据'
            }}
          </ElButton>
          <ElButton v-if="currentStatus === '500'" plain @click="() => {}"> 反馈问题 </ElButton>
        </AtengEmpty>
      </div>
    </ElCard>
  </div>
</template>

<style scoped>
.control-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}
.control-item {
  display: flex;
  align-items: center;
  gap: 12px;
}
.label {
  font-weight: 600;
  color: var(--el-text-color-regular);
}
.display-box {
  border: 1px dashed var(--el-border-color);
  border-radius: 8px;
  background-color: var(--el-bg-color);
  padding: 24px;
}
</style>
