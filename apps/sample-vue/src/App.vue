<script setup lang="ts">
import { VERSION as VUE_PKG_VERSION } from '@atengk/vue';
import { VERSION as CORE_PKG_VERSION } from '@atengk/core';
</script>

<template>
  <main>
    <h1>sample-vue 自验工程</h1>
    <p>@atengk/core 版本: {{ CORE_PKG_VERSION }}</p>
    <p>@atengk/vue 版本: {{ VUE_PKG_VERSION }}</p>
  </main>
</template>
