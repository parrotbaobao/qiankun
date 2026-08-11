import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { DevUIModule } from 'ng-devui';
import { HomeComponent } from './home.component';

const routes: Routes = [
  { path: '', component: HomeComponent },
];

@NgModule({
  declarations: [HomeComponent],
  imports: [CommonModule, FormsModule, DevUIModule, RouterModule.forChild(routes)],
  exports: [HomeComponent]
})
export class HomeModule { }
