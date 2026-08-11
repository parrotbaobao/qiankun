<!-- 状态栏用的小停止方块 -->
<template>
  <svg :width="size" :height="size" viewBox="0 0 12 12" fill="currentColor">
    <rect x="2" y="2" width="8" height="8" rx="1.5" />
  </svg>
</template>

<script setup lang="ts">
defineProps<{ size?: number | string }>()
</script>
