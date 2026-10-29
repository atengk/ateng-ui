<script setup lang="ts">
/**
 * AtengTabsNav 企业级多标签页导航组件。
 *
 * 具备视口溢出平滑滚动、鼠标滚轮横向滑动、激活项居中自适应、原生拖拽排序防呆、
 * Element Plus 原生右键上下文菜单、快捷批量关闭下拉面板、内容区最大化协同与三大视觉形态。
 *
 * @author Ateng
 * @since 2026-10-29
 */

import { ref, reactive, computed, watch, nextTick, onMounted, onUnmounted, inject } from 'vue';
import { ElDropdown, ElDropdownMenu, ElDropdownItem } from 'element-plus';
import { ATENG_PRO_LAYOUT_KEY } from '../pro-layout/types';
import type { AtengTabsNavProps, AtengTabsNavEmits, AtengTabsNavSlots, TabItem } from './types';

defineOptions({
  name: 'AtengTabsNav',
});

const props = withDefaults(defineProps<AtengTabsNavProps>(), {
  modelValue: '',
  tabs: () => [],
  styleType: 'card',
  height: '38px',
  showIcon: true,
  closable: true,
  draggable: true,
  contextMenu: true,
  showQuickActions: true,
  showMaximize: true,
  isMaximized: false,
});

const emit = defineEmits<AtengTabsNavEmits>();
defineSlots<AtengTabsNavSlots>();

// DOM 引用
const viewportRef = ref<HTMLDivElement | null>(null);
const trackRef = ref<HTMLDivElement | null>(null);

// 尺寸与滚动状态
const containerHeight = computed<string>(() => {
  return typeof props.height === 'number' ? `${props.height}px` : props.height;
});

const overflow = reactive({
  hasOverflow: false,
  canScrollLeft: false,
  canScrollRight: false,
});

// 拖拽状态
const dragIndex = ref<number | null>(null);
const dragTargetIndex = ref<number | null>(null);

// 更新滚动容器溢出与边界状态
const updateScrollStatus = (): void => {
  const el = viewportRef.value;
  if (!el) {
    return;
  }
  const { scrollLeft, scrollWidth, clientWidth } = el;
  overflow.hasOverflow = scrollWidth > clientWidth + 2;
  overflow.canScrollLeft = scrollLeft > 2;
  overflow.canScrollRight = scrollLeft + clientWidth < scrollWidth - 2;
};

// 视口按步长平滑滚动
const scrollByOffset = (offset: number): void => {
  viewportRef.value?.scrollBy({ left: offset, behavior: 'smooth' });
};

// 鼠标滚轮横向滑动
const onWheelScroll = (event: WheelEvent): void => {
  const el = viewportRef.value;
  if (!el || !overflow.hasOverflow) {
    return;
  }
  const delta = event.deltaY || event.deltaX;
  if (delta !== 0) {
    el.scrollLeft += delta;
    event.preventDefault();
    updateScrollStatus();
  }
};

// 激活项平滑居中展示（视口内原生自闭环平滑滚动，杜绝外部视口抖动）
const scrollToActiveTab = (): void => {
  nextTick(() => {
    const el = viewportRef.value;
    if (!el) {
      return;
    }
    updateScrollStatus();
    if (!overflow.hasOverflow) {
      el.scrollLeft = 0;
      return;
    }
    const activeEl = el.querySelector<HTMLElement>('.at-tabs-nav__item.is-active');
    if (!activeEl) {
      return;
    }
    const activeLeft = activeEl.offsetLeft;
    const activeWidth = activeEl.offsetWidth;
    const viewportWidth = el.clientWidth;
    const targetScrollLeft = activeLeft - (viewportWidth - activeWidth) / 2;
    el.scrollTo({
      left: Math.max(0, targetScrollLeft),
      behavior: 'smooth',
    });
    updateScrollStatus();
  });
};

// 监听激活标签变化，平滑自适应滚动居中
watch(() => props.modelValue, scrollToActiveTab);
watch(() => props.tabs.length, scrollToActiveTab);

// 几何自适应监听
let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  updateScrollStatus();
  scrollToActiveTab();

  if (typeof ResizeObserver !== 'undefined' && viewportRef.value) {
    resizeObserver = new ResizeObserver(() => {
      updateScrollStatus();
    });
    resizeObserver.observe(viewportRef.value);
    if (trackRef.value) {
      resizeObserver.observe(trackRef.value);
    }
  }

  viewportRef.value?.addEventListener('scroll', updateScrollStatus, {
    passive: true,
  });
});

onUnmounted(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
  viewportRef.value?.removeEventListener('scroll', updateScrollStatus);
});

// 判断单标签是否可被关闭
const isTabClosable = (tab: TabItem): boolean => {
  if (tab.affix) {
    return false;
  }
  return tab.closable ?? props.closable;
};

// 判断是否能执行“关闭其他”
const canCloseOthers = (tab: TabItem): boolean => {
  return props.tabs.some(t => !t.affix && t.key !== tab.key);
};

// 判断是否能执行“关闭左侧”
const canCloseLeft = (index: number): boolean => {
  return props.tabs.slice(0, index).some(t => !t.affix);
};

// 判断是否能执行“关闭右侧”
const canCloseRight = (index: number): boolean => {
  return props.tabs.slice(index + 1).some(t => !t.affix);
};

// 判断是否能执行“全部关闭”
const canCloseAll = (): boolean => {
  return props.tabs.some(t => !t.affix);
};

// 点击标签项
const onTabItemClick = (tab: TabItem): void => {
  if (props.modelValue !== tab.key) {
    emit('update:modelValue', tab.key);
  }
  emit('tabClick', tab);
};

// 点击关闭小图标
const onTabItemClose = (event: MouseEvent, tab: TabItem): void => {
  event.stopPropagation();
  emit('tabClose', tab.key, tab);
};

// 拖拽事件处理
const onDragStart = (event: DragEvent, index: number, tab: TabItem): void => {
  if (tab.affix) {
    event.preventDefault();
    return;
  }
  dragIndex.value = index;
  if (event.dataTransfer) {
    event.dataTransfer.setData('text/plain', String(index));
    event.dataTransfer.effectAllowed = 'move';
  }
};

const onDragOver = (event: DragEvent, index: number, tab: TabItem): void => {
  event.preventDefault();
  if (tab.affix) {
    return;
  }
  dragTargetIndex.value = index;
};

const onDragLeave = (index: number): void => {
  if (dragTargetIndex.value === index) {
    dragTargetIndex.value = null;
  }
};

const onDrop = (event: DragEvent, toIndex: number, targetTab: TabItem): void => {
  event.preventDefault();
  const fromIndex = dragIndex.value;
  dragIndex.value = null;
  dragTargetIndex.value = null;

  if (
    fromIndex === null ||
    fromIndex === toIndex ||
    targetTab.affix ||
    fromIndex < 0 ||
    fromIndex >= props.tabs.length
  ) {
    return;
  }

  const movingTab = props.tabs[fromIndex];
  if (!movingTab || movingTab.affix) {
    return;
  }

  // 保证不能被拖到固定标签之前
  const firstUnpinnedIndex = props.tabs.findIndex(t => !t.affix);
  const validToIndex = Math.max(firstUnpinnedIndex >= 0 ? firstUnpinnedIndex : 0, toIndex);

  const newTabs = [...props.tabs];
  const [removed] = newTabs.splice(fromIndex, 1);
  if (removed) {
    newTabs.splice(validToIndex, 0, removed);
    emit('update:tabs', newTabs);
    emit('tabOrderChange', newTabs);
  }
};

const onDragEnd = (): void => {
  dragIndex.value = null;
  dragTargetIndex.value = null;
};

// 上下文菜单与快捷指令派发
const handleCommand = (command: string, tab: TabItem, index: number): void => {
  switch (command) {
    case 'refresh':
      emit('tabRefresh', tab.key, tab);
      break;
    case 'close':
      emit('tabClose', tab.key, tab);
      break;
    case 'closeOthers': {
      const newTabs = props.tabs.filter(t => t.affix || t.key === tab.key);
      emit('update:tabs', newTabs);
      if (tab.key !== props.modelValue) {
        emit('update:modelValue', tab.key);
      }
      break;
    }
    case 'closeLeft': {
      const newTabs = props.tabs.filter((t, idx) => idx >= index || t.affix);
      emit('update:tabs', newTabs);
      if (!newTabs.some(t => t.key === props.modelValue)) {
        emit('update:modelValue', tab.key);
      }
      break;
    }
    case 'closeRight': {
      const newTabs = props.tabs.filter((t, idx) => idx <= index || t.affix);
      emit('update:tabs', newTabs);
      if (!newTabs.some(t => t.key === props.modelValue)) {
        emit('update:modelValue', tab.key);
      }
      break;
    }
    case 'closeAll': {
      const newTabs = props.tabs.filter(t => t.affix);
      emit('update:tabs', newTabs);
      const firstTab = newTabs[0];
      emit('update:modelValue', firstTab ? firstTab.key : '');
      break;
    }
  }
};

