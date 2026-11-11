import { openAIStreamAdapter, type ChatUsage, type StreamProtocolEvent } from './openai-stream-adapter'
import { createSseSource, type SseSource } from './sse-source'
import { createTypewriter } from './typewriter'
import { createStateMachine, type ChatState } from './state-machine'

export interface ChatMetrics {
  ttftMs?: number
  totalMs?: number
  tokensPerSec?: number
  estimated?: boolean
  usage?: ChatUsage
  finishReason?: string
  rawRequest?: string
  rawResponse?: string
}

export interface ChatStreamOptions {
  url?: string
  headers?: Record<string, string>
  body?: { [k: string]: unknown }
  /** 关闭外层打字队列，交由展示组件控制动画；默认开启 */
  typewriter?: boolean
  maxRetries?: number
  onReconnecting?: (attempt: number) => void
  onFrame?: (data: string, elapsedMs: number) => void
  onProtocolEvent?: (event: StreamProtocolEvent, elapsedMs: number, rawData: string) => void
  onText: (full: string) => void
  onDone?: () => void
  onError?: (err: unknown) => void
  onStateChange?: (state: ChatState) => void
}

export interface ChatStream {
  abort(): void
}

// 使用网关绝对地址，避免 qiankun 嵌入后相对路径错误地请求主应用 4200 端口。
const DEFAULT_URL = 'http://localhost:3200/v1/chat/completions'

export function createChatStream(options: ChatStreamOptions): ChatStream {
  const sm = createStateMachine()
  const adapter = openAIStreamAdapter
  let firstChunk = true
  let protocolCompleted = false
  let source: SseSource | null = null

  const unsubscribeState = options.onStateChange
    ? sm.subscribe(options.onStateChange)
    : null

  const textHandlers = {
    onText: (full: string) => {
      if (firstChunk) {
        firstChunk = false
        sm.send({ type: 'firstChunk' })
      }
      options.onText(full)
    },
    onDrained: () => {
      sm.send({ type: 'queueDrained' })
      if (sm.state.kind !== 'done') return
      cleanup()
      options.onDone?.()
    },
  }
  let fullText = ''
  const typewriter = options.typewriter === false
    ? {
        enqueue(text: string) {
          fullText += text
          textHandlers.onText(fullText)
        },
        markStreamClosed() { textHandlers.onDrained() },
        reset() { fullText = '' },
        dispose() {},
      }
    : createTypewriter(textHandlers)

  const cleanup = () => {
    source?.abort()
    typewriter.dispose()
    unsubscribeState?.()
    sm.dispose()
  }

  const fail = (error: unknown) => {
    if (sm.state.kind === 'aborted' || sm.state.kind === 'done' || sm.state.kind === 'error') return
    sm.send({ type: 'error', error })
    cleanup()
    options.onError?.(error)
  }

  sm.send({ type: 'connect' })

  source = createSseSource(
    {
      url: options.url ?? DEFAULT_URL,
      headers: options.headers,
      body: options.body,
      maxRetries: options.maxRetries ?? 0,
    },
    {
      onMessage(data, elapsedMs) {
        if (protocolCompleted || sm.state.kind === 'error' || sm.state.kind === 'aborted') return
        options.onFrame?.(data, elapsedMs)
        let event: StreamProtocolEvent
        try {
          event = adapter.parse(data)
        } catch (error) {
          fail(error)
          return
        }
        options.onProtocolEvent?.(event, elapsedMs, data)

        switch (event.type) {
          case 'text':
            typewriter.enqueue(event.text)
            break
          case 'complete':
            protocolCompleted = true
            sm.send({ type: 'streamClosed' })
            typewriter.markStreamClosed()
            source?.abort()
            break
          case 'error':
            fail(event.error)
            break
          case 'ignore':
            break
        }
      },
      onClose() {
        if (protocolCompleted) return
        fail(new Error('SSE stream closed before protocol completion'))
      },
      onError: fail,
      onRetry(attempt) {
        protocolCompleted = false
        sm.send({ type: 'retry', attempt })
        typewriter.reset({ keepDisplay: false })
        firstChunk = true
        options.onReconnecting?.(attempt)
      },
    },
  )

  return {
    abort() {
      if (sm.state.kind === 'done' || sm.state.kind === 'error' || sm.state.kind === 'aborted') return
      sm.send({ type: 'abort' })
      cleanup()
    },
  }
}
