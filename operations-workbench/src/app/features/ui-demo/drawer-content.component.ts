import { Component } from '@angular/core';
import { DrawerComponent } from 'ng-devui/drawer';

@Component({
  selector: 'app-drawer-content',
  template: `
    <div class="drawer-content-wrap">
      <p>这是抽屉内容区域</p>
      <p>可以在这里放置任意内容，例如表单、详情信息等。</p>
      <div style="margin-top: 24px;">
        <d-button (click)="close()">关闭</d-button>
      </div>
    </div>
  `,
  styles: [`
    .drawer-content-wrap { padding: 24px; }
    p { color: #575d6c; line-height: 1.8; }
  `],
})
export class DrawerContentComponent {
  drawer!: DrawerComponent;

  close() {
    this.drawer.hide();
  }
}
