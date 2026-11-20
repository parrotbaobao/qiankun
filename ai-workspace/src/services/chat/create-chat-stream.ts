import type { ShallowRef } from 'vue'
import { openAIStreamAdapter, type ChatUsage, type StreamProtocolEvent } from './openai-stream-adapter'
import { createSseSource, type SseSource } from './sse-source'
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
  maxRetries?: number
  onReconnecting?: (attempt: number) => void
  onFrame?: (data: string, elapsedMs: number) => void
  onProtocolEvent?: (event: StreamProtocolEvent, elapsedMs: number, rawData: string) => void
  onText: (full: string) => void
  onDone?: () => void
  onError?: (err: unknown) => void
  /** 页面持有的响应式状态；状态机直接更新，不通过状态回调中转。 */
  state?: ShallowRef<ChatState>
}

export interface ChatStream {
  abort(): void
}

// 使用网关绝对地址，避免 qiankun 嵌入后相对路径错误地请求主应用 4200 端口。
const DEFAULT_URL = 'http://localhost:3200/v1/chat/completions'

export function createChatStream(options: ChatStreamOptions): ChatStream {
  const stateMachine = createStateMachine(options.state)
  let firstChunk = true
  let protocolCompleted = false
  let source: SseSource | null = null

  // 请求层只累计文本，展示节奏交给组件。
  let fullText = ''

  // 本接口以业务完成标记结束接收；完成、失败、停止后主动关闭连接并释放状态机。
  const closeStream = () => {
    source?.abort()
    stateMachine.dispose()
  }

  const fail = (error: unknown) => {
    if (stateMachine.state.kind === 'aborted' || stateMachine.state.kind === 'done' || stateMachine.state.kind === 'error') return
    stateMachine.send({ type: 'error', error })
    closeStream()
    options.onError?.(error)
  }

  stateMachine.send({ type: 'connect' })

  source = createSseSource(
    {
      url: options.url ?? DEFAULT_URL,
      headers: options.headers,
      body: options.body,
      maxRetries: options.maxRetries ?? 0,
    },
    {
      onMessage(data, elapsedMs) {
        if (protocolCompleted || stateMachine.state.kind === 'error' || stateMachine.state.kind === 'aborted') return
        options.onFrame?.(data, elapsedMs)
        let event: StreamProtocolEvent
        try {
          event = openAIStreamAdapter.parse(data)
        } catch (error) {
          fail(error)
          return
        }
        options.onProtocolEvent?.(event, elapsedMs, data)

        switch (event.type) {
          case 'text':
            fullText += event.text
            if (firstChunk) {
              firstChunk = false
              stateMachine.send({ type: 'firstChunk' })
            }
            options.onText(fullText)
            break
          case 'complete':
            protocolCompleted = true
            stateMachine.send({ type: 'complete' })
            closeStream()
            options.onDone?.()
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
        stateMachine.send({ type: 'retry', attempt })
        fullText = ''
        firstChunk = true
        options.onReconnecting?.(attempt)
      },
    },
  )

  return {
    abort() {
      if (stateMachine.state.kind === 'done' || stateMachine.state.kind === 'error' || stateMachine.state.kind === 'aborted') return
      stateMachine.send({ type: 'abort' })
      closeStream()
    },
  }
}
