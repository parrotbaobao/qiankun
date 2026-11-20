import { shallowRef, type ShallowRef } from 'vue'

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

/** 每轮创建一个状态机；页面可传入响应式状态，转换后由 Vue 自动更新界面。 */
export function createStateMachine(
  stateRef: ShallowRef<ChatState> = shallowRef<ChatState>({ kind: 'idle' }),
): StateMachine {
  stateRef.value = { kind: 'idle' }
  let disposed = false

  return {
    get state() { return stateRef.value },
    send(event) {
      if (disposed) return
      stateRef.value = transition(stateRef.value, event)
    },
    dispose() {
      disposed = true
    },
  }
}
