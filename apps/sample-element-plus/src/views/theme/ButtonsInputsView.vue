<script setup lang="ts">
/**
 * @atengk/element-plus 现代主题引擎 - 主按钮与表单输入控件自验展厅。
 *
 * 验证：
 * 1. Linear 签名级高反差主按钮 (.is-contrast) 与天鹅绒沉稳主题色主按钮 (type="primary")；
 * 2. 按钮阻尼按压缩放 (scale(0.975)) 与冷钛金次级按钮质感；
 * 3. 4px 激光微光双层 Focus-Ring (输入框、选择器、时间选择、文本域)；
 * 4. 表单错误态 (.is-error) 绯红激光光晕联动；
 * 5. 5 款科技主题预设秒切与暗黑模式深度自适应。
 *
 * @author Ateng
 * @since 2026-10-22
 */

import { ref, reactive } from 'vue';
import {
  ElButton,
  ElInput,
  ElSelect,
  ElOption,
  ElForm,
  ElFormItem,
  ElRadioGroup,
  ElRadioButton,
  ElMessage,
} from 'element-plus';
import { AtengCard } from '@atengk/element-plus';

// 当前主题预设控制
const currentPreset = ref<'indigo' | 'emerald' | 'violet' | 'ocean' | 'rose'>('indigo');

const switchPreset = (preset: 'indigo' | 'emerald' | 'violet' | 'ocean' | 'rose') => {
  currentPreset.value = preset;
  document.documentElement.setAttribute('data-theme', preset);
  ElMessage.success({
    message: `已切换至 ${preset.toUpperCase()} 科技主题`,
    grouping: true,
  });
};

// 按钮 Loading 态演示
const loadingBtn = ref(false);
const triggerLoading = () => {
  loadingBtn.value = true;
  setTimeout(() => {
    loadingBtn.value = false;
  }, 1500);
};

// 表单输入与错误联动演示
const formData = reactive({
  username: 'Ateng Developer',
  apiKey: 'ateng_live_sk_948209384029',
  cluster: 'us-east-cluster',
  description: '面向分布式微服务与现代 Web 的基础设施主题套件。',
});

const triggerError = ref(false);
</script>

