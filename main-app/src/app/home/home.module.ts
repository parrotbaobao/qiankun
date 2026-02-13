import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home.component';
import { OpenAPIModule } from '../openAPI/openAPI.module';

const routes: Routes = [
  { path: '', component: HomeComponent }, // /ad
];

@NgModule({
  declarations: [HomeComponent],
  imports: [CommonModule, OpenAPIModule, RouterModule.forChild(routes),],
  exports: [HomeComponent]
})
export class HomeModule { }
