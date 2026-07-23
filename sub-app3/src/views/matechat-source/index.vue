<template>
  <div class="source-page">
    <!-- ── 顶部导航 ── -->
    <header class="source-header">
      <div class="source-header-icon">
        <IconBolt :size="16" />
      </div>
      <span class="source-header-title">AI 助手 · 源码版</span>
      <span class="source-header-badge">源码移植</span>
      <button class="source-new-btn" @click="newConversation" title="新对话">
        <IconPlus :size="14" />
      </button>
    </header>

    <!-- ── 消息区 ── -->
    <div class="source-body" ref="bodyRef" @wheel="handleWheel" @mousedown="handleMousedown" @mouseup="handleMouseup"
      @scroll="handleScroll">

      <!-- 空态 + 快捷提问 -->
      <div v-if="!messages.length" class="source-empty">
        <div class="source-empty-icon">
          <IconChat :size="40" stroke-width="1.2" />
        </div>
        <p class="source-empty-title">有什么可以帮到你？</p>
        <p class="source-empty-sub">通过源码移植的 Bubble + MarkdownCard + ChatInput 构建</p>
        <div class="source-prompts">
          <button v-for="p in quickPrompts" :key="p" class="source-prompt-btn" @click="sendQuick(p)">
            {{ p }}
          </button>
        </div>
      </div>

      <!-- 消息列表 -->
      <div class="source-message-list">
        <template v-for="(msg, i) in messages" :key="i">

          <!-- 用户消息 -->
          <Bubble v-if="msg.from === 'user'" :content="msg.content" align="right" :avatarConfig="userAvatar"
            variant="filled" class="source-msg">
            <template #bottom>
              <div class="source-actions">
                <button class="source-act-btn" title="重新回答" @click="reAnswer(i)">
                  <IconRefresh :size="12" />
                </button>
              </div>
            </template>
          </Bubble>

          <!-- AI 消息 -->
          <Bubble v-else align="left" :loading="msg.loading && msg.status !== 'RECONNECTING'" :avatarConfig="aiAvatar"
            variant="filled" class="source-msg">

            <!-- 重连中提示 -->
            <span v-if="msg.status === 'RECONNECTING'" class="source-reconnecting">
              <IconRefresh class="source-spin" :size="13" stroke-width="2.2" />
              重连中…
            </span>

            <!-- 思考折叠 -->
            <div v-if="msg.reasoningContent && !msg.loading" class="source-think-toggle" @click="toggleThink(msg)">
              <IconDot :size="12" />
              <span>{{ msg.content ? `思考完成 · ${getThinkTime(msg)}s` : '思考中…' }}</span>
              <IconChevronUp :size="12"
                :style="{ transform: msg.thinkShrink ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }" />
            </div>

            <!-- MarkdownCard 渲染正文 -->
            <MarkdownCard v-if="!msg.loading && msg.status !== 'RECONNECTING'" :content="renderContent(msg)"
              theme="light" :enable-think="true" />

            <!-- bottom：状态标记 + 操作按钮 + 点踩弹窗 -->
            <template #bottom v-if="!msg.loading && msg.status !== 'RECONNECTING'">
              <div class="source-meta-row">
                <!-- 已完成 / 已停止 -->
                <span v-if="msg.status === 'DONE'" class="source-status source-status--done">
                  <IconCheck :size="11" />已完成
                </span>
                <span v-else-if="msg.status === 'STOPPED'" class="source-status source-status--stopped">
                  <IconStopRect :size="10" />已停止
                </span>

                <!-- 操作按钮 -->
                <div v-if="msg.status === 'DONE' || msg.status === 'STOPPED'" class="source-actions">
                  <!-- 复制 -->
                  <button class="source-act-btn" :class="{ 'source-act-btn--done': copiedIdx === i }"
                    :title="copiedIdx === i ? '已复制' : '复制'" @click="copyMsg(i)">
                    <IconCheck v-if="copiedIdx === i" :size="12" />
                    <IconCopy v-else :size="12" />
                  </button>
                  <!-- 点赞 -->
                  <button class="source-act-btn" :class="{ 'source-act-btn--like': feedbackMap[i] === 1 }" title="点赞"
                    @click="toggleLike(i)">
                    <IconThumbUp :size="12" />
                  </button>
                  <!-- 点踩 -->
                  <button class="source-act-btn" :class="{ 'source-act-btn--dislike': feedbackMap[i] === -1 }"
                    title="点踩" @click="openDislike(i)">
                    <IconThumbDown :size="12" />
                  </button>
                  <!-- 重新生成 -->
                  <button v-if="msg.status === 'DONE'" class="source-act-btn" title="重新生成" @click="regenerate(i)">
                    <IconRefresh :size="12" />
                  </button>
                </div>
              </div>

              <!-- 点踩弹窗 -->
              <div v-if="dislike.idx === i" class="source-dislike-popup">
                <p class="source-dislike-title">请告诉我们哪里不对</p>
                <div class="source-dislike-tags">
                  <button v-for="tag in DISLIKE_TAGS" :key="tag" class="source-dislike-tag"
                    :class="{ 'source-dislike-tag--on': dislike.tags.includes(tag) }" @click="toggleTag(tag)">{{ tag
                    }}</button>
                </div>
                <textarea class="source-dislike-comment" v-model="dislike.comment" placeholder="补充说明（选填）" rows="2" />
                <div class="source-dislike-footer">
                  <button class="source-dislike-cancel" @click="closeDislike">取消</button>
                  <button class="source-dislike-submit" @click="submitDislike(i)">提交</button>
                </div>
              </div>
            </template>
          </Bubble>

        </template>
      </div>
    </div>

    <!-- ── 输入区 ── -->
    <div class="source-footer">
      <ChatInput :value="inputText" display-type="full" variant="bordered" :loading="streaming" :max-length="2000"
        :show-count="true" @change="inputText = $event" @submit="handleSubmit">
        <template #extra>
          <div class="source-toolbar">
            <button class="source-tool-btn" title="联网搜索（示例）">
              <IconSearch :size="14" />
              <span>联网</span>
            </button>
            <span class="source-tool-divider" />
            <button class="source-tool-btn" title="上传文件（示例）">
              <IconUpload :size="14" />
              <span>附件</span>
            </button>
          </div>
        </template>
      </ChatInput>
      <p class="source-footer-hint">Enter 发送 · Shift+Enter 换行 · 流式输出中 Enter 可停止</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, reactive, ref, nextTick } from 'vue'
