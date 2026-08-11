import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/** 上传导航图标（向上箭头） */
@Component({
  selector: 'app-icon-upload-nav',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg [attr.width]="size" [attr.height]="size" viewBox="0 0 15 15" fill="none">
      <path d="M7.5 10V2m0 0L4.5 5M7.5 2l3 3"
        stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M2 11v1.5A.5.5 0 002.5 13h10a.5.5 0 00.5-.5V11"
        stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
    </svg>
  `,
})
export class IconUploadNavComponent {
  @Input() size: number = 15;
}
