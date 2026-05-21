import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { MfeAgent } from '@your-org/mfe-state';
import { PORTAL_AGENT } from './core/portal-agent.token';
import { TranslateModule, provideTranslateLoader } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { AppRoutingModule } from './app-routing.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AppComponent } from './app.component';
import { APP_BASE_HREF, CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { AiChatComponent } from './features/ai-chat/ai-chat.component';
import { OrchestrationService } from './core/services/orchestration.service';
import { UserTableModule } from './features/user-table/user-table.module';
import { HomeModule } from './features/home/home.module';

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
    TranslateModule.forRoot({
      loader: provideTranslateHttpLoader({
        prefix: './assets/i18n/',
        suffix: '.json',
      }),
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
