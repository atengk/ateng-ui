<script setup lang="ts">
import { ElButton, ElCard } from 'element-plus';
import { VERSION as EL_PKG_VERSION } from '@atengk/element-plus';
</script>

<template>
  <main style="padding: 24px">
    <ElCard header="sample-element-plus 基础设施全特性自验展厅">
      <p>@atengk/element-plus 版本: {{ EL_PKG_VERSION }}</p>
      <ElButton type="primary">Element Plus 连通性测试</ElButton>
    </ElCard>
  </main>
</template>
