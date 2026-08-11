import type {
  GlobalState,
  MfeContext,
  MfeEvent,
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
} from './types';
import { DEFAULT_MFE_CONTEXT } from './types';

interface QiankunSubProps {
  onGlobalStateChange?: (
    callback: (state: GlobalState, prev: GlobalState) => void,
    fireImmediately?: boolean,
  ) => void;
  setGlobalState?: (patch: Partial<GlobalState>) => boolean;
  offGlobalStateChange?: () => boolean;
  [key: string]: unknown;
}

/** 当前活跃实例，由构造函数写入、destroy 清除 */
let _instance: MfeAgent | null = null;

export class MfeAgent {
  private _context: MfeContext = { ...DEFAULT_MFE_CONTEXT };
  private _setStateFn: ((patch: Partial<GlobalState>) => boolean) | null = null;
  private _offChangeFn: (() => boolean) | null = null;
  private readonly _listeners = new Set<ContextChangeCallback>();

  constructor(props: QiankunSubProps) {
    _instance = this;

    if (typeof props?.onGlobalStateChange !== 'function') return;

    this._setStateFn = props.setGlobalState ?? null;
    this._offChangeFn = props.offGlobalStateChange ?? null;

    props.onGlobalStateChange((state, prev) => {
      const ctx = state?.context ?? { ...DEFAULT_MFE_CONTEXT };
      const prevCtx = prev?.context ?? { ...DEFAULT_MFE_CONTEXT };
      this._context = ctx;
      this._listeners.forEach((fn) => fn(ctx, prevCtx));
    }, true);
  }

  /** 获取当前活跃实例（Angular 服务在构造时调用） */
  static getInstance(): MfeAgent | null {
    return _instance;
  }

  /** 当前 context 快照 */
  get context(): MfeContext {
    return { ...this._context };
  }

  /** 订阅 context 变化，返回取消订阅函数 */
  onContextChange(callback: ContextChangeCallback): () => void {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }

  // ─── 向主应用发送事件 ─────────────────────────────────────────────────────

  navigate(event: NavigationEvent): boolean { return this._send(event); }
  requestLogin(event: LoginEvent): boolean { return this._send(event); }
  reportUba(event: UbaEvent): boolean { return this._send(event); }
  reportUem(event: UemEvent): boolean { return this._send(event); }
  showToast(event: ToastEvent): boolean { return this._send(event); }
  setTab(event: TabEvent): boolean { return this._send(event); }
  followProduct(event: FollowEvent): boolean { return this._send(event); }
  setProduct(event: ProductEvent): boolean { return this._send(event); }
  controlServiceMenu(event: ServiceMenuEvent): boolean { return this._send(event); }
  checkUserLogin(event: CheckUserLoginEvent): boolean { return this._send(event); }
  logout(): boolean { return this._send({ eventType: 'userLogout' }); }

  /** 在子应用 unmount 时调用 */
  destroy(): void {
    this._offChangeFn?.();
    this._setStateFn = null;
    this._offChangeFn = null;
    this._listeners.clear();
    if (_instance === this) _instance = null;
  }

  private _send(event: MfeEvent): boolean {
    if (!this._setStateFn) return false;
    return this._setStateFn({ event });
  }
}
