import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { qiankunWindow } from 'vite-plugin-qiankun/dist/helper'
import { useAuthStore } from '../stores/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/Login.vue'),
    meta: { public: true },
  },
  {
    path: '/prompts',
    name: 'prompts',
    component: () => import('../views/PromptList.vue'),
  },
  {
    path: '/chat/:id',
    name: 'chat',
    component: () => import('../views/ChatPage.vue'),
  },
  {
    path: '/ai',
    name: 'ai',
    component: () => import('../views/AiChat.vue'),
  },
  {
    path: '/ui-demo',
    name: 'ui-demo',
    component: () => import('../views/UiDemo.vue'),
  },
  {
    path: '/css-isolation-test',
    name: 'css-isolation-test',
    component: () => import('../views/CssIsolationTest.vue'),
    meta: { public: true },
  },
  {
    path: '/js-isolation-test',
    name: 'js-isolation-test',
    component: () => import('../views/JsIsolationTest.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    redirect: '/prompts',
  },
]

const router = createRouter({
  history: createWebHistory(
    qiankunWindow.__POWERED_BY_QIANKUN__ ? '/sub-app3/' : import.meta.env.BASE_URL,
  ),
  routes,
})

router.beforeEach(async (to, _from, next) => {
  if (to.meta.public) return next()

  const auth = useAuthStore()

  if (auth.token && !auth.user) {
    await auth.fetchMe()
  }

  if (!auth.isLoggedIn) {
    return next({ name: 'login', query: { redirect: to.fullPath } })
  }

  next()
})

export default router
