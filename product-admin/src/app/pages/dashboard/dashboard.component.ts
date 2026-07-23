import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService, Product } from '../../services/product.service';
import { StatsService } from '../../services/stats.service';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import filter from 'lodash/filter';
import orderBy from 'lodash/orderBy';
import round from 'lodash/round';
import sumBy from 'lodash/sumBy';
import hljs from 'highlight.js';
import * as d3 from 'd3';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard">
      <img class="hero" src="https://picsum.photos/seed/hero-banner/2000/1200" alt="hero">

      <div class="stat-cards">
        <div class="card"><div class="label">商品总数</div><div class="value">{{ totalCount }}</div></div>
        <div class="card"><div class="label">在售商品</div><div class="value">{{ onSaleCount }}</div></div>
        <div class="card"><div class="label">库存告急</div><div class="value">{{ lowStockCount }}</div></div>
        <div class="card"><div class="label">日均销售额</div><div class="value">{{ formatMoney(todaySales) }}</div></div>
      </div>

      <section class="panel code-panel">
        <h4>API 示例</h4>
        <pre><code [innerHTML]="highlightedCode"></code></pre>
      </section>

      <section class="panel">
        <h3>销量 Top 20</h3>
        <ul class="top-list">
          <li *ngFor="let p of top20; trackBy: trackById">
            <img [src]="p.thumbnail" alt="">
            <span class="name">{{ p.name }}</span>
            <span class="cat">{{ p.category }}</span>
            <span class="sales">销量 {{ p.sales }}</span>
            <span class="price">{{ formatPrice(p) }}</span>
            <span class="time">{{ formatTime(p.createdAt) }}</span>
          </li>
        </ul>
      </section>
    </div>
  `,
  styles: [`
    .hero { display: block; width: 100%; margin-bottom: 20px; border-radius: 6px; }
    .stat-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
    .card { background: #fff; padding: 20px; border-radius: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.06); }
    .card .label { color: #909399; font-size: 13px; }
    .card .value { font-size: 26px; font-weight: 600; margin-top: 8px; color: #303133; }
    .panel { background: #fff; padding: 20px; border-radius: 6px; }
    .panel h3 { margin: 0 0 12px; }
    .code-panel { margin-bottom: 16px; }
    .code-panel h4 { margin: 0 0 8px; }
    .code-panel pre { background: #1e1e1e; color: #d4d4d4; padding: 14px; border-radius: 4px; overflow-x: auto; font-size: 13px; }
    .top-list { list-style: none; padding: 0; margin: 0; }
    .top-list li { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid #f0f2f5; font-size: 13px; }
    .top-list img { border-radius: 4px; }
    .top-list .name { flex: 1; font-weight: 500; }
    .top-list .cat { color: #909399; }
    .top-list .price { color: #f56c6c; font-weight: 600; }
    .top-list .time { color: #909399; }
  `]
})
export class DashboardComponent implements OnInit {
  totalCount = 0;
  onSaleCount = 0;
  lowStockCount = 0;
  todaySales = 0;
  top20: Product[] = [];
  highlightedCode = '';

  constructor(private productService: ProductService, private stats: StatsService) {}

  ngOnInit(): void {
    const sampleCode = `fetch('/api/products', {
  method: 'GET',
  headers: { 'Authorization': 'Bearer token' }
})
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));`;
    this.highlightedCode = hljs.highlight(sampleCode, { language: 'javascript' }).value;

    // d3 — 把全量 d3 拉进包
    const scale = d3.scaleLinear().domain([0, 100]).range([0, 500]);
    console.log('[dashboard] d3 scale(50):', scale(50), 'd3 version:', d3.version);

    this.productService.products$.subscribe(all => {
      this.totalCount = all.length;
      this.onSaleCount = filter(all, p => p.status === 'on').length;
      this.lowStockCount = filter(all, p => p.stock < 50).length;
      this.todaySales = sumBy(all, p => p.sales * p.price) / 365;
      this.top20 = orderBy(all, ['sales'], ['desc']).slice(0, 20);
    });

    this.productService.push$.subscribe(v => {
      void v;
    });
    this.stats.tick$.subscribe(v => {
      void v;
    });
  }

  trackById(_: number, p: Product): number {
    return p.id;
  }

  formatPrice(p: Product): string {
    return '¥' + p.price.toFixed(2);
  }

  formatMoney(n: number): string {
    return '¥' + round(n, 2).toLocaleString();
  }

  formatTime(t: number): string {
    return dayjs(t).locale('zh-cn').format('YYYY-MM-DD HH:mm');
  }
}
