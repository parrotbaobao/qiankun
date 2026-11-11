export type ChatState =
  | { kind: 'idle' }
  | { kind: 'connecting' }
  | { kind: 'streaming' }
  | { kind: 'reconnecting'; attempt: number }
  | { kind: 'done' }
  | { kind: 'error'; error: unknown }
  | { kind: 'aborted' }

export type ChatEvent =
  | { type: 'connect' }
  | { type: 'firstChunk' }
  | { type: 'complete' }
  | { type: 'retry'; attempt: number }
  | { type: 'error'; error: unknown }
  | { type: 'abort' }

export interface StateMachine {
  readonly state: ChatState
  /** 订阅所有状态变化（无过滤） */
  subscribe(fn: (s: ChatState) => void): () => void
  send(ev: ChatEvent): void
  dispose(): void
}

function isActiveChatState(state: ChatState): boolean {
  return state.kind === 'connecting' || state.kind === 'streaming' || state.kind === 'reconnecting'
}

/** 纯函数：只计算下一状态，不发请求、不通知页面；非法事件返回原状态。 */
export function transition(state: ChatState, event: ChatEvent): ChatState {
  if (state.kind === 'idle') {
    return event.type === 'connect'
      ? { kind: 'connecting' }
      : state
  }
  if (!isActiveChatState(state)) return state

  switch (event.type) {
    case 'firstChunk':
      return state.kind === 'streaming' ? state : { kind: 'streaming' }
    case 'complete':
      return { kind: 'done' }
    case 'retry':
      if (!Number.isInteger(event.attempt) || event.attempt < 1) return state
      return { kind: 'reconnecting', attempt: event.attempt }
    case 'error':
      return { kind: 'error', error: event.error }
    case 'abort':
      return { kind: 'aborted' }
    default:
      return state
  }
}

/** 每轮请求创建一个实例；终态不复用，新请求创建新状态机。 */
export function createStateMachine(): StateMachine {
  let state: ChatState = { kind: 'idle' }
  let disposed = false
  const listeners = new Set<(state: ChatState) => void>()

  const subscribe = (listener: (state: ChatState) => void) => {
    if (!disposed) listeners.add(listener)
    return () => { listeners.delete(listener) }
  }

  return {
    get state() { return state },
    subscribe,
    send(event) {
      if (disposed) return
      const previous = state
      state = transition(state, event)
      if (state === previous) return

      // 订阅者负责同步页面；状态事件由协调层发送。
      const published = state
      for (const listener of [...listeners]) {
        if (listeners.has(listener)) listener(published)
      }
    },
    dispose() {
      disposed = true
      listeners.clear()
    },
  }
}
