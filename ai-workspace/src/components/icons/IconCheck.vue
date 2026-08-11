<template>
  <svg :width="size" :height="size" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2"
    stroke-linecap="round" stroke-linejoin="round">
    <polyline points="1.5 6 4.5 9 10.5 3" />
  </svg>
</template>

<script setup lang="ts">
defineProps<{ size?: number | string }>()
</script>
