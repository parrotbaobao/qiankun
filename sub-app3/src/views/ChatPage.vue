<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePromptStore } from '../stores/prompt'
import AiChat from '../views/AiChat.vue'
import { extractVariables, fillTemplate, formatVarLabel } from '../utils/template'
import type { Prompt } from '../services/prompt.service'

const route  = useRoute()
const router = useRouter()
const store  = usePromptStore()

// ── Prompt ────────────────────────────────────────────────────────────────────
const promptId = computed(() => Number(route.params.id))
const prompt   = computed(() => store.getById(promptId.value))

// ── Left panel – Prompt editor ────────────────────────────────────────────────
const editableContent = ref('')
const varValues       = ref<Record<string, string>>({})

const variables = computed(() => extractVariables(editableContent.value))

const filledPrompt = computed(() =>
  fillTemplate(editableContent.value, varValues.value),
)

// When prompt loads (or changes via route)
watch(prompt, (p) => {
  if (!p) return
  editableContent.value = p.content
  varValues.value = {}
}, { immediate: true })

// ── Left panel – Model settings ───────────────────────────────────────────────
const APIS = [
  { value: 'http://localhost:3000/api/chat', label: '面试对话' },
  { value: 'http://localhost:3000/api/ask',  label: '通用问答' },
]
const selectedApi = ref('http://localhost:3000/api/chat')

const MODELS = [
  { value: 'google/gemma-4-e4b',                label: 'Gemma 3 4B' },
  { value: 'google/gemma-3-12b',               label: 'Gemma 3 12B' },
  { value: 'meta-llama/llama-3.1-8b-instruct', label: 'Llama 3.1 8B' },
  { value: 'deepseek/deepseek-r1',             label: 'DeepSeek R1' },
  { value: 'qwen/qwen2.5-7b-instruct',         label: 'Qwen 2.5 7B' },
]
const model       = ref('google/gemma-4-e4b')
const temperature = ref(0.7)
const maxTokens   = ref(512)
const topP        = ref(1.0)

// ── Left panel – Save ─────────────────────────────────────────────────────────
const saving     = ref(false)
const savedFlash = ref(false)

async function savePrompt() {
  if (!prompt.value) return
  saving.value = true
  try {
    await store.updatePrompt(prompt.value.id, { content: editableContent.value })
    savedFlash.value = true
    setTimeout(() => (savedFlash.value = false), 2000)
  } finally {
    saving.value = false
  }
}

// ── Save as new Prompt ────────────────────────────────────────────────────────
const showSaveModal = ref(false)
const saveForm = ref({ title: '', description: '', icon: '🤖', category: '通用' })
const saveError = ref('')
const savingNew = ref(false)

function openSaveModal() {
  saveForm.value = {
    title: '',
    description: '',
    icon: prompt.value?.icon ?? '🤖',
    category: prompt.value?.category ?? '通用',
  }
  saveError.value = ''
  showSaveModal.value = true
}

async function saveAsPrompt() {
  if (!saveForm.value.title.trim()) { saveError.value = '请填写标题'; return }
  savingNew.value = true
  try {
    await store.createPrompt({
      ...saveForm.value,
      content: filledPrompt.value,
    } as Omit<Prompt, 'id' | 'createdAt' | 'updatedAt'>)
    showSaveModal.value = false
  } finally {
    savingNew.value = false
  }
}

// ── Right panel – AiChat ref ─────────────────────────────────────────────────
const chatRef = ref<{
  clearMessages: () => void
  setInput: (t: string) => void
  sendMessage: (t: string) => void
} | null>(null)

function clearChat() {
  chatRef.value?.clearMessages()
}

// ── USER MESSAGE template + Run ───────────────────────────────────────────────
const userMessage = ref('')

const userMsgVariables = computed(() => extractVariables(userMessage.value))

// Merge user-message variables into the same varValues pool
watch(userMsgVariables, () => {
  const allVars = [...new Set([...variables.value, ...userMsgVariables.value])]
  const next: Record<string, string> = {}
  for (const v of allVars) next[v] = varValues.value[v] ?? ''
  varValues.value = next
})

const filledUserMessage = computed(() =>
  fillTemplate(userMessage.value, varValues.value),
)

// All variables (system prompt + user message combined, deduped)
const allVariables = computed(() =>
  [...new Set([...variables.value, ...userMsgVariables.value])],
)

// Sync varValues to allVariables
watch(allVariables, (vars) => {
  const next: Record<string, string> = {}
  for (const v of vars) next[v] = varValues.value[v] ?? ''
  varValues.value = next
})

function runPrompt() {
  const msg = filledUserMessage.value.trim()
  if (!msg) return
  chatRef.value?.sendMessage(msg)
}

