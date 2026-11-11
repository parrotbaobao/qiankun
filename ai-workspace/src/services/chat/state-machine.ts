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
  | { type: 'streamClosed' }
  | { type: 'queueDrained' }
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

/** 一轮请求的内部快照；连接结束与展示结束是两个不同的信号。 */
export interface MachineSnapshot {
  readonly state: ChatState
  readonly streamClosed: boolean
}

function isActiveChatState(state: ChatState): boolean {
  return state.kind === 'connecting' || state.kind === 'streaming' || state.kind === 'reconnecting'
}

/** 纯函数：只计算下一快照，不发请求、不通知页面；非法事件返回原快照。 */
export function transition(snapshot: MachineSnapshot, event: ChatEvent): MachineSnapshot {
  const { state, streamClosed } = snapshot
  if (state.kind === 'idle') {
    return event.type === 'connect'
      ? { state: { kind: 'connecting' }, streamClosed: false }
      : snapshot
  }
  if (!isActiveChatState(state)) return snapshot

  switch (event.type) {
    case 'firstChunk':
      return state.kind === 'streaming' ? snapshot : { ...snapshot, state: { kind: 'streaming' } }
    case 'streamClosed':
      return streamClosed ? snapshot : { ...snapshot, streamClosed: true }
    case 'queueDrained':
      return streamClosed ? { ...snapshot, state: { kind: 'done' } } : snapshot
    case 'retry':
      if (streamClosed || !Number.isInteger(event.attempt) || event.attempt < 1) return snapshot
      return { state: { kind: 'reconnecting', attempt: event.attempt }, streamClosed: false }
    case 'error':
      return { ...snapshot, state: { kind: 'error', error: event.error } }
    case 'abort':
      return { ...snapshot, state: { kind: 'aborted' } }
    default:
      return snapshot
  }
}

/** 每轮请求创建一个实例；终态不复用，新请求创建新状态机。 */
export function createStateMachine(): StateMachine {
  let snapshot: MachineSnapshot = { state: { kind: 'idle' }, streamClosed: false }
  let disposed = false
  const listeners = new Set<(state: ChatState) => void>()

  const subscribe = (listener: (state: ChatState) => void) => {
    if (!disposed) listeners.add(listener)
    return () => { listeners.delete(listener) }
  }

  return {
    get state() { return snapshot.state },
    subscribe,
    send(event) {
      if (disposed) return
      const previous = snapshot
      snapshot = transition(snapshot, event)
      if (snapshot.state === previous.state) return

      // 订阅者负责同步页面；状态事件由协调层发送。
      const published = snapshot.state
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
