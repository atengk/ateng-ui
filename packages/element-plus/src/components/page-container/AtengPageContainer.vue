<script lang="ts">
/**
 * 模块级全局引用计数器与滚动状态备份，保障多页面容器并发全屏或卡片并发全屏下 100% 确定性安全还原。
 */
let pageContainerLockCount = 0;
let originalBodyOverflow = '';

const lockBodyScroll = () => {
  if (typeof document === 'undefined') return;
  if (pageContainerLockCount === 0) {
    originalBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  pageContainerLockCount++;
};

const unlockBodyScroll = () => {
  if (typeof document === 'undefined') return;
  pageContainerLockCount = Math.max(0, pageContainerLockCount - 1);
  if (pageContainerLockCount === 0) {
    document.body.style.overflow = originalBodyOverflow;
    originalBodyOverflow = '';
  }
};
</script>

<script setup lang="ts">
/**
 * 企业级标准页面容器组件。
 *
 * 核心特性：
 * 1. 结构化页头：支持面包屑、返回键、主副标题、状态 Tag、右上角 Extra 操作区及 Tabs 页签；
 * 2. 视口脱壳全屏：支持 <Teleport to="body"> 全屏瞬移至全局顶层，彻底绕过祖先 transform 包含块样式限制；
 * 3. 沉浸式滚动折叠：支持 collapseHeaderOnScroll，向下滚动自动平滑收起页头，回滚平滑复原；
 * 4. 防穿透锁与 ESC 退出：模块级引用计数 lockScroll，支持 escExit 快捷键退出；
 * 5. 双模滚动治理：支持自然整页流动与 fitViewport 视口 100% 撑满局部滚动双模。
 *
 * @author Ateng
 * @since 2026-10-22
 */

import { ref, computed, watch, getCurrentInstance, onMounted, onBeforeUnmount, provide } from 'vue';
import {
  ElBreadcrumb,
  ElBreadcrumbItem,
  ElButton,
  ElDropdown,
  ElDropdownMenu,
  ElDropdownItem,
} from 'element-plus';
import AtengWatermark from '../watermark/AtengWatermark.vue';
import type { AtengWatermarkProps } from '../watermark/types';
import {
  PAGE_CONTAINER_INJECTION_KEY,
  type AtengPageContainerProps,
  type AtengPageContainerEmits,
  type AtengPageContainerSlots,
  type AtengPageBreadcrumbItem,
  type AtengPageActionItem,
} from './types';

defineOptions({
  name: 'AtengPageContainer',
});

defineSlots<AtengPageContainerSlots>();

const props = withDefaults(defineProps<AtengPageContainerProps>(), {
  title: '',
  subTitle: '',
  breadcrumb: undefined,
  showBack: false,
  fixedHeader: false,
  headerBlur: false,
  autoBreadcrumb: false,
  breadcrumbTitleKey: 'meta.title',
  breadcrumbResolver: undefined,
  ghost: false,
  fitViewport: false,
  contentPadding: '16px',
  headerBackground: '',
  contentBackground: '',
  fullscreen: undefined,
  showFullscreen: false,
  lockScroll: true,
  escExit: true,
  collapseHeaderOnScroll: false,
  headerVisible: true,
  watermark: undefined,
  extraActions: () => [],
  maxVisibleActions: 3,
});

const emit = defineEmits<AtengPageContainerEmits>();

// 0. 操作流动作切分与水印配置
const visibleActions = computed(() => {
  if (!props.extraActions || props.extraActions.length === 0) return [];
  return props.extraActions.slice(0, props.maxVisibleActions);
});

const overflowActions = computed(() => {
  if (!props.extraActions || props.extraActions.length === 0) return [];
  return props.extraActions.slice(props.maxVisibleActions);
});

const handleActionClick = (action: AtengPageActionItem, e?: MouseEvent) => {
  if (action.disabled || action.loading) return;
  emit('action-click', action);
  if (action.onClick) {
    action.onClick(e);
  }
};

const resolvedWatermarkProps = computed<AtengWatermarkProps | null>(() => {
  if (!props.watermark) return null;
  if (typeof props.watermark === 'string') {
    return { content: props.watermark };
  }
  return props.watermark;
});

// 1. 节点引用
const containerRef = ref<HTMLElement | null>(null);
const headerRef = ref<HTMLElement | null>(null);
const contentRef = ref<HTMLElement | null>(null);
const isElevated = ref(false);

// 2. 视口脱壳全屏状态机
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

// 3. 沉浸式滚动折叠页头与滚动感知
const isHeaderCollapsed = ref(false);
let lastScrollTop = 0;

const checkScrollCollapse = (currentTop: number) => {
  if (!props.collapseHeaderOnScroll) return;

  const delta = currentTop - lastScrollTop;
  if (Math.abs(delta) < 6) return;

  const headerHeight = headerRef.value?.offsetHeight || 60;

  if (delta > 0 && currentTop > headerHeight) {
    if (!isHeaderCollapsed.value) {
      isHeaderCollapsed.value = true;
      emit('header-collapse', true);
    }
  } else if (delta < 0 || currentTop <= 10) {
    if (isHeaderCollapsed.value) {
      isHeaderCollapsed.value = false;
      emit('header-collapse', false);
    }
  }

  lastScrollTop = Math.max(0, currentTop);
};

const handleScroll = (e?: Event) => {
  const target = (e?.target as HTMLElement) || contentRef.value;
  const top = target?.scrollTop ?? 0;
  isElevated.value = top > 0;
  checkScrollCollapse(top);
};

const handleWindowScroll = () => {
  if (!props.fitViewport && !isFullscreen.value) {
    const top = window.scrollY || document.documentElement.scrollTop || 0;
    isElevated.value = top > 0;
    checkScrollCollapse(top);
  }
};

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('scroll', handleWindowScroll, { passive: true });
  }
});

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('scroll', handleWindowScroll);
    window.removeEventListener('keydown', handleKeyDown);
  }
  applyScrollLock(false);
});

