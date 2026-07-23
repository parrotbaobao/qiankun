import { ref } from 'vue'

const newTodo = ref('')
const mainUser = ref('')
const todos = ref([
  { text: '学习 wujie 微前端', done: false },
  { text: '搭建子应用', done: true },
  { text: '实现多应用同时加载', done: false },
  { text: '添加路由功能', done: false },
])

const bus = window.$wujie?.bus

function sendToMain(text) {
  bus?.$emit('sub-to-main', { from: '待办清单', text })
}

function addTodo() {
  const text = newTodo.value.trim()
  if (!text) return
  todos.value.push({ text, done: false })
  newTodo.value = ''
  sendToMain(`添加了待办: "${text}"`)
}

function removeTodo(todo) {
  const i = todos.value.indexOf(todo)
  if (i > -1) {
    todos.value.splice(i, 1)
    sendToMain(`删除了待办: "${todo.text}"`)
  }
}

export function useTodos() {
  return { todos, newTodo, mainUser, addTodo, removeTodo, sendToMain }
}
