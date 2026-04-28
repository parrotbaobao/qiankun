import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { TranslateModule, provideTranslateLoader } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { AppRoutingModule } from './app-routing.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AppComponent } from './app.component';
import { APP_BASE_HREF, CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { AiChatComponent } from './features/ai-chat/ai-chat.component';
import { OrchestrationEditorComponent } from './features/api-graph/orchestration-editor/orchestration-editor.component';
import { NodePaletteComponent } from './features/api-graph/node-palette/node-palette.component';
import { GraphCanvasComponent } from './features/api-graph/graph-canvas/graph-canvas.component';
import { NodeConfigPanelComponent } from './features/api-graph/node-config-panel/node-config-panel.component';
import { OrchestrationService } from './core/services/orchestration.service';
import { UserTableModule } from './features/user-table/user-table.module';
import { HomeModule } from './features/home/home.module';

@NgModule({
  declarations: [
    AppComponent,
    AiChatComponent,
    OrchestrationEditorComponent,
    NodePaletteComponent,
    GraphCanvasComponent,
    NodeConfigPanelComponent,
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
      useValue: (window as any).__POWERED_BY_QIANKUN__ ? '/sub-app' : '/',
    },
    OrchestrationService,
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
