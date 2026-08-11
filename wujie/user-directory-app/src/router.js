import { createRouter, createWebHistory } from 'vue-router'
import UserList from './views/UserList.vue'
import UserDetail from './views/UserDetail.vue'
import AddUser from './views/AddUser.vue'

const routes = [
  { path: '/', name: 'list', component: UserList },
  { path: '/detail/:name', name: 'detail', component: UserDetail },
  { path: '/add', name: 'add', component: AddUser },
]

export function createAppRouter() {
  return createRouter({ history: createWebHistory(), routes })
}
