<script setup lang="ts">
/**
 * 企业级字典多选框组组件。
 *
 * 核心特性：
 * 1. 深度集成 DictManager 单例并发去重与纯内存常驻缓存；
 * 2. 双向解构支持：支持标准数组 v-model，亦支持配置 separator="," 双向绑定逗号分隔字符串；
 * 3. 视觉形态切换：支持普通多选（el-checkbox）与按钮风格（el-checkbox-button）一键切换（:button="true"）；
 * 4. 全选与半选快捷支持：支持 showCheckAll 展示全选复选框与 indeterminate 状态自适应；
 * 5. 显式收敛对外暴露 refresh() 强制穿透刷新接口与 dictItems 列表。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { ref, shallowRef, computed, watch, onMounted } from 'vue';
import { ElCheckboxGroup, ElCheckbox, ElCheckboxButton } from 'element-plus';
import type {
  AtengDictCheckboxProps,
  AtengDictCheckboxEmits,
  AtengDictCheckboxExpose,
  DictItem,
} from './types';
import { DictManager } from './DictManager';

defineOptions({
  name: 'AtengDictCheckbox',
});

const props = withDefaults(defineProps<AtengDictCheckboxProps>(), {
  dictCode: '',
  loader: undefined,
  options: undefined,
  modelValue: undefined,
  separator: undefined,
  button: false,
  showCheckAll: false,
  checkAllText: '全选',
  size: undefined,
  disabled: false,
  autoLoad: true,
});

const emit = defineEmits<AtengDictCheckboxEmits>();

const checkboxGroupRef = shallowRef<InstanceType<typeof ElCheckboxGroup> | null>(null);
const internalItems = shallowRef<DictItem[]>([]);
const internalLoading = ref(false);

const effectiveItems = computed<DictItem[]>(() => {
  if (Array.isArray(props.options) && props.options.length > 0) {
    return props.options;
  }
  return internalItems.value;
});

// 解构为供 ElCheckboxGroup 使用的内部数组
const internalCheckedValues = computed<Array<string | number | boolean>>(() => {
  if (Array.isArray(props.modelValue)) {
    return props.modelValue;
  }
  if (typeof props.modelValue === 'string' && props.separator) {
    return props.modelValue.trim() ? props.modelValue.split(props.separator) : [];
  }
  return [];
});

// 计算是否全选
const isAllChecked = computed<boolean>(() => {
  const items = effectiveItems.value;
  if (!items.length) {
    return false;
  }
  const currentStrValues = internalCheckedValues.value.map(String);
  return items.every(item => currentStrValues.includes(String(item.value)));
});

// 计算是否半选（indeterminate）
const isIndeterminate = computed<boolean>(() => {
  const count = internalCheckedValues.value.length;
  return count > 0 && !isAllChecked.value;
});

/**
 * 核心数据拉取动作。
 */
async function fetchDictData(force: boolean = false): Promise<DictItem[]> {
  if (Array.isArray(props.options) && props.options.length > 0) {
    internalItems.value = props.options;
    return props.options;
  }

  if (!props.dictCode && typeof props.loader !== 'function') {
    internalItems.value = [];
    return [];
  }

  internalLoading.value = true;
  try {
    const items = await DictManager.loadDict(props.dictCode, props.loader, force);
    internalItems.value = items;
    return items;
  } finally {
    internalLoading.value = false;
  }
}

/**
 * 强制穿透缓存刷新字典。
 */
async function refresh(): Promise<DictItem[]> {
  return fetchDictData(true);
}

// 选中项变动处理
function handleGroupChange(values: Array<string | number | boolean>): void {
  if (props.separator) {
    const stringVal = values.join(props.separator);
    emit('update:modelValue', stringVal);
    emit('change', stringVal);
  } else {
    emit('update:modelValue', values);
    emit('change', values);
  }
}

// 全选操作
function handleCheckAllChange(val: boolean): void {
  const shouldCheck = isIndeterminate.value ? true : val;
  const newValues = shouldCheck ? effectiveItems.value.map(item => item.value) : [];
  handleGroupChange(newValues);
}

watch(
  () => props.dictCode,
  newCode => {
    if (newCode && props.autoLoad) {
      fetchDictData(false);
    }
  },
);

watch(
  () => props.options,
  newOptions => {
    if (Array.isArray(newOptions)) {
      internalItems.value = newOptions;
    }
  },
);

onMounted(() => {
  if (props.autoLoad) {
    fetchDictData(false);
  }
});

defineExpose<AtengDictCheckboxExpose>({
  refresh,
  dictItems: effectiveItems,
  isLoading: internalLoading,
});
</script>

<template>
  <div class="at-dict-checkbox">
    <!-- 快捷全选 -->
    <div v-if="showCheckAll && effectiveItems.length > 0" class="at-dict-checkbox__check-all">
      <el-checkbox
        :model-value="isAllChecked"
        :indeterminate="isIndeterminate"
        :disabled="disabled"
        :size="size"
        @change="(v: any) => handleCheckAllChange(Boolean(v))"
      >
        <span>{{ checkAllText }}</span>
      </el-checkbox>
    </div>

    <!-- 复选框组主体 -->
    <el-checkbox-group
      ref="checkboxGroupRef"
      class="at-dict-checkbox__group"
      :model-value="internalCheckedValues"
      :size="size"
      :disabled="disabled"
      v-bind="$attrs"
      @update:model-value="(v: any) => handleGroupChange(v as Array<string | number | boolean>)"
    >
      <template v-if="button">
        <el-checkbox-button
          v-for="item in effectiveItems"
          :key="String(item.value)"
          :value="item.value"
          :disabled="item.disabled"
          :class="item.cssClass"
        >
          <slot name="checkbox" :item="item">
            <span>{{ item.label }}</span>
          </slot>
        </el-checkbox-button>
      </template>
      <template v-else>
        <el-checkbox
          v-for="item in effectiveItems"
          :key="String(item.value)"
          :value="item.value"
          :disabled="item.disabled"
          :class="item.cssClass"
        >
          <slot name="checkbox" :item="item">
            <span>{{ item.label }}</span>
          </slot>
        </el-checkbox>
      </template>
    </el-checkbox-group>
  </div>
</template>

<style scoped lang="scss">
.at-dict-checkbox {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--el-space-base, 12px);

  &__check-all {
    display: inline-flex;
    align-items: center;
    margin-right: 4px;
    padding-right: 8px;
    border-right: 1px solid var(--el-border-color-lighter);
  }

  &__group {
    display: inline-flex;
    flex-wrap: wrap;
    gap: var(--el-space-base, 8px);
  }
}
</style>
