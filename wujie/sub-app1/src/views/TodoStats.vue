<template>
  <div class="stats">
    <div class="stat-card">
      <div class="stat-num">{{ todos.length }}</div>
      <div class="stat-label">总任务</div>
    </div>
    <div class="stat-card">
      <div class="stat-num">{{ doneCount }}</div>
      <div class="stat-label">已完成</div>
    </div>
    <div class="stat-card">
      <div class="stat-num">{{ pendingCount }}</div>
      <div class="stat-label">待完成</div>
    </div>
    <div class="stat-card">
      <div class="stat-num">{{ rate }}%</div>
      <div class="stat-label">完成率</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useTodos } from '../store.js'

const { todos } = useTodos()
const doneCount = computed(() => todos.value.filter(t => t.done).length)
const pendingCount = computed(() => todos.value.filter(t => !t.done).length)
const rate = computed(() => todos.value.length ? Math.round(doneCount.value / todos.value.length * 100) : 0)
</script>

<style scoped>
.stats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.stat-card {
  background: rgba(255,255,255,0.15); border-radius: 10px;
  padding: 16px; text-align: center;
}
.stat-num { font-size: 32px; font-weight: 700; }
.stat-label { font-size: 12px; opacity: 0.7; margin-top: 4px; }
</style>
