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

import { ref, shallowRef, computed, watch, onMounted } from 'vue';
import { ElSelect, ElOption } from 'element-plus';
import type {
  AtengDictSelectProps,
  AtengDictSelectEmits,
  AtengDictSelectExpose,
  DictItem,
} from './types';
import { DictManager } from './DictManager';
import { normalizeDictItems, coerceToMatchedValue } from './utils';

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

const selectRef = shallowRef<InstanceType<typeof ElSelect> | null>(null);
const internalItems = shallowRef<unknown[]>([]);
const internalLoading = ref(false);

const effectiveLoading = computed(() => {
  return typeof props.loading === 'boolean' ? props.loading : internalLoading.value;
});

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

  return coerceToMatchedValue(val, effectiveItems.value, props.valueType);
});

/**
 * 核心数据拉取动作。
 *
 * @param force 是否强制穿透缓存重新获取
 */
async function fetchDictData(force: boolean = false): Promise<DictItem[]> {
  // 1. 若外部已提供静态 options，直接复用静态项
  if (Array.isArray(props.options) && props.options.length > 0) {
    internalItems.value = props.options;
    return effectiveItems.value;
  }

  // 2. 无字典编码且无局部 loader 时，保底清空
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
 * 供上层或外部 Ref 调用的强制穿透刷新接口。
 */
async function refresh(): Promise<DictItem[]> {
  return fetchDictData(true);
}

// 监听 dictCode 或 options 动态变更
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

defineExpose<AtengDictSelectExpose>({
  refresh,
  selectRef,
  dictItems: effectiveItems,
  isLoading: effectiveLoading,
});
</script>

<template>
  <el-select
    ref="selectRef"
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