// ── Panel collapse ────────────────────────────────────────────────────────────
const leftOpen = ref(true)

onMounted(async () => {
  if (!store.prompts.length) await store.fetchPrompts()
})
</script>

<template>
  <div class="pg-root">

    <!-- ── Top bar ── -->
    <header class="pg-topbar">
      <button class="tb-btn" @click="router.push({ name: 'prompts' })">← Prompts</button>

      <div v-if="prompt" class="tb-identity">
        <span class="tb-icon">{{ prompt.icon }}</span>
        <span class="tb-name">{{ prompt.title }}</span>
        <span class="tb-cat">{{ prompt.category }}</span>
      </div>

      <div class="tb-actions">
        <button class="tb-btn" :class="{ 'tb-btn--flash': savedFlash }" :disabled="saving" @click="savePrompt">
          {{ savedFlash ? '✓ 已保存' : saving ? '保存中...' : '💾 保存' }}
        </button>
        <button class="tb-btn" @click="clearChat">🗑 清空对话</button>
        <button class="tb-btn tb-btn--ghost" @click="leftOpen = !leftOpen">
          {{ leftOpen ? '◀ 收起' : '▶ 展开' }}
        </button>
      </div>
    </header>

    <!-- ── Loading ── -->
    <div v-if="!prompt" class="pg-center">
      <span class="spin" /> 加载中...
    </div>

    <!-- ── Main split ── -->
    <div v-else class="pg-body">

      <!-- ═══ LEFT PANEL ═══ -->
      <aside class="pg-left" :class="{ 'pg-left--collapsed': !leftOpen }">
        <div class="pg-left-inner">

          <!-- System Prompt -->
          <section class="panel-section">
            <div class="panel-label">
              <span>SYSTEM</span>
              <span class="char-count">{{ editableContent.length }} 字符</span>
            </div>
            <textarea
              v-model="editableContent"
              class="system-textarea"
              placeholder="输入 System Prompt，用 {{变量名}} 定义变量..."
              spellcheck="false"
            />
          </section>

          <!-- USER MESSAGE template -->
          <section class="panel-section">
            <div class="panel-label">
              <span>USER MESSAGE</span>
              <span class="label-hint">可含变量</span>
            </div>
            <textarea
              v-model="userMessage"
              class="user-msg-textarea"
              rows="3"
              placeholder="输入用户消息模板，点击 ▶ 运行发送..."
              spellcheck="false"
            />
            <button
              class="btn-run"
              :disabled="!filledUserMessage.trim()"
              @click="runPrompt"
            >
              ▶ 发送
            </button>
          </section>

          <!-- Variables (combined from system + user message) -->
          <section v-if="allVariables.length" class="panel-section">
            <div class="panel-label">
              <span>VARIABLES</span>
              <span class="var-count">{{ allVariables.length }}</span>
            </div>
            <div class="var-list">
              <div v-for="v in allVariables" :key="v" class="var-row">
                <span class="var-key" :title="v">{{ formatVarLabel(v) }}</span>
                <input
                  v-model="varValues[v]"
                  class="var-input"
                  :class="{ 'var-input--empty': !varValues[v] }"
                  :placeholder="v"
                />
              </div>
            </div>
          </section>

          <!-- API selection -->
          <section class="panel-section">
            <div class="panel-label"><span>接口</span></div>
            <select v-model="selectedApi" class="ctrl-select">
              <option v-for="a in APIS" :key="a.value" :value="a.value">{{ a.label }}</option>
            </select>
          </section>

          <!-- Model settings -->
          <section class="panel-section">
            <div class="panel-label"><span>MODEL</span></div>
            <select v-model="model" class="ctrl-select">
              <option v-for="m in MODELS" :key="m.value" :value="m.value">{{ m.label }}</option>
            </select>
          </section>

          <section class="panel-section">
            <div class="panel-label">
              <span>TEMPERATURE</span>
              <span class="param-chip">{{ temperature.toFixed(2) }}</span>
            </div>
            <input type="range" v-model.number="temperature" min="0" max="2" step="0.01" class="ctrl-range" />
            <div class="range-labels"><span>精确</span><span>创意</span></div>
          </section>

          <section class="panel-section">
            <div class="panel-label">
              <span>TOP P</span>
              <span class="param-chip">{{ topP.toFixed(2) }}</span>
            </div>
            <input type="range" v-model.number="topP" min="0" max="1" step="0.01" class="ctrl-range" />
          </section>

          <section class="panel-section">
            <div class="panel-label"><span>MAX TOKENS</span></div>
            <input type="number" v-model.number="maxTokens" min="128" max="2048" step="128" class="ctrl-number" />
          </section>

          <!-- Actions -->
          <section class="panel-section panel-section--actions">
            <button class="action-btn action-btn--outline" @click="openSaveModal">
              ＋ 另存为新 Prompt
            </button>
            <button class="action-btn action-btn--ghost" @click="router.push({ name: 'prompts', query: { new: '1' } })">
              返回 Prompt 列表
            </button>
          </section>

        </div>
      </aside>

      <!-- ═══ DIVIDER ═══ -->
      <div class="pg-divider" />

      <!-- ═══ RIGHT PANEL – Chat ═══ -->
      <div class="pg-right">
        <AiChat
          ref="chatRef"
          :system-prompt="filledPrompt"
          :title="prompt.title"
          :temperature="temperature"
          :model="model"
          :max-tokens="maxTokens"
          :top-p="topP"
          :hide-header="true"
          :url="selectedApi"
        />
      </div>

    </div>

    <!-- ── Save as new Prompt modal ── -->
    <div v-if="showSaveModal" class="overlay" @click.self="showSaveModal = false">
      <div class="modal">
        <div class="modal-header">
          <h2>另存为新 Prompt</h2>
          <button class="btn-close" @click="showSaveModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-2col">
            <div class="field"><label>图标</label><input v-model="saveForm.icon" maxlength="4" /></div>
            <div class="field"><label>分类</label><input v-model="saveForm.category" /></div>
          </div>
          <div class="field">
            <label>标题 <span class="req">*</span></label>
            <input v-model="saveForm.title" placeholder="为这个 Prompt 取个名字" />
          </div>
          <div class="field">
            <label>描述</label>
            <input v-model="saveForm.description" placeholder="一句话说明用途" />
          </div>
          <div class="field">
            <label>内容预览（当前填充后的 Prompt）</label>
            <textarea :value="filledPrompt" rows="4" readonly class="readonly-ta" />
          </div>
          <p v-if="saveError" class="form-error">{{ saveError }}</p>
        </div>
        <div class="modal-footer">
          <button class="btn-ghost" @click="showSaveModal = false">取消</button>
          <button class="btn-primary" :disabled="savingNew" @click="saveAsPrompt">
            <span v-if="savingNew" class="spin-sm" />{{ savingNew ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* ── Root ── */
.pg-root {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 49px);
  background: #f9fafb;
  overflow: hidden;
}

/* ── Top bar ── */
.pg-topbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  height: 48px;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.tb-identity {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.tb-icon { font-size: 18px; }

.tb-name {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.tb-cat {
  font-size: 11px;
  font-weight: 600;
  color: #4f46e5;
  background: #ede9fe;
  padding: 2px 8px;
  border-radius: 999px;
}

.tb-actions {
  display: flex;
  gap: 6px;
  margin-left: auto;
}

.tb-btn {
  padding: 5px 12px;
  border: 1px solid #e5e7eb;
  background: #fff;
  border-radius: 6px;
  font-size: 12px;
  color: #374151;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.tb-btn:hover:not(:disabled) {
  border-color: #4f46e5;
  color: #4f46e5;
}

.tb-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.tb-btn--flash {
  border-color: #10b981 !important;
  color: #10b981 !important;
  background: #ecfdf5 !important;
}

.tb-btn--ghost {
  border-color: transparent;
  background: transparent;
  color: #9ca3af;
}

/* ── Center loading ── */
.pg-center {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #9ca3af;
  font-size: 14px;
}

/* ── Body split ── */
.pg-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* ── Left panel ── */
.pg-left {
  width: 320px;
  flex-shrink: 0;
  background: #fff;
  border-right: 1px solid #e5e7eb;
  overflow: hidden;
  transition: width 0.22s ease;
  display: flex;
  flex-direction: column;
}

.pg-left--collapsed { width: 0; }

.pg-left-inner {
  width: 320px;
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* ── Panel sections ── */
.panel-section {
  padding: 14px 16px;
  border-bottom: 1px solid #f3f4f6;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.panel-section--actions {
  border-bottom: none;
  margin-top: auto;
  padding-top: 16px;
}

.panel-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #9ca3af;
}

.char-count {
  font-size: 10px;
  font-weight: 400;
  color: #d1d5db;
}

.var-count {
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  background: #4f46e5;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.label-hint {
  font-size: 10px;
  font-weight: 400;
  color: #c4c9d4;
}

/* ── User message textarea ── */
.user-msg-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 12.5px;
  color: #374151;
  line-height: 1.6;
  resize: vertical;
  outline: none;
  box-sizing: border-box;
  background: #fafafa;
  font-family: inherit;
  transition: border-color 0.15s, background 0.15s;
}

.user-msg-textarea:focus {
  border-color: #4f46e5;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.06);
}

/* ── Run button ── */
.btn-run {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 9px 12px;
  background: #4f46e5;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
}

.btn-run:hover:not(:disabled) { background: #4338ca; }

.btn-run:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ── System prompt textarea ── */
.system-textarea {
  width: 100%;
  min-height: 160px;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 12.5px;
  font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
  color: #374151;
  line-height: 1.7;
  resize: vertical;
  outline: none;
  box-sizing: border-box;
  background: #fafafa;
  transition: border-color 0.15s, background 0.15s;
}

.system-textarea:focus {
  border-color: #4f46e5;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.06);
}

/* ── Variables ── */
.var-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.var-row {
  display: grid;
  grid-template-columns: 80px 1fr;
  align-items: center;
  gap: 8px;
}

.var-key {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.var-input {
  padding: 6px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 12px;
  color: #374151;
  outline: none;
  transition: border-color 0.15s;
  background: #fff;
}

.var-input:focus { border-color: #4f46e5; }

.var-input--empty {
  border-color: #fde68a;
  background: #fffdf0;
}

/* ── Model controls ── */
.ctrl-select {
  padding: 7px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 7px;
  font-size: 12px;
  color: #374151;
  background: #fff;
  outline: none;
  cursor: pointer;
  transition: border-color 0.15s;
}

.ctrl-select:focus { border-color: #4f46e5; }

.ctrl-range {
  width: 100%;
  accent-color: #4f46e5;
  cursor: pointer;
}

.range-labels {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #d1d5db;
  margin-top: -4px;
}

.param-chip {
  font-size: 11px;
  font-weight: 700;
  color: #4f46e5;
  background: #ede9fe;
  padding: 1px 8px;
  border-radius: 4px;
}

.ctrl-number {
  padding: 7px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 7px;
  font-size: 12px;
  color: #374151;
  outline: none;
  width: 100%;
  box-sizing: border-box;
  transition: border-color 0.15s;
}

.ctrl-number:focus { border-color: #4f46e5; }

/* ── Action buttons ── */
.action-btn {
  width: 100%;
  padding: 9px 12px;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  text-align: center;
}

.action-btn--outline {
  border: 1.5px solid #4f46e5;
  background: transparent;
  color: #4f46e5;
}

.action-btn--outline:hover { background: #ede9fe; }

.action-btn--ghost {
  border: 1px solid #e5e7eb;
  background: transparent;
  color: #6b7280;
}

.action-btn--ghost:hover { border-color: #9ca3af; color: #374151; }

/* ── Divider ── */
.pg-divider {
  width: 1px;
  background: #e5e7eb;
  flex-shrink: 0;
}

/* ── Right panel – Chat ── */
.pg-right {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #fff;
}

/* ── Modal ── */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.modal {
  background: #fff;
  border-radius: 14px;
  width: 500px;
  max-width: 95vw;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 16px 56px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 24px 14px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #111827;
}

.modal-body {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 24px;
  border-top: 1px solid #e5e7eb;
}

.form-2col {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 12px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field label {
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
}

.field input {
  padding: 9px 12px;
  border: 1.5px solid #e5e7eb;
  border-radius: 8px;
  font-size: 13px;
  color: #111827;
  outline: none;
  transition: border-color 0.15s;
}

.field input:focus { border-color: #4f46e5; }

.readonly-ta {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 12px;
  color: #6b7280;
  background: #f9fafb;
  resize: none;
  font-family: inherit;
  line-height: 1.5;
  box-sizing: border-box;
}

.req { color: #ef4444; }
.form-error { font-size: 13px; color: #ef4444; margin: 0; }

.btn-close {
  padding: 4px 8px;
  border: none;
  background: transparent;
  font-size: 16px;
  color: #9ca3af;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s;
}

.btn-close:hover { background: #f3f4f6; color: #374151; }

.btn-ghost {
  padding: 8px 16px;
  border: 1.5px solid #e5e7eb;
  background: transparent;
  border-radius: 8px;
  font-size: 13px;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-ghost:hover { border-color: #9ca3af; color: #374151; }

.btn-primary {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  background: #4f46e5;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-primary:hover:not(:disabled) { background: #4338ca; }
.btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }

/* ── Spinners ── */
.spin {
  display: inline-block;
  width: 18px;
  height: 18px;
  border: 2.5px solid #c7d2fe;
  border-top-color: #4f46e5;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

.spin-sm {
  display: inline-block;
  width: 13px;
  height: 13px;
  border: 2px solid rgba(255,255,255,0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }
</style>
