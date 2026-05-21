import { NgModule } from '@angular/core';
import { RouterModule, Routes, UrlMatcher } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { MicroAppContainerComponent } from './micro-app-container.component';


const MICRO_APPS = ['sub1-app', 'sub2-app2', 'sub-app3'];

const microAppMatcher: UrlMatcher = (segments) => {
  const first = segments[0]?.path;
  return first && MICRO_APPS.includes(first) ? { consumed: segments } : null;
};

// routes 里就一条
const routes: Routes = [
  { matcher: microAppMatcher, component: MicroAppContainerComponent },
  { path: 'home', component: HomeComponent },
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

  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: '**', redirectTo: 'home' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule { }
