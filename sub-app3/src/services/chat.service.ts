import { fetchEventSource } from '@microsoft/fetch-event-source'
import { Observable } from 'rxjs'

export type TypewriterOptions = {
  method?: 'GET' | 'POST' // HTTP 方法（你当前实际固定 POST，可保留以便扩展）
  headers?: Record<string, string> // 请求头（你当前也固定写了，可保留以便扩展）
  body?: {
    [k: string]: unknown // 允许额外字段
  } // 请求体（对象会 JSON.stringify）

  /** 打字机速度：每 tick 吐多少字符（你当前已不用 tick 方式，可删或保留兼容） */
  charsPerTick?: number

  /** tick 间隔（ms）（你当前已用 requestAnimationFrame，可删或保留兼容） */
  tickMs?: number

  /**
   * 从 SSE 的 ev.data 里提取“增量文本”
   * - 如果服务端直接发纯文本：return evData
   * - 如果服务端发 JSON：JSON.parse 后取 delta 字段
   */
  pickText?: (evData: string) => string // 把 ev.data => “本次增量文本”

  /** 是否自动重连；默认 true（取决于 fetch-event-source 的重试机制） */
  retry?: boolean // true：throw err 让库重试；false：直接 error 结束
}

export function createChatStream(options: TypewriterOptions) {
  const CHAT_URL = 'http://localhost:5555/v1/chat/completions' as const
  // 标点停顿（ms）：让打字更像真人/ChatGPT
  const pauseMs = {
    comma: 60, // 逗号/顿号/分号/冒号的短停顿
    sentence: 130, // 句号/问号/感叹号的长停顿
    newline: 170, // 换行的更长停顿
  }
  const baseCharsPerSecond = 38 // 基础速度：每秒吐多少字符（越大越快）
  const maxCharsPerSecond = 130 // 队列积压时的最高速度（防止积压导致很慢）
  const uiFlushIntervalMs = 50 // UI 刷新间隔（ms）：降低频繁更新压力
  const maxCharsPerFrame = 22 // 每帧最多吐多少字符：避免一帧吐太多出现“跳字”
  const jitter = 0.12 // 速度抖动比例：让速度略微随机，更像真人打字

  let ctrl = new AbortController()
  let queue: string[] = [] // 字符队列：存放还没显示的字符
  let streamClosed = false // SSE 是否已结束（onclose 时置为 true）
  let isPumping = false // 是否正在“吐字”
  let display = '' // 当前已经渲染出来的完整文本
  let lastFrameTs = performance.now() // 上一帧时间戳
  let nextUiFlushTs = 0 // 下一次允许刷新 UI 的时间戳（用于限频）
  let charBudget = 0 // “字符预算”：dt * speed 累积后决定本帧吐多少字符
  let wasHidden = document.hidden // 记录上一次可见性：只在 hidden->visible 时补齐
  let timerId: number | null = null
  let rafId: number | null = null

  const text$ = new Observable<string>((subscriber) => {
    const { body, pickText = (s) => s, retry = true } = options // 解构 options

    ctrl = new AbortController() // 取消控制器（✅ 现在会传给 fetchEventSource 的 signal）
    queue = [] // 字符队列：存放还没显示的字符
    streamClosed = false // SSE 是否已结束（onclose 时置为 true）
    isPumping = false // 是否正在“吐字”
    display = '' // 当前已经渲染出来的完整文本
    lastFrameTs = performance.now() // 上一帧时间戳
    nextUiFlushTs = 0 // 下一次允许刷新 UI 的时间戳（用于限频）
    charBudget = 0 // “字符预算”：dt * speed 累积后决定本帧吐多少字符
    wasHidden = document.hidden // 记录上一次可见性：只在 hidden->visible 时补齐

    const onVisibilityChange = () => {
      const nowHidden = document.hidden
      if (nowHidden) {
        isPumping = false
        wasHidden = true
        return
      }

      if (wasHidden && !nowHidden) {
        fastForward()
      }
      wasHidden = nowHidden // 更新状态
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    fetchEventSource(CHAT_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'text/event-stream',
      },
      body: body == null ? null : typeof body === 'string' ? body : JSON.stringify(body),
      signal: ctrl.signal,
      onmessage: (ev) => {
        try {
          const data = ev?.data
          if (!data || data === '[DONE]') return
          // - 服务端发纯文本：pickText 返回文本
          // - 服务端发 JSON：pickText 内 JSON.parse 后取 delta 字段
          const delta = pickText(data)
          enqueue(delta) // 入队并触发吐字（前台）/积压（后台）
        } catch (e) {
          subscriber.error(e) // 解析/处理失败直接 error
        }
      },

      onclose: () => {
        streamClosed = true // SSE 连接关闭：标记流已结束
        maybeFinish() // 不直接 complete，等队列吐空后再 complete
      },

      onerror: (err) => {
        if (retry) throw err // retry=true：抛出让库自动重连
        subscriber.error(err) // 否则：直接 error 结束
      },
    })
    return () => {
      // ✅ teardown：取消请求 + 清理定时器/帧 + 事件监听
      ctrl.abort()
      if (timerId != null) {
        clearTimeout(timerId)
        timerId = null
      }
      if (rafId != null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }

    // 打字机效果：启动一个 requestAnimationFrame 循环，持续从队列吐字
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function pump(): any {
      isPumping = true // 标记进入吐字状态
      const frame = (ts: number) => {
        /**
         * ✅ 如果页签不可见：停止吐字（isPumping=false），不再 next
         * 后台期间只会 enqueue（积压队列），等“从 hidden 切回 visible”再 fastForward 一次性补齐
         */
        if (document.hidden) {
          isPumping = false // 停止吐字
          return
        }
        if (!queue?.length) {
          isPumping = false
          maybeFinish()
          return
        }

        const dtMs = Math.min(50, ts - lastFrameTs) // 本帧时间差
        lastFrameTs = ts

        const baseSpeed = getAdaptiveSpeed(queue.length) // 根据队列长度决定基础速度
        // 以 1 为中心、幅度可控、正负对称 的随机倍率，用来让节奏/速度/延迟产生自然抖动，同时保持整体均值接近基准值
        const jitterFactor = 1 + (Math.random() * 2 - 1) * jitter
        const speed = baseSpeed * jitterFactor // 是每秒字符数

        // 时间预算累积：dt(s) * speed(chars/s) => 本帧可吐的字符预算
        charBudget += (dtMs / 1000) * speed // 累积预算

        let charsToEmit = Math.min(Math.floor(charBudget), maxCharsPerFrame) // 本帧要吐的字符数
        charBudget -= charsToEmit // 扣除已使用预算

        let pause = 0 // 本帧最大停顿（遇到标点会变大）

        // 从队列取出 charsToEmit 个字符拼起来
        while (charsToEmit-- > 0 && queue.length) {
          const ch = queue.shift()! // 取一个字符
          const p = getPause(ch)
          display += ch // 把本帧片段追加到总显示文本

          if (p > 0) {
            pause = p
            subscriber.next(display) // 先把标点显示出去
            nextUiFlushTs = ts + uiFlushIntervalMs
            timerId = window.setTimeout(() => {
              rafId = requestAnimationFrame(frame)
            }, pause)
            return
          }
        }

        // UI 限频刷新：避免频繁更新导致卡顿
        if (ts >= nextUiFlushTs) {
          if (!document.hidden) {
            subscriber.next(display) // 推送“累计文本”给订阅者
          }
          nextUiFlushTs = ts + uiFlushIntervalMs // 约束下一次刷新时间
        }

        if (pause > 0) {
          timerId = window.setTimeout(() => {
            rafId = requestAnimationFrame(frame)
          }, pause) // 先停顿，再进入下一帧
        } else {
          rafId = requestAnimationFrame(frame) // 请在下一帧绘制前调用 frame(ts)
        }
      }

      rafId = requestAnimationFrame(frame)
    }

    function enqueue(content: string): void {
      if (!content) {
        maybeFinish() // chunk 为空时：可能只是无内容事件；尝试收尾（不强制结束）
        return
      }
      for (const ch of content) {
        queue.push(ch) // 每个字符入队
      }
      if (!document.hidden && !isPumping) {
        pump()
      }
    }

    function getPause(ch: string) {
      if (ch === '\n') return pauseMs.newline // 换行：更长停顿
      if ('。.!！？?'.includes(ch)) return pauseMs.sentence // 句末标点：长停顿
      if ('，,；;：:'.includes(ch)) return pauseMs.comma // 逗号类：短停顿
      return 0 // 普通字符：不停顿
    }

    // 队列越长 => 速度越快：避免队列积压导致“永远吐不完”
    function getAdaptiveSpeed(queueLen: number) {
      if (queueLen > 600) return maxCharsPerSecond // 极长积压：直接上限速度
      if (queueLen > 300) return Math.min(maxCharsPerSecond, 95) // 中等积压：加速
      if (queueLen > 120) return Math.min(maxCharsPerSecond, 65) // 轻度积压：略加速
      return baseCharsPerSecond // 队列短：基础速度（更自然）
    }

    function maybeFinish(): void {
      if (streamClosed && !queue?.length) {
        subscriber.complete()
      }
    }

    function fastForward() {
      if (!queue?.length) {
        return
      }
      charBudget = 0
      lastFrameTs = performance.now()
      display += queue.join('')
      queue = []
      subscriber.next(display)
      maybeFinish()
      if (!streamClosed && !isPumping) {
        pump()
      }
    }
  })

  return {
    text$, // 订阅 text$ 获取累计输出文本
    abort: () => ctrl.abort(), // 手动停止
  }
}
