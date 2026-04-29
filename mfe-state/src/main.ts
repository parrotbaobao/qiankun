import type { GlobalState, MfeContext } from './types';
import { DEFAULT_GLOBAL_STATE } from './types';

export interface MfeMainStateActions {
  onGlobalStateChange(
    callback: (state: GlobalState, prev: GlobalState) => void,
    fireImmediately?: boolean,
  ): void;
  setGlobalState(patch: Partial<GlobalState>): boolean;
  offGlobalStateChange(): boolean;
}

/**
 * 主应用初始化 qiankun 全局状态。
 * 必须在 registerMicroApps() 之前调用，qiankun 才会向子应用注入 actions。
 *
 * @example
 * ```ts
 * import { initMfeState } from '@your-org/mfe-state/dist/main';
 *
 * const actions = initMfeState({ language: 'zh' });
 * actions.onGlobalStateChange((state, prev) => {
 *   if (state.event !== prev.event) {
 *     // 处理子应用发来的事件
 *   }
 * });
 * ```
 */
export function initMfeState(initialContext?: Partial<MfeContext>): MfeMainStateActions {
  // require 延迟加载，避免子应用 webpack bundle 将 qiankun 打包进去
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { initGlobalState } = require('qiankun') as {
    initGlobalState: (state: Record<string, unknown>) => MfeMainStateActions;
  };

  const state: GlobalState = {
    context: { ...DEFAULT_GLOBAL_STATE.context, ...initialContext },
    event: {},
  };

  return initGlobalState(state as unknown as Record<string, unknown>);
}
