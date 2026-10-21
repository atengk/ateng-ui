<script setup lang="ts">
/**
 * AtengIconSelect 通用图标选择器组件。
 *
 * 内置常用标准 SVG 图标集（零外部依赖），支持拼音与中文模糊检索、
 * Popover 浮窗与 Dialog 弹窗双模展现、网格分页极速渲染与一键复制代码。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { ref, computed } from 'vue';
import { ElInput, ElPopover, ElDialog, ElMessage } from 'element-plus';
import { DEFAULT_ICONS } from './icons-data';
import IconPanel from './IconPanel.vue';
import { writeClipboard } from '../../directives/copy';
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
  showCopy: true,
  pageSize: 36,
  customClass: '',
});

const emit = defineEmits<AtengIconSelectEmits>();
defineSlots<AtengIconSelectSlots>();

// 弹层状态
const visible = ref<boolean>(false);
const inputRef = ref<InstanceType<typeof ElInput> | null>(null);
const panelRef = ref<InstanceType<typeof IconPanel> | null>(null);

// 合并后的图标总集
const allIcons = computed<IconItem[]>(() => {
  if (props.customIcons && props.customIcons.length > 0) {
    return [...props.customIcons, ...DEFAULT_ICONS];
  }
  return DEFAULT_ICONS;
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

// 复制代码组件代码 <el-icon><IconName /></el-icon>
async function copyIconCode(name?: string): Promise<boolean> {
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

function handleCopy(code: string): void {
  emit('copy', code);
}

function open(): void {
  if (!props.disabled) visible.value = true;
}

function close(): void {
  visible.value = false;
}

function clear(): void {
  handleClear();
}

function focus(): void {
  inputRef.value?.focus();
}

defineExpose<AtengIconSelectExpose>({
  clear,
  focus,
  copyIconCode,
  getCurrentIcon: () => currentIconItem.value,
  open,
  close,
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
              <template #prefix>
                <slot name="prefix">
                  <span v-if="currentIconItem?.svgPath" class="at-icon-select__preview">
                    <!-- eslint-disable-next-line vue/no-v-html -->
                    <svg
                      viewBox="0 0 1024 1024"
                      width="1em"
                      height="1em"
                      v-html="currentIconItem.svgPath"
                    />
                  </span>
                  <component
                    :is="currentIconItem.component"
                    v-else-if="currentIconItem?.component"
                    class="at-icon-select__preview"
                  />
                  <span v-else-if="modelValue" class="at-icon-select__preview-text">
                    {{ modelValue.slice(0, 1) }}
                  </span>
                </slot>
              </template>
            </ElInput>
          </div>
        </template>

        <IconPanel
          ref="panelRef"
          :model-value="modelValue"
          :icons="allIcons"
          :show-copy="showCopy"
          :page-size="pageSize"
          :is-dialog="false"
          @select="handleSelect"
          @copy="handleCopy"
        />
      </ElPopover>
    </template>

    <!-- Dialog 弹窗模式 -->
    <template v-else>
      <div class="at-icon-select__trigger" @click="open">
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
                <!-- eslint-disable-next-line vue/no-v-html -->
                <svg
                  viewBox="0 0 1024 1024"
                  width="1em"
                  height="1em"
                  v-html="currentIconItem.svgPath"
                />
              </span>
              <component
                :is="currentIconItem.component"
                v-else-if="currentIconItem?.component"
                class="at-icon-select__preview"
              />
            </slot>
          </template>
        </ElInput>
      </div>

      <ElDialog
        v-model="visible"
        title="选择图标"
        width="560px"
        append-to-body
        class="at-icon-select__dialog"
      >
        <IconPanel
          ref="panelRef"
          :model-value="modelValue"
          :icons="allIcons"
          :show-copy="showCopy"
          :page-size="pageSize"
          :is-dialog="true"
          @select="handleSelect"
          @copy="handleCopy"
        />
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
</style>
