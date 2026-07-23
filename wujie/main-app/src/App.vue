<template>
  <div class="shell">
    <header class="header">
      <h1>🚀 Wujie 微前端 Demo</h1>
      <p class="subtitle">支持同时加载多个子应用 · 主子应用双向通信</p>
    </header>

    <div class="comm-bar">
      <label>主应用用户名:</label>
      <input v-model="username" placeholder="输入用户名..." />
      <button @click="broadcast">广播给所有子应用</button>
    </div>

    <nav class="nav">
      <button
        v-for="app in apps"
        :key="app.name"
        :class="['nav-btn', { active: visibleApps[app.name] }]"
        @click="toggle(app.name)"
      >
        <span class="icon">{{ app.icon }}</span>
        <span>{{ app.label }}</span>
        <span class="badge" v-if="visibleApps[app.name]">显示中</span>
      </button>
    </nav>

    <div class="layout" :class="`count-${visibleList.length}`">
      <div
        v-for="app in visibleList"
        :key="app.name"
        class="app-panel"
      >
        <div class="panel-header">
          <span>{{ app.icon }} {{ app.label }}</span>
          <button class="close-btn" @click="toggle(app.name)">✕</button>
        </div>
        <WujieVue
          :name="app.name"
          :url="app.url"
          :props="{ username: username, theme: theme }"
          width="100%"
          height="100%"
        />
      </div>
    </div>

    <div v-if="visibleList.length === 0" class="empty">
      <p>👆 点击上方按钮加载子应用</p>
      <p>可以同时加载多个！</p>
    </div>

    <div class="msg-log" v-if="messages.length > 0">
      <div class="msg-log-header">
        <span>📨 子应用消息日志 ({{ messages.length }})</span>
        <button @click="messages.length = 0">清空</button>
      </div>
      <div class="msg-list">
        <div class="msg-item" v-for="(msg, i) in messages" :key="i">
          <span class="msg-from">{{ msg.from }}</span>
          <span class="msg-text">{{ msg.text }}</span>
          <span class="msg-time">{{ msg.time }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import WujieVue from 'wujie-vue3'

const bus = WujieVue.bus

const username = ref('管理员')
const theme = ref('dark')
const messages = reactive([])

const apps = [
  { name: 'sub-app1', label: '待办清单', url: 'http://localhost:7101', icon: '📝' },
  { name: 'sub-app2', label: '计数器', url: 'http://localhost:7102', icon: '🎰' },
  { name: 'sub-app3', label: '用户卡片', url: 'http://localhost:7103', icon: '👤' },
]

const visibleApps = reactive({})

function toggle(name) {
  visibleApps[name] = !visibleApps[name]
}

const visibleList = computed(() => apps.filter(a => visibleApps[a.name]))

function onSubMessage(data) {
  messages.push({
    from: data.from,
    text: data.text,
    time: new Date().toLocaleTimeString(),
  })
}

function broadcast() {
  bus.$emit('main-to-sub', { username: username.value, theme: theme.value })
}

onMounted(() => {
  bus.$on('sub-to-main', onSubMessage)
})

onUnmounted(() => {
  bus.$off('sub-to-main', onSubMessage)
})
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #0f0f1a;
  color: #fff;
  min-height: 100vh;
}
.shell { padding: 20px 24px; max-width: 1400px; margin: 0 auto; }

.header { text-align: center; margin-bottom: 20px; }
.header h1 { font-size: 28px; background: linear-gradient(90deg, #667eea, #f5576c, #4facfe); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.subtitle { font-size: 14px; color: #888; margin-top: 4px; }

.nav {
  display: flex; gap: 12px; justify-content: center;
  margin-bottom: 24px; flex-wrap: wrap;
}
.nav-btn {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 20px; border: 2px solid #333; border-radius: 12px;
  background: #1a1a2e; color: #ccc; font-size: 15px;
  cursor: pointer; transition: all 0.25s;
}
.nav-btn:hover { border-color: #555; background: #222244; }
.nav-btn.active { border-color: #667eea; background: #1e1e3f; color: #fff; }
.icon { font-size: 18px; }
.badge {
  font-size: 11px; padding: 2px 8px; border-radius: 8px;
  background: #667eea; color: #fff;
}

.layout {
  display: grid; gap: 16px;
  min-height: 500px;
}
.layout.count-1 { grid-template-columns: 1fr; }
.layout.count-2 { grid-template-columns: 1fr 1fr; }
.layout.count-3 { grid-template-columns: 1fr 1fr 1fr; }

.app-panel {
  background: #1a1a2e;
  border: 1px solid #2a2a4a;
  border-radius: 14px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 480px;
}
.panel-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 16px;
  background: #12122a;
  border-bottom: 1px solid #2a2a4a;
  font-size: 14px; font-weight: 600;
}
.close-btn {
  background: none; border: none; color: #666;
  font-size: 16px; cursor: pointer; padding: 2px 6px;
  border-radius: 4px; transition: all 0.2s;
}
.close-btn:hover { color: #f5576c; background: rgba(245,87,108,0.1); }

.empty {
  text-align: center; padding: 80px 20px;
  color: #555; font-size: 18px;
}
.empty p:last-child { font-size: 14px; margin-top: 8px; color: #444; }

.comm-bar {
  display: flex; align-items: center; gap: 10px;
  justify-content: center; margin-bottom: 18px; flex-wrap: wrap;
}
.comm-bar label { font-size: 14px; color: #aaa; }
.comm-bar input {
  padding: 8px 14px; border: 1px solid #333; border-radius: 8px;
  background: #1a1a2e; color: #fff; font-size: 14px; outline: none;
  width: 160px;
}
.comm-bar input:focus { border-color: #667eea; }
.comm-bar button {
  padding: 8px 16px; border: none; border-radius: 8px;
  background: #667eea; color: #fff; font-size: 13px;
  cursor: pointer; transition: background 0.2s;
}
.comm-bar button:hover { background: #5a6fe0; }

.msg-log {
  margin-top: 24px; background: #12122a; border: 1px solid #2a2a4a;
  border-radius: 12px; overflow: hidden;
}
.msg-log-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 16px; background: #1a1a2e;
  border-bottom: 1px solid #2a2a4a; font-size: 14px; font-weight: 600;
}
.msg-log-header button {
  background: none; border: 1px solid #444; border-radius: 6px;
  color: #888; font-size: 12px; padding: 3px 10px; cursor: pointer;
}
.msg-log-header button:hover { border-color: #f5576c; color: #f5576c; }
.msg-list { max-height: 200px; overflow-y: auto; padding: 8px 0; }
.msg-item {
  display: flex; gap: 10px; padding: 6px 16px; font-size: 13px;
  align-items: center;
}
.msg-item:hover { background: rgba(255,255,255,0.03); }
.msg-from {
  padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 600;
  background: rgba(102,126,234,0.3); color: #99b0ff; white-space: nowrap;
}
.msg-text { flex: 1; color: #ccc; }
.msg-time { font-size: 11px; color: #555; white-space: nowrap; }

@media (max-width: 900px) {
  .layout.count-2, .layout.count-3 { grid-template-columns: 1fr; }
}
</style>
