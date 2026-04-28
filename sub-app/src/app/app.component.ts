import { Component, OnInit } from '@angular/core';
import { abc } from '@your-org/my-shared-utils';
import { TranslateService } from '@ngx-translate/core';

type Lang = 'zh' | 'en';


@Component({
  selector: 'sub-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'sub-app';
  currentLang: Lang = 'zh';

  constructor(private translate: TranslateService) {
    this.translate.setDefaultLang('zh');
    this.translate.addLangs(['zh', 'en']);

    const savedLang = localStorage.getItem('lang') as Lang | null;
    this.currentLang = savedLang || 'zh';

    this.translate.use(this.currentLang);
  }

  ngOnInit(): void {
    abc();
  }

  changeLang(lang: Lang): void {
    this.currentLang = lang;
    localStorage.setItem('lang', lang);
    this.translate.use(lang);
  }
}