import { createChatStream } from '@/services/chat.service'
import Bubble from './Bubble.vue'
import IconBolt from '@/components/icons/IconBolt.vue'
import IconPlus from '@/components/icons/IconPlus.vue'
import IconChat from '@/components/icons/IconChat.vue'
import IconRefresh from '@/components/icons/IconRefresh.vue'
import IconCheck from '@/components/icons/IconCheck.vue'
import IconStopRect from '@/components/icons/IconStopRect.vue'
import IconCopy from '@/components/icons/IconCopy.vue'
import IconThumbUp from '@/components/icons/IconThumbUp.vue'
import IconThumbDown from '@/components/icons/IconThumbDown.vue'
import IconDot from '@/components/icons/IconDot.vue'
import IconChevronUp from '@/components/icons/IconChevronUp.vue'
import IconSearch from '@/components/icons/IconSearch.vue'
import IconUpload from '@/components/icons/IconUpload.vue'
import MarkdownCard from './MarkdownCard/mdCard.vue'   // 原版：VNode+AST 增量渲染
import ChatInput from './ChatInput.vue'

// ── 类型 ──────────────────────────────────────────────────────────────────────
interface ChatMsg {
  from: 'user' | 'ai'
  content: string
  reasoningContent?: string
  loading?: boolean
  status?: 'DONE' | 'STOPPED' | 'RECONNECTING' | 'ERROR'
  thinkShrink?: boolean
  startTime?: number
  endTime?: number
}

