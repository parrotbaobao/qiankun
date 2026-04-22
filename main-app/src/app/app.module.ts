import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule, Routes } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { AppComponent } from './app.component';
import { HomeComponent } from './home/home.component';
import { HomeModule } from './home/home.module';
import { AdModule } from './ad/ad.module';
import { AdComponent } from './ad/ad.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { DevUIModule } from 'ng-devui';
import { DvDemoModule } from './generated/devui-demo/dv-demo.module';
import { FormSubmissionModule } from './form-submission/form-submission.module';

const routes: Routes = [
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

  {
    path: 'form',
    loadChildren: () => import('./form-submission/form-submission.module').then((m) => m.FormSubmissionModule),
  },
  { path: '**', redirectTo: 'home' },
];

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    HttpClientModule,
    DevUIModule,
    DvDemoModule,
    BrowserAnimationsModule,
    RouterModule.forRoot(routes),
  ],
  bootstrap: [AppComponent],
})
export class AppModule { }
