<script setup lang="ts">
/**
 * AtengIconSelect 图标列表与搜索面板子组件。
 *
 * @author Ateng
 * @since 2026-10-22
 */

import { ref, computed, watch } from 'vue';
import { ElInput, ElScrollbar, ElTooltip, ElEmpty, ElPagination, ElMessage } from 'element-plus';
import { writeClipboard } from '../../directives/copy';
import type { IconItem } from './types';

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    icons: IconItem[];
    showCopy?: boolean;
    pageSize?: number;
    isDialog?: boolean;
  }>(),
  {
    modelValue: '',
    showCopy: true,
    pageSize: 36,
    isDialog: false,
  },
);

const emit = defineEmits<{
  (e: 'select', item: IconItem): void;
  (e: 'copy', code: string): void;
}>();

const searchKeyword = ref<string>('');
const currentPage = ref<number>(1);

// 根据关键词过滤图标
const filteredIcons = computed<IconItem[]>(() => {
  const kw = searchKeyword.value.trim().toLowerCase();
  if (!kw) {
    return props.icons;
  }
  return props.icons.filter(item => {
    const nameMatch = item.name.toLowerCase().includes(kw);
    const labelMatch = item.label?.toLowerCase().includes(kw);
    const pinyinMatch = item.pinyin?.toLowerCase().includes(kw);
    return nameMatch || labelMatch || pinyinMatch;
  });
});

watch(searchKeyword, () => {
  currentPage.value = 1;
});

// 当前分页切片
const pagedIcons = computed<IconItem[]>(() => {
  if (!props.pageSize || props.pageSize <= 0) {
    return filteredIcons.value;
  }
  const start = (currentPage.value - 1) * props.pageSize;
  return filteredIcons.value.slice(start, start + props.pageSize);
});

// 当前选中的图标对象
const currentIconItem = computed<IconItem | undefined>(() => {
  if (!props.modelValue) return undefined;
  return props.icons.find(item => item.name === props.modelValue);
});

function handleSelect(item: IconItem): void {
  emit('select', item);
}

async function copyCode(name?: string): Promise<boolean> {
  const iconName = name || props.modelValue;
  if (!iconName) {
    ElMessage.warning('请先选择图标');
    return false;
  }
  const code = `<el-icon><${iconName} /></el-icon>`;
  try {
    await writeClipboard(code);
    ElMessage.success(`已复制代码: ${code}`);
    emit('copy', code);
    return true;
  } catch {
    ElMessage.error('复制失败');
    return false;
  }
}

defineExpose({
  copyCode,
  filteredIcons,
  searchKeyword,
  currentPage,
});
</script>

<template>
  <div :class="['at-icon-select__panel', isDialog && 'is-dialog']">
    <!-- 检索栏 -->
    <div class="at-icon-select__search">
      <ElInput
        v-model="searchKeyword"
        placeholder="搜索图标名称 / 拼音 / 中文..."
        clearable
        :size="isDialog ? 'default' : 'small'"
      />
    </div>

    <!-- 网格图标滚动视口 -->
    <ElScrollbar :max-height="isDialog ? '340px' : '240px'" class="at-icon-select__scroll">
      <div v-if="pagedIcons.length > 0" :class="['at-icon-select__grid', isDialog && 'is-dialog']">
        <ElTooltip
          v-for="item in pagedIcons"
          :key="item.name"
          :content="item.label ? `${item.name} (${item.label})` : item.name"
          placement="top"
        >
          <div
            :class="['at-icon-select__item', modelValue === item.name && 'is-active']"
            @click="handleSelect(item)"
          >
            <!-- eslint-disable-next-line vue/no-v-html -->
            <svg
              v-if="item.svgPath"
              viewBox="0 0 1024 1024"
              :width="isDialog ? '1.3em' : '1.2em'"
              :height="isDialog ? '1.3em' : '1.2em'"
              v-html="item.svgPath"
            />
            <component
              :is="item.component"
              v-else-if="item.component"
              :style="{ width: isDialog ? '1.3em' : '1.2em', height: isDialog ? '1.3em' : '1.2em' }"
            />
            <span v-else class="icon-fallback">{{ item.name.slice(0, 2) }}</span>
            <span v-if="isDialog" class="item-name">{{ item.name }}</span>
          </div>
        </ElTooltip>
      </div>
      <ElEmpty v-else description="未找到匹配图标" :image-size="isDialog ? 60 : 40" />
    </ElScrollbar>

    <!-- 底部工具栏与分页 -->
    <div class="at-icon-select__footer">
      <div class="at-icon-select__info">
        <span v-if="modelValue" class="selected-text">{{ modelValue }}</span>
        <button
          v-if="showCopy && modelValue"
          type="button"
          class="at-icon-select__copy-btn"
          title="复制 <el-icon> 代码"
          @click="copyCode(modelValue)"
        >
          📋 复制代码
        </button>
      </div>
      <ElPagination
        v-if="pageSize > 0 && filteredIcons.length > pageSize"
        v-model:current-page="currentPage"
        :page-size="pageSize"
        :total="filteredIcons.length"
        size="small"
        layout="prev, pager, next"
        class="at-icon-select__pagination"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.at-icon-select__panel {
  display: flex;
  flex-direction: column;
  gap: 10px;

  .at-icon-select__search {
    padding-bottom: 2px;
  }

  .at-icon-select__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(38px, 1fr));
    gap: 6px;
    padding: 2px;

    &.is-dialog {
      grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
      gap: 10px;
    }
  }

  .at-icon-select__item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 38px;
    border-radius: 4px;
    cursor: pointer;
    border: 1px solid transparent;
    color: var(--el-text-color-primary);
    transition: all 0.15s ease;

    &:hover {
      background-color: var(--el-fill-color-light);
      color: var(--el-color-primary);
      border-color: var(--el-color-primary-light-7);
    }

    &.is-active {
      background-color: var(--el-color-primary-light-9);
      color: var(--el-color-primary);
      border-color: var(--el-color-primary);
    }

    .item-name {
      font-size: 11px;
      margin-top: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 72px;
      color: var(--el-text-color-regular);
    }
  }

  .at-icon-select__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 6px;
    border-top: 1px solid var(--el-border-color-lighter);
    font-size: 12px;

    .at-icon-select__info {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .selected-text {
      font-weight: 600;
      color: var(--el-color-primary);
    }

    .at-icon-select__copy-btn {
      border: 1px solid var(--el-border-color);
      border-radius: 4px;
      padding: 2px 6px;
      font-size: 11px;
      cursor: pointer;
      background: var(--el-bg-color);
      color: var(--el-text-color-regular);
      transition: all 0.15s ease;

      &:hover {
        color: var(--el-color-primary);
        border-color: var(--el-color-primary);
      }
    }
  }
}
</style>