// ── 常量 ──────────────────────────────────────────────────────────────────────
const DISLIKE_TAGS = ['不准确', '答非所问', '内容有害', '回答太长', '回答太短', '其他']
const quickPrompts = ['用一句话解释量子纠缠', '写一首关于秋天的短诗', '什么是微前端架构？']
const userAvatar = { displayName: '我', isRound: true, width: 32, height: 32 }
const aiAvatar = { displayName: 'AI', isRound: true, width: 32, height: 32 }

// ── 状态 ──────────────────────────────────────────────────────────────────────
const bodyRef = ref<HTMLElement | null>(null)
const inputText = ref('')
const streaming = ref(false)
const messages = ref<ChatMsg[]>([])
const copiedIdx = ref<number | null>(null)
const feedbackMap = reactive<Record<number, 1 | -1>>({})
const dislike = reactive({ idx: -1, tags: [] as string[], comment: '' })

// 滚动控制 flag（对应 chat-process.vue 的三个 flag）
const wheelHadUp = ref(false)
const clickOnScrollbar = ref(false)
const mouseDown = ref(false)
const scrollbarWidth = 8
const headspace = 20

let abortFn: (() => void) | null = null

/**
 * 组件卸载前清理：终止 SSE 请求 + 清理打字机定时器/事件监听
 */
onBeforeUnmount(() => { abortFn?.() })

/**
 * 鼠标滚轮事件处理，用于判断是否需要跟随 AI 输出自动滚底。
 *
 * 对应 matechat chat-process.vue 中的 handleWheel 函数。
 *
 * 核心逻辑：
 *  - 向上滚（deltaY < 0）：用户正在往上看历史，设 wheelHadUp=true，停止自动滚底。
 *  - 向下滚到底部附近（距底 < headspace=20px）：认为用户回到了底部，
 *    重置 wheelHadUp 和 clickOnScrollbar，恢复自动跟随。
 *  - Shift/Ctrl + 滚轮通常是横向滚动或缩放，不触发停止逻辑。
 */
function handleWheel(e: WheelEvent) {
  if (e.deltaY < 0 && !e.shiftKey && !e.ctrlKey) {
    wheelHadUp.value = true   // 向上滚 → 停止自动跟随
  } else {
    const el = bodyRef.value; if (!el) return
    // 向下滚且已到底部 → 恢复自动跟随
    if (el.scrollTop + el.clientHeight + e.deltaY >= el.scrollHeight - headspace) {
      wheelHadUp.value = false;
      clickOnScrollbar.value = false
    }
  }
}

/**
 * 鼠标按下事件处理，判断是否点击在滚动条上。
 *
 * 对应 matechat chat-process.vue 中的 mousedownHandler。
 *
 * 为什么要判断滚动条：
 *  用户拖动滚动条时，容器会滚动，但这不代表用户想停在中间；
 *  只有当拖动到距底 > headspace 时，才认为用户在看历史，停止自动跟随。
 *
 * 判断方法：
 *  比较鼠标 clientX 与容器右边界。右侧 scrollbarWidth(8px) 范围内 = 滚动条区域。
 */
function handleMousedown(e: MouseEvent) {
  mouseDown.value = true
  const el = bodyRef.value; if (!el) return
  const rect = el.getBoundingClientRect()
  const isScrollbar = e.clientX >= rect.right - scrollbarWidth && e.clientX <= rect.right
  const distToBottom = el.offsetHeight - e.offsetY
  // 点在滚动条上且不在底部预留范围内 → 停止自动跟随
  if (isScrollbar && !(distToBottom <= headspace && distToBottom >= 0)) {
    clickOnScrollbar.value = true
  }
}

/**
 * 鼠标释放事件处理，重置 mouseDown 标志。
 * 配合 handleMousedown 判断滚动条拖拽的开始/结束。
 */
function handleMouseup() { mouseDown.value = false }

/**
 * 滚动事件处理，当拖动滚动条到底部时恢复自动跟随。
 *
 * 对应 matechat chat-process.vue 中的 scrollHandler。
 *
 * 场景：用户拖动滚动条（clickOnScrollbar=true），但又拖到了底部，
 * 说明用户想继续跟随 AI 输出，此时重置两个停止标志。
 */
