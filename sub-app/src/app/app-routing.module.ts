import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { APP_BASE_HREF } from '@angular/common';
import { AppComponent } from './app.component';
import { AdComponent } from './ad/ad.component';
import { HomeComponent } from './home/home.component';
import { AiChatComponent } from './ai-chat/ai-chat.component';
import { OrchestrationEditorComponent } from './api-graph/orchestration-editor/orchestration-editor.component';

const routes: Routes = [
  {
    path: 'ad',
    loadChildren: () => import('./ad/ad.module').then((m) => m.AdModule),
  },
  { path: 'home', component: HomeComponent },
  { path: 'ai', component: AiChatComponent },
  { path: 'orchestration', component: OrchestrationEditorComponent },

  { path: '', redirectTo: 'orchestration', pathMatch: 'full' },
  { path: '**', redirectTo: '', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule { }
