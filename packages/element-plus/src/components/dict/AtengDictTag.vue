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
 * 6. 空安全与冷加载防闪烁占位：空值优先展示 emptyText，冷加载窗口默认渲染 Zero-CLS 骨架胶囊，支持 text/raw 模式与 #loading 插槽；
 * 7. 显式收敛对外暴露 refresh() 强制刷新接口与当前匹配项目。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { computed } from 'vue';
import { ElTag } from 'element-plus';
import type { AtengDictTagProps, AtengDictTagSlots, AtengDictTagExpose, DictItem } from './types';
import { isDictValueMatched } from './utils';
import { useDictSource } from './useDictSource';

type ElTagType = 'primary' | 'success' | 'info' | 'warning' | 'danger';
const VALID_EL_TAG_TYPES: ReadonlySet<string> = new Set<ElTagType>([
  'primary',
  'success',
  'info',
  'warning',
  'danger',
]);

/**
 * 将字典项 tagType 归一化为 Element Plus ElTag 合法 type，过滤空串、纯空白与非法值。
 */
function resolveElTagType(tagType: unknown): ElTagType | undefined {
  if (typeof tagType !== 'string') {
    return undefined;
  }
  const normalized = tagType.trim();
  if (!normalized || !VALID_EL_TAG_TYPES.has(normalized)) {
    return undefined;
  }
  return normalized as ElTagType;
}

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
  loading: undefined,
  loadingMode: 'skeleton',
  loadingText: '--',
});

defineSlots<AtengDictTagSlots>();

const { effectiveItems, internalLoading, hasSettled, hasStaticOptions, hasAsyncSource, refresh } =
  useDictSource(props);

const effectiveLoading = computed<boolean>(() => {
  return typeof props.loading === 'boolean' ? props.loading : internalLoading.value;
});

/**
 * 判定当前是否应展示加载占位以抑制原始编码闪烁。
 * - 外部显式传入布尔 loading 时优先受控；
 * - 未显式传 loading 时，仅在无静态 options、存在有效异步源且当前数据源尚未就绪（!hasSettled）
 *   并且处于加载中或启用 autoLoad 时启用占位；手动 refresh() 已有旧数据时保留现有标签。
 */
const shouldShowLoadingPlaceholder = computed<boolean>(() => {
  if (typeof props.loading === 'boolean') {
    return props.loading;
  }
  if (hasStaticOptions.value || !hasAsyncSource.value || hasSettled.value) {
    return false;
  }
  return internalLoading.value || props.autoLoad;
});

const isPlaceholderSuppressed = computed<boolean>(() => {
  return shouldShowLoadingPlaceholder.value && props.loadingMode !== 'raw';
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
 * 在非 'raw' 加载占位抑制期返回空数组，保持暴露契约与视图状态一致。
 */
const matchingItems = computed<DictItem[]>(() => {
  const values = normalizedValues.value;
  if (values.length === 0 || isPlaceholderSuppressed.value) {
    return [];
  }

  const items = effectiveItems.value;
  return values.map(v => {
    const matched = items.find(item => isDictValueMatched(item.value, v, props.valueType));
    if (matched) {
      return matched;
    }
    // 已就绪但未匹配成功（或 raw 模式）时的安全回退：原样作为普通 Tag 渲染
    return {
      label: String(v),
      value: v,
      tagType: undefined,
    };
  });
});

defineExpose<AtengDictTagExpose>({
  refresh,
  dictItems: effectiveItems,
  matchingItems,
  isLoading: effectiveLoading,
});
</script>

<template>
  <span class="at-dict-tag" v-bind="$attrs">
    <template v-if="normalizedValues.length === 0">
      <slot name="empty">
        <span class="at-dict-tag__empty">{{ emptyText }}</span>
      </slot>
    </template>
    <template v-else-if="isPlaceholderSuppressed">
      <slot name="loading" :values="normalizedValues">
        <template v-if="loadingMode === 'text'">
          <span class="at-dict-tag__loading-text">{{ loadingText }}</span>
        </template>
        <template v-else>
          <span
            v-for="(val, idx) in normalizedValues"
            :key="`skeleton-${idx}-${String(val)}`"
            class="at-dict-tag__skeleton"
            :class="[size ? `is-${size}` : '', { 'is-round': round }]"
            aria-hidden="true"
          />
        </template>
      </slot>
    </template>
    <template v-else>
      <el-tag
        v-for="item in matchingItems"
        :key="String(item.value)"
        class="at-dict-tag__item"
        :class="item.cssClass"
        :type="resolveElTagType(item.tagType)"
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

  &__loading-text {
    color: var(--el-text-color-placeholder);
  }

  &__skeleton {
    display: inline-block;
    min-width: 48px;
    height: 24px;
    border-radius: var(--el-border-radius-base, 4px);
    background-color: var(--el-fill-color);
    animation: at-dict-tag-pulse 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    will-change: opacity;
    vertical-align: middle;

    &.is-small {
      min-width: 40px;
      height: 20px;
    }

    &.is-large {
      min-width: 56px;
      height: 32px;
    }

    &.is-round {
      border-radius: 9999px;
    }
  }
}

@keyframes at-dict-tag-pulse {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.45;
  }
}
</style>