// 4. 路由面包屑自动提取
const instance = getCurrentInstance();

const getDeepValue = (obj: unknown, path: string): unknown => {
  if (!obj || typeof obj !== 'object') return undefined;
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current && typeof current === 'object' && key in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return current;
};

const computedBreadcrumbs = computed<AtengPageBreadcrumbItem[]>(() => {
  if (props.breadcrumb && props.breadcrumb.length > 0) {
    return props.breadcrumb;
  }

  if (!props.autoBreadcrumb) {
    return [];
  }

  const gp = instance?.appContext?.config?.globalProperties as Record<string, unknown> | undefined;
  const proxy = instance?.proxy as Record<string, unknown> | undefined;
  const route = (gp?.$route || proxy?.$route) as
    | {
        matched?: Array<{
          path?: string;
          meta?: Record<string, unknown>;
          [key: string]: unknown;
        }>;
      }
    | undefined;

  if (route?.matched && route.matched.length > 0) {
    const matched = route.matched;

    if (props.breadcrumbResolver) {
      return props.breadcrumbResolver(matched);
    }

    const titleKey = props.breadcrumbTitleKey || 'meta.title';
    const result: AtengPageBreadcrumbItem[] = [];

    for (let i = 0; i < matched.length; i++) {
      const item = matched[i];
      const title = getDeepValue(item, titleKey);
      if (typeof title === 'string' && title.trim()) {
        result.push({
          label: title.trim(),
          path: item.path,
        });
      }
    }

    if (result.length > 0) {
      const lastIndex = result.length - 1;
      result[lastIndex] = {
        label: result[lastIndex].label,
      };
    }

    return result;
  }

  return [];
});

// 5. 样式与对外暴露
const normalizedPadding = computed(() => {
  if (typeof props.contentPadding === 'number') {
    return `${props.contentPadding}px`;
  }
  return props.contentPadding;
});

