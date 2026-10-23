<script setup lang="ts" generic="T extends Record<string, unknown> = Record<string, unknown>">
/**
 * 企业级结构化数据详情展示组件。
 *
 * 核心特性：
 * 1. 渐进混合架构：SFC 模板插槽（<AtengDescriptionsItem>）优先，兼顾 Schema（:items）配置驱动；
 * 2. 声明式脱敏管道：内置 phone、idCard、email、name、bankCard，复用 @atengk/core 纯函数；
 * 3. 格式化管道与字典内生：支持 currency（金额千分位）、date 格式化，支持 dictCode 自动转 AtengDictTag；
 * 4. 严格空安全防御不变量：null、undefined 或空值强制保底渲染为 '-'（可配置 emptyText）；
 * 5. Vue 3.5 SFC 原生泛型 <T> 强类型打通。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import { computed, useSlots, ref, onUnmounted, Fragment, type VNode, type Slot } from 'vue';
import { ElDescriptions, ElDescriptionsItem, ElTooltip } from 'element-plus';
import {
  formatMask,
  formatMaskPhone,
  formatMaskIdCard,
  formatMaskEmail,
  formatMaskName,
  formatCurrency,
} from '@atengk/core';
import type {
  AtengDescriptionsProps,
  AtengDescriptionsSlots,
  DescriptionsItemConfig,
} from './types';
import AtengDictTag from '../dict/AtengDictTag.vue';
import { writeClipboard } from '../../directives/copy';

defineOptions({
  name: 'AtengDescriptions',
});

const props = withDefaults(defineProps<AtengDescriptionsProps<T>>(), {
  data: () => ({}) as T,
  items: undefined,
  title: '',
  extra: '',
  border: true,
  column: 3,
  direction: 'horizontal',
  size: undefined,
  copyable: false,
  emptyText: '--',
});

const slots = useSlots() as AtengDescriptionsSlots<T>;
defineSlots<AtengDescriptionsSlots<T>>();
const slotRenderers = new Map<string, Slot>();

/**
 * 递归扁平化遍历默认插槽 VNode 节点树，提取 DescriptionsItem 元数据与作用域插槽。
 */
function extractItemsFromVNodes(vnodes: VNode[]): DescriptionsItemConfig<T>[] {
  const result: DescriptionsItemConfig<T>[] = [];

  for (const vnode of vnodes) {
    if (!vnode) {
      continue;
    }

    if (vnode.type === Fragment && Array.isArray(vnode.children)) {
      result.push(...extractItemsFromVNodes(vnode.children as VNode[]));
    } else if (vnode.type && typeof vnode.type === 'object') {
      const typeObj = vnode.type as { name?: string; __name?: string };
      const componentName = typeObj.name || typeObj.__name;

      if (componentName === 'AtengDescriptionsItem') {
        const p = (vnode.props || {}) as Record<string, unknown>;
        const propKey = String(p.prop || '');

        const config: DescriptionsItemConfig<T> = {
          prop: propKey,
          label: typeof p.label === 'string' ? p.label : undefined,
          span: Number(p.span || 1),
          width: p.width as string | number | undefined,
          minWidth: (p.minWidth || p['min-width']) as string | number | undefined,
          align: p.align as DescriptionsItemConfig<T>['align'],
          labelAlign: (p.labelAlign || p['label-align']) as DescriptionsItemConfig<T>['labelAlign'],
          className: String(p.className || p.class || ''),
          labelClassName: String(p.labelClassName || p['label-class-name'] || ''),
          mask: p.mask as DescriptionsItemConfig<T>['mask'],
          maskChar: String(p.maskChar || p['mask-char'] || '*'),
          type: p.type as DescriptionsItemConfig<T>['type'],
          currencyPrecision: Number(p.currencyPrecision || p['currency-precision'] || 2),
          currencySymbol: String(p.currencySymbol || p['currency-symbol'] || '￥'),
          dictCode: (p.dictCode || p['dict-code']) as string | undefined,
          emptyText: (p.emptyText || p['empty-text']) as string | undefined,
          copyable: p.copyable !== undefined ? Boolean(p.copyable) : undefined,
          formatter: p.formatter as DescriptionsItemConfig<T>['formatter'],
        };

        // 缓存子组件自身的内嵌插槽
        if (
          vnode.children &&
          typeof vnode.children === 'object' &&
          'default' in vnode.children &&
          typeof (vnode.children as { default?: Slot }).default === 'function'
        ) {
          const defaultSlot = (vnode.children as { default?: Slot }).default;
          if (defaultSlot) {
            slotRenderers.set(propKey, defaultSlot);
          }
        }

        result.push(config);
      }
    }
  }

  return result;
}

