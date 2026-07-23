import { createRouter, createWebHistory } from 'vue-router'
import Counter from './views/Counter.vue'
import History from './views/History.vue'
import Calculator from './views/Calculator.vue'

const routes = [
  { path: '/', name: 'counter', component: Counter },
  { path: '/history', name: 'history', component: History },
  { path: '/calculator', name: 'calculator', component: Calculator },
]

export function createAppRouter() {
  return createRouter({ history: createWebHistory(), routes })
}
