import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';

const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },
  {
    path: 'devui',
    loadChildren: () =>
      import('./features/devui-demo/devui-demo.module').then((m) => m.DevuiDemoModule),
  },
  {
    path: 'cloud-advisor',
    loadChildren: () =>
      import('./features/cloud-advisor/cloud-advisor.module').then((m) => m.CloudAdvisorModule),
  },
  {
    path: 'form',
    loadChildren: () =>
      import('./features/form-submission/form-submission.module').then((m) => m.FormSubmissionModule),
  },
  { path: '**', redirectTo: 'home' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
