import { AfterViewInit, Component } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements AfterViewInit {
  inputValue = '';
  selectedDate: Date | null = null;
  showAlert = true;
  activeTab: string | number = 'tab1';

  tags = [
    { name: '主应用', color: '#1976d2' },
    { name: '蓝色主题', color: '#0d47a1' },
    { name: 'DevUI', color: '#2196f3' },
  ];

  rows = [
    { id: 1, name: '主应用条目 A', status: '激活', date: '2026-01-01' },
    { id: 2, name: '主应用条目 B', status: '禁用', date: '2026-02-15' },
    { id: 3, name: '主应用条目 C', status: '激活', date: '2026-03-30' },
  ];

  ngAfterViewInit(): void {
    // 启动时已经在 AppComponent 里注入过了，这里不再操作
  }

  handleClick(type: string): void {
    alert(`[main-app] 点了 ${type} 按钮`);
  }

  checkStyleAlive(): void {
    const exists = !!document.getElementById('runtime-injected-style');
    const allStyles = Array.from(document.head.querySelectorAll('style')).length;
    alert(
      `runtime-injected-style 还在吗？\n${exists ? '✅ 还在' : '❌ 已经被移除了！'}\n\n当前 <head> 里 <style> 标签总数：${allStyles}`
    );
  }
}
