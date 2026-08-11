<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { usePromptStore } from '../stores/prompt'
import type { Prompt } from '../services/prompt.service'

const router = useRouter()
const route = useRoute()
const store = usePromptStore()

const searchText = ref('')
const activeCategory = ref('全部')
const showModal = ref(false)
const editingId = ref<number | null>(null)
const deleteConfirmId = ref<number | null>(null)

const form = ref({
  icon: '🤖',
  title: '',
  description: '',
  content: '',
  category: '通用',
})

const categories = computed(() => {
  const cats = new Set(store.prompts.map(p => p.category))
  return ['全部', ...Array.from(cats)]
})

const filtered = computed(() => {
  let list = store.prompts
  if (activeCategory.value !== '全部') {
    list = list.filter(p => p.category === activeCategory.value)
  }
  if (searchText.value.trim()) {
    const kw = searchText.value.trim().toLowerCase()
    list = list.filter(p =>
      p.title.toLowerCase().includes(kw) || p.description.toLowerCase().includes(kw),
    )
  }
  return list
})

onMounted(async () => {
  await store.fetchPrompts()
  if (route.query.new === '1') {
    openCreate()
    router.replace({ name: 'prompts' })
  }
})

function openCreate() {
  editingId.value = null
  form.value = { icon: '🤖', title: '', description: '', content: '', category: '通用' }
  showModal.value = true
}

