<script setup lang="ts">
/**
 * AtengIconSelect 通用图标选择器组件。
 *
 * 内置常用标准 SVG 图标集（零外部依赖），支持拼音与中文模糊检索、
 * Popover 浮窗与 Dialog 弹窗双模展现、清空与高亮选中态。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { ref, computed } from 'vue';
import { ElInput, ElPopover, ElDialog, ElTooltip, ElEmpty, ElScrollbar } from 'element-plus';
import { DEFAULT_ICONS } from './icons-data';
import type {
  AtengIconSelectProps,
  AtengIconSelectEmits,
  AtengIconSelectSlots,
  AtengIconSelectExpose,
  IconItem,
} from './types';

defineOptions({
  name: 'AtengIconSelect',
});

const props = withDefaults(defineProps<AtengIconSelectProps>(), {
  modelValue: '',
  placeholder: '请选择图标',
  mode: 'popover',
  clearable: true,
  disabled: false,
  size: 'default',
  customIcons: () => [],
  popoverWidth: 380,
  customClass: '',
});

const emit = defineEmits<AtengIconSelectEmits>();
defineSlots<AtengIconSelectSlots>();

// 弹层展开受控状态
const visible = ref<boolean>(false);
const searchKeyword = ref<string>('');
const inputRef = ref<InstanceType<typeof ElInput> | null>(null);

// 合并后的图标总集
const allIcons = computed<IconItem[]>(() => {
  if (props.customIcons && props.customIcons.length > 0) {
    return [...props.customIcons, ...DEFAULT_ICONS];
  }
  return DEFAULT_ICONS;
});

// 根据关键词过滤图标
const filteredIcons = computed<IconItem[]>(() => {
  const kw = searchKeyword.value.trim().toLowerCase();
  if (!kw) {
    return allIcons.value;
  }
  return allIcons.value.filter(item => {
    const nameMatch = item.name.toLowerCase().includes(kw);
    const labelMatch = item.label?.toLowerCase().includes(kw);
    const pinyinMatch = item.pinyin?.toLowerCase().includes(kw);
    return nameMatch || labelMatch || pinyinMatch;
  });
});

// 当前选中的图标对象
const currentIconItem = computed<IconItem | undefined>(() => {
  if (!props.modelValue) return undefined;
  return allIcons.value.find(item => item.name === props.modelValue);
});

// 选择图标
function handleSelect(item: IconItem): void {
  emit('update:modelValue', item.name);
  emit('change', item.name);
  emit('select', item);
  visible.value = false;
}

// 清除选择
function handleClear(): void {
  emit('update:modelValue', '');
  emit('change', '');
  emit('clear');
}

// 暴露的方法
function clear(): void {
  handleClear();
}

function focus(): void {
  inputRef.value?.focus();
}

defineExpose<AtengIconSelectExpose>({
  clear,
  focus,
});
</script>

<template>
  <div :class="['at-icon-select', customClass]">
    <!-- Popover 浮窗模式 -->
    <template v-if="mode === 'popover'">
      <ElPopover
        v-model:visible="visible"
        trigger="click"
        :width="popoverWidth"
        :disabled="disabled"
        popper-class="at-icon-select__popper"
      >
        <template #reference>
          <div class="at-icon-select__trigger">
            <ElInput
              ref="inputRef"
              :model-value="modelValue"
              :placeholder="placeholder"
              :disabled="disabled"
              :size="size"
              readonly
              :clearable="clearable"
              @clear="handleClear"
            >
              <!-- 前缀图标预览 -->
              <template #prefix>
                <slot name="prefix">
                  <span v-if="currentIconItem?.svgPath" class="at-icon-select__preview">
                    <svg
                      viewBox="0 0 1024 1024"
                      width="1em"
                      height="1em"
                      v-html="currentIconItem.svgPath"
                    />
                  </span>
                  <span v-else-if="modelValue" class="at-icon-select__preview-text">
                    {{ modelValue.slice(0, 1) }}
                  </span>
                </slot>
              </template>
            </ElInput>
          </div>
        </template>

        <!-- 浮窗内部面板 -->
        <div class="at-icon-select__panel">
          <!-- 检索栏 -->
          <div class="at-icon-select__search">
            <ElInput
              v-model="searchKeyword"
              placeholder="搜索图标名称 / 拼音 / 中文..."
              clearable
              size="small"
            />
          </div>

          <!-- 网格图标滚动视口 -->
          <ElScrollbar max-height="240px" class="at-icon-select__scroll">
            <div v-if="filteredIcons.length > 0" class="at-icon-select__grid">
              <ElTooltip
                v-for="item in filteredIcons"
                :key="item.name"
                :content="item.label ? `${item.name} (${item.label})` : item.name"
                placement="top"
              >
                <div
                  :class="['at-icon-select__item', modelValue === item.name && 'is-active']"
                  @click="handleSelect(item)"
                >
                  <slot name="icon" :item="item" :selected="modelValue === item.name">
                    <svg
                      v-if="item.svgPath"
                      viewBox="0 0 1024 1024"
                      width="1.2em"
                      height="1.2em"
                      v-html="item.svgPath"
                    />
                    <span v-else class="icon-fallback">{{ item.name.slice(0, 2) }}</span>
                  </slot>
                </div>
              </ElTooltip>
            </div>
            <ElEmpty v-else description="未找到匹配图标" :image-size="40" />
          </ElScrollbar>
        </div>
      </ElPopover>
    </template>

    <!-- Dialog 弹窗模式 -->
    <template v-else>
      <div class="at-icon-select__trigger" @click="!disabled && (visible = true)">
        <ElInput
          ref="inputRef"
          :model-value="modelValue"
          :placeholder="placeholder"
          :disabled="disabled"
          :size="size"
          readonly
          :clearable="clearable"
          @clear="handleClear"
        >
          <template #prefix>
            <slot name="prefix">
              <span v-if="currentIconItem?.svgPath" class="at-icon-select__preview">
                <svg
                  viewBox="0 0 1024 1024"
                  width="1em"
                  height="1em"
                  v-html="currentIconItem.svgPath"
                />
              </span>
            </slot>
          </template>
        </ElInput>
      </div>

      <ElDialog
        v-model="visible"
        title="选择图标"
        width="540px"
        append-to-body
        class="at-icon-select__dialog"
      >
        <div class="at-icon-select__panel is-dialog">
          <div class="at-icon-select__search">
            <ElInput
              v-model="searchKeyword"
              placeholder="搜索图标名称 / 拼音 / 中文..."
              clearable
            />
          </div>

          <ElScrollbar max-height="340px" class="at-icon-select__scroll">
            <div v-if="filteredIcons.length > 0" class="at-icon-select__grid is-dialog">
              <ElTooltip
                v-for="item in filteredIcons"
                :key="item.name"
                :content="item.label ? `${item.name} (${item.label})` : item.name"
                placement="top"
              >
                <div
                  :class="['at-icon-select__item', modelValue === item.name && 'is-active']"
                  @click="handleSelect(item)"
                >
                  <svg
                    v-if="item.svgPath"
                    viewBox="0 0 1024 1024"
                    width="1.3em"
                    height="1.3em"
                    v-html="item.svgPath"
                  />
                  <span class="item-name">{{ item.name }}</span>
                </div>
              </ElTooltip>
            </div>
            <ElEmpty v-else description="未找到匹配图标" :image-size="60" />
          </ElScrollbar>
        </div>
      </ElDialog>
    </template>
  </div>
</template>

<style scoped lang="scss">
.at-icon-select {
  display: inline-block;
  width: 100%;
  box-sizing: border-box;

  &__trigger {
    cursor: pointer;
  }

  &__preview {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--el-color-primary);
    font-size: 14px;
    margin-right: 4px;
  }

  &__preview-text {
    font-weight: 600;
    font-size: 13px;
    color: var(--el-color-primary);
  }
}

.at-icon-select__panel {
  display: flex;
  flex-direction: column;
  gap: 10px;

  .at-icon-select__search {
    padding-bottom: 4px;
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
}
</style>
