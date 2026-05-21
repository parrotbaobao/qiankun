import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PollingDemoComponent } from './polling-demo.component';

@NgModule({
  declarations: [PollingDemoComponent],
  imports: [
    CommonModule,
    RouterModule.forChild([{ path: '', component: PollingDemoComponent }]),
  ],
})
export class PollingDemoModule {}
