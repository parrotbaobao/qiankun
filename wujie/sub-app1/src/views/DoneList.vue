<template>
  <div>
    <ul>
      <li v-for="(todo, i) in doneList" :key="i" class="done">
        <label>
          <input type="checkbox" checked @change="todo.done = false" />
          <span>{{ todo.text }}</span>
        </label>
        <button class="del" @click="removeTodo(todo)">✕</button>
      </li>
    </ul>
    <p class="summary" v-if="doneList.length">已完成 {{ doneList.length }} 项</p>
    <p class="summary" v-else>暂无已完成事项</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useTodos } from '../store.js'

const { todos, removeTodo } = useTodos()
const doneList = computed(() => todos.value.filter(t => t.done))
</script>
