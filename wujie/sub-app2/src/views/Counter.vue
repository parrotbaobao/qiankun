<template>
  <div>
    <div class="from-main" v-if="mainUser">来自主应用: <strong>{{ mainUser }}</strong></div>
    <div class="counter-display">{{ count }}</div>
    <div class="btn-row">
      <button @click="changeCount(-10)">-10</button>
      <button @click="changeCount(-1)">-1</button>
      <button class="reset" @click="resetCount">归零</button>
      <button @click="changeCount(1)">+1</button>
      <button @click="changeCount(10)">+10</button>
    </div>
    <div class="history-info">
      <p>最大值: {{ max }} / 最小值: {{ min }}</p>
    </div>
  </div>
</template>

<script setup>
import { useCounter } from '../store.js'
const { count, mainUser, max, min, changeCount, resetCount } = useCounter()
</script>

<style scoped>
.history-info { font-size: 13px; opacity: 0.85; text-align: center; }
</style>
