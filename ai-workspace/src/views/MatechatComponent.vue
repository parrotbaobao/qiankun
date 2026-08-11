<template>
  <div class="mc-page">
    <!-- ── 顶部导航 ── -->
    <header class="mc-header">
      <div class="mc-header-icon">
        <IconBolt :size="16" />
      </div>
      <span class="mc-header-title">AI 助手 · 组件引用版</span>
      <span class="mc-header-badge">@matechat/core</span>
      <!-- 新对话按钮 -->
      <button class="mc-new-btn" @click="newConversation" title="新对话">
        <IconPlus :size="14" />
      </button>
    </header>

    <!-- ── 消息区 ── -->
    <div class="mc-body" ref="bodyRef">
      <!-- 空态 + 快捷提问 -->
      <div v-if="!messages.length" class="mc-empty">
        <div class="mc-empty-icon">
          <IconChat :size="40" stroke-width="1.2" />
        </div>
        <p class="mc-empty-title">有什么可以帮到你？</p>
        <p class="mc-empty-sub">通过 McBubble + McMarkdownCard + McInput 构建</p>
        <div class="mc-prompts">
          <button v-for="p in quickPrompts" :key="p" class="mc-prompt-btn" @click="sendQuick(p)">
            {{ p }}
          </button>
        </div>
      </div>

      <!-- 消息列表 -->
      <div class="mc-message-list">
        <template v-for="(msg, i) in messages" :key="i">

          <!-- 用户消息 -->
          <McBubble v-if="msg.from === 'user'" :content="msg.content" align="right" :avatarConfig="userAvatar"
            class="mc-msg">
            <template #bottom>
              <div class="mc-actions">
                <button class="mc-act-btn" title="重新回答" @click="reAnswer(i)">
                  <IconRefresh :size="12" />
                </button>
              </div>
            </template>
          </McBubble>

          <!-- AI 消息 -->
          <McBubble v-else align="left" :loading="msg.loading && msg.status !== 'RECONNECTING'" :avatarConfig="aiAvatar"
            class="mc-msg">
            <!-- 重连中提示 -->
            <template v-if="msg.status === 'RECONNECTING'">
              <span class="mc-reconnecting">
                <IconRefresh class="mc-spin" :size="13" stroke-width="2.2" />
                重连中…
              </span>
            </template>

            <!-- 正文 Markdown -->
            <McMarkdownCard v-else-if="!msg.loading" :content="msg.content" theme="light" />

            <!-- bottom：状态 + 操作按钮 + 点踩弹窗 -->
            <template #bottom v-if="!msg.loading && msg.status !== 'RECONNECTING'">
              <div class="mc-meta-row">
                <!-- 状态标记 -->
                <span v-if="msg.status === 'DONE'" class="mc-status mc-status--done">
                  <IconCheck :size="11" />
                  已完成
                </span>
                <span v-else-if="msg.status === 'STOPPED'" class="mc-status mc-status--stopped">
                  <IconStopRect :size="10" />
                  已停止
                </span>
                <!-- 操作按钮：完成或停止后显示 -->
                <div v-if="msg.status === 'DONE' || msg.status === 'STOPPED'" class="mc-actions">
                  <!-- 复制 -->
                  <button class="mc-act-btn" :class="{ 'mc-act-btn--done': copiedIdx === i }"
                    :title="copiedIdx === i ? '已复制' : '复制'" @click="copyMsg(i)">
                    <IconCheck v-if="copiedIdx === i" :size="12" />
                    <IconCopy v-else :size="12" />
                  </button>
                  <!-- 点赞 -->
                  <button class="mc-act-btn" :class="{ 'mc-act-btn--like': feedbackMap[i] === 1 }" title="点赞"
                    @click="toggleLike(i)">
                    <IconThumbUp :size="12" />
                  </button>
                  <!-- 点踩 -->
                  <button class="mc-act-btn" :class="{ 'mc-act-btn--dislike': feedbackMap[i] === -1 }" title="点踩"
                    @click="openDislike(i)">
                    <IconThumbDown :size="12" />
                  </button>
                  <!-- 重新生成 -->
                  <button v-if="msg.status === 'DONE'" class="mc-act-btn" title="重新生成" @click="regenerate(i)">
                    <IconRefresh :size="12" />
                  </button>
                </div>
              </div>

              <!-- 点踩弹窗 -->
              <div v-if="dislike.idx === i" class="mc-dislike-popup">
                <p class="mc-dislike-title">请告诉我们哪里不对</p>
                <div class="mc-dislike-tags">
                  <button v-for="tag in DISLIKE_TAGS" :key="tag" class="mc-dislike-tag"
                    :class="{ 'mc-dislike-tag--on': dislike.tags.includes(tag) }" @click="toggleTag(tag)">{{ tag
                    }}</button>
                </div>
                <textarea class="mc-dislike-comment" v-model="dislike.comment" placeholder="补充说明（选填）" rows="2" />
                <div class="mc-dislike-footer">
                  <button class="mc-dislike-cancel" @click="closeDislike">取消</button>
                  <button class="mc-dislike-submit" @click="submitDislike(i)">提交</button>
                </div>
              </div>
            </template>
          </McBubble>

        </template>
      </div>
    </div>

    <!-- ── 输入区 ── -->
    <div class="mc-footer">
      <McInput :value="inputText" placeholder="发送消息…" variant="bordered" :loading="streaming" :maxLength="2000"
        :show-count="true" @change="(v: string) => (inputText = v)" @submit="handleSubmit" />
      <p class="mc-footer-hint">Enter 发送 · Shift+Enter 换行 · 流式输出中 Enter 可停止</p>
    </div>
  </div>
