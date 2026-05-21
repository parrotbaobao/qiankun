<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'

// ── 工具 ──────────────────────────────────────────────────────────────────────
function sandboxMode() {
  return localStorage.getItem('qk_sandbox_mode') ?? 'none'
}
function inQiankun() {
  return !!(window as any).__POWERED_BY_QIANKUN__
}

// ═══════════════════════════════════════════════════════════════════════════════
// 场景 1：localStorage 共享（同域永远泄露，沙箱无效）
// ═══════════════════════════════════════════════════════════════════════════════
const LS_KEY = '__sub3_ls_test__'
const lsWritten = ref(false)
const lsValue = ref('')

function lsWrite() {
  localStorage.setItem(LS_KEY, `sub-app3写入 @ ${new Date().toLocaleTimeString()}`)
  lsWritten.value = true
  lsValue.value = localStorage.getItem(LS_KEY) ?? ''
  ElMessage.success('已写入 localStorage，在主应用控制台执行 localStorage.getItem("__sub3_ls_test__") 验证是否泄露')
}

function lsRead() {
  lsValue.value = localStorage.getItem(LS_KEY) ?? '（空）'
}

function lsClear() {
  localStorage.removeItem(LS_KEY)
  lsWritten.value = false
  lsValue.value = ''
}

// ═══════════════════════════════════════════════════════════════════════════════
// 场景 2：setInterval 泄露（卸载子应用时若未清理，定时器继续运行）
// ═══════════════════════════════════════════════════════════════════════════════
const timerCount = ref(0)
const timerRunning = ref(false)
let timerId: ReturnType<typeof setInterval> | null = null

// 故意把计数器挂到 window，让主应用侧可以观察
;(window as any).__sub3_timer_count__ = 0

function startLeakyTimer() {
  if (timerRunning.value) return
  timerRunning.value = true
  timerId = setInterval(() => {
    timerCount.value++
    ;(window as any).__sub3_timer_count__ = timerCount.value
  }, 1000)
  ElMessage.warning('定时器已启动！现在切换到其他子应用/主应用，再切回来，观察计数是否还在涨。（有JS沙箱时也会涨——setInterval 不被沙箱隔离）')
}

function stopTimer() {
  if (timerId != null) {
    clearInterval(timerId)
    timerId = null
  }
  timerRunning.value = false
  ElMessage.success('定时器已清理')
}

// 正确做法：在 unmount 时清理（但这里演示的是不清理的情况）
// onBeforeUnmount(() => stopTimer())  ← 故意注释掉以展示泄露

// ═══════════════════════════════════════════════════════════════════════════════
// 场景 3：window 全局变量（有JS沙箱时隔离，无沙箱时泄露）
// ═══════════════════════════════════════════════════════════════════════════════
const windowWritten = ref(false)
const windowReadResult = ref('')

function writeToWindow() {
  ;(window as any).__sub3_marker__ = {
    from: 'sub-app3',
    time: new Date().toISOString(),
    framework: 'Vue 3',
  }
  windowWritten.value = true
  ElMessage.success('已写入 window.__sub3_marker__')
}

function readFromWindow() {
  const val = (window as any).__sub3_marker__
  windowReadResult.value = val ? JSON.stringify(val, null, 2) : '（undefined —— JS 沙箱隔离成功）'
}

function readHostMarker() {
  // 尝试读取主应用写入的全局变量
  const val = (window as any).__host_marker__
  windowReadResult.value = val
    ? `读到主应用变量：${JSON.stringify(val)}（沙箱未隔离主→子方向）`
    : '（undefined —— 读不到主应用变量，隔离正常）'
}

// ═══════════════════════════════════════════════════════════════════════════════
// 场景 4：DOM 事件监听泄露（卸载后未清理监听器）
// ═══════════════════════════════════════════════════════════════════════════════
const eventLog = ref<string[]>([])
const eventListening = ref(false)
let clickHandler: ((e: MouseEvent) => void) | null = null

