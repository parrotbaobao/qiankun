import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { MicroAppContainerComponent } from './micro-app-container.component';

const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },
  // 子应用路径：Angular 不渲染内容，qiankun 负责填充 #container
  { path: 'sub-app', component: MicroAppContainerComponent },
  { path: 'sub-app/**', component: MicroAppContainerComponent },
  { path: 'sub2-app2', component: MicroAppContainerComponent },
  { path: 'sub2-app2/**', component: MicroAppContainerComponent },
  {
    path: 'cloud-advisor',
    loadChildren: () =>
      import('./features/cloud-advisor/cloud-advisor.module').then((m) => m.CloudAdvisorModule),
  },
  {
    path: 'devui',
    loadChildren: () =>
      import('./features/devui-demo/devui-demo.module').then((m) => m.DevuiDemoModule),
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
