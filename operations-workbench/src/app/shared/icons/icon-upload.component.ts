import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/** 上传页面图标（大号上传图标） */
@Component({
  selector: 'app-icon-upload',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg [attr.width]="size" [attr.height]="size" viewBox="0 0 24 24" fill="none">
      <path d="M12 15V3m0 0L8 7m4-4l4 4"
        stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M3 15v3a2 2 0 002 2h14a2 2 0 002-2v-3"
        stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
  `,
})
export class IconUploadComponent {
  @Input() size: number = 32;
}
