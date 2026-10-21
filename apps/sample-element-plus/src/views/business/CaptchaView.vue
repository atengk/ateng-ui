<script setup lang="ts">
/**
 * AtengCaptcha 验证码与防刷新倒计时展厅。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { ref } from 'vue';
import { ElCard, ElForm, ElFormItem, ElInput, ElButton, ElDivider, ElMessage } from 'element-plus';
import { AtengCaptcha, type AtengCaptchaInstance } from '@atengk/element-plus';

const captchaRef1 = ref<AtengCaptchaInstance>();
const captchaRef2 = ref<AtengCaptchaInstance>();

const phone = ref<string>('13800138000');
const smsCode = ref<string>('');

const email = ref<string>('ateng@example.com');
const emailCode = ref<string>('');

// 图形验证码随机文本
const captchaChars = ref<string>('8W4K');

// 生成简单的 SVG 字符验证码
const generateSvgCaptcha = (text: string) => {
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40" style="background:%23f1f5f9;"><text x="20" y="28" font-size="22" font-family="sans-serif" font-weight="bold" fill="%234338ca" letter-spacing="4">${text}</text><line x1="5" y1="10" x2="115" y2="30" stroke="%23cbd5e1" stroke-width="2"/><line x1="10" y1="35" x2="110" y2="5" stroke="%2394a3b8" stroke-width="1.5"/></svg>`;
};

const currentImageSrc = ref<string>(generateSvgCaptcha(captchaChars.value));

// 刷新图形验证码
const handleRefreshImage = async () => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let next = '';
  for (let i = 0; i < 4; i++) {
    next += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  captchaChars.value = next;
  currentImageSrc.value = generateSvgCaptcha(next);
  ElMessage.info(`图形验证码已刷新为：${next}`);
};

// 手机号前置校验钩子
const checkPhoneBeforeSend = async (): Promise<boolean> => {
  if (!/^1[3-9]\d{9}$/.test(phone.value.trim())) {
    ElMessage.error('请输入正确的 11 位中国大陆手机号码');
    return false;
  }
  return true;
};

// 模拟发送短信请求
const mockSendSms = async (): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 800));
  ElMessage.success(`验证码已下发至手机 ${phone.value}，请注意查收`);
};

// 模拟发送邮件请求
const mockSendEmail = async (): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  ElMessage.success(`验证码已下发至邮箱 ${email.value}`);
};
</script>

<template>
  <div class="captcha-view">
    <ElCard shadow="never" class="demo-card">
      <template #header>
        <div class="card-header">
          <span class="title">AtengCaptcha 安全防刷新验证码与倒计时按钮</span>
          <span class="subtitle">
            支持短信/邮件倒计时状态机、LocalStorage
            物理到期时间戳防刷新清零、前置校验钩子与图形验证码
          </span>
        </div>
      </template>

      <div class="form-container">
        <!-- 场景 1：手机号短信登录场景 -->
        <h3 class="section-title">1. 短信验证码发送（持久化防刷新 + 前置校验）</h3>
        <ElForm label-width="120px" style="max-width: 520px">
          <ElFormItem label="手机号码：">
            <ElInput v-model="phone" placeholder="请输入手机号" clearable />
          </ElFormItem>

          <ElFormItem label="短信验证码：">
            <div class="input-with-btn">
              <ElInput v-model="smsCode" placeholder="6 位验证码" maxlength="6" />
              <AtengCaptcha
                ref="captchaRef1"
                storage-key="sample_login_sms_timer"
                :seconds="60"
                :before-send="checkPhoneBeforeSend"
                :send="mockSendSms"
              />
            </div>
            <div class="hint-text">
              💡 提示：点击发送后可尝试<b>刷新页面</b>，倒计时不会清零，依旧准确保持！
            </div>
          </ElFormItem>

          <ElFormItem>
            <ElButton size="small" @click="captchaRef1?.reset()"> 重置当前短信倒计时 </ElButton>
          </ElFormItem>
        </ElForm>

        <ElDivider />

        <!-- 场景 2：邮箱验证码场景 -->
        <h3 class="section-title">2. 邮箱验证码发送（自定义样式与文案）</h3>
        <ElForm label-width="120px" style="max-width: 520px">
          <ElFormItem label="电子邮箱：">
            <ElInput v-model="email" placeholder="请输入邮箱地址" clearable />
          </ElFormItem>

          <ElFormItem label="邮件验证码：">
            <div class="input-with-btn">
              <ElInput v-model="emailCode" placeholder="邮箱验证码" />
              <AtengCaptcha
                ref="captchaRef2"
                btn-type="success"
                :seconds="30"
                text="发送邮件验证"
                countdown-text="{s}秒重新发送"
                retry-text="重发邮件"
                :send="mockSendEmail"
              />
            </div>
          </ElFormItem>
        </ElForm>

        <ElDivider />

        <!-- 场景 3：图形验证码场景 -->
        <h3 class="section-title">3. 图形字符验证码（点击防重刷新）</h3>
        <ElForm label-width="120px" style="max-width: 520px">
          <ElFormItem label="图形验证码：">
            <div class="input-with-btn">
              <ElInput placeholder="输入右侧 4 位字符" maxlength="4" />
              <AtengCaptcha
                type="image"
                :image-src="currentImageSrc"
                image-width="120px"
                image-height="36px"
                :refresh="handleRefreshImage"
              />
            </div>
            <div class="hint-text">点击右侧图片即可无缝刷新验证码</div>
          </ElFormItem>
        </ElForm>
      </div>
    </ElCard>
  </div>
</template>

<style scoped lang="scss">
.captcha-view {
  padding: 20px;

  .demo-card {
    border-radius: 8px;
  }

  .card-header {
    display: flex;
    flex-direction: column;
    gap: 4px;

    .title {
      font-size: 18px;
      font-weight: 600;
      color: var(--el-text-color-primary);
    }

    .subtitle {
      font-size: 13px;
      color: var(--el-text-color-secondary);
    }
  }

  .section-title {
    font-size: 15px;
    font-weight: 600;
    margin: 16px 0 12px;
    color: var(--el-text-color-primary);
  }

  .input-with-btn {
    display: flex;
    gap: 10px;
    width: 100%;
  }

  .hint-text {
    margin-top: 6px;
    font-size: 12px;
    color: var(--el-color-info);
  }
}
</style>
