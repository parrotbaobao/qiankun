// 显式状态机：替代散落的 streamClosed / isPumping 等布尔标志
// 状态转换图：
//   idle ──connect──▶ connecting ──firstChunk──▶ streaming ──streamClosed+queueDrained──▶ done
//                          │                          │
//                          │                          ├──retry──▶ reconnecting ──firstChunk──▶ streaming
//                          │                          │
//                          └──error/abort─────────────┴──▶ error / aborted

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

/** 按 kind 取出对应的状态对象类型（窄化），方便 on(kind) 回调拿到带 payload 的状态 */
export type ChatStateOf<K extends ChatState['kind']> = Extract<ChatState, { kind: K }>

export interface StateMachine {
  readonly state: ChatState
  /** 订阅所有状态变化（无过滤） */
  subscribe(fn: (s: ChatState) => void): () => void
  /** 只在进入指定 kind 时回调；回调里的 s 已被窄化到对应 payload */
  on<K extends ChatState['kind']>(kind: K, fn: (s: ChatStateOf<K>) => void): () => void
  send(ev: ChatEvent): void
}

export function createStateMachine(): StateMachine {
  let state: ChatState = { kind: 'idle' }
  let streamClosed = false
  const listeners = new Set<(s: ChatState) => void>()

  const set = (next: ChatState) => {
    if (next.kind === state.kind && JSON.stringify(next) === JSON.stringify(state)) return
    console.log(state, next, listeners)
    state = next
    listeners.forEach(l => l(state))
  }

  const isTerminal = () =>
    state.kind === 'done' || state.kind === 'error' || state.kind === 'aborted'

  return {
    get state() { return state },
    subscribe(fn) { listeners.add(fn); return () => { listeners.delete(fn) } },
    on(kind, fn) {
      const wrapper = (s: ChatState) => {
        if (s.kind === kind) fn(s as ChatStateOf<typeof kind>)
      }
      listeners.add(wrapper)
      return () => { listeners.delete(wrapper) }
    },
    send(ev) {
      if (isTerminal()) return
      switch (ev.type) {
        case 'connect':
          streamClosed = false
          set({ kind: 'connecting' })
          break
        case 'firstChunk':
          if (state.kind === 'connecting' || state.kind === 'reconnecting') {
            set({ kind: 'streaming' })
          }
          break
        case 'retry':
          streamClosed = false
          set({ kind: 'reconnecting', attempt: ev.attempt })
          break
        case 'streamClosed':
          streamClosed = true
          break
        case 'queueDrained':
          if (streamClosed && (state.kind === 'streaming' || state.kind === 'connecting')) {
            set({ kind: 'done' })
          }
          break
        case 'error':
          set({ kind: 'error', error: ev.error })
          break
        case 'abort':
          set({ kind: 'aborted' })
          break
      }
    },
  }
}
