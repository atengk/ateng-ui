<script setup lang="ts">
/**
 * 企业级电梯楼层导航锚点容器组件。
 *
 * 核心特性：
 * 1. 双模智能探测：智能向上探测祖先局部滚动容器（如 AtengPageContainer）或全局 window，支持 container 逃生舱；
 * 2. 声明式树形数据驱动：支持 items 多级小节与树形层级缩进；
 * 3. 吸顶偏移避让：内置 targetOffset 与 bounds 容差比对，避免被吸顶页头遮挡；
 * 4. 平滑寻路与性能保障：requestAnimationFrame 节流监听与平滑滚动定位；
 * 5. 游标指示与状态协同：支持指示墨水条动效、双向绑定 v-model:currentAnchor 与确定性生命周期清理。
 *
 * @author Ateng
 * @since 2026-10-23
 */

import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import type { AtengAnchorProps, AtengAnchorEmits, AtengAnchorItem } from './types';

defineOptions({
  name: 'AtengAnchor',
});

const props = withDefaults(defineProps<AtengAnchorProps>(), {
  items: () => [],
  container: undefined,
  targetOffset: 0,
  bounds: 5,
  direction: 'vertical',
  showInkBar: true,
  currentAnchor: undefined,
});

const emit = defineEmits<AtengAnchorEmits>();

const anchorRef = ref<HTMLElement | null>(null);

// 1. 扁平化小节列表（用于快速定位与比对）
const flattenItems = computed<AtengAnchorItem[]>(() => {
  const result: AtengAnchorItem[] = [];
  const traverse = (list: AtengAnchorItem[]) => {
    list.forEach(item => {
      result.push(item);
      if (item.children && item.children.length > 0) {
        traverse(item.children);
      }
    });
  };
  traverse(props.items || []);
  return result;
});

// 2. 当前激活锚点状态机
const internalActiveAnchor = ref('');

const activeAnchor = computed(() => {
  return props.currentAnchor !== undefined ? props.currentAnchor : internalActiveAnchor.value;
});

const setActiveAnchor = (href: string) => {
  internalActiveAnchor.value = href;
  emit('update:currentAnchor', href);
  emit('change', href);
};

// 3. 滚动宿主智能探测与解析
let scrollContainer: HTMLElement | Window | null = null;

const resolveScrollContainer = (): HTMLElement | Window => {
  if (typeof window === 'undefined') return {} as Window;

  // 1. 若显式指定了 container prop
  if (props.container) {
    if (typeof props.container === 'string') {
      const found = document.querySelector(props.container);
      if (found instanceof HTMLElement) return found;
    } else if (props.container instanceof HTMLElement || props.container === window) {
      return props.container;
    }
  }

  // 2. 向上递归探测最近的祖先滚动容器
  let parent = anchorRef.value?.parentElement;
  while (parent) {
    // 优先探测 AtengPageContainer 局部内容滚动容器
    if (parent.classList.contains('at-page-container__content')) {
      return parent;
    }

    const style = window.getComputedStyle(parent);
    if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
      return parent;
    }

    parent = parent.parentElement;
  }

  return window;
};

// 4. 获取目标 DOM 节点
const getTargetElement = (href: string): HTMLElement | null => {
  if (!href || typeof document === 'undefined') return null;
  const selector = href.startsWith('#') ? href.slice(1) : href;
  return document.getElementById(selector) || document.querySelector(href);
};

// 5. 点击定位与滚动监听（rAF 节流）
let isScrollingByClick = false;
let rafId: number | null = null;

const computeActiveAnchor = (emitEvent = true) => {
  if (!scrollContainer) return;

  const items = flattenItems.value;
  if (items.length === 0) return;

  const isWin = scrollContainer === window || !(scrollContainer instanceof HTMLElement);
  const containerTop = isWin ? 0 : (scrollContainer as HTMLElement).getBoundingClientRect().top;

  let candidateHref = '';
  let maxValidOffset = -Infinity;

  for (const item of items) {
    const el = getTargetElement(item.href);
    if (!el) continue;

    const rect = el.getBoundingClientRect();
    const offset = rect.top - containerTop - props.targetOffset;

    // 当锚点节点顶部在判断基准线以上（offset <= bounds）
    if (offset <= props.bounds) {
      if (offset > maxValidOffset) {
        maxValidOffset = offset;
        candidateHref = item.href;
      }
    }
  }

  // 如果所有锚点都在判定线下方，默认激活首个锚点
  if (!candidateHref && items.length > 0) {
    candidateHref = items[0].href;
  }

  if (candidateHref && candidateHref !== activeAnchor.value) {
    if (emitEvent) {
      setActiveAnchor(candidateHref);
    } else {
      internalActiveAnchor.value = candidateHref;
    }
    updateInkBar();
  }
};

const handleScroll = () => {
  if (isScrollingByClick) return;
  if (rafId !== null) cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(() => {
    computeActiveAnchor(true);
    rafId = null;
  });
};

const scrollTo = (href: string) => {
  const targetEl = getTargetElement(href);
  if (!scrollContainer) {
    scrollContainer = resolveScrollContainer();
  }
  if (!targetEl || !scrollContainer) return;

  isScrollingByClick = true;
  setActiveAnchor(href);
  updateInkBar();

  if (scrollContainer === window || !(scrollContainer instanceof HTMLElement)) {
    const rect = targetEl.getBoundingClientRect();
    const top =
      (window.scrollY || document.documentElement.scrollTop) + rect.top - props.targetOffset;
    if (typeof window.scrollTo === 'function') {
      window.scrollTo({ top, behavior: 'smooth' });
    }
  } else {
    const containerRect = scrollContainer.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();
    const top =
      scrollContainer.scrollTop + (targetRect.top - containerRect.top) - props.targetOffset;
    if (typeof scrollContainer.scrollTo === 'function') {
      scrollContainer.scrollTo({ top, behavior: 'smooth' });
    }
  }

  setTimeout(() => {
    isScrollingByClick = false;
    updateInkBar();
  }, 600);
};

