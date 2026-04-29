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
