import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DrawerModule } from 'ng-devui/drawer';
import { ModalModule } from 'ng-devui/modal';
import { DataTableModule } from 'ng-devui/data-table';
import { ButtonModule } from 'ng-devui/button';
import { UiDemoComponent } from './ui-demo.component';
import { DrawerContentComponent } from './drawer-content.component';

@NgModule({
  declarations: [UiDemoComponent, DrawerContentComponent],
  imports: [
    CommonModule,
    DrawerModule,
    ModalModule,
    DataTableModule,
    ButtonModule,
    RouterModule.forChild([{ path: '', component: UiDemoComponent }]),
  ],
})
export class UiDemoModule {}
