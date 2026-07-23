<template>
  <div>
    <div class="calc-display">{{ display || '0' }}</div>
    <div class="calc-grid">
      <button v-for="key in keys" :key="key" :class="{ op: isOp(key), wide: key === '=' }" @click="press(key)">
        {{ key }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useCounter } from '../store.js'

const { sendToMain } = useCounter()

const display = ref('')
const keys = ['7','8','9','+','4','5','6','-','1','2','3','×','C','0','.','/','=']

function isOp(k) { return ['+','-','×','/','C','='].includes(k) }

function press(key) {
  if (key === 'C') {
    display.value = ''
  } else if (key === '=') {
    try {
      const expr = display.value.replace(/×/g, '*')
      const result = Function('"use strict"; return (' + expr + ')')()
      sendToMain(`计算: ${display.value} = ${result}`)
      display.value = String(result)
    } catch {
      display.value = 'Error'
    }
  } else {
    display.value += key
  }
}
</script>

<style scoped>
.calc-display {
  background: rgba(0,0,0,0.2); border-radius: 10px;
  padding: 14px 16px; margin-bottom: 12px;
  font-size: 24px; font-weight: 600; text-align: right;
  min-height: 52px; word-break: break-all;
}
.calc-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
.calc-grid button {
  padding: 12px; border: none; border-radius: 8px;
  background: rgba(255,255,255,0.15); color: #fff;
  font-size: 16px; font-weight: 600; cursor: pointer;
  transition: background 0.15s;
}
.calc-grid button:hover { background: rgba(255,255,255,0.3); }
.calc-grid button.op { background: rgba(255,255,255,0.25); }
</style>