function openEdit(p: Prompt) {
  editingId.value = p.id
  form.value = { icon: p.icon, title: p.title, description: p.description, content: p.content, category: p.category }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

const saving = ref(false)
const formError = ref('')

async function submitForm() {
  if (!form.value.title.trim() || !form.value.content.trim()) {
    formError.value = '标题和 Prompt 内容为必填项'
    return
  }
  formError.value = ''
  saving.value = true
  try {
    if (editingId.value) {
      await store.updatePrompt(editingId.value, form.value)
    } else {
      await store.createPrompt(form.value)
    }
    showModal.value = false
  } finally {
    saving.value = false
  }
}

async function confirmDelete(id: number) {
  await store.removePrompt(id)
  deleteConfirmId.value = null
}

// ── Variable insert ────────────────────────────────────────────────────────────
const contentTextareaRef = ref<HTMLTextAreaElement | null>(null)
const savedCursor = ref(0)
const showVarInsert = ref(false)
const newVarName = ref('')
const varNameInputRef = ref<HTMLInputElement | null>(null)

const QUICK_VARS = ['topic', 'role', 'language', 'context', 'input', 'task', 'style', 'format']

function onTextareaBlur() {
  savedCursor.value = contentTextareaRef.value?.selectionStart ?? form.value.content.length
}

function toggleVarInsert() {
  showVarInsert.value = !showVarInsert.value
  if (showVarInsert.value) {
    newVarName.value = ''
    nextTick(() => varNameInputRef.value?.focus())
  }
}

function insertVariable(name: string) {
  const clean = name.trim().replace(/\s+/g, '_')
  if (!clean) return
  const insertion = `{{${clean}}}`
  const pos = savedCursor.value
  const content = form.value.content
  form.value.content = content.slice(0, pos) + insertion + content.slice(pos)
  savedCursor.value = pos + insertion.length
  showVarInsert.value = false
  newVarName.value = ''
  nextTick(() => {
    const el = contentTextareaRef.value
    if (!el) return
    el.focus()
    el.selectionStart = savedCursor.value
    el.selectionEnd = savedCursor.value
  })
}

function confirmVarInsert() {
  insertVariable(newVarName.value)
}

function varChipLabel(name: string) {
  return `{{${name}}}`
}

function startChat(id: number) {
  router.push({ name: 'chat', params: { id } })
}
</script>

<template>
  <div class="pl-page">
    <div class="pl-header">
      <div class="pl-header-left">
        <h1 class="pl-title">Prompt 管理</h1>
        <span class="pl-count">{{ store.prompts.length }} 个 Prompt</span>
      </div>
      <button class="btn-primary" @click="openCreate">
        <span class="btn-icon">+</span>新建 Prompt
      </button>
    </div>

    <div class="pl-toolbar">
      <div class="pl-search">
        <span class="search-icon">🔍</span>
        <input v-model="searchText" placeholder="搜索标题或描述..." />
      </div>
      <div class="pl-cats">
        <button
          v-for="cat in categories"
          :key="cat"
          class="cat-btn"
          :class="{ active: activeCategory === cat }"
          @click="activeCategory = cat"
        >
          {{ cat }}
        </button>
      </div>
    </div>

    <div v-if="store.loading" class="pl-loading">
      <span class="spin" />加载中...
    </div>

    <div v-else-if="filtered.length === 0" class="pl-empty">
      <span class="empty-icon">📭</span>
      <p>{{ searchText ? '没有匹配的 Prompt' : '还没有 Prompt，点击右上角新建' }}</p>
    </div>

    <div v-else class="pl-grid">
      <div
        v-for="p in filtered"
        :key="p.id"
        class="pl-card"
        @click="startChat(p.id)"
      >
        <div class="card-head">
          <span class="card-icon">{{ p.icon }}</span>
          <span class="card-cat">{{ p.category }}</span>
        </div>
        <h3 class="card-title">{{ p.title }}</h3>
        <p class="card-desc">{{ p.description || '暂无描述' }}</p>
        <div class="card-preview">{{ p.content }}</div>
        <div class="card-footer" @click.stop>
          <button class="btn-chat" @click="startChat(p.id)">
            <span>💬</span> 开始对话
          </button>
          <div class="card-actions">
            <button class="btn-icon-action" title="编辑" @click="openEdit(p)">✏️</button>
            <button class="btn-icon-action btn-del" title="删除" @click="deleteConfirmId = p.id">🗑️</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirm -->
    <div v-if="deleteConfirmId" class="overlay" @click.self="deleteConfirmId = null">
      <div class="confirm-box">
        <p>确认删除这个 Prompt？此操作不可恢复。</p>
        <div class="confirm-actions">
          <button class="btn-ghost" @click="deleteConfirmId = null">取消</button>
          <button class="btn-danger" @click="confirmDelete(deleteConfirmId!)">删除</button>
        </div>
      </div>
    </div>

    <!-- Create / Edit Modal -->
    <div v-if="showModal" class="overlay" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <h2>{{ editingId ? '编辑 Prompt' : '新建 Prompt' }}</h2>
          <button class="btn-close" @click="closeModal">✕</button>
        </div>

        <div class="modal-body">
          <div class="form-row form-row--2col">
            <div class="field">
              <label>图标（Emoji）</label>
              <input v-model="form.icon" maxlength="4" placeholder="🤖" />
            </div>
            <div class="field">
              <label>分类</label>
              <input v-model="form.category" placeholder="开发 / 写作 / 通用..." />
            </div>
          </div>

          <div class="field">
            <label>标题 <span class="required">*</span></label>
            <input v-model="form.title" placeholder="为这个 Prompt 起个名字" />
          </div>

          <div class="field">
            <label>描述</label>
            <input v-model="form.description" placeholder="一句话说明这个 Prompt 的用途" />
          </div>

          <div class="field">
            <label>Prompt 内容（System Prompt）<span class="required">*</span></label>
            <textarea
              ref="contentTextareaRef"
              v-model="form.content"
              rows="6"
              placeholder="你是一位…请帮用户…&#10;&#10;支持变量：{{role}}、{{topic}} 等，点击下方「插入变量」添加"
              @blur="onTextareaBlur"
            />

            <!-- Variable insert toolbar -->
            <div class="var-toolbar">
              <button type="button" class="btn-insert-var" @click="toggleVarInsert">
                ⌗ 插入变量
              </button>

              <div v-if="showVarInsert" class="var-insert-inline">
                <span class="var-brace" v-text="'{{'" />
                <input
                  ref="varNameInputRef"
                  v-model="newVarName"
                  class="var-name-input"
                  placeholder="变量名"
                  @keydown.enter="confirmVarInsert"
                  @keydown.escape="showVarInsert = false"
                />
                <span class="var-brace" v-text="'}}'" />
                <button type="button" class="btn-confirm-var" @click="confirmVarInsert">插入</button>
              </div>

              <div class="quick-var-chips">
                <button
                  v-for="qv in QUICK_VARS"
                  :key="qv"
                  type="button"
                  class="quick-chip"
                  @click="insertVariable(qv)"
                >
                  {{ varChipLabel(qv) }}
                </button>
              </div>
            </div>
          </div>

          <p v-if="formError" class="form-error">{{ formError }}</p>
        </div>

        <div class="modal-footer">
          <button class="btn-ghost" @click="closeModal">取消</button>
          <button class="btn-primary" :disabled="saving" @click="submitForm">
            <span v-if="saving" class="spin-sm" />
            {{ saving ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pl-page {
  min-height: calc(100vh - 49px);
  padding: 28px 32px;
  background: #f8f9fc;
}

/* ── Header ── */
.pl-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.pl-header-left {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.pl-title {
  font-size: 22px;
  font-weight: 700;
  color: #1e1b4b;
  margin: 0;
}

.pl-count {
  font-size: 13px;
  color: #9ca3af;
}

/* ── Toolbar ── */
.pl-toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.pl-search {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fff;
  border: 1.5px solid #e5e7eb;
  border-radius: 8px;
  padding: 0 12px;
  flex: 0 0 260px;
}

.search-icon {
  font-size: 14px;
}

.pl-search input {
  border: none;
  outline: none;
  padding: 9px 0;
  font-size: 13px;
  color: #374151;
  background: transparent;
  width: 100%;
}

.pl-cats {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.cat-btn {
  padding: 6px 14px;
  border-radius: 20px;
  border: 1.5px solid #e5e7eb;
  background: #fff;
  font-size: 12px;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.15s;
}

.cat-btn.active,
.cat-btn:hover {
  border-color: #4f46e5;
  color: #4f46e5;
  background: #ede9fe;
}

/* ── States ── */
.pl-loading,
.pl-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 300px;
  color: #9ca3af;
  font-size: 14px;
}

.empty-icon {
  font-size: 40px;
}

/* ── Grid ── */
.pl-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 18px;
}

/* ── Card ── */
.pl-card {
  background: #fff;
  border: 1.5px solid #e5e7eb;
  border-radius: 14px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  cursor: pointer;
  transition: box-shadow 0.2s, border-color 0.2s, transform 0.15s;
}

.pl-card:hover {
  border-color: #a5b4fc;
  box-shadow: 0 4px 20px rgba(79, 70, 229, 0.1);
  transform: translateY(-2px);
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-icon {
  font-size: 24px;
  line-height: 1;
}

.card-cat {
  font-size: 11px;
  font-weight: 600;
  color: #4f46e5;
  background: #ede9fe;
  padding: 2px 10px;
  border-radius: 999px;
}

.card-title {
  font-size: 15px;
  font-weight: 700;
  color: #1e1b4b;
  margin: 0;
  line-height: 1.4;
}

.card-desc {
  font-size: 13px;
  color: #6b7280;
  margin: 0;
  line-height: 1.5;
}

.card-preview {
  font-size: 12px;
  color: #9ca3af;
  background: #f8f9fc;
  border-radius: 6px;
  padding: 8px 10px;
  line-height: 1.5;
  max-height: 54px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  flex: 1;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
  padding-top: 12px;
  border-top: 1px solid #f1f5f9;
}

.btn-chat {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  background: #4f46e5;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-chat:hover {
  background: #4338ca;
}

.card-actions {
  display: flex;
  gap: 4px;
}

.btn-icon-action {
  padding: 6px 8px;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-icon-action:hover {
  background: #f1f5f9;
}

.btn-del:hover {
  background: #fee2e2;
}

/* ── Shared Buttons ── */
.btn-primary {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 9px 18px;
  background: #4f46e5;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-primary:hover:not(:disabled) {
  background: #4338ca;
}

.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-icon {
  font-size: 18px;
  line-height: 1;
  margin-right: 2px;
}

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

.btn-ghost:hover {
  border-color: #9ca3af;
  color: #374151;
}

.btn-danger {
  padding: 8px 16px;
  background: #ef4444;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-danger:hover {
  background: #dc2626;
}

.btn-close {
  padding: 4px 8px;
  border: none;
  background: transparent;
  font-size: 16px;
  color: #9ca3af;
  cursor: pointer;
  border-radius: 4px;
}

.btn-close:hover {
  background: #f1f5f9;
  color: #374151;
}

/* ── Overlay ── */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

/* ── Delete Confirm ── */
.confirm-box {
  background: #fff;
  border-radius: 12px;
  padding: 28px 32px;
  max-width: 360px;
  width: 90%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.16);
}

.confirm-box p {
  font-size: 15px;
  color: #374151;
  margin: 0 0 20px;
  line-height: 1.6;
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

/* ── Modal ── */
.modal {
  background: #fff;
  border-radius: 14px;
  width: 560px;
  max-width: 95vw;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: #1e1b4b;
}

.modal-body {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
}

/* ── Form ── */
.form-row--2col {
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
  font-size: 13px;
  font-weight: 500;
  color: #374151;
}

.required {
  color: #ef4444;
}

.field input,
.field textarea {
  padding: 9px 12px;
  border: 1.5px solid #d1d5db;
  border-radius: 8px;
  font-size: 13px;
  color: #111827;
  outline: none;
  resize: vertical;
  transition: border-color 0.15s;
  font-family: inherit;
}

.field input:focus,
.field textarea:focus {
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
}

.form-error {
  font-size: 13px;
  color: #ef4444;
  margin: 0;
}

/* ── Spinner ── */
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
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

/* ── Variable insert toolbar ── */
.var-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
}

.btn-insert-var {
  padding: 4px 12px;
  border: 1.5px solid #a5b4fc;
  background: #f5f3ff;
  color: #4f46e5;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.btn-insert-var:hover {
  background: #ede9fe;
  border-color: #4f46e5;
}

.var-insert-inline {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #fff;
  border: 1.5px solid #4f46e5;
  border-radius: 7px;
  padding: 3px 8px;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
}

.var-brace {
  font-size: 13px;
  font-weight: 700;
  color: #4f46e5;
  font-family: monospace;
  user-select: none;
}

.var-name-input {
  border: none;
  outline: none;
  font-size: 13px;
  color: #374151;
  width: 100px;
  background: transparent;
  font-family: monospace;
}

.btn-confirm-var {
  padding: 3px 10px;
  background: #4f46e5;
  color: #fff;
  border: none;
  border-radius: 5px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-confirm-var:hover { background: #4338ca; }

.quick-var-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.quick-chip {
  padding: 3px 9px;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  color: #6b7280;
  border-radius: 5px;
  font-size: 11px;
  font-family: monospace;
  cursor: pointer;
  transition: all 0.15s;
}

.quick-chip:hover {
  border-color: #4f46e5;
  color: #4f46e5;
  background: #ede9fe;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
