import { Component, OnDestroy, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { abc } from '@your-org/my-shared-utils';
import { MfeStateService } from './core/services/mfe-state.service';

@Component({
  selector: 'sub-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'sub-app';
  currentLang: string = 'zh';

  private _sub = new Subscription();

  constructor(
    private translate: TranslateService,
    private mfeState: MfeStateService,
  ) {
    this.translate.setDefaultLang('zh');
    this.translate.addLangs(['zh', 'en']);

    const savedLang = localStorage.getItem('lang');
    this.currentLang = savedLang || 'zh';
    this.translate.use(this.currentLang);
  }

  ngOnInit(): void {
    abc();

    // 同步主应用推送的语言变更
    this._sub.add(
      this.mfeState.context$.pipe(
        map((ctx) => ctx.language),
        distinctUntilChanged(),
      ).subscribe((lang) => {
        if (lang && lang !== this.currentLang) {
          this.currentLang = lang;
          localStorage.setItem('lang', lang);
          this.translate.use(lang);
        }
      }),
    );
  }

  changeLang(lang: string): void {
    this.currentLang = lang;
    localStorage.setItem('lang', lang);
    this.translate.use(lang);
  }

  ngOnDestroy(): void {
    this._sub.unsubscribe();
  }
}
