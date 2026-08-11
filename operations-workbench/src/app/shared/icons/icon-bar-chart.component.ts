import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/** 图表中心导航图标（柱状图） */
@Component({
  selector: 'app-icon-bar-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg [attr.width]="size" [attr.height]="size" viewBox="0 0 15 15" fill="none">
      <rect x="1" y="8" width="3" height="6" rx="0.5" fill="currentColor"/>
      <rect x="6" y="5" width="3" height="9" rx="0.5" fill="currentColor"/>
      <rect x="11" y="2" width="3" height="12" rx="0.5" fill="currentColor"/>
    </svg>
  `,
})
export class IconBarChartComponent {
  @Input() size: number = 15;
}
