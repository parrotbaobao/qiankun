// 打字机：只关心“增量字符 → 按节奏吐字 → 累计文本”这一件事
// 不关心 SSE / HTTP / 重连 —— 这些由 sse-source 负责，通过 enqueue/markStreamClosed 喂进来

export interface TypewriterHandlers {
  onText: (full: string) => void   // 每次刷新输出当前累计文本
  onDrained: () => void             // 流已关闭且队列吐完时触发一次（用于驱动状态机 done）
}

export interface Typewriter {
  enqueue(chunk: string): void
  markStreamClosed(): void
  /** 重连场景：清队列；keepDisplay=true 时保留已显示文本，避免闪屏 */
  reset(opts?: { keepDisplay?: boolean }): void
  dispose(): void
}

const PAUSE_MS = { comma: 60, sentence: 130, newline: 170 }
const BASE_CPS = 38
const MAX_CPS = 130
const UI_FLUSH_MS = 50
const MAX_CHARS_PER_FRAME = 22
const JITTER = 0.12

function getPause(ch: string): number {
  if (ch === '\n') return PAUSE_MS.newline
  if ('。.!！？?'.includes(ch)) return PAUSE_MS.sentence
  if ('，,；;：:'.includes(ch)) return PAUSE_MS.comma
  return 0
}

function getAdaptiveSpeed(queueLen: number): number {
  if (queueLen > 600) return MAX_CPS
  if (queueLen > 300) return Math.min(MAX_CPS, 95)
  if (queueLen > 120) return Math.min(MAX_CPS, 65)
  return BASE_CPS
}

export function createTypewriter(handlers: TypewriterHandlers): Typewriter {
  let queue: string[] = []
  let display = ''
  let streamClosed = false
  let isPumping = false
  let drainedNotified = false
  let lastFrameTs = performance.now()
  let nextUiFlushTs = 0
  let charBudget = 0
  let wasHidden = document.hidden
  let timerId: number | null = null
  let rafId: number | null = null
  let disposed = false

  const clearTimers = () => {
    if (timerId != null) { clearTimeout(timerId); timerId = null }
    if (rafId != null) { cancelAnimationFrame(rafId); rafId = null }
  }

  const maybeFinish = () => {
    if (streamClosed && queue.length === 0 && !drainedNotified) {
      drainedNotified = true
      handlers.onDrained()
    }
  }

  const pump = () => {
    isPumping = true
    const frame = (ts: number) => {
      if (disposed) { isPumping = false; return }
      if (document.hidden) { isPumping = false; return }
      if (queue.length === 0) { isPumping = false; maybeFinish(); return }

      const dtMs = Math.min(50, ts - lastFrameTs)
      lastFrameTs = ts

      const speed = getAdaptiveSpeed(queue.length) * (1 + (Math.random() * 2 - 1) * JITTER)
      charBudget += (dtMs / 1000) * speed

      let charsToEmit = Math.min(Math.floor(charBudget), MAX_CHARS_PER_FRAME)
      charBudget -= charsToEmit
      let pause = 0

      while (charsToEmit-- > 0 && queue.length) {
        const ch = queue.shift()!
        display += ch
        const p = getPause(ch)
        if (p > 0) {
          pause = p
          handlers.onText(display)
          nextUiFlushTs = ts + UI_FLUSH_MS
          timerId = window.setTimeout(() => { rafId = requestAnimationFrame(frame) }, pause)
          return
        }
      }

      if (ts >= nextUiFlushTs) {
        handlers.onText(display)
        nextUiFlushTs = ts + UI_FLUSH_MS
      }

      if (pause > 0) {
        timerId = window.setTimeout(() => { rafId = requestAnimationFrame(frame) }, pause)
      } else {
        rafId = requestAnimationFrame(frame)
      }
    }
    rafId = requestAnimationFrame(frame)
  }

  const fastForward = () => {
    if (queue.length === 0) return
    charBudget = 0
    lastFrameTs = performance.now()
    display += queue.join('')
    queue = []
    handlers.onText(display)
    maybeFinish()
    if (!streamClosed && !isPumping) pump()
  }

  const onVisibilityChange = () => {
    const nowHidden = document.hidden
    if (nowHidden) {
      isPumping = false
      wasHidden = true
      return
    }
    if (wasHidden && !nowHidden) fastForward()
    wasHidden = nowHidden
  }
  document.addEventListener('visibilitychange', onVisibilityChange)

  return {
    enqueue(chunk) {
      if (disposed) return
      if (!chunk) { maybeFinish(); return }
      drainedNotified = false
      for (const ch of chunk) queue.push(ch)
      if (!document.hidden && !isPumping) pump()
    },
    markStreamClosed() {
      streamClosed = true
      maybeFinish()
    },
    reset(opts) {
      clearTimers()
      queue = []
      streamClosed = false
      isPumping = false
      drainedNotified = false
      charBudget = 0
      lastFrameTs = performance.now()
      if (!opts?.keepDisplay) display = ''
    },
    dispose() {
      disposed = true
      clearTimers()
      document.removeEventListener('visibilitychange', onVisibilityChange)
      queue = []
    },
  }
}
