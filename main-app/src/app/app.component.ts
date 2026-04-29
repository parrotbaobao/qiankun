import { AfterViewInit, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { registerMicroApps, start } from 'qiankun';
import { ApiService } from './core/services/api.service';
import { initMfeState } from '@your-org/mfe-state/dist/main';
import type { MfeMainStateActions } from '@your-org/mfe-state/dist/main';
import type { GlobalState, MfeContext, MfeEvent } from '@your-org/mfe-state';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {
  currentUrl = '';

  private mfeActions: MfeMainStateActions | null = null;
  private _currentContext: MfeContext = {
    language: 'zh',
    userInfo: null,
    productShort: '',
    productName: '',
    pathname: { previous: '', current: '' },
    isInitStatus: false,
  };

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private apiService: ApiService,
  ) {
    this.currentUrl = this.router.url;
    this.router.events.subscribe(() => {
      this.currentUrl = this.router.url;
    });
  }

  ngOnInit(): void {
    this.apiService.getUserById(1001).subscribe({
      next: (response) => {
        console.log('API 调用成功:', response);
      },
      error: (error) => {
        console.error('API 调用失败:', error);
      },
    });
  }

  ngAfterViewInit(): void {
    // 1. 初始化全局状态（必须在 registerMicroApps 之前调用）
    this.mfeActions = initMfeState({ language: 'zh' });

    this.mfeActions.onGlobalStateChange((state: GlobalState, prev: GlobalState) => {
      // 仅当 event 字段变化时，才处理子应用发来的事件
      if (state.event !== prev.event) {
        this.handleSubAppEvent(state.event as MfeEvent);
        // 消费后重置 event，避免重复触发
        this.mfeActions?.setGlobalState({ event: {} });
      }
      this._currentContext = state.context;
      this.cdr.markForCheck();
    });

    // 2. 注册子应用
    registerMicroApps([
      {
        name: 'sub-app',
        entry: 'http://localhost:5003/',
        container: '#container',
        activeRule: (loc) => loc.pathname.startsWith('/sub-app'),
      },
      {
        name: 'sub2-app2',
        entry: 'http://localhost:4202/',
        container: '#container',
        activeRule: (loc) => loc.pathname.startsWith('/sub2-app2'),
      },
    ]);

    // 3. 启动 qiankun
    start({
      prefetch: 'all',
      sandbox: {
        strictStyleIsolation: false,
        experimentalStyleIsolation: false,
      },
    });
  }

  /** 处理子应用发来的事件 */
  private handleSubAppEvent(event: MfeEvent): void {
    if (!event || !Object.keys(event).length) return;
    console.log('[MainApp] 收到子应用事件:', event);

    if ('service' in event) {
      // NavigationEvent: 子应用请求跨产品导航
      const e = event as import('@your-org/mfe-state').NavigationEvent;
      if (!e.isSelf && e.productShort) {
        this.updateSelectedProduct(e.productShort, e.productName);
        this.router.navigateByUrl(e.service);
      }
    } else if ('isShowDialog' in event) {
      // LoginEvent
      console.log('[MainApp] 子应用请求登录');
    } else if ('severity' in event) {
      // ToastEvent
      console.log('[MainApp] 子应用发出 Toast:', event);
    } else if ('behavior' in event) {
      // UbaEvent
      console.log('[MainApp] UBA 上报:', event);
    }
  }

  private updateSelectedProduct(productShort: string, productName?: string): void {
    this._currentContext = {
      ...this._currentContext,
      productShort,
      productName: productName ?? productShort,
      isInitStatus: false,
    };
    this.mfeActions?.setGlobalState({
      context: this._currentContext,
      event: {},
    });
  }

  setGlobalLang(lang: string): void {
    this._currentContext = { ...this._currentContext, language: lang };
    this.mfeActions?.setGlobalState({ context: this._currentContext, event: {} });
  }

  isActive(path: string): boolean {
    return this.currentUrl === path;
  }

  goHostHome(): void {
    this.router.navigateByUrl('/home');
    this.updateSelectedProduct('main-app', '主应用');
  }

  goHostAd(): void {
    this.router.navigateByUrl('/cloud-advisor');
    this.updateSelectedProduct('cloud-advisor', 'Cloud Advisor');
  }

  goSubApp1(): void {
    this.router.navigateByUrl('/sub-app');
    this.updateSelectedProduct('sub-app', '子应用1');
  }

  goSubApp2(): void {
    this.router.navigateByUrl('/sub2-app2');
    this.updateSelectedProduct('sub2-app2', '子应用2');
  }

  ngOnDestroy(): void {
    this.mfeActions?.offGlobalStateChange();
  }
}
