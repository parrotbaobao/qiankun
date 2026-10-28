import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { MfeAgent } from '@mfe-demo/microfrontend-state';
import { PORTAL_AGENT } from './core/portal-agent.token';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { HttpClient } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AppComponent } from './app.component';
import { APP_BASE_HREF, CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { OrchestrationService } from './core/services/orchestration.service';
import { UserTableModule } from './features/user-table/user-table.module';
import { IconHexComponent } from './shared/icons/icon-hex.component';
import { IconTableComponent } from './shared/icons/icon-table.component';
import { IconBarChartComponent } from './shared/icons/icon-bar-chart.component';
import { IconUploadNavComponent } from './shared/icons/icon-upload-nav.component';

@NgModule({
  declarations: [
    AppComponent,
  ],
  imports: [
    BrowserModule,
    CommonModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    UserTableModule,
    IconHexComponent,
    IconTableComponent,
    IconBarChartComponent,
    IconUploadNavComponent,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: (http: HttpClient) => new TranslateHttpLoader(http, './assets/i18n/', '.json'),
        deps: [HttpClient],
      },
    }),
  ],
  providers: [
    {
      provide: APP_BASE_HREF,
      useValue: (window as any).__POWERED_BY_QIANKUN__ ? '/operations-workbench' : '/',
    },
    {
      provide: PORTAL_AGENT,
      useFactory: () => MfeAgent.getInstance(),
    },
    OrchestrationService,
  ],
  bootstrap: [AppComponent],
})
export class AppModule { }
