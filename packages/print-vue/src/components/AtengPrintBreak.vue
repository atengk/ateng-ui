<script setup lang="ts">
/**
 * 物理强制分页占位组件。
 *
 * 以声明式虚拟节点形式在单据排版中显式注入物理分页断点。
 *
 * @author Ateng
 * @since 2026-11-10
 */
</script>

<template>
  <div class="at-print-break" aria-hidden="true" />
</template>

<style scoped>
.at-print-break {
  display: block;
  height: 0;
  margin: 0;
  padding: 0;
  border: none;
  page-break-after: always;
  break-after: page;
}

@media screen {
  .at-print-break {
    border-top: 1px dashed var(--at-print-border-color, #cbd5e1);
    margin: 10px 0;
    position: relative;
  }
}
</style>
