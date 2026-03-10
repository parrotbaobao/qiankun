// Vue3 reactive 手写“最小闭环源码”（无 any 版）
// - reactive: Proxy 拦截 get/set
// - track/trigger: WeakMap 依赖桶
// - effect: 注册副作用
//
// 说明：这是原理版实现；省略 scheduler、数组/Map/Set 特殊处理等。

type Key = PropertyKey

// 让 ReactiveEffect 可被调用但不暴露内部结构
interface ReactiveEffect {
  run: () => void
  deps: Array<Set<ReactiveEffect>>
}

let activeEffect: ReactiveEffect | null = null

class ReactiveEffectImpl implements ReactiveEffect {
  deps: Array<Set<ReactiveEffect>> = []
  private readonly fn: () => void

  constructor(fn: () => void) {
    this.fn = fn
  }

  run(): void {
    activeEffect = this
    try {
      this.fn()
    } finally {
      activeEffect = null
    }
  }
}

function cleanupEffect(e: ReactiveEffect): void {
  for (const dep of e.deps) dep.delete(e)
  e.deps.length = 0
}

export function effect(fn: () => void): () => void {
  const e = new ReactiveEffectImpl(() => {
    cleanupEffect(e)
    fn()
  })
  e.run()
  return () => e.run()
}

// ===== 依赖桶：target(object) -> key(property) -> dep(effects) =====
type Dep = Set<ReactiveEffect>
type DepsMap = Map<Key, Dep>

const targetMap: WeakMap<object, DepsMap> = new WeakMap()

export function track(target: object, key: Key): void {
  if (!activeEffect) return

  let depsMap = targetMap.get(target)
  if (!depsMap) {
    depsMap = new Map<Key, Dep>()
    targetMap.set(target, depsMap)
  }

  let dep = depsMap.get(key)
  if (!dep) {
    dep = new Set<ReactiveEffect>()
    depsMap.set(key, dep)
  }

  if (!dep.has(activeEffect)) {
    dep.add(activeEffect)
    activeEffect.deps.push(dep)
  }
}

export function trigger(target: object, key: Key): void {
  const depsMap = targetMap.get(target)
  const dep = depsMap?.get(key)
  if (!dep) return

  // 复制一份，避免遍历中 dep 被修改
  const effects = new Set<ReactiveEffect>(dep)
  effects.forEach(e => e.run())
}

// ===== reactive：raw -> proxy 缓存 =====
const reactiveMap: WeakMap<object, object> = new WeakMap()

const IS_REACTIVE = '__v_isReactive'
const RAW = '__v_raw'

type ReactiveFlags = typeof IS_REACTIVE | typeof RAW

function isObject(val: unknown): val is object {
  return typeof val === 'object' && val !== null
}

function isReactive(val: unknown): val is object {
  return isObject(val) && (val as Record<string, unknown>)[IS_REACTIVE] === true
}

export function toRaw<T>(val: T): T {
  if (isObject(val)) {
    const raw = (val as Record<string, unknown>)[RAW]
    if (isObject(raw) || typeof raw !== 'undefined') return raw as T
  }
  return val
}

// 这里用 object 作为代理返回类型，最后在 reactive<T> 里再断言成 T
const mutableHandlers: ProxyHandler<object> = {
  get(target: object, key: Key, receiver: object): unknown {
    if (key === IS_REACTIVE) return true
    if (key === RAW) return target

    track(target, key)
    const res = Reflect.get(target, key, receiver) as unknown
    return isObject(res) ? reactive(res) : res
  },

  set(target: object, key: Key, value: unknown, receiver: object): boolean {
    const oldValue = Reflect.get(target, key, receiver) as unknown
    const result = Reflect.set(target, key, value, receiver)

    if (!Object.is(oldValue, value)) {
      trigger(target, key)
    }
    return result
  },

  deleteProperty(target: object, key: Key): boolean {
    const hadKey = Object.prototype.hasOwnProperty.call(target, key)
    const result = Reflect.deleteProperty(target, key)
    if (hadKey && result) {
      trigger(target, key)
    }
    return result
  }
}

export function reactive<T extends object>(target: T): T {
  if (!isObject(target)) return target

  // 如果传进来的已经是 reactive proxy，直接返回
  if (isReactive(target)) return target

  // 缓存命中：返回同一个 proxy
  const existing = reactiveMap.get(target)
  if (existing) return existing as T

  // 创建 proxy 并缓存
  const proxy = new Proxy(target as object, mutableHandlers)
  reactiveMap.set(target, proxy)
  return proxy as T
}

/*
用法示例：

const state = reactive({ count: 0, nested: { a: 1 } })

effect(() => {
  console.log('render:', state.count, state.nested.a)
})

state.count++
state.nested.a = 2
*/