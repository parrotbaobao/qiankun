<template>
  <div class="card-app">
    <h2>👤 用户卡片</h2>
    <nav class="sub-nav">
      <router-link to="/">用户列表</router-link>
      <router-link to="/add">添加用户</router-link>
    </nav>
    <router-view />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useUsers } from './store.js'

const { mainUser, sendToMain } = useUsers()
const bus = window.$wujie?.bus

function onMainMsg(data) {
  mainUser.value = data.username
  sendToMain(`收到主应用消息，用户: ${data.username}`)
}

onMounted(() => {
  const props = window.$wujie?.props
  if (props?.username) mainUser.value = props.username
  bus?.$on('main-to-sub', onMainMsg)
})

onUnmounted(() => {
  bus?.$off('main-to-sub', onMainMsg)
})
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
.card-app {
  max-width: 420px; margin: 24px auto; padding: 24px;
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  border-radius: 16px; color: #fff;
}
h2 { margin-bottom: 10px; font-size: 22px; }
.sub-nav {
  display: flex; gap: 6px; margin-bottom: 14px;
}
.sub-nav a {
  padding: 5px 14px; border-radius: 8px; font-size: 13px;
  color: rgba(255,255,255,0.7); text-decoration: none;
  background: rgba(255,255,255,0.1); transition: all 0.2s;
}
.sub-nav a:hover { background: rgba(255,255,255,0.2); }
.sub-nav a.router-link-active {
  background: rgba(255,255,255,0.3); color: #fff; font-weight: 600;
}
.from-main {
  margin-bottom: 12px; padding: 6px 12px; border-radius: 6px;
  background: rgba(255,255,255,0.15); font-size: 12px; opacity: 0.9;
}
.cards { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
.card {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 14px; border-radius: 10px;
  background: rgba(255,255,255,0.15); cursor: pointer;
  transition: all 0.2s; text-decoration: none; color: #fff;
}
.card:hover { background: rgba(255,255,255,0.3); }
.avatar {
  width: 40px; height: 40px; border-radius: 50%;
  background: rgba(255,255,255,0.3); display: flex;
  align-items: center; justify-content: center;
  font-size: 18px; font-weight: 700;
}
.info { flex: 1; }
.name { font-weight: 600; font-size: 15px; }
.role { font-size: 12px; opacity: 0.8; }
.status { font-size: 12px; padding: 3px 10px; border-radius: 12px; }
.status.online { background: rgba(46,213,115,0.4); }
.status.offline { background: rgba(255,255,255,0.15); opacity: 0.6; }
</style>
