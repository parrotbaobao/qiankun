// cloud-advisor.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

import { CloudAdvisorComponent } from './cloud-advisor.component';
import { UserSearchFormComponent } from './user-search-form/user-search-form.component';
import { UserSearchFormModule } from './user-search-form/user-search-form.module';

const routes: Routes = [
  { path: '', component: CloudAdvisorComponent },
  { path: "accordion", component: UserSearchFormComponent }
];

@NgModule({
  declarations: [CloudAdvisorComponent],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild(routes),
    UserSearchFormModule
  ],
  exports: [CloudAdvisorComponent]
})
export class CloudAdvisorModule { }