function handleScroll() {
  const el = bodyRef.value; if (!el) return
  const dist = el.scrollHeight - el.clientHeight - el.scrollTop
  if (mouseDown.value && dist < headspace) {
    clickOnScrollbar.value = false
    wheelHadUp.value = false
  }
}

/**
 * 平滑滚动到消息列表底部，让最新 AI 输出始终可见。
 *
 * 对应 matechat chat-process.vue 中的 watch(messageChangeCount) 触发的滚动逻辑。
 *
 * 两个条件下不滚：
 *  - wheelHadUp=true：用户在看历史消息，强制滚底会打断阅读体验。
 *  - clickOnScrollbar=true：用户正在拖动滚动条，不干预。
 *
 * 用 nextTick 等待 Vue DOM 更新后再滚，确保新消息已渲染到 DOM 才能获取正确的 scrollHeight。
 */
function scrollToBottom() {
  if (wheelHadUp.value || clickOnScrollbar.value) return
  nextTick(() => bodyRef.value?.scrollTo({ top: bodyRef.value.scrollHeight, behavior: 'smooth' }))
}

/**
 * 开启新对话：清空所有消息、状态和反馈记录。
 *
 * 对应 matechat chat-view.vue 中的 onNewConvo 函数。
 *
 * 步骤：
 *  1. 取消当前正在进行的流式请求（防止旧请求的响应污染新对话）。
 *  2. 重置所有状态：消息列表、输入框、滚动标志、反馈映射、点踩弹窗。
 */
function newConversation() {
  abortFn?.()
  streaming.value = false
  messages.value = []
  inputText.value = ''
  wheelHadUp.value = false
  clickOnScrollbar.value = false
  Object.keys(feedbackMap).forEach(k => delete feedbackMap[+k])
  dislike.idx = -1
}

/**
 * 点击快捷提问按钮，自动填充并发送该问题。
 *
 * 对应 matechat Prompt 组件的 item click 行为。
 *
 * 用 nextTick 等待输入框 value 更新后再调用 handleSubmit，
 * 避免 handleSubmit 读到旧的 inputText。
 */
function sendQuick(text: string) {
  inputText.value = text
  nextTick(() => handleSubmit(text))
}

/**
 * 重新回答：用指定索引的用户消息重新发送一次。
 *
 * 对应 matechat chat-process.vue 中的 onReAnswer 函数。
 * 流式输出中不允许重发，避免两个请求并发。
 */
function reAnswer(userIdx: number) {
  if (streaming.value) return
  const text = messages.value[userIdx]?.content
  if (text) handleSubmit(text)
}

/**
 * 重新生成：删除指定 AI 消息及其后的所有消息，重新请求上一条用户问题。
 *
 * 对应 matechat chat-process.vue 中的 onReAnswer（配合 message-store 的 ask）。
 *
 * 实现思路：
 *  从 aiIdx 往前找最近的 user 消息，然后 splice(aiIdx) 删掉该 AI 消息
 *  及其之后的所有内容（包括任何后续对话），再重新发送那条用户问题。
 */
function regenerate(aiIdx: number) {
  if (streaming.value) return
  for (let i = aiIdx - 1; i >= 0; i--) {
    if (messages.value[i].from === 'user') {
      messages.value.splice(aiIdx)           // 删掉 AI 消息及其后的内容
      handleSubmit(messages.value[i].content) // 重新发送对应的用户问题
      return
    }
  }
}

/**
 * 切换思考块的折叠/展开状态。
 *
 * 对应 matechat chat-process.vue 中的 toggleThink 函数。
 * thinkShrink=true 时 CSS 隐藏 <think> 块，=false 时展开。
 * 直接修改 msg 对象（响应式），Vue 检测到变化自动重渲染。
 */
function toggleThink(msg: ChatMsg) { msg.thinkShrink = !msg.thinkShrink }

/**
 * 计算 AI 思考用时（秒）。
 *
 * 对应 matechat chat-process.vue 中的 getThinkingTime 函数。
 * startTime 在收到第一个流式 token 时记录，endTime 在收到第一个非推理 content 时记录。
 * 两者之差即为 DeepSeek 等模型的推理耗时，显示为"思考完成 · Xs"。
 */