<template>
  <div class="theme-buttons-inputs-view">
    <!-- 顶部多主题快速切换操作条 -->
    <AtengCard title="🎨 5 款极客科技主题预设实时切换" class="mb-4">
      <div class="preset-bar">
        <span class="label">当前主题:</span>
        <ElRadioGroup
          :model-value="currentPreset"
          @update:model-value="val => switchPreset(val as any)"
        >
          <ElRadioButton value="indigo">🌌 Indigo 极客靛蓝</ElRadioButton>
          <ElRadioButton value="emerald">🌲 Emerald 极客翠绿</ElRadioButton>
          <ElRadioButton value="violet">🔮 Violet 赛博幻紫</ElRadioButton>
          <ElRadioButton value="ocean">🌊 Ocean 商务深海</ElRadioButton>
          <ElRadioButton value="rose">🌹 Rose 极光绯红</ElRadioButton>
        </ElRadioGroup>
      </div>
      <p class="preset-tip">
        💡 提示：在上方切换主题，或在页面右上角切换暗黑/浅色模式，下方所有主按钮与输入框 Focus
        激光环将无缝实时响应！
      </p>
    </AtengCard>

    <!-- 1. 三轨按钮体系 -->
    <AtengCard title="🏆 三轨现代主按钮体系 (彻底告别 2012 果冻高光与文字阴影)" class="mb-4">
      <div class="showcase-section">
        <div class="section-title">1.1 核心主按钮与高反差签名</div>
        <div class="btn-group">
          <!-- Linear 签名高反差按钮 -->
          <ElButton type="primary" class="is-contrast">Linear 纯白高反差 (.is-contrast)</ElButton>
          <!-- 天鹅绒沉稳主题色主按钮 -->
          <ElButton type="primary">天鹅绒主题色 (type="primary")</ElButton>
          <!-- 次级冷钛按钮 -->
          <ElButton>Secondary 钛金次级</ElButton>
          <!-- 幽灵虚线按钮 -->
          <ElButton dashed>Ghost 虚线幽灵</ElButton>
          <!-- Loading 动态交互 -->
          <ElButton type="primary" :loading="loadingBtn" @click="triggerLoading">
            {{ loadingBtn ? '执行中...' : '点击触发 Loading' }}
          </ElButton>
          <!-- 禁用态对比 -->
          <ElButton type="primary" disabled>禁用状态</ElButton>
        </div>
      </div>

      <div class="showcase-section">
        <div class="section-title">1.2 语义状态辅助按钮 (带细腻环境阴影)</div>
        <div class="btn-group">
          <ElButton type="success">Success 翠绿成功</ElButton>
          <ElButton type="warning">Warning 琥珀警告</ElButton>
          <ElButton type="danger">Danger 绯红危险</ElButton>
          <ElButton type="info">Info 冷灰信息</ElButton>
        </div>
      </div>

      <div class="showcase-section">
        <div class="section-title">1.3 尺寸与圆角形态</div>
        <div class="btn-group items-center">
          <ElButton type="primary" size="large">Large 大尺寸</ElButton>
          <ElButton type="primary" size="default">Default 默认</ElButton>
          <ElButton type="primary" size="small">Small 小尺寸</ElButton>
          <ElButton type="primary" round>Round 圆角胶囊</ElButton>
        </div>
      </div>
    </AtengCard>

    <!-- 2. 双层激光 Focus-Ring 表单输入控件 -->
    <AtengCard title="⚡ 双层激光 Focus-Ring 表单输入控件 (4px 柔光扩散环)" class="mb-4">
      <div class="controls-panel mb-4">
        <ElButton :type="triggerError ? 'danger' : 'default'" @click="triggerError = !triggerError">
          {{ triggerError ? '解除 .is-error 错误态' : '模拟激活 .is-error 错误红光联动' }}
        </ElButton>
      </div>

      <ElForm :model="formData" label-width="140px" class="demo-form">
        <ElFormItem label="开发者姓名" :class="{ 'is-error': triggerError }">
          <ElInput v-model="formData.username" placeholder="请输入用户名..." clearable />
        </ElFormItem>

        <ElFormItem label="服务网关 API Key" :class="{ 'is-error': triggerError }">
          <ElInput v-model="formData.apiKey" placeholder="输入密钥..." />
        </ElFormItem>

        <ElFormItem label="部署集群目标" :class="{ 'is-error': triggerError }">
          <ElSelect v-model="formData.cluster" placeholder="请选择集群..." style="width: 100%">
            <ElOption label="北美东部主力集群 (us-east-cluster)" value="us-east-cluster" />
            <ElOption label="亚太香港低延迟节点 (ap-east-cluster)" value="ap-east-cluster" />
            <ElOption
              label="欧洲法兰克福合规集群 (eu-central-cluster)"
              value="eu-central-cluster"
            />
          </ElSelect>
        </ElFormItem>

        <ElFormItem label="系统描述 (Textarea)" :class="{ 'is-error': triggerError }">
          <ElInput
            v-model="formData.description"
            type="textarea"
            :rows="3"
            placeholder="请输入系统描述..."
          />
        </ElFormItem>
      </ElForm>
    </AtengCard>
  </div>
</template>

<style scoped>
.theme-buttons-inputs-view {
  padding: 4px;
}

.mb-4 {
  margin-bottom: 20px;
}

.preset-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.label {
  font-size: 13px;
  font-weight: 600;
}

.preset-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 10px;
}

.showcase-section {
  margin-bottom: 20px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-regular);
  margin-bottom: 10px;
}

.btn-group {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.items-center {
  align-items: center;
}

.controls-panel {
  display: flex;
  gap: 12px;
  align-items: center;
}

.demo-form {
  max-width: 680px;
}
</style>
