import { ref, computed } from 'vue'

const mainUser = ref('')
const users = ref([
  { name: '张三', role: '前端工程师', status: 'online', email: 'zhangsan@demo.com', joined: '2024-01-15' },
  { name: '李四', role: '后端工程师', status: 'offline', email: 'lisi@demo.com', joined: '2023-08-20' },
  { name: '王五', role: '产品经理', status: 'online', email: 'wangwu@demo.com', joined: '2024-03-01' },
  { name: '赵六', role: 'UI 设计师', status: 'online', email: 'zhaoliu@demo.com', joined: '2024-06-10' },
])

const onlineCount = computed(() => users.value.filter(u => u.status === 'online').length)

const bus = window.$wujie?.bus

function sendToMain(text) {
  bus?.$emit('sub-to-main', { from: '用户卡片', text })
}

function addUser(user) {
  users.value.push(user)
  sendToMain(`添加了用户: ${user.name}`)
}

export function useUsers() {
  return { users, mainUser, onlineCount, sendToMain, addUser }
}