// 6. 容器上下文总线 (Container Context Bus) 依赖注入
const footerHeights = ref<Map<symbol, number>>(new Map());

const totalFooterHeight = computed(() => {
  let maxHeight = 0;
  for (const h of footerHeights.value.values()) {
    if (h > maxHeight) {
      maxHeight = h;
    }
  }
  return maxHeight;
});

const registerFooter = (height: number) => {
  const key = Symbol('footer');
  const updateMap = new Map(footerHeights.value);
  updateMap.set(key, height);
  footerHeights.value = updateMap;

  return () => {
    const nextMap = new Map(footerHeights.value);
    nextMap.delete(key);
    footerHeights.value = nextMap;
  };
};

provide(PAGE_CONTAINER_INJECTION_KEY, {
  fitViewport: computed(() => props.fitViewport || isFullscreen.value),
  contentRef,
  registerFooter,
  getScrollContainer: () => contentRef.value,
});

const scrollTo = (options?: { left?: number; top?: number; behavior?: 'auto' | 'smooth' }) => {
  if (contentRef.value && options) {
    contentRef.value.scrollTo(options);
  }
};

const handleBack = () => {
  emit('back');
};

defineExpose({
  containerRef,
  headerRef,
  contentRef,
  scrollTo,
  toggleFullscreen,
  isFullscreen,
  isHeaderCollapsed,
});
</script>

