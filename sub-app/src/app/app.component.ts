import { Component, OnDestroy, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { abc } from '@your-org/my-shared-utils';
import { MfeStateService } from './core/services/mfe-state.service';
import { Router } from '@angular/router';

@Component({
  selector: 'sub-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'sub1-app';
  currentLang: string = 'zh';
  probeDialogOpen = false;

  private _sub = new Subscription();

  constructor(
    private translate: TranslateService,
    private mfeState: MfeStateService,
    private router: Router,
  ) {
    this.translate.setDefaultLang('zh');
    this.translate.addLangs(['zh', 'en']);

    const savedLang = localStorage.getItem('lang');
    this.currentLang = savedLang || 'zh';
    this.translate.use(this.currentLang);
  }

  ngOnInit(): void {
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
