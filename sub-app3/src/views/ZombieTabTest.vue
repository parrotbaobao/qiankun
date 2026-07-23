<template>
  <div class="zombie-tab-test">
    <header class="header">
      <h1>🧟 僵尸 Tab 检测与清理 - 测试页</h1>
      <div class="intro">
        <p><strong>测试步骤：</strong></p>
        <ol>
          <li>打开本页面 → 切到其他 tab → 等待超过阈值（默认 10s） → 切回本页面，观察是否触发"僵尸唤醒"逻辑</li>
          <li>或者直接使用下方的"模拟离开 / 回到 tab"按钮进行手动测试</li>
        </ol>
      </div>
    </header>

    <section class="panel">
      <h2>⚙️ 配置</h2>
      <div class="config-row">
        <label>
          僵尸判定阈值（秒）：
          <input type="number" min="1" v-model.number="thresholdSec" />
        </label>
        <label>
          随机延迟最大值（秒）：
          <input type="number" min="0" v-model.number="maxRandomDelaySec" />
        </label>
      </div>
    </section>

    <section class="panel">
      <h2>📊 实时状态</h2>
      <div class="status-grid">
        <div class="status-item">
          <span class="label">visibilityState</span>
          <span class="value" :class="{ hidden: visibilityState === 'hidden' }">{{ visibilityState }}</span>
        </div>
        <div class="status-item">
          <span class="label">上次进入 hidden</span>
          <span class="value">{{ lastHiddenAt ? formatTime(lastHiddenAt) : '—' }}</span>
        </div>
        <div class="status-item">
          <span class="label">当前累计 idle 时长</span>
          <span class="value">{{ currentIdleSec }} s</span>
        </div>
        <div class="status-item">
          <span class="label">僵尸阈值</span>
          <span class="value">{{ thresholdSec }} s</span>
        </div>
        <div class="status-item">
          <span class="label">是否僵尸 tab</span>
          <span class="value" :class="{ zombie: isZombie }">{{ isZombie ? '是 🧟' : '否' }}</span>
        </div>
        <div class="status-item">
          <span class="label">随机延迟 / 倒计时</span>
          <span class="value">
            <template v-if="randomDelaySec !== null">
              {{ randomDelaySec }}s，剩余 {{ countdownSec }}s
            </template>
            <template v-else>—</template>
          </span>
        </div>
      </div>

      <div v-if="reloadFired" class="reload-banner">✅ 已触发 reload（模拟）</div>
    </section>

    <section class="panel">
      <h2>🎮 模拟操作</h2>
      <div class="btn-row">
        <button class="btn" @click="simulateHidden">模拟离开 tab</button>
        <button class="btn" @click="simulateVisible">模拟回到 tab</button>
        <button class="btn btn-danger" @click="resetAll">重置所有状态</button>
      </div>
    </section>

    <section class="panel">
      <h2>📜 事件日志</h2>
      <ul class="logs">
        <li v-for="log in logs" :key="log.id" :class="['log-item', `log-${log.type}`]">
          <span class="log-time">{{ formatTime(log.time) }}</span>
          <span class="log-msg">{{ log.msg }}</span>
        </li>
        <li v-if="logs.length === 0" class="log-item log-empty">暂无日志</li>
      </ul>
    </section>

    <section class="panel">
      <button class="btn btn-ghost" @click="showScenarios = !showScenarios">
        {{ showScenarios ? '▼' : '▶' }} 测试场景提示
      </button>
      <div v-show="showScenarios" class="scenarios">
        <ul>
          <li><strong>正常切换：</strong>离开 3 秒后回来，不应触发僵尸判定</li>
          <li><strong>僵尸触发：</strong>离开超过阈值后回来，应触发随机延迟 reload</li>
          <li><strong>连续切换：</strong>快速切换 tab 多次，状态应保持一致不混乱</li>
          <li><strong>阈值变更：</strong>修改阈值后立即切换，新阈值应立刻生效</li>
        </ul>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

