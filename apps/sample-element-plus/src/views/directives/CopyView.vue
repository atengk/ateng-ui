<script setup lang="ts">
/**
 * 剪贴板复制指令 v-copy 自验页面。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { ref } from 'vue';
import { ElCard, ElButton, ElInput, ElAlert, ElMessage } from 'element-plus';

const dynamicText = ref('动态配置信息_2026');
const pasteArea = ref('');

const copyCallbackMsg = ref('');

const handleCustomSuccess = (val: string) => {
  copyCallbackMsg.value = `成功回调捕获: [${val}]`;
};
</script>

<template>
  <div class="copy-view">
    <ElCard header="剪贴板复制指令 v-copy">
      <ElAlert
        title="指令特性说明"
        type="info"
        description="支持一键将文本写入系统剪贴板。支持纯字符串、动态 Getter 箭头函数与配置对象；优先使用 navigator.clipboard，非安全上下文自动安全降级至 execCommand；默认集成 ElMessage 成功/失败提示。"
        show-icon
        :closable="false"
        style="margin-bottom: 20px"
      />

      <div class="demo-section">
        <h3>1. 静态字符串一键复制</h3>
        <div class="action-row">
          <ElButton v-copy="'https://github.com/atengk/ateng-ui'" type="primary">
            复制仓库地址
          </ElButton>
          <ElButton v-copy="'npm i @atengk/element-plus'" type="success"> 复制安装命令 </ElButton>
        </div>
      </div>

      <div class="demo-section">
        <h3>2. 动态 Getter 响应式内容复制</h3>
        <p class="desc">修改下方输入框内容，点击按钮复制最新实时数据：</p>
        <div class="action-row">
          <ElInput v-model="dynamicText" style="width: 260px" placeholder="请输入动态文本" />
          <ElButton v-copy="() => dynamicText" type="warning"> 复制输入框内容 </ElButton>
        </div>
      </div>

      <div class="demo-section">
        <h3>3. 高级配置对象（自定义文案与静默模式）</h3>
        <div class="action-row">
          <ElButton
            v-copy="{
              value: 'PROMO_CODE_8888',
              message: '🎁 专属礼包码已复制到剪贴板！',
              onSuccess: handleCustomSuccess,
            }"
            type="primary"
            plain
          >
            自定义提示文案
          </ElButton>

          <ElButton
            v-copy="{
              value: 'SILENT_TOKEN_SECRET',
              message: false,
              onSuccess: () => ElMessage.info('静默模式：仅自定义 info 提示'),
            }"
            type="info"
            plain
          >
            静默模式 (message: false)
          </ElButton>
        </div>
        <p v-if="copyCallbackMsg" class="callback-msg">{{ copyCallbackMsg }}</p>
      </div>

      <div class="demo-section paste-test">
        <h3>4. 剪贴板验证粘贴区</h3>
        <ElInput
          v-model="pasteArea"
          type="textarea"
          :rows="3"
          placeholder="在此处按 Ctrl+V (或 Cmd+V) 验证刚才复制的内容"
        />
      </div>
    </ElCard>
  </div>
</template>

<style scoped>
.demo-section {
  margin-bottom: 24px;
}
.demo-section h3 {
  margin-bottom: 8px;
  font-size: 15px;
  color: var(--el-text-color-primary);
}
.desc {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  margin-bottom: 12px;
}
.action-row {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.callback-msg {
  margin-top: 8px;
  font-size: 13px;
  color: var(--el-color-success);
}
.paste-test {
  max-width: 500px;
}
</style>
