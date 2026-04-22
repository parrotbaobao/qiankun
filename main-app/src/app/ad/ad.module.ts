// ad.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

import { AdComponent } from './ad.component';
import { UserSearchFormComponent } from './user-search-form/user-search-form.component';
import { UserSearchFormModule } from './user-search-form/user-search-form.module';

const routes: Routes = [
  { path: '', component: AdComponent },
  { path: "accordion", component: UserSearchFormComponent }
  // /ad
];

@NgModule({
  declarations: [AdComponent],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild(routes),
    UserSearchFormModule
  ],
  exports: [AdComponent]
})
export class AdModule { }
