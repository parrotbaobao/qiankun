import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/** AI 对话导航图标（圆形加号） */
@Component({
  selector: 'app-icon-ai',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg [attr.width]="size" [attr.height]="size" viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" stroke-width="1.2"/>
      <path d="M5 7.5h5M7.5 5v5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
    </svg>
  `,
})
export class IconAiComponent {
  @Input() size: number = 15;
}