type LogType = 'info' | 'zombie' | 'reload'
interface LogEntry {
  id: number
  time: number
  msg: string
  type: LogType
}

const thresholdSec = ref(10)
const maxRandomDelaySec = ref(5)

const visibilityState = ref<'visible' | 'hidden'>('visible')
const lastHiddenAt = ref<number | null>(null)
const currentIdleSec = ref(0)
const isZombie = ref(false)
const randomDelaySec = ref<number | null>(null)
const countdownSec = ref(0)
const reloadFired = ref(false)

const logs = ref<LogEntry[]>([])
let logIdSeq = 0

const showScenarios = ref(false)

let idleTimer: number | null = null
let countdownTimer: number | null = null

const formatTime = (ts: number) => {
  const d = new Date(ts)
  return d.toLocaleTimeString('zh-CN', { hour12: false }) + '.' + String(d.getMilliseconds()).padStart(3, '0')
}

const addLog = (msg: string, type: LogType = 'info') => {
  logs.value.unshift({ id: ++logIdSeq, time: Date.now(), msg, type })
  if (logs.value.length > 200) logs.value.pop()
}

const startIdleTimer = () => {
  stopIdleTimer()
  idleTimer = window.setInterval(() => {
    if (visibilityState.value === 'hidden' && lastHiddenAt.value !== null) {
      currentIdleSec.value = Math.floor((Date.now() - lastHiddenAt.value) / 1000)
    }
  }, 1000)
}
const stopIdleTimer = () => {
  if (idleTimer !== null) {
    clearInterval(idleTimer)
    idleTimer = null
  }
}

const stopCountdown = () => {
  if (countdownTimer !== null) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
}

const triggerZombieReload = () => {
  const delay = Math.floor(Math.random() * (maxRandomDelaySec.value + 1))
  randomDelaySec.value = delay
  countdownSec.value = delay
  addLog(`🧟 判定为僵尸 tab，将在 ${delay}s 后触发 reload`, 'zombie')

  stopCountdown()
  if (delay === 0) {
    fireReload()
    return
  }
  countdownTimer = window.setInterval(() => {
    countdownSec.value -= 1
    if (countdownSec.value <= 0) {
      stopCountdown()
      fireReload()
    }
  }, 1000)
}

const fireReload = () => {
  reloadFired.value = true
  addLog('🔄 已触发 reload（模拟，未真正刷新）', 'reload')
}

const handleHidden = (source: 'event' | 'manual') => {
  if (visibilityState.value === 'hidden') return
  visibilityState.value = 'hidden'
  lastHiddenAt.value = Date.now()
  currentIdleSec.value = 0
  isZombie.value = false
  addLog(`👋 进入 hidden（${source === 'manual' ? '手动' : '事件'}）`, 'info')
}

const handleVisible = (source: 'event' | 'manual') => {
  if (visibilityState.value === 'visible') return
  const now = Date.now()
  const idleMs = lastHiddenAt.value !== null ? now - lastHiddenAt.value : 0
  const idleSec = Math.floor(idleMs / 1000)
  visibilityState.value = 'visible'
  currentIdleSec.value = idleSec
  addLog(`👀 回到 visible（${source === 'manual' ? '手动' : '事件'}），离开了 ${idleSec}s`, 'info')

  if (idleSec >= thresholdSec.value) {
    isZombie.value = true
    triggerZombieReload()
  } else {
    isZombie.value = false
  }
}

const onVisibilityChange = () => {
  if (document.visibilityState === 'hidden') {
    handleHidden('event')
  } else if (document.visibilityState === 'visible') {
    handleVisible('event')
  }
}

const simulateHidden = () => handleHidden('manual')
const simulateVisible = () => handleVisible('manual')

