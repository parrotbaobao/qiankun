// ad.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';

import { AdComponent } from './ad.component';

const routes: Routes = [
  { path: '', component: AdComponent }, // /ad
];

@NgModule({
  declarations: [AdComponent],
  imports: [
    CommonModule,
    FormsModule, HttpClientModule,
    RouterModule.forChild(routes),
  ],
  exports: [AdComponent]
})
export class AdModule { }
