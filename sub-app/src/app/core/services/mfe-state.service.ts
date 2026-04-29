import { Inject, Injectable, NgZone, OnDestroy, Optional } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { MfeAgent } from '@your-org/mfe-state';
import type {
  MfeContext,
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
} from '@your-org/mfe-state';
import { PORTAL_AGENT } from '../portal-agent.token';

@Injectable({ providedIn: 'root' })
export class MfeStateService implements OnDestroy {
  private readonly _context$ = new BehaviorSubject<MfeContext>({
    language: 'zh',
    userInfo: null,
    productShort: '',
    productName: '',
    pathname: { previous: '', current: '' },
    isInitStatus: false,
  });

  readonly context$ = this._context$.asObservable();

  private _unsubscribe: (() => void) | null = null;

  constructor(
    private ngZone: NgZone,
    @Optional() @Inject(PORTAL_AGENT) private agent: MfeAgent | null,
  ) {
    if (agent) {
      this._context$.next(agent.context);
      this._unsubscribe = agent.onContextChange((ctx) => {
        this.ngZone.run(() => this._context$.next(ctx));
      });
    }
  }

  get snapshot(): MfeContext {
    return this._context$.getValue();
  }

  // ─── 向主应用发送事件 ──────────────────────────────────────────────────────

  navigate(event: NavigationEvent): void { this.agent?.navigate(event); }
  requestLogin(event: LoginEvent): void { this.agent?.requestLogin(event); }
  reportUba(event: UbaEvent): void { this.agent?.reportUba(event); }
  reportUem(event: UemEvent): void { this.agent?.reportUem(event); }
  showToast(event: ToastEvent): void { this.agent?.showToast(event); }
  setTab(event: TabEvent): void { this.agent?.setTab(event); }
  followProduct(event: FollowEvent): void { this.agent?.followProduct(event); }
  setProduct(event: ProductEvent): void { this.agent?.setProduct(event); }
  controlServiceMenu(event: ServiceMenuEvent): void { this.agent?.controlServiceMenu(event); }
  checkUserLogin(event: CheckUserLoginEvent): void { this.agent?.checkUserLogin(event); }
  logout(): void { this.agent?.logout(); }

  ngOnDestroy(): void {
    this._unsubscribe?.();
    this._context$.complete();
  }
}
