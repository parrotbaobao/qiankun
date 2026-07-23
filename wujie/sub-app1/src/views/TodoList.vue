<template>
  <div>
    <div class="from-main" v-if="mainUser">来自主应用: <strong>{{ mainUser }}</strong></div>
    <div class="input-row">
      <input v-model="newTodo" @keyup.enter="addTodo" placeholder="输入待办事项..." />
      <button @click="addTodo">添加</button>
    </div>
    <ul>
      <li v-for="(todo, i) in pending" :key="i">
        <label>
          <input type="checkbox" @change="todo.done = true; notify('完成: ' + todo.text)" />
          <span>{{ todo.text }}</span>
        </label>
        <button class="del" @click="remove(todo)">✕</button>
      </li>
    </ul>
    <p class="summary" v-if="pending.length">待完成 {{ pending.length }} 项</p>
    <p class="summary" v-else>全部完成！</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useTodos } from '../store.js'

const { todos, mainUser, addTodo, newTodo, removeTodo, sendToMain } = useTodos()

const pending = computed(() => todos.value.filter(t => !t.done))

function remove(todo) {
  removeTodo(todo)
}

function notify(text) {
  sendToMain(text)
}
</script>