</template>

<script setup lang="ts">
// ── Tab1：组件引用版 ──────────────────────────────────────────────────────────
// 这个文件演示如何直接从 npm 包 @matechat/core 引入组件来搭建 AI 聊天界面。
// 与 Tab2（源码版）的区别：不知道组件内部实现，只通过 props/事件/slot 使用它们。

// ── matechat 组件导入 ─────────────────────────────────────────────────────────
// McBubble     → 消息气泡组件（左/右对齐、头像、loading 动画）
// McInput      → 输入框组件（自动增高、快捷键、停止按钮、工具栏 slot）
// McMarkdownCard → Markdown 渲染组件（代码高亮、XSS 过滤、VNode 增量更新）
import { McBubble, McInput, McMarkdownCard } from '@matechat/core'

// ── 图标组件 ──────────────────────────────────────────────────────────────────
// 原来是内联 SVG，用户改为独立图标组件，更易维护复用
import IconBolt from '@/components/icons/IconBolt.vue'
import IconPlus from '@/components/icons/IconPlus.vue'
import IconChat from '@/components/icons/IconChat.vue'
import IconRefresh from '@/components/icons/IconRefresh.vue'
import IconCheck from '@/components/icons/IconCheck.vue'
import IconStopRect from '@/components/icons/IconStopRect.vue'
import IconCopy from '@/components/icons/IconCopy.vue'
import IconThumbUp from '@/components/icons/IconThumbUp.vue'
import IconThumbDown from '@/components/icons/IconThumbDown.vue'

// ── matechat 各组件的 CSS 样式 ────────────────────────────────────────────────
// @matechat/core 按组件拆分了 CSS，需要每个单独引入（不像 element-plus 有统一入口）
// 这些 CSS 用了 devui-theme 的 CSS 变量（--devui-xxx），有默认值，不配主题也能工作
import '@matechat/core/Bubble/index.css'
import '@matechat/core/Input/index.css'
import '@matechat/core/MarkdownCard/index.css'

import { onBeforeUnmount, reactive, ref, nextTick } from 'vue'
import { createChatStream } from '@/services/chat.service'  // 项目内封装的 SSE 流式请求工具

// ── 类型定义 ──────────────────────────────────────────────────────────────────
// 一条聊天消息的数据结构
interface ChatMsg {
  from: 'user' | 'ai'   // 消息来源：用户 or AI
  content: string        // 消息正文（AI 消息在流式输出时逐步追加）
  loading?: boolean      // true = AI 还在输出中，显示三点 loading 动画
  // 消息状态（影响底部操作栏的显示）：
  //   DONE       → 正常完成，显示复制/点赞/点踩/重新生成按钮
  //   STOPPED    → 用户手动停止，显示"已停止"标记
  //   RECONNECTING → 断线重连中，显示转圈提示
  //   ERROR      → 请求失败，显示错误信息
  status?: 'DONE' | 'STOPPED' | 'RECONNECTING' | 'ERROR'
}

// ── 常量 ──────────────────────────────────────────────────────────────────────
// 点踩弹窗的原因标签，用户可以多选
const DISLIKE_TAGS = ['不准确', '答非所问', '内容有害', '回答太长', '回答太短', '其他']

// 空态时显示的快捷提问，点击后直接发送
const quickPrompts = ['用一句话解释量子纠缠', '写一首关于秋天的短诗', '什么是微前端架构？']

