import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { ChartsComponent } from './charts.component';

@NgModule({
  declarations: [ChartsComponent],
  imports: [
    CommonModule,
    HttpClientModule,
    RouterModule.forChild([{ path: '', component: ChartsComponent }]),
  ],
})
export class ChartsModule {}