<template>
  <div
    class="at-page-container"
    :class="{
      'is-fit-viewport': fitViewport,
      'is-ghost': ghost,
      'is-fullscreen': isFullscreen,
    }"
  >
    <Teleport to="body" :disabled="!isFullscreen">
      <div
        ref="containerRef"
        class="at-page-container__inner"
        :class="{
          'is-fit-viewport': fitViewport || isFullscreen,
          'is-ghost': ghost && !isFullscreen,
          'is-fullscreen': isFullscreen,
        }"
      >
        <!-- 页头区域 -->
        <header
          v-if="headerVisible"
          ref="headerRef"
          class="at-page-container__header"
          :class="{
            'is-fixed': fixedHeader,
            'has-blur': headerBlur,
            'is-elevated': isElevated,
            'is-scroll-collapsed': isHeaderCollapsed,
          }"
          :style="{ backgroundColor: headerBackground || undefined }"
        >
          <slot name="header">
            <!-- 顶部面包屑 -->
            <div
              v-if="$slots.breadcrumb || (computedBreadcrumbs && computedBreadcrumbs.length > 0)"
              class="at-page-container__breadcrumb"
            >
              <slot name="breadcrumb">
                <el-breadcrumb separator="/">
                  <el-breadcrumb-item
                    v-for="(item, index) in computedBreadcrumbs"
                    :key="index"
                    :to="item.to || item.path"
                  >
                    {{ item.label }}
                  </el-breadcrumb-item>
                </el-breadcrumb>
              </slot>
            </div>

            <!-- 页头主行：返回键、标题、副标题、Tags、Extra 操作区 -->
            <div class="at-page-container__main-row">
              <div class="at-page-container__title-area">
                <!-- 返回按钮 -->
                <div
                  v-if="showBack || $slots.back"
                  class="at-page-container__back-btn"
                  title="返回上一页"
                  @click="handleBack"
                >
                  <slot name="back">
                    <svg viewBox="0 0 1024 1024" width="18" height="18" fill="currentColor">
                      <path
                        d="M603.7 836.3a32 32 0 0 1-22.6-9.4l-288-288a32 32 0 0 1 0-45.3l288-288a32 32 0 1 1 45.3 45.3L360.6 512l265.8 261.4a32 32 0 0 1-22.7 62.9z"
                      />
                    </svg>
                  </slot>
                </div>

                <!-- 主标题 -->
                <div class="at-page-container__title">
                  <slot name="title">{{ title }}</slot>
                </div>

                <!-- 副标题 -->
                <div v-if="subTitle || $slots.subTitle" class="at-page-container__sub-title">
                  <slot name="subTitle">{{ subTitle }}</slot>
                </div>

                <!-- 状态标签插槽 -->
                <div v-if="$slots.tags" class="at-page-container__tags">
                  <slot name="tags" />
                </div>
              </div>

              <!-- 右侧操作区与全屏切换按钮 -->
              <div class="at-page-container__extra-wrapper">
                <div v-if="$slots.extra" class="at-page-container__extra">
                  <slot name="extra" />
                </div>

                <!-- 声明式操作流动作 -->
                <div
                  v-if="extraActions && extraActions.length > 0"
                  class="at-page-container__extra-actions"
                >
                  <el-button
                    v-for="action in visibleActions"
                    :key="action.key || action.label"
                    :type="action.type || 'default'"
                    :plain="action.plain"
                    :disabled="action.disabled"
                    :loading="action.loading"
                    :icon="action.icon"
                    size="default"
                    @click="handleActionClick(action, $event)"
                  >
                    {{ action.label }}
                  </el-button>

                  <!-- 超出折叠下拉菜单 -->
                  <el-dropdown
                    v-if="overflowActions.length > 0"
                    trigger="click"
                    class="at-page-container__actions-dropdown"
                  >
                    <el-button class="at-page-container__dropdown-trigger" size="default">
                      <span>更多</span>
                      <svg
                        viewBox="0 0 1024 1024"
                        width="12"
                        height="12"
                        fill="currentColor"
                        style="margin-left: 4px"
                      >
                        <path
                          d="M831.872 340.777L512 652.615 192.128 340.777a32 32 0 0 0-45.248 45.248l342.613 334.336a32 32 0 0 0 45.014 0l342.613-334.336a32 32 0 0 0-45.248-45.248z"
                        />
                      </svg>
                    </el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item
                          v-for="action in overflowActions"
                          :key="action.key || action.label"
                          :disabled="action.disabled"
                          :divided="action.divided"
                          :icon="action.icon"
                          @click="handleActionClick(action, $event)"
                        >
                          {{ action.label }}
                        </el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </div>

                <!-- 全屏脱壳切换按钮 -->
                <button
                  v-if="showFullscreen"
                  type="button"
                  class="at-page-container__action-btn at-page-container__fullscreen-btn"
                  :title="isFullscreen ? '退出全屏 (ESC)' : '视口脱壳全屏'"
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
              </div>
            </div>

            <!-- 底部页签区 -->
            <div v-if="$slots.tabs" class="at-page-container__tabs">
              <slot name="tabs" />
            </div>
          </slot>
        </header>

        <!-- 主体内容区 -->
        <main
          ref="contentRef"
          class="at-page-container__content"
          :style="{
            padding: ghost && !isFullscreen ? undefined : normalizedPadding,
            paddingBottom:
              totalFooterHeight > 0
                ? `${(parseFloat(String(normalizedPadding)) || 0) + totalFooterHeight}px`
                : undefined,
            backgroundColor: contentBackground || undefined,
          }"
          @scroll="handleScroll"
        >
          <AtengWatermark
            v-if="resolvedWatermarkProps"
            v-bind="resolvedWatermarkProps"
            class="at-page-container__watermark"
          >
            <div v-if="!ghost || isFullscreen" class="at-page-container__card">
              <slot />
            </div>
            <template v-else>
              <slot />
            </template>
          </AtengWatermark>
          <template v-else>
            <div v-if="!ghost || isFullscreen" class="at-page-container__card">
              <slot />
            </div>
            <template v-else>
              <slot />
            </template>
          </template>
        </main>

        <!-- 底部固定/悬浮插槽 -->
        <div v-if="$slots.footer" class="at-page-container__footer">
          <slot name="footer" />
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.at-page-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  box-sizing: border-box;
}

