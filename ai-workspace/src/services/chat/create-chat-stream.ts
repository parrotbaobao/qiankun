import { openAIStreamAdapter, type ChatUsage, type StreamAdapter, type StreamProtocolEvent } from './openai-stream-adapter'
import { createSseSource, type SseSource } from './sse-source'
import { createTypewriter } from './typewriter'
import { createStateMachine, type ChatState, type ChatStateOf } from './state-machine'

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
  /** 协议适配器；默认使用当前 OpenAI 兼容流适配器 */
  adapter?: StreamAdapter
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
  readonly state: ChatState
  on<K extends ChatState['kind']>(kind: K, fn: (s: ChatStateOf<K>) => void): () => void
}

const DEFAULT_URL = '/lm-studio/v1/chat/completions'

export function createChatStream(options: ChatStreamOptions): ChatStream {
  const sm = createStateMachine()
  const adapter = options.adapter ?? openAIStreamAdapter
  let firstChunk = true
  let protocolCompleted = false
  let source: SseSource | null = null

  const unsubscribeState = options.onStateChange
    ? sm.subscribe(options.onStateChange)
    : null

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
      if (sm.state.kind !== 'done') return
      options.onDone?.()
      cleanup()
    },
  })

  const cleanup = () => {
    source?.abort()
    typewriter.dispose()
    unsubscribeState?.()
  }

  const fail = (error: unknown) => {
    if (sm.state.kind === 'aborted' || sm.state.kind === 'done' || sm.state.kind === 'error') return
    sm.send({ type: 'error', error })
    typewriter.dispose()
    options.onError?.(error)
    unsubscribeState?.()
    source?.abort()
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
    get state() { return sm.state },
    on: sm.on,
  }
}