function getThinkTime(msg: ChatMsg) {
  return (msg.startTime && msg.endTime)
    ? Math.round((msg.endTime - msg.startTime) / 1000)
    : 0
}

/**
 * 将消息的推理内容和正文内容合并为 MarkdownCard 可渲染的字符串。
 *
 * 对应 matechat chat-process.vue 中的 renderMessage 函数。
 *
 * 规则：
 *  - 用户消息或无推理内容：直接返回 content。
 *  - thinkShrink=true（折叠）：只返回正文，不展示 <think> 块。
 *  - 展开状态：把 reasoningContent 包进 <think> 标签，放在正文前面。
 *    MarkdownCard 的 CSS 会把 <think> 渲染成灰色斜体引用块。
 */
function renderContent(msg: ChatMsg) {
  if (!msg.reasoningContent || msg.from === 'user') return msg.content
  if (msg.thinkShrink) return msg.content
  return `<think>${msg.reasoningContent}</think>\n\n${msg.content}`
}

/**
 * 复制指定索引的 AI 消息内容到剪贴板，并短暂显示"已复制"反馈。
 *
 * 对应 matechat AiChat.vue 中的 copyMessage 函数。
 * 使用现代 Clipboard API（需 HTTPS 或 localhost）。
 * 1.5s 后自动清除"已复制"状态，恢复复制图标。
 */
function copyMsg(idx: number) {
  navigator.clipboard.writeText(messages.value[idx].content).then(() => {
    copiedIdx.value = idx
    setTimeout(() => { if (copiedIdx.value === idx) copiedIdx.value = null }, 1500)
  })
}

/**
 * 切换点赞状态：已点赞则取消，未点赞则标记为 1。
 *
 * 对应 matechat AiChat.vue 中的 toggleLike 函数。
 * feedbackMap 用消息索引为 key，值为 1（赞）或 -1（踩）。
 * 点赞时同时关闭点踩弹窗（互斥）。
 */
function toggleLike(idx: number) {
  if (feedbackMap[idx] === 1) delete feedbackMap[idx]   // 再次点击 = 取消
  else { feedbackMap[idx] = 1; dislike.idx = -1 }        // 点赞 + 关闭点踩弹窗
}

/**
 * 打开指定消息的点踩反馈弹窗。
 *
 * 对应 matechat AiChat.vue 中的 openDislike 函数。
 * 再次点同一条消息的踩按钮 = 关闭弹窗（toggle 行为）。
 * 重置 tags 和 comment，确保每次打开都是干净状态。
 */
function openDislike(idx: number) {
  if (dislike.idx === idx) { closeDislike(); return }   // 再次点击 = 关闭
  dislike.idx = idx; dislike.tags = []; dislike.comment = ''
}

/**
 * 关闭点踩弹窗，将 idx 重置为 -1（无效值）。
 * -1 作为"无弹窗打开"的哨兵值（sentinel），v-if 判断 dislike.idx === i 不会匹配。
 */
function closeDislike() { dislike.idx = -1 }

/**
 * 切换点踩弹窗中标签的选中状态。
 *
 * 对应 matechat AiChat.vue 中的 toggleTag 函数。
 * 标签数组用 indexOf + splice 实现多选切换。
 */
function toggleTag(tag: string) {
  const i = dislike.tags.indexOf(tag)
  if (i >= 0) dislike.tags.splice(i, 1)   // 已选 → 取消
  else dislike.tags.push(tag)              // 未选 → 选中
}

/**
 * 提交点踩反馈：记录反馈状态并关闭弹窗。
 *
 * 对应 matechat AiChat.vue 中的 submitDislike 函数。
 * 实际项目中这里应调用 FeedbackService.submit() 上报到后端。
 * feedbackMap[idx] = -1 让踩按钮保持高亮，表示已反馈。
 */
function submitDislike(idx: number) {
  feedbackMap[idx] = -1
  closeDislike()
  // 实际项目：FeedbackService.submit({ idx, tags: dislike.tags, comment: dislike.comment })
}

