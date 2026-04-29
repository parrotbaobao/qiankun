import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { APP_BASE_HREF } from '@angular/common';
import { TranslateModule, provideTranslateLoader } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { MfeAgent } from '@your-org/mfe-state';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ErrorCenterComponent } from './features/error-center/error-center.component';
import { PORTAL_AGENT } from './core/portal-agent.token';

@NgModule({
  declarations: [AppComponent, ErrorCenterComponent],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule,
    AppRoutingModule,
    TranslateModule.forRoot({
      loader: provideTranslateHttpLoader({
        prefix: './assets/i18n/',
        suffix: '.json',
      }),
      defaultLanguage: 'zh',
    }),
  ],
  providers: [
    {
      provide: APP_BASE_HREF,
      useValue: (window as any).__POWERED_BY_QIANKUN__ ? '/sub2-app2' : '/',
    },
    {
      provide: PORTAL_AGENT,
      useFactory: () => MfeAgent.getInstance(),
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
