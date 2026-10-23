<script lang="ts">
/**
 * 模块级全局引用计数器与滚动状态备份，保障多卡片并发全屏与嵌套场景下 100% 确定性安全还原。
 */
let fullscreenLockCount = 0;
let originalBodyOverflow = '';

const lockBodyScroll = () => {
  if (typeof document === 'undefined') return;
  if (fullscreenLockCount === 0) {
    originalBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  fullscreenLockCount++;
};

const unlockBodyScroll = () => {
  if (typeof document === 'undefined') return;
  fullscreenLockCount = Math.max(0, fullscreenLockCount - 1);
  if (fullscreenLockCount === 0) {
    document.body.style.overflow = originalBodyOverflow;
    originalBodyOverflow = '';
  }
};

let autoKeySeed = 0;
</script>

<script setup lang="ts">
/**
 * 企业级结构化卡片面板组件。
 *
 * 核心特性：
 * 1. 结构化头部：标准化标题、副标题、图标、Tooltip 气泡与 Extra 操作区；
 * 2. 交互增强：支持一键平滑高度折叠展开与视口最大化全屏（ESC 退出）；
 * 3. 头部增强：支持局部刷新操作（带平滑 360 度旋转动画）与 #tabs 单行/次行沉降页签布局；
 * 4. 协同容器：无缝感知并接入 AtengCardGroup 手风琴总线，支持统一展开收起编排；
 * 5. 确定性事件解绑与防穿透：模块级引用计数管理 lockScroll 防穿透锁，组件销毁确定性清理。
 *
 * @author Ateng
 * @since 2026-10-22
 */

import { ref, computed, watch, inject, onBeforeUnmount, type StyleValue } from 'vue';
import { ElTooltip, ElIcon } from 'element-plus';
import { type AtengCardProps, type AtengCardEmits, ATENG_CARD_GROUP_INJECTION_KEY } from './types';

defineOptions({
  name: 'AtengCard',
});

const props = withDefaults(defineProps<AtengCardProps>(), {
  name: undefined,
  title: '',
  subTitle: '',
  icon: undefined,
  tooltip: '',
  bordered: true,
  shadow: 'never',
  headerDivider: true,
  collapsible: false,
  collapsed: undefined,
  fullscreenable: false,
  fullscreen: undefined,
  lockScroll: true,
  escExit: true,
  loading: false,
  showRefresh: false,
  refreshTooltip: '刷新',
  tabsPosition: 'top',
  bodyPadding: '16px',
  bodyClass: '',
  bodyStyle: undefined,
});

const emit = defineEmits<AtengCardEmits>();

const cardRef = ref<HTMLElement | null>(null);

// 1. Group 容器上下文注入与卡片标识确定
const groupContext = inject(ATENG_CARD_GROUP_INJECTION_KEY, null);
const internalKey = props.name !== undefined ? props.name : `at_card_key_${++autoKeySeed}`;

// 2. 折叠状态机与父子容器联动
const internalCollapsed = ref(false);

const isCollapsed = computed(() => {
  if (props.collapsed !== undefined) {
    return props.collapsed;
  }
  if (groupContext) {
    return !groupContext.isCardExpanded(internalKey);
  }
  return internalCollapsed.value;
});

const toggleCollapse = (force?: boolean) => {
  const next = force !== undefined ? force : !isCollapsed.value;
  if (groupContext) {
    // 通知外部 Group 总线切换展开状态（展开传 true，折叠传 false）
    groupContext.toggleCard(internalKey, !next);
  } else {
    internalCollapsed.value = next;
    emit('update:collapsed', next);
    emit('collapse', next);
  }
};

watch(
  () => props.collapsed,
  val => {
    if (val !== undefined) {
      internalCollapsed.value = val;
    }
  },
  { immediate: true },
);

// 注册卡片到 Group 总线（确定性注销）
if (groupContext) {
  const unregister = groupContext.registerCard(internalKey, (collapsedVal: boolean) => {
    internalCollapsed.value = collapsedVal;
    emit('update:collapsed', collapsedVal);
    emit('collapse', collapsedVal);
  });

  onBeforeUnmount(() => {
    unregister();
  });
}

// 3. 局部刷新操作与旋转动效
const isSpinning = ref(false);

const handleRefreshClick = () => {
  isSpinning.value = true;
  emit('refresh');
  setTimeout(() => {
    isSpinning.value = false;
  }, 600);
};

// 4. 全屏状态机、防穿透锁与 ESC 监听
const internalFullscreen = ref(false);
let hasAcquiredScrollLock = false;

const isFullscreen = computed(() => {
  return props.fullscreen !== undefined ? props.fullscreen : internalFullscreen.value;
});

const applyScrollLock = (shouldLock: boolean) => {
  if (shouldLock) {
    if (!hasAcquiredScrollLock && props.lockScroll) {
      lockBodyScroll();
      hasAcquiredScrollLock = true;
    }
  } else {
    if (hasAcquiredScrollLock) {
      unlockBodyScroll();
      hasAcquiredScrollLock = false;
    }
  }
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (!props.escExit) return;
  if (e.defaultPrevented) return;
  if (e.key === 'Escape' && isFullscreen.value) {
    toggleFullscreen(false);
  }
};

const handleFullscreenEffect = (active: boolean) => {
  if (typeof window === 'undefined') return;
  if (active) {
    window.addEventListener('keydown', handleKeyDown);
    applyScrollLock(true);
  } else {
    window.removeEventListener('keydown', handleKeyDown);
    applyScrollLock(false);
  }
};

const toggleFullscreen = (force?: boolean) => {
  const next = force !== undefined ? force : !isFullscreen.value;
  internalFullscreen.value = next;
  handleFullscreenEffect(next);
  emit('update:fullscreen', next);
  emit('fullscreen', next);
};

watch(
  () => props.fullscreen,
  val => {
    if (val !== undefined) {
      internalFullscreen.value = val;
      handleFullscreenEffect(val);
    }
  },
  { immediate: true },
);

watch(
  () => props.lockScroll,
  val => {
    if (isFullscreen.value) {
      applyScrollLock(val);
    }
  },
);

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleKeyDown);
  }
  applyScrollLock(false);
});

