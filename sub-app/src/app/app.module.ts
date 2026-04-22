import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AppComponent } from './app.component';
import { APP_BASE_HREF, CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { AiChatComponent } from './ai-chat/ai-chat.component';
import { OrchestrationEditorComponent } from './api-graph/orchestration-editor/orchestration-editor.component';
import { NodePaletteComponent } from './api-graph/node-palette/node-palette.component';
import { GraphCanvasComponent } from './api-graph/graph-canvas/graph-canvas.component';
import { NodeConfigPanelComponent } from './api-graph/node-config-panel/node-config-panel.component';
import { OrchestrationService } from './services/orchestration.service';

@NgModule({
  declarations: [
    AppComponent,
    AiChatComponent,
    OrchestrationEditorComponent,
    NodePaletteComponent,
    GraphCanvasComponent,
    NodeConfigPanelComponent
  ],
  imports: [
    BrowserModule,
    CommonModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule
  ],
  providers: [
    {
      provide: APP_BASE_HREF,
      useValue: (window as any).__POWERED_BY_QIANKUN__ ? '/sub-app' : '/',
    },
    OrchestrationService
  ],
  bootstrap: [AppComponent],
})
export class AppModule { }
