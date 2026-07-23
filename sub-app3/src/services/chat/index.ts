// 对外入口：把 state-machine + typewriter + sse-source 粘起来
// 回调风格 API：不依赖 RxJS

import { createSseSource } from './sse-source'
import { createTypewriter } from './typewriter'
import { createStateMachine, type ChatState, type ChatStateOf } from './state-machine'

export type { ChatState, ChatStateOf } from './state-machine'

/** OpenAI 兼容流的 usage 字段（末帧，需 stream_options.include_usage） */
export interface ChatUsage {
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
}

/** 单次生成的可观测性指标，挂在 AI 消息上供面板展示 */
export interface ChatMetrics {
  /** 首字延迟：请求发出 → 第一个内容 token 到达（ms） */
  ttftMs?: number
  /** 总耗时：请求发出 → 流结束（ms） */
  totalMs?: number
  /** 生成速度（tokens/s），基于生成阶段（总耗时 - TTFT） */
  tokensPerSec?: number
  /** 是否为估算值（上游未回传 usage 时按字符估算 token） */
  estimated?: boolean
  usage?: ChatUsage
  /** 结束原因：stop / length / content_filter / … */
  finishReason?: string
  /** 原始请求体（pretty JSON） */
  rawRequest?: string
  /** 原始响应：拼接的 SSE data 帧 */
  rawResponse?: string
}

export interface ChatStreamOptions {
  url?: string
  headers?: Record<string, string>
  body?: { [k: string]: unknown }
  /** 从一帧 data 提取增量文本；默认原样返回 */
  pickText?: (evData: string) => string
  /** 最大重连次数；默认 0（不重连） */
  maxRetries?: number
  /** 重连即将开始时回调 */
  onReconnecting?: (attempt: number) => void
  /** 每收到一帧原始 data 时回调（含耗时），供可观测性统计 */
  onFrame?: (data: string, elapsedMs: number) => void

  // ── 事件回调 ──
  /** 每次刷新输出累计文本（取代旧的 text$.next） */
  onText: (full: string) => void
  /** 流正常结束（取代旧的 text$.complete） */
  onDone?: () => void
  /** 流出错（取代旧的 text$.error） */
  onError?: (err: unknown) => void
  /** 状态机变化（连接中/流式中/重连中/已结束等） */
  onStateChange?: (state: ChatState) => void
}

export interface ChatStream {
  abort(): void
  readonly state: ChatState
  /** 只在进入指定 kind 时回调；s 已窄化到对应 payload */
  on<K extends ChatState['kind']>(kind: K, fn: (s: ChatStateOf<K>) => void): () => void
}

const DEFAULT_URL = '/lm-studio/v1/chat/completions'

export function createChatStream(options: ChatStreamOptions): ChatStream {
  const sm = createStateMachine()
  let firstChunk = true

  if (options.onStateChange) sm.subscribe(options.onStateChange)

  const typewriter = createTypewriter({
    onText: (full) => {
      if (firstChunk) {
        firstChunk = false
        sm.send({ type: 'firstChunk' })
      }
      options.onText(full)
    },
    onDrained: () => {
      sm.send({ type: 'queueDrained' })
      options.onDone?.()
    },
  })

  const sse = createSseSource(
    {
      url: options.url ?? DEFAULT_URL,
      headers: options.headers,
      body: options.body,
      pickText: options.pickText,
      maxRetries: options.maxRetries ?? 0,
    },
    {
      onChunk: (text) => typewriter.enqueue(text),
      onFrame: options.onFrame,
      onClose: () => {
        sm.send({ type: 'streamClosed' })
        typewriter.markStreamClosed()
      },
      onError: (err) => {
        // 用户主动 abort 导致的 onerror，吞掉
        if (sm.state.kind === 'aborted') return
        sm.send({ type: 'error', error: err })
        options.onError?.(err)
      },
      onRetry: (attempt) => {
        sm.send({ type: 'retry', attempt })
        // 重连时清队列，但保留已显示文本，避免清屏闪烁
        typewriter.reset({ keepDisplay: true })
        firstChunk = true
        options.onReconnecting?.(attempt)
      },
    },
  )

  sm.send({ type: 'connect' })

  return {
    abort() {
      sm.send({ type: 'abort' })
      sse.abort()
      typewriter.dispose()
    },
    get state() { return sm.state },
    on: sm.on,
  }
}