// 5. 计算样式
const normalizedBodyPadding = computed(() => {
  if (typeof props.bodyPadding === 'number') {
    return `${props.bodyPadding}px`;
  }
  return props.bodyPadding;
});

defineExpose({
  cardRef,
  toggleCollapse,
  toggleFullscreen,
});
</script>

<template>
  <div
    ref="cardRef"
    class="at-card"
    :class="[
      `is-shadow-${shadow}`,
      {
        'is-bordered': bordered,
        'is-collapsed': isCollapsed,
        'is-fullscreen': isFullscreen,
        'is-loading': loading,
      },
    ]"
  >
    <!-- 卡片头部 -->
    <header
      v-if="
        title ||
        $slots.title ||
        $slots.header ||
        collapsible ||
        fullscreenable ||
        showRefresh ||
        $slots.extra ||
        $slots.tabs
      "
      class="at-card__header"
      :class="[{ 'has-divider': headerDivider && !isCollapsed }, `tabs-pos-${tabsPosition}`]"
    >
      <slot name="header">
        <div class="at-card__header-main">
          <div class="at-card__header-left">
            <!-- 标题图标 -->
            <el-icon v-if="icon" class="at-card__icon">
              <component :is="icon" />
            </el-icon>

            <!-- 主标题 -->
            <span class="at-card__title">
              <slot name="title">{{ title }}</slot>
            </span>

            <!-- 问号提示 -->
            <el-tooltip v-if="tooltip" :content="tooltip" placement="top">
              <span class="at-card__tooltip-icon">
                <svg viewBox="0 0 1024 1024" width="14" height="14" fill="currentColor">
                  <path
                    d="M512 64a448 448 0 1 1 0 896 448 448 0 0 1 0-896zm0 820a372 372 0 1 0 0-744 372 372 0 0 0 0 744zm-.64-210.56a42.24 42.24 0 1 0 0 84.48 42.24 42.24 0 0 0 0-84.48zm22.4-386.56c80 0 137.6 48 137.6 122.24 0 53.76-32.64 96-85.76 126.72l-14.72 8.32c-23.68 14.08-36.48 30.08-37.12 59.52v9.6a38.4 38.4 0 0 1-76.8 0v-10.88c0-44.16 20.48-73.6 57.6-96l16-9.6c40.32-23.04 64-49.28 64-87.68 0-38.4-30.72-64.64-74.88-64.64-44.16 0-76.8 28.16-79.36 69.12a38.4 38.4 0 0 1-76.16-7.04c5.76-78.72 73.6-139.52 169.6-139.52z"
                  />
                </svg>
              </span>
            </el-tooltip>

            <!-- 副标题 -->
            <span v-if="subTitle" class="at-card__sub-title">{{ subTitle }}</span>
          </div>

          <!-- 单行紧凑模式 tabs (tabsPosition === 'top') -->
          <div v-if="$slots.tabs && tabsPosition === 'top'" class="at-card__header-tabs is-top">
            <slot name="tabs" />
          </div>

          <div class="at-card__header-right">
            <!-- 额外操作区插槽 -->
            <div v-if="$slots.extra" class="at-card__extra">
              <slot name="extra" />
            </div>

            <!-- 局部刷新按钮 -->
            <button
              v-if="showRefresh"
              type="button"
              class="at-card__action-btn at-card__refresh-btn"
              :class="{ 'is-refreshing': isSpinning || loading }"
              :title="refreshTooltip || '刷新'"
              @click="handleRefreshClick"
            >
              <svg
                viewBox="0 0 1024 1024"
                width="14"
                height="14"
                fill="currentColor"
                class="at-card__refresh-icon"
              >
                <path
                  d="M784.64 576c-18.56 142.08-139.52 256-288.64 256-159.36 0-288-128.64-288-288s128.64-288 288-288c80 0 152.32 32.64 204.16 85.12l-92.8 92.8H896V144l-89.6 89.6C731.52 158.72 626.56 112 496 112 284.16 112 112 284.16 112 496s172.16 384 384 384c194.56 0 355.2-144.64 380.16-332.8h-91.52z"
                />
              </svg>
            </button>

            <!-- 全屏切换按钮 -->
            <button
              v-if="fullscreenable"
              type="button"
              class="at-card__action-btn"
              :title="isFullscreen ? '还原 (ESC)' : '全屏最大化'"
              @click="toggleFullscreen()"
            >
              <!-- 全屏图标 -->
              <svg
                v-if="!isFullscreen"
                viewBox="0 0 1024 1024"
                width="14"
                height="14"
                fill="currentColor"
              >
                <path
                  d="M160 352V160h192v64H224v128h-64zm0 320v192h192v-64H224V672h-64zm704-320V160H672v64h128v128h64zm0 320v192H672v-64h128V672h64z"
                />
              </svg>
              <!-- 还原图标 -->
              <svg v-else viewBox="0 0 1024 1024" width="14" height="14" fill="currentColor">
                <path
                  d="M384 192v192H192v-64h128V192h64zm0 640V640H192v64h128v128h64zm256-640v128h128v64H640V192h-64zm0 640v-128h128v-64H640v192h-64z"
                />
              </svg>
            </button>

            <!-- 折叠展开按钮 -->
            <button
              v-if="collapsible"
              type="button"
              class="at-card__action-btn"
              :title="isCollapsed ? '展开面板' : '折叠收起'"
              @click="toggleCollapse()"
            >
              <svg
                viewBox="0 0 1024 1024"
                width="14"
                height="14"
                fill="currentColor"
                class="at-card__fold-icon"
                :class="{ 'is-collapsed': isCollapsed }"
              >
                <path
                  d="M836.3 384.4a32 32 0 0 1 0 45.3l-288 288a32 32 0 0 1-45.3 0l-288-288a32 32 0 1 1 45.3-45.3L512 626.8l279-242.4a32 32 0 0 1 45.3 0z"
                />
              </svg>
            </button>
          </div>
        </div>

        <!-- 次行沉降模式 tabs (tabsPosition === 'bottom') -->
        <div v-if="$slots.tabs && tabsPosition === 'bottom'" class="at-card__header-tabs is-bottom">
          <slot name="tabs" />
        </div>
      </slot>
    </header>

    <!-- 卡片主体内容 -->
    <div
      v-show="!isCollapsed"
      class="at-card__body"
      :class="bodyClass"
      :style="[{ padding: normalizedBodyPadding }, bodyStyle as StyleValue]"
    >
      <slot />
    </div>

    <!-- 底部区域 -->
    <footer v-if="$slots.footer && !isCollapsed" class="at-card__footer">
      <slot name="footer" />
    </footer>

    <!-- Loading 加载遮罩 -->
    <div v-if="loading" class="at-card__loading-mask">
      <div class="at-card__spinner" />
    </div>
  </div>
