<script setup lang="ts">
/**
 * WorkflowSynergyBoard：BPMN 审批流节点权限协同交互看板。
 *
 * 对应 ADR-0044、Issue #302 核心看板二：
 * 验证申请人、部门主管、财务总监多节点下的 editable / readonly / hidden / required 权限覆盖与纯前端展示态脱敏。
 *
 * @author Ateng
 * @since 2026-11-09
 */

import WorkflowSynergyScenario from './WorkflowSynergyScenario.vue';
</script>

<template>
  <WorkflowSynergyScenario />
</template>
