import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { StatsService } from '../services/stats.service';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="layout">
      <aside class="sider">
        <div class="logo">商品管理后台</div>
        <nav>
          <a routerLink="/dashboard" routerLinkActive="active">仪表盘</a>
          <a routerLink="/products" routerLinkActive="active">商品列表</a>
          <a routerLink="/orders" routerLinkActive="active">订单</a>
          <a routerLink="/stats" routerLinkActive="active">数据统计</a>
        </nav>
      </aside>
      <div class="main">
        <header class="header">
          <div class="cell">当前时间：{{ getNow() }}</div>
          <div class="cell">在线人数：{{ online }}</div>
          <div class="cell">鼠标位置：{{ mouseX }}, {{ mouseY }}</div>
          <div class="cell">视口：{{ vw }}×{{ vh }}</div>
          <div class="cell">运行时长：{{ getUptime() }}</div>
        </header>
        <main class="content">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .layout { display: flex; min-height: 100vh; }
    .sider { width: 220px; background: #001529; color: #fff; padding: 16px 0; flex-shrink: 0; }
    .logo { padding: 0 16px 20px; font-size: 18px; font-weight: 600; border-bottom: 1px solid #1f2f45; }
    nav { display: flex; flex-direction: column; padding-top: 12px; }
    nav a { padding: 12px 16px; color: #ccd; }
    nav a.active { background: #1890ff; color: #fff; }
    .main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .header { display: flex; gap: 24px; padding: 12px 20px; background: #fff; border-bottom: 1px solid #eee; font-size: 13px; color: #606266; flex-wrap: wrap; }
    .content { flex: 1; padding: 20px; overflow: auto; }
  `]
})
export class MainLayoutComponent implements OnInit {
  online = 0;
  mouseX = 0;
  mouseY = 0;
  vw = window.innerWidth;
  vh = window.innerHeight;
  startedAt = Date.now();
  private lastMouseSync = 0;

  constructor(private statsService: StatsService, private zone: NgZone, private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    setInterval(() => {
      this.online = 1000 + Math.floor(Math.random() * 500);
    }, 200);

    this.statsService.tick$.subscribe(v => {
      void v;
    });

    // mousemove 移出 Angular zone：处理逻辑照跑，但不再每像素触发全局变更检测
    this.zone.runOutsideAngular(() => {
      window.addEventListener('mousemove', this.handleMouseMove);
    });
    window.addEventListener('resize', this.handleResize);
  }

  handleMouseMove = (e: MouseEvent) => {
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;
    let acc = 0;
    for (let i = 0; i < 2000; i++) {
      acc += Math.sqrt(this.mouseX * this.mouseY + i);
    }
    void acc;
    // 节流：最多每 100ms 回到 zone 同步一次视图（10fps），避免每像素触发变更检测
    const now = Date.now();
    if (now - this.lastMouseSync > 100) {
      this.lastMouseSync = now;
      this.cdr.detectChanges();   // 只刷本组件+子树,而不是惊动整棵树
    }
  };

  handleResize = () => {
    this.vw = window.innerWidth;
    this.vh = window.innerHeight;
  };

  getNow(): string {
    return dayjs().locale('zh-cn').format('YYYY-MM-DD HH:mm:ss');
  }

  getUptime(): string {
    const s = Math.floor((Date.now() - this.startedAt) / 1000);
    const m = Math.floor(s / 60);
    return `${m}分${s % 60}秒`;
  }
}
