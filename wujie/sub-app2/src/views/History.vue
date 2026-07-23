<template>
  <div>
    <div class="history-list">
      <div class="h-item" v-for="(h, i) in reversed" :key="i">
        <span class="h-val" :class="{ positive: h.value > 0, negative: h.value < 0 }">{{ h.value }}</span>
        <span class="h-action">{{ h.action }}</span>
        <span class="h-time">{{ h.time }}</span>
      </div>
    </div>
    <p class="summary" v-if="!history.length">暂无记录</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useCounter } from '../store.js'

const { history } = useCounter()
const reversed = computed(() => [...history.value].reverse())
</script>

<style scoped>
.history-list { max-height: 260px; overflow-y: auto; }
.h-item {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 10px; margin-bottom: 4px;
  background: rgba(255,255,255,0.1); border-radius: 8px; font-size: 13px;
}
.h-val {
  font-weight: 700; min-width: 40px; text-align: center;
  padding: 2px 6px; border-radius: 4px;
}
.h-val.positive { background: rgba(46,213,115,0.3); }
.h-val.negative { background: rgba(245,87,108,0.3); }
.h-action { flex: 1; }
.h-time { font-size: 11px; opacity: 0.6; }
.summary { text-align: center; opacity: 0.7; font-size: 13px; }
</style>