// McBubble 的头像配置（没有 imgSrc 时显示 displayName 首字母的文字头像）
const userAvatar = { displayName: '我', isRound: true, width: 32, height: 32 }
const aiAvatar = { displayName: 'AI', isRound: true, width: 32, height: 32 }

// ── 响应式状态 ────────────────────────────────────────────────────────────────
const bodyRef = ref<HTMLElement | null>(null)    // 消息区 DOM 引用，用于滚动控制
const inputText = ref('')                          // 输入框当前文字
const streaming = ref(false)                       // true = 正在接收 AI 流式输出
const messages = ref<ChatMsg[]>([])               // 全部消息列表（用户+AI交替）
const copiedIdx = ref<number | null>(null)         // 当前"已复制"的消息索引，1.5s 后清空
const feedbackMap = reactive<Record<number, 1 | -1>>({})  // 各消息的点赞(1)/点踩(-1)状态

// 点踩弹窗的状态（reactive 而不是多个 ref，方便整体重置）
// idx=-1 表示当前没有弹窗打开（-1 是哨兵值，不会与任何消息索引相同）
const dislike = reactive({ idx: -1, tags: [] as string[], comment: '' })

// ── 流式请求的句柄 ────────────────────────────────────────────────────────────
// abortFn: 调用后会终止底层的 fetchEventSource HTTP 连接 + 清理打字机
let abortFn: (() => void) | null = null

// ── 生命周期：组件销毁时清理 ──────────────────────────────────────────────────
onBeforeUnmount(() => {
  abortFn?.()
})

// ── 滚动到底部 ────────────────────────────────────────────────────────────────
// 用 nextTick 等 Vue 把新消息渲染到 DOM 后再滚，否则 scrollHeight 还是旧值
function scrollToBottom() {
  nextTick(() => {
    if (bodyRef.value) bodyRef.value.scrollTop = bodyRef.value.scrollHeight
  })
}

// ── 开启新对话 ────────────────────────────────────────────────────────────────
// 先取消当前流式请求，再清空所有状态
function newConversation() {
  abortFn?.()
  streaming.value = false
  messages.value = []
  inputText.value = ''
  Object.keys(feedbackMap).forEach(k => delete feedbackMap[+k])  // 清空点赞/踩记录
  dislike.idx = -1  // 关闭点踩弹窗
}

// ── 点击快捷提问按钮 ──────────────────────────────────────────────────────────
// 先填入输入框，nextTick 后调用发送（直接 handleSubmit(text) 跳过输入框赋值也可以）
function sendQuick(text: string) {
  inputText.value = text
  nextTick(() => handleSubmit(text))
}

// ── 重新回答（用户消息底部的"刷新"按钮）─────────────────────────────────────
// 把这条用户消息重新发一遍（流式输出中禁止操作）
function reAnswer(userIdx: number) {
  if (streaming.value) return
  const text = messages.value[userIdx]?.content
  if (!text) return
  handleSubmit(text)
}

// ── 重新生成（AI 消息底部的"刷新"按钮）──────────────────────────────────────
// 找到这条 AI 消息对应的上一条用户消息，删除 AI 消息后重新请求
function regenerate(aiIdx: number) {
  if (streaming.value) return
  for (let i = aiIdx - 1; i >= 0; i--) {
    if (messages.value[i].from === 'user') {
      messages.value.splice(aiIdx)           // 删除 AI 消息（及其后面的内容）
      handleSubmit(messages.value[i].content) // 用那条用户消息重新发请求
      return
    }
  }
}

// ── 复制消息 ──────────────────────────────────────────────────────────────────
// 写入剪贴板后把 copiedIdx 设为当前索引，模板里据此显示"✓已复制"图标，1.5s 后复原
function copyMsg(idx: number) {
  navigator.clipboard.writeText(messages.value[idx].content).then(() => {
    copiedIdx.value = idx
    setTimeout(() => { if (copiedIdx.value === idx) copiedIdx.value = null }, 1500)
  })
}

// ── 点赞（toggle：再点一次取消）──────────────────────────────────────────────
function toggleLike(idx: number) {
  if (feedbackMap[idx] === 1) delete feedbackMap[idx]   // 已点赞 → 取消
  else { feedbackMap[idx] = 1; dislike.idx = -1 }        // 点赞，同时关闭点踩弹窗
}

// ── 点踩弹窗：打开 / 关闭 / 标签切换 / 提交 ──────────────────────────────────
function openDislike(idx: number) {
  if (dislike.idx === idx) { closeDislike(); return }   // 再次点击同一条 = 关闭
  dislike.idx = idx; dislike.tags = []; dislike.comment = ''  // 打开并重置内容
}
function closeDislike() { dislike.idx = -1 }  // idx=-1 表示无弹窗（哨兵值）

