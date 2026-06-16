import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { APP_BASE_HREF } from '@angular/common';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { HttpClient } from '@angular/common/http';
import { MfeAgent } from '@your-org/mfe-state';
import { DevUIModule } from 'ng-devui';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ErrorCenterComponent } from './features/error-center/error-center.component';
import { PORTAL_AGENT } from './core/portal-agent.token';

@NgModule({
  declarations: [AppComponent, ErrorCenterComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    FormsModule,
    DevUIModule,
    AppRoutingModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: (http: HttpClient) => new TranslateHttpLoader(http, './assets/i18n/', '.json'),
        deps: [HttpClient],
      },
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
export class AppModule { }