function startEventLeak() {
  if (eventListening.value) return
  clickHandler = (e: MouseEvent) => {
    const target = (e.target as HTMLElement).tagName
    eventLog.value.unshift(`[${new Date().toLocaleTimeString()}] document click → <${target}>`)
    if (eventLog.value.length > 8) eventLog.value.pop()
  }
  document.addEventListener('click', clickHandler)
  eventListening.value = true
  ElMessage.warning('已在 document 上添加 click 监听！卸载子应用（切到其他页面）但不清理，主应用点击仍会触发此回调（控制台可见）')
}

function removeEventListener() {
  if (clickHandler) {
    document.removeEventListener('click', clickHandler)
    clickHandler = null
  }
  eventListening.value = false
  eventLog.value = []
  ElMessage.success('监听器已移除')
}

// 正确做法：在 unmount 时清理
onBeforeUnmount(() => {
  if (clickHandler) {
    document.removeEventListener('click', clickHandler)
    clickHandler = null
  }
  // 注意：定时器故意不清，用来演示泄露
})

// ═══════════════════════════════════════════════════════════════════════════════
// 场景 5：原型链污染（Array.prototype 修改全局生效）
// ═══════════════════════════════════════════════════════════════════════════════
const protoPolluted = ref(false)
const protoTestResult = ref('')

function pollutPrototype() {
  if (!(Array.prototype as any).sub3Sum) {
    ;(Array.prototype as any).sub3Sum = function (this: number[]) {
      return this.reduce((a, b) => a + b, 0)
    }
    protoPolluted.value = true
    ElMessage.error('Array.prototype.sub3Sum 已被注入！这个方法现在对主应用的所有数组也可用，任何沙箱都拦不住。')
  } else {
    ElMessage.warning('已经污染过了')
  }
}

function testProtoPollution() {
  const arr = [1, 2, 3, 4, 5]
  const hasMethod = typeof (arr as any).sub3Sum === 'function'
  if (hasMethod) {
    protoTestResult.value = `[1,2,3,4,5].sub3Sum() = ${(arr as any).sub3Sum()} ← 原型链被污染，主应用的数组也有这个方法`
  } else {
    protoTestResult.value = '未被污染（正常）'
  }
}

function cleanProtoPollution() {
  delete (Array.prototype as any).sub3Sum
  protoPolluted.value = false
  protoTestResult.value = ''
  ElMessage.success('原型链污染已清除')
}

// ═══════════════════════════════════════════════════════════════════════════════
// 场景 6：单例模块隔离验证（Pinia store 不跨应用共享）
// ═══════════════════════════════════════════════════════════════════════════════
import { useAuthStore } from '../stores/auth'
const auth = useAuthStore()
const singletonResult = ref('')

function testSingleton() {
  // Pinia store 是子应用自己的实例，主应用拿不到
  singletonResult.value = JSON.stringify({
    hasToken: !!auth.token,
    storeId: 'auth（sub-app3 私有）',
    piniaInstance: '子应用自己的 Pinia，不共享给主应用',
    note: '有 JS 沙箱时：主应用无法访问 window.__pinia，各自独立'
  }, null, 2)
}

// ═══════════════════════════════════════════════════════════════════════════════
// 主应用侧写入测试（让主应用在 console 里写 window.__host_marker__ = 'test'）
// ═══════════════════════════════════════════════════════════════════════════════
onMounted(() => {
  console.log('[sub-app3 JsIsolationTest] 已挂载。在主应用控制台执行：')
  console.log('  window.__host_marker__ = { from: "main-app" }')
  console.log('  然后点击【读取主应用变量】按钮，观察是否能读到')
})
</script>