// 快捷操作下拉菜单命令处理（基于当前 activeKey）
const handleQuickCommand = (command: string): void => {
  const currentTab = props.tabs.find(t => t.key === props.modelValue);
  const currentIndex = props.tabs.findIndex(t => t.key === props.modelValue);
  if (!currentTab || currentIndex < 0) {
    if (command === 'closeAll') {
      const newTabs = props.tabs.filter(t => t.affix);
      emit('update:tabs', newTabs);
      const firstTab = newTabs[0];
      emit('update:modelValue', firstTab ? firstTab.key : '');
    }
    return;
  }
  handleCommand(command, currentTab, currentIndex);
};

// 协同上下文总线 (ProLayout Context Bus)
const proLayoutContext = inject(ATENG_PRO_LAYOUT_KEY, null);

const effectiveMaximized = computed<boolean>(() => {
  if (props.isMaximized) {
    return true;
  }
  return proLayoutContext?.isMaximized?.value ?? false;
});

// 切换最大化模式
const toggleMaximize = (): void => {
  const nextVal = !effectiveMaximized.value;
  emit('update:isMaximized', nextVal);
  emit('maximizeChange', nextVal);
  if (proLayoutContext && typeof proLayoutContext.toggleMaximize === 'function') {
    proLayoutContext.toggleMaximize(nextVal);
  }
};
</script>