const handleClick = (e: MouseEvent, item: AtengAnchorItem) => {
  emit('click', e, item);
  scrollTo(item.href);
};

// 6. 游标指示墨水条位置计算
const inkBallTop = ref(0);
const inkBallHeight = ref(0);
const inkBallLeft = ref(0);
const inkBallWidth = ref(0);
const isInkBallVisible = ref(false);

const updateInkBar = () => {
  if (!props.showInkBar || !anchorRef.value) {
    isInkBallVisible.value = false;
    return;
  }

  nextTick(() => {
    if (!anchorRef.value) return;
    const activeEl = anchorRef.value.querySelector<HTMLElement>('.at-anchor__link.is-active');
    if (!activeEl) {
      isInkBallVisible.value = false;
      return;
    }

    if (props.direction === 'vertical') {
      inkBallTop.value = activeEl.offsetTop + 6;
      inkBallHeight.value = Math.max(16, activeEl.offsetHeight - 12);
    } else {
      inkBallLeft.value = activeEl.offsetLeft;
      inkBallWidth.value = activeEl.offsetWidth;
    }
    isInkBallVisible.value = true;
  });
};

watch(
  () => [props.currentAnchor, props.items],
  () => {
    updateInkBar();
  },
  { deep: true },
);

onMounted(() => {
  scrollContainer = resolveScrollContainer();
  if (scrollContainer && typeof scrollContainer.addEventListener === 'function') {
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
  }
  computeActiveAnchor(false);
  updateInkBar();
});

onBeforeUnmount(() => {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  if (scrollContainer && typeof scrollContainer.removeEventListener === 'function') {
    scrollContainer.removeEventListener('scroll', handleScroll);
  }
});

defineExpose({
  anchorRef,
  scrollTo,
  activeAnchor,
});
</script>

<template>
  <nav ref="anchorRef" class="at-anchor" :class="[`is-${direction}`, { 'has-ink': showInkBar }]">
    <!-- 游标墨水指示条 -->
    <div
      v-if="showInkBar"
      class="at-anchor__ink"
      :style="
        direction === 'vertical'
          ? {
              top: `${inkBallTop}px`,
              height: `${inkBallHeight}px`,
              opacity: isInkBallVisible ? 1 : 0,
            }
          : {
              left: `${inkBallLeft}px`,
              width: `${inkBallWidth}px`,
              opacity: isInkBallVisible ? 1 : 0,
            }
      "
    />

    <!-- 锚点项列表 -->
    <div class="at-anchor__list">
      <template v-for="item in items" :key="item.key || item.href">
        <div class="at-anchor__item">
          <a
            :href="item.href"
            class="at-anchor__link"
            :class="{ 'is-active': activeAnchor === item.href }"
            :title="item.title"
            @click.prevent="handleClick($event, item)"
          >
            <span class="at-anchor__title">{{ item.title }}</span>
          </a>

          <!-- 二级子锚点递归渲染 -->
          <div v-if="item.children && item.children.length > 0" class="at-anchor__sub-list">
            <div
              v-for="sub in item.children"
              :key="sub.key || sub.href"
              class="at-anchor__item is-sub"
            >
              <a
                :href="sub.href"
                class="at-anchor__link"
                :class="{ 'is-active': activeAnchor === sub.href }"
                :title="sub.title"
                @click.prevent="handleClick($event, sub)"
              >
                <span class="at-anchor__title">{{ sub.title }}</span>
              </a>
            </div>
          </div>
        </div>
      </template>
    </div>
  </nav>
</template>

<style scoped>
.at-anchor {
  position: relative;
  box-sizing: border-box;
  font-size: 14px;
  line-height: 22px;
  color: var(--el-text-color-regular);
}

.at-anchor.is-vertical {
  padding-left: 12px;
  border-left: 2px solid var(--el-border-color-lighter);
}

.at-anchor.is-horizontal {
  padding-bottom: 8px;
  border-bottom: 2px solid var(--el-border-color-lighter);
}

.at-anchor.is-horizontal .at-anchor__list {
  display: flex;
  align-items: center;
  gap: 16px;
}

/* 游标指示条 (Ink Bar) */
.at-anchor__ink {
  position: absolute;
  background-color: var(--el-color-primary);
  border-radius: 2px;
  transition:
    top 0.25s cubic-bezier(0.4, 0, 0.2, 1),
    height 0.25s cubic-bezier(0.4, 0, 0.2, 1),
    left 0.25s cubic-bezier(0.4, 0, 0.2, 1),
    width 0.25s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.2s;
  pointer-events: none;
}

.at-anchor.is-vertical .at-anchor__ink {
  left: -2px;
  width: 2px;
}

.at-anchor.is-horizontal .at-anchor__ink {
  bottom: -2px;
  height: 2px;
}

.at-anchor__list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.at-anchor__item {
  display: flex;
  flex-direction: column;
}

.at-anchor__item.is-sub {
  padding-left: 14px;
}

.at-anchor__sub-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 4px;
}

.at-anchor__link {
  display: inline-block;
  padding: 4px 8px;
  color: var(--el-text-color-regular);
  text-decoration: none;
  border-radius: var(--el-border-radius-base);
  transition:
    color 0.2s,
    background-color 0.2s;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.at-anchor__link:hover {
  color: var(--el-color-primary);
}

.at-anchor__link.is-active {
  color: var(--el-color-primary);
  font-weight: 600;
  background-color: var(--el-color-primary-light-9);
}
</style>