<template>
  <div class="test-page">
    <div class="page-header">
      <h1>JS 沙箱隔离测试</h1>
      <div class="mode-badge" :class="'mode-' + sandboxMode()">
        沙箱模式：<strong>{{ sandboxMode() }}</strong>
        &nbsp;|&nbsp;
        运行环境：<strong>{{ inQiankun() ? '🔗 qiankun 容器内' : '🟢 独立运行' }}</strong>
      </div>
      <p class="desc">每个场景都可以点击按钮触发，结合主应用控制台观察实际效果。</p>
    </div>

    <!-- ══ 场景1: localStorage ══════════════════════════════════════════════════ -->
    <section class="scenario">
      <div class="scenario-header">
        <span class="tag tag-1">场景 1</span>
        <h2>localStorage 共享 — 任何沙箱都无法隔离</h2>
        <span class="verdict verdict-fail">❌ 所有模式均泄露</span>
      </div>
      <div class="scenario-body">
        <p class="theory">
          qiankun 不代理 <code>localStorage</code> API。同域下的所有子应用、主应用共享同一个 Storage。
          敏感数据（token、用户偏好）若用 localStorage 存储，各应用均可互相读写。
        </p>
        <div class="action-row">
          <el-button type="primary" @click="lsWrite">写入 localStorage</el-button>
          <el-button @click="lsRead">重新读取</el-button>
          <el-button type="danger" @click="lsClear">清除</el-button>
        </div>
        <div v-if="lsValue" class="result-box">
          <div class="result-label">Key: <code>{{ LS_KEY }}</code></div>
          <div class="result-val">{{ lsValue }}</div>
          <div class="result-hint">在主应用控制台执行 <code>localStorage.getItem("{{ LS_KEY }}")</code> 可读到相同值</div>
        </div>
      </div>
    </section>

    <!-- ══ 场景2: setInterval 泄露 ════════════════════════════════════════════ -->
    <section class="scenario">
      <div class="scenario-header">
        <span class="tag tag-2">场景 2</span>
        <h2>setInterval 泄露 — 卸载子应用后定时器仍在运行</h2>
        <span class="verdict verdict-fail">❌ 所有沙箱均不拦截</span>
      </div>
      <div class="scenario-body">
        <p class="theory">
          <code>setInterval</code> 使用的是原生浏览器 API，qiankun 的 JS 沙箱不拦截。
          子应用卸载（<code>unmount</code>）时若没有手动 <code>clearInterval</code>，定时器会一直在后台跑，
          消耗内存，还可能触发已销毁组件的状态更新（产生内存泄漏警告）。
        </p>
        <div class="action-row">
          <el-button type="warning" :disabled="timerRunning" @click="startLeakyTimer">
            启动「不会被清理」的定时器
          </el-button>
          <el-button type="success" @click="stopTimer">手动清理</el-button>
        </div>
        <div class="timer-display" :class="{ running: timerRunning }">
          <span class="timer-num">{{ timerCount }}</span>
          <span class="timer-label">{{ timerRunning ? '运行中（切到其他页面再切回来，数字还会涨）' : '已停止' }}</span>
        </div>
        <div class="result-hint" style="margin-top:8px">
          主应用控制台执行 <code>window.__sub3_timer_count__</code> 可实时观察计数（子应用挂载到 window 上的）
        </div>
      </div>
    </section>

    <!-- ══ 场景3: window 全局变量 ════════════════════════════════════════════ -->
    <section class="scenario">
      <div class="scenario-header">
        <span class="tag tag-3">场景 3</span>
        <h2>window 全局变量 — JS 沙箱有效隔离</h2>
        <span class="verdict verdict-pass">✅ 有JS沙箱时隔离</span>
      </div>
      <div class="scenario-body">
        <p class="theory">
          qiankun 的 Proxy 沙箱会拦截子应用对 <code>window</code> 的读写。
          子应用里写的 <code>window.xxx</code> 在 <b>none 模式</b>下会泄漏到主应用；
          开启 JS 沙箱后（qiankun 默认开启，与 CSS 沙箱是两套独立配置），写入被代理到子应用私有快照中。
        </p>
        <div class="action-row">
          <el-button type="primary" @click="writeToWindow">写入 window.__sub3_marker__</el-button>
          <el-button @click="readFromWindow">读取 window.__sub3_marker__</el-button>
          <el-button type="info" @click="readHostMarker">读取主应用变量</el-button>
        </div>
        <div v-if="windowReadResult" class="result-box">
          <pre class="result-pre">{{ windowReadResult }}</pre>
          <div class="result-hint">
            主应用控制台执行 <code>window.__sub3_marker__</code>，有沙箱时应得到 <code>undefined</code>
          </div>
        </div>
      </div>
    </section>

    <!-- ══ 场景4: 事件监听泄露 ═══════════════════════════════════════════════ -->
    <section class="scenario">
      <div class="scenario-header">
        <span class="tag tag-4">场景 4</span>
        <h2>document 事件监听泄露 — 卸载时未移除</h2>
        <span class="verdict verdict-fail">❌ 沙箱不清理事件</span>
      </div>
      <div class="scenario-body">
        <p class="theory">
          在 <code>document</code>/<code>window</code> 上的事件监听器需要子应用在 <code>unmount</code> 时手动移除。
          qiankun 不会自动清理。泄漏的监听器会继续响应主应用的 DOM 事件，
          严重时导致跨应用回调、内存泄漏、意外行为。
        </p>
        <div class="action-row">
          <el-button type="danger" :disabled="eventListening" @click="startEventLeak">
            添加「不清理的」document click 监听
          </el-button>
          <el-button type="success" @click="removeEventListener">手动移除</el-button>
        </div>
        <div v-if="eventListening" class="event-log">
          <div class="event-log-label">点击页面任意位置，日志出现在这里：</div>
          <div v-if="!eventLog.length" class="event-empty">（等待点击...）</div>
          <div v-for="(log, i) in eventLog" :key="i" class="event-item">{{ log }}</div>
        </div>
        <div class="result-hint" style="margin-top:8px">
          点击【添加监听】后切换到主应用，在主应用页面点击，控制台会出现来自子应用的日志（泄露体现）
        </div>
      </div>
    </section>

    <!-- ══ 场景5: 原型链污染 ═════════════════════════════════════════════════ -->
    <section class="scenario">
      <div class="scenario-header">
        <span class="tag tag-5">场景 5</span>
        <h2>原型链污染 — 任何沙箱都防不住</h2>
        <span class="verdict verdict-fail">❌ 所有模式均泄露</span>
      </div>
      <div class="scenario-body">
        <p class="theory">
          修改 <code>Array.prototype</code>/<code>Object.prototype</code> 等内置原型是全局操作，
          qiankun 的 Proxy 沙箱只代理 window 属性，拦截不了原型链修改。
          污染后主应用的所有数组都会拥有这个方法，且在子应用卸载后仍然保留。
        </p>
        <div class="action-row">
          <el-button type="danger" :disabled="protoPolluted" @click="pollutPrototype">
            给 Array.prototype 注入 .sub3Sum()
          </el-button>
          <el-button @click="testProtoPollution">测试是否生效</el-button>
          <el-button type="success" @click="cleanProtoPollution">清除污染</el-button>
        </div>
        <div v-if="protoTestResult" class="result-box">
          <div class="result-val">{{ protoTestResult }}</div>
          <div class="result-hint">
            主应用控制台执行 <code>[1,2,3].sub3Sum()</code>，污染后应返回 6
          </div>
        </div>
      </div>
    </section>

    <!-- ══ 场景6: 单例模块隔离 ═══════════════════════════════════════════════ -->
    <section class="scenario">
      <div class="scenario-header">
        <span class="tag tag-6">场景 6</span>
        <h2>Pinia / mitt 单例 — JS 沙箱有效隔离</h2>
        <span class="verdict verdict-pass">✅ 有JS沙箱时安全</span>
      </div>
      <div class="scenario-body">
        <p class="theory">
          有 JS 沙箱时，每个子应用的模块系统（ESM）在自己的沙箱作用域内执行，
          各自得到独立的 Pinia 实例、mitt 实例。主应用无法通过 <code>window.__pinia</code> 访问子应用的 store。
          无 JS 沙箱时（<code>sandbox: false</code>）模块在全局作用域内执行，可能共享单例。
        </p>
        <div class="action-row">
          <el-button type="primary" @click="testSingleton">检测 Pinia 实例</el-button>
        </div>
        <div v-if="singletonResult" class="result-box">
          <pre class="result-pre">{{ singletonResult }}</pre>
          <div class="result-hint">
            主应用控制台执行 <code>window.__pinia</code>，有沙箱时应为 <code>undefined</code>
          </div>
        </div>
      </div>
    </section>

  </div>
