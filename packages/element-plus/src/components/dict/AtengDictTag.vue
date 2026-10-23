<script setup lang="ts">
/**
 * 企业级字典彩色状态标签展示组件。
 *
 * 核心特性：
 * 1. 深度集成 DictManager 单例，根据业务编码自动加载字典配置；
 * 2. 支持自定义 fieldNames 映射与 labelField/valueField 快捷属性，结合安全回退链防呆；
 * 3. 支持 valueType="auto" 弱比对防呆，消除整型 1 与字符 '1' 不匹配导致的标签匹配落空；
 * 4. 自动根据字典项配置的 tagType（success/warning/info/danger/primary）映射渲染 Element Plus 彩色 Tag；
 * 5. 完整支持单值、多值数组以及逗号分隔多值字符串（如 '1,2'）；
 * 6. 空安全保底机制：空值/无数据时保底展示 '-'，未匹配项优雅降级展示原值；
 * 7. 显式收敛对外暴露 refresh() 强制刷新接口与当前匹配项目。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { ref, shallowRef, computed, watch, onMounted } from 'vue';
import { ElTag } from 'element-plus';
import type { AtengDictTagProps, AtengDictTagExpose, DictItem } from './types';
import { DictManager } from './DictManager';
import { normalizeDictItems, isDictValueMatched } from './utils';

defineOptions({
  name: 'AtengDictTag',
});

const props = withDefaults(defineProps<AtengDictTagProps>(), {
  dictCode: '',
  loader: undefined,
  options: undefined,
  fieldNames: undefined,
  labelField: undefined,
  valueField: undefined,
  tagTypeField: undefined,
  disabledField: undefined,
  valueType: 'auto',
  value: undefined,
  size: undefined,
  effect: 'light',
  round: false,
  separator: ',',
  emptyText: '-',
  autoLoad: true,
});

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

/**
 * 将任意格式的绑定值规范化为扁平字符串/数字原始值数组。
 */
const normalizedValues = computed<Array<string | number | boolean>>(() => {
  const val = props.value;
  if (val === null || val === undefined || val === '') {
    return [];
  }
  if (Array.isArray(val)) {
    return val.filter(v => v !== null && v !== undefined && v !== '');
  }
  if (typeof val === 'string' && props.separator && val.includes(props.separator)) {
    return val
      .split(props.separator)
      .map(part => part.trim())
      .filter(part => part.length > 0);
  }
  return [val];
});

/**
 * 根据原始值与字典配置计算匹配出的结果列表。
 */
const matchingItems = computed<DictItem[]>(() => {
  const values = normalizedValues.value;
  if (values.length === 0) {
    return [];
  }

  const items = effectiveItems.value;
  return values.map(v => {
    const matched = items.find(item => isDictValueMatched(item.value, v, props.valueType));
    if (matched) {
      return matched;
    }
    // 未匹配成功时的安全回退：原样作为普通 Tag 渲染
    return {
      label: String(v),
      value: v,
      tagType: undefined,
    };
  });
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

defineExpose<AtengDictTagExpose>({
  refresh,
  dictItems: effectiveItems,
  matchingItems,
  isLoading: internalLoading,
});
</script>

<template>
  <span class="at-dict-tag" v-bind="$attrs">
    <template v-if="normalizedValues.length === 0">
      <slot name="empty">
        <span class="at-dict-tag__empty">{{ emptyText }}</span>
      </slot>
    </template>
    <template v-else>
      <el-tag
        v-for="item in matchingItems"
        :key="String(item.value)"
        class="at-dict-tag__item"
        :class="item.cssClass"
        :type="item.tagType"
        :size="size"
        :effect="effect"
        :round="round"
      >
        <slot :item="item">
          {{ item.label }}
        </slot>
      </el-tag>
    </template>
  </span>
</template>

<style scoped lang="scss">
.at-dict-tag {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--el-space-base, 6px);
  vertical-align: middle;

  &__empty {
    color: var(--el-text-color-placeholder);
  }
}
</style>
