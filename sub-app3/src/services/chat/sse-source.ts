// SSE 源：只负责建立连接、解析每帧 data、把"增量文本"通过 onChunk 喂出去
// 不关心打字机节奏，也不关心累计文本

import { fetchEventSource } from '@microsoft/fetch-event-source'

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
  onClose: () => void
  onError: (err: unknown) => void
  /** 准备进行第 attempt 次重连时回调（attempt 从 1 开始） */
  onRetry?: (attempt: number) => void
}

export interface SseSource {
  abort(): void
}

export function createSseSource(opts: SseSourceOptions, handlers: SseSourceHandlers): SseSource {
  const { url, headers, body, pickText = (s) => s, maxRetries = 0 } = opts
  const ctrl = new AbortController()
  let retryCount = 0

  const bodyStr =
    body == null ? undefined : typeof body === 'string' ? body : JSON.stringify(body)

  fetchEventSource(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'text/event-stream',
      ...(headers ?? {}),
    },
    body: bodyStr,
    signal: ctrl.signal,
    onmessage(ev) {
      try {
        const data = ev?.data
        if (!data || data === '[DONE]') return
        const text = pickText(data)
        if (text) handlers.onChunk(text)
      } catch (e) {
        handlers.onError(e)
      }
    },
    onclose() {
      handlers.onClose()
    },
    onerror(err) {
      if (retryCount < maxRetries) {
        retryCount++
        handlers.onRetry?.(retryCount)
        throw err // 抛出让 fetch-event-source 自动重连
      }
      handlers.onError(err)
      // 不抛出 → 库停止重连
    },
  }).catch(() => {
    // fetchEventSource 在 abort 时会 reject；已经通过 onerror 或 abort 路径处理过，吞掉即可
  })

  return {
    abort: () => ctrl.abort(),
  }
}
