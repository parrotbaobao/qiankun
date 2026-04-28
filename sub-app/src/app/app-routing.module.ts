import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { AiChatComponent } from './features/ai-chat/ai-chat.component';
import { OrchestrationEditorComponent } from './features/api-graph/orchestration-editor/orchestration-editor.component';
import { UserTableComponent } from './features/user-table/user-table.component';

const routes: Routes = [
  {
    path: 'upload',
    loadChildren: () => import('./features/upload/upload.module').then((m) => m.UploadModule),
  },
  { path: 'home', component: HomeComponent },
  { path: 'ai', component: AiChatComponent },
  { path: 'orchestration', component: OrchestrationEditorComponent },
  { path: 'user-table', component: UserTableComponent },

  { path: '', redirectTo: 'orchestration', pathMatch: 'full' },
  { path: '**', redirectTo: '', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
