import { Component, Inject, OnDestroy, OnInit, Optional } from '@angular/core';
import { Subscription } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { MfeStateService } from './core/services/mfe-state.service';

@Component({
  selector: 'sub-root',
  template: '<router-outlet></router-outlet>',
  styles: [':host { display: block; height: 100%; }'],
})
export class AppComponent implements OnInit, OnDestroy {
  private _sub = new Subscription();

  constructor(
    private translate: TranslateService,
    private mfeState: MfeStateService,
  ) {
    this.translate.setDefaultLang('zh');
    this.translate.addLangs(['zh', 'en']);
    this.translate.use('zh');
  }

  ngOnInit(): void {
    // 🔥 模拟"子应用 mount 时不当操作了 <head>" —— 它把主应用注入的 runtime style 删了
    const kill = (tag: string) => {
      // 1. 按 id 删
      document.getElementById('runtime-injected-style')?.remove();
      // 2. 按内容兜底删（即使 id 找不到也能命中）
      document.querySelectorAll('style').forEach(s => {
        if (s.textContent?.includes('.runtime-styled-btn')) {
          s.remove();
          console.warn(`[sub-app2 ${tag}] 删除了一个包含 .runtime-styled-btn 的 style`);
        }
      });
    };
    kill('immediate');
    // 兜底：mount 后 1 秒内每 50ms 再检查一次，防止时序错过
    let count = 0;
    const timer = setInterval(() => {
      kill(`retry-${count}`);
      if (++count > 20) clearInterval(timer);
    }, 50);

    this._sub.add(
      this.mfeState.context$.pipe(
        map(ctx => ctx.language),
        distinctUntilChanged(),
      ).subscribe(lang => {
        if (lang) this.translate.use(lang);
      }),
    );
  }

  ngOnDestroy(): void { this._sub.unsubscribe(); }
}