.at-page-container.is-fit-viewport {
  height: 100%;
  overflow: hidden;
}

.at-page-container__inner {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 100%;
  box-sizing: border-box;
  background-color: var(--el-bg-color-page);
  color: var(--el-text-color-primary);
}

.at-page-container__inner.is-fit-viewport {
  height: 100%;
  overflow: hidden;
}

/* 视口脱壳全屏状态 */
.at-page-container__inner.is-fullscreen {
  position: fixed !important;
  inset: 0 !important;
  z-index: 2000 !important;
  width: 100vw !important;
  height: 100vh !important;
  margin: 0 !important;
  border-radius: 0 !important;
  overflow: hidden !important;
}

/* 页头样式 */
.at-page-container__header {
  padding: 16px 24px;
  background-color: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-lighter);
  box-sizing: border-box;
  transition:
    background-color 0.25s,
    border-color 0.25s,
    transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    padding 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.25s;
}

.at-page-container__header.is-fixed {
  position: sticky;
  top: 0;
  z-index: 99;
}

.at-page-container__header.has-blur {
  background-color: var(--el-bg-color-overlay, rgba(255, 255, 255, 0.98));
  border-bottom: 1px solid var(--el-border-color-light);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

:global(.dark) .at-page-container__header.has-blur {
  background-color: var(--el-bg-color-overlay, rgba(20, 20, 20, 0.98));
  border-bottom: 1px solid var(--el-border-color-darker);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.35);
}

.at-page-container__header.is-elevated {
  box-shadow: var(--el-box-shadow-light);
  z-index: 10;
}

/* 沉浸式滚动折叠页头 */
.at-page-container__header.is-scroll-collapsed {
  transform: translateY(-100%);
  opacity: 0;
  pointer-events: none;
  max-height: 0 !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  overflow: hidden !important;
  border-bottom: none !important;
}

.at-page-container__breadcrumb {
  margin-bottom: 12px;
}

.at-page-container__main-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.at-page-container__title-area {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.at-page-container__back-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--el-text-color-regular);
  padding: 4px;
  border-radius: var(--el-border-radius-base);
  transition:
    color 0.2s,
    background-color 0.2s;
}

.at-page-container__back-btn:hover {
  color: var(--el-color-primary);
  background-color: var(--el-fill-color-light);
}

.at-page-container__title {
  font-size: 20px;
  font-weight: 600;
  line-height: 28px;
  color: var(--el-text-color-primary);
}

.at-page-container__sub-title {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  line-height: 22px;
}

.at-page-container__tags {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.at-page-container__extra-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
}

.at-page-container__extra {
  display: flex;
  align-items: center;
  gap: 12px;
}

.at-page-container__action-btn {
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

.at-page-container__action-btn:hover {
  color: var(--el-color-primary);
  background-color: var(--el-fill-color-light);
}

.at-page-container__tabs {
  margin-top: 16px;
  margin-bottom: -16px;
}

/* 主体内容样式 */
.at-page-container__content {
  box-sizing: border-box;
  flex: 1 1 auto;
}

.at-page-container.is-fit-viewport .at-page-container__content,
.at-page-container__inner.is-fit-viewport .at-page-container__content {
  min-height: 0;
  overflow: auto;
}

.at-page-container__card {
  background-color: var(--el-bg-color);
  border-radius: var(--el-border-radius-base);
  border: 1px solid var(--el-border-color-lighter);
  padding: 20px;
  box-sizing: border-box;
  min-height: 100%;
}

.at-page-container.is-fit-viewport .at-page-container__card,
.at-page-container__inner.is-fit-viewport .at-page-container__card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.at-page-container__footer {
  flex-shrink: 0;
}

.at-page-container__extra-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.at-page-container__dropdown-trigger {
  display: inline-flex;
  align-items: center;
}

.at-page-container__watermark {
  min-height: 100%;
}
</style>
