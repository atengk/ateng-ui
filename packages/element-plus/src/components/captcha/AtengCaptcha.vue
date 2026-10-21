<script setup lang="ts">
/**
 * AtengCaptcha 验证码与防刷新倒计时按钮组件。
 *
 * 支持短信/邮件倒计时状态机、LocalStorage 物理到期时间戳防刷新清零、
 * 前置异步校验钩子 beforeSend 与图形验证码刷新形态。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { ref, computed, onMounted, onUnmounted } from 'vue';
import { ElButton } from 'element-plus';
import type {
  AtengCaptchaProps,
  AtengCaptchaEmits,
  AtengCaptchaSlots,
  AtengCaptchaExpose,
} from './types';

defineOptions({
  name: 'AtengCaptcha',
});

const props = withDefaults(defineProps<AtengCaptchaProps>(), {
  type: 'button',
  seconds: 60,
  storageKey: undefined,
  storageType: 'local',
  text: '获取验证码',
  countdownText: '{s}s 重新获取',
  retryText: '重新获取',
  disabled: false,
  size: 'default',
  btnType: 'primary',
  beforeSend: undefined,
  send: undefined,
  imageSrc: '',
  imageWidth: '110px',
  imageHeight: '32px',
  refresh: undefined,
  customClass: '',
});

const emit = defineEmits<AtengCaptchaEmits>();
defineSlots<AtengCaptchaSlots>();

// 状态变量
const remainingSeconds = ref<number>(0);
const isLoading = ref<boolean>(false);
const hasSentOnce = ref<boolean>(false);
let timer: ReturnType<typeof setInterval> | null = null;

const isCounting = computed<boolean>(() => remainingSeconds.value > 0);

// 安全获取 storage 实例
function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return props.storageType === 'session' ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

// 恢复本地持久化到期时间戳
function restoreFromStorage(): void {
  if (!props.storageKey) return;
  const storage = getStorage();
  if (!storage) return;

  const raw = storage.getItem(props.storageKey);
  if (!raw) return;

  const expireTime = Number(raw);
  if (Number.isNaN(expireTime)) return;

  const diffMs = expireTime - Date.now();
  if (diffMs > 0) {
    const secs = Math.ceil(diffMs / 1000);
    startCountdown(secs, false);
  } else {
    storage.removeItem(props.storageKey);
  }
}

// 保存到期时间戳到 storage
function persistExpire(secs: number): void {
  if (!props.storageKey) return;
  const storage = getStorage();
  if (!storage) return;
  const expireTime = Date.now() + secs * 1000;
  storage.setItem(props.storageKey, String(expireTime));
}

// 清除 storage
function clearStorage(): void {
  if (!props.storageKey) return;
  const storage = getStorage();
  if (!storage) return;
  storage.removeItem(props.storageKey);
}

// 清除内部定时器
function stopTimer(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

// 启动内部倒计时
function startCountdown(totalSeconds: number, shouldPersist = true): void {
  stopTimer();
  remainingSeconds.value = totalSeconds;
  hasSentOnce.value = true;

  if (shouldPersist) {
    persistExpire(totalSeconds);
  }

  emit('start');

  timer = setInterval(() => {
    remainingSeconds.value -= 1;
    emit('change', remainingSeconds.value);

    if (remainingSeconds.value <= 0) {
      stopTimer();
      clearStorage();
      emit('end');
    }
  }, 1000);
}

// 触发发送与倒计时流程
async function start(): Promise<boolean> {
  if (isLoading.value || isCounting.value || props.disabled) {
    return false;
  }

  // 1. 前置异步校验拦截
  if (props.beforeSend) {
    try {
      const pass = await props.beforeSend();
      if (!pass) return false;
    } catch (err) {
      emit('error', err);
      return false;
    }
  }

  // 2. 异步发送动作与 Loading 互斥防重
  isLoading.value = true;
  try {
    if (props.send) {
      await props.send();
    }
    startCountdown(props.seconds, true);
    return true;
  } catch (err) {
    emit('error', err);
    return false;
  } finally {
    isLoading.value = false;
  }
}

// 重置状态
function reset(): void {
  stopTimer();
  remainingSeconds.value = 0;
  clearStorage();
}

// 按钮展示文本
const buttonLabel = computed<string>(() => {
  if (isCounting.value) {
    return props.countdownText.replace('{s}', String(remainingSeconds.value));
  }
  if (hasSentOnce.value) {
    return props.retryText;
  }
  return props.text;
});

// 图片验证码点击刷新
async function handleImageClick(): Promise<void> {
  if (props.disabled || isLoading.value) return;
  if (props.refresh) {
    isLoading.value = true;
    try {
      await props.refresh();
    } catch (err) {
      emit('error', err);
    } finally {
      isLoading.value = false;
    }
  }
}

onMounted(() => {
  restoreFromStorage();
});

onUnmounted(() => {
  stopTimer();
});

defineExpose<AtengCaptchaExpose>({
  start,
  reset,
  remainingSeconds: computed(() => remainingSeconds.value),
  isCounting,
  isLoading: computed(() => isLoading.value),
});
</script>

<template>
  <div :class="['at-captcha', `at-captcha--${type}`, customClass]">
    <!-- 按钮倒计时形态 -->
    <template v-if="type === 'button'">
      <slot
        :remaining="remainingSeconds"
        :is-counting="isCounting"
        :loading="isLoading"
        :start="start"
      >
        <ElButton
          :type="btnType"
          :size="size"
          :disabled="disabled || isCounting"
          :loading="isLoading"
          class="at-captcha__btn"
          @click="start"
        >
          {{ buttonLabel }}
        </ElButton>
      </slot>
    </template>

    <!-- 图形验证码形态 -->
    <template v-else-if="type === 'image'">
      <div
        class="at-captcha__image-box"
        :style="{
          width: typeof imageWidth === 'number' ? `${imageWidth}px` : imageWidth,
          height: typeof imageHeight === 'number' ? `${imageHeight}px` : imageHeight,
        }"
        :class="{ 'is-disabled': disabled, 'is-loading': isLoading }"
        @click="handleImageClick"
      >
        <slot v-if="isLoading" name="loading">
          <div class="at-captcha__loading-mask">
            <span>加载中...</span>
          </div>
        </slot>
        <img v-if="imageSrc" :src="imageSrc" alt="验证码" class="at-captcha__image" />
        <div v-else class="at-captcha__image-placeholder">
          <span>点击获取</span>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.at-captcha {
  display: inline-flex;
  vertical-align: middle;

  &__btn {
    min-width: 110px;
    user-select: none;
  }

  &__image-box {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    position: relative;
    border-radius: 4px;
    overflow: hidden;
    cursor: pointer;
    background: var(--el-fill-color-light);
    border: 1px solid var(--el-border-color-lighter);
    user-select: none;
    transition: all 0.2s ease;

    &:hover:not(.is-disabled) {
      border-color: var(--el-color-primary);
    }

    &.is-disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }
  }

  &__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  &__image-placeholder {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  &__loading-mask {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.7);
    font-size: 11px;
    color: var(--el-color-primary);
  }
}
</style>
