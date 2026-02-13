import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { SubSppComponent } from './sub-app.component';
import { OpenAPIModule } from '../openAPI/openAPI.module';

const routes: Routes = [
  { path: '', component: SubSppComponent }, // /ad
];

@NgModule({
  declarations: [SubSppComponent],
  imports: [CommonModule, OpenAPIModule, RouterModule.forChild(routes),],
  exports: [SubSppComponent]
})
export class SubSppModule { }
