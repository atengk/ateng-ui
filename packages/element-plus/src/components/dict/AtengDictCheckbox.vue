<script setup lang="ts">
/**
 * 企业级字典多选框组组件。
 *
 * 核心特性：
 * 1. 深度集成 DictManager 单例并发去重与纯内存常驻缓存；
 * 2. 支持自定义 fieldNames 映射与 labelField/valueField 快捷属性，结合安全回退链防呆；
 * 3. 支持 valueType="auto" 弱比对防呆，消除整型 1 与字符 '1' 不匹配导致的选中回显失效；
 * 4. 双向解构支持：支持标准数组 v-model，亦支持配置 separator="," 双向绑定逗号分隔字符串；
 * 5. 视觉形态切换：支持普通多选（el-checkbox）与按钮风格（el-checkbox-button）一键切换（:button="true"），支持边框（border）；
 * 6. 全选与半选快捷支持：支持 showCheckAll 展示全选复选框与 indeterminate 状态自适应；
 * 7. 显式收敛对外暴露 refresh() 强制穿透刷新接口与 dictItems 列表。
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
import { normalizeDictItems, isDictValueMatched } from './utils';

defineOptions({
  name: 'AtengDictCheckbox',
});

const props = withDefaults(defineProps<AtengDictCheckboxProps>(), {
  dictCode: '',
  loader: undefined,
  options: undefined,
  fieldNames: undefined,
  labelField: undefined,
  valueField: undefined,
  tagTypeField: undefined,
  disabledField: undefined,
  valueType: 'auto',
  modelValue: undefined,
  separator: undefined,
  button: false,
  border: false,
  showCheckAll: false,
  checkAllText: '全选',
  size: undefined,
  disabled: false,
  autoLoad: true,
});

const emit = defineEmits<AtengDictCheckboxEmits>();

const checkboxGroupRef = shallowRef<InstanceType<typeof ElCheckboxGroup> | null>(null);
const internalItems = shallowRef<unknown[]>([]);
const internalLoading = ref(false);

const rawItems = computed<unknown[]>(() => {
  if (Array.isArray(props.options) && props.options.length > 0) {
    return props.options;
  }
  return internalItems.value;
});

const effectiveItems = computed<DictItem[]>(() => {
  return normalizeDictItems(rawItems.value, {
    fieldNames: props.fieldNames,
    labelField: props.labelField,
    valueField: props.valueField,
    tagTypeField: props.tagTypeField,
    disabledField: props.disabledField,
  });
});

// 解构为供 ElCheckboxGroup 使用的内部数组（支持 weak match 对齐真实 item.value）
const internalCheckedValues = computed<Array<string | number | boolean>>(() => {
  let rawList: Array<string | number | boolean> = [];
  if (Array.isArray(props.modelValue)) {
    rawList = props.modelValue;
  } else if (typeof props.modelValue === 'string' && props.separator) {
    const trimmed = props.modelValue.trim();
    if (trimmed) {
      rawList = trimmed
        .split(props.separator)
        .map(s => s.trim())
        .filter(Boolean);
    }
  }

  const items = effectiveItems.value;
  return rawList.map(rawVal => {
    const matched = items.find(item => isDictValueMatched(item.value, rawVal, props.valueType));
    return matched !== undefined ? matched.value : rawVal;
  });
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
    return effectiveItems.value;
  }

  if (!props.dictCode && typeof props.loader !== 'function') {
    internalItems.value = [];
    return [];
  }

  internalLoading.value = true;
  try {
    const items = await DictManager.loadDict(props.dictCode, props.loader, force);
    internalItems.value = items;
    return effectiveItems.value;
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
  let coercedValues: Array<string | number | boolean> = values;
  if (props.valueType === 'number') {
    coercedValues = values.map(Number);
  } else if (props.valueType === 'string') {
    coercedValues = values.map(String);
  } else if (props.valueType === 'auto') {
    if (Array.isArray(props.modelValue) && typeof props.modelValue[0] === 'string') {
      coercedValues = values.map(String);
    } else if (Array.isArray(props.modelValue) && typeof props.modelValue[0] === 'number') {
      coercedValues = values.map(Number);
    }
  }

  if (props.separator) {
    const stringVal = coercedValues.join(props.separator);
    emit('update:modelValue', stringVal);
    emit('change', stringVal);
  } else {
    emit('update:modelValue', coercedValues);
    emit('change', coercedValues);
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
  () => props.loader,
  newLoader => {
    if (typeof newLoader === 'function' && props.autoLoad) {
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
        @change="(v: unknown) => handleCheckAllChange(Boolean(v))"
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
      @update:model-value="
        (v: unknown) =>
          handleGroupChange(Array.isArray(v) ? (v as Array<string | number | boolean>) : [])
      "
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
          :border="border"
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