/**
 * 核心函数：发送消息 / 停止流式输出，双重职责由 streaming 状态决定。
 *
 * 对应 matechat message-store.ts 中的 ask() + getAIAnswer() 函数。
 *
 * ── 分支一：停止（streaming=true 时再次触发）──────────────────────────────────
 *  调用 abortFn 终止 SSE + 清理打字机定时器，AI 消息置为 STOPPED。
 *
 * ── 分支二：发送（streaming=false 时）──────────────────────────────────────────
 *  1. 推入用户消息 + AI 占位消息
 *  2. 构造 OpenAI 格式历史消息
 *  3. createChatStream(onText/onDone/onError) 启动流，回调里把累计文本写回 AI 消息
 */
function handleSubmit(val?: string) {
  const text = (val ?? inputText.value).trim()

  // ── 停止分支 ──────────────────────────────────────────────────────────────
  if (streaming.value) {
    abortFn?.()          // 中止 SSE + 清理打字机
    abortFn = null
    streaming.value = false
    const last = messages.value.at(-1)
    if (last?.from === 'ai') { last.loading = false; last.status = 'STOPPED' }
    return
  }

  // ── 发送分支 ──────────────────────────────────────────────────────────────
  if (!text) return
  if (!val) inputText.value = ''   // 来自快捷提问时 val 有值，不清空输入框

  // 推入用户消息和 AI 占位
  messages.value.push({ from: 'user', content: text })
  messages.value.push({ from: 'ai', content: '', loading: true })
  scrollToBottom()
  streaming.value = true
  abortFn?.()   // 取消上一次未完成的请求

  // 构造历史消息（过滤 loading 中和报错的消息，避免污染上下文）
  const llmMessages = messages.value
    .filter(m => !m.loading && m.content && m.status !== 'ERROR')
    .map(m => ({ role: m.from === 'user' ? 'user' : 'assistant', content: m.content }))

  const { abort } = createChatStream({
    maxRetries: 1,
    onReconnecting(attempt) {
      const last = messages.value.at(-1)
      if (!last || last.from !== 'ai') return
      last.status = 'RECONNECTING'; last.loading = true; last.content = ''
      console.log(`[重连] 第 ${attempt} 次`)
    },
    body: {
      model: 'deepseek/deepseek-r1-0528-qwen3-8b',
      messages: llmMessages,
      stream: true,
      temperature: 0.7,
      max_tokens: 8192,
    },
    pickText: (data: string) => {
      if (data === '[DONE]') return ''
      try { return JSON.parse(data).choices?.[0]?.delta?.content ?? '' } catch { return '' }
    },
    onText(value) {
      const last = messages.value.at(-1)
      if (!last || last.from !== 'ai') return
      if (!last.startTime) last.startTime = Date.now()
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
      if (last?.from === 'ai') {
        last.loading = false
        last.status = 'DONE'
        last.endTime = Date.now()
      }
      scrollToBottom()
    },
  })

  abortFn = abort
}
</script>

