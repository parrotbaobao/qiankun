import { MfeAgent } from '@mfe-demo/microfrontend-state';

// 每个子应用的模块各自保存实例；跨应用通信仍由 qiankun 完成。
let agent: MfeAgent | null = null;

/** Angular 启动前初始化，让后续 Service 能取得当前实例。 */
export function initCommunication(props: Record<string, unknown>): void {
  destroyCommunication();
  agent = new MfeAgent(props);
}

/** 独立运行时未连接主应用，返回 null。 */
export function getCommunication(): MfeAgent | null {
  return agent;
}

/** 子应用卸载时解除全局状态监听，并清除实例。 */
export function destroyCommunication(): void {
  agent?.destroy();
  agent = null;
}
