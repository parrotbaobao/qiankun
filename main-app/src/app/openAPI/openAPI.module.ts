import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

import { OpenAPIComponent } from './openAPI.component';

const routes: Routes = [
  { path: '', component: OpenAPIComponent }, // /openapi/overview
];

@NgModule({
  declarations: [OpenAPIComponent],
  imports: [CommonModule, RouterModule.forChild(routes)],
  exports:[OpenAPIComponent]
})
export class OpenAPIModule {}