</template>

<style scoped>
.at-card {
  position: relative;
  box-sizing: border-box;
  background-color: var(--el-bg-color);
  color: var(--el-text-color-primary);
  border-radius: var(--el-border-radius-base);
  transition:
    background-color 0.25s,
    box-shadow 0.25s,
    border-color 0.25s;
}

.at-card.is-bordered {
  border: 1px solid var(--el-border-color-lighter);
}

.at-card.is-shadow-always {
  box-shadow: var(--el-box-shadow-light);
}

.at-card.is-shadow-hover:hover {
  box-shadow: var(--el-box-shadow-light);
}

/* 全屏状态 */
.at-card.is-fullscreen {
  position: fixed !important;
  inset: 0 !important;
  z-index: 2000 !important;
  width: 100vw !important;
  height: 100vh !important;
  margin: 0 !important;
  border-radius: 0 !important;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.at-card.is-fullscreen .at-card__body {
  flex: 1 1 auto;
  overflow: auto;
}

/* 头部样式 */
.at-card__header {
  display: flex;
  flex-direction: column;
  padding: 14px 18px;
  box-sizing: border-box;
}

.at-card__header.tabs-pos-bottom {
  padding-bottom: 0;
}

.at-card__header.has-divider {
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.at-card__header-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 12px;
}

.at-card__header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.at-card__icon {
  font-size: 16px;
  color: var(--el-color-primary);
}

.at-card__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  line-height: 24px;
}

