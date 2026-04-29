export type {
  UserInfo,
  MfePathname,
  MfeContext,
  MfeEvent,
  GlobalState,
  ContextChangeCallback,
  NavigationEvent,
  LoginEvent,
  UbaEvent,
  UemEvent,
  ToastEvent,
  TabEvent,
  FollowEvent,
  ProductEvent,
  ServiceMenuEvent,
  CheckUserLoginEvent,
  UserLogoutEvent,
} from './types';
export { DEFAULT_MFE_CONTEXT, DEFAULT_GLOBAL_STATE } from './types';

// 类实例化模式（推荐）
export { MfeAgent } from './agent';

// 函数式模式（兼容旧接入方式）
export {
  connectMfeState,
  disconnectMfeState,
  getMfeContext,
  onContextChange,
} from './sub';
