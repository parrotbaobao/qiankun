import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule, Routes } from '@angular/router';
import { AppComponent } from './app.component';
import { HomeComponent } from './home/home.component';
import { HomeModule } from './home/home.module';
import { AdModule } from './ad/ad.module';
import { AdComponent } from './ad/ad.component';
import { SubSppComponent } from './sub-app/sub-app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { DevUIModule } from 'ng-devui';
import { DvDemoModule } from './generated/devui-demo/dv-demo.module';

const routes: Routes = [
  {
    path: 'sub-app',
    component: SubSppComponent,
    children: [
      { path: '**', component: SubSppComponent }, // ← 关键：捕获 /sub-app/任意子路径
    ],
  },
  { path: 'sub2-app2', component: SubSppComponent },
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },
  {
    path: 'devui',
    loadChildren: () =>
      import('./generated/devui-demo/dv-demo.module').then(
        (m) => m.DvDemoModule,
      ),
  },

  {
    path: 'ad',
    loadChildren: () => import('./ad/ad.module').then((m) => m.AdModule),
  },

  { path: '**', redirectTo: 'home' },
];

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    DevUIModule,
    DvDemoModule,
    BrowserAnimationsModule,
    RouterModule.forRoot(routes),
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
