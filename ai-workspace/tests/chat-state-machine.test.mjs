import { test } from 'node:test'
import assert from 'node:assert/strict'
import { shallowRef, computed, watch } from 'vue'
import { createStateMachine } from '../src/services/chat/state-machine.ts'

test('忽略空闲时非法事件，重复 connect 不打断接收', () => {
  const m = createStateMachine()
  m.send({ type: 'retry', attempt: 1 })
  assert.equal(m.state.kind, 'idle')
  m.send({ type: 'connect' })
  m.send({ type: 'firstChunk' })
  m.send({ type: 'connect' })
  assert.equal(m.state.kind, 'streaming')
})
test('业务完成直接结束，支持空回答', () => {
  for (const hasText of [true, false]) {
    const m = createStateMachine()
    m.send({ type: 'connect' })
    if (hasText) m.send({ type: 'firstChunk' })
    m.send({ type: 'complete' })
    assert.equal(m.state.kind, 'done')
  }
})
test('停止和失败是终态，迟到消息不能恢复生成', () => {
  for (const event of [{ type: 'abort' }, { type: 'error', error: new Error('offline') }]) {
    const m = createStateMachine()
    m.send({ type: 'connect' })
    m.send(event)
    const terminal = m.state
    for (const e of [{ type: 'firstChunk' }, { type: 'retry', attempt: 1 }, { type: 'complete' }]) m.send(e)
    assert.equal(m.state, terminal)
  }
})
test('重试次数有效且业务完成后禁止重试', () => {
  const m = createStateMachine()
  m.send({ type: 'connect' })
  m.send({ type: 'retry', attempt: 0 })
  assert.equal(m.state.kind, 'connecting')
  m.send({ type: 'retry', attempt: 1 })
  assert.deepEqual(m.state, { kind: 'reconnecting', attempt: 1 })
  m.send({ type: 'firstChunk' })
  m.send({ type: 'complete' })
  m.send({ type: 'retry', attempt: 2 })
  assert.equal(m.state.kind, 'done')
})
test('状态直接同步到 Vue ref，按钮计算和消息映射可及时更新', () => {
  const state = shallowRef({ kind: 'idle' })
  const m = createStateMachine(state)
  const isBusy = computed(() => ['connecting', 'streaming', 'reconnecting'].includes(state.value.kind))
  const seen = []
  const stop = watch(state, s => seen.push(s.kind), { flush: 'sync' })
  m.send({ type: 'connect' })
  assert.equal(isBusy.value, true)
  m.send({ type: 'connect' })
  m.send({ type: 'firstChunk' })
  m.send({ type: 'firstChunk' })
  m.send({ type: 'complete' })
  assert.equal(isBusy.value, false)
  assert.deepEqual(seen, ['connecting', 'streaming', 'done'])
  stop()
})
test('销毁后不再更新响应式状态，新的一轮可以从空闲重新开始', () => {
  const state = shallowRef({ kind: 'idle' })
  const m = createStateMachine(state)
  m.send({ type: 'connect' })
  m.dispose()
  m.send({ type: 'firstChunk' })
  assert.equal(state.value.kind, 'connecting')
  const next = createStateMachine(state)
  assert.equal(state.value.kind, 'idle')
  next.send({ type: 'connect' })
  next.send({ type: 'abort' })
  m.send({ type: 'error', error: new Error('late') })
  assert.equal(state.value.kind, 'aborted')
})
