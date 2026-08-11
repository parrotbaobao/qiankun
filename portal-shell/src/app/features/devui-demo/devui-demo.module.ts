import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TabsModule } from 'ng-devui/tabs';
import { DevuiDemoComponent } from './devui-demo.component';


@NgModule({
    declarations: [DevuiDemoComponent],
    imports: [CommonModule, TabsModule],
    exports: [DevuiDemoComponent],
})
export class DevuiDemoModule {}
