<script setup lang="ts">
/**
 * 企业级字典单选框组组件。
 *
 * 核心特性：
 * 1. 深度集成 DictManager 单例，自动按 dict-code 加载字典项；
 * 2. 支持普通单选（el-radio）与按钮风格（el-radio-button）一键切换（:button="true"）；
 * 3. 完整支持尺寸自适应、整体禁用与三级回退数据源；
 * 4. 显式收敛对外暴露 refresh() 强制刷新接口与 radioGroupRef 原生实例。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { ref, shallowRef, computed, watch, onMounted } from 'vue';
import { ElRadioGroup, ElRadio, ElRadioButton } from 'element-plus';
import type {
  AtengDictRadioProps,
  AtengDictRadioEmits,
  AtengDictRadioExpose,
  DictItem,
} from './types';
import { DictManager } from './DictManager';

defineOptions({
  name: 'AtengDictRadio',
});

const props = withDefaults(defineProps<AtengDictRadioProps>(), {
  dictCode: '',
  loader: undefined,
  options: undefined,
  modelValue: undefined,
  button: false,
  size: undefined,
  disabled: false,
  autoLoad: true,
});

const emit = defineEmits<AtengDictRadioEmits>();

const radioGroupRef = shallowRef<InstanceType<typeof ElRadioGroup> | null>(null);
const internalItems = shallowRef<DictItem[]>([]);
const internalLoading = ref(false);

const effectiveItems = computed<DictItem[]>(() => {
  if (Array.isArray(props.options) && props.options.length > 0) {
    return props.options;
  }
  return internalItems.value;
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

function handleChange(val: string | number | boolean | undefined): void {
  emit('update:modelValue', val);
  emit('change', val);
}

defineExpose<AtengDictRadioExpose>({
  refresh,
  radioGroupRef,
  dictItems: effectiveItems,
  isLoading: internalLoading,
});
</script>

<template>
  <el-radio-group
    ref="radioGroupRef"
    class="at-dict-radio"
    :model-value="modelValue"
    :size="size"
    :disabled="disabled"
    v-bind="$attrs"
    @update:model-value="handleChange"
  >
    <template v-if="button">
      <el-radio-button
        v-for="item in effectiveItems"
        :key="String(item.value)"
        :value="item.value"
        :disabled="item.disabled"
        :class="item.cssClass"
      >
        <slot name="radio" :item="item">
          <span>{{ item.label }}</span>
        </slot>
      </el-radio-button>
    </template>
    <template v-else>
      <el-radio
        v-for="item in effectiveItems"
        :key="String(item.value)"
        :value="item.value"
        :disabled="item.disabled"
        :class="item.cssClass"
      >
        <slot name="radio" :item="item">
          <span>{{ item.label }}</span>
        </slot>
      </el-radio>
    </template>
  </el-radio-group>
</template>

<style scoped lang="scss">
.at-dict-radio {
  display: inline-flex;
  flex-wrap: wrap;
  gap: var(--el-space-base, 8px);
}
</style>
