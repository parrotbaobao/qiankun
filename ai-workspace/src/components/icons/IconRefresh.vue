<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" :stroke-width="strokeWidth ?? 2"
    stroke-linecap="round" stroke-linejoin="round">
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 1 0 .49-3.1" />
  </svg>
</template>

<script setup lang="ts">
defineProps<{ size?: number | string; strokeWidth?: number | string }>()
</script>