.at-card__sub-title {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 20px;
}

.at-card__tooltip-icon {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  color: var(--el-text-color-placeholder);
  transition: color 0.2s;
}

.at-card__tooltip-icon:hover {
  color: var(--el-color-primary);
}

.at-card__header-tabs.is-top {
  display: flex;
  align-items: center;
  flex: 1 1 auto;
  margin: 0 12px;
  min-width: 0;
}

.at-card__header-tabs.is-bottom {
  width: 100%;
  margin-top: 10px;
}

.at-card__header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.at-card__extra {
  display: flex;
  align-items: center;
  gap: 8px;
}

.at-card__action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--el-text-color-regular);
  cursor: pointer;
  border-radius: 4px;
  transition:
    color 0.2s,
    background-color 0.2s;
  padding: 0;
}

.at-card__action-btn:hover {
  color: var(--el-color-primary);
  background-color: var(--el-fill-color-light);
}

.at-card__refresh-icon {
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.at-card__refresh-btn.is-refreshing .at-card__refresh-icon {
  animation: at-card-spin 0.6s linear infinite;
}

.at-card__fold-icon {
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.at-card__fold-icon.is-collapsed {
  transform: rotate(-90deg);
}

/* 主体与底部 */
.at-card__body {
  box-sizing: border-box;
}

.at-card__footer {
  padding: 12px 18px;
  border-top: 1px solid var(--el-border-color-lighter);
  box-sizing: border-box;
}

/* 加载遮罩 */
.at-card__loading-mask {
  position: absolute;
  inset: 0;
  background-color: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: inherit;
  z-index: 10;
}

.at-card__spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--el-border-color-lighter);
  border-top-color: var(--el-color-primary);
  border-radius: 50%;
  animation: at-card-spin 0.8s linear infinite;
}

@keyframes at-card-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
