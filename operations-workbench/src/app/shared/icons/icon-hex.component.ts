import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/** 编排导航图标（六边形） */
@Component({
  selector: 'app-icon-hex',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg [attr.width]="size" [attr.height]="size" viewBox="0 0 15 15" fill="none">
      <path d="M7.5 1L1 4.5v6L7.5 14 14 10.5v-6L7.5 1Z"
        stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
    </svg>
  `,
})
export class IconHexComponent {
  @Input() size: number = 15;
}
