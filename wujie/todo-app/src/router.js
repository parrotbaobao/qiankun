import { createRouter, createWebHistory } from 'vue-router'
import TodoList from './views/TodoList.vue'
import DoneList from './views/DoneList.vue'
import TodoStats from './views/TodoStats.vue'

const routes = [
  { path: '/', name: 'todo', component: TodoList },
  { path: '/done', name: 'done', component: DoneList },
  { path: '/stats', name: 'stats', component: TodoStats },
]

export function createAppRouter() {
  return createRouter({ history: createWebHistory(), routes })
}
