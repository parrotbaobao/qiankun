import { ref, computed, watch } from 'vue'

const count = ref(0)
const mainUser = ref('')
const history = ref([{ value: 0, action: '初始化', time: new Date().toLocaleTimeString() }])

watch(count, (v) => {
  history.value.push({ value: v, action: `变更为 ${v}`, time: new Date().toLocaleTimeString() })
})

const max = computed(() => Math.max(...history.value.map(h => h.value)))
const min = computed(() => Math.min(...history.value.map(h => h.value)))

const bus = window.$wujie?.bus

function sendToMain(text) {
  bus?.$emit('sub-to-main', { from: '计数器', text })
}

function changeCount(delta) {
  count.value += delta
  sendToMain(`计数变更 ${delta > 0 ? '+' : ''}${delta}，当前值: ${count.value}`)
}

function resetCount() {
  count.value = 0
  sendToMain('计数器已归零')
}

export function useCounter() {
  return { count, mainUser, history, max, min, changeCount, resetCount, sendToMain }
}