/**
 * 综合解析出的最终展示项列表。
 */
const resolvedItems = computed<DescriptionsItemConfig<T>[]>(() => {
  slotRenderers.clear();

  // 1. 若外部显式配置了 items Schema 列表，优先结合 items
  const schemaItems = Array.isArray(props.items) ? props.items : [];

  // 2. 解析默认插槽子组件
  const defaultSlotNodes = slots.default ? slots.default() : [];
  const vnodeItems = extractItemsFromVNodes(defaultSlotNodes);

  if (schemaItems.length > 0) {
    return schemaItems;
  }
  return vnodeItems;
});

function hasItemSlot(prop: string): boolean {
  return slotRenderers.has(prop);
}

function getItemSlot(prop: string): Slot | undefined {
  return slotRenderers.get(prop);
}

function getRawValue(prop: string): unknown {
  return props.data ? (props.data as Record<string, unknown>)[prop] : undefined;
}

function isEmptyValue(val: unknown): boolean {
  return val === null || val === undefined || val === '';
}

function isItemCopyable(item: DescriptionsItemConfig<T>): boolean {
  const rawVal = getRawValue(item.prop);
  if (isEmptyValue(rawVal)) {
    return false;
  }
  if (item.copyable !== undefined) {
    return Boolean(item.copyable);
  }
  return Boolean(props.copyable);
}

const copiedProp = ref<string | null>(null);
let copyTimer: ReturnType<typeof setTimeout> | null = null;

const handleCopy = async (item: DescriptionsItemConfig<T>) => {
  const rawVal = getRawValue(item.prop);
  if (isEmptyValue(rawVal)) {
    return;
  }

  // 严格恪守“内存真明文契约”，复制脱敏前的原始真实数据
  const textToCopy = typeof rawVal === 'object' ? JSON.stringify(rawVal) : String(rawVal);
  try {
    await writeClipboard(textToCopy);
    copiedProp.value = item.prop;
    if (copyTimer) {
      clearTimeout(copyTimer);
    }
    copyTimer = setTimeout(() => {
      if (copiedProp.value === item.prop) {
        copiedProp.value = null;
      }
    }, 1500);
  } catch {
    // 降级容错
  }
};

onUnmounted(() => {
  if (copyTimer) {
    clearTimeout(copyTimer);
  }
});

/**
 * 格式化单项展示文本（内置脱敏、金额千分位、日期与空安全保底）。
 */
function renderItemValue(item: DescriptionsItemConfig<T>): string {
  const rawVal = getRawValue(item.prop);

  // 1. 空安全保底：null、undefined 或空字符串强制回退为 '--'
  if (isEmptyValue(rawVal)) {
    return item.emptyText || props.emptyText;
  }

  // 2. 自定义格式化计算函数
  if (typeof item.formatter === 'function') {
    return item.formatter(rawVal, (props.data || {}) as T);
  }

  // 3. 声明式脱敏管道处理
  if (item.mask) {
    const str = String(rawVal);
    const char = item.maskChar || '*';
    switch (item.mask) {
      case 'phone':
        return formatMaskPhone(str, char);
      case 'idCard':
        return formatMaskIdCard(str, 6, 4, char);
      case 'email':
        return formatMaskEmail(str, char);
      case 'name':
        return formatMaskName(str, char);
      case 'bankCard':
        return formatMask(str, 4, 4, char);
      default:
        return str;
    }
  }

  // 4. 预置格式化：金额千分位
  if (item.type === 'currency') {
    return formatCurrency(rawVal as number | string, {
      symbol: item.currencySymbol ?? '￥',
      precision: item.currencyPrecision ?? 2,
    });
  }

  // 5. 预置格式化：日期展示
  if (item.type === 'date') {
    if (rawVal instanceof Date) {
      return rawVal.toLocaleString();
    }
    return String(rawVal);
  }

  return String(rawVal);
}
</script>