<style scoped>
.source-page {
  display: flex;
  flex-direction: column;
  /* 不写 height:100%，靠父层 .page-wrap > * { flex:1 } 撑满，避免冲突 */
  overflow: hidden;
  background: var(--devui-global-bg, #f6f6f8);
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif;
}

/* ── 头部 ── */
.source-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 20px;
  height: 50px;
  background: var(--devui-base-bg, #fff);
  border-bottom: 1px solid var(--devui-dividing-line, #f2f2f3);
  flex-shrink: 0;
}

.source-header-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: linear-gradient(135deg, #059669, #10b981);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.source-header-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--devui-text, #252b3a);
  flex: 1;
}

.source-header-badge {
  font-size: 11px;
  color: #059669;
  background: rgba(5, 150, 105, .08);
  padding: 2px 8px;
  border-radius: 20px;
  font-family: monospace;
}

.source-new-btn {
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

.source-new-btn:hover {
  border-color: #059669;
  color: #059669;
}

/* ── 消息区 ── */
.source-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 0;
  display: flex;
  flex-direction: column;
}

.source-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.source-empty-icon {
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

.source-empty-title {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: var(--devui-text, #252b3a);
}

.source-empty-sub {
  margin: 0;
  font-size: 12px;
  color: var(--devui-placeholder, #8a8e99);
}

.source-prompts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  max-width: 500px;
  margin-top: 4px;
}

.source-prompt-btn {
  padding: 8px 16px;
  border-radius: 20px;
  border: 1.5px solid var(--devui-form-control-line, #d9d9d9);
  background: var(--devui-base-bg, #fff);
  font-size: 13px;
  color: var(--devui-text, #252b3a);
  cursor: pointer;
  transition: all .15s;
}

.source-prompt-btn:hover {
  border-color: #059669;
  color: #059669;
}

.source-message-list {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 0 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.source-msg {
  width: 100%;
}

/* 重连提示 */
.source-reconnecting {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #f59e0b;
  padding: 8px 0;
}

.source-spin {
  animation: source-spin 1.2s linear infinite;
}

@keyframes source-spin {
  to {
    transform: rotate(360deg);
  }
}

/* 思考折叠 */
.source-think-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  margin-bottom: 6px;
  border-radius: 8px;
  cursor: pointer;
  color: var(--devui-placeholder, #8a8e99);
  font-size: 13px;
  transition: all .15s;
}

.source-think-toggle:hover {
  background: var(--devui-global-bg, #f6f6f8);
  color: var(--devui-text, #252b3a);
}

/* 消息底部操作区 */
.source-meta-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 6px;
  flex-wrap: wrap;
}

.source-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
}

.source-status--done {
  color: #b8b8b8;
}

.source-status--stopped {
  color: #f59e0b;
}

.source-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.source-act-btn {
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

.source-act-btn:hover {
  background: #f0f0f0;
  color: #3f3f46;
}

.source-act-btn--done {
  color: #22c55e !important;
}

.source-act-btn--like {
  color: #059669 !important;
  background: #d1fae5;
}

.source-act-btn--dislike {
  color: #ef4444 !important;
  background: #fff1f0;
}

/* 点踩弹窗 */
.source-dislike-popup {
  margin-top: 10px;
  padding: 14px;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, .08);
  max-width: 360px;
}

.source-dislike-title {
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 600;
  color: #18181b;
}

.source-dislike-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.source-dislike-tag {
  padding: 4px 10px;
  border-radius: 20px;
  border: 1px solid #e4e4e7;
  background: #f4f4f5;
  color: #52525b;
  font-size: 12px;
  cursor: pointer;
  transition: all .12s;
}

.source-dislike-tag:hover {
  border-color: #6ee7b7;
  color: #059669;
}

.source-dislike-tag--on {
  border-color: #059669;
  background: #d1fae5;
  color: #059669;
}

.source-dislike-comment {
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
}

.source-dislike-comment:focus {
  border-color: #059669;
  background: #fff;
}

.source-dislike-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 10px;
}

.source-dislike-cancel {
  padding: 5px 14px;
  border-radius: 7px;
  border: 1px solid #e4e4e7;
  background: #fff;
  color: #71717a;
  font-size: 13px;
  cursor: pointer;
}

.source-dislike-cancel:hover {
  background: #f4f4f5;
}

.source-dislike-submit {
  padding: 5px 14px;
  border-radius: 7px;
  border: none;
  background: #059669;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
}

.source-dislike-submit:hover {
  background: #047857;
}

/* ── 输入区 ── */
.source-footer {
  padding: 12px 16px 16px;
  border-top: 1px solid var(--devui-dividing-line, #f2f2f3);
  background: var(--devui-base-bg, #fff);
  flex-shrink: 0;
}

.source-footer-hint {
  margin: 6px 0 0;
  text-align: center;
  font-size: 11px;
  color: var(--devui-placeholder, #8a8e99);
}

.source-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
}

.source-tool-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--devui-text, #252b3a);
  font-size: 12px;
  cursor: pointer;
  transition: background .15s;
}

.source-tool-btn:hover {
  background: var(--devui-global-bg, #f6f6f8);
}

.source-tool-divider {
  width: 1px;
  height: 14px;
  background: var(--devui-form-control-line, #d9d9d9);
  margin: 0 4px;
}
</style>
