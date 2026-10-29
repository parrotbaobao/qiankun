// SSE 源：只负责 HTTP 请求、SSE data 事件、响应校验、重试和取消。
// 不解释 data 内的模型协议，也不关心文本、完成标记或打字机。

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
  /** 最大重连次数；0 表示不重连 */
  maxRetries?: number
}

export interface SseSourceHandlers {
  onMessage: (data: string, elapsedMs: number) => void
  /** HTTP/SSE 连接自然关闭；是否为业务完成由上层协议适配器判断 */
  onClose: () => void
  onError: (err: unknown) => void
  /** 准备进行第 attempt 次重连时回调（attempt 从 1 开始） */
  onRetry?: (attempt: number) => void
}

export interface SseSource {
  abort(): void
}

export function createSseSource(opts: SseSourceOptions, handlers: SseSourceHandlers): SseSource {
  const { url, headers, body, maxRetries = 0 } = opts
  const ctrl = new AbortController()
  let retryCount = 0
  let settled = false
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
        handlers.onMessage(ev?.data ?? '', performance.now() - startedAt)
      } catch (e) {
        fail(e)
        ctrl.abort()
      }
    },
    onclose() {
      if (settled) return
      settled = true
      handlers.onClose()
    },
    onerror(err) {
      if (settled || ctrl.signal.aborted) throw err
      const retryable = err instanceof RetryableSseError || err instanceof TypeError
      if (retryable && retryCount < maxRetries) {
        retryCount++
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
