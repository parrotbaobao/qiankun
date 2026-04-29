import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';

import { HomeComponent } from './home.component';

const routes: Routes = [
  { path: '', component: HomeComponent }, // 进入该模块时默认显示 HomeComponent
];

@NgModule({
  declarations: [HomeComponent],
  imports: [
    CommonModule,
    HttpClientModule,
    TranslateModule,
    RouterModule.forChild(routes),
  ],
  exports:[HomeComponent]
})
export class HomeModule {}
