<!-- 停止按钮用的方块 -->
<template>
  <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`" fill="currentColor">
    <rect :width="size" :height="size" rx="2" />
  </svg>
</template>

<script setup lang="ts">
const props = defineProps<{ size?: number | string }>()
</script>
