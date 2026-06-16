import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { MfeAgent } from '@your-org/mfe-state';
import { PORTAL_AGENT } from './core/portal-agent.token';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { HttpClient } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AppComponent } from './app.component';
import { APP_BASE_HREF, CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { AiChatComponent } from './features/ai-chat/ai-chat.component';
import { OrchestrationService } from './core/services/orchestration.service';
import { UserTableModule } from './features/user-table/user-table.module';
import { HomeModule } from './features/home/home.module';
import { IconHexComponent } from './shared/icons/icon-hex.component';
import { IconAiComponent } from './shared/icons/icon-ai.component';
import { IconTableComponent } from './shared/icons/icon-table.component';
import { IconBarChartComponent } from './shared/icons/icon-bar-chart.component';
import { IconUploadNavComponent } from './shared/icons/icon-upload-nav.component';
import { IconHomeComponent } from './shared/icons/icon-home.component';

@NgModule({
  declarations: [
    AppComponent,
    AiChatComponent,
  ],
  imports: [
    BrowserModule,
    CommonModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    UserTableModule,
    HomeModule,
    IconHexComponent,
    IconAiComponent,
    IconTableComponent,
    IconBarChartComponent,
    IconUploadNavComponent,
    IconHomeComponent,
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
      useValue: (window as any).__POWERED_BY_QIANKUN__ ? '/sub1-app' : '/',
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
