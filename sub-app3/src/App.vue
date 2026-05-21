<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from './stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const probeDialogOpen = ref(false)
const sharedColor = ref('')
onMounted(() => {
  sharedColor.value = getComputedStyle(document.documentElement).getPropertyValue('--shared-color').trim() || '#409eff'
})

async function handleLogout() {
  await auth.logout()
  router.push('/login')
}
</script>

<template>
  <div v-if="auth.isLoggedIn && route.name !== 'login'" class="topbar">
    <nav class="topbar-nav">
      <router-link class="nav-link" to="/prompts">Prompts</router-link>
      <router-link class="nav-link" to="/ai">AI 对话</router-link>
      <router-link class="nav-link" to="/css-isolation-test">CSS/JS 隔离</router-link>
      <router-link class="nav-link" to="/ui-demo">UI Demo</router-link>
    </nav>
    <span class="topbar-user">
      {{ auth.user?.name ?? auth.user?.username }}
      <span class="topbar-role">{{ auth.user?.role }}</span>
    </span>
    <button class="btn-logout" @click="handleLogout">退出登录</button>
  </div>
  <!-- CSS 探针栏：所有页面常驻 -->
  <div v-if="auth.isLoggedIn && route.name !== 'login'" class="probe-bar">
    <span class="probe-id">📦 子应用3 (Vue)</span>
    <span class="probe-sep">·</span>
    <span class="probe-item">
      <em class="probe-tag tag-c">C</em>
      <button class="conflict-btn">类名冲突</button>
    </span>
    <span class="probe-item">
      <em class="probe-tag tag-b">B</em>
      <span class="probe-var-swatch" :style="{ background: `var(--shared-color, #409eff)` }">
        --shared-color
      </span>
    </span>
    <span class="probe-item">
      <em class="probe-tag tag-d">D</em>
      <span class="probe-spinner"></span>
    </span>
    <span class="probe-item">
      <em class="probe-tag tag-a">A</em>
      <button class="probe-dialog-btn" @click="probeDialogOpen = true">Portal弹窗</button>
    </span>
    <span class="probe-hint">切换主应用沙箱模式观察变化</span>
  </div>

  <router-view />

  <!-- 探针 Portal 弹窗（El-Plus，挂到 body，experimental/strict 下丢样式） -->
  <el-dialog
    v-model="probeDialogOpen"
    title="📦 子应用3 · Portal 弹窗"
    width="420px"
    append-to-body
  >
    <p>此弹窗通过 El-Plus Portal 挂到 <code>body</code>。</p>
    <p><b>none</b>：✅ 样式正常</p>
    <p><b>experimental</b>：❌ 选择器前缀不匹配 body 中的元素，样式丢失</p>
    <p><b>strict</b>：❌ Shadow DOM 完全隔离，body 中元素无样式</p>
    <template #footer>
      <el-button @click="probeDialogOpen = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 8px 20px;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  font-size: 13px;
}

.topbar-nav {
  display: flex;
  gap: 4px;
  margin-right: auto;
}

.nav-link {
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 13px;
  color: #6b7280;
  text-decoration: none;
  transition: all 0.15s;
}

.nav-link:hover {
  background: #f3f4f6;
  color: #111827;
}

.nav-link.router-link-active {
  background: #ede9fe;
  color: #4f46e5;
  font-weight: 500;
}

.topbar-user {
  color: #374151;
  font-weight: 500;
}

.topbar-role {
  margin-left: 6px;
  padding: 1px 8px;
  background: #ede9fe;
  color: #4f46e5;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.btn-logout {
  padding: 5px 14px;
  border: 1.5px solid #e5e7eb;
  background: transparent;
  border-radius: 6px;
  font-size: 13px;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-logout:hover {
  border-color: #ef4444;
  color: #ef4444;
}

/* ── CSS 探针栏 ── */
:root { --shared-color: #409eff; }

@keyframes sub3-spin {
  0%   { transform: rotate(0deg)   scale(1); }
  50%  { transform: rotate(180deg) scale(1.25); }
  100% { transform: rotate(360deg) scale(1); }
}

.conflict-btn {
  background: #409eff;
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 3px 8px;
  font-size: 11px;
  cursor: default;
}

.probe-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 16px;
  background: #1e1b4b;
  border-top: 1px solid rgba(255,255,255,0.07);
  font-size: 12px;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.probe-id { color: #a5b4fc; font-weight: 600; white-space: nowrap; }
.probe-sep { color: rgba(255,255,255,.2); }

.probe-item { display: inline-flex; align-items: center; gap: 5px; }

.probe-tag {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 999px;
  font-style: normal;
  font-size: 10px;
  font-weight: 700;
}
.tag-a { background: #dbeafe; color: #1d4ed8; }
.tag-b { background: #d1fae5; color: #065f46; }
.tag-c { background: #fee2e2; color: #991b1b; }
.tag-d { background: #ede9fe; color: #5b21b6; }

.probe-var-swatch {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  color: #fff;
  font-weight: 500;
}

.probe-spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  background: linear-gradient(135deg, #409eff, #66b1ff);
  animation: sub3-spin 2s linear infinite;
}

.probe-dialog-btn {
  padding: 3px 10px;
  border: 1px solid rgba(255,255,255,.2);
  background: transparent;
  color: rgba(255,255,255,.7);
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
}
.probe-dialog-btn:hover { background: rgba(255,255,255,.08); color: #fff; }

.probe-hint {
  margin-left: auto;
  color: rgba(255,255,255,.25);
  font-size: 10px;
  white-space: nowrap;
}
</style>
