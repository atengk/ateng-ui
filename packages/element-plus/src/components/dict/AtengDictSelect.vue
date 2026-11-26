<script setup lang="ts">
/**
 * 企业级字典下拉选择组件。
 *
 * 核心特性：
 * 1. 深度集成 DictManager 单例，支持输入 dict-code 自动加载与飞行中请求去重合并；
 * 2. 支持自定义 fieldNames 映射与 labelField/valueField 快捷属性，结合安全回退链防呆；
 * 3. 支持 valueType="auto" 弱比对防呆，消除整型 1 与字符 '1' 不匹配导致的回显失效；
 * 4. 支持三级数据源回退（静态 options > 局部 loader > 全局 provider）；
 * 5. 完整支持单选与多选（multiple），集成一键清空、筛选搜索与空安全保底；
 * 6. 显式收敛对外暴露 refresh() 强制穿透刷新接口与 selectRef 原生实例。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { shallowRef, computed } from 'vue';
import { ElSelect, ElOption } from 'element-plus';
import type {
  AtengDictSelectProps,
  AtengDictSelectEmits,
  AtengDictSelectSlots,
  AtengDictSelectExpose,
} from './types';
import { coerceToMatchedValue } from './utils';
import { useDictSource } from './useDictSource';

defineOptions({
  name: 'AtengDictSelect',
});

const props = withDefaults(defineProps<AtengDictSelectProps>(), {
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
  multiple: false,
  placeholder: '请选择',
  disabled: false,
  clearable: true,
  filterable: true,
  size: undefined,
  loading: undefined,
  collapseTags: false,
  maxCollapseTags: 1,
  autoLoad: true,
});

const emit = defineEmits<AtengDictSelectEmits>();
defineSlots<AtengDictSelectSlots>();

const selectRef = shallowRef<InstanceType<typeof ElSelect> | null>(null);
const { effectiveItems, internalLoading, refresh } = useDictSource(props);

const effectiveLoading = computed(() => {
  return typeof props.loading === 'boolean' ? props.loading : internalLoading.value;
});

/**
 * 根据 valueType 与有效选项计算交付给底层 ElSelect 的绑定值。
 * 确保外部即使是 '1' 而选项值是 1 时，也能精准高亮并回显 label。
 */
const selectBoundValue = computed(() => {
  const val = props.modelValue;
  if (val === undefined || val === null || val === '') {
    return val;
  }

  if (props.multiple) {
    if (!Array.isArray(val)) {
      return [];
    }
    return val.map(itemVal => coerceToMatchedValue(itemVal, effectiveItems.value, props.valueType));
  }

  if (Array.isArray(val)) {
    return undefined;
  }

  return coerceToMatchedValue(val, effectiveItems.value, props.valueType);
});

function handleChange(
  val: string | number | boolean | Array<string | number | boolean> | undefined,
): void {
  let coercedVal = val;
  if (props.valueType === 'number') {
    if (Array.isArray(val)) {
      coercedVal = val.map(Number);
    } else if (val !== undefined && val !== null && val !== '') {
      coercedVal = Number(val);
    }
  } else if (props.valueType === 'string') {
    if (Array.isArray(val)) {
      coercedVal = val.map(String);
    } else if (val !== undefined && val !== null) {
      coercedVal = String(val);
    }
  } else if (props.valueType === 'auto') {
    // 尽量保持外部初始绑定值的类型习惯
    if (typeof props.modelValue === 'string') {
      if (Array.isArray(val)) {
        coercedVal = val.map(String);
      } else if (val !== undefined && val !== null) {
        coercedVal = String(val);
      }
    } else if (typeof props.modelValue === 'number') {
      if (Array.isArray(val)) {
        coercedVal = val.map(Number);
      } else if (val !== undefined && val !== null && val !== '') {
        coercedVal = Number(val);
      }
    }
  }

  emit('update:modelValue', coercedVal);
  emit('change', coercedVal);
}

function handleClear(): void {
  emit('clear');
}

function bindSelectRef(el: unknown): void {
  selectRef.value = el as InstanceType<typeof ElSelect> | null;
}

defineExpose<AtengDictSelectExpose>({
  refresh,
  selectRef,
  dictItems: effectiveItems,
  isLoading: effectiveLoading,
});
</script>

<template>
  <el-select
    :ref="bindSelectRef"
    class="at-dict-select"
    :model-value="selectBoundValue"
    :multiple="multiple"
    :placeholder="placeholder"
    :disabled="disabled"
    :clearable="clearable"
    :filterable="filterable"
    :size="size"
    :loading="effectiveLoading"
    :collapse-tags="collapseTags"
    :max-collapse-tags="maxCollapseTags"
    v-bind="$attrs"
    @update:model-value="handleChange"
    @clear="handleClear"
  >
    <el-option
      v-for="item in effectiveItems"
      :key="String(item.value)"
      :label="item.label"
      :value="item.value"
      :disabled="item.disabled"
      :class="item.cssClass"
    >
      <slot name="option" :item="item">
        <span>{{ item.label }}</span>
      </slot>
    </el-option>

    <template v-if="$slots.prefix" #prefix>
      <slot name="prefix" />
    </template>
    <template v-if="$slots.empty" #empty>
      <slot name="empty" />
    </template>
  </el-select>
</template>

<style scoped lang="scss">
.at-dict-select {
  display: inline-block;
  width: 100%;
}
</style>
