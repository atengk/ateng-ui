<script setup lang="ts">
/**
 * SubFormTableBoard：嵌套排版与动态子表单明细表交互看板。
 *
 * 对应 ADR-0044、Issue #302 核心看板四：
 * 验证容器二分法模型：LayoutContainer（Grid/Card 纯排版平铺）与 DataContainer（SubForm 独立数组分支与行作用域）。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import SubFormScenario from './SubFormScenario.vue';
</script>

<template>
  <SubFormScenario />
</template>
