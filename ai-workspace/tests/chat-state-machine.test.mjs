import { test } from 'node:test'
import assert from 'node:assert/strict'
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
test('只在公开状态变化时同步通知订阅者', () => {
  const m = createStateMachine()
  const seen = []
  m.subscribe(s => seen.push(s.kind))
  m.send({ type: 'connect' })
  assert.deepEqual(seen, ['connecting'])
  m.send({ type: 'connect' })
  m.send({ type: 'firstChunk' })
  m.send({ type: 'firstChunk' })
  assert.deepEqual(seen, ['connecting', 'streaming'])
  m.send({ type: 'complete' })
  assert.deepEqual(seen, ['connecting', 'streaming', 'done'])
})
test('取消订阅和销毁后不再通知', () => {
  const m = createStateMachine()
  let count = 0
  const off = m.subscribe(() => count++)
  off()
  m.send({ type: 'connect' })
  assert.equal(count, 0)
  m.subscribe(() => count++)
  m.dispose()
  m.send({ type: 'firstChunk' })
  assert.equal(count, 0)
  assert.equal(m.state.kind, 'connecting')
})
