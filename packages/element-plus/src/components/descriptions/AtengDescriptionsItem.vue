<script setup lang="ts">
/**
 * 结构化数据详情声明式子组件。
 *
 * 用于在 AtengDescriptions 内部以 Vue SFC 模板形式声明单项配置。
 *
 * @author Ateng
 * @since 2026-10-21
 */

import type { AtengDescriptionsItemProps } from './types';

defineOptions({
  name: 'AtengDescriptionsItem',
});

withDefaults(defineProps<AtengDescriptionsItemProps>(), {
  label: '',
  span: 1,
  width: undefined,
  minWidth: undefined,
  align: undefined,
  labelAlign: undefined,
  className: '',
  labelClassName: '',
  mask: undefined,
  maskChar: '*',
  type: undefined,
  currencyPrecision: 2,
  currencySymbol: '￥',
  dictCode: undefined,
  emptyText: undefined,
  formatter: undefined,
});
</script>

<template>
  <slot />
</template>
