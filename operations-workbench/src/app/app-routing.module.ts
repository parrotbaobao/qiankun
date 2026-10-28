import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { UserTableComponent } from './features/user-table/user-table.component';

const routes: Routes = [
  {
    path: 'upload',
    loadChildren: () => import('./features/upload/upload.module').then((m) => m.UploadModule),
  },
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
  {
    path: 'charts',
    loadChildren: () => import('./features/charts/charts.module').then((m) => m.ChartsModule),
  },
  { path: '', redirectTo: 'user-table', pathMatch: 'full' },
  { path: '**', redirectTo: 'user-table' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule { }
