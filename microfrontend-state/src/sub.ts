import { MfeAgent } from './agent';
import type { MfeContext, ContextChangeCallback } from './types';

/**
 * 在子应用 mount 生命周期调用（函数式接入方式）。
 * 等价于 `new MfeAgent(props)`，供不使用类实例化模式的场景使用。
 */
export function connectMfeState(props: Record<string, unknown>): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  new MfeAgent(props as any);
}

/** 在子应用 unmount 生命周期调用 */
export function disconnectMfeState(): void {
  MfeAgent.getInstance()?.destroy();
}

/** 获取当前 context 快照 */
export function getMfeContext(): MfeContext {
  return MfeAgent.getInstance()?.context ?? {
    language: 'zh',
    userInfo: null,
    productShort: '',
    productName: '',
    pathname: { previous: '', current: '' },
    isInitStatus: false,
  };
}

/** 订阅 context 变化，返回取消订阅函数 */
export function onContextChange(callback: ContextChangeCallback): () => void {
  const agent = MfeAgent.getInstance();
  if (!agent) return () => {};
  return agent.onContextChange(callback);
}
