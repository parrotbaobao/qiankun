import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/** 首页导航图标（房子） */
@Component({
  selector: 'app-icon-home',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg [attr.width]="size" [attr.height]="size" viewBox="0 0 15 15" fill="none">
      <path d="M7.5 1.5L1.5 6v7h4V9h4v4h4V6L7.5 1.5Z"
        stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
    </svg>
  `,
})
export class IconHomeComponent {
  @Input() size: number = 15;
}