function toggleTag(tag: string) {
  const i = dislike.tags.indexOf(tag)
  if (i >= 0) dislike.tags.splice(i, 1)  // 已选 → 取消
  else dislike.tags.push(tag)             // 未选 → 选中
}

function submitDislike(idx: number) {
  feedbackMap[idx] = -1   // 标记为"已踩"（按钮变红高亮）
  closeDislike()
  // 实际项目：FeedbackService.submit({ idx, tags: dislike.tags, comment: dislike.comment })
}

// ── 核心函数：发送消息 / 停止流式输出 ────────────────────────────────────────
// val 参数：来自快捷提问时传入文字，来自输入框时不传（从 inputText 读）
function handleSubmit(val?: string) {
  const text = (val ?? inputText.value).trim()

  // ── 停止分支：streaming=true 时再次触发 = 中止请求 ──────────────────────────
  if (streaming.value) {
    abortFn?.()         // 关闭底层 HTTP 连接 + 清理打字机
    abortFn = null
    streaming.value = false
    const last = messages.value.at(-1)
    if (last?.from === 'ai') { last.loading = false; last.status = 'STOPPED' }
    return
  }

  if (!text) return
  if (!val) inputText.value = ''  // 来自输入框的发送 → 清空输入框

  // ── 发送分支 ──────────────────────────────────────────────────────────────
  // 1. 把用户消息推入列表
  messages.value.push({ from: 'user', content: text })
  // 2. 推入 AI 占位消息（loading=true → 显示三点动画）
  messages.value.push({ from: 'ai', content: '', loading: true })
  scrollToBottom()
  streaming.value = true
  abortFn?.()  // 取消上一次未完成的请求

  // 3. 构造发给 LLM 的历史消息（OpenAI messages 格式）
  //    过滤掉：还在 loading 中的、内容为空的、状态为 ERROR 的消息
  const llmMessages = messages.value
    .filter(m => !m.loading && m.content && m.status !== 'ERROR')
    .map(m => ({ role: m.from === 'user' ? 'user' : 'assistant', content: m.content }))

  // 4. 发起 SSE 流式请求（不传 url → chat.service 默认 LM Studio）
  const { abort } = createChatStream({
    maxRetries: 1,
    onReconnecting(attempt) {
      const last = messages.value.at(-1)
      if (!last || last.from !== 'ai') return
      last.status = 'RECONNECTING'
      last.loading = true
      last.content = ''
      console.log(`[重连] 第 ${attempt} 次`)
    },
    body: {
      model: 'deepseek/deepseek-r1-0528-qwen3-8b',
      messages: llmMessages,
      stream: true,
      temperature: 0.7,
      max_tokens: 8192,
    },
    // OpenAI SSE 格式：data: {"choices":[{"delta":{"content":"..."}}]}
    pickText: (data: string) => {
      if (data === '[DONE]') return ''
      try {
        const obj = JSON.parse(data)
        return obj.choices?.[0]?.delta?.content ?? ''
      } catch { return '' }
    },
    onText(value) {
      const last = messages.value.at(-1)
      if (!last || last.from !== 'ai') return
      last.loading = false
      last.status = undefined
      last.content = value
      scrollToBottom()
    },
    onError(err: any) {
      streaming.value = false
      const last = messages.value.at(-1)
      if (last?.from === 'ai') {
        last.loading = false
        last.content = `⚠️ ${err?.message ?? '请求失败'}`
        last.status = 'ERROR'
      }
    },
    onDone() {
      streaming.value = false
      const last = messages.value.at(-1)
      if (last?.from === 'ai') { last.loading = false; last.status = 'DONE' }
      scrollToBottom()
    },
  })

  abortFn = abort
}
</script>

