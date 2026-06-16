<template>
  <svg :width="size" :height="size" viewBox="0 0 15 15" fill="none">
    <path d="M1.5 7.5h12M8 2l5.5 5.5L8 13" stroke="currentColor" stroke-width="1.8"
      stroke-linecap="round" stroke-linejoin="round" />
  </svg>
</template>

<script setup lang="ts">
defineProps<{ size?: number | string }>()
</script>
