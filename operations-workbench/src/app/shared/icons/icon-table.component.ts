import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/** 用户数据导航图标（表格） */
@Component({
  selector: 'app-icon-table',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg [attr.width]="size" [attr.height]="size" viewBox="0 0 15 15" fill="none">
      <rect x="1.5" y="3.5" width="12" height="9" rx="1" stroke="currentColor" stroke-width="1.2"/>
      <path d="M1.5 6.5h12" stroke="currentColor" stroke-width="1.2"/>
    </svg>
  `,
})
export class IconTableComponent {
  @Input() size: number = 15;
}
