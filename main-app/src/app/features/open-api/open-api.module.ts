import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

import { OpenApiComponent } from './open-api.component';

const routes: Routes = [
  { path: '', component: OpenApiComponent }, // /openapi/overview
];

@NgModule({
  declarations: [OpenApiComponent],
  imports: [CommonModule, RouterModule.forChild(routes)],
  exports: [OpenApiComponent]
})
export class OpenApiModule {}
