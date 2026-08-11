<template>
  <div class="add-form">
    <div class="form-row">
      <label>姓名</label>
      <input v-model="form.name" placeholder="输入姓名" />
    </div>
    <div class="form-row">
      <label>角色</label>
      <input v-model="form.role" placeholder="如: 前端工程师" />
    </div>
    <div class="form-row">
      <label>邮箱</label>
      <input v-model="form.email" placeholder="name@example.com" />
    </div>
    <div class="form-actions">
      <button @click="submit" :disabled="!canSubmit">添加用户</button>
      <router-link to="/" class="cancel">取消</router-link>
    </div>
    <p class="hint" v-if="added">✓ 已添加 {{ added }}</p>
  </div>
</template>

<script setup>
import { reactive, ref, computed } from 'vue'
import { useUsers } from '../store.js'

const { addUser } = useUsers()
const added = ref('')

const form = reactive({ name: '', role: '', email: '' })
const canSubmit = computed(() => form.name.trim() && form.role.trim())

function submit() {
  addUser({
    name: form.name.trim(),
    role: form.role.trim(),
    email: form.email.trim() || `${form.name}@demo.com`,
    status: 'online',
    joined: new Date().toISOString().slice(0, 10),
  })
  added.value = form.name
  form.name = ''
  form.role = ''
  form.email = ''
}
</script>

<style scoped>
.form-row { margin-bottom: 12px; }
.form-row label { display: block; font-size: 12px; opacity: 0.8; margin-bottom: 4px; }
.form-row input {
  width: 100%; padding: 10px 14px; border: none; border-radius: 8px;
  font-size: 14px; outline: none; background: rgba(255,255,255,0.9); color: #333;
}
.form-actions { display: flex; align-items: center; gap: 12px; margin-top: 16px; }
.form-actions button {
  padding: 10px 20px; border: none; border-radius: 8px;
  background: rgba(255,255,255,0.3); color: #fff; font-size: 14px;
  cursor: pointer; transition: background 0.2s;
}
.form-actions button:hover:not(:disabled) { background: rgba(255,255,255,0.45); }
.form-actions button:disabled { opacity: 0.4; cursor: not-allowed; }
.cancel {
  color: rgba(255,255,255,0.7); text-decoration: none; font-size: 13px;
}
.cancel:hover { color: #fff; }
.hint { margin-top: 12px; font-size: 13px; opacity: 0.9; }
</style>
