import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { qiankunWindow } from 'vite-plugin-qiankun/dist/helper'

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
    component: () => import('../views/ai-chat/ChatPage.vue'),
  },
  {
    path: '/conversations',
    name: 'conversations',
    component: () => import('../views/ConversationsPage.vue'),
  },
  {
    path: '/ai',
    name: 'ai',
    component: () => import('../views/ai-chat/AiChat.vue'),
  },
  {
    // Tab1：用 @matechat/core npm 包的 McBubble + McInput + McMarkdownCard 搭建
    path: '/matechat-component',
    name: 'matechat-component',
    component: () => import('../views/MatechatComponent.vue'),
  },
  {
    // Tab2：用从 matechat 源码移植的 Bubble.vue / ChatInput.vue / MarkdownCard.vue 搭建
    path: '/matechat-source',
    name: 'matechat-source',
    component: () => import('../views/matechat-source/index.vue'),
  },
  {
    path: '/ui-demo',
    name: 'ui-demo',
    component: () => import('../views/UiDemo.vue'),
  },
  {
    path: '/virtual-scroller',
    name: 'virtual-scroller',
    component: () => import('../views/VirtualScrollerDemo.vue'),
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

// router.beforeEach(async (to, _from, next) => {
//   if (to.meta.public) return next()

//   const auth = useAuthStore()

//   if (auth.token && !auth.user) {
//     await auth.fetchMe()
//   }

//   if (!auth.isLoggedIn) {
//     return next({ name: 'login', query: { redirect: to.fullPath } })
//   }

//   next()
// })

export default router
