// ─── Context (main → sub) ────────────────────────────────────────────────────

export interface UserInfo {
  [key: string]: unknown;
}

export interface MfePathname {
  previous: string;
  current: string;
}

export interface MfeContext {
  language: string;
  userInfo: UserInfo | null;
  productShort: string;
  productName: string;
  pathname: MfePathname;
  isInitStatus: boolean;
  followProducts?: string[];
}

// ─── Events (sub → main) ─────────────────────────────────────────────────────

/** 跨产品导航 */
export interface NavigationEvent {
  service: string;
  productShort?: string;
  productName?: string;
  /** true = 只更新选中产品，不触发路由跳转 */
  isSelf?: boolean;
}

/** 请求登录 */
export interface LoginEvent {
  isShowDialog: boolean;
  dialogTitle?: string;
}

/** UBA 行为上报 */
export interface UbaEvent {
  behavior: {
    service: string;
    action: string;
    detail?: unknown;
  };
}

/** UEM 用户体验监控 */
export interface UemEvent {
  eventType: 'trackEvent' | 'pageEvent';
  uem_id: string;
  uem_label?: string;
  data?: unknown;
}

/** 全局 Toast 通知 */
export interface ToastEvent {
  severity: 'success' | 'error' | 'warn' | 'info';
  summary?: string;
  detail?: string;
}

/** 切换 Tab */
export interface TabEvent {
  tabName: string;
}

/** 收藏/取消收藏产品 */
export interface FollowEvent {
  eventType: 'follow' | 'unfollow';
  data: {
    favoriteProducts: string[];
  };
}

/** 切换选中产品（不导航） */
export interface ProductEvent {
  productShort: string;
  productName?: string;
}

/** 服务菜单控制 */
export type ServiceMenuEvent =
  | { eventType: 'isOpenServiceMenu'; data: { isOpen: boolean; isCollapse?: boolean } }
  | { eventType: 'toAdvisor'; data: unknown };

/** 请求检查用户登录态 */
export interface CheckUserLoginEvent {
  eventType: 'checkUserLogin';
  data: { isNowCheck: boolean };
}

/** 请求登出 */
export interface UserLogoutEvent {
  eventType: 'userLogout';
}

export type MfeEvent =
  | NavigationEvent
  | LoginEvent
  | UbaEvent
  | UemEvent
  | ToastEvent
  | TabEvent
  | FollowEvent
  | ProductEvent
  | ServiceMenuEvent
  | CheckUserLoginEvent
  | UserLogoutEvent;

// ─── Full qiankun GlobalState ─────────────────────────────────────────────────

export interface GlobalState {
  context: MfeContext;
  event: MfeEvent | Record<string, never>;
}

export const DEFAULT_MFE_CONTEXT: MfeContext = {
  language: 'zh',
  userInfo: null,
  productShort: '',
  productName: '',
  pathname: { previous: '', current: '' },
  isInitStatus: false,
};

export const DEFAULT_GLOBAL_STATE: GlobalState = {
  context: { ...DEFAULT_MFE_CONTEXT },
  event: {},
};

export type ContextChangeCallback = (context: MfeContext, prev: MfeContext) => void;
