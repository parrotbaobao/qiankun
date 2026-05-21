import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { AiChatComponent } from './features/ai-chat/ai-chat.component';
import { UserTableComponent } from './features/user-table/user-table.component';

const routes: Routes = [
  {
    path: 'upload',
    loadChildren: () => import('./features/upload/upload.module').then((m) => m.UploadModule),
  },
  { path: 'ai', component: AiChatComponent },
  { path: 'user-table', component: UserTableComponent },
  {
    path: 'polling-demo',
    loadChildren: () =>
      import('./features/polling-demo/polling-demo.module').then((m) => m.PollingDemoModule),
  },
  {
    path: 'ui-demo',
    loadChildren: () => import('./features/ui-demo/ui-demo.module').then((m) => m.UiDemoModule),
  },
  { path: '', component: HomeComponent, pathMatch: 'full' },
  { path: '**', component: HomeComponent },];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule { }
