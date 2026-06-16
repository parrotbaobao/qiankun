import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  inputValue = '';
  selectedDate: Date | null = null;
  showAlert = true;
  activeTab: string | number = 'tab1';
  sharedColor = '';

  tags = [
    { name: 'sub-app', color: '#2e7d32' },
    { name: '绿色主题', color: '#1b5e20' },
    { name: 'DevUI', color: '#4caf50' },
  ];

  rows = [
    { id: 1, name: '子应用 1 条目 A', status: '激活', date: '2026-04-01' },
    { id: 2, name: '子应用 1 条目 B', status: '禁用', date: '2026-04-15' },
    { id: 3, name: '子应用 1 条目 C', status: '激活', date: '2026-04-30' },
  ];

  constructor(public translate: TranslateService) {}

  ngOnInit(): void {
    const s = getComputedStyle(document.documentElement);
    this.sharedColor = s.getPropertyValue('--shared-color').trim() || '（未定义）';
  }

  handleClick(type: string): void {
    alert(`[sub-app] 点了 ${type} 按钮`);
  }
}
