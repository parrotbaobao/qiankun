<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from './stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

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
  <!-- 单根 flex 容器：topbar 自然高度，page-wrap 占满剩余 -->
  <div class="app-root">
    <div v-if="route.name !== 'login'" class="topbar">
      <nav class="topbar-nav">
        <router-link class="nav-link" to="/prompts">Prompts</router-link>
        <router-link class="nav-link" to="/conversations">对话列表</router-link>
        <router-link class="nav-link" to="/ai">AI 对话</router-link>
        <router-link class="nav-link nav-link-mc" to="/matechat-component">Matechat 组件版</router-link>
        <router-link class="nav-link nav-link-mc" to="/matechat-source">Matechat 源码版</router-link>
        <router-link class="nav-link" to="/ui-demo">UI Demo</router-link>
      </nav>
      <template v-if="auth.isLoggedIn">
        <span class="topbar-user">
          {{ auth.user?.name ?? auth.user?.username }}
          <span class="topbar-role">{{ auth.user?.role }}</span>
        </span>
        <button class="btn-logout" @click="handleLogout">退出登录</button>
      </template>
    </div>
    <!-- page-wrap：flex:1 占满 topbar 以下所有高度，router-view 的 height:100% 在此基础上生效 -->
    <div class="page-wrap">
      <router-view />
    </div>
  </div>
</template>

<style scoped>
/* app-root / page-wrap / page-wrap>* 的布局规则已移至 global.css
   因为 scoped 样式无法穿透 router-view 渲染的子组件 */

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

/* Matechat 专用导航链接 */
.nav-link-mc {
  border: 1px dashed #c4b5fd;
}
.nav-link-mc:hover {
  background: #f5f3ff;
  color: #7c3aed;
}
.nav-link-mc.router-link-active {
  background: #ede9fe;
  color: #7c3aed;
  border-color: #7c3aed;
  border-style: solid;
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