const resetAll = () => {
  stopCountdown()
  visibilityState.value = (document.visibilityState as 'visible' | 'hidden') || 'visible'
  lastHiddenAt.value = null
  currentIdleSec.value = 0
  isZombie.value = false
  randomDelaySec.value = null
  countdownSec.value = 0
  reloadFired.value = false
  logs.value = []
  addLog('♻️ 状态已重置', 'info')
}

watch(thresholdSec, (val, oldVal) => {
  addLog(`⚙️ 阈值变更：${oldVal}s → ${val}s`, 'info')
})

onMounted(() => {
  visibilityState.value = (document.visibilityState as 'visible' | 'hidden') || 'visible'
  document.addEventListener('visibilitychange', onVisibilityChange)
  startIdleTimer()
  addLog('🚀 页面已挂载，开始监听 visibilitychange', 'info')
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', onVisibilityChange)
  stopIdleTimer()
  stopCountdown()
})
</script>

<style scoped>
.zombie-tab-test {
  max-width: 880px;
  margin: 0 auto;
  padding: 24px 20px 60px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #2c3e50;
}

.header h1 {
  margin: 0 0 12px;
  font-size: 22px;
}
.intro {
  background: #f4f6fa;
  border-left: 4px solid #4f8cff;
  padding: 12px 16px;
  border-radius: 4px;
  font-size: 14px;
  line-height: 1.6;
}
.intro ol {
  margin: 6px 0 0;
  padding-left: 20px;
}

.panel {
  margin-top: 20px;
  padding: 16px 18px;
  background: #fff;
  border: 1px solid #e6e8ee;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}
.panel h2 {
  margin: 0 0 12px;
  font-size: 16px;
  color: #1f2937;
}

.config-row {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}
.config-row label {
  display: flex;
  flex-direction: column;
  font-size: 13px;
  gap: 4px;
}
.config-row input {
  width: 120px;
  padding: 6px 8px;
  border: 1px solid #d0d5dd;
  border-radius: 4px;
  font-size: 14px;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}
.status-item {
  display: flex;
  flex-direction: column;
  padding: 10px 12px;
  background: #f9fafb;
  border-radius: 6px;
  gap: 4px;
}
.status-item .label {
  font-size: 12px;
  color: #6b7280;
}
.status-item .value {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
}
.status-item .value.hidden {
  color: #d97706;
}
.status-item .value.zombie {
  color: #dc2626;
}

.reload-banner {
  margin-top: 12px;
  padding: 10px 14px;
  background: #fef2f2;
  color: #b91c1c;
  border: 1px solid #fecaca;
  border-radius: 6px;
  font-weight: 600;
}

.btn-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background: #4f8cff;
  color: #fff;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.15s;
}
.btn:hover {
  background: #3b78ee;
}
.btn-danger {
  background: #ef4444;
}
.btn-danger:hover {
  background: #dc2626;
}
.btn-ghost {
  background: transparent;
  color: #4f8cff;
  padding: 4px 0;
}
.btn-ghost:hover {
  background: transparent;
  text-decoration: underline;
}

.logs {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 320px;
  overflow-y: auto;
  border: 1px solid #eef0f4;
  border-radius: 6px;
}
.log-item {
  display: flex;
  gap: 12px;
  padding: 6px 12px;
  font-size: 13px;
  border-bottom: 1px solid #f3f4f6;
}
.log-item:last-child {
  border-bottom: none;
}
.log-time {
  color: #9ca3af;
  font-family: 'Menlo', monospace;
  flex-shrink: 0;
}
.log-info {
  color: #6b7280;
}
.log-zombie {
  color: #d97706;
  background: #fffbeb;
}
.log-reload {
  color: #b91c1c;
  background: #fef2f2;
  font-weight: 600;
}
.log-empty {
  color: #9ca3af;
  font-style: italic;
  justify-content: center;
}

.scenarios {
  margin-top: 10px;
  padding: 12px 16px;
  background: #f9fafb;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.7;
}
.scenarios ul {
  margin: 0;
  padding-left: 18px;
}
</style>