<template>
  <el-descriptions
    class="at-descriptions"
    :title="title"
    :extra="extra"
    :border="border"
    :column="column"
    :direction="direction"
    :size="size"
    v-bind="$attrs"
  >
    <template v-if="$slots.title" #title>
      <slot name="title" />
    </template>
    <template v-if="$slots.extra" #extra>
      <slot name="extra" />
    </template>

    <el-descriptions-item
      v-for="item in resolvedItems"
      :key="item.prop"
      :label="item.label"
      :span="item.span"
      :width="item.width"
      :min-width="item.minWidth"
      :align="item.align"
      :label-align="item.labelAlign"
      :class-name="item.className"
      :label-class-name="item.labelClassName"
    >
      <div class="at-descriptions__value-wrapper">
        <!-- 1. 容器级属性具名插槽（如 #phone="{ value, data }"） -->
        <slot
          v-if="$slots[item.prop]"
          :name="item.prop"
          :value="(data as Record<string, unknown>)?.[item.prop]"
          :data="data || ({} as T)"
        />
        <!-- 2. 子组件内嵌插槽（如 <AtengDescriptionsItem>custom</AtengDescriptionsItem>） -->
        <component
          :is="getItemSlot(item.prop)"
          v-else-if="hasItemSlot(item.prop)"
          :value="(data as Record<string, unknown>)?.[item.prop]"
          :data="data || ({} as T)"
        />
        <!-- 3. 字典联动模式（自动渲染为 AtengDictTag） -->
        <ateng-dict-tag
          v-else-if="item.dictCode"
          :dict-code="item.dictCode"
          :value="data?.[item.prop]"
          :empty-text="item.emptyText || emptyText"
        />
        <!-- 4. 纯文本格式化/脱敏/保底渲染 -->
        <span v-else class="at-descriptions__text">
          {{ renderItemValue(item) }}
        </span>

        <!-- 5. 一键复制按钮（仅在开启复制且非空数据时展示，恪守内存真明文契约） -->
        <el-tooltip
          v-if="isItemCopyable(item)"
          :content="copiedProp === item.prop ? '已复制' : '复制'"
          placement="top"
        >
          <button
            type="button"
            class="at-descriptions__copy-btn"
            :class="{ 'is-copied': copiedProp === item.prop }"
            :aria-label="copiedProp === item.prop ? '已复制' : '复制'"
            @click="handleCopy(item)"
          >
            <svg
              v-if="copiedProp === item.prop"
              class="at-descriptions__copy-icon is-success"
              viewBox="0 0 1024 1024"
              width="14"
              height="14"
              fill="currentColor"
            >
              <path
                d="M406.656 706.944L195.84 496.128a32 32 0 0 1 45.248-45.248l165.568 165.568 471.296-471.296a32 32 0 0 1 45.248 45.248L406.656 706.944z"
              />
            </svg>
            <svg
              v-else
              class="at-descriptions__copy-icon"
              viewBox="0 0 1024 1024"
              width="14"
              height="14"
              fill="currentColor"
            >
              <path
                d="M768 832a64 64 0 0 1-64 64H256a64 64 0 0 1-64-64V384a64 64 0 0 1 64-64h448a64 64 0 0 1 64 64v448z m-64-576V192a64 64 0 0 0-64-64H192a64 64 0 0 0-64 64v448a64 64 0 0 0 64 64h64V256h448z"
              />
            </svg>
          </button>
        </el-tooltip>
      </div>
    </el-descriptions-item>
  </el-descriptions>
</template>

<style scoped lang="scss">
.at-descriptions {
  width: 100%;

  &__value-wrapper {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    max-width: 100%;
  }

  &__text {
    word-break: break-all;
  }

  &__copy-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 2px;
    border: none;
    background: transparent;
    cursor: pointer;
    color: var(--el-text-color-secondary);
    border-radius: 4px;
    transition:
      color 0.2s,
      background-color 0.2s;
    line-height: 1;

    &:hover {
      color: var(--el-color-primary);
      background-color: var(--el-fill-color-light);
    }

    &.is-copied {
      color: var(--el-color-success);
    }
  }

  &__copy-icon {
    display: block;

    &.is-success {
      color: var(--el-color-success);
    }
  }
}
</style>
