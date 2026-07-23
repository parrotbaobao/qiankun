<template>
  <div v-if="user" class="detail-page">
    <div class="detail-header">
      <div class="detail-avatar">{{ user.name[0] }}</div>
      <div>
        <h3>{{ user.name }}</h3>
        <div class="status-tag" :class="user.status">{{ user.status === 'online' ? '在线' : '离线' }}</div>
      </div>
    </div>
    <div class="detail-fields">
      <div class="field"><span class="label">角色</span><span>{{ user.role }}</span></div>
      <div class="field"><span class="label">邮箱</span><span>{{ user.email }}</span></div>
      <div class="field"><span class="label">加入时间</span><span>{{ user.joined }}</span></div>
    </div>
    <router-link to="/" class="back-btn">← 返回列表</router-link>
  </div>
  <div v-else class="detail-page">
    <p>用户不存在</p>
    <router-link to="/" class="back-btn">← 返回列表</router-link>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useUsers } from '../store.js'

const route = useRoute()
const { users, sendToMain } = useUsers()
const user = computed(() => users.value.find(u => u.name === decodeURIComponent(route.params.name)))

sendToMain(`查看了用户详情: ${route.params.name}`)
</script>

<style scoped>
.detail-page { text-align: left; }
.detail-header {
  display: flex; align-items: center; gap: 14px; margin-bottom: 16px;
}
.detail-avatar {
  width: 56px; height: 56px; border-radius: 50%;
  background: rgba(255,255,255,0.3); display: flex;
  align-items: center; justify-content: center;
  font-size: 24px; font-weight: 700;
}
.detail-header h3 { font-size: 20px; margin-bottom: 4px; }
.status-tag {
  display: inline-block; font-size: 12px; padding: 2px 10px; border-radius: 10px;
}
.status-tag.online { background: rgba(46,213,115,0.4); }
.status-tag.offline { background: rgba(255,255,255,0.15); }
.detail-fields { margin-bottom: 16px; }
.field {
  display: flex; justify-content: space-between;
  padding: 10px 14px; margin-bottom: 6px;
  background: rgba(255,255,255,0.12); border-radius: 8px; font-size: 14px;
}
.label { opacity: 0.7; }
.back-btn {
  display: inline-block; padding: 8px 16px; border-radius: 8px;
  background: rgba(255,255,255,0.2); color: #fff;
  text-decoration: none; font-size: 13px; transition: background 0.2s;
}
.back-btn:hover { background: rgba(255,255,255,0.3); }
</style>
