import { Component } from '@angular/core';

@Component({
  selector: 'app-error-center',
  templateUrl: './error-center.component.html',
  styleUrls: ['./error-center.component.scss'],
})
export class ErrorCenterComponent {
  inputValue = '';
  selectedDate: Date | null = null;
  showAlert = true;
  activeTab: string | number = 'tab1';

  tags = [
    { name: 'sub-app2', color: '#ef6c00' },
    { name: '橙色主题', color: '#e65100' },
    { name: 'DevUI', color: '#ff9800' },
  ];

  rows = [
    { id: 1, name: '子应用 2 条目 A', status: '激活', date: '2026-05-01' },
    { id: 2, name: '子应用 2 条目 B', status: '禁用', date: '2026-05-15' },
    { id: 3, name: '子应用 2 条目 C', status: '激活', date: '2026-05-30' },
  ];

  handleClick(type: string): void {
    alert(`[sub-app2] 点了 ${type} 按钮`);
  }
}
