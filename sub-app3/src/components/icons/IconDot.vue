<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="12" r="4" />
  </svg>
</template>

<script setup lang="ts">
defineProps<{ size?: number | string }>()
</script>
