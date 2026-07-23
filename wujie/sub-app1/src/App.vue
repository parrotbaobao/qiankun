<template>
  <div class="todo-app">
    <h2>📝 待办清单</h2>
    <nav class="sub-nav">
      <router-link to="/">待办</router-link>
      <router-link to="/done">已完成</router-link>
      <router-link to="/stats">统计</router-link>
    </nav>
    <router-view />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useTodos } from './store.js'

const { mainUser, sendToMain } = useTodos()
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
.todo-app {
  max-width: 420px; margin: 24px auto; padding: 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
.input-row { display: flex; gap: 8px; margin-bottom: 16px; }
.input-row input {
  flex: 1; padding: 10px 14px; border: none; border-radius: 8px;
  font-size: 14px; outline: none;
}
.input-row button {
  padding: 10px 18px; border: none; border-radius: 8px;
  background: rgba(255,255,255,0.25); color: #fff; font-size: 14px;
  cursor: pointer; transition: background 0.2s;
}
.input-row button:hover { background: rgba(255,255,255,0.4); }
ul { list-style: none; }
li {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 12px; margin-bottom: 6px;
  background: rgba(255,255,255,0.15); border-radius: 8px; transition: background 0.2s;
}
li:hover { background: rgba(255,255,255,0.25); }
li.done span { text-decoration: line-through; opacity: 0.6; }
label { display: flex; align-items: center; gap: 8px; cursor: pointer; flex: 1; }
label input[type="checkbox"] { width: 16px; height: 16px; cursor: pointer; }
.del {
  background: none; border: none; color: rgba(255,255,255,0.5);
  font-size: 16px; cursor: pointer; padding: 4px 8px;
}
.del:hover { color: #fff; }
.summary { margin-top: 12px; font-size: 13px; opacity: 0.8; text-align: right; }
</style>
