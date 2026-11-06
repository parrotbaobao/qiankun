import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
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
} from '@mfe-demo/microfrontend-state';
import { getCommunication } from '../../../communication';

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

  private readonly agent = getCommunication();

  constructor(private ngZone: NgZone) {
    const agent = this.agent;
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