</template>

<style scoped>
.test-page {
  padding: 24px 32px;
  background: #0f172a;
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #e2e8f0;
}

.page-header {
  margin-bottom: 28px;
  h1 { font-size: 24px; font-weight: 700; color: #f8fafc; margin: 0 0 10px; }
  p.desc { color: #64748b; font-size: 13px; margin: 6px 0 0; }
}

.mode-badge {
  display: inline-block;
  padding: 4px 14px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 4px;
}
.mode-none         { background: #1e293b; color: #94a3b8; border: 1px solid #334155; }
.mode-experimental { background: #78350f33; color: #fde68a; border: 1px solid #92400e; }
.mode-strict       { background: #7f1d1d33; color: #fca5a5; border: 1px solid #991b1b; }

.scenario {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 10px;
  margin-bottom: 20px;
  overflow: hidden;
}

.scenario-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  border-bottom: 1px solid #334155;
  h2 { margin: 0; font-size: 15px; font-weight: 600; color: #f1f5f9; flex: 1; }
}

.tag {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}
.tag-1 { background: #1e3a5f; color: #60a5fa; }
.tag-2 { background: #422006; color: #fb923c; }
.tag-3 { background: #14532d; color: #4ade80; }
.tag-4 { background: #4a1942; color: #e879f9; }
.tag-5 { background: #450a0a; color: #f87171; }
.tag-6 { background: #164e63; color: #22d3ee; }

.verdict {
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
  padding: 2px 10px;
  border-radius: 6px;
}
.verdict-fail { background: #450a0a; color: #f87171; }
.verdict-pass { background: #14532d; color: #4ade80; }

.scenario-body {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.theory {
  font-size: 13px;
  color: #94a3b8;
  line-height: 1.7;
  margin: 0;
  code {
    background: #0f172a;
    border: 1px solid #334155;
    padding: 1px 5px;
    border-radius: 3px;
    font-size: 12px;
    color: #7dd3fc;
  }
}

.action-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.result-box {
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.result-label {
  font-size: 12px;
  color: #64748b;
  code { color: #7dd3fc; background: transparent; }
}

.result-val {
  font-size: 13px;
  color: #e2e8f0;
  word-break: break-all;
}

.result-pre {
  font-size: 12px;
  color: #a3e635;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
}

.result-hint {
  font-size: 11px;
  color: #475569;
  code {
    background: #1e293b;
    border: 1px solid #334155;
    padding: 1px 4px;
    border-radius: 3px;
    color: #7dd3fc;
    font-size: 11px;
  }
}

/* ── 定时器展示 ── */
.timer-display {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 8px;
}

.timer-display.running {
  border-color: #f59e0b;
  box-shadow: 0 0 12px rgba(245, 158, 11, 0.2);
}

.timer-num {
  font-size: 36px;
  font-weight: 700;
  color: #fbbf24;
  font-variant-numeric: tabular-nums;
  min-width: 60px;
}

.timer-label {
  font-size: 13px;
  color: #64748b;
}

/* ── 事件日志 ── */
.event-log {
  background: #0f172a;
  border: 1px solid #ef4444;
  border-radius: 8px;
  padding: 10px 12px;
  max-height: 180px;
  overflow-y: auto;
}

.event-log-label {
  font-size: 11px;
  color: #ef4444;
  margin-bottom: 8px;
  font-weight: 600;
}

.event-empty { font-size: 12px; color: #475569; }

.event-item {
  font-size: 12px;
  color: #fca5a5;
  padding: 2px 0;
  font-family: monospace;
  border-bottom: 1px solid #1e293b;
}
</style>
