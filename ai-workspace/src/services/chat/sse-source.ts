// SSE 源：只负责建立连接、解析每帧 data、把"增量文本"通过 onChunk 喂出去
// 不关心打字机节奏，也不关心累计文本

import { fetchEventSource } from '@microsoft/fetch-event-source'

const EVENT_STREAM_CONTENT_TYPE = 'text/event-stream'
const RETRYABLE_HTTP_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504])

class RetryableSseError extends Error {
  override name = 'RetryableSseError'
}

class FatalSseError extends Error {
  override name = 'FatalSseError'
}

export interface SseSourceOptions {
  url: string
  headers?: Record<string, string>
  body?: { [k: string]: unknown } | string | null
  /** 从一帧 data 提取增量文本；默认原样返回 */
  pickText?: (evData: string) => string
  /** 最大重连次数；0 表示不重连 */
  maxRetries?: number
}

export interface SseSourceHandlers {
  onChunk: (text: string) => void
  /** 收到 OpenAI 兼容协议的 [DONE] 结束帧 */
  onComplete: () => void
  onError: (err: unknown) => void
  /** 准备进行第 attempt 次重连时回调（attempt 从 1 开始） */
  onRetry?: (attempt: number) => void
  /**
   * 每收到一帧原始 data（不含 [DONE]）时回调，附带自请求发出起的耗时（ms）。
   * 供可观测性面板统计 TTFT / usage / finish_reason / 原始响应，pickText 之外的旁路。
   */
  onFrame?: (data: string, elapsedMs: number) => void
}

export interface SseSource {
  abort(): void
}

export function createSseSource(opts: SseSourceOptions, handlers: SseSourceHandlers): SseSource {
  const { url, headers, body, pickText = (s) => s, maxRetries = 0 } = opts
  const ctrl = new AbortController()
  let retryCount = 0
  let settled = false
  let receivedDone = false
  const startedAt = performance.now()

  const bodyStr =
    body == null ? undefined : typeof body === 'string' ? body : JSON.stringify(body)

  const fail = (err: unknown) => {
    if (settled) return
    settled = true
    handlers.onError(err)
  }

  fetchEventSource(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'text/event-stream',
      ...(headers ?? {}),
    },
    body: bodyStr,
    signal: ctrl.signal,
    // 页面隐藏时保持同一条请求；打字机自行处理隐藏/恢复，避免库自动重发完整 POST。
    openWhenHidden: true,
    async onopen(response) {
      if (!response.ok) {
        const message = `SSE request failed: HTTP ${response.status} ${response.statusText}`.trim()
        if (RETRYABLE_HTTP_STATUSES.has(response.status)) throw new RetryableSseError(message)
        throw new FatalSseError(message)
      }

      const contentType = response.headers.get('content-type')?.toLowerCase()
      if (!contentType?.startsWith(EVENT_STREAM_CONTENT_TYPE)) {
        throw new FatalSseError(
          `SSE protocol error: expected ${EVENT_STREAM_CONTENT_TYPE}, received ${contentType ?? 'missing content-type'}`,
        )
      }
    },
    onmessage(ev) {
      if (settled) return
      try {
        const data = ev?.data
        if (!data) return
        if (data === '[DONE]') {
          receivedDone = true
          settled = true
          handlers.onComplete()
          ctrl.abort()
          return
        }
        handlers.onFrame?.(data, performance.now() - startedAt)
        const text = pickText(data)
        if (text) handlers.onChunk(text)
      } catch (e) {
        fail(e)
        ctrl.abort()
      }
    },
    onclose() {
      if (!receivedDone) {
        fail(new Error('SSE stream closed before receiving [DONE]'))
      }
    },
    onerror(err) {
      if (settled || ctrl.signal.aborted) throw err
      const retryable = err instanceof RetryableSseError || err instanceof TypeError
      if (retryable && retryCount < maxRetries) {
        retryCount++
        receivedDone = false
        handlers.onRetry?.(retryCount)
        // fetch-event-source 只有在 onerror 正常返回时才会按间隔重新发起请求。
        return undefined
      }
      fail(err)
      // 不可重试错误或次数耗尽：抛出以停止 fetch-event-source 的默认无限重试。
      throw err
    },
  }).catch(() => {
    // 错误已通过 onError 传出；主动 abort 也会结束 Promise，这里只负责收口。
  })

  return {
    abort: () => ctrl.abort(),
  }
}
