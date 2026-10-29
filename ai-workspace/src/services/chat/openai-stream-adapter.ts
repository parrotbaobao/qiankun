export interface ChatUsage {
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
}

export interface StreamEventMetadata {
  usage?: ChatUsage
  finishReason?: string
  hasReasoning?: boolean
}

export type StreamProtocolEvent =
  | { type: 'text'; text: string; metadata?: StreamEventMetadata }
  | { type: 'complete' }
  | {
      type: 'ignore'
      reason: 'usage' | 'role' | 'reasoning' | 'tool-call' | 'finish' | 'empty-text'
      metadata?: StreamEventMetadata
    }
  | { type: 'error'; error: Error }

export interface StreamAdapter {
  parse(data: string): StreamProtocolEvent
}

export class OpenAIStreamProtocolError extends Error {
  override name = 'OpenAIStreamProtocolError'
}

export class OpenAIStreamBusinessError extends Error {
  override name = 'OpenAIStreamBusinessError'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function protocolError(message: string): StreamProtocolEvent {
  return { type: 'error', error: new OpenAIStreamProtocolError(`SSE 协议错误：${message}`) }
}

function readUsage(value: unknown): ChatUsage | undefined {
  if (value == null) return undefined
  if (!isRecord(value)) throw new OpenAIStreamProtocolError('SSE 协议错误：usage 必须是对象')

  const usage: ChatUsage = {}
  for (const key of ['prompt_tokens', 'completion_tokens', 'total_tokens'] as const) {
    const tokenCount = value[key]
    if (tokenCount == null) continue
    if (typeof tokenCount !== 'number') {
      throw new OpenAIStreamProtocolError(`SSE 协议错误：usage.${key} 必须是数字`)
    }
    usage[key] = tokenCount
  }
  return usage
}

export function parseOpenAIStreamEvent(data: string): StreamProtocolEvent {
  if (data === '[DONE]') return { type: 'complete' }

  let payload: unknown
  try {
    payload = JSON.parse(data)
  } catch {
    return protocolError('data 不是有效 JSON')
  }
  if (!isRecord(payload)) return protocolError('data 必须是 JSON 对象')

  if (payload.error != null) {
    const detail = typeof payload.error === 'string'
      ? payload.error
      : isRecord(payload.error) && typeof payload.error.message === 'string'
        ? payload.error.message
        : '上游返回错误'
    return { type: 'error', error: new OpenAIStreamBusinessError(detail) }
  }

  let usage: ChatUsage | undefined
  try {
    usage = readUsage(payload.usage)
  } catch (error) {
    return { type: 'error', error: error as Error }
  }

  if (Array.isArray(payload.choices) && payload.choices.length === 0 && usage) {
    return { type: 'ignore', reason: 'usage', metadata: { usage } }
  }
  if (!Array.isArray(payload.choices) || !isRecord(payload.choices[0])) {
    return protocolError('缺少 choices[0]')
  }

  const choice = payload.choices[0]
  const finishReason = choice.finish_reason
  if (finishReason != null && typeof finishReason !== 'string') {
    return protocolError('finish_reason 必须是字符串或 null')
  }
  const baseMetadata: StreamEventMetadata = {
    ...(usage ? { usage } : {}),
    ...(typeof finishReason === 'string' ? { finishReason } : {}),
  }

  if (!isRecord(choice.delta)) {
    if (typeof finishReason === 'string') {
      return { type: 'ignore', reason: 'finish', metadata: baseMetadata }
    }
    return protocolError('缺少 choices[0].delta')
  }

  const delta = choice.delta
  const content = delta.content
  const reasoning = delta.reasoning_content
  if (content != null && typeof content !== 'string') return protocolError('delta.content 必须是字符串')
  if (reasoning != null && typeof reasoning !== 'string') return protocolError('delta.reasoning_content 必须是字符串')

  const metadata: StreamEventMetadata = {
    ...baseMetadata,
    ...(typeof reasoning === 'string' && reasoning.length > 0 ? { hasReasoning: true } : {}),
  }
  if (typeof content === 'string' && content.length > 0) {
    return { type: 'text', text: content, metadata }
  }
  if (typeof reasoning === 'string' && reasoning.length > 0) {
    return { type: 'ignore', reason: 'reasoning', metadata }
  }
  if (delta.tool_calls != null || delta.function_call != null) {
    return { type: 'ignore', reason: 'tool-call', metadata }
  }
  if (typeof delta.role === 'string') return { type: 'ignore', reason: 'role', metadata }
  if (typeof finishReason === 'string') return { type: 'ignore', reason: 'finish', metadata }
  if (usage) return { type: 'ignore', reason: 'usage', metadata }
  if (content === '') return { type: 'ignore', reason: 'empty-text', metadata }
  return protocolError('delta 中没有可识别的内容')
}

export const openAIStreamAdapter: StreamAdapter = {
  parse: parseOpenAIStreamEvent,
}
