<template>
  <div>
    <div class="from-main" v-if="mainUser">来自主应用: <strong>{{ mainUser }}</strong></div>
    <div class="cards">
      <router-link
        v-for="user in users" :key="user.name"
        :to="'/detail/' + encodeURIComponent(user.name)"
        class="card"
      >
        <div class="avatar">{{ user.name[0] }}</div>
        <div class="info">
          <div class="name">{{ user.name }}</div>
          <div class="role">{{ user.role }}</div>
        </div>
        <div class="status" :class="user.status">{{ user.status === 'online' ? '在线' : '离线' }}</div>
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { useUsers } from '../store.js'
const { users, mainUser } = useUsers()
</script>