<style scoped>
.mc-page {
  display: flex;
  flex-direction: column;
  /* 不写 height:100%，靠父层 .page-wrap > * { flex:1 } 撑满，避免冲突 */
  overflow: hidden;
  background: var(--devui-global-bg, #f6f6f8);
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif;
}

/* ── 头部 ── */
.mc-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 20px;
  height: 50px;
  background: var(--devui-base-bg, #fff);
  border-bottom: 1px solid var(--devui-dividing-line, #f2f2f3);
  flex-shrink: 0;
}

.mc-header-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: linear-gradient(135deg, #7c3aed, #4f46e5);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mc-header-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--devui-text, #252b3a);
  flex: 1;
}

.mc-header-badge {
  font-size: 11px;
  color: #7c3aed;
  background: rgba(124, 58, 237, .08);
  padding: 2px 8px;
  border-radius: 20px;
  font-family: monospace;
}

.mc-new-btn {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 1.5px solid var(--devui-form-control-line, #d9d9d9);
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--devui-text, #252b3a);
  transition: all .15s;
}

.mc-new-btn:hover {
  border-color: #7c3aed;
  color: #7c3aed;
}

/* ── 消息区 ── */
.mc-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 0;
  display: flex;
  flex-direction: column;
}

.mc-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.mc-empty-icon {
  width: 64px;
  height: 64px;
  border-radius: 20px;
  background: var(--devui-base-bg, #fff);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 12px rgba(0, 0, 0, .06);
  color: var(--devui-placeholder, #8a8e99);
}

.mc-empty-title {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: var(--devui-text, #252b3a);
}

.mc-empty-sub {
  margin: 0;
  font-size: 12px;
  color: var(--devui-placeholder, #8a8e99);
}

.mc-prompts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  max-width: 500px;
  margin-top: 4px;
}

.mc-prompt-btn {
  padding: 8px 16px;
  border-radius: 20px;
  border: 1.5px solid var(--devui-form-control-line, #d9d9d9);
  background: var(--devui-base-bg, #fff);
  font-size: 13px;
  color: var(--devui-text, #252b3a);
  cursor: pointer;
  transition: all .15s;
}

.mc-prompt-btn:hover {
  border-color: #7c3aed;
  color: #7c3aed;
}

.mc-message-list {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 0 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mc-msg {
  width: 100%;
}

/* ── 消息底部操作区 ── */
.mc-meta-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 6px;
  flex-wrap: wrap;
}

.mc-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
}

.mc-status--done {
  color: #b8b8b8;
}

.mc-status--stopped {
  color: #f59e0b;
}

.mc-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.mc-act-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: #b0b0b0;
  cursor: pointer;
  transition: all .12s;
}

.mc-act-btn:hover {
  background: #f0f0f0;
  color: #3f3f46;
}

.mc-act-btn--done {
  color: #22c55e !important;
}

.mc-act-btn--like {
  color: #7c3aed !important;
  background: #f3f0ff;
}

.mc-act-btn--dislike {
  color: #ef4444 !important;
  background: #fff1f0;
}

/* 重连提示 */
.mc-reconnecting {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #f59e0b;
  padding: 8px 0;
}

.mc-spin {
  animation: mc-spin 1.2s linear infinite;
}

@keyframes mc-spin {
  to {
    transform: rotate(360deg);
  }
}

/* ── 点踩弹窗 ── */
.mc-dislike-popup {
  margin-top: 10px;
  padding: 14px;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, .08);
  max-width: 360px;
}

.mc-dislike-title {
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 600;
  color: #18181b;
}

.mc-dislike-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.mc-dislike-tag {
  padding: 4px 10px;
  border-radius: 20px;
  border: 1px solid #e4e4e7;
  background: #f4f4f5;
  color: #52525b;
  font-size: 12px;
  cursor: pointer;
  transition: all .12s;
}

.mc-dislike-tag:hover {
  border-color: #a78bfa;
  color: #7c3aed;
}

.mc-dislike-tag--on {
  border-color: #7c3aed;
  background: #f3f0ff;
  color: #7c3aed;
}

.mc-dislike-comment {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #e4e4e7;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 13px;
  font-family: inherit;
  resize: none;
  outline: none;
  color: #18181b;
  background: #fafafa;
  transition: border-color .15s;
}

.mc-dislike-comment:focus {
  border-color: #7c3aed;
  background: #fff;
}

.mc-dislike-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 10px;
}

.mc-dislike-cancel {
  padding: 5px 14px;
  border-radius: 7px;
  border: 1px solid #e4e4e7;
  background: #fff;
  color: #71717a;
  font-size: 13px;
  cursor: pointer;
}

.mc-dislike-cancel:hover {
  background: #f4f4f5;
}

.mc-dislike-submit {
  padding: 5px 14px;
  border-radius: 7px;
  border: none;
  background: #7c3aed;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
}

.mc-dislike-submit:hover {
  background: #6d28d9;
}

/* ── 输入区 ── */
.mc-footer {
  padding: 12px 16px 16px;
  border-top: 1px solid var(--devui-dividing-line, #f2f2f3);
  background: var(--devui-base-bg, #fff);
  flex-shrink: 0;
}

.mc-footer-hint {
  margin: 6px 0 0;
  text-align: center;
  font-size: 11px;
  color: var(--devui-placeholder, #8a8e99);
}

:deep(.mc-input) {
  max-width: 100%;
}
</style>
