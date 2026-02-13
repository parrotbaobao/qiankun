import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TabsModule } from 'ng-devui/tabs';
import { DvDemoComponent } from './dv-demo.component';


@NgModule({
    declarations: [DvDemoComponent],
    imports: [CommonModule,TabsModule],
    exports: [DvDemoComponent],
})
export class DvDemoModule {}