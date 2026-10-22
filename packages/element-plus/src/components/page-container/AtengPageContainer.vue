<script setup lang="ts">
/**
 * 企业级标准页面容器组件。
 *
 * 核心特性：
 * 1. 结构化页头：支持面包屑、返回键、主副标题、状态 Tag、右上角 Extra 操作区及 Tabs 页签；
 * 2. 双模滚动治理：支持自然整页流动与 fitViewport 视口 100% 撑满局部滚动双模；
 * 3. 沉浸式风格：支持 ghost 模式（透明无背景）与默认白底卡片容器包裹；
 * 4. 样式隔离与设计令牌：100% 对齐 Element Plus CSS 变量与 at- 命名空间。
 *
 * @author Ateng
 * @since 2026-10-22
 */

import { ref, computed, getCurrentInstance, onMounted, onBeforeUnmount } from 'vue';
import { ElBreadcrumb, ElBreadcrumbItem } from 'element-plus';
import type {
  AtengPageContainerProps,
  AtengPageContainerEmits,
  AtengPageBreadcrumbItem,
} from './types';

defineOptions({
  name: 'AtengPageContainer',
});

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
});

const emit = defineEmits<AtengPageContainerEmits>();

// 1. 节点引用与滚动暴露
const headerRef = ref<HTMLElement | null>(null);
const contentRef = ref<HTMLElement | null>(null);
const isElevated = ref(false);

const scrollTo = (options?: { left?: number; top?: number; behavior?: 'auto' | 'smooth' }) => {
  if (contentRef.value && options) {
    contentRef.value.scrollTo(options);
  }
};

defineExpose({
  headerRef,
  contentRef,
  scrollTo,
});

// 2. 滚动感知处理（局部容器滚动 + 窗口滚动）
const handleScroll = (e?: Event) => {
  const target = (e?.target as HTMLElement) || contentRef.value;
  const top = target?.scrollTop ?? 0;
  isElevated.value = top > 0;
};

const handleWindowScroll = () => {
  if (!props.fitViewport) {
    const top = window.scrollY || document.documentElement.scrollTop || 0;
    isElevated.value = top > 0;
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
  }
});

// 3. 安全弱感应路由与面包屑自动推导
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
  // 1. 若显式声明了 breadcrumb，优先级最高
  if (props.breadcrumb && props.breadcrumb.length > 0) {
    return props.breadcrumb;
  }

  // 2. 若未开启 autoBreadcrumb，直接保底返回空数组，杜绝探测 $route 产生冗余警告
  if (!props.autoBreadcrumb) {
    return [];
  }

  // 3. 开启了 autoBreadcrumb，且有路由 matched 列表
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

    // 2.1 若提供了自定义 resolver 逃生舱，直接交由外部接管
    if (props.breadcrumbResolver) {
      return props.breadcrumbResolver(matched);
    }

    // 2.2 默认提取逻辑：过滤掉没有有效 title 的路由层级
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

    // 最后一项作为当前激活页面，默认不配置跳转链接
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

// 4. 计算内边距样式
const normalizedPadding = computed(() => {
  if (typeof props.contentPadding === 'number') {
    return `${props.contentPadding}px`;
  }
  return props.contentPadding;
});

// 5. 返回上一页处理
const handleBack = () => {
  emit('back');
};
</script>

<template>
  <div
    class="at-page-container"
    :class="{
      'is-fit-viewport': fitViewport,
      'is-ghost': ghost,
    }"
  >
    <!-- 页头区域 -->
    <header
      ref="headerRef"
      class="at-page-container__header"
      :class="{
        'is-fixed': fixedHeader,
        'has-blur': headerBlur,
        'is-elevated': isElevated,
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

          <!-- 右侧操作区 -->
          <div v-if="$slots.extra" class="at-page-container__extra">
            <slot name="extra" />
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
        padding: ghost ? undefined : normalizedPadding,
        backgroundColor: contentBackground || undefined,
      }"
      @scroll="handleScroll"
    >
      <div v-if="!ghost" class="at-page-container__card">
        <slot />
      </div>
      <template v-else>
        <slot />
      </template>
    </main>

    <!-- 底部固定/悬浮插槽 -->
    <div v-if="$slots.footer" class="at-page-container__footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<style scoped>
.at-page-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  box-sizing: border-box;
  background-color: var(--el-bg-color-page);
  color: var(--el-text-color-primary);
}

.at-page-container.is-fit-viewport {
  height: 100%;
  overflow: hidden;
}

/* 页头样式 */
.at-page-container__header {
  padding: 16px 24px;
  background-color: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-lighter);
  box-sizing: border-box;
  transition:
    background-color 0.25s,
    border-color 0.25s;
}

.at-page-container__header.is-fixed {
  position: sticky;
  top: 0;
  z-index: 99;
}

.at-page-container__header.has-blur {
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  background-color: rgba(255, 255, 255, 0.85);
}

:global(.dark) .at-page-container__header.has-blur {
  background-color: rgba(20, 20, 20, 0.85);
}

.at-page-container__header.is-elevated {
  box-shadow: var(--el-box-shadow-light);
  z-index: 10;
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

.at-page-container__extra {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
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

.at-page-container.is-fit-viewport .at-page-container__content {
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

.at-page-container.is-fit-viewport .at-page-container__card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.at-page-container__footer {
  flex-shrink: 0;
}
</style>
