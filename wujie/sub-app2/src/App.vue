<template>
  <div class="counter-app">
    <h2>🎰 计数器</h2>
    <nav class="sub-nav">
      <router-link to="/">计数</router-link>
      <router-link to="/history">历史</router-link>
      <router-link to="/calculator">计算器</router-link>
    </nav>
    <router-view />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useCounter } from './store.js'

const { mainUser, sendToMain } = useCounter()
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
.counter-app {
  max-width: 380px; margin: 24px auto; padding: 32px 24px;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  border-radius: 16px; color: #fff; text-align: center;
}
h2 { margin-bottom: 10px; font-size: 22px; }
.sub-nav {
  display: flex; gap: 6px; justify-content: center; margin-bottom: 18px;
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
  margin-bottom: 14px; padding: 6px 12px; border-radius: 6px;
  background: rgba(255,255,255,0.15); font-size: 12px; opacity: 0.9;
}
.counter-display {
  font-size: 72px; font-weight: 700; line-height: 1;
  margin-bottom: 24px; text-shadow: 0 2px 8px rgba(0,0,0,0.15);
}
.btn-row { display: flex; gap: 8px; justify-content: center; margin-bottom: 20px; }
.btn-row button {
  padding: 10px 18px; border: none; border-radius: 10px;
  background: rgba(255,255,255,0.25); color: #fff;
  font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.2s;
}
.btn-row button:hover { background: rgba(255,255,255,0.4); transform: scale(1.05); }
.btn-row .reset { background: rgba(0,0,0,0.2); }
.btn-row .reset:hover { background: rgba(0,0,0,0.35); }
</style>
