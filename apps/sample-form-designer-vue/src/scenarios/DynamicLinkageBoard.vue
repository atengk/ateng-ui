<script setup lang="ts">
/**
 * DynamicLinkageBoard：高级动态联动与算术公式计算交互看板。
 *
 * 对应 ADR-0044、Issue #302 核心看板三：
 * 验证零 eval 纯 AST 安全算术公式解释器（加减乘除括号取模四则运算）与显隐/禁用/必填联动响应。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import DynamicRuleScenario from './DynamicRuleScenario.vue';
</script>

<template>
  <DynamicRuleScenario />
</template>
