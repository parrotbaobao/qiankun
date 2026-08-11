<template>
  <div class="cvp">

    <!-- ── 左侧对话列表 ── -->
    <aside class="cvp-sidebar">
      <div class="cvp-sidebar-top">
        <button class="btn-new" @click="handleNew">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.8"
            stroke-linecap="round">
            <path d="M6.5 1v11M1 6.5h11" />
          </svg>
          新对话
        </button>
      </div>

      <div class="cvp-list" v-if="!store.loading">
        <div v-for="conv in store.list" :key="conv.id" class="cvp-item"
          :class="{ 'cvp-item--active': currentId === conv.id }" @click="handleSelect(conv.id)">
          <div class="cvp-item-body">
            <template v-if="editingId === conv.id">
              <input class="cvp-rename-input" v-model="editingTitle" @keydown.enter.prevent="commitRename(conv.id)"
                @keydown.escape="editingId = ''" @blur="commitRename(conv.id)" ref="renameInputRef" @click.stop />
            </template>
            <template v-else>
              <p class="cvp-item-title">{{ conv.title }}</p>
              <span class="cvp-item-meta">{{ conv.messageCount }} 条 · {{ formatTime(conv.updatedAt) }}</span>
            </template>
          </div>

          <div class="cvp-item-actions" @click.stop>
            <button class="ia-btn" title="重命名" @click="startRename(conv)">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            <button class="ia-btn ia-btn--del" title="删除" @click="handleDelete(conv.id)">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </button>
          </div>
        </div>

        <div v-if="!store.list.length" class="cvp-empty">暂无对话记录</div>
      </div>

      <div v-else class="cvp-loading">加载中…</div>
    </aside>

    <!-- ── 右侧对话窗口 ── -->
    <div class="cvp-main">
      <AiChat v-if="currentId" :key="currentId" :conversation-id="currentId"
        @conversation-updated="store.refreshItem(currentId)" hide-header />
      <div v-else class="cvp-placeholder">
        <div class="cvp-placeholder-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"
            stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <p>选择或新建一个对话开始聊天</p>
        <button class="btn-new btn-new--lg" @click="handleNew">＋ 新建对话</button>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { useConversationStore } from '../stores/conversation'
import AiChat from './ai-chat/AiChat.vue'
import type { ConvSummary } from '../services/conversation.service'

const store = useConversationStore()
const currentId = ref('')
const editingId = ref('')
const editingTitle = ref('')
const renameInputRef = ref<HTMLInputElement | null>(null)
onMounted(() => store.fetchList())

async function handleNew() {
  const conv = await store.create()
  currentId.value = conv.id
}

async function handleSelect(id: string) {
  if (currentId.value === id) return
  currentId.value = id
  await store.select(id)
}

async function handleDelete(id: string) {
  if (!confirm('确认删除这条对话？')) return
  await store.remove(id)
  if (currentId.value === id) currentId.value = ''
}

function startRename(conv: ConvSummary) {
  editingId.value = conv.id
  editingTitle.value = conv.title
  nextTick(() => renameInputRef.value?.focus())
}

async function commitRename(id: string) {
  const title = editingTitle.value.trim()
  if (title) await store.rename(id, title)
  editingId.value = ''
}

function formatTime(ts: number) {
  const d = new Date(ts)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
}
</script>

<style scoped lang="scss">
.cvp {
  display: flex;
  height: 100%;
  background: #fff;
  overflow: hidden;
}

/* ── 侧栏 ── */
.cvp-sidebar {
  width: 260px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #f0f0f0;
  background: #fafafa;
}

.cvp-sidebar-top {
  padding: 14px 12px 10px;
  border-bottom: 1px solid #f0f0f0;
}

.btn-new {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1.5px dashed #d4d4d4;
  background: transparent;
  color: #555;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: #7c3aed;
    color: #7c3aed;
    background: #faf5ff;
  }

  &--lg {
    border-style: solid;
    background: #7c3aed;
    border-color: #7c3aed;
    color: #fff;
    width: auto;
    padding: 10px 20px;
    font-size: 14px;
    border-radius: 10px;

    &:hover {
      background: #6d28d9;
      border-color: #6d28d9;
      color: #fff;
    }
  }
}

/* ── 列表 ── */
.cvp-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cvp-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.1s;
  min-height: 52px;

  &:hover {
    background: #f0f0f0;
  }

  &:hover .cvp-item-actions {
    opacity: 1;
  }

  &--active {
    background: #ede9fe;

    .cvp-item-title {
      color: #5b21b6;
    }

    .cvp-item-meta {
      color: #8b5cf6;
    }
  }
}

.cvp-item-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cvp-item-title {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  color: #18181b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cvp-item-meta {
  font-size: 11px;
  color: #a1a1aa;
}

.cvp-item-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.1s;
  flex-shrink: 0;
}

.ia-btn {
  width: 24px;
  height: 24px;
  border-radius: 5px;
  border: none;
  background: transparent;
  color: #71717a;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.1s;

  &:hover {
    background: #e4e4e7;
    color: #18181b;
  }

  &--del:hover {
    background: #fee2e2;
    color: #ef4444;
  }
}

.cvp-rename-input {
  width: 100%;
  border: 1.5px solid #7c3aed;
  border-radius: 5px;
  padding: 2px 6px;
  font-size: 13px;
  outline: none;
  background: #fff;
  color: #18181b;
}

.cvp-empty {
  padding: 20px 12px;
  font-size: 13px;
  color: #a1a1aa;
  text-align: center;
}

.cvp-loading {
  padding: 20px 12px;
  font-size: 13px;
  color: #a1a1aa;
  text-align: center;
}

/* ── 主区域 ── */
.cvp-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.cvp-placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  color: #a1a1aa;

  .cvp-placeholder-icon {
    width: 64px;
    height: 64px;
    border-radius: 16px;
    background: #f4f4f5;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #c0c0c0;
  }

  p {
    margin: 0;
    font-size: 14px;
  }
}
</style>