<template>
  <div
    class="at-tabs-nav"
    :class="[`at-tabs-nav--${styleType}`]"
    :style="{ height: containerHeight, minHeight: containerHeight }"
    role="tablist"
  >
    <!-- 前置插槽 -->
    <div v-if="$slots.prefix" class="at-tabs-nav__prefix">
      <slot name="prefix" />
    </div>

    <!-- 左侧溢出滚动按钮 -->
    <button
      v-if="overflow.hasOverflow"
      type="button"
      class="at-tabs-nav__scroll-btn at-tabs-nav__scroll-btn--left"
      :disabled="!overflow.canScrollLeft"
      aria-label="向左滚动"
      @click="scrollByOffset(-200)"
    >
      <svg viewBox="0 0 1024 1024" width="12" height="12" fill="currentColor">
        <path
          d="M608 768c-8.192 0-16.384-3.072-22.528-9.216l-216-216a32 32 0 0 1 0-45.568l216-216a32 32 0 0 1 45.248 45.248L437.248 512l193.472 193.536A32 32 0 0 1 608 768z"
        />
      </svg>
    </button>

    <!-- 标签滚动视口区域 -->
    <div ref="viewportRef" class="at-tabs-nav__viewport" @wheel="onWheelScroll">
      <div ref="trackRef" class="at-tabs-nav__track">
        <template v-for="(tab, index) in tabs" :key="tab.key">
          <!-- 开启右键菜单时使用 ElDropdown 包裹 -->
          <ElDropdown
            v-if="contextMenu"
            trigger="contextmenu"
            :teleported="true"
            @command="(cmd: string) => handleCommand(cmd, tab, index)"
          >
            <div
              class="at-tabs-nav__item"
              :class="{
                'is-active': tab.key === modelValue,
                'is-affix': tab.affix,
                'is-dragover': dragTargetIndex === index,
              }"
              role="tab"
              :aria-selected="tab.key === modelValue"
              :draggable="draggable && !tab.affix ? 'true' : 'false'"
              @click="onTabItemClick(tab)"
              @dragstart="onDragStart($event, index, tab)"
              @dragover="onDragOver($event, index, tab)"
              @dragleave="onDragLeave(index)"
              @drop="onDrop($event, index, tab)"
              @dragend="onDragEnd"
            >
              <!-- 自定义插槽优先 -->
              <slot name="tab" :tab="tab" :active="tab.key === modelValue" :index="index">
                <!-- 标签图标 -->
                <span v-if="showIcon && tab.icon" class="at-tabs-nav__icon">
                  <component :is="tab.icon" v-if="typeof tab.icon === 'object'" />
                  <i v-else-if="typeof tab.icon === 'string'" :class="tab.icon" />
                </span>

                <!-- 标签标题 -->
                <span class="at-tabs-nav__title">{{ tab.title }}</span>

                <!-- 关闭按钮 -->
                <button
                  v-if="isTabClosable(tab)"
                  type="button"
                  class="at-tabs-nav__close"
                  aria-label="关闭标签"
                  @click="onTabItemClose($event, tab)"
                >
                  <svg viewBox="0 0 1024 1024" width="10" height="10" fill="currentColor">
                    <path
                      d="M576 512l277.333-277.333c17.067-17.067 17.067-44.8 0-61.867s-44.8-17.067-61.867 0L512 450.133 234.667 172.8c-17.067-17.067-44.8-17.067-61.867 0s-17.067 44.8 0 61.867L450.133 512 172.8 789.333c-17.067 17.067-17.067 44.8 0 61.867 8.533 8.533 19.2 12.8 30.933 12.8s22.4-4.267 30.933-12.8L512 573.867l277.333 277.333c8.533 8.533 19.2 12.8 30.933 12.8s22.4-4.267 30.933-12.8c17.067-17.067 17.067-44.8 0-61.867L576 512z"
                    />
                  </svg>
                </button>
              </slot>
            </div>

            <template #dropdown>
              <ElDropdownMenu class="at-tabs-nav__dropdown-menu">
                <ElDropdownItem command="refresh">
                  <span class="dropdown-item-flex">🔄 刷新当前</span>
                </ElDropdownItem>
                <ElDropdownItem command="close" :disabled="!isTabClosable(tab)" divided>
                  <span class="dropdown-item-flex">❌ 关闭当前</span>
                </ElDropdownItem>
                <ElDropdownItem command="closeOthers" :disabled="!canCloseOthers(tab)">
                  <span class="dropdown-item-flex">🚫 关闭其他</span>
                </ElDropdownItem>
                <ElDropdownItem command="closeLeft" :disabled="!canCloseLeft(index)">
                  <span class="dropdown-item-flex">⬅️ 关闭左侧</span>
                </ElDropdownItem>
                <ElDropdownItem command="closeRight" :disabled="!canCloseRight(index)">
                  <span class="dropdown-item-flex">➡️ 关闭右侧</span>
                </ElDropdownItem>
                <ElDropdownItem command="closeAll" :disabled="!canCloseAll()" divided>
                  <span class="dropdown-item-flex">🧹 全部关闭</span>
                </ElDropdownItem>
              </ElDropdownMenu>
            </template>
          </ElDropdown>

          <!-- 未开启右键菜单时的纯节点渲染 -->
          <div
            v-else
            class="at-tabs-nav__item"
            :class="{
              'is-active': tab.key === modelValue,
              'is-affix': tab.affix,
              'is-dragover': dragTargetIndex === index,
            }"
            role="tab"
            :aria-selected="tab.key === modelValue"
            :draggable="draggable && !tab.affix ? 'true' : 'false'"
            @click="onTabItemClick(tab)"
            @dragstart="onDragStart($event, index, tab)"
            @dragover="onDragOver($event, index, tab)"
            @dragleave="onDragLeave(index)"
            @drop="onDrop($event, index, tab)"
            @dragend="onDragEnd"
          >
            <slot name="tab" :tab="tab" :active="tab.key === modelValue" :index="index">
              <span v-if="showIcon && tab.icon" class="at-tabs-nav__icon">
                <component :is="tab.icon" v-if="typeof tab.icon === 'object'" />
                <i v-else-if="typeof tab.icon === 'string'" :class="tab.icon" />
              </span>
              <span class="at-tabs-nav__title">{{ tab.title }}</span>
              <button
                v-if="isTabClosable(tab)"
                type="button"
                class="at-tabs-nav__close"
                aria-label="关闭标签"
                @click="onTabItemClose($event, tab)"
              >
                <svg viewBox="0 0 1024 1024" width="10" height="10" fill="currentColor">
                  <path
                    d="M576 512l277.333-277.333c17.067-17.067 17.067-44.8 0-61.867s-44.8-17.067-61.867 0L512 450.133 234.667 172.8c-17.067-17.067-44.8-17.067-61.867 0s-17.067 44.8 0 61.867L450.133 512 172.8 789.333c-17.067 17.067-17.067 44.8 0 61.867 8.533 8.533 19.2 12.8 30.933 12.8s22.4-4.267 30.933-12.8L512 573.867l277.333 277.333c8.533 8.533 19.2 12.8 30.933 12.8s22.4-4.267 30.933-12.8c17.067-17.067 17.067-44.8 0-61.867L576 512z"
                  />
                </svg>
              </button>
            </slot>
          </div>
        </template>
      </div>
    </div>

    <!-- 右侧溢出滚动按钮 -->
    <button
      v-if="overflow.hasOverflow"
      type="button"
      class="at-tabs-nav__scroll-btn at-tabs-nav__scroll-btn--right"
      :disabled="!overflow.canScrollRight"
      aria-label="向右滚动"
      @click="scrollByOffset(200)"
    >
      <svg viewBox="0 0 1024 1024" width="12" height="12" fill="currentColor">
        <path
          d="M416 768a32 32 0 0 1-22.528-54.656L586.944 512 393.472 318.528a32 32 0 1 1 45.248-45.248l216 216a32 32 0 0 1 0 45.568l-216 216A32 32 0 0 1 416 768z"
        />
      </svg>
    </button>

    <!-- 后置插槽与操作区 -->
    <div
      v-if="$slots.suffix || showQuickActions || showMaximize || $slots.extra"
      class="at-tabs-nav__suffix"
    >
      <slot name="suffix" />

      <!-- 快捷批量操作下拉菜单 -->
      <div v-if="showQuickActions" class="at-tabs-nav__quick-actions">
        <ElDropdown trigger="click" @command="handleQuickCommand">
          <button
            type="button"
            class="at-tabs-nav__action-btn"
            title="标签快捷操作"
            aria-label="标签快捷操作"
          >
            <svg viewBox="0 0 1024 1024" width="14" height="14" fill="currentColor">
              <path
                d="M512 640a32 32 0 0 1-22.528-9.376l-256-256a32 32 0 0 1 45.056-45.248L512 562.624l233.472-233.248a32 32 0 1 1 45.056 45.248l-256 256A32 32 0 0 1 512 640z"
              />
            </svg>
          </button>

          <template #dropdown>
            <ElDropdownMenu class="at-tabs-nav__dropdown-menu">
              <ElDropdownItem command="refresh">
                <span class="dropdown-item-flex">🔄 刷新当前</span>
              </ElDropdownItem>
              <ElDropdownItem command="closeOthers" divided>
                <span class="dropdown-item-flex">🚫 关闭其他</span>
              </ElDropdownItem>
              <ElDropdownItem command="closeLeft">
                <span class="dropdown-item-flex">⬅️ 关闭左侧</span>
              </ElDropdownItem>
              <ElDropdownItem command="closeRight">
                <span class="dropdown-item-flex">➡️ 关闭右侧</span>
              </ElDropdownItem>
              <ElDropdownItem command="closeAll" divided>
                <span class="dropdown-item-flex">🧹 全部关闭</span>
              </ElDropdownItem>
            </ElDropdownMenu>
          </template>
        </ElDropdown>
      </div>

      <!-- 内容区一键全屏最大化按钮 -->
      <button
        v-if="showMaximize"
        type="button"
        class="at-tabs-nav__action-btn at-tabs-nav__maximize-btn"
        :title="effectiveMaximized ? '还原视图' : '内容最大化'"
        :aria-label="effectiveMaximized ? '还原视图' : '内容最大化'"
        @click="toggleMaximize"
      >
        <!-- 展开最大化图标 -->
        <svg
          v-if="!effectiveMaximized"
          viewBox="0 0 1024 1024"
          width="13"
          height="13"
          fill="currentColor"
        >
          <path
            d="M320 160H160v160h64v-96h96V160z m544 0h-160v64h96v96h64V160zM224 704h-64v160h160v-64h-96v-96z m640 0h-64v96h-96v64h160v-160z"
          />
        </svg>
        <!-- 还原缩小图标 -->
        <svg v-else viewBox="0 0 1024 1024" width="13" height="13" fill="currentColor">
          <path
            d="M160 320h160V160h-64v96H160v64z m544 0h160v-64h-96v-96h-64v160zM256 864h64V704H160v64h96v96z m448 0h64v-96h96v-64H704v160z"
          />
        </svg>
      </button>

      <slot name="extra" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.at-tabs-nav {
  display: flex;
  align-items: center;
  position: relative;
  width: 100%;
  box-sizing: border-box;
  background-color: var(--el-bg-color, #ffffff);
  border-bottom: 1px solid var(--el-border-color-lighter, #ebeef5);
  padding: 0 8px;
  overflow: hidden;
  user-select: none;
  transition:
    background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1),
    border-color 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &__prefix,
  &__suffix {
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
    gap: 4px;
    z-index: 2;
  }

  &__suffix {
    padding-left: 6px;
    margin-left: 4px;
    border-left: 1px solid var(--el-border-color-lighter, #ebeef5);
  }

  &__scroll-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    padding: 0;
    margin: 0 2px;
    border: 1px solid var(--el-border-color-extra-light, #f2f6fc);
    border-radius: 50%;
    background: var(--el-fill-color-blank, #ffffff);
    color: var(--el-text-color-regular, #606266);
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    z-index: 2;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

    &:hover:not(:disabled) {
      background-color: var(--el-color-primary-light-9, #ecf5ff);
      border-color: var(--el-color-primary-light-6, #b3d8ff);
      color: var(--el-color-primary, #409eff);
      transform: scale(1.05);
    }

    &:active:not(:disabled) {
      transform: scale(0.95);
    }

    &:disabled {
      opacity: 0.35;
      cursor: not-allowed;
      border-color: transparent;
      box-shadow: none;
    }
  }

  &__action-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    padding: 0;
    border: 1px solid transparent;
    border-radius: var(--el-border-radius-base, 4px);
    background: transparent;
    color: var(--el-text-color-secondary, #909399);
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

    &:hover {
      background-color: var(--el-fill-color-light, #f5f7fa);
      border-color: var(--el-border-color-lighter, #ebeef5);
      color: var(--el-color-primary, #409eff);
      transform: scale(1.05);
    }

    &:active {
      transform: scale(0.95);
    }
  }

  &__maximize-btn {
    &:hover {
      color: var(--el-color-primary, #409eff);
    }
  }

  &__viewport {
    display: flex;
    align-items: center;
    flex: 1;
    height: 100%;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none; // Firefox
    &::-webkit-scrollbar {
      display: none; // Chrome/Safari
    }
  }

  &__track {
    display: flex;
    align-items: center;
    height: 100%;
    gap: 6px;
    white-space: nowrap;

    :deep(.el-dropdown) {
      height: 100%;
      display: inline-flex;
      align-items: center;
      line-height: normal;
    }
  }

  &__item {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    position: relative;
    cursor: pointer;
    white-space: nowrap;
    font-size: 13px;
    color: var(--el-text-color-regular, #606266);
    box-sizing: border-box;
    transition:
      all 0.2s cubic-bezier(0.4, 0, 0.2, 1),
      color 0.15s ease;

    &:hover {
      color: var(--el-color-primary, #409eff);

      .at-tabs-nav__close {
        opacity: 0.85;
      }
    }

    &.is-active {
      color: var(--el-color-primary, #409eff);
      font-weight: 600;

      .at-tabs-nav__close {
        opacity: 0.85;
      }
    }

    &.is-dragover {
      border-color: var(--el-color-primary, #409eff) !important;
      background-color: var(--el-color-primary-light-8, #d9ecff) !important;
      transform: scale(1.03);
      box-shadow: 0 2px 10px rgba(64, 158, 255, 0.25) !important;
    }
  }

  &__icon {
    display: inline-flex;
    align-items: center;
    margin-right: 6px;
    font-size: 14px;
    line-height: 1;
  }

  &__title {
    display: inline-block;
    max-width: 160px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 1;
  }

  &__close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    margin-left: 6px;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: var(--el-text-color-placeholder, #a8abb2);
    cursor: pointer;
    opacity: 0.45;
    transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);

    &:hover {
      background-color: var(--el-fill-color-darker, rgba(0, 0, 0, 0.08));
      color: var(--el-color-danger, #f56c6c);
      opacity: 1 !important;
      transform: scale(1.15);
    }

    &:active {
      transform: scale(0.92);
    }
  }

  // ==========================================
  // 风格 1: Card 卡片风格 (现代悬浮卡片高保真美学)
  // ==========================================
  &--card {
    background-color: var(--el-fill-color-blank, #ffffff);

    .at-tabs-nav__item {
      height: 28px;
      padding: 0 12px;
      border-radius: 6px;
      border: 1px solid var(--el-border-color-lighter, #ebeef5);
      background-color: var(--el-fill-color-blank, #ffffff);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);

      &:hover:not(.is-active) {
        border-color: var(--el-color-primary-light-6, #b3d8ff);
        background-color: var(--el-color-primary-light-9, #ecf5ff);
        color: var(--el-color-primary, #409eff);
        transform: translateY(-1px);
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
      }

      &.is-active {
        border-color: var(--el-color-primary-light-5, #a0cfff);
        background-color: var(--el-color-primary-light-9, #ecf5ff);
        color: var(--el-color-primary, #409eff);
        font-weight: 600;
        box-shadow: 0 2px 8px 0 rgba(64, 158, 255, 0.16);
      }
    }
  }

  // ==========================================
  // 风格 2: Pill 胶囊风格 (现代灵动柔和胶囊美学)
  // ==========================================
  &--pill {
    background-color: var(--el-fill-color-blank, #ffffff);

    .at-tabs-nav__item {
      height: 26px;
      padding: 0 14px;
      border-radius: 9999px;
      border: 1px solid var(--el-border-color-lighter, #ebeef5);
      background-color: var(--el-fill-color-light, #f5f7fa);
      color: var(--el-text-color-regular, #606266);
      transition:
        background-color 0.25s cubic-bezier(0.4, 0, 0.2, 1),
        border-color 0.25s cubic-bezier(0.4, 0, 0.2, 1),
        color 0.25s cubic-bezier(0.4, 0, 0.2, 1),
        box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1);

      &:hover:not(.is-active) {
        background-color: var(--el-fill-color, #e4e7ed);
        border-color: var(--el-color-primary-light-7, #c6e2ff);
        color: var(--el-color-primary, #409eff);
      }

      &.is-active {
        background-color: var(--el-color-primary-light-9, #ecf5ff);
        border-color: var(--el-color-primary-light-5, #a0cfff);
        color: var(--el-color-primary, #409eff);
        font-weight: 600;
        box-shadow: 0 1px 4px 0 rgba(var(--el-color-primary-rgb, 64, 158, 255), 0.16);

        .at-tabs-nav__close {
          color: var(--el-color-primary, #409eff);
        }
      }
    }
  }

  // ==========================================
  // 风格 3: Line 极简下划线风格 (经典扁平贴底美学)
  // ==========================================
  &--line {
    border-bottom: 1px solid var(--el-border-color-light, #e4e7ed);
    background-color: var(--el-bg-color, #ffffff);

    .at-tabs-nav__track {
      gap: 0;
    }

    .at-tabs-nav__item {
      height: 100%;
      padding: 0 16px;
      border-radius: 0;
      border: none;
      background: transparent !important;
      color: var(--el-text-color-regular, #606266);
      position: relative;
      z-index: 1;

      // 标签之间典雅的极细竖线微细分割线
      &::before {
        content: '';
        position: absolute;
        right: 0;
        top: 28%;
        height: 44%;
        width: 1px;
        background-color: var(--el-border-color-lighter, #ebeef5);
        transition: opacity 0.2s ease;
      }

      &:last-child::before,
      &.is-active::before {
        opacity: 0;
      }

      &:hover:not(.is-active) {
        color: var(--el-color-primary, #409eff);
      }

      // 贴合最底部的精致指示条
      &::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 8px;
        right: 8px;
        height: 2px;
        border-radius: 2px 2px 0 0;
        background-color: transparent;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        transform: scaleX(0);
      }

      &.is-active {
        color: var(--el-color-primary, #409eff);
        font-weight: 600;

        &::after {
          background-color: var(--el-color-primary, #409eff);
          box-shadow: 0 1px 4px 0 rgba(64, 158, 255, 0.3);
          transform: scaleX(1);
        }
      }
    }
  }
}

.dropdown-item-flex {
  display: inline-flex;
  align-items: center;
  font-size: 13px;
  gap: 6px;
}
</style>
